import assert from "node:assert/strict";
import test from "node:test";

import { PixelFormat } from "../../npm/dist/global/consts/renderContext/index.js";
import { Tr2LockGuard, Tr2MemoryCounterAL, Tr2MsaaDesc, Tr2BitmapDimensions } from "../../npm/dist/trinityal/index.js";

const { MemoryType } = Tr2MemoryCounterAL;

const totals = () => [
  Tr2MemoryCounterAL.gpuMemoryTotalEst,
  Tr2MemoryCounterAL.gpuMemoryBufferEst,
  Tr2MemoryCounterAL.gpuMemoryTextureEst,
  Tr2MemoryCounterAL.gpuMemoryOtherEst
];

test("Tr2MemoryCounterAL counts per memory type and takes it back on Reset", () =>
{
  const before = totals();
  const buffer = new Tr2MemoryCounterAL();
  const texture = new Tr2MemoryCounterAL();
  const other = new Tr2MemoryCounterAL();
  const system = new Tr2MemoryCounterAL();

  buffer.Set__Size(MemoryType.BUFFER, 100);
  texture.Set__Size(MemoryType.TEXTURE, 40);
  other.Set__Size(MemoryType.OTHER, 8);
  system.Set__Size(MemoryType.SYSTEM_MEMORY, 1000);

  assert.deepEqual(totals(), [ before[0] + 148, before[1] + 100, before[2] + 40, before[3] + 8 ]);

  buffer.Grow(20);
  buffer.Shrink(10);
  assert.equal(Tr2MemoryCounterAL.gpuMemoryBufferEst, before[1] + 110);

  // Setting again releases the previous size first.
  buffer.Set__Size(MemoryType.BUFFER, 5);
  assert.equal(Tr2MemoryCounterAL.gpuMemoryBufferEst, before[1] + 5);

  for (const counter of [ buffer, texture, other, system ]) counter.Destruct();
  assert.deepEqual(totals(), before);
});

test("Tr2MemoryCounterAL.Set__Bitmap sums every mip of every slice per sample", () =>
{
  const before = totals();
  const bitmap = Tr2BitmapDimensions.create__WidthHeightMipCountFormat(16, 16, 0, PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM);
  const counter = new Tr2MemoryCounterAL();

  counter.Set__Bitmap(MemoryType.TEXTURE, bitmap, new Tr2MsaaDesc(4, 0));

  let expected = 0;
  for (let mip = 0; mip < bitmap.GetTrueMipCount(); ++mip) expected += bitmap.GetMipSize(mip) * bitmap.GetArraySize() * 4;

  assert.equal(Tr2MemoryCounterAL.gpuMemoryTextureEst, before[2] + expected);

  counter.Reset();
  assert.deepEqual(totals(), before);
});

test("a moved counter leaves the source at zero and hands the bytes on", () =>
{
  const before = totals();
  const source = new Tr2MemoryCounterAL();

  source.Set__Size(MemoryType.OTHER, 64);

  const moved = Tr2MemoryCounterAL.create__Move(source);
  assert.equal(Tr2MemoryCounterAL.gpuMemoryOtherEst, before[3] + 64);

  source.Reset();
  assert.equal(Tr2MemoryCounterAL.gpuMemoryOtherEst, before[3] + 64, "the source gave its bytes away");

  const target = new Tr2MemoryCounterAL();
  target.Set__Size(MemoryType.OTHER, 10);
  assert.equal(target.Assign__Move(moved), target);
  assert.equal(Tr2MemoryCounterAL.gpuMemoryOtherEst, before[3] + 64, "the old 10 was released, the 64 adopted");

  target.Assign__Move(target);
  assert.equal(Tr2MemoryCounterAL.gpuMemoryOtherEst, before[3] + 64, "self-assignment is a no-op");

  target.Destruct();
  assert.deepEqual(totals(), before);
});

test("Tr2LockGuard hands out 0xde scratch and copies it back on unlock", () =>
{
  const real = new Uint8Array([ 1, 2, 3, 4 ]);
  const guard = new Tr2LockGuard();

  assert.equal(guard.GetMemory(), null);

  guard.Lock(4, real);
  const scratch = guard.GetMemory();
  assert.deepEqual([ ...scratch ], [ 0xde, 0xde, 0xde, 0xde ]);
  assert.deepEqual([ ...real ], [ 1, 2, 3, 4 ], "the real memory is untouched while locked");

  scratch.set([ 9, 8, 7, 6 ]);
  guard.Unlock();

  assert.deepEqual([ ...real ], [ 9, 8, 7, 6 ]);
  assert.equal(guard.GetMemory(), null);

  // Unlocking with nothing locked does nothing.
  guard.Unlock();
});

test("Tr2LockGuard keeps the scratch when there is no real memory, as Carbon does", () =>
{
  const guard = new Tr2LockGuard();

  guard.Lock(2, null);
  guard.Unlock();

  assert.equal(guard.GetMemory().length, 2);

  guard.Destruct();
  assert.equal(guard.GetMemory(), null);
});

test("the bare Set routes a Number to Set__Size and a bitmap to Set__Bitmap", () =>
{
  const before = totals();
  const bitmap = Tr2BitmapDimensions.create__WidthHeightMipCountFormat(8, 8, 1, PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM);
  const sized = new Tr2MemoryCounterAL();
  const mapped = new Tr2MemoryCounterAL();

  sized.Set(MemoryType.BUFFER, 32);
  assert.equal(Tr2MemoryCounterAL.gpuMemoryBufferEst, before[1] + 32);

  mapped.Set(MemoryType.TEXTURE, bitmap);
  assert.equal(Tr2MemoryCounterAL.gpuMemoryTextureEst, before[2] + bitmap.GetMipSize(0) * bitmap.GetArraySize());

  sized.Destruct();
  mapped.Destruct();
  assert.deepEqual(totals(), before);
});
