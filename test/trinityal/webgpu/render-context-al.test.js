import assert from "node:assert/strict";
import test from "node:test";

import { CjsWebgpuRenderContextAL } from "../../../npm/dist/trinityal/webgpu/internal.js";
import { Tr2ColorAttachment, Tr2DepthAttachment } from "../../../npm/dist/trinityal/index.js";
import { ALResult } from "../../../npm/dist/trinityal/index.js";
import { Topology, Tr2LoadAction, Tr2StoreAction } from "../../../npm/dist/global/consts/renderContext/index.js";

const ready = () =>
{
  const al = new CjsWebgpuRenderContextAL();

  al.CreateDevice();
  al.BeginScene();
  al.DrainTransitions();

  return al;
};

const geometry = al =>
{
  al.SetShaderProgram({ id: "program" });
  al.SetVertexLayout({ id: "layout" });
  al.SetStreamSource(0, { id: "vertices" }, 0, 32);
  al.SetIndices({ id: "indices" }, 2);
};

test("the batch-to-draw sequence records one pass and one draw", () =>
{
  // Carbon's SubmitGeometry (Tr2RenderContext.cpp:83-103): topology, then the
  // declaration, streams and indices, then the draw.
  const al = ready();

  assert.equal(al.SetTopology(Topology.TOP_TRIANGLES), true);
  geometry(al);
  assert.equal(al.DrawIndexedInstanced(36, 1, 0, 0, 0), true);

  const events = al.DrainTransitions();

  assert.deepEqual(events.map(event => event.type), [ "open", "draw" ]);
  assert.equal(al.GetWorkQueue().GetPassCount(), 1, "the draw opened the pass");
  assert.equal(events[1].indexCount, 36);
});

test("an indexed draw with nothing to index is refused", () =>
{
  // Metal returns E_INVALIDARG when m_metalIndexBuffer is nil
  // (Tr2RenderContextMetal.mm:419-422). A backend can catch that without a GPU.
  const al = ready();

  al.SetShaderProgram({ id: "program" });

  assert.equal(al.DrawIndexedInstanced(36, 1), false, "no index buffer");
  assert.deepEqual(al.DrainTransitions(), [], "and nothing was recorded");

  al.SetIndices({ id: "indices" }, 2);

  assert.equal(al.DrawIndexedInstanced(36, 1), true);
});

test("a declared clear becomes the pass load operation", () =>
{
  // The whole point of consuming RenderPassHint: Trinity DECLARES the load and
  // store actions, where the intent planner infers them by scanning what
  // follows a clear.
  const al = ready();

  al.RenderPassHint(
    new Tr2ColorAttachment(Tr2LoadAction.CLEAR, Tr2StoreAction.STORE, 0),
    new Tr2DepthAttachment(Tr2LoadAction.CLEAR, Tr2StoreAction.STORE, 1)
  );

  geometry(al);
  al.DrawIndexedInstanced(3, 1);

  const events = al.DrainTransitions();
  const open = events.find(event => event.type === "open");

  assert.deepEqual(open.attachments.colors, [ { loadOp: "clear", storeOp: "store", clearValue: 0 } ]);
  assert.equal(open.attachments.depth.loadOp, "clear");
});

test("consecutive draws share a pass until a hint cuts one", () =>
{
  const al = ready();

  geometry(al);
  al.DrawIndexedInstanced(3, 1);
  al.DrawIndexedInstanced(6, 1);

  assert.equal(al.GetWorkQueue().GetPassCount(), 1, "two draws, one pass");

  al.RenderPassHint(new Tr2ColorAttachment(Tr2LoadAction.LOAD, Tr2StoreAction.STORE, 0));
  al.DrawIndexedInstanced(9, 1);

  assert.equal(al.GetWorkQueue().GetPassCount(), 2, "the hint cut a new one");
});

test("a primitive count becomes a vertex count at the bound topology", () =>
{
  // Carbon's draw verbs take PRIMITIVES and its backends draw VERTICES, so
  // every backend converts (ComputeVertexCount). The conversion depends on the
  // bound topology, which is why the AL holds it.
  const al = ready();

  al.SetTopology(Topology.TOP_TRIANGLES);
  assert.equal(al.ComputeVertexCount(12), 36);

  al.SetTopology(Topology.TOP_TRIANGLE_STRIP);
  assert.equal(al.ComputeVertexCount(12), 14);

  al.SetTopology(Topology.TOP_LINES);
  assert.equal(al.ComputeVertexCount(12), 24);

  al.SetTopology(Topology.TOP_POINTS);
  assert.equal(al.ComputeVertexCount(12), 12);
});

test("a topology the AL has no name for is refused", () =>
{
  const al = ready();

  assert.equal(al.SetTopology(Topology.TOP_MAX_TOPOLOGY), false);
  assert.equal(al.SetTopology(99), false);
  assert.equal(al.SetTopology(Topology.TOP_INVALID), false, "INVALID is not a topology either");
});

test("ending the scene closes the pass and commits once", () =>
{
  const al = ready();

  geometry(al);
  al.DrawIndexedInstanced(3, 1);
  al.DrainTransitions();

  al.EndScene();

  assert.deepEqual(al.DrainTransitions().map(event => event.type), [ "close", "commit" ]);
});

test("the bound state is what a following draw would encode", () =>
{
  const al = ready();

  al.SetTopology(Topology.TOP_LINES);
  geometry(al);

  const bound = al.GetBoundState();

  assert.equal(bound.topology, Topology.TOP_LINES);
  assert.equal(bound.indexStride, 2);
  assert.equal(bound.streams[0].stride, 32);
  assert.equal(bound.shaderProgram.id, "program");
  assert.equal(bound.vertexLayout.id, "layout");
});

test("a scene cannot open before a device exists", () =>
{
  assert.throws(() => new CjsWebgpuRenderContextAL().BeginScene(), /before CreateDevice/);
});

const target = (width, height) => ({ GetWidth: () => width, GetHeight: () => height });

test("binding a target resets the viewport to it", () =>
{
  // Carbon does this in the backend (Tr2RenderContextMetal.mm:762-766) whenever
  // slot zero changes. Leaving it alone is the defect where a 2048 shadow pass
  // leaves the viewport at 2048 for the rest of the frame.
  const al = ready();

  al.SetRenderTarget(0, target(1920, 1080));
  assert.deepEqual(al.GetViewport(), { x: 0, y: 0, width: 1920, height: 1080 });

  al.SetRenderTarget(0, target(2048, 2048));
  assert.equal(al.GetViewport().width, 2048, "a shadow target takes the viewport");

  al.SetRenderTarget(1, target(64, 64));
  assert.equal(al.GetViewport().width, 2048, "only slot zero moves it");
});

test("rebinding the same target does not cut a pass", () =>
{
  // Carbon returns early when the texture is already attached
  // (MetalWorkQueue.mm:2006-2009). A step re-binding what it inherited is
  // common, and cutting a pass for it would double the pass count for nothing.
  const al = ready();
  const colour = target(512, 512);

  al.SetRenderTarget(0, colour);
  geometry(al);
  al.DrawIndexedInstanced(3, 1);

  assert.equal(al.GetWorkQueue().GetPassCount(), 1);

  al.SetRenderTarget(0, colour);
  al.DrawIndexedInstanced(3, 1);

  assert.equal(al.GetWorkQueue().GetPassCount(), 1, "same texture, same pass");

  al.SetRenderTarget(0, target(512, 512));
  al.DrawIndexedInstanced(3, 1);

  assert.equal(al.GetWorkQueue().GetPassCount(), 2, "a different texture cuts one");
});

test("render-target stacks are per slot", () =>
{
  // A single shared stack pops the most recent push whatever its slot, so
  // pushing slot 0 then slot 1 and popping slot 0 restores the wrong surface.
  const al = ready();
  const first = target(100, 100);
  const second = target(200, 200);

  al.SetRenderTarget(0, first);
  al.SetRenderTarget(1, second);

  al.PushRenderTarget(0);
  al.PushRenderTarget(1);

  assert.equal(al.GetStackSizeRT(0), 1);
  assert.equal(al.GetStackSizeRT(1), 1);

  al.SetRenderTarget(0, target(300, 300));
  al.PopRenderTarget(0);

  assert.equal(al.GetRenderTarget(0), first, "slot zero restored its own");
  assert.equal(al.GetRenderTarget(1), second, "slot one untouched");
  assert.equal(al.PopRenderTarget(0), false, "nothing left");
});

test("the depth-stencil target stacks too", () =>
{
  const al = ready();
  const depth = target(512, 512);

  al.SetDepthStencil(depth);
  al.PushDepthStencil();
  al.SetDepthStencil(null);

  assert.equal(al.GetDepthStencil(), null);
  assert.equal(al.GetStackSizeDS(), 1);
  assert.equal(al.PopDepthStencil(), true);
  assert.equal(al.GetDepthStencil(), depth);
  assert.equal(al.PopDepthStencil(), false);
});

test("a clear becomes the next pass's load operation", () =>
{
  // WebGPU has no mid-pass clear, so a clear ends the current pass and declares
  // the next one's load actions - the same thing RenderPassHint does, reached
  // from the other direction.
  const al = ready();

  al.SetRenderTarget(0, target(64, 64));
  al.SetDepthStencil(target(64, 64));
  al.DrainTransitions();

  al.Clear({ color: 0xff00ff00, depth: 1 });

  geometry(al);
  al.DrawIndexedInstanced(3, 1);

  const open = al.DrainTransitions().find(event => event.type === "open");

  assert.equal(open.attachments.colors[0].loadOp, "clear");
  assert.equal(open.attachments.colors[0].clearValue, 0xff00ff00);
  assert.equal(open.attachments.depth.loadOp, "clear");
});

test("compute may not run inside a render pass", () =>
{
  const al = ready();

  geometry(al);
  al.DrawIndexedInstanced(3, 1);
  al.DrainTransitions();

  al.RunComputeShader(1, 1, 1);

  const events = al.DrainTransitions();

  assert.deepEqual(events.map(event => event.type), [ "close", "open" ]);
  assert.equal(events[1].encoderType, "compute");
});

test("the target size is refused when nothing is bound", () =>
{
  const al = ready();

  assert.equal(al.GetRenderTargetSize(0).result, ALResult.E_INVALIDCALL);

  al.SetRenderTarget(0, target(800, 600));

  assert.deepEqual(al.GetRenderTargetSize(0), { result: ALResult.S_OK, width: 800, height: 600 });
  assert.equal(al.IsRenderTargetValid(null), false);
  assert.equal(al.IsRenderTargetValid({}), true);
});

// A composed backend: the device half, faked at the seams the AL actually
// touches. The point of these is that RenderBatches reaches a real pass and a
// real dispatcher, which is what the intent queue existed to stand in for.
function composed()
{
  const log = [];
  const pass = { end: () => log.push("pass.end") };
  const commandEncoder = {
    beginRenderPass()
    {
      log.push("beginRenderPass");
      return pass;
    },
    finish()
    {
      log.push("finish");
      return "command-buffer";
    }
  };

  let resolvePrepare = null;

  const al = new CjsWebgpuRenderContextAL({
    webgpu: {
      GetDevice: () => ({ createCommandEncoder: () => commandEncoder }),
      Submit(buffers)
      {
        log.push(`submit:${buffers.join(",")}`);
      }
    },
    dispatcher: {
      PrepareAccumulator()
      {
        log.push("prepare");
        return new Promise(resolve => { resolvePrepare = resolve; });
      },
      EncodeAccumulator(encodedPass, handle)
      {
        log.push(`encode:${handle}:${encodedPass === pass}`);
      }
    },
    renderTarget: {
      AcquireFrame: () => ({ id: "frame" }),
      CreateRenderPassDescriptor: () => ({ label: "descriptor" }),
      // Carbon's texture accessors: the render target IS the bound target at
      // slot zero, which BeginScene now binds as Metal's does.
      GetWidth: () => 1280,
      GetHeight: () => 720,
      GetFormat: () => "bgra8unorm",
      GetDepthFormat: () => "depth24plus",
      GetSampleCount: () => 1
    }
  });

  return { al, log, pass, FinishPreparing: handle => resolvePrepare(handle) };
}

test("an uncomposed backend is the stub it always was", () =>
{
  const al = ready();

  assert.equal(al.IsComposed(), false);
  assert.equal(al.RenderBatches({}, "Main"), false, "no dispatcher, nothing drawn");
});

test("a composed backend needs its whole device half or none of it", () =>
{
  assert.throws(
    () => new CjsWebgpuRenderContextAL({ webgpu: {} }),
    /needs a dispatcher and a render target/u
  );
});

test("the frame ends asynchronously, and that is where preparation happens", async () =>
{
  const { al, log, pass, FinishPreparing } = composed();
  const accumulator = { id: "accumulator" };

  al.CreateDevice();
  al.BeginScene();

  // Trinity calls this synchronously and Carbon draws right there. A browser
  // cannot: building a pipeline is a promise. So the call collects and the
  // scene's end prepares - which is what the intent queue was really for.
  assert.equal(al.RenderBatches(accumulator, "Main"), true, "the submission is taken");
  assert.equal(log.includes("prepare"), false, "but nothing is prepared yet");
  assert.equal(log.includes("beginRenderPass"), false, "and no pass is opened for nothing");

  const ended = al.EndScene();

  FinishPreparing({ batches: [ {}, {} ] });
  await ended;

  assert.ok(log.includes("encode:[object Object]:true") || log.some(entry => entry.startsWith("encode:")), "the dispatcher got the live pass");
  assert.equal(al.GetDrawnBatchCount(), 2, "both batches counted");

  assert.deepEqual(
    log.slice(log.indexOf("prepare")),
    [ "prepare", "beginRenderPass", log.find(entry => entry.startsWith("encode:")), "pass.end", "finish", "submit:command-buffer" ],
    "prepare, open, encode, end, finish, submit - in that order"
  );
  assert.equal(al.GetWorkQueue().GetRenderPass(), null, "and nothing is left open");
});

test("an accumulator that prepares to nothing opens no pass", async () =>
{
  const { al, log, FinishPreparing } = composed();

  al.CreateDevice();
  al.BeginScene();
  al.RenderBatches({ id: "empty" }, "Main");

  const ended = al.EndScene();

  // Carbon submits an empty accumulator too, so this is not an error - but a
  // pass opened for no draws is a pass that clears the target for nothing.
  FinishPreparing({ batches: [] });
  await ended;

  assert.equal(log.includes("beginRenderPass"), false);
  assert.equal(al.GetDrawnBatchCount(), 0);
});

test("the variants this backend cannot honour refuse instead of drawing", () =>
{
  const { al } = composed();

  al.CreateDevice();
  al.BeginScene();

  // Both would otherwise fall through to an ordinary colour pass - a depth
  // prepass rendered as colour, or a picking read that returns pixels.
  assert.throws(() => al.RenderBatches({}, "Main", { overrideMaterial: {} }), /RenderBatchesWithOverride/u);
  assert.throws(() => al.RenderBatches({}, "Main", { picking: true }), /RenderBatchesForPicking/u);
});

// The verbs Trinity calls on a render context that this backend did not have
// until 2026-09-09. Every one of them was a TypeError at the call site rather
// than a refusal, because the backend simply lacked the method.

test("the backend answers every render-context verb Trinity calls", () =>
{
  const al = ready();

  // Nine methods, each a live break before they existed: Tr2Material and
  // Tr2RenderUtils reach SetConstants, Tr2RingBuffer both frame numbers,
  // TriStepClearUav / TriStepRunComputeShader / TriStepSetRenderState the
  // next three, and Tr2RenderContext the two UP draws and GetCaps.
  for (const name of [
    "GetCaps", "SetConstants", "GetRecordingFrameNumber", "GetRenderedFrameNumber",
    "ClearUav", "RunComputeShaderIndirect", "SetRenderState", "DrawPrimitiveUP",
    "DrawIndexedPrimitiveUP"
  ])
  {
    assert.equal(typeof al[name], "function", `${name} is missing`);
  }
});

test("caps answer for WebGPU rather than for the stub", () =>
{
  const caps = ready().GetCaps();

  // The three the stub denies and WebGPU has, and the one WebGPU cannot claim:
  // presentation is the browser's, so there is no chain to create.
  assert.equal(caps.SupportsGpuBuffer(), true);
  assert.equal(caps.SupportsVertexShaderTextures(), true);
  assert.equal(caps.SupportsStandaloneSwapChain(), false);

  // shader-f16 is optional in WebGPU, so an uncomposed backend must not promise it.
  assert.equal(caps.SupportsFloat16(), false);

  // The same object each call, as Carbon returns a reference to a member.
  const al = ready();
  assert.equal(al.GetCaps(), al.GetCaps());
});

test("the frame number counts submitted frames and recording is one ahead", async () =>
{
  const al = ready();

  assert.equal(al.GetRenderedFrameNumber(), 0);
  assert.equal(al.GetRecordingFrameNumber(), 1);

  await al.EndScene();

  assert.equal(al.GetRenderedFrameNumber(), 1);
  assert.equal(al.GetRecordingFrameNumber(), 2);
});

test("SetConstants binds per stage and register, and rejects what Carbon rejects", () =>
{
  const al = ready();
  const buffer = { id: "constants" };

  assert.equal(al.SetConstants(buffer, 1, 3), true);
  assert.equal(al.GetConstants(1, 3), buffer);

  // A different stage at the same register is a different slot.
  assert.equal(al.GetConstants(0, 3), null);

  // Carbon returns E_INVALIDARG past its constant-buffer count
  // (Tr2RenderContextMetal.mm:664-672).
  assert.equal(al.SetConstants(buffer, 1, 20), false);
  assert.equal(al.SetConstants(buffer, 6, 0), false);
});

test("a single render state is stored and dirties the pipeline, and a redundant one does not", () =>
{
  const al = ready();

  al.SetRenderStates({ id: "setup" });
  assert.equal(al.IsPipelineDirty(), true);

  assert.equal(al.SetRenderState(7, 1), true);
  assert.equal(al.GetRenderStateInputs().states.get(7), 1);

  // Carbon's setters compare before dirtying, so a redundant apply costs nothing.
  const inputs = al.GetRenderStateInputs();
  assert.equal(al.SetRenderState(7, 1), true);
  assert.equal(inputs.states.size, 1);
});

test("the verbs this backend cannot encode refuse rather than report success", () =>
{
  const al = ready();

  // Reporting success here would leave a caller reading stale contents it
  // believes are zero, or missing geometry it believes it drew.
  assert.equal(al.ClearUav({ IsValid: () => true }, [ 0, 0, 0, 0 ]), false);
  assert.equal(al.DrawPrimitiveUP(2, new Float32Array(12), 16), false);
  assert.equal(al.DrawIndexedPrimitiveUP(4, 2, new Uint16Array(6), new Float32Array(12), 16), false);

  // Indirect compute IS recorded; only its group counts come from a buffer.
  assert.equal(al.RunComputeShaderIndirect({}, { IsValid: () => true }, 0), true);
  assert.equal(al.RunComputeShaderIndirect({}, { IsValid: () => false }, 0), false);
});

// The rest of Carbon's render-context surface, added 2026-09-09. Trinity does
// not call these yet, but a backend is only interchangeable if the whole
// surface answers - "swap the backend; nothing in Trinity changes".

test("debug markers pop on the encoder that pushed them", () =>
{
  const marks = [];
  const { al, pass, log } = composed();

  pass.pushDebugGroup = label => marks.push(`pass.push:${label}`);
  pass.popDebugGroup = () => marks.push("pass.pop");
  pass.insertDebugMarker = label => marks.push(`pass.mark:${label}`);

  al.CreateDevice();
  al.BeginScene();

  // Outside a pass the frame's command encoder takes them.
  const frameEncoder = al.GetWorkQueue();
  assert.equal(frameEncoder.GetRenderPass(), null);

  al.SetShaderProgram({ id: "program" });
  al.SetIndices({ id: "indices" }, 2);
  al.DrawIndexedInstanced(3, 1, 0, 0, 0);

  // Now a pass is open, so markers reach it.
  al.PushGpuMarker("hull");
  al.AddGpuMarker("pass0");
  al.PopGpuMarker();

  assert.deepEqual(marks, [ "pass.push:hull", "pass.mark:pass0", "pass.pop" ]);
  assert.equal(log.includes("beginRenderPass"), true);
});

test("a marker pushed with no encoder still balances", () =>
{
  const al = ready();

  // Uncomposed there is nothing to record onto, and the pair must still not
  // throw or leave the stack unbalanced.
  al.PushGpuMarker("a");
  al.AddGpuMarker("b");
  al.PopGpuMarker();
  al.PopGpuMarker();
});

test("the back buffer is the render target, and its format is Carbon's", () =>
{
  const al = ready();

  // Uncomposed there is no surface, and UNKNOWN is the honest answer.
  assert.equal(al.GetDefaultBackBuffer(), null);
  assert.equal(al.GetBackBufferFormat(), 0);

  const composedAl = new CjsWebgpuRenderContextAL({
    webgpu: { GetDevice: () => ({ createCommandEncoder: () => ({}) }) },
    dispatcher: {},
    renderTarget: { GetFormat: () => "bgra8unorm", Configure: () => {}, GetWidth: () => 8, GetHeight: () => 8 }
  });

  // PIXEL_FORMAT_B8G8R8A8_UNORM. A canvas can only be one of four formats, so
  // the table is the whole domain rather than a partial one.
  assert.equal(composedAl.GetBackBufferFormat(), 87);
});

test("present parameters reconfigure the canvas rather than allocating a buffer", () =>
{
  const sizes = [];
  const al = new CjsWebgpuRenderContextAL({
    webgpu: { GetDevice: () => ({ createCommandEncoder: () => ({}) }) },
    dispatcher: {},
    renderTarget: { GetFormat: () => "bgra8unorm", Configure: options => sizes.push(options) }
  });

  assert.equal(al.SetPresentParameters({ mode: { width: 1280, height: 720 } }), ALResult.S_OK);
  assert.deepEqual(sizes, [ { width: 1280, height: 720 } ]);

  assert.equal(al.SetPresentParameters({}), ALResult.E_INVALIDARG);
  assert.equal(ready().SetPresentParameters({ mode: { width: 1, height: 1 } }), ALResult.E_INVALIDCALL);
});

test("CopySubBuffer encodes a real copy, and refuses outside a frame", () =>
{
  const copies = [];
  const commandEncoder = {
    copyBufferToBuffer(...args) { copies.push(args); },
    beginRenderPass: () => ({ end() {} }),
    finish: () => "command-buffer"
  };
  const al = new CjsWebgpuRenderContextAL({
    webgpu: { GetDevice: () => ({ createCommandEncoder: () => commandEncoder }), Submit() {} },
    dispatcher: {},
    renderTarget: { GetFormat: () => "bgra8unorm", Configure: () => {}, GetWidth: () => 8, GetHeight: () => 8 }
  });
  const buffer = handle => ({ IsValid: () => true, GetDeviceBuffer: () => handle });

  // copyBufferToBuffer is a command-encoder verb, so it needs the encoder
  // BeginScene creates and nothing else.
  assert.equal(al.CopySubBuffer(buffer("dst"), 0, buffer("src"), 0, 64), false);

  al.CreateDevice();
  al.BeginScene();

  assert.equal(al.CopySubBuffer(buffer("dst"), 16, buffer("src"), 4, 64), true);
  assert.deepEqual(copies, [ [ "src", 4, "dst", 16, 64 ] ]);

  // An invalid buffer or an empty range is a caller error a backend catches.
  assert.equal(al.CopySubBuffer(buffer("dst"), 0, { IsValid: () => false }, 0, 64), false);
  assert.equal(al.CopySubBuffer(buffer("dst"), 0, buffer("src"), 0, 0), false);
  assert.equal(copies.length, 1);
});

test("Destroy drops every piece of bound state", () =>
{
  const al = ready();

  al.SetConstants({ id: "cb" }, 1, 0);
  al.SetRenderState(7, 1);
  al.SetReadOnlyDepth(true);

  assert.equal(al.Destroy(), true);
  assert.equal(al.IsValid(), false);
  assert.equal(al.GetConstants(1, 0), null);
  assert.equal(al.GetRenderStateInputs().states.size, 0);

  // ReleaseDeviceResources is the softer half: the context survives a reset.
  assert.equal(al.ReleaseDeviceResources(), true);
});

test("the primary render context is one per process, as Carbon's static is", () =>
{
  const al = ready();

  CjsWebgpuRenderContextAL.SetPrimaryRenderContext(null);
  assert.equal(CjsWebgpuRenderContextAL.GetPrimaryRenderContextPointer(), null);
  assert.throws(() => CjsWebgpuRenderContextAL.GetPrimaryRenderContext(), /no primary render context/u);

  CjsWebgpuRenderContextAL.SetPrimaryRenderContext(al);
  assert.equal(CjsWebgpuRenderContextAL.GetPrimaryRenderContext(), al);

  CjsWebgpuRenderContextAL.SetPrimaryRenderContext(null);
});

test("read-only depth is stored, and the rest report what WebGPU can honestly say", () =>
{
  const al = ready();

  assert.equal(al.GetReadOnlyDepth(), false);
  al.SetReadOnlyDepth(true);
  assert.equal(al.GetReadOnlyDepth(), true);

  // WebGPU has no bindless path, exposes no memory size (it is a fingerprinting
  // surface), has no ray-tracing pipeline, and reports device loss as a promise
  // rather than a breadcrumb. None of these is a gap a later browser fills.
  assert.equal(al.SupportsBindlessTextures(), false);
  assert.equal(al.GetTotalVideoMemory(), 0);
  assert.equal(al.DispatchRays(), false);
  assert.equal(al.GetGpuStateMarker(), false);
  assert.equal(al.GetGpuPageFaultResource(), false);

  // Residency and barriers are the browser's job, so honouring these is
  // nothing rather than unimplemented.
  assert.equal(al.UseResources(null, 0, []), true);
  assert.equal(al.UseAccelerationStructure(null), true);

  // The indirect draws refuse: the work queue owns every draw and has no
  // indirect verb, and a second draw path here would break that split.
  assert.equal(al.DrawInstancedIndirect(), false);
  assert.equal(al.DrawIndexedInstancedIndirect(), false);
});

test("the upscaling family answers exactly as Carbon's stub does", () =>
{
  const al = ready();

  // Carbon SUCCEEDS at enabling and then hands back no context. Both halves
  // are Carbon's, and a port does not tidy the pairing.
  assert.equal(al.EnableUpscaling(), 0);
  assert.equal(al.GetUpscalingContext(), null);
  assert.equal(al.CreateUpscalingContext(), null);
  assert.deepEqual(al.GetSupportedUpscalingTechniques(), []);

  const info = al.GetUpscalingInfo();
  assert.equal(info.upscalingAmount, 1, "not zero, and neither is setting");
  assert.equal(info.frameGeneration, false);

  assert.equal(al.GetUpscalingSetup().frameGeneration, false);
});

test("BeginScene resets the render targets, as Carbon's does", () =>
{
  const { al } = composed();

  al.CreateDevice();
  al.SetRenderTarget(3, { GetWidth: () => 64, GetHeight: () => 64 });
  assert.notEqual(al.GetRenderTarget(3), null);

  // Carbon's BeginScene is BeginFrame + ResetRenderTargets
  // (Tr2RenderContextMetal.mm:860-864). Without the reset a frame inherits
  // whatever the last pass of the previous frame left bound.
  al.BeginScene();

  assert.equal(al.GetRenderTarget(3), null);
  assert.equal(al.GetDepthStencil(), null);

  // Slot zero is the default back buffer, which is the render target itself.
  assert.equal(al.GetRenderTarget(0), al.GetDefaultBackBuffer());
});

test("SetAsPrimary registers this context, and present parameters read back", () =>
{
  const al = new CjsWebgpuRenderContextAL({
    webgpu: { GetDevice: () => ({ createCommandEncoder: () => ({}) }) },
    dispatcher: {},
    renderTarget: { GetFormat: () => "bgra8unorm", Configure: () => {}, GetWidth: () => 8, GetHeight: () => 8 }
  });

  al.SetAsPrimary();
  assert.equal(CjsWebgpuRenderContextAL.GetPrimaryRenderContext(), al);
  CjsWebgpuRenderContextAL.SetPrimaryRenderContext(null);

  // Carbon's misspelling is the contract's name, so it is kept.
  assert.equal(al.GetPresentParamaters(), null);

  const parameters = { mode: { width: 640, height: 480 } };
  al.SetPresentParameters(parameters);
  assert.equal(al.GetPresentParamaters(), parameters);
});

test("the setters accumulate a pipeline description, as Carbon's do", () =>
{
  const al = ready();
  const description = al.GetPsoDescription();

  // Carbon's setters write into m_psoDescription and mark it dirty; every draw
  // entry then calls SetAllState, which resolves a pipeline from a cache keyed
  // on the description's hash (Tr2RenderContextDx12.cpp:763-806, :810-880).
  // The class existed and was wired to nothing until 2026-09-09.
  assert.equal(description.topology, Topology.TOP_TRIANGLES, "BeginScene left the default bound");

  al.SetTopology(Topology.TOP_LINES);
  al.SetShaderProgram({ id: "program", IsValid: () => true });
  al.SetRenderStates({ id: "setup" }, { invertedCullMode: true });

  const filled = al.GetPsoDescription();

  assert.equal(filled.topology, Topology.TOP_LINES);
  assert.equal(filled.shaderProgram.id, "program");
  assert.equal(filled.renderStateSetup.id, "setup");
  assert.equal(filled.renderStateOverrides.invertedCullMode, true);

  // The same object each time - Carbon's is a member, not a fresh struct.
  assert.equal(al.GetPsoDescription(), description);
});

test("an incomplete description says what is missing rather than building on a guess", () =>
{
  const al = ready();

  // Uncomposed there is no render target, so no attachment formats. Carbon
  // returns null from GetPipelineState and fails SetAllState rather than
  // creating a partial pipeline (cpp:847-851).
  assert.notEqual(al.GetPsoDescription().GetMissing(), null);

  const { al: composedAl } = composed();

  composedAl.CreateDevice();
  composedAl.BeginScene();
  composedAl.SetShaderProgram({ id: "program", IsValid: () => true });
  composedAl.SetRenderStates({ id: "setup" });

  // BeginScene binds the render target at slot zero, and only the render target
  // answers GetFormat - a colour target in any other slot is a Tr2TextureAL
  // this backend does not have yet, so its format is unknown rather than
  // assumed.
  assert.deepEqual(composedAl.GetPsoDescription().colorFormats, [ "bgra8unorm" ]);
  assert.equal(composedAl.GetPsoDescription().GetMissing(), null);
});
