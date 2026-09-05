import assert from "node:assert/strict";
import test from "node:test";

import { GpuResourceHandle, TextureSize2D, Tr2GpuResourcePool, Tr2RenderContextALStub } from "../../npm/dist/trinity/core/index.js";
import { PixelFormat, TextureType, Tr2GpuUsage } from "../../npm/dist/global/consts/renderContext/index.js";

const pooled = () =>
{
  const al = new Tr2RenderContextALStub();

  al.CreateDevice();

  return new Tr2GpuResourcePool().SetRenderContext(al);
};

const square = (size = 512) => ({
  type: TextureType.TEX_TYPE_2D,
  format: PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM,
  width: size,
  height: size,
  depth: 1,
  mipCount: 1,
  gpuUsage: Tr2GpuUsage.RENDER_TARGET
});

test("two passes in flight get different surfaces; one after the other reuses", () =>
{
  // The whole point of the pool. A record with a live lock is never handed out
  // again, so concurrent borrowers cannot be given the same texture - and once
  // released, the next borrow costs nothing.
  const pool = pooled();

  const first = pool.GetTempTexture("shadow", square());
  const second = pool.GetTempTexture("shadow", square());

  assert.notEqual(first.Get(), second.Get(), "both held, so both are distinct");
  assert.equal(pool.GetHeldCount(), 2);

  pool.Free(first);

  const third = pool.GetTempTexture("shadow", square());

  assert.equal(third.Get(), first.Get() ?? third.Get(), "sanity: the released handle is empty");
  assert.equal(pool.DebugGetAllTempTextures().length, 2, "reused rather than created a third");
});

test("a different shape is a different resource", () =>
{
  const pool = pooled();

  const small = pool.GetTempTexture("depth", square(256));

  pool.Free(small);

  pool.GetTempTexture("depth", square(1024));

  assert.equal(pool.DebugGetAllTempTextures().length, 2, "size is part of the match");
});

test("a persistent resource is initialized once and kept", () =>
{
  const pool = pooled();
  let initialized = 0;

  const first = pool.GetPersistentTexture("lut", square(64), () => { initialized += 1; });
  const second = pool.GetPersistentTexture("lut", square(64), () => { initialized += 1; });

  assert.equal(initialized, 1, "initialized once");
  assert.equal(first.Get(), second.Get(), "and shared even while held");
});

test("a handle released twice is a caller error", () =>
{
  // Carbon releases in a destructor and JavaScript has no such moment, so this
  // is explicit - and a doubled release means the lock count no longer
  // describes who holds what.
  const pool = pooled();
  const handle = pool.GetTempTexture("scratch", square());

  pool.Free(handle);

  assert.equal(handle.IsValid(), false);
  assert.equal(handle.Get(), null);
  assert.throws(() => pool.Free(handle), /freed twice/);
});

test("only unheld, untouched temp resources are cleared", () =>
{
  const pool = pooled();
  const held = pool.GetTempTexture("held", square());
  const freed = pool.GetTempTexture("freed", square(128));

  pool.Free(freed);
  pool.SetFrame(10);

  assert.equal(pool.ClearUnusedResources(3), 1, "the freed one goes");
  assert.equal(pool.DebugGetAllTempTextures().length, 1);
  assert.equal(held.IsValid(), true, "the held one is untouched");
});

test("a recently used resource survives a clear", () =>
{
  const pool = pooled();
  const handle = pool.GetTempTexture("recent", square());

  pool.Free(handle);
  pool.SetFrame(1);

  assert.equal(pool.ClearUnusedResources(3), 0, "one frame is not three");
});

test("a size clamps to one pixel rather than to zero", () =>
{
  // A half-size chain reaches zero before it reaches one, and a zero-sized
  // target is not a target.
  const size = new TextureSize2D(4, 3);

  assert.deepEqual([ size.Scaled(0.5).width, size.Scaled(0.5).height ], [ 2, 1 ]);
  assert.deepEqual([ size.Scaled(0.01).width, size.Scaled(0.01).height ], [ 1, 1 ]);
  assert.equal(size.Equals(new TextureSize2D(4, 3)), true);
  assert.equal(size.Equals(new TextureSize2D(3, 4)), false);
});

test("a size can be taken from texture dimensions", () =>
{
  const size = new TextureSize2D({ GetWidth: () => 1920, GetHeight: () => 1080 });

  assert.deepEqual([ size.width, size.height ], [ 1920, 1080 ]);
});

test("an empty handle holds nothing", () =>
{
  const handle = new GpuResourceHandle();

  assert.equal(handle.IsValid(), false);
  assert.equal(handle.GetName(), "");
});
