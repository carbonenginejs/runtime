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
  TextureType,
  Tr2CpuUsage,
  Tr2GpuUsage,
  Tr2LoadAction,
  Tr2StoreAction,
  UpscalingTechnique
} from "#consts/render-context";
import { RenderingMode } from "#consts/graphics";
import { Tr2Effect } from "../shader/Tr2Effect.js";
import { Tr2Renderer } from "../core/Tr2Renderer.js";
import { EveSpaceScene } from "../eve/scene/EveSpaceScene.js";
import { Tr2PPTonemappingEffect } from "./effect/Tr2PPTonemappingEffect.js";
import "./effect/Tr2PPEffect.js";

const EFFECTS = "res:/Graphics/Effect/Managed/Space/PostProcess/";

/** `RENDER_TARGET` in Carbon's anonymous namespace (cpp:150). */
const RENDER_TARGET = Tr2GpuUsage.RENDER_TARGET | Tr2GpuUsage.SHADER_RESOURCE;

/** `MAX_LUTS` (Tr2PostProcessRenderer.h). */
const MAX_LUTS = 4;

/** Carbon's thread-group edge for the CAS dispatch (cpp:865). */
const CAS_THREAD_GROUP_WORK_REGION_DIM = 16;

/** Builds one effect pointed at its path, with options set inside Start/EndUpdate. */
function effectAt(name, options = null)
{
  const effect = new Tr2Effect();

  if (!options)
  {
    effect.SetEffectPathName(EFFECTS + name);
    return effect;
  }

  effect.StartUpdate();
  effect.SetEffectPathName(EFFECTS + name);
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
  tonemappingEffect = effectAt("ToneMapping.fx");

  _reactiveMaskEffect = effectAt("ReactiveMask.fx");

  _transparencyMaskEffect = effectAt("TransparencyMask.fx");

  @edit.readwrite
  @type.objectRef("Tr2Effect")
  bloomHighPassFilter = effectAt("HighPassFilter.fx");

  _downSamplerLuminancePreserve = effectAt("Downsample.fx", { LUNINANCE_PRESERVE: "LUNINANCE_PRESERVE_ON" });

  _downSampler = effectAt("Downsample.fx", { LUNINANCE_PRESERVE: "LUNINANCE_PRESERVE_OFF" });

  _upsamplerHorizontal = effectAt("Upsample.fx");

  _upsamplerVertical = effectAt("Upsample.fx", { UPSAMPLING_STEP: "UPSAMPLING_STEP_SECOND" });

  @edit.readwrite
  @type.objectRef("Tr2Effect")
  dynamicExposureToTextureShader = effectAt("ExposureToTexture.fx");

  @edit.readwrite
  @type.objectRef("Tr2Effect")
  dynamicExposureCreateHistogramShader = effectAt("CreateHistograms.fx");

  @edit.readwrite
  @type.objectRef("Tr2Effect")
  dynamicExposureMergeHistogramShader = effectAt("MergeHistograms.fx");

  @edit.readwrite
  @type.objectRef("Tr2Effect")
  dynamicExposureMeasureExposureShader = effectAt("MeasureExposure.fx");

  _fidelityFxCasShader = effectAt("CAS.fx");

  _downsampleDepthEffect = effectAt("DownsampleDepth.fx");

  @edit.readwrite
  @type.objectRef("Tr2Effect")
  fogColorEffect = effectAt("EnvironmentFogColor.fx");

  @edit.readwrite
  @type.objectRef("Tr2Effect")
  fogCompositeEffect = effectAt("EnvironmentFogComposit.fx");

  @edit.readwrite
  @type.objectRef("Tr2Effect")
  depthOfFieldBokehBlurShader = effectAt("Bokeh.fx", { BOKEH_PIXEL_METHOD: "BOKEH_PIXEL_AVERAGE" });

  @edit.readwrite
  @type.objectRef("Tr2Effect")
  depthOfFieldBokehFillShader = effectAt("Bokeh.fx", { BOKEH_PIXEL_METHOD: "BOKEH_PIXEL_MAX" });

  _depthOfFieldBokehTAAShader = effectAt("BokehTAA.fx");

  @edit.readwrite
  @type.objectRef("Tr2Effect")
  depthOfFieldCoCShader = effectAt("CircleOfConfusion.fx");

  @edit.readwrite
  @type.objectRef("Tr2Effect")
  godrayEffect = effectAt("Godrays.fx");

  @edit.readwrite
  @type.objectRef("Tr2Effect")
  signalLossEffect = effectAt("SignalLoss.fx");

  _grainShader = Tr2PostProcessRenderer._createGrainShader();

  @edit.readwrite
  @type.objectRef("Tr2Effect")
  taaEffect = effectAt("TAA.fx");

  _taaCopyEffect = effectAt("TAACopy.fx");

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
        if (fog) this.RenderFog(nonMsaaSource.Get(), source, gpuResourcePool, renderContext, fog);
      }
      sourceBuffer = release(sourceBuffer);

      if (postProcess)
      {
        const godrays = postProcess.GetGodRaysIfAvailable(this.quality);
        if (godrays) this.RenderGodRays(nonMsaaSource.Get(), depthMap?.Get() ?? null, gpuResourcePool, renderContext, godrays);

        const dof = postProcess.GetDepthOfFieldIfAvailable(this.quality);
        if (dof)
        {
          const temporal = upscalingInfo.temporal || postProcess.GetTaaIfAvailable(this.quality) !== null;
          this.RenderDepthOfField(nonMsaaSource.Get(), gpuResourcePool, renderContext, dof, temporal, upscalingInfo.upscalingAmount);
        }

        dynamicExposure = postProcess.GetDynamicExposureIfAvailable(this.quality);
        const taa = postProcess.GetTaaIfAvailable(this.quality);

        if (taa && !upscalingInfo.temporal)
        {
          this.RenderTaa(nonMsaaSource.Get(), velocity?.Get() ?? null, opaqueColor?.Get() ?? null, gpuResourcePool, renderContext, taa, dynamicExposure);
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
          bloomTexture = this.RenderBloom(upscaledSource, gpuResourcePool, renderContext, bloom, dynamicExposure);
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

  /** Carbon RenderBloom (cpp:957-1113). */
  @carbon.method
  @impl.notImplemented
  RenderBloom()
  {
    throw new Error("Tr2PostProcessRenderer.RenderBloom is not ported yet.");
  }

  /** Carbon RenderGodRays (cpp:1146-1171). */
  @carbon.method
  @impl.notImplemented
  RenderGodRays()
  {
    throw new Error("Tr2PostProcessRenderer.RenderGodRays is not ported yet.");
  }

  /** Carbon RenderDynamicExposure (cpp:1182-1241). */
  @carbon.method
  @impl.notImplemented
  RenderDynamicExposure()
  {
    throw new Error("Tr2PostProcessRenderer.RenderDynamicExposure is not ported yet.");
  }

  /** Carbon RenderUpscaling (cpp:1287-1390). */
  @carbon.method
  @impl.notImplemented
  RenderUpscaling()
  {
    throw new Error("Tr2PostProcessRenderer.RenderUpscaling is not ported yet.");
  }

  /** Carbon RenderFog (cpp:1406-1433). */
  @carbon.method
  @impl.notImplemented
  RenderFog()
  {
    throw new Error("Tr2PostProcessRenderer.RenderFog is not ported yet.");
  }

  /** Carbon RenderTaa (cpp:1435-1529). */
  @carbon.method
  @impl.notImplemented
  RenderTaa()
  {
    throw new Error("Tr2PostProcessRenderer.RenderTaa is not ported yet.");
  }

  /** Carbon RenderDepthOfField (cpp:1598-1698). */
  @carbon.method
  @impl.notImplemented
  RenderDepthOfField()
  {
    throw new Error("Tr2PostProcessRenderer.RenderDepthOfField is not ported yet.");
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
    effect.SetEffectPathName(EFFECTS + "FilmGrain.fx");
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
