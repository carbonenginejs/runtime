// Carbon source: trinity/trinity/PostProcess/Tr2PostProcessRenderer.h
// Carbon source: trinity/trinity/PostProcess/Tr2PostProcessRenderer.cpp
// Carbon source: trinity/trinity/PostProcess/Tr2PostProcessRenderer_Blue.cpp
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { BloomDebugMode, Quality } from "../generated/postProcess/enums.js";


/**
 * Carbon's post-process renderer settings and physical execution obligation.
 */
@type.define({ className: "Tr2PostProcessRenderer", family: "postProcess" })
export class Tr2PostProcessRenderer extends CjsModel
{
  @io.notify
  @io.readwrite
  @type.int32
  @type.enum("BloomDebugMode")
  bloomDebugMode = BloomDebugMode.BLOOM_DEBUG_NONE;

  @io.notify
  @io.readwrite
  @type.int32
  @type.enum("Quality")
  quality = Quality.HIGH;

  @io.readwrite
  @type.objectRef("Tr2Effect")
  dynamicExposureToTextureShader = null;

  @io.readwrite
  @type.objectRef("Tr2Effect")
  bloomHighPassFilter = null;

  @io.readwrite
  @type.objectRef("Tr2Effect")
  bloomDebugShader = null;

  @io.readwrite
  @type.objectRef("Tr2Effect")
  depthOfFieldBokehBlurShader = null;

  @io.readwrite
  @type.objectRef("Tr2Effect")
  depthOfFieldBokehFillShader = null;

  @io.readwrite
  @type.objectRef("Tr2Effect")
  dynamicExposureCreateHistogramShader = null;

  @io.readwrite
  @type.objectRef("Tr2Effect")
  depthOfFieldCoCShader = null;

  @io.readwrite
  @type.objectRef("Tr2Effect")
  fogColorEffect = null;

  @io.readwrite
  @type.objectRef("Tr2Effect")
  fogCompositeEffect = null;

  @io.readwrite
  @type.objectRef("Tr2Effect")
  godrayEffect = null;

  @io.readwrite
  @type.objectRef("Tr2Effect")
  dynamicExposureMeasureExposureShader = null;

  @io.readwrite
  @type.objectRef("Tr2Effect")
  dynamicExposureMergeHistogramShader = null;

  @io.readwrite
  @type.objectRef("Tr2Effect")
  signalLossEffect = null;

  @io.readwrite
  @type.objectRef("Tr2Effect")
  taaEffect = null;

  @io.readwrite
  @type.objectRef("Tr2Effect")
  tonemappingEffect = null;

  @io.notify
  @io.readwrite
  @type.boolean
  useNewBloom = false;

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
   * Executes the physical post-process chain.
   *
   * @throws {Error} Until an engine-owned realization contract is installed.
   */
  @carbon.method
  @impl.notImplemented
  Execute(
    _destination,
    _source,
    _depthMap,
    _velocity,
    _opaqueColor,
    _scene,
    _upscalingContext,
    _gpuResourcePool,
    _renderContext
  )
  {
    throw new Error("Tr2PostProcessRenderer.Execute requires an engine-owned post-process realization contract");
  }

  static BloomDebugMode = BloomDebugMode;

  static Quality = Quality;

}
