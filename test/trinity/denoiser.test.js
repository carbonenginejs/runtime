import test from "node:test";
import assert from "node:assert/strict";

import { Tr2Denoiser, Tr2GpuResourcePool, Tr2RenderContext, Tr2Renderer } from "../../npm/dist/trinity/core/index.js";
import { Tr2RenderContextALStub } from "../../npm/dist/trinityal/index.js";
import { Tr2Effect } from "../../npm/dist/trinity/shader/index.js";
import { float32ToBits } from "../../npm/dist/global/utils/bytes.js";
import { PixelFormat, TextureType, Tr2GpuUsage } from "../../npm/dist/global/consts/renderContext/index.js";

/** A context with the stub backend, which is the device without webgpu or webgl. */
function stubContext()
{
  const al = new Tr2RenderContextALStub();

  al.CreateDevice({ mode: { width: 256, height: 256 } });

  const context = new Tr2RenderContext();

  context.SetRenderContextAL(al);
  return context;
}

/** A real R8 texture of the given size, borrowed from a pool. */
function surface(pool, name, size = 64)
{
  return pool.GetTempTexture(name, {
    type: TextureType.TEX_TYPE_2D,
    width: size,
    height: size,
    depth: 1,
    mipCount: 1,
    format: PixelFormat.PIXEL_FORMAT_R8_UNORM,
    gpuUsage: Tr2GpuUsage.RENDER_TARGET | Tr2GpuUsage.SHADER_RESOURCE
  });
}

test("the denoiser carries Carbon's authored defaults", () =>
{
  // Tr2Denoiser.cpp:10-17. These are what a scene inherits when nothing sets
  // them, so a wrong one is a silently different image rather than an error.
  const denoiser = new Tr2Denoiser();

  assert.equal(denoiser.radius, 5);
  assert.equal(denoiser.stepSize, 1);
  assert.equal(denoiser.depthWeight, 100);
  assert.equal(denoiser.normalWeight, 1.5);
  assert.equal(denoiser.planeWeight, 0);
  assert.equal(denoiser.bypass, false);
});

test("an invalid source or depth returns nothing rather than borrowing four targets", () =>
{
  // Carbon's first two lines (cpp:61-64). The cost of getting this wrong is not
  // a crash, it is four pool allocations per frame producing nothing.
  const context = stubContext();
  const pool = new Tr2GpuResourcePool().SetRenderContext(context);
  const renderer = new Tr2Renderer();
  const denoiser = new Tr2Denoiser();

  Tr2Renderer.prepareDeviceResources(context);

  const source = surface(pool, "source");
  const depth = surface(pool, "depth").Get();

  assert.equal(denoiser.Apply({ IsValid: () => false, Get: () => null }, depth, null, [], 1, pool, context, renderer), null);
  assert.equal(denoiser.Apply(source, { IsValid: () => false }, null, [], 1, pool, context, renderer), null);
});

test("Apply runs four passes and returns a borrowed result", () =>
{
  const context = stubContext();
  const pool = new Tr2GpuResourcePool().SetRenderContext(context);
  const renderer = new Tr2Renderer();
  const denoiser = new Tr2Denoiser();

  Tr2Renderer.prepareDeviceResources(context);

  const source = surface(pool, "source");
  const depth = surface(pool, "depth").Get();
  const projection = new Array(16).fill(0);

  const result = denoiser.Apply(source, depth, null, projection, 1, pool, context, renderer);

  assert.notEqual(result, null);
  assert.equal(result.IsValid(), true);
  assert.equal(result.GetName(), "Tr2Denoiser Result");
});

test("the pass bracket is balanced however Apply leaves", () =>
{
  // Carbon pops through ON_BLOCK_EXIT, which runs on the failure path too. A
  // leaked push would leave the next pass drawing into the denoiser's target.
  const context = stubContext();
  const pool = new Tr2GpuResourcePool().SetRenderContext(context);
  const renderer = new Tr2Renderer();
  const denoiser = new Tr2Denoiser();

  Tr2Renderer.prepareDeviceResources(context);

  const before = [ context.GetStackSizeRT(), context.GetStackSizeDS() ];
  const source = surface(pool, "source");

  denoiser.Apply(source, surface(pool, "depth").Get(), null, new Array(16).fill(0), 1, pool, context, renderer);

  assert.deepEqual([ context.GetStackSizeRT(), context.GetStackSizeDS() ], before);

  // And on the refusal path, which returns before pushing anything.
  denoiser.Apply({ IsValid: () => false, Get: () => null }, { IsValid: () => false }, null, [], 1, pool, context, renderer);

  assert.deepEqual([ context.GetStackSizeRT(), context.GetStackSizeDS() ], before);
});

test("Radius goes through the uint32 overload: its bits, not a float", () =>
{
  // Tr2Effect.cpp:2103-2120 stores a uint32 by reinterpreting its bits, and
  // Denoise1D loops from -Radius to +Radius on those bits read as an int. As
  // the float 5.0 it read 1084227584, and the loop hung the GPU.
  const context = stubContext();
  const pool = new Tr2GpuResourcePool().SetRenderContext(context);
  const renderer = new Tr2Renderer();
  const denoiser = new Tr2Denoiser();
  const radii = [];
  const original = Tr2Effect.prototype.SetParameter;

  Tr2Renderer.prepareDeviceResources(context);
  Tr2Effect.prototype.SetParameter = function (name, value, ...rest)
  {
    if (name === "Radius") radii.push(value);
    return original.call(this, name, value, ...rest);
  };

  try
  {
    denoiser.Apply(surface(pool, "source"), surface(pool, "depth").Get(), null, new Array(16).fill(0), 1, pool, context, renderer);
  }
  finally
  {
    Tr2Effect.prototype.SetParameter = original;
  }

  assert.ok(radii.length > 0, "the blur passes were given a radius");
  assert.deepEqual(radii.map(float32ToBits), radii.map(() => 5), "Carbon's default m_radius, as integer bits");
});

test("SetRadius and OnModified both re-arm the parameter send", () =>
{
  // m_parametersDirty is the one thing this class caches, and Carbon clears it
  // at the end of Apply (cpp:160). Both entry points set it again.
  const denoiser = new Tr2Denoiser();

  denoiser.SetRadius(9);

  assert.equal(denoiser.radius, 9);
  assert.equal(denoiser.OnModified(), true);
});

test("repeated denoising returns all local handles to the pool", () =>
{
  const context = stubContext();
  const pool = new Tr2GpuResourcePool().SetRenderContext(context);
  const renderer = { DrawScreenQuad() {} };
  const denoiser = new Tr2Denoiser();
  const depth = surface(pool, "depth");
  const baseline = pool.GetHeldCount();
  try
  {
    for (let frame = 0; frame < 100; frame++)
    {
      const source = surface(pool, "source");
      const result = denoiser.Apply(source, depth.Get(), null, new Array(16).fill(0), 1, pool, context, renderer);
      assert.equal(source.IsValid(), false, "Apply consumes the input handle");
      assert.equal(pool.GetHeldCount(), baseline + 1, "only the result escapes Apply");
      pool.Free(result);
      assert.equal(pool.GetHeldCount(), baseline);
    }
    assert.equal(pool.DebugGetAllTempTextures().length, 6, "subsequent frames reuse the same surfaces");
  }
  finally
  {
    pool.Free(depth);
    pool.Destroy();
  }
});

test("each interrupted denoiser pass releases its local handles and restores stacks", () =>
{
  for (let failAt = 1; failAt <= 4; failAt++)
  {
    const context = stubContext();
    const pool = new Tr2GpuResourcePool().SetRenderContext(context);
    const denoiser = new Tr2Denoiser();
    const depth = surface(pool, "depth");
    const baseline = pool.GetHeldCount();
    const stacks = [ context.GetStackSizeRT(), context.GetStackSizeDS() ];
    let draws = 0;
    const renderer = Tr2Renderer;
    const originalDraw = Tr2Renderer.drawScreenQuad;
    Tr2Renderer.drawScreenQuad = () => { if (++draws === failAt) throw new Error("draw interrupted"); };
    try
    {
      for (let frame = 0; frame < 5; frame++)
      {
        draws = 0;
        const source = surface(pool, "source");
        assert.throws(() => denoiser.Apply(source, depth.Get(), null, new Array(16).fill(0), 1, pool, context, renderer), /draw interrupted/);
        assert.equal(source.IsValid(), false);
        assert.equal(pool.GetHeldCount(), baseline);
        assert.deepEqual([ context.GetStackSizeRT(), context.GetStackSizeDS() ], stacks);
      }
    }
    finally
    {
      Tr2Renderer.drawScreenQuad = originalDraw;
      pool.Free(depth);
      pool.Destroy();
    }
  }
});

test("invalid depth still releases the source passed by value", () =>
{
  const context = stubContext();
  const pool = new Tr2GpuResourcePool().SetRenderContext(context);
  const denoiser = new Tr2Denoiser();
  const source = surface(pool, "source");
  assert.equal(denoiser.Apply(source, { IsValid: () => false }, null, [], 1, pool, context, {}), null);
  assert.equal(source.IsValid(), false);
  assert.equal(pool.GetHeldCount(), 0);
  pool.Destroy();
});
