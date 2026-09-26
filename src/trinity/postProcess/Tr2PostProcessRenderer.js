// Carbon source: trinity/trinity/PostProcess/Tr2PostProcessRenderer.h
// Carbon source: trinity/trinity/PostProcess/Tr2PostProcessRenderer.cpp
// Carbon source: trinity/trinity/PostProcess/Tr2PostProcessRenderer_Blue.cpp
//
// The post-process chain Carbon runs between the scene and the back buffer.
// Carbon's anonymous-namespace helpers (DrawInto, TEMP_PARAM,
// GetUavCompatibleFormat, the Tonemapping:: appliers) are statics here.
//
// PASSES NOT PORTED YET throw by name from their own method, and each runs
// only when the scene's Tr2PostProcess2 enables that effect, so a scene
// without them runs the chain end to end: copy, sharpening, tonemapping.
import { carbon, impl, edit, type } from "#schema";
import { CjsModel } from "#model";
import { BloomDebugMode, Quality } from "../generated/postProcess/enums.js";
import { blue, EnumRegistrationType } from "#blue";
import { num } from "#math/num";
import { Tr2ColorAttachment, Tr2BufferDescriptionAL, Tr2SubresourceData } from "#trinityal";
import {
  INVALID_UPSCALING_CONTEXT_ID,
  PixelFormat,
  ShaderType,
  TextureType,
  Tr2CpuUsage,
  Tr2GpuUsage,
  Tr2LoadAction,
  Tr2StoreAction,
  UpscalingTechnique
} from "#consts/render-context";
import { RenderingMode } from "#consts/graphics";
import { PostProcessEffectPaths } from "#consts/effectPaths";
import { Tr2Effect } from "../shader/Tr2Effect.js";
import { Tr2Renderer } from "../core/Tr2Renderer.js";
import { EveSpaceScene } from "../eve/scene/EveSpaceScene.js";
import { Tr2PPTonemappingEffect } from "./effect/Tr2PPTonemappingEffect.js";
import { Tr2PPTaaEffect } from "./effect/Tr2PPTaaEffect.js";
import { BlurContext } from "./BlurContext.js";
import { GaussianData } from "./GaussianData.js";
import { Tr2PPBloomEffect } from "./effect/Tr2PPBloomEffect.js";
import { FillAndSetConstants } from "../core/Tr2RenderUtils.js";
import { vec2 } from "#math/vec2";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import "./effect/Tr2PPEffect.js";

/** `RENDER_TARGET` in Carbon's anonymous namespace (cpp:150). */
const RENDER_TARGET = Tr2GpuUsage.RENDER_TARGET | Tr2GpuUsage.SHADER_RESOURCE;

/** `MAX_LUTS` (Tr2PostProcessRenderer.h). */
const MAX_LUTS = 4;

/** Carbon's histogram tiling for dynamic exposure (cpp:33-35). */
const HISTOGRAM_TILE_SIZE_X = 16;
const HISTOGRAM_TILE_SIZE_Y = 16;
const NUM_TILES_PER_THREAD_GROUP = 256;

/** Carbon's thread-group edge for the CAS dispatch (cpp:865). */
const CAS_THREAD_GROUP_WORK_REGION_DIM = 16;

/** Builds one effect pointed at its path, with options set inside Start/EndUpdate. */
function effectAt(path, options = null)
{
  const effect = new Tr2Effect();

  if (!options)
  {
    effect.SetEffectPathName(path);
    return effect;
  }

  effect.StartUpdate();
  effect.SetEffectPathName(path);
  for (const [ option, value ] of Object.entries(options)) effect.SetOption(option, value);
  effect.EndUpdate();
  return effect;
}


/**
 * Carbon's post-process renderer: the chain from the scene's colour buffer to
 * the back buffer, driven by the scene's combined Tr2PostProcess2.
 */
@type.define({ className: "Tr2PostProcessRenderer", family: "postProcess" })
export class Tr2PostProcessRenderer extends CjsModel
{
  @edit.notify
  @edit.readwrite
  @type.int32
  @type.enum("trinity.Tr2PostProcessRenderer.BloomDebugMode")
  bloomDebugMode = BloomDebugMode.BLOOM_DEBUG_NONE;

  @edit.notify
  @edit.readwrite
  @type.int32
  @type.enum("trinity.PostProcess.Quality")
  quality = Quality.HIGH;

  // THE EFFECTS CARBON'S CONSTRUCTOR CREATES (cpp:537-635), in its order.

  @edit.readwrite
  @type.objectRef("Tr2Effect")
  tonemappingEffect = effectAt(PostProcessEffectPaths.ToneMapping);

  _reactiveMaskEffect = effectAt(PostProcessEffectPaths.ReactiveMask);

  _transparencyMaskEffect = effectAt(PostProcessEffectPaths.TransparencyMask);

  @edit.readwrite
  @type.objectRef("Tr2Effect")
  bloomHighPassFilter = effectAt(PostProcessEffectPaths.HighPassFilter);

  _downSamplerLuminancePreserve = effectAt(PostProcessEffectPaths.Downsample, { LUNINANCE_PRESERVE: "LUNINANCE_PRESERVE_ON" });

  _downSampler = effectAt(PostProcessEffectPaths.Downsample, { LUNINANCE_PRESERVE: "LUNINANCE_PRESERVE_OFF" });

  _upsamplerHorizontal = effectAt(PostProcessEffectPaths.Upsample);

  _upsamplerVertical = effectAt(PostProcessEffectPaths.Upsample, { UPSAMPLING_STEP: "UPSAMPLING_STEP_SECOND" });

  @edit.readwrite
  @type.objectRef("Tr2Effect")
  dynamicExposureToTextureShader = effectAt(PostProcessEffectPaths.ExposureToTexture);

  @edit.readwrite
  @type.objectRef("Tr2Effect")
  dynamicExposureCreateHistogramShader = effectAt(PostProcessEffectPaths.CreateHistograms);

  @edit.readwrite
  @type.objectRef("Tr2Effect")
  dynamicExposureMergeHistogramShader = effectAt(PostProcessEffectPaths.MergeHistograms);

  @edit.readwrite
  @type.objectRef("Tr2Effect")
  dynamicExposureMeasureExposureShader = effectAt(PostProcessEffectPaths.MeasureExposure);

  _fidelityFxCasShader = effectAt(PostProcessEffectPaths.CAS);

  _downsampleDepthEffect = effectAt(PostProcessEffectPaths.DownsampleDepth);

  @edit.readwrite
  @type.objectRef("Tr2Effect")
  fogColorEffect = effectAt(PostProcessEffectPaths.EnvironmentFogColor);

  @edit.readwrite
  @type.objectRef("Tr2Effect")
  fogCompositeEffect = effectAt(PostProcessEffectPaths.EnvironmentFogComposit);

  @edit.readwrite
  @type.objectRef("Tr2Effect")
  depthOfFieldBokehBlurShader = effectAt(PostProcessEffectPaths.Bokeh, { BOKEH_PIXEL_METHOD: "BOKEH_PIXEL_AVERAGE" });

  @edit.readwrite
  @type.objectRef("Tr2Effect")
  depthOfFieldBokehFillShader = effectAt(PostProcessEffectPaths.Bokeh, { BOKEH_PIXEL_METHOD: "BOKEH_PIXEL_MAX" });

  _depthOfFieldBokehTAAShader = effectAt(PostProcessEffectPaths.BokehTAA);

  @edit.readwrite
  @type.objectRef("Tr2Effect")
  depthOfFieldCoCShader = effectAt(PostProcessEffectPaths.CircleOfConfusion);

  @edit.readwrite
  @type.objectRef("Tr2Effect")
  godrayEffect = effectAt(PostProcessEffectPaths.Godrays);

  @edit.readwrite
  @type.objectRef("Tr2Effect")
  signalLossEffect = effectAt(PostProcessEffectPaths.SignalLoss);

  _grainShader = Tr2PostProcessRenderer._createGrainShader();

  @edit.readwrite
  @type.objectRef("Tr2Effect")
  taaEffect = effectAt(PostProcessEffectPaths.TAA);

  _taaCopyEffect = effectAt(PostProcessEffectPaths.TAACopy);

  /** Created on first use by RenderBloomDebug (cpp:1115-1144). */
  @edit.readwrite
  @type.objectRef("Tr2Effect")
  bloomDebugShader = null;

  /** Created while the exposure debug is on (cpp:1256-1260), dropped when off. */
  _dynamicExposureDebugShader = null;

  /** m_useNewBloom, from g_newBloom, which defaults true (cpp:23). */
  @edit.notify
  @edit.readwrite
  @type.boolean
  useNewBloom = true;

  /** m_blurEffects: the horizontal/vertical Blur.fx pair per BlurContext hash (cpp:897-931). */
  _blurEffects = new Map();

  /** m_bloomConstantBuffer (h:166): created empty on first use, sized by FillAndSetConstants. */
  _bloomConstantBuffer = null;

  _taaFrameCounter = 0;

  _bokehFrameCounter = 0;

  /** Returns the active Carbon post-process quality. */
  @carbon.method
  @impl.implemented
  GetPostProcessingQuality()
  {
    return this.quality;
  }

  /** Selects the active Carbon post-process quality. */
  @carbon.method
  @impl.implemented
  SetPostProcessingQuality(quality)
  {
    this.quality = quality;
  }

  /**
   * Runs the post-process chain from the scene's colour buffer into
   * `destination` (cpp:648-849). Every step Carbon gates on an effect of the
   * scene's post process is gated the same way.
   *
   * Adapted: Carbon reaches the blitter through the static Tr2Renderer; ours
   * is an instance, so the renderer is passed in, as for Tr2Denoiser. Carbon's
   * pool handles release themselves when overwritten or out of scope; here
   * each is freed explicitly at the same point. The upscaling query goes to
   * the render context's AL, which Carbon's Tr2RenderContext inherits.
   *
   * @param {object} destination The back buffer or target texture.
   * @param {GpuResourceHandle} sourceBuffer The scene colour, owned from here on.
   * @param {GpuResourceHandle|null} depthMap The scene depth.
   * @param {GpuResourceHandle|null} velocity The velocity map, if rendered.
   * @param {GpuResourceHandle|null} opaqueColor The opaque colour copy, if rendered.
   * @param {EveSpaceScene} scene The scene whose post process drives the chain.
   * @param {object|null} upscalingContext The upscaling context, if any.
   * @param {Tr2GpuResourcePool} gpuResourcePool The frame's pool.
   * @param {Tr2RenderContext} renderContext The context to render with.
   * @param {Tr2Renderer} renderer The renderer owning the blitter.
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
  Execute(destination, sourceBuffer, depthMap, velocity, opaqueColor, scene, upscalingContext, gpuResourcePool, renderContext, renderer)
  {
    if (!sourceBuffer?.IsValid())
    {
      console.error("Tr2PostProcessRenderer::Execute: Source buffer is invalid!");
      return;
    }

    const release = handle => Tr2PostProcessRenderer._release(gpuResourcePool, handle);
    const source = sourceBuffer.Get();
    const renderSize = { width: source.GetWidth(), height: source.GetHeight() };
    let displaySize = renderSize;

    const postProcess = scene.GetPostProcess();
    const esm = renderContext.GetEffectStateManager();
    const al = renderContext.GetRenderContextAL();
    const destinationFormat = Tr2PostProcessRenderer.destinationFormatOf(destination, al);

    esm.ApplyStandardStates(RenderingMode.RM_FULLSCREEN);
    esm.PushRenderTarget();
    esm.PushDepthStencilBuffer(null);

    const upscalingInfo = al.GetUpscalingInfo(upscalingContext ? upscalingContext.GetID() : INVALID_UPSCALING_CONTEXT_ID);
    const upscalingEnabled = upscalingInfo.technique !== UpscalingTechnique.NONE;
    const sharpeningRequired = !upscalingInfo.hasSharpening;

    if (upscalingEnabled) displaySize = { width: upscalingInfo.displayWidth, height: upscalingInfo.displayHeight };

    let output = this._Temp(gpuResourcePool, "Final Result", displaySize, destinationFormat, RENDER_TARGET);

    // Always copy (cpp:691-693).
    let nonMsaaSource = this._Temp(gpuResourcePool, "Pre-upscaling Composite", renderSize, source.GetFormat(), RENDER_TARGET);
    source.Resolve(nonMsaaSource.Get(), renderContext);

    let dynamicExposure = null;
    let histogramBuffer = null;
    let upscaledSource = null;
    let bloomTexture = null;
    let exposure = null;

    try
    {
      if (postProcess)
      {
        const genericEffect = postProcess.GetGenericEffectIfAvailable(this.quality);
        if (genericEffect) this.RenderGenericEffect(nonMsaaSource.Get(), source, renderContext, genericEffect, renderer);

        const fog = postProcess.GetFogIfAvailable(this.quality);
        if (fog) this.RenderFog(nonMsaaSource.Get(), source, gpuResourcePool, renderContext, fog, renderer);
      }
      sourceBuffer = release(sourceBuffer);

      if (postProcess)
      {
        const godrays = postProcess.GetGodRaysIfAvailable(this.quality);
        if (godrays) this.RenderGodRays(nonMsaaSource.Get(), depthMap?.Get() ?? null, gpuResourcePool, renderContext, godrays, renderer);

        const dof = postProcess.GetDepthOfFieldIfAvailable(this.quality);
        if (dof)
        {
          const temporal = upscalingInfo.temporal || postProcess.GetTaaIfAvailable(this.quality) !== null;
          this.RenderDepthOfField(nonMsaaSource.Get(), gpuResourcePool, renderContext, dof, temporal, upscalingInfo.upscalingAmount, renderer);
        }

        dynamicExposure = postProcess.GetDynamicExposureIfAvailable(this.quality);
        const taa = postProcess.GetTaaIfAvailable(this.quality);

        if (taa && !upscalingInfo.temporal)
        {
          this.RenderTaa(nonMsaaSource.Get(), velocity?.Get() ?? null, opaqueColor?.Get() ?? null, gpuResourcePool, renderContext, taa, dynamicExposure, renderer);
          if (!upscalingContext)
          {
            velocity = release(velocity);
            opaqueColor = release(opaqueColor);
          }
        }
        else
        {
          this._taaFrameCounter = 0;
        }

        if (dynamicExposure)
        {
          histogramBuffer = this.RenderDynamicExposure(nonMsaaSource.Get(), gpuResourcePool, renderContext, dynamicExposure);
          if (!dynamicExposure.debug) histogramBuffer = release(histogramBuffer);
        }
      }

      if (upscalingContext && upscalingInfo.temporal)
      {
        upscalingContext.SetHudLessTexture(output.Get());
        upscaledSource = this.RenderUpscaling(nonMsaaSource.Get(), depthMap?.Get() ?? null, velocity?.Get() ?? null, opaqueColor?.Get() ?? null, scene.GetReprojectionMatrix(), gpuResourcePool, renderContext, upscalingContext, dynamicExposure);
        nonMsaaSource = release(nonMsaaSource);
        depthMap = release(depthMap);
        velocity = release(velocity);
        opaqueColor = release(opaqueColor);
        scene.ApplyUpscalingToPerFrameData(displaySize.width, displaySize.height, renderContext);
      }
      else
      {
        upscaledSource = nonMsaaSource;
        nonMsaaSource = null;
        if (!upscalingContext)
        {
          depthMap = release(depthMap);
          velocity = release(velocity);
          opaqueColor = release(opaqueColor);
        }
      }

      // After dynamic exposure, since bloom can be exposure dependent (cpp:760).
      bloomTexture = this.GetBlackTexture(gpuResourcePool);
      if (postProcess)
      {
        const bloom = postProcess.GetBloomIfAvailable(this.quality);
        if (bloom)
        {
          release(bloomTexture);
          bloomTexture = this.RenderBloom(upscaledSource, gpuResourcePool, renderContext, bloom, dynamicExposure, renderer);
        }
      }

      const sharpened = this.RenderSharpening(sharpeningRequired, upscaledSource, gpuResourcePool, renderContext);
      if (sharpened !== upscaledSource)
      {
        release(upscaledSource);
        upscaledSource = sharpened;
      }

      // TEMP_PARAM (cpp:771-774): set now, reset to empty when Execute ends.
      exposure = this.GetExposureBuffer(gpuResourcePool);
      this.tonemappingEffect.SetParameter("BlitCurrent", bloomTexture.Get());
      this.tonemappingEffect.SetParameter("BlitOriginal", upscaledSource.Get());
      this.tonemappingEffect.SetParameter("Exposure", exposure.Get());
      this.tonemappingEffect.SetParameter("Histogram", histogramBuffer?.Get() ?? null);

      const filmGrain = postProcess ? postProcess.GetFilmGrainIfAvailable(this.quality) : null;

      if (!upscalingInfo.temporal || filmGrain)
      {
        if (upscalingContext && !upscalingInfo.temporal)
        {
          const tonemappedOutput = this._Temp(gpuResourcePool, "Tonemapping Result", renderSize, destinationFormat, RENDER_TARGET);

          this.RenderTonemapping(tonemappedOutput.Get(), postProcess, renderContext, renderer);

          release(output);
          output = this.RenderUpscaling(tonemappedOutput.Get(), depthMap?.Get() ?? null, velocity?.Get() ?? null, opaqueColor?.Get() ?? null, scene.GetReprojectionMatrix(), gpuResourcePool, renderContext, upscalingContext, dynamicExposure);
          release(tonemappedOutput);
          depthMap = release(depthMap);
          velocity = release(velocity);
          opaqueColor = release(opaqueColor);
          scene.ApplyUpscalingToPerFrameData(displaySize.width, displaySize.height, renderContext);
        }
        else
        {
          this.RenderTonemapping(output.Get(), postProcess, renderContext, renderer);
        }

        esm.SetRenderTarget(0, destination);
        if (filmGrain)
        {
          this.RenderFilmGrain(output.Get(), renderContext, filmGrain, renderer);
        }
        else
        {
          renderer.DrawTexture(renderContext, output.Get());
        }
      }
      else
      {
        this.RenderTonemapping(output.Get(), postProcess, renderContext, renderer);
        renderer.DrawTexture(renderContext, output.Get());
      }

      if (postProcess)
      {
        const signalLoss = postProcess.GetSignalLossIfAvailable(this.quality);
        if (signalLoss) this.RenderSignalLoss(output.Get(), renderContext, signalLoss, renderer);
      }

      this.RenderDynamicExposureDebug(gpuResourcePool, renderContext, dynamicExposure, histogramBuffer?.Get() ?? null);
    }
    finally
    {
      this.tonemappingEffect.SetParameter("BlitCurrent", null);
      this.tonemappingEffect.SetParameter("BlitOriginal", null);
      this.tonemappingEffect.SetParameter("Exposure", null);
      this.tonemappingEffect.SetParameter("Histogram", null);

      for (const handle of [ output, nonMsaaSource, upscaledSource, bloomTexture, exposure, histogramBuffer, sourceBuffer, depthMap, velocity, opaqueColor ])
      {
        release(handle);
      }

      esm.PopDepthStencilBuffer();
      esm.PopRenderTarget();
    }
  }

  /**
   * Carbon SetupExposureConversion (cpp:851-857).
   *
   * @param {boolean} enable Whether exposure conversion runs.
   * @param {number} middleValue The exposure middle value.
   * @returns {void}
   */
  @carbon.method
  @impl.implemented
  SetupExposureConversion(enable, middleValue)
  {
    if (enable) this.dynamicExposureToTextureShader.SetParameter("ExposureMiddleValue", middleValue);
  }

  /**
   * AMD CAS sharpening (cpp:859-891): a compute pass into a UAV-compatible copy,
   * or the input unchanged when the upscaler already sharpens.
   *
   * @param {boolean} enable Whether to sharpen.
   * @param {GpuResourceHandle} input The texture to sharpen.
   * @param {Tr2GpuResourcePool} gpuResourcePool The frame's pool.
   * @param {Tr2RenderContext} renderContext The context to render with.
   * @returns {GpuResourceHandle} The sharpened texture, or `input`.
   */
  @carbon.method
  @impl.implemented
  RenderSharpening(enable, input, gpuResourcePool, renderContext)
  {
    if (!enable) return input;

    const texture = input.Get();
    const format = Tr2PostProcessRenderer.getUavCompatibleFormat(texture.GetFormat());
    const output = this._Temp(
      gpuResourcePool,
      "Sharpening Output",
      { width: texture.GetWidth(), height: texture.GetHeight() },
      format,
      RENDER_TARGET | Tr2GpuUsage.UNORDERED_ACCESS
    );
    const renderWidth = output.Get().GetWidth();
    const renderHeight = output.Get().GetHeight();
    const casIntensity = 0;
    const { const0, const1 } = Tr2PostProcessRenderer.casSetup(casIntensity, renderWidth, renderHeight, renderWidth, renderHeight);

    this._fidelityFxCasShader.SetParameter("const0", const0);
    this._fidelityFxCasShader.SetParameter("const1", const1);
    this._fidelityFxCasShader.SetParameter("InputTexture", texture);
    this._fidelityFxCasShader.SetParameter("OutputTexture", output.Get());

    try
    {
      const dispatchX = Math.floor((renderWidth + (CAS_THREAD_GROUP_WORK_REGION_DIM - 1)) / CAS_THREAD_GROUP_WORK_REGION_DIM);
      const dispatchY = Math.floor((renderHeight + (CAS_THREAD_GROUP_WORK_REGION_DIM - 1)) / CAS_THREAD_GROUP_WORK_REGION_DIM);

      Tr2Renderer.runComputeShader(this._fidelityFxCasShader, dispatchX, dispatchY, 1, renderContext);
    }
    finally
    {
      this._fidelityFxCasShader.SetParameter("InputTexture", null);
      this._fidelityFxCasShader.SetParameter("OutputTexture", null);
    }

    return output;
  }

  /**
   * Tonemapping (cpp:1531-1583): stamps every effect of the post process onto
   * the tonemapping shader, picks the method, and draws it into `dest`.
   *
   * @param {object} dest The texture to render into.
   * @param {Tr2PostProcess2|null} postprocess The active post process.
   * @param {Tr2RenderContext} renderContext The context to render with.
   * @param {Tr2Renderer} renderer The renderer owning the blitter.
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
  RenderTonemapping(dest, postprocess, renderContext, renderer)
  {
    const effect = this.tonemappingEffect;

    effect.SetParameter("OutputGamma", EveSpaceScene.eveSpaceSceneGammaBrightness);

    Tr2PostProcessRenderer.applyColorCorrection(postprocess ? postprocess.GetColorCorrectionIfAvailable(this.quality) : null, effect);
    Tr2PostProcessRenderer.applyBloom(postprocess ? postprocess.GetBloomIfAvailable(this.quality) : null, effect, this.useNewBloom, this.bloomDebugMode);
    Tr2PostProcessRenderer.applyDynamicExposure(postprocess ? postprocess.GetDynamicExposureIfAvailable(this.quality) : null, effect, postprocess ? postprocess.exposureAdjustment : 0);
    Tr2PostProcessRenderer.applyVignette(postprocess ? postprocess.GetVignetteIfAvailable(this.quality) : null, effect);
    Tr2PostProcessRenderer.applyDesaturate(postprocess ? postprocess.GetDesaturateIfAvailable(this.quality) : null, effect);
    Tr2PostProcessRenderer.applyFade(postprocess ? postprocess.GetFadeIfAvailable(this.quality) : null, effect);

    const luts = [];
    if (postprocess) postprocess.GetAvilableSortedLuts(luts);
    Tr2PostProcessRenderer.applyLuts(luts, effect);

    const tonemapping = postprocess ? postprocess.GetTonemappingIfAvailable() : null;
    if (!tonemapping)
    {
      Tr2PostProcessRenderer.applyNoTonemappingMethod(effect);
    }
    else if (tonemapping.method === Tr2PPTonemappingEffect.Aces)
    {
      Tr2PostProcessRenderer.applyAcesTonemappingMethod(tonemapping, effect);
    }
    else if (tonemapping.method === Tr2PPTonemappingEffect.AgX)
    {
      Tr2PostProcessRenderer.applyAgxTonemappingMethod(effect);
    }
    else
    {
      Tr2PostProcessRenderer.applyUncharted2TonemappingMethod(tonemapping, effect);
    }

    renderContext.GetEffectStateManager().ApplyStandardStates(RenderingMode.RM_FULLSCREEN);
    Tr2PostProcessRenderer.drawInto(dest, Tr2LoadAction.DONT_CARE, effect, renderContext, renderer);
  }

  /**
   * A post process's own generic effect over the scene (cpp:1585-1596).
   *
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
  RenderGenericEffect(dest, src, renderContext, genericEffect, renderer)
  {
    const effect = genericEffect.GetEffect();
    if (!effect) return;

    renderContext.GetEffectStateManager().ApplyStandardStates(RenderingMode.RM_FULLSCREEN);
    effect.SetParameter("Blit", src);
    try
    {
      Tr2PostProcessRenderer.drawInto(dest, Tr2LoadAction.DONT_CARE, effect, renderContext, renderer);
    }
    finally
    {
      effect.SetParameter("Blit", null);
    }
  }

  /**
   * Film grain over the final image (cpp:1392-1404).
   *
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
  RenderFilmGrain(dest, renderContext, filmGrain, renderer)
  {
    const shader = this._grainShader;

    renderContext.GetEffectStateManager().ApplyStandardStates(RenderingMode.RM_FULLSCREEN);
    shader.SetParameter("GrainColorAmount", filmGrain.colored ? filmGrain.colorAmount : 0);
    shader.SetParameter("GrainSize", filmGrain.grainSize);
    shader.SetParameter("GrainIntensity", filmGrain.intensity);
    shader.SetParameter("GrainThreshold", 1 - filmGrain.grainDensity);
    shader.SetParameter("GrainEdge", 1 / (filmGrain.grainContrast * filmGrain.grainSize));
    shader.SetParameter("BrightnessModifier", filmGrain.brightnessModifier);
    shader.SetParameter("InputTexture", dest);
    renderer.DrawScreenQuad(renderContext, shader);
  }

  /**
   * Signal loss over the final image (cpp:1173-1179).
   *
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
  RenderSignalLoss(dest, renderContext, signalLoss, renderer)
  {
    this.signalLossEffect.SetParameter("NoiseStrength", signalLoss.strength);
    renderer.DrawTexture(renderContext, dest, { material: this.signalLossEffect });
  }

  /**
   * The dynamic exposure debug overlay (cpp:1243-1285). With the debug off
   * this drops the debug shader, which is all Carbon does then.
   *
   * @returns {void}
   */
  @carbon.method
  @impl.implemented
  RenderDynamicExposureDebug(_gpuResourcePool, _renderContext, dynamicExposure, _histogramBuffer)
  {
    if (dynamicExposure && dynamicExposure.debug)
    {
      throw new Error("Tr2PostProcessRenderer.RenderDynamicExposureDebug is not ported yet.");
    }

    this._dynamicExposureDebugShader = null;
  }

  /**
   * The persistent 8 x R32_FLOAT exposure buffer (cpp:1700-1706).
   *
   * @param {Tr2GpuResourcePool} gpuResourcePool The pool.
   * @returns {GpuResourceHandle} The buffer.
   */
  @carbon.method
  @impl.implemented
  GetExposureBuffer(gpuResourcePool)
  {
    return gpuResourcePool.GetPersistentBuffer(
      "Exposure Buffer",
      Tr2BufferDescriptionAL.FromFormat(
        PixelFormat.PIXEL_FORMAT_R32_FLOAT,
        8,
        Tr2GpuUsage.UNORDERED_ACCESS | Tr2GpuUsage.SHADER_RESOURCE,
        Tr2CpuUsage.READ
      ),
      new Float32Array(8)
    );
  }

  /**
   * The persistent 4 x 4 black texture (cpp:1708-1713).
   *
   * @param {Tr2GpuResourcePool} gpuResourcePool The pool.
   * @returns {GpuResourceHandle} The texture.
   */
  @carbon.method
  @impl.implemented
  GetBlackTexture(gpuResourcePool)
  {
    return gpuResourcePool.GetPersistentTexture("Black", {
      type: TextureType.TEX_TYPE_2D,
      width: 4,
      height: 4,
      depth: 1,
      mipCount: 1,
      format: PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM,
      gpuUsage: Tr2GpuUsage.SHADER_RESOURCE,
      initialData: [ new Tr2SubresourceData(new Uint32Array(4 * 4), 4 * 4, 4 * 4 * 4) ]
    });
  }

  // THE PASSES NOT PORTED YET. Each runs only when the post process enables it.

  /**
   * Carbon Blur (cpp:893-946): a horizontal then a vertical pass of Blur.fx,
   * each effect pair built once per BlurContext hash and cached.
   *
   * Takes ownership of `src` and frees it after the first pass, as Carbon's
   * `src = {}` does (cpp:940).
   *
   * @param {GpuResourceHandle} src The texture to blur, owned from here on.
   * @param {Tr2GpuResourcePool} gpuResourcePool The frame's pool.
   * @param {Tr2RenderContext} renderContext The context to render with.
   * @param {BlurContext} blurContext The blur variant.
   * @param {Tr2Renderer} renderer The renderer owning the blitter.
   * @returns {GpuResourceHandle} The blurred texture.
   */
  @carbon.method
  @impl.adapted
  Blur(src, gpuResourcePool, renderContext, blurContext, renderer)
  {
    const hash = blurContext.Hash();
    let effects = this._blurEffects.get(hash);

    if (!effects)
    {
      // Horizontal and vertical, IN THAT ORDER (cpp:899).
      effects = [ new Tr2Effect(), new Tr2Effect() ];
      const [ horizontal, vertical ] = effects;

      horizontal.StartUpdate();
      horizontal.SetEffectPathName(PostProcessEffectPaths.Blur);
      vertical.StartUpdate();
      vertical.SetEffectPathName(PostProcessEffectPaths.Blur);
      vertical.SetParameter("Direction", vec2.fromValues(0, 1));

      const blurTypeOption = BlurContext.getBlurTypeOptionValue(blurContext.type);
      horizontal.SetOption("BLUR_TYPE", blurTypeOption);
      vertical.SetOption("BLUR_TYPE", blurTypeOption);

      const blurChannelOption = BlurContext.getBlurChannelOptionValue(blurContext.channel);
      horizontal.SetOption("BLUR_CHANNEL", blurChannelOption);
      vertical.SetOption("BLUR_CHANNEL", blurChannelOption);

      const processOption = BlurContext.getProcessTypeOptionValue(blurContext.process);
      horizontal.SetOption("BLUR_PROCESS_TYPE", processOption);
      vertical.SetOption("BLUR_PROCESS_TYPE", processOption);

      horizontal.SetOption("BLUR_FINALIZE_TYPE", BlurContext.getFinalizeTypeOptionValue(BlurContext.BlurFinalize.BF_None));
      vertical.SetOption("BLUR_FINALIZE_TYPE", BlurContext.getFinalizeTypeOptionValue(blurContext.finalize));

      horizontal.EndUpdate();
      vertical.EndUpdate();
      this._blurEffects.set(hash, effects);
    }

    const [ horizontal, vertical ] = effects;
    const source = src.Get();

    const rt2 = this._Temp(gpuResourcePool, "Blur Temp 1", { width: source.GetWidth(), height: source.GetHeight() }, source.GetFormat(), RENDER_TARGET);
    horizontal.SetParameter("BlitCurrent", source);
    try
    {
      Tr2PostProcessRenderer.drawInto(rt2.Get(), Tr2LoadAction.DONT_CARE, horizontal, renderContext, renderer);
    }
    finally
    {
      horizontal.SetParameter("BlitCurrent", null);
      Tr2PostProcessRenderer._release(gpuResourcePool, src);
    }

    const second = rt2.Get();
    const rt1 = this._Temp(gpuResourcePool, "Blur Temp 2", { width: second.GetWidth(), height: second.GetHeight() }, second.GetFormat(), RENDER_TARGET);
    vertical.SetParameter("BlitCurrent", second);
    try
    {
      Tr2PostProcessRenderer.drawInto(rt1.Get(), Tr2LoadAction.DONT_CARE, vertical, renderContext, renderer);
    }
    finally
    {
      vertical.SetParameter("BlitCurrent", null);
      Tr2PostProcessRenderer._release(gpuResourcePool, rt2);
    }

    return rt1;
  }

  /**
   * Carbon RenderBloom (cpp:957-1113). The new bloom (the default, `g_newBloom`)
   * downsamples the scene through up to six half-size steps, then walks back
   * up: a horizontal gaussian into each step's upsample texture, and a
   * vertical gaussian that adds the previous (coarser) result, tinted per
   * step, back into the step's downsample texture. The finest step is the
   * bloom texture tonemapping reads as `BlitCurrent`. The old bloom is a
   * high-pass at half size and one Blur.
   *
   * Carbon's per-pass constants (DownsampleData, GaussianData) go through
   * FillAndSetConstants into `m_bloomConstantBuffer` at the per-object PS
   * register; so do these.
   *
   * @param {GpuResourceHandle} dest The scene colour to bloom (not consumed).
   * @param {Tr2GpuResourcePool} gpuResourcePool The frame's pool.
   * @param {Tr2RenderContext} renderContext The context to render with.
   * @param {Tr2PPBloomEffect} bloom The bloom settings.
   * @param {Tr2PPDynamicExposureEffect|null} dynamicExposure The exposure settings, if any.
   * @param {Tr2Renderer} renderer The renderer owning the blitter.
   * @returns {GpuResourceHandle} The bloom texture, owned by the caller.
   */
  @carbon.method
  @impl.adapted
  RenderBloom(dest, gpuResourcePool, renderContext, bloom, dynamicExposure, renderer)
  {
    const esm = renderContext.GetEffectStateManager();
    const release = handle => Tr2PostProcessRenderer._release(gpuResourcePool, handle);
    const destination = dest.Get();
    const destinationSize = { width: destination.GetWidth(), height: destination.GetHeight() };

    esm.ApplyStandardStates(RenderingMode.RM_FULLSCREEN);

    const hasDynamicExposure = dynamicExposure !== null;
    const exposureDependant = bloom.exposureDependency && hasDynamicExposure;

    if (!this.useNewBloom)
    {
      const highPass = this.bloomHighPassFilter;
      highPass.SetParameter("LuminanceThreshold", Math.max(0, bloom.luminanceThreshold));
      highPass.SetParameter("LuminanceScale", bloom.luminanceScale);
      highPass.SetParameter("ExposureDependency", exposureDependant ? 1 : 0);

      const rt1 = this._Temp(gpuResourcePool, "Bloom", Tr2PostProcessRenderer.scaledSize(destination, 0.5), destination.GetFormat(), RENDER_TARGET);
      const exposure = this.GetExposureBuffer(gpuResourcePool);
      highPass.SetParameter("BlitCurrent", destination);
      highPass.SetParameter("Exposure", exposure.Get());
      try
      {
        Tr2PostProcessRenderer.drawInto(rt1.Get(), Tr2LoadAction.DONT_CARE, highPass, renderContext, renderer);
      }
      finally
      {
        highPass.SetParameter("BlitCurrent", null);
        highPass.SetParameter("Exposure", null);
        release(exposure);
      }

      return this.Blur(rt1, gpuResourcePool, renderContext, new BlurContext(), renderer);
    }

    const MAX_BLOOM_STEPS = Tr2PPBloomEffect.MAX_BLOOM_STEPS;
    const black = this.GetBlackTexture(gpuResourcePool);
    const minDim = Math.min(destinationSize.width, destinationSize.height);
    let currentSize = 0.5;
    let depth = 0;

    this._downSamplerLuminancePreserve.SetOption("EXPOSURE_DEPENDANCE", hasDynamicExposure ? "EXPOSURE_DEPENDANCE_ON" : "EXPOSURE_DEPENDANCE_OFF");
    this._downSamplerLuminancePreserve.SetParameter("LuminanceThreshold", bloom.luminanceThreshold);

    const downsampleTexture = new Array(MAX_BLOOM_STEPS).fill(null);
    const upsampleTexture = new Array(MAX_BLOOM_STEPS).fill(null);
    let result = null;

    try
    {
      for (let i = 0; i < MAX_BLOOM_STEPS; ++i)
      {
        if (Math.trunc(minDim * currentSize) === 0) break;

        const size = Tr2PostProcessRenderer.scaledSize(destination, currentSize);
        downsampleTexture[i] = this._Temp(gpuResourcePool, `Downsample_${i}`, size, destination.GetFormat(), RENDER_TARGET);
        upsampleTexture[i] = this._Temp(gpuResourcePool, `Upsample_${i}`, size, destination.GetFormat(), RENDER_TARGET);

        // The debug views (cpp:1006-1010) need RenderBloomDebug, not ported.
        if (this.bloomDebugMode !== BloomDebugMode.BLOOM_DEBUG_NONE)
        {
          throw new Error("Tr2PostProcessRenderer: bloom debug (RenderBloomDebug) is not ported yet.");
        }

        currentSize *= 0.5;
        ++depth;
      }

      const pixelShaderMask = 1 << ShaderType.PIXEL_SHADER;
      const perObjectRegister = renderer.GetPerObjectPSStartRegister();

      // Downsample (cpp:1016-1039).
      let lastRt = destination;
      for (let i = 0; i < depth; ++i)
      {
        const rt = downsampleTexture[i].Get();
        const effect = i === 0 && bloom.luminanceThreshold > -1 ? this._downSamplerLuminancePreserve : this._downSampler;
        const exposure = this.GetExposureBuffer(gpuResourcePool);

        // DownsampleData: Vector2 invSourceSize + two floats of padding (h:139-144).
        const downsampleInfo = new Float32Array([ 1 / lastRt.GetWidth(), 1 / lastRt.GetHeight(), 0, 0 ]);

        effect.SetParameter("BlitCurrent", lastRt);
        effect.SetParameter("Exposure", exposure.Get());
        try
        {
          FillAndSetConstants(this._BloomConstantBuffer(renderContext), downsampleInfo, downsampleInfo.byteLength, pixelShaderMask, perObjectRegister, renderContext);
          Tr2PostProcessRenderer.drawInto(rt, Tr2LoadAction.DONT_CARE, effect, renderContext, renderer);
        }
        finally
        {
          effect.SetParameter("BlitCurrent", null);
          effect.SetParameter("Exposure", null);
          release(exposure);
        }

        lastRt = rt;
      }

      // Upsample (cpp:1041-1105): every horizontal pass, then every vertical.
      const tintScale = (1 / MAX_BLOOM_STEPS) * bloom.brightness;
      const directionalWeight = [ Math.max(bloom.directionalWeight, 0), Math.abs(bloom.directionalWeight) ];
      const gaussianBytes = new Uint8Array(GaussianData.byteSize);
      const stepSize = i => bloom[`step${i + 1}Size`];
      const stepTint = i => bloom[`step${i + 1}Tint`];

      for (let i = depth - 1; i >= 0; --i)
      {
        const currentMip = downsampleTexture[i].Get();
        const currentUpsampled = upsampleTexture[i].Get();
        const radiusInPixels = Math.max(currentMip.GetWidth(), currentMip.GetHeight()) * bloom.sizeScale * stepSize(i) * 0.01;
        const invTexelSizeX = 1 / currentMip.GetWidth();

        this._upsamplerHorizontal.SetParameter("BlitCurrent", currentMip);
        const gaussianOutput = GaussianData.calculateGaussianPassParameters(radiusInPixels, directionalWeight[0], invTexelSizeX, vec3.fromValues(1, 1, 1), vec2.fromValues(1, 0));
        GaussianData.pack(gaussianOutput, gaussianBytes);
        FillAndSetConstants(this._BloomConstantBuffer(renderContext), gaussianBytes, gaussianBytes.byteLength, pixelShaderMask, perObjectRegister, renderContext);
        Tr2PostProcessRenderer.drawInto(currentUpsampled, Tr2LoadAction.DONT_CARE, this._upsamplerHorizontal, renderContext, renderer);
      }

      let lastHandle = null;
      for (let i = depth - 1; i >= 0; --i)
      {
        if (i === depth - 1) lastRt = black.Get();

        const currentMip = downsampleTexture[i].Get();
        const currentUpsampled = upsampleTexture[i].Get();
        const radiusInPixels = Math.max(currentMip.GetWidth(), currentMip.GetHeight()) * bloom.sizeScale * stepSize(i) * 0.01;
        const invTexelSizeY = 1 / currentMip.GetHeight();

        // The horizontally blurred mip, plus the coarser result below it.
        this._upsamplerVertical.SetParameter("BlitCurrent", currentUpsampled);
        this._upsamplerVertical.SetParameter("LastMip", lastRt);

        const tint = vec4.scale(vec4.create(), stepTint(i), tintScale);
        const gaussianOutput = GaussianData.calculateGaussianPassParameters(radiusInPixels, directionalWeight[1], invTexelSizeY, vec3.fromValues(tint[0], tint[1], tint[2]), vec2.fromValues(0, 1));
        GaussianData.pack(gaussianOutput, gaussianBytes);
        FillAndSetConstants(this._BloomConstantBuffer(renderContext), gaussianBytes, gaussianBytes.byteLength, pixelShaderMask, perObjectRegister, renderContext);

        // Into the downsample texture, which is not read again (cpp:1100).
        Tr2PostProcessRenderer.drawInto(currentMip, Tr2LoadAction.DONT_CARE, this._upsamplerVertical, renderContext, renderer);

        lastRt = currentMip;
        lastHandle = downsampleTexture[i];
      }

      // Carbon returns lastRt, the finest downsample texture; with no step at
      // all it is `dest` itself (cpp:1016, 1112), which the caller still owns,
      // so the bloom is then the black texture instead.
      result = lastHandle ?? black;
      return result;
    }
    finally
    {
      this._upsamplerHorizontal.SetParameter("BlitCurrent", null);
      this._upsamplerVertical.SetParameter("BlitCurrent", null);
      this._upsamplerVertical.SetParameter("LastMip", null);

      for (const handle of [ ...downsampleTexture, ...upsampleTexture, black ])
      {
        if (handle && handle !== result) release(handle);
      }
    }
  }

  /**
   * God rays (cpp:1146-1171): half-resolution depth, the rays drawn into a
   * cleared half-resolution target, then added onto `dest`.
   *
   * Adapted: the renderer is passed in for the blitter, as in Execute.
   *
   * @param {object} dest The colour texture the rays are added to.
   * @param {object} depth The scene depth.
   * @param {Tr2GpuResourcePool} gpuResourcePool The frame's pool.
   * @param {Tr2RenderContext} renderContext The context to render with.
   * @param {Tr2PPGodRaysEffect} godrays The post process's god-ray settings.
   * @param {Tr2Renderer} renderer The renderer owning the blitter.
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
  RenderGodRays(dest, depth, gpuResourcePool, renderContext, godrays, renderer)
  {
    const esm = renderContext.GetEffectStateManager();
    const effect = this.godrayEffect;

    esm.ApplyStandardStates(RenderingMode.RM_FULLSCREEN);

    const rt1 = this.DownSampleDepth(depth, gpuResourcePool, renderContext, renderer);
    const rt2 = this._Temp(gpuResourcePool, "God rays", Tr2PostProcessRenderer.scaledSize(dest, 0.5), dest.GetFormat(), RENDER_TARGET);

    try
    {
      esm.PushRenderTarget(rt2.Get());
      // The clear is needed because the god-ray vertex shader can opt out of rendering (cpp:1157).
      renderContext.Clear({ clearColor: true, color: 0 });

      const color = godrays.godRayColor;
      effect.SetParameter("Color", [ color[0], color[1], color[2], color[3] ]);
      effect.SetParameter("Intensity", [ godrays.intensity, 0, 1, 1 ]);
      effect.SetParameter("grFactors", godrays.grFactors);
      effect.SetResourceTexture2D("NoiseTexMap", godrays.noiseTexturePath);
      effect.SetParameter("DepthMap", rt1.Get());
      try
      {
        renderer.DrawScreenQuad(renderContext, effect);
      }
      finally
      {
        effect.SetParameter("DepthMap", null);
        esm.PopRenderTarget();
      }

      esm.ApplyStandardStates(RenderingMode.RM_ALPHA_ADDITIVE);
      Tr2PostProcessRenderer.drawTextureInto(dest, Tr2LoadAction.LOAD, rt2.Get(), renderContext, renderer);
    }
    finally
    {
      Tr2PostProcessRenderer._release(gpuResourcePool, rt1);
      Tr2PostProcessRenderer._release(gpuResourcePool, rt2);
    }
  }

  /**
   * Half-resolution R32_FLOAT depth (cpp:948-954).
   *
   * @param {object} depth The scene depth.
   * @param {Tr2GpuResourcePool} gpuResourcePool The frame's pool.
   * @param {Tr2RenderContext} renderContext The context to render with.
   * @param {Tr2Renderer} renderer The renderer owning the blitter.
   * @returns {GpuResourceHandle} The down-sampled depth; the caller frees it.
   */
  @carbon.method
  @impl.adapted
  DownSampleDepth(depth, gpuResourcePool, renderContext, renderer)
  {
    const effect = this._downsampleDepthEffect;
    const destination = this._Temp(
      gpuResourcePool,
      "Down-sampled Depth",
      Tr2PostProcessRenderer.scaledSize(depth, 0.5),
      PixelFormat.PIXEL_FORMAT_R32_FLOAT,
      Tr2GpuUsage.RENDER_TARGET | Tr2GpuUsage.SHADER_RESOURCE
    );

    effect.SetParameter("DepthMap", depth);
    try
    {
      Tr2PostProcessRenderer.drawInto(destination.Get(), Tr2LoadAction.DONT_CARE, effect, renderContext, renderer);
    }
    finally
    {
      effect.SetParameter("DepthMap", null);
    }

    return destination;
  }

  /**
   * Carbon RenderDynamicExposure (cpp:1182-1241): three compute passes. Each
   * 16 x 16 tile builds a local luminance histogram, the tiles merge into one
   * 65-bin histogram, and one thread measures it and moves the persistent
   * exposure buffer towards the target at the increase/decrease speeds.
   * Tonemapping (and exposure-dependent bloom) read that buffer.
   *
   * @param {object} source The scene colour texture.
   * @param {Tr2GpuResourcePool} gpuResourcePool The frame's pool.
   * @param {Tr2RenderContext} renderContext The context to render with.
   * @param {Tr2PPDynamicExposureEffect} dynamicExposure The exposure settings.
   * @returns {GpuResourceHandle} The merged histogram, owned by the caller.
   */
  @carbon.method
  @impl.adapted
  RenderDynamicExposure(source, gpuResourcePool, renderContext, dynamicExposure)
  {
    const tilesX = Math.floor(source.GetWidth() / HISTOGRAM_TILE_SIZE_X) + 1;
    const tilesY = Math.floor(source.GetHeight() / HISTOGRAM_TILE_SIZE_Y) + 1;
    const localHistogramCount = tilesX * tilesY * 16;
    const uav = Tr2GpuUsage.SHADER_RESOURCE | Tr2GpuUsage.UNORDERED_ACCESS;

    const localHistograms = gpuResourcePool.GetTempBuffer(
      "LocalHistograms",
      Tr2BufferDescriptionAL.FromFormat(PixelFormat.PIXEL_FORMAT_R32G32B32A32_UINT, localHistogramCount, uav, Tr2CpuUsage.NONE)
    );
    const histogram = gpuResourcePool.GetTempBuffer(
      "Histogram",
      Tr2BufferDescriptionAL.FromFormat(PixelFormat.PIXEL_FORMAT_R32_UINT, 65, uav, Tr2CpuUsage.NONE)
    );
    const exposure = this.GetExposureBuffer(gpuResourcePool);

    const create = this.dynamicExposureCreateHistogramShader;
    const merge = this.dynamicExposureMergeHistogramShader;
    const measure = this.dynamicExposureMeasureExposureShader;

    create.SetParameter("ScreenTilesX", tilesX);
    create.SetParameter("BlitOriginal", source);
    create.SetParameter("LocalHistograms", localHistograms.Get());
    merge.SetParameter("ScreenTilesX", tilesX);
    merge.SetParameter("ScreenTilesY", tilesY);
    merge.SetParameter("LocalHistograms", localHistograms.Get());
    merge.SetParameter("Histogram", histogram.Get());

    try
    {
      const zero = new Uint32Array(4);
      renderContext.ClearUav(localHistograms.Get(), zero);
      renderContext.ClearUav(histogram.Get(), zero);

      // Create histograms.
      create.SetParameter("MinLuminance", Math.log(dynamicExposure.minLuminance));
      create.SetParameter("MaxLuminance", Math.log(dynamicExposure.maxLuminance));
      create.SetParameter("MinBrightness", dynamicExposure.minBrightness);
      create.SetParameter("MaxBrightness", dynamicExposure.maxBrightness);
      Tr2Renderer.runComputeShader(create, tilesX, tilesY, 1, renderContext);

      // Merge histogram.
      const mergeHistogramXDim = Math.floor((tilesX * tilesY) / NUM_TILES_PER_THREAD_GROUP) + 1;
      Tr2Renderer.runComputeShader(merge, mergeHistogramXDim, 1, 1, renderContext);

      // Measure histogram.
      measure.SetParameter("MinLuminance", Math.log(dynamicExposure.minLuminance));
      measure.SetParameter("MaxLuminance", Math.log(dynamicExposure.maxLuminance));
      measure.SetParameter("MinBrightness", dynamicExposure.minBrightness);
      measure.SetParameter("MaxBrightness", dynamicExposure.maxBrightness);
      measure.SetParameter("IncreaseSpeed", dynamicExposure.increaseSpeed);
      measure.SetParameter("DecreaseSpeed", dynamicExposure.decreaseSpeed);
      measure.SetParameter("MinExposure", dynamicExposure.minExposure);
      measure.SetParameter("MaxExposure", dynamicExposure.maxExposure);
      measure.SetParameter("Histogram", histogram.Get());
      measure.SetParameter("Exposure", exposure.Get());
      Tr2Renderer.runComputeShader(measure, 1, 1, 1, renderContext);
    }
    finally
    {
      create.SetParameter("BlitOriginal", null);
      create.SetParameter("LocalHistograms", null);
      merge.SetParameter("LocalHistograms", null);
      merge.SetParameter("Histogram", null);
      measure.SetParameter("Histogram", null);
      measure.SetParameter("Exposure", null);
      Tr2PostProcessRenderer._release(gpuResourcePool, localHistograms);
      Tr2PostProcessRenderer._release(gpuResourcePool, exposure);
    }

    return histogram;
  }

  /** Carbon RenderUpscaling (cpp:1287-1390). */
  @carbon.method
  @impl.notImplemented
  RenderUpscaling()
  {
    throw new Error("Tr2PostProcessRenderer.RenderUpscaling is not ported yet.");
  }

  /**
   * Environment fog (cpp:1406-1433): the fog colour at half resolution,
   * blurred, then composited over `dest` with the scene colour as the original.
   *
   * Adapted: the renderer is passed in for the blitter, as in Execute.
   *
   * @param {object} dest The colour texture fog is composited into.
   * @param {object} source The scene colour before post-processing.
   * @param {Tr2GpuResourcePool} gpuResourcePool The frame's pool.
   * @param {Tr2RenderContext} renderContext The context to render with.
   * @param {Tr2PPFogEffect} fog The post process's fog settings.
   * @param {Tr2Renderer} renderer The renderer owning the blitter.
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
  RenderFog(dest, source, gpuResourcePool, renderContext, fog, renderer)
  {
    renderContext.GetEffectStateManager().ApplyStandardStates(RenderingMode.RM_FULLSCREEN);

    // Fog colour.
    const colorEffect = this.fogColorEffect;
    const rt1 = this._Temp(gpuResourcePool, "Fog Color", Tr2PostProcessRenderer.scaledSize(dest, 0.5), dest.GetFormat(), RENDER_TARGET);
    const color = fog.color;

    colorEffect.SetParameter("BlitCurrent", dest);
    colorEffect.SetParameter("Params", [ fog.nebulaInfluence, fog.nebulaBlur, fog.originalBrightenOnly, fog.colorInfluence ]);
    colorEffect.SetParameter("Color", [ color[0], color[1], color[2], color[3] ]);
    try
    {
      Tr2PostProcessRenderer.drawInto(rt1.Get(), Tr2LoadAction.DONT_CARE, colorEffect, renderContext, renderer);
    }
    finally
    {
      colorEffect.SetParameter("BlitCurrent", null);
    }

    // Blur; Blur takes rt1 over (cpp:1420 moves it).
    const blurred = this.Blur(rt1, gpuResourcePool, renderContext, new BlurContext(), renderer);

    // Final composite.
    const composite = this.fogCompositeEffect;
    const { areaSize, areaScale, areaCenter } = fog;

    composite.SetParameter("FogParameters", [ fog.totalAmount, fog.totalPower, fog.backgroundOcclusion, fog.intensity ]);
    composite.SetParameter("BrightnessAdjustment", [ fog.brightnessThreshold0, fog.brightnessThreshold1, fog.brightnessAdjustmentAmount, 0 ]);
    composite.SetParameter("BlendFunction0", [ fog.blendDistance0, fog.blendBias0, fog.blendAmount0, fog.blendPower0 ]);
    composite.SetParameter("BlendFunction1", [ fog.blendDistance1, fog.blendBias1, fog.blendAmount1, fog.blendPower1 ]);
    composite.SetParameter("BlendFunction2", [ fog.blendDistance2, fog.blendBias2, fog.blendAmount2, fog.blendPower2 ]);
    composite.SetParameter("AreaSize", [ areaSize[0], areaSize[1], areaSize[2], areaScale[0] ]);
    composite.SetParameter("AreaCenter", [ areaCenter[0], areaCenter[1], areaCenter[2], areaScale[1] ]);
    composite.SetParameter("BlitCurrent", blurred.Get());
    composite.SetParameter("BlitOriginal", source);
    try
    {
      Tr2PostProcessRenderer.drawInto(dest, Tr2LoadAction.DONT_CARE, composite, renderContext, renderer);
    }
    finally
    {
      composite.SetParameter("BlitCurrent", null);
      composite.SetParameter("BlitOriginal", null);
      Tr2PostProcessRenderer._release(gpuResourcePool, blurred);
    }
  }

  /**
   * Temporal anti-aliasing (cpp:1435-1529): the current frame blended into a
   * ping-ponged persistent accumulator, then copied back into `dest`.
   *
   * Adapted: the renderer is passed in for the blitter, as in Execute. The
   * cooldown map's initial ClearUav of a texture is refused by the WebGPU AL,
   * which does not change the result: WebGPU creates textures zeroed, the
   * value Carbon clears to.
   *
   * @param {object} dest The scene colour, blended and written back.
   * @param {object|null} velocity The velocity map.
   * @param {object|null} opaqueColor The opaque colour copy; null at TAA low.
   * @param {Tr2GpuResourcePool} gpuResourcePool The frame's pool.
   * @param {Tr2RenderContext} renderContext The context to render with.
   * @param {Tr2PPTaaEffect} taa The post process's TAA settings.
   * @param {Tr2PPDynamicExposureEffect|null} dynamicExposure Dynamic exposure, if on.
   * @param {Tr2Renderer} renderer The renderer owning the blitter.
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
  RenderTaa(dest, velocity, opaqueColor, gpuResourcePool, renderContext, taa, dynamicExposure, renderer)
  {
    renderContext.GetEffectStateManager().ApplyStandardStates(RenderingMode.RM_FULLSCREEN);

    const al = renderContext.GetRenderContextAL();
    const release = handle => Tr2PostProcessRenderer._release(gpuResourcePool, handle);
    const clear = texture =>
    {
      al.SetRenderTarget(0, texture);
      al.Clear({ clearColor: true, color: 0 });
    };
    const clearUav = texture => al.ClearUav(texture, new Uint32Array(4));
    const persistent = (name, format, gpuUsage, initialize) => gpuResourcePool.GetPersistentTexture(name, {
      type: TextureType.TEX_TYPE_2D,
      width: dest.GetWidth(),
      height: dest.GetHeight(),
      depth: 1,
      mipCount: 1,
      format,
      gpuUsage
    }, initialize);

    const accumulationBuffer0 = persistent("TAA Accumulation 0", PixelFormat.PIXEL_FORMAT_R16G16B16A16_UNORM, RENDER_TARGET, clear);
    const accumulationBuffer1 = persistent("TAA Accumulation 1", PixelFormat.PIXEL_FORMAT_R16G16B16A16_UNORM, RENDER_TARGET, clear);
    const cooldownBuffer = persistent("TAA Cooldown", PixelFormat.PIXEL_FORMAT_R32_UINT, Tr2GpuUsage.UNORDERED_ACCESS | Tr2GpuUsage.SHADER_RESOURCE, clearUav);
    const exposure = dynamicExposure ? this.GetExposureBuffer(gpuResourcePool) : null;

    const frameCount = this._taaFrameCounter++;
    const [ input, output ] = (frameCount & 1) === 0
      ? [ accumulationBuffer0, accumulationBuffer1 ]
      : [ accumulationBuffer1, accumulationBuffer0 ];

    const effect = this.taaEffect;
    const copy = this._taaCopyEffect;

    for (const each of [ effect, copy ])
    {
      if (dynamicExposure)
      {
        each.SetParameter("ExposureAdjust", Math.pow(2, dynamicExposure.adjustment));
        each.SetParameter("ExposureMiddleValue", dynamicExposure.middleValue);
        each.SetParameter("ExposureInfluence", dynamicExposure.influence);
        each.SetOption("DYNAMIC_EXPOSURE_TOGGLE", "DYNAMIC_EXPOSURE_ENABLED");
      }
      else
      {
        each.SetOption("DYNAMIC_EXPOSURE_TOGGLE", "DYNAMIC_EXPOSURE_DISABLED");
      }
    }

    effect.SetParameter("FrameIndex", frameCount);
    effect.SetParameter("EarlyOutThreshold", taa.earlyOutThreshold);
    effect.SetOption("QUALITY", Tr2PostProcessRenderer.getTaaQualityShaderOptionValue(taa.quality));
    effect.SetOption("DEBUG", Tr2PostProcessRenderer.getTaaDebugShaderOptionValue(taa.debug));

    const MAX_WEIGHT = Math.fround(0.96);
    effect.SetParameter("BlendWeight", Math.min(Math.fround(frameCount / (frameCount + 1)), MAX_WEIGHT));

    try
    {
      effect.SetParameter("CurrentFrame", dest);
      effect.SetParameter("CurrentFrameOpaque", opaqueColor);
      effect.SetParameter("AccumulationBuffer", input.Get());
      effect.SetParameter("CooldownMap", cooldownBuffer.Get());
      effect.SetParameter("VelocityMap", velocity);
      effect.SetParameter("Exposure", exposure?.Get() ?? null);
      Tr2PostProcessRenderer.drawInto(output.Get(), Tr2LoadAction.DONT_CARE, effect, renderContext, renderer);

      copy.SetParameter("AccumulationBuffer", output.Get());
      copy.SetParameter("Exposure", exposure?.Get() ?? null);
      Tr2PostProcessRenderer.drawInto(dest, Tr2LoadAction.DONT_CARE, copy, renderContext, renderer);
    }
    finally
    {
      for (const name of [ "CurrentFrame", "CurrentFrameOpaque", "AccumulationBuffer", "CooldownMap", "VelocityMap", "Exposure" ])
      {
        effect.SetParameter(name, null);
      }
      copy.SetParameter("AccumulationBuffer", null);
      copy.SetParameter("Exposure", null);

      for (const handle of [ accumulationBuffer0, accumulationBuffer1, cooldownBuffer, exposure ]) release(handle);
    }
  }

  /**
   * Depth of field (cpp:1598-1698): the circle of confusion, blurred to its
   * maximum when the foreground blurs too, then either the TAA-friendly bokeh
   * and a copy back, or the bokeh blend and fill.
   *
   * Adapted: the renderer is passed in for the blitter, as in Execute.
   *
   * @param {object} dest The colour texture to blur.
   * @param {Tr2GpuResourcePool} gpuResourcePool The frame's pool.
   * @param {Tr2RenderContext} renderContext The context to render with.
   * @param {Tr2PPDepthOfFieldEffect} depthOfField The post process's DoF settings.
   * @param {boolean} temporal Whether TAA or a temporal upscaler follows.
   * @param {number} upscalingAmount The upscaler's ratio, 1 without one.
   * @param {Tr2Renderer} renderer The renderer owning the blitter.
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
  RenderDepthOfField(dest, gpuResourcePool, renderContext, depthOfField, temporal, upscalingAmount, renderer)
  {
    renderContext.GetEffectStateManager().ApplyStandardStates(RenderingMode.RM_FULLSCREEN);

    const release = handle => Tr2PostProcessRenderer._release(gpuResourcePool, handle);
    const shape = depthOfField.GetBokehShapeString();
    const cocShader = this.depthOfFieldCoCShader;
    const cocSize = Tr2PostProcessRenderer.scaledSize(dest, depthOfField.cocScale);
    let coc = null;
    let blur = null;

    cocShader.SetParameter("FocalInfo", [ depthOfField.focalDistance, depthOfField.focalLength, depthOfField.scale, 0 ]);
    cocShader.SetOption("COC_OUTPUT_CHANNEL_COUNT", depthOfField.foregroundBlurNeeded ? "COC_OUTPUT_CHANNEL_COUNT_2" : "COC_OUTPUT_CHANNEL_COUNT_1");

    try
    {
      if (!depthOfField.foregroundBlurNeeded)
      {
        coc = this._Temp(gpuResourcePool, "CoC", cocSize, PixelFormat.PIXEL_FORMAT_R8_UNORM, RENDER_TARGET);
        Tr2PostProcessRenderer.drawInto(coc.Get(), Tr2LoadAction.DONT_CARE, cocShader, renderContext, renderer);
      }
      else
      {
        const coc2 = this._Temp(gpuResourcePool, "CoC", cocSize, PixelFormat.PIXEL_FORMAT_R8G8_UNORM, RENDER_TARGET);
        const { BlurType, BlurChannel, BlurProcess, BlurFinalize } = BlurContext;

        Tr2PostProcessRenderer.drawInto(coc2.Get(), Tr2LoadAction.DONT_CARE, cocShader, renderContext, renderer);
        coc = this.Blur(
          coc2,
          gpuResourcePool,
          renderContext,
          BlurContext.createBlurContext(BlurType.BT_Big, BlurChannel.BC_r, BlurProcess.BP_Maximum, BlurFinalize.BF_MaxOfAllChannels),
          renderer
        );
      }

      const adjustedScale = Math.fround(depthOfField.scale / upscalingAmount);

      blur = this._Temp(gpuResourcePool, "Bokeh Blend", { width: dest.GetWidth(), height: dest.GetHeight() }, dest.GetFormat(), RENDER_TARGET);

      if (depthOfField.useTAAFriendlyBokeh)
      {
        const GOLDEN_ANGLE = Math.fround(Math.PI * (3 - Math.sqrt(5)));
        let angle = 0;
        let samplesPerPixel = 2 / 5;

        if (temporal)
        {
          // Four rotations, the same period as the TAA jitter, so TAA can
          // detect and remove some flickering (cpp:1650-1651).
          if ((this._bokehFrameCounter & 1) !== 0) angle += Math.PI;
          if ((this._bokehFrameCounter & 2) !== 0) angle += 0.5 * GOLDEN_ANGLE;
          this._bokehFrameCounter++;

          // Fewer samples per frame; the rotations accumulate four times as many (cpp:1658-1659).
          samplesPerPixel = 1 / 5;
        }

        const bokeh = this._depthOfFieldBokehTAAShader;

        bokeh.SetOption("BOKEH_SHAPE", shape);
        bokeh.SetParameter("BlitCurrent", dest);
        bokeh.SetParameter("CoCMap", coc.Get());
        bokeh.SetParameter("BokehInfo", [ adjustedScale, angle, samplesPerPixel, 0 ]);
        try
        {
          Tr2PostProcessRenderer.drawInto(blur.Get(), Tr2LoadAction.DONT_CARE, bokeh, renderContext, renderer);
        }
        finally
        {
          bokeh.SetParameter("BlitCurrent", null);
          bokeh.SetParameter("CoCMap", null);
        }

        // Copy back.
        Tr2PostProcessRenderer.drawTextureInto(dest, Tr2LoadAction.DONT_CARE, blur.Get(), renderContext, renderer);
      }
      else
      {
        const blend = this.depthOfFieldBokehBlurShader;

        blend.SetParameter("BlitCurrent", dest);
        blend.SetParameter("CoCMap", coc.Get());
        blend.SetParameter("BokehInfo", [ adjustedScale, 0, 0, 0 ]);
        blend.SetOption("BOKEH_SHAPE", shape);
        try
        {
          Tr2PostProcessRenderer.drawInto(blur.Get(), Tr2LoadAction.DONT_CARE, blend, renderContext, renderer);
        }
        finally
        {
          blend.SetParameter("BlitCurrent", null);
          blend.SetParameter("CoCMap", null);
        }

        const fill = this.depthOfFieldBokehFillShader;

        fill.SetParameter("BlitCurrent", blur.Get());
        fill.SetParameter("CoCMap", coc.Get());
        fill.SetParameter("BokehInfo", [ adjustedScale, 0, 0, 0 ]);
        fill.SetOption("BOKEH_SHAPE", shape);
        try
        {
          Tr2PostProcessRenderer.drawInto(dest, Tr2LoadAction.DONT_CARE, fill, renderContext, renderer);
        }
        finally
        {
          fill.SetParameter("BlitCurrent", null);
          fill.SetParameter("CoCMap", null);
        }
      }
    }
    finally
    {
      release(coc);
      release(blur);
    }
  }

  /**
   * m_bloomConstantBuffer, created empty on first use. Carbon default-constructs
   * the member (cpp:565) and FillAndSetConstants sizes it; our constant
   * buffers come from the render context, which the constructor has not got.
   *
   * @param {Tr2RenderContext} renderContext The context to create against.
   * @returns {object} A `Tr2ConstantBufferAL`.
   */
  _BloomConstantBuffer(renderContext)
  {
    this._bloomConstantBuffer ??= renderContext.CreateConstantBuffer();
    return this._bloomConstantBuffer;
  }

  /** A pool temp texture of Carbon's `GetTempTexture( name, size, format, usage )` form. */
  _Temp(gpuResourcePool, name, size, format, gpuUsage)
  {
    return gpuResourcePool.GetTempTexture(name, {
      type: TextureType.TEX_TYPE_2D,
      width: size.width,
      height: size.height,
      depth: 1,
      mipCount: 1,
      format,
      gpuUsage
    });
  }

  // CARBON'S ANONYMOUS-NAMESPACE HELPERS (cpp:31-150, 301-509).

  /**
   * DrawInto for an effect (cpp:56-62): hint the load action, push the target,
   * draw a screen quad, pop.
   *
   * @returns {void}
   */
  static drawInto(dest, loadAction, effect, renderContext, renderer)
  {
    const esm = renderContext.GetEffectStateManager();

    renderContext.RenderPassHint(new Tr2ColorAttachment(loadAction, Tr2StoreAction.STORE), null);
    esm.PushRenderTarget(dest);
    try
    {
      renderer.DrawScreenQuad(renderContext, effect);
    }
    finally
    {
      esm.PopRenderTarget();
    }
  }

  /**
   * DrawInto for a texture (cpp:38-44): hint the load action, push the target,
   * blit the texture, pop. Carbon overloads DrawInto; the texture form is
   * named here.
   *
   * @returns {void}
   */
  static drawTextureInto(dest, loadAction, src, renderContext, renderer)
  {
    const esm = renderContext.GetEffectStateManager();

    renderContext.RenderPassHint(new Tr2ColorAttachment(loadAction, Tr2StoreAction.STORE), null);
    esm.PushRenderTarget(dest);
    try
    {
      renderer.DrawTexture(renderContext, src);
    }
    finally
    {
      esm.PopRenderTarget();
    }
  }

  /**
   * `TextureSize2D( texture.GetDesc() ) * scale` (Tr2GpuResourcePool.h:34-37):
   * each side scaled in float, truncated, and at least one.
   *
   * @param {object} texture A texture answering GetWidth and GetHeight.
   * @param {number} scale The scale.
   * @returns {{width: number, height: number}} The size.
   */
  static scaledSize(texture, scale)
  {
    const side = value => Math.max(1, Math.trunc(Math.fround(Math.fround(value) * Math.fround(scale))));

    return { width: side(texture.GetWidth()), height: side(texture.GetHeight()) };
  }

  /** GetTaaQualityShaderOptionValue (cpp:97-110). */
  static getTaaQualityShaderOptionValue(quality)
  {
    if (quality === Tr2PPTaaEffect.TAA_MEDIUM) return "QUALITY_MEDIUM";
    if (quality === Tr2PPTaaEffect.TAA_HIGH) return "QUALITY_HIGH";
    return "QUALITY_LOW";
  }

  /** GetTaaDebugShaderOptionValue (cpp:112-123). */
  static getTaaDebugShaderOptionValue(debug)
  {
    if (debug === Tr2PPTaaEffect.Debug.TAA_DEBUG_MOTION_VECTORS) return "DEBUG_SHOW_MOTION_VECTORS";
    if (debug === Tr2PPTaaEffect.Debug.TAA_DEBUG_EARLY_OUT_MASK) return "DEBUG_SHOW_EARLY_OUT_MASK";
    return "DEBUG_NONE";
  }

  /**
   * GetUavCompatibleFormat (cpp:64-72): BGRA formats cannot be UAVs, so they
   * become RGBA.
   *
   * @param {number} format A `PixelFormat`.
   * @returns {number} A UAV-compatible `PixelFormat`.
   */
  static getUavCompatibleFormat(format)
  {
    if (format === PixelFormat.PIXEL_FORMAT_B8G8R8X8_UNORM || format === PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM)
    {
      return PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM;
    }
    return format;
  }

  /**
   * The destination's `PixelFormat`. Carbon's destination is always a
   * Tr2TextureAL. Our back buffer is the canvas render target, which answers
   * GetWidth and GetHeight as a texture does, but reports its format as the
   * canvas's GPU format; the AL's Carbon `GetBackBufferFormat` gives the
   * `PixelFormat` for it.
   *
   * @param {object} destination The target.
   * @param {object} al The render context AL.
   * @returns {number} A `PixelFormat`.
   */
  static destinationFormatOf(destination, al)
  {
    return destination === al.GetDefaultBackBuffer() ? al.GetBackBufferFormat() : destination.GetFormat();
  }

  /**
   * AMD FidelityFX CAS `CasSetup` (ffx_cas.h, CAS 1.0, MIT). The header is a
   * third-party dependency of Carbon, not in the checkout; this is its public
   * definition. `sharpness` 0 gives -1/8.
   *
   * @param {number} sharpness 0 to 1.
   * @param {number} inputWidth Input width in pixels.
   * @param {number} inputHeight Input height in pixels.
   * @param {number} outputWidth Output width in pixels.
   * @param {number} outputHeight Output height in pixels.
   * @returns {{const0: Float32Array, const1: Float32Array}} The two constant
   *   vectors, as floats over their packed uint bits (AMDSharpening::AsVector).
   */
  static casSetup(sharpness, inputWidth, inputHeight, outputWidth, outputHeight)
  {
    const const0 = new Float32Array(4);
    const const1 = new Float32Array(4);
    const bits1 = new Uint32Array(const1.buffer);

    // Scaling terms.
    const0[0] = inputWidth * (1 / outputWidth);
    const0[1] = inputHeight * (1 / outputHeight);
    const0[2] = 0.5 * inputWidth * (1 / outputWidth) - 0.5;
    const0[3] = 0.5 * inputHeight * (1 / outputHeight) - 0.5;

    // Sharpness value: -1 / lerp(8, 5, saturate(sharpness)).
    const saturated = Math.min(1, Math.max(0, sharpness));
    const sharp = -(1 / (8 + (5 - 8) * saturated));

    const1[0] = sharp;
    // AU1_AH2_AF2(sharp, 0): two halves packed low-first into one uint.
    bits1[1] = (num.toHalfFloat(sharp) & 0xffff) | ((num.toHalfFloat(0) & 0xffff) << 16);
    const1[2] = 8 * inputWidth * (1 / outputWidth);
    bits1[3] = 0;

    return { const0, const1 };
  }

  /** Tonemapping::ApplyColorCorrection (cpp:304-321). */
  static applyColorCorrection(colorCorrection, effect)
  {
    if (!colorCorrection)
    {
      effect.SetOption("COLOR_CORRECTION_TOGGLE", "COLOR_CORRECTION_DISABLED");
      return;
    }
    effect.SetOption("COLOR_CORRECTION_TOGGLE", "COLOR_CORRECTION_ENABLED");
    effect.SetParameter("WhiteTemperature", colorCorrection.whiteTemperature);
    effect.SetParameter("WhiteTint", colorCorrection.whiteTint);
    effect.SetParameter("ColorSaturation", colorCorrection.colorSaturation);
    effect.SetParameter("ColorContrast", colorCorrection.colorContrast);
    effect.SetParameter("ColorGamma", colorCorrection.colorGamma);
    effect.SetParameter("ColorGain", colorCorrection.colorGain);
    effect.SetParameter("ColorOffset", colorCorrection.colorOffset);
  }

  /** Tonemapping::ApplyBloom (cpp:323-348). */
  static applyBloom(bloom, effect, newBloom, debugMode)
  {
    if (!bloom)
    {
      effect.SetResourceTexture2D("Grime", "res:/texture/global/black.dds");
      return;
    }
    effect.SetParameter("GrimeWeight", bloom.grimeWeight);
    effect.SetParameter("BloomBrightness", newBloom ? 1 : bloom.brightness);
    effect.SetResourceTexture2D("Grime", bloom.grimePath);

    if (debugMode !== BloomDebugMode.BLOOM_DEBUG_NONE)
    {
      throw new Error("Tr2PostProcessRenderer: the bloom debug arm of ApplyBloom is not ported yet.");
    }
  }

  /** Tonemapping::ApplyDynamicExposure (cpp:350-366). */
  static applyDynamicExposure(dynamicExposure, effect, postprocessExposureAmount)
  {
    if (!dynamicExposure)
    {
      effect.SetOption("DYNAMIC_EXPOSURE_TOGGLE", "DYNAMIC_EXPOSURE_DISABLED");
      effect.SetParameter("ExposureAdjust", Math.pow(2, postprocessExposureAmount));
      return;
    }
    effect.SetParameter("ExposureMiddleValue", dynamicExposure.middleValue);
    effect.SetParameter("ExposureInfluence", dynamicExposure.influence);
    effect.SetParameter("MinExposure", dynamicExposure.minExposure);
    effect.SetParameter("MaxExposure", dynamicExposure.maxExposure);
    effect.SetOption("DYNAMIC_EXPOSURE_TOGGLE", "DYNAMIC_EXPOSURE_ENABLED");
    effect.SetParameter("ExposureAdjust", Math.pow(2, postprocessExposureAmount + dynamicExposure.adjustment));
  }

  /** Tonemapping::ApplyVignette (cpp:368-387). */
  static applyVignette(vignette, effect)
  {
    if (!vignette)
    {
      effect.SetOption("VIGNETTE_TOGGLE", "VIGNETTE_DISABLED");
      return;
    }
    effect.SetResourceTexture2D("VignetteShape", vignette.shapePath);
    effect.SetResourceTexture2D("VignetteDetail", vignette.detailPath);
    effect.SetParameter("VignetteDetailSize", [ vignette.detail1Size[0], vignette.detail1Size[1], vignette.detail2Size[0], vignette.detail2Size[1] ]);
    effect.SetParameter("VignetteDetailScroll", [ vignette.detail1Scroll[0], vignette.detail1Scroll[1], vignette.detail2Scroll[0], vignette.detail2Scroll[1] ]);
    effect.SetParameter("VignetteColor", [ vignette.color[0], vignette.color[1], vignette.color[2], vignette.color[3] ]);
    effect.SetParameter("VignetteIntensity", [ vignette.intensity, vignette.opacity ]);
    effect.SetParameter("VignetteSineFrequency", vignette.sineFrequency);
    effect.SetParameter("VignetteSineRange", [ vignette.sineMinimum, vignette.sineMaximum ]);
    effect.SetOption("VIGNETTE_TOGGLE", "VIGNETTE_ENABLED");
  }

  /** Tonemapping::ApplyDesatureate (cpp:389-400); Carbon's spelling is its own. */
  static applyDesaturate(desaturate, effect)
  {
    if (!desaturate)
    {
      effect.SetOption("DESATURATE_TOGGLE", "DESATURATE_DISABLED");
      return;
    }
    effect.SetParameter("SaturationFactor", desaturate.intensity);
    effect.SetOption("DESATURATE_TOGGLE", "DESATURATE_ENABLED");
  }

  /** Tonemapping::ApplyFade (cpp:402-413). */
  static applyFade(fade, effect)
  {
    if (!fade)
    {
      effect.SetParameter("FadeAmount", 0);
      return;
    }
    effect.SetParameter("FadeColor", [ fade.color[0], fade.color[1], fade.color[2], fade.color[3] ]);
    effect.SetParameter("FadeAmount", fade.intensity);
  }

  /** Tonemapping::ApplyLuts (cpp:415-431). */
  static applyLuts(luts, effect)
  {
    if (!luts.length)
    {
      effect.SetOption("LUT_TOGGLE", "LUT_DISABLED");
      return;
    }
    effect.SetOption("LUT_TOGGLE", "LUT_ENABLED");
    for (let i = 0; i < MAX_LUTS; i++)
    {
      effect.SetParameter(`LUTInfluence_${i}`, i < luts.length ? luts[i].influence : 0);
      effect.SetResourceTexture2D(`TexLUT_${i}`, i < luts.length ? luts[i].path : "");
    }
  }

  /**
   * Tonemapping::ApplyAcesTonemappingMethod (cpp:433-485). The matrices are
   * built in Carbon's row-major memory with an explicit row-by-column product,
   * which is what Carbon's `Matrix * Matrix` computes, so no operand order is
   * translated.
   */
  static applyAcesTonemappingMethod(tonemapping, effect)
  {
    effect.SetOption("TONE_MAPPING_METHOD", "TONE_MAPPING_ACES");
    effect.SetOption("SWEETENER_TOGGLE", tonemapping.useSweeteners ? "SWEETENER_ENABLED" : "SWEETENER_DISABLED");
    effect.SetParameter("AcesSlope", tonemapping.slope);
    effect.SetParameter("AcesToe", tonemapping.toe);
    effect.SetParameter("AcesShoulder", tonemapping.shoulder);
    effect.SetParameter("AcesBlackClip", tonemapping.blackClip);
    effect.SetParameter("AcesWhiteClip", tonemapping.whiteClip);

    const acesInputMat = transposeRowMajor([
      0.59719, 0.35458, 0.04823, 0, 0.07600, 0.90834, 0.01566, 0, 0.02840, 0.13383, 0.83777, 0, 0, 0, 0, 1
    ]);
    const acesOutputMat = transposeRowMajor([
      1.60475, -0.53108, -0.07367, 0, -0.10208, 1.10813, -0.00605, 0, -0.00327, -0.07276, 1.07602, 0, 0, 0, 0, 1
    ]);
    const blueCorrect = [
      0.9404372683, -0.0183068787, 0.0778696104, 0, 0.0083786969, 0.8286599939, 0.1629613092, 0, 0.0005471261, -0.0008833746, 1.0003362486, 0, 0, 0, 0, 1
    ];
    const blueCorrectInv = [
      1.06318, 0.0233956, -0.0865726, 0, -0.0106337, 1.20632, -0.19569, 0, -0.000590887, 0.00105248, 0.999538, 0, 0, 0, 0, 1
    ];
    const blueCorrection = transposeRowMajor(lerpRowsToIdentity(blueCorrect, tonemapping.blueCorrection));
    const blueCorrectionInv = transposeRowMajor(lerpRowsToIdentity(blueCorrectInv, tonemapping.blueCorrection));
    const s = tonemapping.scale;
    const scale = [ s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1 ];

    const input = transposeRowMajor(multiplyRowMajor(multiplyRowMajor(acesInputMat, blueCorrection), scale));
    const output = transposeRowMajor(multiplyRowMajor(blueCorrectionInv, acesOutputMat));

    effect.SetParameter("AcesInputMat", Float32Array.from(input));
    effect.SetParameter("AcesOutputMat", Float32Array.from(output));
  }

  /** Tonemapping::ApplyAgxTonemappingMethod (cpp:487-490). */
  static applyAgxTonemappingMethod(effect)
  {
    effect.SetOption("TONE_MAPPING_METHOD", "TONE_MAPPING_AGX");
  }

  /** Tonemapping::ApplyUncharted2TonemappingMethod (cpp:492-503). */
  static applyUncharted2TonemappingMethod(tonemapping, effect)
  {
    effect.SetOption("TONE_MAPPING_METHOD", "TONE_MAPPING_UNCHARTED2");
    effect.SetParameter("ShoulderStrength", tonemapping.shoulderStrength);
    effect.SetParameter("LinearStrength", tonemapping.linearStrength);
    effect.SetParameter("LinearAngle", tonemapping.linearAngle);
    effect.SetParameter("ToeStrength", tonemapping.toeStrength);
    effect.SetParameter("ToeNumerator", tonemapping.toeNumerator);
    effect.SetParameter("ToeDenominator", tonemapping.toeDenominator);
    effect.SetParameter("WhiteScale", tonemapping.whiteScale);
  }

  /** Tonemapping::ApplyNoTonemappingMethod (cpp:505-508). */
  static applyNoTonemappingMethod(effect)
  {
    effect.SetOption("TONE_MAPPING_METHOD", "TONE_MAPPING_DISABLED");
  }

  /** Frees a handle that still holds a resource, and answers null for reassignment. */
  static _release(gpuResourcePool, handle)
  {
    if (handle?.IsValid()) gpuResourcePool.Free(handle);
    return null;
  }

  /** The film grain shader, with its noise texture (cpp:620-624). */
  static _createGrainShader()
  {
    const effect = new Tr2Effect();

    effect.StartUpdate();
    effect.SetEffectPathName(PostProcessEffectPaths.FilmGrain);
    effect.AddResourceTexture2D("NoiseTexture", "res:/texture/global/film_grain_noise.png");
    effect.EndUpdate();
    return effect;
  }

  static BloomDebugMode = BloomDebugMode;

  static Quality = Quality;

}

/** Carbon's `Transpose( Matrix )` on row-major memory. */
function transposeRowMajor(m)
{
  const out = new Array(16);
  for (let row = 0; row < 4; row++)
  {
    for (let column = 0; column < 4; column++) out[column * 4 + row] = m[row * 4 + column];
  }
  return out;
}

/** Carbon's `Matrix * Matrix` on row-major memory: out[r][c] = sum a[r][k] * b[k][c]. */
function multiplyRowMajor(a, b)
{
  const out = new Array(16).fill(0);
  for (let row = 0; row < 4; row++)
  {
    for (let column = 0; column < 4; column++)
    {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[row * 4 + k] * b[k * 4 + column];
      out[row * 4 + column] = sum;
    }
  }
  return out;
}

/**
 * The blue-correction rows lerped from identity by `amount`, as a row-major
 * matrix with identity fourth row and column (cpp:462-478).
 */
function lerpRowsToIdentity(m, amount)
{
  const out = [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1 ];
  for (let row = 0; row < 3; row++)
  {
    for (let column = 0; column < 3; column++)
    {
      const identity = row === column ? 1 : 0;
      out[row * 4 + column] = identity + (m[row * 4 + column] - identity) * amount;
    }
  }
  return out;
}

// Carbon gives this a chooser (Tr2PostProcessRenderer_Blue.cpp:9) but never
// registers it, so it takes no exposure metadata.
blue.enums.RegisterEnum("trinity.Tr2PostProcessRenderer.BloomDebugMode", BloomDebugMode, {
  source: "trinity/trinity/PostProcess/Tr2PostProcessRenderer.h", family: "postProcess", line: 112,
  chooserSource: "trinity/trinity/PostProcess/Tr2PostProcessRenderer_Blue.cpp:9",
  chooser: [
    { name: "None", value: BloomDebugMode.BLOOM_DEBUG_NONE, description: "No Debug" },
    { name: "All", value: BloomDebugMode.BLOOM_DEBUG_ALL, description: "Show all steps" },
    { name: "Step1", value: BloomDebugMode.BLOOM_DEBUG_STEP1, description: "Show step 1" },
    { name: "Step2", value: BloomDebugMode.BLOOM_DEBUG_STEP2, description: "Show step 2" },
    { name: "Step3", value: BloomDebugMode.BLOOM_DEBUG_STEP3, description: "Show step 3" },
    { name: "Step4", value: BloomDebugMode.BLOOM_DEBUG_STEP4, description: "Show step 4" },
    { name: "Step5", value: BloomDebugMode.BLOOM_DEBUG_STEP5, description: "Show step 5" },
    { name: "Step6", value: BloomDebugMode.BLOOM_DEBUG_STEP6, description: "Show step 6" }
  ]
});
