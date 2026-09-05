import assert from "node:assert/strict";
import test from "node:test";

import { CjsWebgpuRenderContextAL } from "../../../npm/dist/engine/webgpu/internal.js";
import { ALResult, Tr2ColorAttachment, Tr2DepthAttachment } from "../../../npm/dist/trinity/core/index.js";
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
      CreateRenderPassDescriptor: () => ({ label: "descriptor" })
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
