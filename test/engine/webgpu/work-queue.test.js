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
