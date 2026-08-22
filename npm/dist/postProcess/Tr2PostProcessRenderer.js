import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { BloomDebugMode, Quality } from '../generated/postProcess/enums.js';

let _initProto, _initClass, _init_bloomDebugMode, _init_extra_bloomDebugMode, _init_quality, _init_extra_quality, _init_dynamicExposureToTextureShader, _init_extra_dynamicExposureToTextureShader, _init_bloomHighPassFilter, _init_extra_bloomHighPassFilter, _init_bloomDebugShader, _init_extra_bloomDebugShader, _init_depthOfFieldBokehBlurShader, _init_extra_depthOfFieldBokehBlurShader, _init_depthOfFieldBokehFillShader, _init_extra_depthOfFieldBokehFillShader, _init_dynamicExposureCreateHistogramShader, _init_extra_dynamicExposureCreateHistogramShader, _init_depthOfFieldCoCShader, _init_extra_depthOfFieldCoCShader, _init_fogColorEffect, _init_extra_fogColorEffect, _init_fogCompositeEffect, _init_extra_fogCompositeEffect, _init_godrayEffect, _init_extra_godrayEffect, _init_dynamicExposureMeasureExposureShader, _init_extra_dynamicExposureMeasureExposureShader, _init_dynamicExposureMergeHistogramShader, _init_extra_dynamicExposureMergeHistogramShader, _init_signalLossEffect, _init_extra_signalLossEffect, _init_taaEffect, _init_extra_taaEffect, _init_tonemappingEffect, _init_extra_tonemappingEffect, _init_useNewBloom, _init_extra_useNewBloom;

/**
 * Carbon's post-process renderer settings and physical execution obligation.
 */
let _Tr2PostProcessRender;
new class extends _identity {
  static [class Tr2PostProcessRenderer extends CjsModel {
    static {
      ({
        e: [_init_bloomDebugMode, _init_extra_bloomDebugMode, _init_quality, _init_extra_quality, _init_dynamicExposureToTextureShader, _init_extra_dynamicExposureToTextureShader, _init_bloomHighPassFilter, _init_extra_bloomHighPassFilter, _init_bloomDebugShader, _init_extra_bloomDebugShader, _init_depthOfFieldBokehBlurShader, _init_extra_depthOfFieldBokehBlurShader, _init_depthOfFieldBokehFillShader, _init_extra_depthOfFieldBokehFillShader, _init_dynamicExposureCreateHistogramShader, _init_extra_dynamicExposureCreateHistogramShader, _init_depthOfFieldCoCShader, _init_extra_depthOfFieldCoCShader, _init_fogColorEffect, _init_extra_fogColorEffect, _init_fogCompositeEffect, _init_extra_fogCompositeEffect, _init_godrayEffect, _init_extra_godrayEffect, _init_dynamicExposureMeasureExposureShader, _init_extra_dynamicExposureMeasureExposureShader, _init_dynamicExposureMergeHistogramShader, _init_extra_dynamicExposureMergeHistogramShader, _init_signalLossEffect, _init_extra_signalLossEffect, _init_taaEffect, _init_extra_taaEffect, _init_tonemappingEffect, _init_extra_tonemappingEffect, _init_useNewBloom, _init_extra_useNewBloom, _initProto],
        c: [_Tr2PostProcessRender, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2PostProcessRenderer",
        family: "postProcess"
      })], [[[io, io.notify, io, io.readwrite, type, type.int32, void 0, type.enum("BloomDebugMode")], 16, "bloomDebugMode"], [[io, io.notify, io, io.readwrite, type, type.int32, void 0, type.enum("Quality")], 16, "quality"], [[io, io.readwrite, void 0, type.objectRef("Tr2Effect")], 16, "dynamicExposureToTextureShader"], [[io, io.readwrite, void 0, type.objectRef("Tr2Effect")], 16, "bloomHighPassFilter"], [[io, io.readwrite, void 0, type.objectRef("Tr2Effect")], 16, "bloomDebugShader"], [[io, io.readwrite, void 0, type.objectRef("Tr2Effect")], 16, "depthOfFieldBokehBlurShader"], [[io, io.readwrite, void 0, type.objectRef("Tr2Effect")], 16, "depthOfFieldBokehFillShader"], [[io, io.readwrite, void 0, type.objectRef("Tr2Effect")], 16, "dynamicExposureCreateHistogramShader"], [[io, io.readwrite, void 0, type.objectRef("Tr2Effect")], 16, "depthOfFieldCoCShader"], [[io, io.readwrite, void 0, type.objectRef("Tr2Effect")], 16, "fogColorEffect"], [[io, io.readwrite, void 0, type.objectRef("Tr2Effect")], 16, "fogCompositeEffect"], [[io, io.readwrite, void 0, type.objectRef("Tr2Effect")], 16, "godrayEffect"], [[io, io.readwrite, void 0, type.objectRef("Tr2Effect")], 16, "dynamicExposureMeasureExposureShader"], [[io, io.readwrite, void 0, type.objectRef("Tr2Effect")], 16, "dynamicExposureMergeHistogramShader"], [[io, io.readwrite, void 0, type.objectRef("Tr2Effect")], 16, "signalLossEffect"], [[io, io.readwrite, void 0, type.objectRef("Tr2Effect")], 16, "taaEffect"], [[io, io.readwrite, void 0, type.objectRef("Tr2Effect")], 16, "tonemappingEffect"], [[io, io.notify, io, io.readwrite, type, type.boolean], 16, "useNewBloom"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetPostProcessingQuality"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetPostProcessingQuality"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "Execute"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_useNewBloom(this);
    }
    bloomDebugMode = (_initProto(this), _init_bloomDebugMode(this, BloomDebugMode.BLOOM_DEBUG_NONE));
    quality = (_init_extra_bloomDebugMode(this), _init_quality(this, Quality.HIGH));
    dynamicExposureToTextureShader = (_init_extra_quality(this), _init_dynamicExposureToTextureShader(this, null));
    bloomHighPassFilter = (_init_extra_dynamicExposureToTextureShader(this), _init_bloomHighPassFilter(this, null));
    bloomDebugShader = (_init_extra_bloomHighPassFilter(this), _init_bloomDebugShader(this, null));
    depthOfFieldBokehBlurShader = (_init_extra_bloomDebugShader(this), _init_depthOfFieldBokehBlurShader(this, null));
    depthOfFieldBokehFillShader = (_init_extra_depthOfFieldBokehBlurShader(this), _init_depthOfFieldBokehFillShader(this, null));
    dynamicExposureCreateHistogramShader = (_init_extra_depthOfFieldBokehFillShader(this), _init_dynamicExposureCreateHistogramShader(this, null));
    depthOfFieldCoCShader = (_init_extra_dynamicExposureCreateHistogramShader(this), _init_depthOfFieldCoCShader(this, null));
    fogColorEffect = (_init_extra_depthOfFieldCoCShader(this), _init_fogColorEffect(this, null));
    fogCompositeEffect = (_init_extra_fogColorEffect(this), _init_fogCompositeEffect(this, null));
    godrayEffect = (_init_extra_fogCompositeEffect(this), _init_godrayEffect(this, null));
    dynamicExposureMeasureExposureShader = (_init_extra_godrayEffect(this), _init_dynamicExposureMeasureExposureShader(this, null));
    dynamicExposureMergeHistogramShader = (_init_extra_dynamicExposureMeasureExposureShader(this), _init_dynamicExposureMergeHistogramShader(this, null));
    signalLossEffect = (_init_extra_dynamicExposureMergeHistogramShader(this), _init_signalLossEffect(this, null));
    taaEffect = (_init_extra_signalLossEffect(this), _init_taaEffect(this, null));
    tonemappingEffect = (_init_extra_taaEffect(this), _init_tonemappingEffect(this, null));
    useNewBloom = (_init_extra_tonemappingEffect(this), _init_useNewBloom(this, false));

    /** Returns the active Carbon post-process quality. */
    GetPostProcessingQuality() {
      return this.quality;
    }

    /** Selects the active Carbon post-process quality. */
    SetPostProcessingQuality(quality) {
      this.quality = quality;
    }

    /**
     * Executes the physical post-process chain.
     *
     * @throws {Error} Until an engine-owned realization contract is installed.
     */
    Execute(_destination, _source, _depthMap, _velocity, _opaqueColor, _scene, _upscalingContext, _gpuResourcePool, _renderContext) {
      throw new Error("Tr2PostProcessRenderer.Execute requires an engine-owned post-process realization contract");
    }
  }];
  BloomDebugMode = BloomDebugMode;
  Quality = Quality;
  constructor() {
    super(_Tr2PostProcessRender), _initClass();
  }
}();

export { _Tr2PostProcessRender as Tr2PostProcessRenderer };
//# sourceMappingURL=Tr2PostProcessRenderer.js.map
