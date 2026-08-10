import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { BloomDebugMode, Quality } from './enums.js';

let _initClass, _init_bloomDebugMode, _init_extra_bloomDebugMode, _init_quality, _init_extra_quality, _init_dynamicExposureToTextureShader, _init_extra_dynamicExposureToTextureShader, _init_bloomHighPassFilter, _init_extra_bloomHighPassFilter, _init_bloomDebugShader, _init_extra_bloomDebugShader, _init_depthOfFieldBokehBlurShader, _init_extra_depthOfFieldBokehBlurShader, _init_depthOfFieldBokehFillShader, _init_extra_depthOfFieldBokehFillShader, _init_dynamicExposureCreateHistogramShader, _init_extra_dynamicExposureCreateHistogramShader, _init_depthOfFieldCoCShader, _init_extra_depthOfFieldCoCShader, _init_fogColorEffect, _init_extra_fogColorEffect, _init_fogCompositeEffect, _init_extra_fogCompositeEffect, _init_godrayEffect, _init_extra_godrayEffect, _init_dynamicExposureMeasureExposureShader, _init_extra_dynamicExposureMeasureExposureShader, _init_dynamicExposureMergeHistogramShader, _init_extra_dynamicExposureMergeHistogramShader, _init_signalLossEffect, _init_extra_signalLossEffect, _init_taaEffect, _init_extra_taaEffect, _init_tonemappingEffect, _init_extra_tonemappingEffect, _init_useNewBloom, _init_extra_useNewBloom;

/** Tr2PostProcessRenderer (postProcess) - generated from schema shapeHash 5a5a162e.... */
let _Tr2PostProcessRender;
new class extends _identity {
  static [class Tr2PostProcessRenderer extends CjsModel {
    static {
      ({
        e: [_init_bloomDebugMode, _init_extra_bloomDebugMode, _init_quality, _init_extra_quality, _init_dynamicExposureToTextureShader, _init_extra_dynamicExposureToTextureShader, _init_bloomHighPassFilter, _init_extra_bloomHighPassFilter, _init_bloomDebugShader, _init_extra_bloomDebugShader, _init_depthOfFieldBokehBlurShader, _init_extra_depthOfFieldBokehBlurShader, _init_depthOfFieldBokehFillShader, _init_extra_depthOfFieldBokehFillShader, _init_dynamicExposureCreateHistogramShader, _init_extra_dynamicExposureCreateHistogramShader, _init_depthOfFieldCoCShader, _init_extra_depthOfFieldCoCShader, _init_fogColorEffect, _init_extra_fogColorEffect, _init_fogCompositeEffect, _init_extra_fogCompositeEffect, _init_godrayEffect, _init_extra_godrayEffect, _init_dynamicExposureMeasureExposureShader, _init_extra_dynamicExposureMeasureExposureShader, _init_dynamicExposureMergeHistogramShader, _init_extra_dynamicExposureMergeHistogramShader, _init_signalLossEffect, _init_extra_signalLossEffect, _init_taaEffect, _init_extra_taaEffect, _init_tonemappingEffect, _init_extra_tonemappingEffect, _init_useNewBloom, _init_extra_useNewBloom],
        c: [_Tr2PostProcessRender, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2PostProcessRenderer",
        family: "postProcess"
      })], [[[io, io.notify, io, io.readwrite, type, type.int32, void 0, type.enum("BloomDebugMode")], 16, "bloomDebugMode"], [[io, io.notify, io, io.readwrite, type, type.int32, void 0, type.enum("Quality")], 16, "quality"], [[io, io.readwrite, void 0, type.objectRef("Tr2Effect")], 16, "dynamicExposureToTextureShader"], [[io, io.readwrite, void 0, type.objectRef("Tr2Effect")], 16, "bloomHighPassFilter"], [[io, io.readwrite, void 0, type.objectRef("Tr2Effect")], 16, "bloomDebugShader"], [[io, io.readwrite, void 0, type.objectRef("Tr2Effect")], 16, "depthOfFieldBokehBlurShader"], [[io, io.readwrite, void 0, type.objectRef("Tr2Effect")], 16, "depthOfFieldBokehFillShader"], [[io, io.readwrite, void 0, type.objectRef("Tr2Effect")], 16, "dynamicExposureCreateHistogramShader"], [[io, io.readwrite, void 0, type.objectRef("Tr2Effect")], 16, "depthOfFieldCoCShader"], [[io, io.readwrite, void 0, type.objectRef("Tr2Effect")], 16, "fogColorEffect"], [[io, io.readwrite, void 0, type.objectRef("Tr2Effect")], 16, "fogCompositeEffect"], [[io, io.readwrite, void 0, type.objectRef("Tr2Effect")], 16, "godrayEffect"], [[io, io.readwrite, void 0, type.objectRef("Tr2Effect")], 16, "dynamicExposureMeasureExposureShader"], [[io, io.readwrite, void 0, type.objectRef("Tr2Effect")], 16, "dynamicExposureMergeHistogramShader"], [[io, io.readwrite, void 0, type.objectRef("Tr2Effect")], 16, "signalLossEffect"], [[io, io.readwrite, void 0, type.objectRef("Tr2Effect")], 16, "taaEffect"], [[io, io.readwrite, void 0, type.objectRef("Tr2Effect")], 16, "tonemappingEffect"], [[io, io.notify, io, io.readwrite, type, type.boolean], 16, "useNewBloom"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_useNewBloom(this);
    }
    /** m_bloomDebugMode (BloomDebugMode - enum BloomDebugMode) [READWRITE, NOTIFY, ENUM] */
    bloomDebugMode = _init_bloomDebugMode(this, 0);

    /** m_quality (PostProcess::Quality - enum Quality) [READWRITE, ENUM, NOTIFY] */
    quality = (_init_extra_bloomDebugMode(this), _init_quality(this, 2));

    /** m_dynamicExposureToTextureShader (Tr2EffectPtr) [READWRITE] */
    dynamicExposureToTextureShader = (_init_extra_quality(this), _init_dynamicExposureToTextureShader(this, null));

    /** m_bloomHighPassFilter (Tr2EffectPtr) [READWRITE] */
    bloomHighPassFilter = (_init_extra_dynamicExposureToTextureShader(this), _init_bloomHighPassFilter(this, null));

    /** m_bloomDebugShader (Tr2EffectPtr) [READWRITE] */
    bloomDebugShader = (_init_extra_bloomHighPassFilter(this), _init_bloomDebugShader(this, null));

    /** m_depthOfFieldBokehBlurShader (Tr2EffectPtr) [READWRITE] */
    depthOfFieldBokehBlurShader = (_init_extra_bloomDebugShader(this), _init_depthOfFieldBokehBlurShader(this, null));

    /** m_depthOfFieldBokehFillShader (Tr2EffectPtr) [READWRITE] */
    depthOfFieldBokehFillShader = (_init_extra_depthOfFieldBokehBlurShader(this), _init_depthOfFieldBokehFillShader(this, null));

    /** m_dynamicExposureCreateHistogramShader (Tr2EffectPtr) [READWRITE] */
    dynamicExposureCreateHistogramShader = (_init_extra_depthOfFieldBokehFillShader(this), _init_dynamicExposureCreateHistogramShader(this, null));

    /** m_depthOfFieldCoCShader (Tr2EffectPtr) [READWRITE] */
    depthOfFieldCoCShader = (_init_extra_dynamicExposureCreateHistogramShader(this), _init_depthOfFieldCoCShader(this, null));

    /** m_fogColorEffect (Tr2EffectPtr) [READWRITE] */
    fogColorEffect = (_init_extra_depthOfFieldCoCShader(this), _init_fogColorEffect(this, null));

    /** m_fogCompositeEffect (Tr2EffectPtr) [READWRITE] */
    fogCompositeEffect = (_init_extra_fogColorEffect(this), _init_fogCompositeEffect(this, null));

    /** m_godrayEffect (Tr2EffectPtr) [READWRITE] */
    godrayEffect = (_init_extra_fogCompositeEffect(this), _init_godrayEffect(this, null));

    /** m_dynamicExposureMeasureExposureShader (Tr2EffectPtr) [READWRITE] */
    dynamicExposureMeasureExposureShader = (_init_extra_godrayEffect(this), _init_dynamicExposureMeasureExposureShader(this, null));

    /** m_dynamicExposureMergeHistogramShader (Tr2EffectPtr) [READWRITE] */
    dynamicExposureMergeHistogramShader = (_init_extra_dynamicExposureMeasureExposureShader(this), _init_dynamicExposureMergeHistogramShader(this, null));

    /** m_signalLossEffect (Tr2EffectPtr) [READWRITE] */
    signalLossEffect = (_init_extra_dynamicExposureMergeHistogramShader(this), _init_signalLossEffect(this, null));

    /** m_taaEffect (Tr2EffectPtr) [READWRITE] */
    taaEffect = (_init_extra_signalLossEffect(this), _init_taaEffect(this, null));

    /** m_tonemappingEffect (Tr2EffectPtr) [READWRITE] */
    tonemappingEffect = (_init_extra_taaEffect(this), _init_tonemappingEffect(this, null));

    /** m_useNewBloom (bool) [READWRITE, NOTIFY] */
    useNewBloom = (_init_extra_tonemappingEffect(this), _init_useNewBloom(this, false));
  }];
  BloomDebugMode = BloomDebugMode;
  Quality = Quality;
  constructor() {
    super(_Tr2PostProcessRender), _initClass();
  }
}();

export { _Tr2PostProcessRender as Tr2PostProcessRenderer };
//# sourceMappingURL=Tr2PostProcessRenderer.js.map
