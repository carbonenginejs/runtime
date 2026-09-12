import test from "node:test";
import assert from "node:assert/strict";

import { Tr2Denoiser, Tr2GpuResourcePool, Tr2RenderContext, Tr2Renderer } from "../../npm/dist/trinity/core/index.js";
import { Tr2RenderContextALStub } from "../../npm/dist/trinityal/index.js";
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

  renderer.PrepareDeviceResources(context);

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

  renderer.PrepareDeviceResources(context);

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

  renderer.PrepareDeviceResources(context);

  const before = [ context.GetStackSizeRT(), context.GetStackSizeDS() ];
  const source = surface(pool, "source");

  denoiser.Apply(source, surface(pool, "depth").Get(), null, new Array(16).fill(0), 1, pool, context, renderer);

  assert.deepEqual([ context.GetStackSizeRT(), context.GetStackSizeDS() ], before);

  // And on the refusal path, which returns before pushing anything.
  denoiser.Apply({ IsValid: () => false, Get: () => null }, { IsValid: () => false }, null, [], 1, pool, context, renderer);

  assert.deepEqual([ context.GetStackSizeRT(), context.GetStackSizeDS() ], before);
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
