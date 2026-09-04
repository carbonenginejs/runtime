import assert from "node:assert/strict";
import test from "node:test";

import {
  Tr2RenderContext,
  Tr2RenderContextALStub,
  Tr2RingBuffer,
  Tr2RingBufferOffsets
} from "../../npm/dist/trinity/core/index.js";

const STRIDE = 16;

/** A ring of `STRIDE`-byte rows over a live stub context. */
function ring(key)
{
  Tr2RingBuffer.ResetInstances();

  const context = new Tr2RenderContext();
  const al = new Tr2RenderContextALStub();

  al.CreateDevice({ mode: { width: 64, height: 64 } });
  context.SetRenderContextAL(al);

  return { context, buffer: Tr2RingBuffer.GetInstance(key, STRIDE, context) };
}

/** `count` rows whose first byte identifies them. */
function rows(count, marker)
{
  const data = new Uint8Array(count * STRIDE);

  for (let index = 0; index < count; index += 1) data[index * STRIDE] = marker;

  return data;
}


test("one arena per data type, and the stride is checked on every ask", () =>
{
  const { context, buffer } = ring("Boosters");

  assert.equal(Tr2RingBuffer.GetInstance("Boosters", STRIDE, context), buffer, "the same type is the same ring");
  assert.notEqual(Tr2RingBuffer.GetInstance("Morphs", STRIDE, context), buffer, "a different type is a different ring");

  assert.throws(
    () => Tr2RingBuffer.GetInstance("Boosters", 32, context),
    /created with stride 16/,
    "two callers cannot disagree about what a row is"
  );
});

test("uploads land end to end and report where they went", () =>
{
  const { buffer } = ring("Boosters");

  assert.equal(buffer.UploadTransforms(rows(4, 1), 4), 0);
  assert.equal(buffer.UploadTransforms(rows(2, 2), 2), 4, "in elements, not bytes");
  assert.equal(buffer.UploadTransforms(rows(1, 3), 1), 6);
});

test("a row count larger than the data given is refused", () =>
{
  // Carbon asserts the stride matches the type. Ours cannot see a type, so it
  // checks the only thing it can: that the bytes are there.
  const { buffer } = ring("Boosters");

  assert.throws(() => buffer.UploadTransforms(rows(2, 1), 4), /need 64, and 32 were given/);
});

test("the ring grows rather than overwriting frames the GPU may be reading", () =>
{
  // The head is behind the tail and would reach it, which means the space in
  // front is locked. Carbon doubles instead of trampling it.
  const { buffer, context } = ring("Boosters");
  const before = buffer.size;

  buffer.UploadTransforms(rows(8, 1), 8);
  buffer.PrepareBuffer(context);

  // Nothing has completed, so the tail has not moved and the whole ring is
  // locked behind it.
  buffer.UploadTransforms(rows(before, 2), before);

  assert.equal(buffer.size, before * 2, "doubled");
  assert.ok(buffer.tail >= before, "the tail sits in the new space");
});

test("a frame's uploads are only freed once the device is two frames past them", () =>
{
  // Carbon distrusts the completed number and clamps it to two behind the one
  // being recorded, because freeing a frame still being read corrupts it.
  const { buffer, context } = ring("Boosters");

  buffer.SetFrameNumbers(10, 9);
  buffer.UploadTransforms(rows(4, 1), 4);
  buffer.PrepareBuffer(context);

  const lockedTail = buffer.tail;

  buffer.SetFrameNumbers(11, 11);

  assert.equal(buffer.tail, lockedTail, "an over-eager completed number is not believed");

  buffer.SetFrameNumbers(13, 13);

  assert.equal(buffer.tail, 4, "and two frames later the rows are released");
});

test("a cursor uploads once per frame, however often it is asked", () =>
{
  // An object updated twice in a frame must not eat the ring twice.
  const { buffer } = ring("Boosters");
  const offsets = new Tr2RingBufferOffsets();

  assert.equal(offsets.GetCurrentFrameOffset(), Tr2RingBufferOffsets.INVALID_OFFSET);

  offsets.UploadTransforms(buffer, rows(4, 1), 4);
  const first = offsets.GetCurrentFrameOffset();

  offsets.UploadTransforms(buffer, rows(4, 2), 4);

  assert.equal(offsets.GetCurrentFrameOffset(), first, "the second upload in a frame is ignored");
  assert.equal(buffer.head, 4, "and the ring did not grow for it");
});

test("the cursor keeps last frame's offset, which is why it exists", () =>
{
  const { buffer } = ring("Boosters");
  const offsets = new Tr2RingBufferOffsets();

  offsets.UploadTransforms(buffer, rows(2, 1), 2);

  assert.equal(offsets.GetPreviousFrameOffset(), offsets.GetCurrentFrameOffset(),
    "on the first frame, last frame's rows are this frame's");

  offsets.AdvanceFrame();

  assert.equal(offsets.GetCurrentFrameOffset(), Tr2RingBufferOffsets.INVALID_OFFSET, "re-armed");
  assert.equal(offsets.GetPreviousFrameOffset(), 0);

  offsets.UploadTransforms(buffer, rows(2, 2), 2);

  assert.equal(offsets.GetCurrentFrameOffset(), 2);
  assert.equal(offsets.GetPreviousFrameOffset(), 0, "and the frame before is still reachable");
});

test("the ring holds a real backend buffer, named after its data type", () =>
{
  const { buffer } = ring("Boosters");
  const gpu = buffer.GetGpuBuffer();

  assert.ok(gpu, "a buffer exists from the first sizing");
  assert.equal(gpu.IsValid(), true);
  assert.equal(gpu.GetDesc().stride, STRIDE);
  assert.equal(buffer.name, "Boosters");
});

test("a new ring seeds its fence from the context rather than assuming frame zero", () =>
{
  // Carbon seeds before the first sizing (Tr2RingBuffer.cpp:121). Without it a
  // ring created mid-session believes every frame ever recorded is still in
  // flight, and never reclaims anything.
  Tr2RingBuffer.ResetInstances();

  const context = new Tr2RenderContext();
  const al = new Tr2RenderContextALStub();

  al.CreateDevice({ mode: { width: 64, height: 64 } });
  context.SetRenderContextAL(al);

  for (let frame = 0; frame < 5; frame += 1) al.PresentSwapChain();

  assert.equal(context.GetRenderedFrameNumber(), 5, "the device finished five frames");
  assert.equal(context.GetRecordingFrameNumber(), 6, "and is recording the sixth");

  const buffer = Tr2RingBuffer.GetInstance("Seeded", STRIDE, context);

  buffer.UploadTransforms(rows(2, 1), 2);
  buffer.PrepareBuffer(context);

  // The upload was locked at frame 6; two frames later it is reclaimable.
  buffer.SetFrameNumbers(context.GetRecordingFrameNumber(), context.GetRenderedFrameNumber());

  assert.equal(buffer.tail, buffer.size, "nothing reclaimed yet");

  al.PresentSwapChain();
  al.PresentSwapChain();
  buffer.SetFrameNumbers(context.GetRecordingFrameNumber(), context.GetRenderedFrameNumber());

  assert.equal(buffer.tail, 2, "and then the rows are released");
});

test("the device's frame clock is not Trinity's", () =>
{
  // Two clocks on purpose: Trinity counts frames the render path has BEGUN,
  // the device counts frames it has FINISHED, and a ring fences on the gap.
  const context = new Tr2RenderContext();
  const al = new Tr2RenderContextALStub();

  al.CreateDevice();
  context.SetRenderContextAL(al);

  context.AdvanceFrame(1.5);
  context.AdvanceFrame(2.5);

  assert.equal(context.GetCurrentFrameCounter(), 2, "Trinity began two frames");
  assert.equal(context.GetRenderedFrameNumber(), 0, "the device has finished none of them");

  al.PresentSwapChain();

  assert.equal(context.GetRenderedFrameNumber(), 1);
  assert.equal(context.GetCurrentFrameCounter(), 2, "and Trinity's clock did not move");
});
