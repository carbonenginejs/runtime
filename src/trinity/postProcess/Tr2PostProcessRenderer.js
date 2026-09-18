// Carbon source: trinity/trinity/PostProcess/Tr2PostProcessRenderer.h
// Carbon source: trinity/trinity/PostProcess/Tr2PostProcessRenderer.cpp
// Carbon source: trinity/trinity/PostProcess/Tr2PostProcessRenderer_Blue.cpp
import { carbon, impl, edit, type } from "#schema";
import { CjsModel } from "#model";
import { BloomDebugMode, Quality } from "../generated/postProcess/enums.js";


/**
 * Carbon's post-process renderer settings and physical execution obligation.
 */
@type.define({ className: "Tr2PostProcessRenderer", family: "postProcess" })
export class Tr2PostProcessRenderer extends CjsModel
{
  @edit.notify
  @edit.readwrite
  @type.int32
  @type.enum("BloomDebugMode")
  bloomDebugMode = BloomDebugMode.BLOOM_DEBUG_NONE;

  @edit.notify
  @edit.readwrite
  @type.int32
  @type.enum("Quality")
  quality = Quality.HIGH;

  @edit.readwrite
  @type.objectRef("Tr2Effect")
  dynamicExposureToTextureShader = null;

  @edit.readwrite
  @type.objectRef("Tr2Effect")
  bloomHighPassFilter = null;

  @edit.readwrite
  @type.objectRef("Tr2Effect")
  bloomDebugShader = null;

  @edit.readwrite
  @type.objectRef("Tr2Effect")
  depthOfFieldBokehBlurShader = null;

  @edit.readwrite
  @type.objectRef("Tr2Effect")
  depthOfFieldBokehFillShader = null;

  @edit.readwrite
  @type.objectRef("Tr2Effect")
  dynamicExposureCreateHistogramShader = null;

  @edit.readwrite
  @type.objectRef("Tr2Effect")
  depthOfFieldCoCShader = null;

  @edit.readwrite
  @type.objectRef("Tr2Effect")
  fogColorEffect = null;

  @edit.readwrite
  @type.objectRef("Tr2Effect")
  fogCompositeEffect = null;

  @edit.readwrite
  @type.objectRef("Tr2Effect")
  godrayEffect = null;

  @edit.readwrite
  @type.objectRef("Tr2Effect")
  dynamicExposureMeasureExposureShader = null;

  @edit.readwrite
  @type.objectRef("Tr2Effect")
  dynamicExposureMergeHistogramShader = null;

  @edit.readwrite
  @type.objectRef("Tr2Effect")
  signalLossEffect = null;

  @edit.readwrite
  @type.objectRef("Tr2Effect")
  taaEffect = null;

  @edit.readwrite
  @type.objectRef("Tr2Effect")
  tonemappingEffect = null;

  @edit.notify
  @edit.readwrite
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
   * @throws {Error} Not ported yet; Carbon implements this on the class itself.
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
    throw new Error("Tr2PostProcessRenderer.Execute is not ported yet.");
  }

  static BloomDebugMode = BloomDebugMode;

  static Quality = Quality;

}
