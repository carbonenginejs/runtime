import assert from "node:assert/strict";
import test from "node:test";

import { CjsWebgpuWorkQueue, EncoderType } from "../../../npm/dist/trinityal/webgpu/internal.js";
import { Tr2ColorAttachment, Tr2DepthAttachment } from "../../../npm/dist/trinityal/index.js";
import { Tr2LoadAction, Tr2StoreAction } from "../../../npm/dist/global/consts/renderContext/index.js";

const clear = () => new Tr2ColorAttachment(Tr2LoadAction.CLEAR, Tr2StoreAction.STORE, 0);
const keep = () => new Tr2ColorAttachment(Tr2LoadAction.LOAD, Tr2StoreAction.STORE, 0);

const started = () =>
{
  const queue = new CjsWebgpuWorkQueue();

  queue.BeginFrame();

  return queue;
};

test("a render pass opens on the work that needs one, not before", () =>
{
  // Metal is lazy: SetCurrentEncoder opens an encoder for the first thing that
  // needs one (mm:840-900). A hint on its own encodes nothing.
  const queue = started();

  queue.RenderPassHint([ clear() ], new Tr2DepthAttachment(Tr2LoadAction.CLEAR, Tr2StoreAction.STORE, 1));

  assert.equal(queue.GetCurrentEncoderType(), EncoderType.NONE);
  assert.equal(queue.GetPassCount(), 0);
  assert.equal(queue.HasPendingRenderPassHint(), true);

  const events = queue.SetCurrentEncoder(EncoderType.RENDER);

  assert.equal(queue.GetCurrentEncoderType(), EncoderType.RENDER);
  assert.equal(queue.GetPassCount(), 1);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "open");
  assert.deepEqual(events[0].attachments.colors, [ { loadOp: "clear", storeOp: "store", clearValue: 0 } ]);
  assert.equal(events[0].attachments.depth.loadOp, "clear");
});

test("consecutive draws share one pass", () =>
{
  // The whole point of being lazy: nothing cuts a pass that does not have to be
  // cut, so a run of draws costs one encoder.
  const queue = started();

  queue.SetCurrentEncoder(EncoderType.RENDER);
  const second = queue.SetCurrentEncoder(EncoderType.RENDER);
  const third = queue.SetCurrentEncoder(EncoderType.RENDER);

  assert.deepEqual(second, [], "already open, nothing to do");
  assert.deepEqual(third, []);
  assert.equal(queue.GetPassCount(), 1);
});

test("a hint arriving mid-pass cuts a new one", () =>
{
  // A pending hint describes the NEXT pass, so an open render encoder is the
  // wrong one to keep drawing into even though its type matches.
  const queue = started();

  queue.SetCurrentEncoder(EncoderType.RENDER);
  queue.RenderPassHint([ keep() ]);

  const events = queue.SetCurrentEncoder(EncoderType.RENDER);

  assert.equal(queue.GetPassCount(), 2);
  assert.deepEqual(events.map(event => event.type), [ "close", "open" ]);
  assert.deepEqual(events[1].attachments.colors, [ { loadOp: "load", storeOp: "store", clearValue: 0 } ]);
});

test("a second hint flushes the first rather than dropping it", () =>
{
  // Carbon opens and immediately releases a render encoder (mm:3282-3291). The
  // first hint described a pass that must happen: its load and store actions
  // are the point even when nothing drew. Dropping it would lose a clear.
  const queue = started();

  queue.RenderPassHint([ clear() ]);
  queue.RenderPassHint([ keep() ]);

  assert.equal(queue.GetPassCount(), 1, "the first hint became a real pass");
  assert.equal(queue.HasPendingRenderPassHint(), true, "the second is still pending");
});

test("compute may not happen inside a render pass", () =>
{
  const queue = started();

  queue.SetCurrentEncoder(EncoderType.RENDER);

  const events = queue.SetCurrentEncoder(EncoderType.COMPUTE);

  assert.deepEqual(events.map(event => event.type), [ "close", "open" ]);
  assert.equal(events[0].encoderType, EncoderType.RENDER);
  assert.equal(events[1].encoderType, EncoderType.COMPUTE);
});

test("a pending hint is flushed before non-render work", () =>
{
  // Carbon flushes ahead of any non-render encoder (mm:851-855), because the
  // declared pass has to happen before the work that follows it.
  const queue = started();

  queue.RenderPassHint([ clear() ]);
  queue.SetCurrentEncoder(EncoderType.COMPUTE);

  assert.equal(queue.GetPassCount(), 1, "the declared pass ran first");
  assert.equal(queue.GetCurrentEncoderType(), EncoderType.COMPUTE);
  assert.equal(queue.HasPendingRenderPassHint(), false);
});

test("ending the frame flushes a pending hint and commits once", () =>
{
  const queue = started();

  queue.SetCurrentEncoder(EncoderType.RENDER);
  queue.RenderPassHint([ clear() ]);

  const events = queue.EndFrame();

  assert.equal(queue.GetPassCount(), 2, "the trailing hint still ran");
  assert.deepEqual(events.map(event => event.type), [ "close", "open", "close", "commit" ]);
});

test("an absent hint leaves the descriptor alone", () =>
{
  // Carbon applies actions only when a hint is pending; no hint is NOT
  // DONT_CARE, and a backend that discarded here would throw away contents the
  // caller relies on.
  const queue = started();

  const events = queue.SetCurrentEncoder(EncoderType.RENDER);

  assert.equal(events[0].attachments, null);
});

test("the frame boundary is enforced", () =>
{
  const queue = new CjsWebgpuWorkQueue();

  assert.throws(() => queue.SetCurrentEncoder(EncoderType.RENDER), /outside a frame/);

  queue.BeginFrame();

  assert.throws(() => queue.BeginFrame(), /without EndFrame/);
});

test("with a command encoder attached, opening an encoder opens a real pass", () =>
{
  // The device is optional on purpose: the RULES above need no GPU, which is
  // what makes them testable and is why Carbon ships a stub backend. This
  // asserts the rules are unchanged when a device rides along.
  const calls = [];
  const pass = { end: () => calls.push("end") };
  const commandEncoder = {
    beginRenderPass(descriptor)
    {
      calls.push(`begin:${descriptor.label}`);
      return pass;
    }
  };

  const queue = new CjsWebgpuWorkQueue();

    // describePass is handed NULL when no hint was declared - Carbon only
  // applies load/store actions for a pending hint.
  queue.SetCommandEncoder(commandEncoder, attachments => ({ label: attachments ? `rt${attachments.colors.length}` : "default" }));
  queue.BeginFrame();

  assert.equal(queue.GetRenderPass(), null, "nothing is open before work asks for one");

  const opened = queue.RequireRenderPass();

  assert.equal(opened, pass, "the live pass is handed back for the dispatcher to encode into");
  assert.equal(queue.RequireRenderPass(), pass, "asking twice does not open a second pass");

  queue.EndFrame();

  assert.deepEqual(calls, [ "begin:default", "end" ], "one pass, ended by EndFrame");
  assert.equal(queue.GetRenderPass(), null);
});

test("a pass hint closes the open pass and opens the next one", () =>
{
  const ended = [];
  let opened = 0;
  const commandEncoder = {
    beginRenderPass()
    {
      opened += 1;
      const id = opened;
      return { end: () => ended.push(id) };
    }
  };

  const queue = new CjsWebgpuWorkQueue();

  queue.SetCommandEncoder(commandEncoder, () => ({}));
  queue.BeginFrame();
  queue.RequireRenderPass();

  // A hint is Carbon's declaration that the NEXT pass differs, so the open one
  // has to end - lazily, at the moment work needs an encoder again.
  queue.RenderPassHint([], null);
  assert.equal(opened, 1, "the hint alone opens nothing");

  queue.RequireRenderPass();
  assert.equal(opened, 2, "the next draw opens the second pass");
  assert.deepEqual(ended, [ 1 ], "and the first was ended first");

  queue.EndFrame();
  assert.deepEqual(ended, [ 1, 2 ]);
});

test("with no command encoder the queue still reports transitions and draws nothing", () =>
{
  const queue = new CjsWebgpuWorkQueue();

  queue.BeginFrame();

  assert.equal(queue.RequireRenderPass(), null, "no device, no pass");

  const events = queue.EndFrame();

  assert.ok(events.some(event => event.type === "open"), "the rules still ran");
});

test("a dispatch opens a compute pass, binds its pipeline and groups, and closes with the encoder", () =>
{
  // Metal's DispatchThreadgroups on the compute encoder; the pass ends when the
  // encoder is released, as a render pass does.
  const calls = [];
  const computePass = {
    setPipeline: pipeline => calls.push([ "setPipeline", pipeline ]),
    setBindGroup: (index, group, offsets) => calls.push([ "setBindGroup", index, group, offsets ]),
    dispatchWorkgroups: (x, y, z) => calls.push([ "dispatch", x, y, z ]),
    end: () => calls.push([ "end" ])
  };
  const commandEncoder = {
    beginComputePass: () => { calls.push([ "begin" ]); return computePass; },
    beginRenderPass: () => ({ end() {} })
  };
  const queue = started();

  queue.SetCommandEncoder(commandEncoder, () => ({}));
  queue.SetComputePipeline("pipeline");
  queue.SetBindGroup(0, "group0");
  const events = queue.DispatchThreadgroups(32, 32, 6);

  assert.equal(queue.GetCurrentEncoderType(), EncoderType.COMPUTE);
  assert.deepEqual(events.map(event => event.type), [ "open", "dispatch" ]);
  assert.deepEqual(calls, [
    [ "begin" ],
    [ "setPipeline", "pipeline" ],
    [ "setBindGroup", 0, "group0", [] ],
    [ "dispatch", 32, 32, 6 ]
  ]);

  queue.SetCurrentEncoder(EncoderType.RENDER);
  assert.deepEqual(calls.at(-1), [ "end" ], "moving to another encoder ends the compute pass");
});

test("generating mips ends the open pass first, then encodes the chain", () =>
{
  // Metal generates mips on a blit encoder, so whatever pass was open ends
  // before the chain is encoded; later work sees the filled levels.
  const calls = [];
  const computePass = { setPipeline() {}, setBindGroup() {}, dispatchWorkgroups() {}, end: () => calls.push("compute.end") };
  const commandEncoder = {
    beginComputePass: () => computePass,
    beginRenderPass: () => ({ end() {} })
  };
  const generator = { Encode: (encoder, texture) => calls.push([ "encode", encoder === commandEncoder, texture ]) };
  const queue = started();

  queue.SetCommandEncoder(commandEncoder, () => ({}));
  queue.SetComputePipeline("pipeline");
  queue.DispatchThreadgroups(1, 1, 1);
  const events = queue.GenerateMipMaps("cube", generator);

  assert.deepEqual(calls, [ "compute.end", [ "encode", true, "cube" ] ]);
  assert.deepEqual(events.map(event => event.type), [ "close", "generate-mips" ]);
  assert.equal(queue.GetCurrentEncoderType(), EncoderType.NONE);
});

test("a texture copy closes the open pass and records on the command encoder", () =>
{
  // Metal's CopyTextureToTexture records a blit and releases the encoder
  // (MetalWorkQueue.mm:1381-1405). WebGPU copies on the command encoder, so the
  // open render pass must end first; the array slice rides in origin.z.
  const calls = [];
  const commandEncoder = {
    beginRenderPass: () => ({ end: () => calls.push("end") }),
    copyTextureToTexture: (source, destination, size) => calls.push({ source, destination, size })
  };
  const queue = new CjsWebgpuWorkQueue();

  queue.SetCommandEncoder(commandEncoder, () => ({}));
  queue.BeginFrame();
  queue.RequireRenderPass();

  const src = { id: "src" };
  const dst = { id: "dst" };
  const events = queue.CopyTextureToTexture(src, 2, 1, { x: 4, y: 5, z: 0 }, { width: 8, height: 9, depthOrArrayLayers: 1 }, dst, 3, 0, { x: 0, y: 0, z: 0 });

  assert.equal(calls[0], "end", "the render pass ended before the copy");
  assert.deepEqual(calls[1], {
    source: { texture: src, mipLevel: 1, origin: { x: 4, y: 5, z: 2 } },
    destination: { texture: dst, mipLevel: 0, origin: { x: 0, y: 0, z: 3 } },
    size: { width: 8, height: 9, depthOrArrayLayers: 1 }
  });
  assert.ok(events.some(event => event.type === "copy-texture"));
  assert.equal(queue.GetRenderPass(), null);
});

test("a clear runs on the attachments bound when it was made, before they change", () =>
{
  // Metal's ClearAttachment puts the clear on the CURRENT descriptor, and
  // SetRenderAttachments runs it (FlushOutstandingOperations) before changing
  // the attachment (mm:380-405, 2000-2012, 2845-2881). The space scene clears
  // its colour, then the depth pass binds the normal map: the clear must land
  // on the colour, not on the normal map.
  const queue = started();
  const color = { id: "customBackBuffer" };
  const normal = { id: "normalMap" };

  queue.SetRenderAttachments(color, 0);
  queue.ClearAttachment([ clear() ], new Tr2DepthAttachment(Tr2LoadAction.CLEAR, Tr2StoreAction.STORE, 0));
  assert.equal(queue.GetPassCount(), 0, "a clear on its own encodes nothing");

  const events = queue.SetRenderAttachments(normal, 0);
  const opened = events.find(event => event.type === "open");

  assert.equal(queue.GetPassCount(), 1, "the clear ran in a pass of its own");
  assert.equal(opened.attachments.colors[0].loadOp, "clear");
  assert.ok(events.findIndex(event => event.type === "close") > events.indexOf(opened));

  // The normal map's pass loads: the clear was consumed.
  const next = queue.SetCurrentEncoder(EncoderType.RENDER);
  assert.equal(next.find(event => event.type === "open").attachments, null);
});

test("a clear is ignored while a hint is pending, and a hint survives an attachment change", () =>
{
  // mm:2850-2853: the pending hint's actions govern. FlushOutstandingOperations
  // backs the hint up and restores it (mm:397-404).
  const queue = started();

  queue.SetRenderAttachments({ id: "a" }, 0);
  queue.RenderPassHint([ keep() ]);
  queue.ClearAttachment([ clear() ]);
  queue.SetRenderAttachments({ id: "b" }, 0);

  assert.equal(queue.GetPassCount(), 0, "no clear to flush");
  assert.equal(queue.HasPendingRenderPassHint(), true);

  const opened = queue.SetCurrentEncoder(EncoderType.RENDER).find(event => event.type === "open");
  assert.equal(opened.attachments.colors[0].loadOp, "load");
});

test("a viewport reaches the pass at the next draw, again in every new pass, cut to the attachment", () =>
{
  // Metal holds the viewport and sets it from EmitRenderEncoderState, and a
  // new encoder dirties everything (MetalWorkQueue.mm:1786-1795, 2166-2171).
  // The shadow atlas depends on it: each cascade draws into its own cell.
  const calls = [];
  const pass = () => ({
    setViewport: (...args) => calls.push([ "viewport", ...args ]),
    draw: () => calls.push([ "draw" ]),
    end() {}
  });
  const atlas = { GetWidth: () => 4096, GetHeight: () => 1024 };
  const queue = new CjsWebgpuWorkQueue();

  queue.SetCommandEncoder({ beginRenderPass: pass }, () => ({}));
  queue.BeginFrame();
  queue.SetDepthAttachment(atlas);

  queue.DrawPrimitives(3, 1, 0, 0);
  assert.deepEqual(calls, [ [ "draw" ] ], "no viewport is applied before one is set");

  calls.length = 0;
  queue.SetViewport(1024, 0, 512, 512, 0, 1);
  queue.DrawPrimitives(3, 1, 0, 0);
  queue.DrawPrimitives(3, 1, 0, 0);
  assert.deepEqual(calls, [ [ "viewport", 1024, 0, 512, 512, 0, 1 ], [ "draw" ], [ "draw" ] ], "set once, before the draw");

  calls.length = 0;
  queue.RenderPassHint([], null);
  queue.DrawPrimitives(3, 1, 0, 0);
  assert.deepEqual(calls, [ [ "viewport", 1024, 0, 512, 512, 0, 1 ], [ "draw" ] ], "a new pass is told again");

  // WebGPU refuses a viewport outside the attachment, where D3D11 clips.
  calls.length = 0;
  queue.SetViewport(3584, -8, 1024, 2048, 0, 1);
  queue.DrawPrimitives(3, 1, 0, 0);
  assert.deepEqual(calls[0], [ "viewport", 3584, 0, 512, 1024, 0, 1 ]);

  queue.EndFrame();
});

test("a LOAD hint keeps a pending CLEAR, taking the hint's store and clear value (MetalWorkQueue.mm:783-805)", async () =>
{
  const { MergeHintOverClear } = await import("../../../npm/dist/trinityal/webgpu/core/CjsWebgpuWorkQueue.js");
  const { Tr2LoadAction, Tr2StoreAction } = await import("../../../npm/dist/global/consts/renderContext/index.js");
  const clear = {
    colors: [ { load: Tr2LoadAction.CLEAR, store: Tr2StoreAction.STORE, clearColor: [ 0.1, 0.2, 0.3, 1 ] } ],
    depth: { load: Tr2LoadAction.CLEAR, store: Tr2StoreAction.STORE, clearValue: 0 }
  };
  const hint = {
    colors: [ { load: Tr2LoadAction.LOAD, store: Tr2StoreAction.STORE, clearColor: 0 } ],
    depth: { load: Tr2LoadAction.LOAD, store: Tr2StoreAction.STORE, clearValue: 0 }
  };
  const merged = MergeHintOverClear(hint, clear);
  assert.equal(merged.colors[0].load, Tr2LoadAction.CLEAR);
  assert.equal(merged.depth.load, Tr2LoadAction.CLEAR);
  // Quirk: the hint's clear value wins.
  assert.equal(merged.colors[0].clearColor, 0);
  // Without a pending clear the hint stands; without a hint the clear does.
  assert.equal(MergeHintOverClear(hint, null), hint);
  assert.equal(MergeHintOverClear(null, clear), clear);
});
