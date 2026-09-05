import assert from "node:assert/strict";
import test from "node:test";

import { CjsWebgpuWorkQueue, EncoderType } from "../../../npm/dist/engine/webgpu/internal.js";
import { Tr2ColorAttachment, Tr2DepthAttachment } from "../../../npm/dist/trinity/core/index.js";
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
