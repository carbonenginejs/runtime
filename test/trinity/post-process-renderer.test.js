import test from "node:test";
import assert from "node:assert/strict";

import { Tr2GpuResourcePool, Tr2RenderContext, Tr2Renderer } from "../../npm/dist/trinity/core/index.js";
import {
  BlurContext,
  GaussianData,
  Tr2PPBloomEffect,
  Tr2PPDynamicExposureEffect,
  Tr2PPDepthOfFieldEffect,
  Tr2PPFogEffect,
  Tr2PPGodRaysEffect,
  Tr2PPTaaEffect,
  Tr2PostProcess2,
  Tr2PostProcessRenderer
} from "../../npm/dist/trinity/postProcess/index.js";
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
    // Carbon keeps the slot's Tr2TextureReference and empties it (cpp:2199-2206).
    assert.equal(effect.GetResourceByName(name).GetTextureProvider().GetTexture(), null, `${name} reset`);
  }
  assert.equal(effect.GetResourceByName("Exposure").GetGpuBuffer().GetGpuBuffer(0), null, "Exposure reset");

  // The render-target stack is balanced.
  assert.equal(context.GetRenderTarget(0), destination.Get());
});

/** Runs Execute over a scene whose post process holds `effects`, and returns what it touched. */
function runWith(effects, configure = () => {})
{
  const context = stubContext();
  const pool = new Tr2GpuResourcePool().SetRenderContext(context);
  const renderer = new Tr2Renderer();
  const postProcess = new Tr2PostProcessRenderer();
  const graph = new Tr2PostProcess2();

  renderer.PrepareDeviceResources(context);
  Object.assign(graph, effects);
  configure(postProcess);

  const destination = colour(pool, "destination", PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM);
  const depth = colour(pool, "depthBuffer", PixelFormat.PIXEL_FORMAT_D32_FLOAT);
  const held = pool.GetHeldCount();

  context.GetEffectStateManager().SetRenderTarget(0, destination.Get());
  postProcess.Execute(destination.Get(), colour(pool, "customBackBuffer"), depth, null, null, { GetPostProcess: () => graph }, null, pool, context, renderer);

  return { postProcess, pool, held, context, destination, heldAfter: pool.GetHeldCount() };
}

test("god rays run Carbon's three steps and leave nothing bound or borrowed", () =>
{
  const godRays = new Tr2PPGodRaysEffect();

  godRays.intensity = 0.5;

  const { postProcess, held, heldAfter, context, destination } = runWith({ godRays });
  const effect = postProcess.godrayEffect;

  // Execute frees the depth handle it was given, so one fewer is held.
  assert.equal(heldAfter, held - 1, "no pool handle leaked");
  assert.deepEqual(Array.from(effect.FindParameterByName("grFactors").value), [ 1000, Math.fround(0.2), 128, 2 ], "Carbon's const grFactors (cpp:11)");
  assert.deepEqual(Array.from(effect.FindParameterByName("Intensity").value), [ 0.5, 0, 1, 1 ]);

  // TEMP_PARAM: the down-sampled depth is unbound again, on both effects.
  assert.equal(effect.GetResourceByName("DepthMap").GetTextureProvider().GetTexture(), null);
  assert.equal(postProcess._downsampleDepthEffect.GetResourceByName("DepthMap").GetTextureProvider().GetTexture(), null);
  assert.equal(context.GetRenderTarget(0), destination.Get(), "render-target stack balanced");
});

test("depth of field without foreground blur runs the bokeh blend and fill without Blur", () =>
{
  const depthOfField = new Tr2PPDepthOfFieldEffect();

  depthOfField.scale = 2;
  depthOfField.foregroundBlurNeeded = false;
  depthOfField.useTAAFriendlyBokeh = false;

  // Carbon's g_postProcessDofEnabled setting, off by default.
  Tr2PPDepthOfFieldEffect.PostProcessDofEnabled = true;

  let run;
  try
  {
    run = runWith({ depthOfField }, renderer =>
    {
      renderer.Blur = () => assert.fail("Blur runs only for the foreground CoC (cpp:1620-1635)");
    });
  }
  finally
  {
    Tr2PPDepthOfFieldEffect.PostProcessDofEnabled = false;
  }

  const { postProcess, held, heldAfter } = run;

  assert.equal(heldAfter, held - 1, "no pool handle leaked");
  assert.equal(postProcess.depthOfFieldCoCShader.GetOption("COC_OUTPUT_CHANNEL_COUNT"), "COC_OUTPUT_CHANNEL_COUNT_1");
  assert.equal(postProcess.depthOfFieldBokehFillShader.GetOption("BOKEH_SHAPE"), depthOfField.GetBokehShapeString());
  assert.deepEqual(Array.from(postProcess.depthOfFieldBokehFillShader.FindParameterByName("BokehInfo").value), [ 2, 0, 0, 0 ]);
});

test("depth of field with foreground blur maximises the CoC through Blur, then runs the TAA bokeh", () =>
{
  const depthOfField = new Tr2PPDepthOfFieldEffect();

  depthOfField.scale = 2;
  depthOfField.cocScale = 0.5;

  Tr2PPDepthOfFieldEffect.PostProcessDofEnabled = true;

  let run;
  try
  {
    run = runWith({ depthOfField });
  }
  finally
  {
    Tr2PPDepthOfFieldEffect.PostProcessDofEnabled = false;
  }

  const { postProcess, held, heldAfter } = run;
  const bokeh = postProcess._depthOfFieldBokehTAAShader;

  assert.equal(heldAfter, held - 1, "no pool handle leaked, including Blur's");
  assert.equal(postProcess.depthOfFieldCoCShader.GetOption("COC_OUTPUT_CHANNEL_COUNT"), "COC_OUTPUT_CHANNEL_COUNT_2");

  // Not temporal: no rotation, 2/5 samples per pixel (cpp:1644-1646).
  assert.deepEqual(Array.from(bokeh.FindParameterByName("BokehInfo").value), [ 2, 0, Math.fround(2 / 5), 0 ]);
  assert.equal(bokeh.GetResourceByName("CoCMap").GetTextureProvider().GetTexture(), null, "CoCMap unbound again");
});

test("fog blurs its half-resolution colour with Carbon's default blur and composites", () =>
{
  const fog = new Tr2PPFogEffect();
  const blurs = [];

  fog.intensity = 1;

  const { postProcess, held, heldAfter } = runWith({ fog }, renderer =>
  {
    renderer.Blur = (src, pool, _context, blurContext) =>
    {
      blurs.push({ width: src.Get().GetWidth(), hash: blurContext.Hash() });
      return src;
    };
  });

  // Half of the 64x32 composite; the default BlurContext is BT_Big, BC_rgba, BP_None, BF_None.
  assert.deepEqual(blurs, [ { width: 32, hash: new BlurContext().Hash() } ]);
  assert.equal(heldAfter, held - 1, "no pool handle leaked");
  assert.equal(postProcess.fogCompositeEffect.GetResourceByName("BlitOriginal").GetTextureProvider().GetTexture(), null);
});

test("scaledSize is Carbon's TextureSize2D * scale: truncated, at least one", () =>
{
  const texture = (width, height) => ({ GetWidth: () => width, GetHeight: () => height });

  assert.deepEqual(Tr2PostProcessRenderer.scaledSize(texture(1919, 1), 0.5), { width: 959, height: 1 });
  assert.deepEqual(Tr2PostProcessRenderer.scaledSize(texture(100, 100), 0.333), { width: 33, height: 33 });
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

test("new bloom downsamples through six steps, upsamples back, and leaves nothing borrowed", () =>
{
  const bloom = new Tr2PPBloomEffect();
  const drawn = [];

  const { postProcess, held, heldAfter, context, destination } = runWith({ bloom }, renderer =>
  {
    const original = Tr2PostProcessRenderer.drawInto;
    Tr2PostProcessRenderer.drawInto = (dest, loadAction, effect, ...rest) =>
    {
      drawn.push({ effect, width: dest.GetWidth() });
      return original(dest, loadAction, effect, ...rest);
    };
    renderer._restoreDrawInto = () => { Tr2PostProcessRenderer.drawInto = original; };
  });
  postProcess._restoreDrawInto();

  // 64 x 32 source: steps at 32, 16, 8, 4, 2, 1 wide - the sixth step's
  // height would be 0 at 1/64 of 32, so Carbon's minDim check stops at five.
  const downs = drawn.filter(d => d.effect === postProcess._downSampler || d.effect === postProcess._downSamplerLuminancePreserve);
  const horizontal = drawn.filter(d => d.effect === postProcess._upsamplerHorizontal);
  const vertical = drawn.filter(d => d.effect === postProcess._upsamplerVertical);

  assert.deepEqual(downs.map(d => d.width), [ 32, 16, 8, 4, 2 ], "halving from the source, stopping when minDim * size truncates to 0 (cpp:993)");
  assert.deepEqual(horizontal.map(d => d.width), [ 2, 4, 8, 16, 32 ], "coarsest first");
  assert.deepEqual(vertical.map(d => d.width), [ 2, 4, 8, 16, 32 ]);
  assert.equal(downs[0].effect, postProcess._downSampler, "threshold -1 skips the luminance-preserving first step (cpp:1024)");

  // The bloom texture was handed to tonemapping and freed with the rest.
  assert.equal(heldAfter, held - 1, "no pool handle leaked");
  assert.equal(postProcess._upsamplerVertical.GetResourceByName("LastMip").GetTextureProvider().GetTexture(), null);
  assert.equal(context.GetRenderTarget(0), destination.Get(), "render-target stack balanced");
});

test("old bloom is a half-size high pass through Carbon's default Blur", () =>
{
  const bloom = new Tr2PPBloomEffect();
  const blurs = [];

  bloom.luminanceThreshold = -0.5;

  const { postProcess, held, heldAfter } = runWith({ bloom }, renderer =>
  {
    renderer.useNewBloom = false;
    renderer.Blur = (src, _pool, _context, blurContext) =>
    {
      blurs.push({ width: src.Get().GetWidth(), hash: blurContext.Hash() });
      return src;
    };
  });

  assert.deepEqual(blurs, [ { width: 32, hash: new BlurContext().Hash() } ]);
  assert.equal(postProcess.bloomHighPassFilter.FindParameterByName("LuminanceThreshold").value, 0, "clamped at zero (cpp:967)");
  assert.equal(heldAfter, held - 1, "no pool handle leaked");
});

test("dynamic exposure runs Carbon's three compute passes over 16 x 16 tiles", () =>
{
  const dynamicExposure = new Tr2PPDynamicExposureEffect();
  const dispatched = [];
  const original = Tr2Renderer.runComputeShader;

  Tr2Renderer.runComputeShader = (effect, x, y, z, context) =>
  {
    dispatched.push([ effect, x, y, z ]);
    return original(effect, x, y, z, context);
  };

  let run;
  try
  {
    run = runWith({ dynamicExposure });
  }
  finally
  {
    Tr2Renderer.runComputeShader = original;
  }

  const { postProcess, held, heldAfter } = run;
  const passes = dispatched.filter(([ effect ]) => effect !== postProcess._fidelityFxCasShader);

  // 64 x 32: 64/16+1 = 5 by 32/16+1 = 3 tiles; 15/256+1 = 1 merge group.
  assert.deepEqual(passes.map(([ effect, ...size ]) => [ effect, ...size ]), [
    [ postProcess.dynamicExposureCreateHistogramShader, 5, 3, 1 ],
    [ postProcess.dynamicExposureMergeHistogramShader, 1, 1, 1 ],
    [ postProcess.dynamicExposureMeasureExposureShader, 1, 1, 1 ]
  ]);
  assert.equal(postProcess.dynamicExposureCreateHistogramShader.FindParameterByName("MinLuminance").value, Math.log(dynamicExposure.minLuminance));
  assert.equal(postProcess.tonemappingEffect.GetOption("DYNAMIC_EXPOSURE_TOGGLE"), "DYNAMIC_EXPOSURE_ENABLED");
  assert.equal(heldAfter, held - 1, "no pool handle leaked: the histogram is freed when debug is off (cpp:746-749)");
});

test("the gaussian pass normalises over every tap and packs two taps per vector", () =>
{
  // Radius 3, centre weight 0: taps at -3, -1, 1 (and 3 as the last, lone step).
  const data = GaussianData.calculateGaussianPassParameters(3, 0, 1 / 64, [ 1, 1, 1 ], [ 1, 0 ]);

  assert.equal(data.count * 2 % 2, 0);
  let weightSum = 0;
  for (let i = 0; i < data.count; i++) weightSum += data.weightOffset[i][0] + data.weightOffset[i][2];
  assert.ok(Math.abs(weightSum - 1) < 1e-6, `on-screen taps sum to one, got ${weightSum}`);

  // The struct as Carbon memcpys it: vec3 + uint count, then the Vector4s.
  const bytes = GaussianData.pack(data);
  const view = new DataView(bytes.buffer);
  assert.equal(bytes.byteLength, 16 + 64 * 16);
  assert.equal(view.getUint32(12, true), data.count);
  assert.equal(view.getFloat32(16, true), Math.fround(data.weightOffset[0][0]));

  // Carbon's NormalDistribution: weight above 1 is (1 - x^2)^weight.
  assert.equal(GaussianData.normalDistribution(0.5, 1, 2), 0.75 ** 2);
});

test("createBlurContext is Carbon's PostProcessBlur::CreateBlurContext", () =>
{
  const { BlurType, BlurChannel, BlurProcess, BlurFinalize } = BlurContext;
  const dof = BlurContext.createBlurContext(BlurType.BT_Big, BlurChannel.BC_r, BlurProcess.BP_Maximum, BlurFinalize.BF_MaxOfAllChannels);

  assert.equal(dof.Hash(), 1 * 1000 + 2 * 100 + 0 * 10 + 0);
  assert.equal(BlurContext.createBlurContext().Hash(), new BlurContext().Hash(), "defaults match the struct's (h:46-57)");
  assert.equal(BlurContext.getBlurChannelOptionValue(BlurChannel.BC_r), "BLUR_CHANNEL_R");
  assert.equal(BlurContext.getFinalizeTypeOptionValue(BlurFinalize.BF_MaxOfAllChannels), "BLUR_FINALIZE_TYPE_MAX_OF_ALL_CHANNELS");
});

test("TAA ping-pongs its persistent accumulators and blends toward Carbon's 0.96 cap", () =>
{
  const taa = new Tr2PPTaaEffect();
  const context = stubContext();
  const pool = new Tr2GpuResourcePool().SetRenderContext(context);
  const renderer = new Tr2Renderer();
  const postProcess = new Tr2PostProcessRenderer();
  const graph = new Tr2PostProcess2();

  renderer.PrepareDeviceResources(context);
  graph.taa = taa;

  const destination = colour(pool, "destination", PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM);
  const held = pool.GetHeldCount();
  const inputs = [];
  const weights = [];

  for (let frame = 0; frame < 3; frame++)
  {
    context.GetEffectStateManager().SetRenderTarget(0, destination.Get());
    postProcess.Execute(destination.Get(), colour(pool, "customBackBuffer"), null, null, null, { GetPostProcess: () => graph }, null, pool, context, renderer);
    weights.push(postProcess.taaEffect.FindParameterByName("BlendWeight").value);
    inputs.push(postProcess.taaEffect.FindParameterByName("FrameIndex").value);
  }

  // cpp:1476-1520: frame n reads accumulator n % 2 and weights n / (n + 1).
  assert.deepEqual(inputs, [ 0, 1, 2 ]);
  assert.deepEqual(weights, [ 0, 0.5, Math.fround(2 / 3) ]);
  assert.equal(postProcess.taaEffect.GetOption("QUALITY"), "QUALITY_HIGH");
  assert.equal(postProcess.taaEffect.GetOption("DEBUG"), "DEBUG_NONE");
  assert.equal(postProcess.taaEffect.GetResourceByName("CurrentFrame").GetTextureProvider().GetTexture(), null, "TEMP_PARAM reset");
  assert.equal(pool.GetHeldCount(), held, "no pool handle leaked across frames");
});
