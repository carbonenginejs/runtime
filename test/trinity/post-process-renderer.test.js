import test from "node:test";
import assert from "node:assert/strict";

import { Tr2GpuResourcePool, Tr2RenderContext, Tr2Renderer } from "../../npm/dist/trinity/core/index.js";
import { Tr2PostProcessRenderer } from "../../npm/dist/trinity/postProcess/index.js";
import { Tr2RenderContextALStub } from "../../npm/dist/trinityal/index.js";
import { PixelFormat, TextureType, Tr2GpuUsage } from "../../npm/dist/global/consts/renderContext/index.js";

/** A context with the stub backend: the device without webgpu or webgl. */
function stubContext()
{
  const al = new Tr2RenderContextALStub();

  al.CreateDevice({ mode: { width: 256, height: 256 } });

  const context = new Tr2RenderContext();

  context.SetRenderContextAL(al);
  return context;
}

function colour(pool, name, format = PixelFormat.PIXEL_FORMAT_R16G16B16A16_FLOAT)
{
  return pool.GetTempTexture(name, {
    type: TextureType.TEX_TYPE_2D,
    width: 64,
    height: 32,
    depth: 1,
    mipCount: 1,
    format,
    gpuUsage: Tr2GpuUsage.RENDER_TARGET | Tr2GpuUsage.SHADER_RESOURCE
  });
}

test("Execute runs copy, sharpening and tonemapping for a scene without a post process", () =>
{
  const context = stubContext();
  const pool = new Tr2GpuResourcePool().SetRenderContext(context);
  const renderer = new Tr2Renderer();
  const postProcess = new Tr2PostProcessRenderer();

  renderer.PrepareDeviceResources(context);

  const destination = colour(pool, "destination", PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM);
  const held = pool.GetHeldCount();
  const scene = { GetPostProcess: () => null };
  const esm = context.GetEffectStateManager();

  esm.SetRenderTarget(0, destination.Get());
  postProcess.Execute(destination.Get(), colour(pool, "customBackBuffer"), null, null, null, scene, null, pool, context, renderer);

  // Every handle Execute was given or borrowed is back: Carbon's RAII releases.
  assert.equal(pool.GetHeldCount(), held, "no pool handle leaked");

  // With no post process every tonemapping toggle is off (cpp:1531-1583).
  const effect = postProcess.tonemappingEffect;
  assert.equal(effect.GetOption("COLOR_CORRECTION_TOGGLE"), "COLOR_CORRECTION_DISABLED");
  assert.equal(effect.GetOption("DYNAMIC_EXPOSURE_TOGGLE"), "DYNAMIC_EXPOSURE_DISABLED");
  assert.equal(effect.GetOption("VIGNETTE_TOGGLE"), "VIGNETTE_DISABLED");
  assert.equal(effect.GetOption("LUT_TOGGLE"), "LUT_DISABLED");
  assert.equal(effect.GetOption("TONE_MAPPING_METHOD"), "TONE_MAPPING_DISABLED");

  // TEMP_PARAM's resets: the tonemapper holds none of the frame's resources.
  for (const name of [ "BlitCurrent", "BlitOriginal" ])
  {
    assert.equal(effect.GetResourceByName(name).GetTextureProvider() ?? null, null, `${name} reset`);
  }
  assert.equal(effect.GetResourceByName("Exposure").GetGpuBuffer().GetGpuBuffer(0), null, "Exposure reset");

  // The render-target stack is balanced.
  assert.equal(context.GetRenderTarget(0), destination.Get());
});

test("an invalid source returns before borrowing anything", () =>
{
  const context = stubContext();
  const pool = new Tr2GpuResourcePool().SetRenderContext(context);
  const held = pool.GetHeldCount();
  const errors = [];
  const original = console.error;

  console.error = message => errors.push(message);
  try
  {
    new Tr2PostProcessRenderer().Execute(null, { IsValid: () => false }, null, null, null, null, null, pool, context, new Tr2Renderer());
  }
  finally
  {
    console.error = original;
  }

  assert.equal(pool.GetHeldCount(), held);
  assert.deepEqual(errors, [ "Tr2PostProcessRenderer::Execute: Source buffer is invalid!" ]);
});

test("CasSetup at sharpness 0 gives AMD's constants", () =>
{
  const { const0, const1 } = Tr2PostProcessRenderer.casSetup(0, 1920, 1080, 1920, 1080);
  const bits = new Uint32Array(const1.buffer);

  assert.deepEqual(Array.from(const0), [ 1, 1, 0, 0 ]);
  assert.equal(const1[0], -0.125, "-1 / lerp(8, 5, 0)");
  assert.equal(bits[1], 0xb000, "half(-0.125) low, half(0) high");
  assert.equal(const1[2], 8);
  assert.equal(bits[3], 0);
});

test("BGRA targets sharpen through an RGBA copy, as Carbon's UAV rule requires", () =>
{
  assert.equal(Tr2PostProcessRenderer.getUavCompatibleFormat(PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM), PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM);
  assert.equal(Tr2PostProcessRenderer.getUavCompatibleFormat(PixelFormat.PIXEL_FORMAT_R16G16B16A16_FLOAT), PixelFormat.PIXEL_FORMAT_R16G16B16A16_FLOAT);
});
