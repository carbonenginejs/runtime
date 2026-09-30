import assert from "node:assert/strict";
import test from "node:test";

import { GpuResourceHandle, TextureSize2D, Tr2GpuResourcePool, GetGlobalGpuResourcePool } from "../../npm/dist/trinity/core/index.js";
import { Tr2RenderContextALStub } from "../../npm/dist/trinityal/index.js";
import { PixelFormat, TextureType, Tr2CpuUsage, Tr2GpuUsage } from "../../npm/dist/global/consts/renderContext/index.js";
import { Tr2BufferDescriptionAL } from "../../npm/dist/trinityal/index.js";

const clocks = new WeakMap();
const pooled = () =>
{
  const al = new Tr2RenderContextALStub();

  al.CreateDevice();

  const pool = new Tr2GpuResourcePool().SetRenderContext(al);
  clocks.set(pool, al);
  return pool;
};

test("the core entry point retains the shared global pool accessor", () =>
{
  assert.equal(GetGlobalGpuResourcePool(), GetGlobalGpuResourcePool());
});

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

  const firstImplementation = first.Get().TrinityALImpl_GetObject();
  assert.notEqual(firstImplementation, second.Get().TrinityALImpl_GetObject(), "both held, so implementations are distinct");
  assert.equal(pool.GetHeldCount(), 2);

  pool.Free(first);

  const third = pool.GetTempTexture("shadow", square());

  assert.equal(first.Get(), null);
  assert.equal(third.Get().TrinityALImpl_GetObject(), firstImplementation, "the released implementation is reused");
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
  assert.notEqual(first.Get(), second.Get());
  assert.equal(first.Get().Equals(second.Get()), true, "shared even while held");
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

test("aged membership retires even while a handle retains the resource", () =>
{
  const pool = pooled();
  const held = pool.GetTempTexture("held", square());
  const freed = pool.GetTempTexture("freed", square(128));

  pool.Free(freed);
  clocks.get(pool).GetRecordingFrameNumber = () => 10;

  assert.equal(pool.ClearUnusedResources(3), 2, "both memberships retire");
  assert.equal(pool.DebugGetAllTempTextures().length, 0);
  assert.equal(held.Get().IsValid(), true, "the held value survives retirement");
  pool.Free(held);
  pool.Destroy();
});

test("a recently used resource survives a clear", () =>
{
  const pool = pooled();
  const handle = pool.GetTempTexture("recent", square());

  pool.Free(handle);
  clocks.get(pool).GetRecordingFrameNumber = () => 1;

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

// The buffer accessors had no coverage at all, which is how a two-argument call
// to a three-argument Create survived: the render context landed in initialData,
// renderContext was undefined, and the first line to touch it threw. Every test
// above borrows a TEXTURE.
test("a borrowed buffer is created against the bound context", () =>
{
  const pool = pooled();
  const description = Tr2BufferDescriptionAL.FromStride(24, 4, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.WRITE_OFTEN);

  const handle = pool.GetTempBuffer("blit-quad", description);

  assert.equal(handle.Get().IsValid(), true);
  assert.equal(handle.Get().GetDesc().GetSizeInBytes(), 24 * 4);
});

test("a persistent buffer is initialized once and kept", () =>
{
  const pool = pooled();
  const description = Tr2BufferDescriptionAL.FromStride(16, 2, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.WRITE_OFTEN);
  let initialized = 0;

  const first = pool.GetPersistentBuffer("shared", description, () => initialized++);
  const second = pool.GetPersistentBuffer("shared", description, () => initialized++);

  assert.equal(initialized, 1);
  assert.notEqual(first.Get(), second.Get());
  assert.equal(first.Get().Equals(second.Get()), true);
});

test("initial bytes reach Create, which a buffer the CPU cannot write needs", () =>
{
  // Carbon's BufferInitializer variant (Tr2GpuResourcePool.cpp:240-250): bytes
  // go to Create. Without them the backend refuses a read-only buffer
  // (Tr2BufferALStub.cpp:34-37), as Tr2PostProcessRenderer's exposure buffer is.
  const pool = pooled();
  const description = Tr2BufferDescriptionAL.FromFormat(PixelFormat.PIXEL_FORMAT_R32_FLOAT, 8, Tr2GpuUsage.SHADER_RESOURCE, Tr2CpuUsage.READ);

  assert.equal(pool.GetPersistentBuffer("no bytes", description).Get(), null);
  assert.equal(pool.GetPersistentBuffer("zeroes", description, new Float32Array(8)).Get().IsValid(), true);
});

test("the pool creates through the bound backend rather than a named class", () =>
{
  // It used to do `new Tr2TextureALStub()` regardless of what was bound, so
  // every texture it handed out was a stub whatever the backend - a WebGPU pass
  // would have been given surfaces that reach no device, silently. Tr2Blitter
  // carries a head comment about this exact trap.
  const made = [];
  const backend = new Tr2RenderContextALStub();
  backend.CreateDevice();
  const create = backend.CreateTexture.bind(backend);
  let implementation;
  backend.CreateTexture = (desc, options, implementationOnly = false) => {
    if (implementationOnly) return create(desc, options, true);
    made.push([ desc, options ]);
    const value = create(desc, options);
    implementation = value.TrinityALImpl_GetObject();
    return value;
  };
  const pool = new Tr2GpuResourcePool().SetRenderContext(backend);
  const handle = pool.GetTempTexture("t", square());
  assert.equal(handle.Get().TrinityALImpl_GetObject(), implementation);
  assert.equal(made.length, 1);
  // The usage half travels as options, not folded into the dimensions.
  assert.equal(made[0][1].gpuUsage, Tr2GpuUsage.RENDER_TARGET);
});

test("a description can ask for an array, not just a flat 2D surface", () =>
{
  // Carbon has a GetTempTexture overload taking a whole Tr2BitmapDimensions
  // (Tr2GpuResourcePool.h:89) precisely so a caller can ask for slices. Ours
  // spreads the description into one, so depth and mipCount travel.
  const pool = pooled();
  const texture = pool.GetTempTexture("cascades", { ...square(512), depth: 4 }).Get();

  assert.equal(texture.IsValid(), true);
  assert.equal(texture.GetDepth(), 4);
  assert.equal(texture.GetType(), TextureType.TEX_TYPE_2D);
});


test("all four aged lists retire at the threshold while explicit copies survive", () =>
{
  const pool = pooled();
  const al = clocks.get(pool);
  let frame = 20;
  al.GetRecordingFrameNumber = () => frame;
  const desc = Tr2BufferDescriptionAL.FromStride(16, 2, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.WRITE_OFTEN);
  const handles = [pool.GetTempTexture("t", square()), pool.GetPersistentTexture("p", square()),
    pool.GetTempBuffer("b", desc), pool.GetPersistentBuffer("q", desc)];
  const copies = handles.map(h => { const Value = h.Get().constructor; return new Value({ copy: h.Get() }); });
  frame = 22;
  assert.equal(pool.ClearUnusedResources(), 0);
  frame = 23;
  assert.equal(pool.ClearUnusedResources(), 4);
  assert.equal(pool.ClearUnusedResources(), 0);
  for (const handle of handles) pool.Free(handle);
  for (const copy of copies) { assert.equal(copy.IsValid(), true); copy.Destroy(); }
  pool.Destroy();
});

test("repeated debug setters clear membership and exact all-storage release is required", async () =>
{
  const { TriStorageFlags } = await import("../../npm/dist/global/consts/graphics/index.js");
  const pool = pooled();
  const first = pool.GetPersistentTexture("p", square());
  pool.SetDebugMode(false);
  const second = pool.GetPersistentTexture("p", square());
  assert.equal(first.Get().Equals(second.Get()), false);
  pool.SetDebugMode(false);
  const third = pool.GetPersistentTexture("p", square());
  assert.equal(second.Get().Equals(third.Get()), false);
  pool.ReleaseResources(0);
  const fourth = pool.GetPersistentTexture("p", square());
  assert.equal(third.Get().Equals(fourth.Get()), true);
  pool.ReleaseResources(TriStorageFlags.TRISTORAGE_ALL);
  const fifth = pool.GetPersistentTexture("p", square());
  assert.equal(fourth.Get().Equals(fifth.Get()), false);
  for (const h of [first, second, third, fourth, fifth]) { assert.equal(h.Get().IsValid(), true); pool.Free(h); }
  pool.Destroy();
});

test("device tick sweeps a registered pool once and destruction unregisters it", async () =>
{
  const { TriDevice } = await import("../../npm/dist/trinity/core/index.js");
  const pool = pooled();
  const device = new TriDevice();
  let sweeps = 0;
  pool.ClearUnusedResources = () => { sweeps++; };
  device.Update = () => {};
  device.HandleRenderTick = () => {};
  device.OnTick(0, 0);
  assert.equal(sweeps, 1);
  pool.Destroy();
  device.OnTick(0, 0);
  assert.equal(sweeps, 1);
});
