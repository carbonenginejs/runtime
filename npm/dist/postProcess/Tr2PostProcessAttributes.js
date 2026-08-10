import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec2 } from '@carbonenginejs/runtime-utils/vec2';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { Tr2PPBloomEffect as _Tr2PPBloomEffect } from './effect/Tr2PPBloomEffect.js';
import { Tr2PPColorCorrectionEffect as _Tr2PPColorCorrection } from './effect/Tr2PPColorCorrectionEffect.js';
import { Tr2PPDepthOfFieldEffect as _Tr2PPDepthOfFieldEff } from './effect/Tr2PPDepthOfFieldEffect.js';
import { Tr2PPDesaturateEffect as _Tr2PPDesaturateEffec } from './effect/Tr2PPDesaturateEffect.js';
import { Tr2PPFadeEffect as _Tr2PPFadeEffect } from './effect/Tr2PPFadeEffect.js';
import { Tr2PPFilmGrainEffect as _Tr2PPFilmGrainEffect } from './effect/Tr2PPFilmGrainEffect.js';
import { Tr2PPLutEffect as _Tr2PPLutEffect } from './effect/Tr2PPLutEffect.js';
import { Tr2PPSignalLossEffect as _Tr2PPSignalLossEffec } from './effect/Tr2PPSignalLossEffect.js';
import { Tr2PPVignetteEffect as _Tr2PPVignetteEffect } from './effect/Tr2PPVignetteEffect.js';
import { Priority, AttributeType } from '../generated/postProcess/enums.js';

let _initProto, _initClass, _init_priority, _init_extra_priority, _init_intensity, _init_extra_intensity, _init_signalLossIntensityEnabled, _init_extra_signalLossIntensityEnabled, _init_signalLossIntensity, _init_extra_signalLossIntensity, _init_bloomBrightnessEnabled, _init_extra_bloomBrightnessEnabled, _init_bloomBrightness, _init_extra_bloomBrightness, _init_bloomLuminanceThresholdEnabled, _init_extra_bloomLuminanceThresholdEnabled, _init_bloomLuminanceThreshold, _init_extra_bloomLuminanceThreshold, _init_bloomLuminanceScaleEnabled, _init_extra_bloomLuminanceScaleEnabled, _init_bloomLuminanceScale, _init_extra_bloomLuminanceScale, _init_bloomSizeScaleEnabled, _init_extra_bloomSizeScaleEnabled, _init_bloomSizeScale, _init_extra_bloomSizeScale, _init_bloomDirectionalWeightEnabled, _init_extra_bloomDirectionalWeightEnabled, _init_bloomDirectionalWeight, _init_extra_bloomDirectionalWeight, _init_bloomStepSize1Enabled, _init_extra_bloomStepSize1Enabled, _init_bloomStepSize, _init_extra_bloomStepSize, _init_bloomStepSize2Enabled, _init_extra_bloomStepSize2Enabled, _init_bloomStepSize2, _init_extra_bloomStepSize2, _init_bloomStepSize3Enabled, _init_extra_bloomStepSize3Enabled, _init_bloomStepSize3, _init_extra_bloomStepSize3, _init_bloomStepSize4Enabled, _init_extra_bloomStepSize4Enabled, _init_bloomStepSize4, _init_extra_bloomStepSize4, _init_bloomStepSize5Enabled, _init_extra_bloomStepSize5Enabled, _init_bloomStepSize5, _init_extra_bloomStepSize5, _init_bloomStepSize6Enabled, _init_extra_bloomStepSize6Enabled, _init_bloomStepSize6, _init_extra_bloomStepSize6, _init_bloomStepTint1Enabled, _init_extra_bloomStepTint1Enabled, _init_bloomStepTint, _init_extra_bloomStepTint, _init_bloomStepTint2Enabled, _init_extra_bloomStepTint2Enabled, _init_bloomStepTint2, _init_extra_bloomStepTint2, _init_bloomStepTint3Enabled, _init_extra_bloomStepTint3Enabled, _init_bloomStepTint3, _init_extra_bloomStepTint3, _init_bloomStepTint4Enabled, _init_extra_bloomStepTint4Enabled, _init_bloomStepTint4, _init_extra_bloomStepTint4, _init_bloomStepTint5Enabled, _init_extra_bloomStepTint5Enabled, _init_bloomStepTint5, _init_extra_bloomStepTint5, _init_bloomStepTint6Enabled, _init_extra_bloomStepTint6Enabled, _init_bloomStepTint6, _init_extra_bloomStepTint6, _init_grimeIntensityEnabled, _init_extra_grimeIntensityEnabled, _init_grimeIntensity, _init_extra_grimeIntensity, _init_grimePathEnabled, _init_extra_grimePathEnabled, _init_grimePath, _init_extra_grimePath, _init_exposureAdjustmentEnabled, _init_extra_exposureAdjustmentEnabled, _init_exposureAdjustment, _init_extra_exposureAdjustment, _init_filmGrainIntensityEnabled, _init_extra_filmGrainIntensityEnabled, _init_filmGrainIntensity, _init_extra_filmGrainIntensity, _init_filmGrainSizeEnabled, _init_extra_filmGrainSizeEnabled, _init_filmGrainSize, _init_extra_filmGrainSize, _init_filmGrainDensityEnabled, _init_extra_filmGrainDensityEnabled, _init_filmGrainDensity, _init_extra_filmGrainDensity, _init_filmGrainContrastEnabled, _init_extra_filmGrainContrastEnabled, _init_filmGrainContrast, _init_extra_filmGrainContrast, _init_filmGrainBrightnessModifierEnabled, _init_extra_filmGrainBrightnessModifierEnabled, _init_filmGrainBrightnessModifier, _init_extra_filmGrainBrightnessModifier, _init_filmGrainColoredEnabled, _init_extra_filmGrainColoredEnabled, _init_filmGrainColored, _init_extra_filmGrainColored, _init_filmGrainColorAmountEnabled, _init_extra_filmGrainColorAmountEnabled, _init_filmGrainColorAmount, _init_extra_filmGrainColorAmount, _init_saturationEnabled, _init_extra_saturationEnabled, _init_saturation, _init_extra_saturation, _init_fadeIntensityEnabled, _init_extra_fadeIntensityEnabled, _init_fadeIntensity, _init_extra_fadeIntensity, _init_fadeColorEnabled, _init_extra_fadeColorEnabled, _init_fadeColor, _init_extra_fadeColor, _init_lutIntensityEnabled, _init_extra_lutIntensityEnabled, _init_lutIntensity, _init_extra_lutIntensity, _init_lutPathEnabled, _init_extra_lutPathEnabled, _init_lutPath, _init_extra_lutPath, _init_vignetteIntensityEnabled, _init_extra_vignetteIntensityEnabled, _init_vignetteIntensity, _init_extra_vignetteIntensity, _init_vignetteOpacityEnabled, _init_extra_vignetteOpacityEnabled, _init_vignetteOpacity, _init_extra_vignetteOpacity, _init_vignetteColorEnabled, _init_extra_vignetteColorEnabled, _init_vignetteColor, _init_extra_vignetteColor, _init_vignetteDetail1SizeEnabled, _init_extra_vignetteDetail1SizeEnabled, _init_vignetteDetail1Size, _init_extra_vignetteDetail1Size, _init_vignetteDetail1ScrollEnabled, _init_extra_vignetteDetail1ScrollEnabled, _init_vignetteDetail1Scroll, _init_extra_vignetteDetail1Scroll, _init_vignetteDetail2SizeEnabled, _init_extra_vignetteDetail2SizeEnabled, _init_vignetteDetail2Size, _init_extra_vignetteDetail2Size, _init_vignetteDetail2ScrollEnabled, _init_extra_vignetteDetail2ScrollEnabled, _init_vignetteDetail2Scroll, _init_extra_vignetteDetail2Scroll, _init_vignetteShapePathEnabled, _init_extra_vignetteShapePathEnabled, _init_vignetteShapePath, _init_extra_vignetteShapePath, _init_vignetteDetailPathEnabled, _init_extra_vignetteDetailPathEnabled, _init_vignetteDetailPath, _init_extra_vignetteDetailPath, _init_vignetteSineFrequencyEnabled, _init_extra_vignetteSineFrequencyEnabled, _init_vignetteSineFrequency, _init_extra_vignetteSineFrequency, _init_vignetteMinSineFrequencyEnabled, _init_extra_vignetteMinSineFrequencyEnabled, _init_vignetteMinSineFrequency, _init_extra_vignetteMinSineFrequency, _init_vignetteMaxSineFrequencyEnabled, _init_extra_vignetteMaxSineFrequencyEnabled, _init_vignetteMaxSineFrequency, _init_extra_vignetteMaxSineFrequency, _init_depthOfFieldScaleEnabled, _init_extra_depthOfFieldScaleEnabled, _init_depthOfFieldScale, _init_extra_depthOfFieldScale, _init_depthOfFieldFocalDistanceEnabled, _init_extra_depthOfFieldFocalDistanceEnabled, _init_depthOfFieldFocalDistance, _init_extra_depthOfFieldFocalDistance, _init_depthOfFieldFocalLengthEnabled, _init_extra_depthOfFieldFocalLengthEnabled, _init_depthOfFieldFocalLength, _init_extra_depthOfFieldFocalLength, _init_depthOfFieldShapeEnabled, _init_extra_depthOfFieldShapeEnabled, _init_depthOfFieldShape, _init_extra_depthOfFieldShape, _init_whiteTemperatureEnabled, _init_extra_whiteTemperatureEnabled, _init_whiteTemperature, _init_extra_whiteTemperature, _init_whiteTintEnabled, _init_extra_whiteTintEnabled, _init_whiteTint, _init_extra_whiteTint, _init_colorSaturationEnabled, _init_extra_colorSaturationEnabled, _init_colorSaturation, _init_extra_colorSaturation, _init_colorContrastEnabled, _init_extra_colorContrastEnabled, _init_colorContrast, _init_extra_colorContrast, _init_colorGammaEnabled, _init_extra_colorGammaEnabled, _init_colorGamma, _init_extra_colorGamma, _init_colorGainEnabled, _init_extra_colorGainEnabled, _init_colorGain, _init_extra_colorGain, _init_colorOffsetEnabled, _init_extra_colorOffsetEnabled, _init_colorOffset, _init_extra_colorOffset;

/**
 * One post-process volume's contribution: a value and an enable flag per
 * attribute, plus the priority band and intensity that weight it when several
 * volumes are blended together.
 */
let _Tr2PostProcessAttrib;
new class extends _identity {
  static [class Tr2PostProcessAttributes extends CjsModel {
    static {
      ({
        e: [_init_priority, _init_extra_priority, _init_intensity, _init_extra_intensity, _init_signalLossIntensityEnabled, _init_extra_signalLossIntensityEnabled, _init_signalLossIntensity, _init_extra_signalLossIntensity, _init_bloomBrightnessEnabled, _init_extra_bloomBrightnessEnabled, _init_bloomBrightness, _init_extra_bloomBrightness, _init_bloomLuminanceThresholdEnabled, _init_extra_bloomLuminanceThresholdEnabled, _init_bloomLuminanceThreshold, _init_extra_bloomLuminanceThreshold, _init_bloomLuminanceScaleEnabled, _init_extra_bloomLuminanceScaleEnabled, _init_bloomLuminanceScale, _init_extra_bloomLuminanceScale, _init_bloomSizeScaleEnabled, _init_extra_bloomSizeScaleEnabled, _init_bloomSizeScale, _init_extra_bloomSizeScale, _init_bloomDirectionalWeightEnabled, _init_extra_bloomDirectionalWeightEnabled, _init_bloomDirectionalWeight, _init_extra_bloomDirectionalWeight, _init_bloomStepSize1Enabled, _init_extra_bloomStepSize1Enabled, _init_bloomStepSize, _init_extra_bloomStepSize, _init_bloomStepSize2Enabled, _init_extra_bloomStepSize2Enabled, _init_bloomStepSize2, _init_extra_bloomStepSize2, _init_bloomStepSize3Enabled, _init_extra_bloomStepSize3Enabled, _init_bloomStepSize3, _init_extra_bloomStepSize3, _init_bloomStepSize4Enabled, _init_extra_bloomStepSize4Enabled, _init_bloomStepSize4, _init_extra_bloomStepSize4, _init_bloomStepSize5Enabled, _init_extra_bloomStepSize5Enabled, _init_bloomStepSize5, _init_extra_bloomStepSize5, _init_bloomStepSize6Enabled, _init_extra_bloomStepSize6Enabled, _init_bloomStepSize6, _init_extra_bloomStepSize6, _init_bloomStepTint1Enabled, _init_extra_bloomStepTint1Enabled, _init_bloomStepTint, _init_extra_bloomStepTint, _init_bloomStepTint2Enabled, _init_extra_bloomStepTint2Enabled, _init_bloomStepTint2, _init_extra_bloomStepTint2, _init_bloomStepTint3Enabled, _init_extra_bloomStepTint3Enabled, _init_bloomStepTint3, _init_extra_bloomStepTint3, _init_bloomStepTint4Enabled, _init_extra_bloomStepTint4Enabled, _init_bloomStepTint4, _init_extra_bloomStepTint4, _init_bloomStepTint5Enabled, _init_extra_bloomStepTint5Enabled, _init_bloomStepTint5, _init_extra_bloomStepTint5, _init_bloomStepTint6Enabled, _init_extra_bloomStepTint6Enabled, _init_bloomStepTint6, _init_extra_bloomStepTint6, _init_grimeIntensityEnabled, _init_extra_grimeIntensityEnabled, _init_grimeIntensity, _init_extra_grimeIntensity, _init_grimePathEnabled, _init_extra_grimePathEnabled, _init_grimePath, _init_extra_grimePath, _init_exposureAdjustmentEnabled, _init_extra_exposureAdjustmentEnabled, _init_exposureAdjustment, _init_extra_exposureAdjustment, _init_filmGrainIntensityEnabled, _init_extra_filmGrainIntensityEnabled, _init_filmGrainIntensity, _init_extra_filmGrainIntensity, _init_filmGrainSizeEnabled, _init_extra_filmGrainSizeEnabled, _init_filmGrainSize, _init_extra_filmGrainSize, _init_filmGrainDensityEnabled, _init_extra_filmGrainDensityEnabled, _init_filmGrainDensity, _init_extra_filmGrainDensity, _init_filmGrainContrastEnabled, _init_extra_filmGrainContrastEnabled, _init_filmGrainContrast, _init_extra_filmGrainContrast, _init_filmGrainBrightnessModifierEnabled, _init_extra_filmGrainBrightnessModifierEnabled, _init_filmGrainBrightnessModifier, _init_extra_filmGrainBrightnessModifier, _init_filmGrainColoredEnabled, _init_extra_filmGrainColoredEnabled, _init_filmGrainColored, _init_extra_filmGrainColored, _init_filmGrainColorAmountEnabled, _init_extra_filmGrainColorAmountEnabled, _init_filmGrainColorAmount, _init_extra_filmGrainColorAmount, _init_saturationEnabled, _init_extra_saturationEnabled, _init_saturation, _init_extra_saturation, _init_fadeIntensityEnabled, _init_extra_fadeIntensityEnabled, _init_fadeIntensity, _init_extra_fadeIntensity, _init_fadeColorEnabled, _init_extra_fadeColorEnabled, _init_fadeColor, _init_extra_fadeColor, _init_lutIntensityEnabled, _init_extra_lutIntensityEnabled, _init_lutIntensity, _init_extra_lutIntensity, _init_lutPathEnabled, _init_extra_lutPathEnabled, _init_lutPath, _init_extra_lutPath, _init_vignetteIntensityEnabled, _init_extra_vignetteIntensityEnabled, _init_vignetteIntensity, _init_extra_vignetteIntensity, _init_vignetteOpacityEnabled, _init_extra_vignetteOpacityEnabled, _init_vignetteOpacity, _init_extra_vignetteOpacity, _init_vignetteColorEnabled, _init_extra_vignetteColorEnabled, _init_vignetteColor, _init_extra_vignetteColor, _init_vignetteDetail1SizeEnabled, _init_extra_vignetteDetail1SizeEnabled, _init_vignetteDetail1Size, _init_extra_vignetteDetail1Size, _init_vignetteDetail1ScrollEnabled, _init_extra_vignetteDetail1ScrollEnabled, _init_vignetteDetail1Scroll, _init_extra_vignetteDetail1Scroll, _init_vignetteDetail2SizeEnabled, _init_extra_vignetteDetail2SizeEnabled, _init_vignetteDetail2Size, _init_extra_vignetteDetail2Size, _init_vignetteDetail2ScrollEnabled, _init_extra_vignetteDetail2ScrollEnabled, _init_vignetteDetail2Scroll, _init_extra_vignetteDetail2Scroll, _init_vignetteShapePathEnabled, _init_extra_vignetteShapePathEnabled, _init_vignetteShapePath, _init_extra_vignetteShapePath, _init_vignetteDetailPathEnabled, _init_extra_vignetteDetailPathEnabled, _init_vignetteDetailPath, _init_extra_vignetteDetailPath, _init_vignetteSineFrequencyEnabled, _init_extra_vignetteSineFrequencyEnabled, _init_vignetteSineFrequency, _init_extra_vignetteSineFrequency, _init_vignetteMinSineFrequencyEnabled, _init_extra_vignetteMinSineFrequencyEnabled, _init_vignetteMinSineFrequency, _init_extra_vignetteMinSineFrequency, _init_vignetteMaxSineFrequencyEnabled, _init_extra_vignetteMaxSineFrequencyEnabled, _init_vignetteMaxSineFrequency, _init_extra_vignetteMaxSineFrequency, _init_depthOfFieldScaleEnabled, _init_extra_depthOfFieldScaleEnabled, _init_depthOfFieldScale, _init_extra_depthOfFieldScale, _init_depthOfFieldFocalDistanceEnabled, _init_extra_depthOfFieldFocalDistanceEnabled, _init_depthOfFieldFocalDistance, _init_extra_depthOfFieldFocalDistance, _init_depthOfFieldFocalLengthEnabled, _init_extra_depthOfFieldFocalLengthEnabled, _init_depthOfFieldFocalLength, _init_extra_depthOfFieldFocalLength, _init_depthOfFieldShapeEnabled, _init_extra_depthOfFieldShapeEnabled, _init_depthOfFieldShape, _init_extra_depthOfFieldShape, _init_whiteTemperatureEnabled, _init_extra_whiteTemperatureEnabled, _init_whiteTemperature, _init_extra_whiteTemperature, _init_whiteTintEnabled, _init_extra_whiteTintEnabled, _init_whiteTint, _init_extra_whiteTint, _init_colorSaturationEnabled, _init_extra_colorSaturationEnabled, _init_colorSaturation, _init_extra_colorSaturation, _init_colorContrastEnabled, _init_extra_colorContrastEnabled, _init_colorContrast, _init_extra_colorContrast, _init_colorGammaEnabled, _init_extra_colorGammaEnabled, _init_colorGamma, _init_extra_colorGamma, _init_colorGainEnabled, _init_extra_colorGainEnabled, _init_colorGain, _init_extra_colorGain, _init_colorOffsetEnabled, _init_extra_colorOffsetEnabled, _init_colorOffset, _init_extra_colorOffset, _initProto],
        c: [_Tr2PostProcessAttrib, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2PostProcessAttributes",
        family: "postProcess"
      })], [[[io, io.persist, type, type.int32, void 0, type.enum("Priority")], 16, "priority"], [[io, io.read, type, type.float32], 16, "intensity"], [[io, io.persist, type, type.boolean], 16, "signalLossIntensityEnabled"], [[io, io.persist, type, type.float32], 16, "signalLossIntensity"], [[io, io.persist, type, type.boolean], 16, "bloomBrightnessEnabled"], [[io, io.persist, type, type.float32], 16, "bloomBrightness"], [[io, io.persist, type, type.boolean], 16, "bloomLuminanceThresholdEnabled"], [[io, io.persist, type, type.float32], 16, "bloomLuminanceThreshold"], [[io, io.persist, type, type.boolean], 16, "bloomLuminanceScaleEnabled"], [[io, io.persist, type, type.float32], 16, "bloomLuminanceScale"], [[io, io.persist, type, type.boolean], 16, "bloomSizeScaleEnabled"], [[io, io.persist, type, type.float32], 16, "bloomSizeScale"], [[io, io.persist, type, type.boolean], 16, "bloomDirectionalWeightEnabled"], [[io, io.persist, type, type.float32], 16, "bloomDirectionalWeight"], [[io, io.persist, type, type.boolean], 16, "bloomStepSize1Enabled"], [[io, io.persist, type, type.float32], 16, "bloomStepSize1"], [[io, io.persist, type, type.boolean], 16, "bloomStepSize2Enabled"], [[io, io.persist, type, type.float32], 16, "bloomStepSize2"], [[io, io.persist, type, type.boolean], 16, "bloomStepSize3Enabled"], [[io, io.persist, type, type.float32], 16, "bloomStepSize3"], [[io, io.persist, type, type.boolean], 16, "bloomStepSize4Enabled"], [[io, io.persist, type, type.float32], 16, "bloomStepSize4"], [[io, io.persist, type, type.boolean], 16, "bloomStepSize5Enabled"], [[io, io.persist, type, type.float32], 16, "bloomStepSize5"], [[io, io.persist, type, type.boolean], 16, "bloomStepSize6Enabled"], [[io, io.persist, type, type.float32], 16, "bloomStepSize6"], [[io, io.persist, type, type.boolean], 16, "bloomStepTint1Enabled"], [[io, io.persist, type, type.color], 16, "bloomStepTint1"], [[io, io.persist, type, type.boolean], 16, "bloomStepTint2Enabled"], [[io, io.persist, type, type.color], 16, "bloomStepTint2"], [[io, io.persist, type, type.boolean], 16, "bloomStepTint3Enabled"], [[io, io.persist, type, type.color], 16, "bloomStepTint3"], [[io, io.persist, type, type.boolean], 16, "bloomStepTint4Enabled"], [[io, io.persist, type, type.color], 16, "bloomStepTint4"], [[io, io.persist, type, type.boolean], 16, "bloomStepTint5Enabled"], [[io, io.persist, type, type.color], 16, "bloomStepTint5"], [[io, io.persist, type, type.boolean], 16, "bloomStepTint6Enabled"], [[io, io.persist, type, type.color], 16, "bloomStepTint6"], [[io, io.persist, type, type.boolean], 16, "grimeIntensityEnabled"], [[io, io.persist, type, type.float32], 16, "grimeIntensity"], [[io, io.persist, type, type.boolean], 16, "grimePathEnabled"], [[io, io.persist, type, type.string], 16, "grimePath"], [[io, io.persist, type, type.boolean], 16, "exposureAdjustmentEnabled"], [[io, io.persist, type, type.float32], 16, "exposureAdjustment"], [[io, io.persist, type, type.boolean], 16, "filmGrainIntensityEnabled"], [[io, io.persist, type, type.float32], 16, "filmGrainIntensity"], [[io, io.persist, type, type.boolean], 16, "filmGrainSizeEnabled"], [[io, io.persist, type, type.float32], 16, "filmGrainSize"], [[io, io.persist, type, type.boolean], 16, "filmGrainDensityEnabled"], [[io, io.persist, type, type.float32], 16, "filmGrainDensity"], [[io, io.persist, type, type.boolean], 16, "filmGrainContrastEnabled"], [[io, io.persist, type, type.float32], 16, "filmGrainContrast"], [[io, io.persist, type, type.boolean], 16, "filmGrainBrightnessModifierEnabled"], [[io, io.persist, type, type.float32], 16, "filmGrainBrightnessModifier"], [[io, io.persist, type, type.boolean], 16, "filmGrainColoredEnabled"], [[io, io.persist, type, type.boolean], 16, "filmGrainColored"], [[io, io.persist, type, type.boolean], 16, "filmGrainColorAmountEnabled"], [[io, io.persist, type, type.float32], 16, "filmGrainColorAmount"], [[io, io.persist, type, type.boolean], 16, "saturationEnabled"], [[io, io.persist, type, type.float32], 16, "saturation"], [[io, io.persist, type, type.boolean], 16, "fadeIntensityEnabled"], [[io, io.persist, type, type.float32], 16, "fadeIntensity"], [[io, io.persist, type, type.boolean], 16, "fadeColorEnabled"], [[io, io.persist, type, type.color], 16, "fadeColor"], [[io, io.persist, type, type.boolean], 16, "lutIntensityEnabled"], [[io, io.persist, type, type.float32], 16, "lutIntensity"], [[io, io.persist, type, type.boolean], 16, "lutPathEnabled"], [[io, io.persist, type, type.string], 16, "lutPath"], [[io, io.persist, type, type.boolean], 16, "vignetteIntensityEnabled"], [[io, io.persist, type, type.float32], 16, "vignetteIntensity"], [[io, io.persist, type, type.boolean], 16, "vignetteOpacityEnabled"], [[io, io.persist, type, type.float32], 16, "vignetteOpacity"], [[io, io.persist, type, type.boolean], 16, "vignetteColorEnabled"], [[io, io.persist, type, type.color], 16, "vignetteColor"], [[io, io.persist, type, type.boolean], 16, "vignetteDetail1SizeEnabled"], [[io, io.persist, type, type.vec2], 16, "vignetteDetail1Size"], [[io, io.persist, type, type.boolean], 16, "vignetteDetail1ScrollEnabled"], [[io, io.persist, type, type.vec2], 16, "vignetteDetail1Scroll"], [[io, io.persist, type, type.boolean], 16, "vignetteDetail2SizeEnabled"], [[io, io.persist, type, type.vec2], 16, "vignetteDetail2Size"], [[io, io.persist, type, type.boolean], 16, "vignetteDetail2ScrollEnabled"], [[io, io.persist, type, type.vec2], 16, "vignetteDetail2Scroll"], [[io, io.persist, type, type.boolean], 16, "vignetteShapePathEnabled"], [[io, io.persist, type, type.string], 16, "vignetteShapePath"], [[io, io.persist, type, type.boolean], 16, "vignetteDetailPathEnabled"], [[io, io.persist, type, type.string], 16, "vignetteDetailPath"], [[io, io.persist, type, type.boolean], 16, "vignetteSineFrequencyEnabled"], [[io, io.persist, type, type.float32], 16, "vignetteSineFrequency"], [[io, io.persist, type, type.boolean], 16, "vignetteMinSineFrequencyEnabled"], [[io, io.persist, type, type.float32], 16, "vignetteMinSineFrequency"], [[io, io.persist, type, type.boolean], 16, "vignetteMaxSineFrequencyEnabled"], [[io, io.persist, type, type.float32], 16, "vignetteMaxSineFrequency"], [[io, io.persist, type, type.boolean], 16, "depthOfFieldScaleEnabled"], [[io, io.persist, type, type.float32], 16, "depthOfFieldScale"], [[io, io.persist, type, type.boolean], 16, "depthOfFieldFocalDistanceEnabled"], [[io, io.persist, type, type.float32], 16, "depthOfFieldFocalDistance"], [[io, io.persist, type, type.boolean], 16, "depthOfFieldFocalLengthEnabled"], [[io, io.persist, type, type.float32], 16, "depthOfFieldFocalLength"], [[io, io.persist, type, type.boolean], 16, "depthOfFieldShapeEnabled"], [[io, io.persist, type, type.int32, void 0, type.enum("Shape")], 16, "depthOfFieldShape"], [[io, io.persist, type, type.boolean], 16, "whiteTemperatureEnabled"], [[io, io.persist, type, type.float32], 16, "whiteTemperature"], [[io, io.persist, type, type.boolean], 16, "whiteTintEnabled"], [[io, io.persist, type, type.float32], 16, "whiteTint"], [[io, io.persist, type, type.boolean], 16, "colorSaturationEnabled"], [[io, io.persist, type, type.float32], 16, "colorSaturation"], [[io, io.persist, type, type.boolean], 16, "colorContrastEnabled"], [[io, io.persist, type, type.float32], 16, "colorContrast"], [[io, io.persist, type, type.boolean], 16, "colorGammaEnabled"], [[io, io.persist, type, type.float32], 16, "colorGamma"], [[io, io.persist, type, type.boolean], 16, "colorGainEnabled"], [[io, io.persist, type, type.vec3], 16, "colorGain"], [[io, io.persist, type, type.boolean], 16, "colorOffsetEnabled"], [[io, io.persist, type, type.vec3], 16, "colorOffset"], [[carbon, carbon.method, impl, impl.implemented], 18, "Reset"], [[carbon, carbon.method, impl, impl.implemented], 18, "FromPostProcess"]], 0, void 0, CjsModel));
    }
    priority = (_initProto(this), _init_priority(this, _Tr2PostProcessAttrib.MEDIUM_PRIORITY));
    intensity = (_init_extra_priority(this), _init_intensity(this, 0));
    signalLossIntensityEnabled = (_init_extra_intensity(this), _init_signalLossIntensityEnabled(this, false));
    signalLossIntensity = (_init_extra_signalLossIntensityEnabled(this), _init_signalLossIntensity(this, 0));
    bloomBrightnessEnabled = (_init_extra_signalLossIntensity(this), _init_bloomBrightnessEnabled(this, false));
    bloomBrightness = (_init_extra_bloomBrightnessEnabled(this), _init_bloomBrightness(this, 0));
    bloomLuminanceThresholdEnabled = (_init_extra_bloomBrightness(this), _init_bloomLuminanceThresholdEnabled(this, false));
    bloomLuminanceThreshold = (_init_extra_bloomLuminanceThresholdEnabled(this), _init_bloomLuminanceThreshold(this, 0));
    bloomLuminanceScaleEnabled = (_init_extra_bloomLuminanceThreshold(this), _init_bloomLuminanceScaleEnabled(this, false));
    bloomLuminanceScale = (_init_extra_bloomLuminanceScaleEnabled(this), _init_bloomLuminanceScale(this, 0));
    bloomSizeScaleEnabled = (_init_extra_bloomLuminanceScale(this), _init_bloomSizeScaleEnabled(this, false));
    bloomSizeScale = (_init_extra_bloomSizeScaleEnabled(this), _init_bloomSizeScale(this, 4));
    bloomDirectionalWeightEnabled = (_init_extra_bloomSizeScale(this), _init_bloomDirectionalWeightEnabled(this, false));
    bloomDirectionalWeight = (_init_extra_bloomDirectionalWeightEnabled(this), _init_bloomDirectionalWeight(this, 0));
    bloomStepSize1Enabled = (_init_extra_bloomDirectionalWeight(this), _init_bloomStepSize1Enabled(this, false));
    bloomStepSize1 = (_init_extra_bloomStepSize1Enabled(this), _init_bloomStepSize(this, 0.3));
    bloomStepSize2Enabled = (_init_extra_bloomStepSize(this), _init_bloomStepSize2Enabled(this, false));
    bloomStepSize2 = (_init_extra_bloomStepSize2Enabled(this), _init_bloomStepSize2(this, 1));
    bloomStepSize3Enabled = (_init_extra_bloomStepSize2(this), _init_bloomStepSize3Enabled(this, false));
    bloomStepSize3 = (_init_extra_bloomStepSize3Enabled(this), _init_bloomStepSize3(this, 2));
    bloomStepSize4Enabled = (_init_extra_bloomStepSize3(this), _init_bloomStepSize4Enabled(this, false));
    bloomStepSize4 = (_init_extra_bloomStepSize4Enabled(this), _init_bloomStepSize4(this, 10));
    bloomStepSize5Enabled = (_init_extra_bloomStepSize4(this), _init_bloomStepSize5Enabled(this, false));
    bloomStepSize5 = (_init_extra_bloomStepSize5Enabled(this), _init_bloomStepSize5(this, 30));
    bloomStepSize6Enabled = (_init_extra_bloomStepSize5(this), _init_bloomStepSize6Enabled(this, false));
    bloomStepSize6 = (_init_extra_bloomStepSize6Enabled(this), _init_bloomStepSize6(this, 64));
    bloomStepTint1Enabled = (_init_extra_bloomStepSize6(this), _init_bloomStepTint1Enabled(this, false));
    bloomStepTint1 = (_init_extra_bloomStepTint1Enabled(this), _init_bloomStepTint(this, vec4.fromValues(0.3465, 0.3465, 0.3465, 0.3465)));
    bloomStepTint2Enabled = (_init_extra_bloomStepTint(this), _init_bloomStepTint2Enabled(this, false));
    bloomStepTint2 = (_init_extra_bloomStepTint2Enabled(this), _init_bloomStepTint2(this, vec4.fromValues(0.138, 0.138, 0.138, 0.138)));
    bloomStepTint3Enabled = (_init_extra_bloomStepTint2(this), _init_bloomStepTint3Enabled(this, false));
    bloomStepTint3 = (_init_extra_bloomStepTint3Enabled(this), _init_bloomStepTint3(this, vec4.fromValues(0.1176, 0.1176, 0.1176, 0.1176)));
    bloomStepTint4Enabled = (_init_extra_bloomStepTint3(this), _init_bloomStepTint4Enabled(this, false));
    bloomStepTint4 = (_init_extra_bloomStepTint4Enabled(this), _init_bloomStepTint4(this, vec4.fromValues(0.066, 0.066, 0.066, 0.066)));
    bloomStepTint5Enabled = (_init_extra_bloomStepTint4(this), _init_bloomStepTint5Enabled(this, false));
    bloomStepTint5 = (_init_extra_bloomStepTint5Enabled(this), _init_bloomStepTint5(this, vec4.fromValues(0.066, 0.066, 0.066, 0.066)));
    bloomStepTint6Enabled = (_init_extra_bloomStepTint5(this), _init_bloomStepTint6Enabled(this, false));
    bloomStepTint6 = (_init_extra_bloomStepTint6Enabled(this), _init_bloomStepTint6(this, vec4.fromValues(0.061, 0.061, 0.061, 0.061)));
    grimeIntensityEnabled = (_init_extra_bloomStepTint6(this), _init_grimeIntensityEnabled(this, false));
    grimeIntensity = (_init_extra_grimeIntensityEnabled(this), _init_grimeIntensity(this, 0));
    grimePathEnabled = (_init_extra_grimeIntensity(this), _init_grimePathEnabled(this, false));
    grimePath = (_init_extra_grimePathEnabled(this), _init_grimePath(this, ""));
    exposureAdjustmentEnabled = (_init_extra_grimePath(this), _init_exposureAdjustmentEnabled(this, false));
    exposureAdjustment = (_init_extra_exposureAdjustmentEnabled(this), _init_exposureAdjustment(this, 0));
    filmGrainIntensityEnabled = (_init_extra_exposureAdjustment(this), _init_filmGrainIntensityEnabled(this, false));
    filmGrainIntensity = (_init_extra_filmGrainIntensityEnabled(this), _init_filmGrainIntensity(this, 0));
    filmGrainSizeEnabled = (_init_extra_filmGrainIntensity(this), _init_filmGrainSizeEnabled(this, false));
    filmGrainSize = (_init_extra_filmGrainSizeEnabled(this), _init_filmGrainSize(this, 0));
    filmGrainDensityEnabled = (_init_extra_filmGrainSize(this), _init_filmGrainDensityEnabled(this, false));
    filmGrainDensity = (_init_extra_filmGrainDensityEnabled(this), _init_filmGrainDensity(this, 0));
    filmGrainContrastEnabled = (_init_extra_filmGrainDensity(this), _init_filmGrainContrastEnabled(this, false));
    filmGrainContrast = (_init_extra_filmGrainContrastEnabled(this), _init_filmGrainContrast(this, 0));
    filmGrainBrightnessModifierEnabled = (_init_extra_filmGrainContrast(this), _init_filmGrainBrightnessModifierEnabled(this, false));
    filmGrainBrightnessModifier = (_init_extra_filmGrainBrightnessModifierEnabled(this), _init_filmGrainBrightnessModifier(this, 0));
    filmGrainColoredEnabled = (_init_extra_filmGrainBrightnessModifier(this), _init_filmGrainColoredEnabled(this, false));
    filmGrainColored = (_init_extra_filmGrainColoredEnabled(this), _init_filmGrainColored(this, false));
    filmGrainColorAmountEnabled = (_init_extra_filmGrainColored(this), _init_filmGrainColorAmountEnabled(this, false));
    filmGrainColorAmount = (_init_extra_filmGrainColorAmountEnabled(this), _init_filmGrainColorAmount(this, 0));
    saturationEnabled = (_init_extra_filmGrainColorAmount(this), _init_saturationEnabled(this, false));
    saturation = (_init_extra_saturationEnabled(this), _init_saturation(this, 0));
    fadeIntensityEnabled = (_init_extra_saturation(this), _init_fadeIntensityEnabled(this, false));
    fadeIntensity = (_init_extra_fadeIntensityEnabled(this), _init_fadeIntensity(this, 0));
    fadeColorEnabled = (_init_extra_fadeIntensity(this), _init_fadeColorEnabled(this, false));
    fadeColor = (_init_extra_fadeColorEnabled(this), _init_fadeColor(this, vec4.fromValues(0, 0, 0, 1)));
    lutIntensityEnabled = (_init_extra_fadeColor(this), _init_lutIntensityEnabled(this, false));
    lutIntensity = (_init_extra_lutIntensityEnabled(this), _init_lutIntensity(this, 0));
    lutPathEnabled = (_init_extra_lutIntensity(this), _init_lutPathEnabled(this, false));
    lutPath = (_init_extra_lutPathEnabled(this), _init_lutPath(this, ""));
    vignetteIntensityEnabled = (_init_extra_lutPath(this), _init_vignetteIntensityEnabled(this, false));
    vignetteIntensity = (_init_extra_vignetteIntensityEnabled(this), _init_vignetteIntensity(this, 0));
    vignetteOpacityEnabled = (_init_extra_vignetteIntensity(this), _init_vignetteOpacityEnabled(this, false));
    vignetteOpacity = (_init_extra_vignetteOpacityEnabled(this), _init_vignetteOpacity(this, 0));
    vignetteColorEnabled = (_init_extra_vignetteOpacity(this), _init_vignetteColorEnabled(this, false));
    vignetteColor = (_init_extra_vignetteColorEnabled(this), _init_vignetteColor(this, vec4.fromValues(1, 1, 1, 1)));
    vignetteDetail1SizeEnabled = (_init_extra_vignetteColor(this), _init_vignetteDetail1SizeEnabled(this, false));
    vignetteDetail1Size = (_init_extra_vignetteDetail1SizeEnabled(this), _init_vignetteDetail1Size(this, vec2.fromValues(16, 16)));
    vignetteDetail1ScrollEnabled = (_init_extra_vignetteDetail1Size(this), _init_vignetteDetail1ScrollEnabled(this, false));
    vignetteDetail1Scroll = (_init_extra_vignetteDetail1ScrollEnabled(this), _init_vignetteDetail1Scroll(this, vec2.create()));
    vignetteDetail2SizeEnabled = (_init_extra_vignetteDetail1Scroll(this), _init_vignetteDetail2SizeEnabled(this, false));
    vignetteDetail2Size = (_init_extra_vignetteDetail2SizeEnabled(this), _init_vignetteDetail2Size(this, vec2.fromValues(16, 16)));
    vignetteDetail2ScrollEnabled = (_init_extra_vignetteDetail2Size(this), _init_vignetteDetail2ScrollEnabled(this, false));
    vignetteDetail2Scroll = (_init_extra_vignetteDetail2ScrollEnabled(this), _init_vignetteDetail2Scroll(this, vec2.create()));
    vignetteShapePathEnabled = (_init_extra_vignetteDetail2Scroll(this), _init_vignetteShapePathEnabled(this, false));
    vignetteShapePath = (_init_extra_vignetteShapePathEnabled(this), _init_vignetteShapePath(this, ""));
    vignetteDetailPathEnabled = (_init_extra_vignetteShapePath(this), _init_vignetteDetailPathEnabled(this, false));
    vignetteDetailPath = (_init_extra_vignetteDetailPathEnabled(this), _init_vignetteDetailPath(this, ""));
    vignetteSineFrequencyEnabled = (_init_extra_vignetteDetailPath(this), _init_vignetteSineFrequencyEnabled(this, false));
    vignetteSineFrequency = (_init_extra_vignetteSineFrequencyEnabled(this), _init_vignetteSineFrequency(this, 0));
    vignetteMinSineFrequencyEnabled = (_init_extra_vignetteSineFrequency(this), _init_vignetteMinSineFrequencyEnabled(this, false));
    vignetteMinSineFrequency = (_init_extra_vignetteMinSineFrequencyEnabled(this), _init_vignetteMinSineFrequency(this, 0));
    vignetteMaxSineFrequencyEnabled = (_init_extra_vignetteMinSineFrequency(this), _init_vignetteMaxSineFrequencyEnabled(this, false));
    vignetteMaxSineFrequency = (_init_extra_vignetteMaxSineFrequencyEnabled(this), _init_vignetteMaxSineFrequency(this, 0));
    depthOfFieldScaleEnabled = (_init_extra_vignetteMaxSineFrequency(this), _init_depthOfFieldScaleEnabled(this, false));
    depthOfFieldScale = (_init_extra_depthOfFieldScaleEnabled(this), _init_depthOfFieldScale(this, 0));
    depthOfFieldFocalDistanceEnabled = (_init_extra_depthOfFieldScale(this), _init_depthOfFieldFocalDistanceEnabled(this, false));
    depthOfFieldFocalDistance = (_init_extra_depthOfFieldFocalDistanceEnabled(this), _init_depthOfFieldFocalDistance(this, 0));
    depthOfFieldFocalLengthEnabled = (_init_extra_depthOfFieldFocalDistance(this), _init_depthOfFieldFocalLengthEnabled(this, false));
    depthOfFieldFocalLength = (_init_extra_depthOfFieldFocalLengthEnabled(this), _init_depthOfFieldFocalLength(this, 0));
    depthOfFieldShapeEnabled = (_init_extra_depthOfFieldFocalLength(this), _init_depthOfFieldShapeEnabled(this, false));
    depthOfFieldShape = (_init_extra_depthOfFieldShapeEnabled(this), _init_depthOfFieldShape(this, 0));
    whiteTemperatureEnabled = (_init_extra_depthOfFieldShape(this), _init_whiteTemperatureEnabled(this, false));
    whiteTemperature = (_init_extra_whiteTemperatureEnabled(this), _init_whiteTemperature(this, 6500));
    whiteTintEnabled = (_init_extra_whiteTemperature(this), _init_whiteTintEnabled(this, false));
    whiteTint = (_init_extra_whiteTintEnabled(this), _init_whiteTint(this, 0));
    colorSaturationEnabled = (_init_extra_whiteTint(this), _init_colorSaturationEnabled(this, false));
    colorSaturation = (_init_extra_colorSaturationEnabled(this), _init_colorSaturation(this, 1));
    colorContrastEnabled = (_init_extra_colorSaturation(this), _init_colorContrastEnabled(this, false));
    colorContrast = (_init_extra_colorContrastEnabled(this), _init_colorContrast(this, 1));
    colorGammaEnabled = (_init_extra_colorContrast(this), _init_colorGammaEnabled(this, false));
    colorGamma = (_init_extra_colorGammaEnabled(this), _init_colorGamma(this, 1));
    colorGainEnabled = (_init_extra_colorGamma(this), _init_colorGainEnabled(this, false));
    colorGain = (_init_extra_colorGainEnabled(this), _init_colorGain(this, vec3.fromValues(1, 1, 1)));
    colorOffsetEnabled = (_init_extra_colorGain(this), _init_colorOffsetEnabled(this, false));
    colorOffset = (_init_extra_colorOffsetEnabled(this), _init_colorOffset(this, vec3.create()));

    // Native graph-only members: neither is Blue-exposed.
    prioritizedLuts = (_init_extra_colorOffset(this), new Set());
    depthOfFieldForegroundBlurNeededEnabled = false;
    depthOfFieldForegroundBlurNeeded = false;

    /**
     * Restores every attribute to its default and clears its enable flag, then
     * deliberately re-enables the colour-correction attributes so entering a
     * volume does not interpolate white balance and grading up from zero.
     */
    Reset() {
      this.intensity = 0;
      this.priority = _Tr2PostProcessAttrib.MEDIUM_PRIORITY;
      for (const name of _Tr2PostProcessAttrib.AttributeNames) {
        this[name] = _Tr2PostProcessAttrib.CloneValue(_Tr2PostProcessAttrib.DefaultValues[name]);
        this[`${name}Enabled`] = false;
      }
      this.prioritizedLuts.clear();

      // Carbon intentionally enables these on Reset to avoid interpolating color
      // correction from zero while entering a post-process volume.
      this.whiteTemperatureEnabled = true;
      this.whiteTintEnabled = true;
      this.colorSaturationEnabled = true;
      this.colorContrastEnabled = true;
      this.colorGammaEnabled = true;
      this.colorGainEnabled = true;
      this.colorOffsetEnabled = true;
    }

    /**
     * Captures an authored post-process graph as an attribute set, enabling only the attributes whose source effect passed its own availability gate; the LUT slot is taken from the highest-sorted available LUT.
     * @param {object} postProcess source graph, read through its Get*IfAvailable accessors; null leaves a reset attribute set
     * @param {number} priority the priority band this volume competes in
     * @param {number} intensity this volume's weight within its band
     */
    FromPostProcess(postProcess, priority, intensity) {
      this.Reset();
      this.intensity = Number(intensity ?? 0);
      this.priority = Number(priority ?? _Tr2PostProcessAttrib.MEDIUM_PRIORITY) | 0;
      if (!postProcess) return;
      const set = (name, value) => _Tr2PostProcessAttrib.CopyValue(this, name, value, true);
      const signalLoss = postProcess.GetSignalLossIfAvailable?.() ?? null;
      if (signalLoss) set("signalLossIntensity", signalLoss.strength);
      const bloom = postProcess.GetBloomIfAvailable?.() ?? null;
      if (bloom) {
        set("bloomBrightness", bloom.brightness);
        set("bloomLuminanceScale", bloom.luminanceScale);
        set("bloomLuminanceThreshold", bloom.luminanceThreshold);
        set("grimeIntensity", bloom.grimeWeight);
        set("grimePath", bloom.grimePath);
        set("bloomSizeScale", bloom.sizeScale);
        set("bloomDirectionalWeight", bloom.directionalWeight);
        for (let index = 1; index <= 6; index++) {
          set(`bloomStepSize${index}`, bloom[`step${index}Size`] ?? bloom.stepSizes?.[index - 1]);
          set(`bloomStepTint${index}`, bloom[`step${index}Tint`] ?? bloom.stepTints?.[index - 1]);
        }
      }
      const filmGrain = postProcess.GetFilmGrainIfAvailable?.() ?? null;
      if (filmGrain) {
        set("filmGrainIntensity", filmGrain.intensity);
        set("filmGrainSize", filmGrain.grainSize);
        set("filmGrainDensity", filmGrain.grainDensity);
        set("filmGrainContrast", filmGrain.grainContrast);
        set("filmGrainBrightnessModifier", filmGrain.brightnessModifier);
        set("filmGrainColored", filmGrain.colored);
        set("filmGrainColorAmount", filmGrain.colorAmount);
      }
      const desaturate = postProcess.GetDesaturateIfAvailable?.() ?? null;
      if (desaturate) set("saturation", Number(desaturate.intensity) - 1);
      const fade = postProcess.GetFadeIfAvailable?.() ?? null;
      if (fade) {
        set("fadeIntensity", fade.intensity);
        set("fadeColor", fade.color);
      }
      const vignette = postProcess.GetVignetteIfAvailable?.() ?? null;
      if (vignette) {
        set("vignetteIntensity", vignette.intensity);
        set("vignetteOpacity", vignette.opacity);
        set("vignetteColor", vignette.color);
        set("vignetteDetail1Size", vignette.detail1Size);
        set("vignetteDetail1Scroll", vignette.detail1Scroll);
        set("vignetteDetail2Size", vignette.detail2Size);
        set("vignetteDetail2Scroll", vignette.detail2Scroll);
        set("vignetteShapePath", vignette.shapePath);
        set("vignetteDetailPath", vignette.detailPath);
        set("vignetteSineFrequency", vignette.sineFrequency);
        set("vignetteMinSineFrequency", vignette.sineMinimum);
        set("vignetteMaxSineFrequency", vignette.sineMaximum);
      }
      const depthOfField = postProcess.GetDepthOfFieldIfAvailable?.() ?? null;
      if (depthOfField) {
        set("depthOfFieldScale", depthOfField.scale);
        set("depthOfFieldFocalDistance", depthOfField.focalDistance);
        set("depthOfFieldFocalLength", depthOfField.focalLength);
        set("depthOfFieldShape", depthOfField.bokehShape);
      }
      const luts = postProcess.GetAvilableSortedLuts?.([]) ?? [];
      if (luts.length) {
        set("lutIntensity", luts[0].influence);
        set("lutPath", luts[0].path);
      }
      const colorCorrection = postProcess.GetColorCorrectionIfAvailable?.() ?? null;
      if (colorCorrection) {
        set("whiteTemperature", colorCorrection.whiteTemperature);
        set("whiteTint", colorCorrection.whiteTint);
        set("colorSaturation", colorCorrection.colorSaturation);
        set("colorContrast", colorCorrection.colorContrast);
        set("colorGamma", colorCorrection.colorGamma);
        set("colorGain", colorCorrection.colorGain);
        set("colorOffset", colorCorrection.colorOffset);
      }
    }
    /**
     * Copies typed-array attribute values so callers never alias a shared default;
     * scalars, strings and booleans pass through unchanged.
     */
    static CloneValue(value) {
      return ArrayBuffer.isView(value) ? new value.constructor(value) : value;
    }

    /**
     * Writes an attribute value and its matching `<name>Enabled` flag together,
     * cloning the value first.
     */
    static CopyValue(target, name, value, enabled = true) {
      target[name] = _Tr2PostProcessAttrib.CloneValue(value);
      target[`${name}Enabled`] = enabled;
    }

    /**
     * Accumulates value * weight into an accumulator, allocating a Float32Array on first use for vector attributes and adding numerically otherwise.
     * @param {*} result accumulator so far, or null to start a new one
     * @returns {*} the accumulator, which for vectors is the same array on later calls
     */
    static AddWeighted(result, value, weight) {
      if (ArrayBuffer.isView(value) || Array.isArray(value)) {
        if (!result) result = new Float32Array(value.length);
        for (let index = 0; index < value.length; index++) result[index] += Number(value[index]) * weight;
        return result;
      }
      return Number(result ?? 0) + Number(value ?? 0) * weight;
    }

    /**
     * Returns the neutral starting value for an attribute, typed from its default:
     * a zeroed Float32Array, an empty string, false, or 0.
     */
    static ZeroValue(name) {
      const value = _Tr2PostProcessAttrib.DefaultValues[name];
      if (ArrayBuffer.isView(value)) return new Float32Array(value.length);
      if (typeof value === "string") return "";
      if (typeof value === "boolean") return false;
      return 0;
    }

    /**
     * Creates the observer the accumulation passes report into, recording per
     * attribute which sources influenced it, at what weight, and the value that
     * came out; GetDict returns that record keyed by attribute name.
     */
    static CreateDebugObserver() {
      const records = {};
      let current = null;
      return {
        BeginAttribute(name) {
          current = {
            name,
            influencers: []
          };
          records[name] = current;
        },
        Influence(attributes, weight) {
          current?.influencers.push({
            attributes,
            weight
          });
        },
        EndAttribute(value) {
          if (current) current.value = _Tr2PostProcessAttrib.CloneDebugValue(value);
          current = null;
        },
        GetDict() {
          return records;
        }
      };
    }

    /**
     * Snapshots a value into the debug record so later mutation of the accumulator
     * cannot rewrite what was reported.
     */
    static CloneDebugValue(value) {
      if (ArrayBuffer.isView(value)) return new value.constructor(value);
      if (Array.isArray(value)) return value.map(item => ({
        ...item
      }));
      return value;
    }

    /**
     * Opens the debug record for one attribute; a null observer makes this a
     * no-op, which is the normal non-debug path.
     */
    static BeginDebug(observer, name) {
      observer?.BeginAttribute?.(name);
    }

    /**
     * Records that one source contributed to the open attribute at the given
     * weight.
     */
    static DebugInfluence(observer, source, weight) {
      observer?.Influence?.(source, weight);
    }

    /**
     * Closes the open attribute's debug record with the value the accumulation
     * produced.
     */
    static EndDebug(observer, value) {
      observer?.EndAttribute?.(value);
    }

    /**
     * Blends one attribute across the sources band by band: within a band the enabled sources' intensities are normalized against the weight still unspent, and the results are either summed or, for max-weight attributes, resolved to the single highest-weighted value. Bands stop contributing once the remaining weight is used up.
     * @param {Array} sources must already be ordered by priority - runs of equal priority are treated as one band
     * @param {boolean} [maxWeight] pick-one rather than sum; defaults to whether the attribute is in MaxWeightAttributes, which covers paths, enums and booleans that cannot be interpolated
     * @returns {*} a freshly cloned value, never an alias of a source
     */
    static Accumulate(name, sources, maxWeight = _Tr2PostProcessAttrib.MaxWeightAttributes.has(name), observer = null) {
      let remainingWeight = 1;
      let result = maxWeight ? _Tr2PostProcessAttrib.ZeroValue(name) : null;
      let bestWeight = 0;
      _Tr2PostProcessAttrib.BeginDebug(observer, name);
      for (let first = 0; first < sources.length;) {
        let last = first + 1;
        while (last < sources.length && sources[last].priority === sources[first].priority) last++;
        let totalPriorityIntensity = 0;
        for (let index = first; index < last; index++) {
          if (sources[index]?.[`${name}Enabled`]) totalPriorityIntensity += Number(sources[index].intensity);
        }
        if (totalPriorityIntensity !== 0) {
          const normalization = remainingWeight / Math.max(totalPriorityIntensity, 1);
          for (let index = first; index < last; index++) {
            const source = sources[index];
            if (!source?.[`${name}Enabled`]) continue;
            const weight = Number(source.intensity) * normalization;
            if (maxWeight) {
              if (weight > bestWeight) {
                bestWeight = weight;
                result = source[name];
              }
            } else {
              result = _Tr2PostProcessAttrib.AddWeighted(result, source[name], weight);
            }
            _Tr2PostProcessAttrib.DebugInfluence(observer, source, weight);
          }
          remainingWeight -= totalPriorityIntensity;
          if (remainingWeight <= 0) break;
        }
        first = last;
      }
      const finalValue = _Tr2PostProcessAttrib.CloneValue(result ?? _Tr2PostProcessAttrib.ZeroValue(name));
      _Tr2PostProcessAttrib.EndDebug(observer, finalValue);
      return finalValue;
    }

    /**
     * Blends LUT paths over the same priority bands as Accumulate, but keeps up to four distinct paths instead of one, merging repeats and ranking by weight.
     * @returns {Array<{value: string, weight: number}>} the kept paths, weights renormalized to sum to 1
     */
    static AccumulateLuts(sources, observer = null) {
      let remainingWeight = 1;
      const values = [];
      _Tr2PostProcessAttrib.BeginDebug(observer, "lutPath");
      for (let first = 0; first < sources.length;) {
        let last = first + 1;
        while (last < sources.length && sources[last].priority === sources[first].priority) last++;
        let totalPriorityIntensity = 0;
        for (let index = first; index < last; index++) {
          if (sources[index]?.lutPathEnabled) totalPriorityIntensity += Number(sources[index].intensity);
        }
        if (totalPriorityIntensity !== 0) {
          const normalization = remainingWeight / Math.max(totalPriorityIntensity, 1);
          for (let index = first; index < last; index++) {
            const source = sources[index];
            if (!source?.lutPathEnabled) continue;
            const weight = Number(source.intensity) * normalization;
            const existing = values.find(item => item.value === source.lutPath);
            if (existing) {
              existing.weight += weight;
            } else if (values.length < 4) {
              values.push({
                value: source.lutPath,
                weight
              });
              values.sort((a, b) => b.weight - a.weight);
            } else {
              const insertAt = values.findIndex(item => weight > item.weight);
              if (insertAt !== -1) values.splice(insertAt, 0, {
                value: source.lutPath,
                weight
              });
              values.length = 4;
            }
            _Tr2PostProcessAttrib.DebugInfluence(observer, source, weight);
          }
          remainingWeight -= totalPriorityIntensity;
          if (remainingWeight <= 0) break;
        }
        first = last;
      }
      const total = values.reduce((sum, item) => sum + item.weight, 0);
      if (total > 0) for (const item of values) item.weight /= total;
      _Tr2PostProcessAttrib.EndDebug(observer, values);
      return values;
    }

    /**
     * Installs an effect on a post-process through its Set<Name> method when it
     * has one, and otherwise by writing the lower-camel-case property of the same
     * name.
     */
    static SetEffect(postProcess, name, effect) {
      const method = postProcess[`Set${name}`];
      if (typeof method === "function") method.call(postProcess, effect);else postProcess[name.charAt(0).toLowerCase() + name.slice(1)] = effect;
    }

    /**
     * Rebuilds a post-process graph from blended attribute sources: every effect slot and the LUT list are cleared first, then only the effects whose driving attribute blended to a non-zero value are recreated, so a slot left empty means nothing asked for it.
     * @param {Array} sources attribute sets ordered by priority, as Accumulate requires
     * @returns {object} the same post-process instance that was passed in
     */
    static MergeInto(postProcess, sources, debugObserver = null) {
      const values = new Map();
      for (const name of _Tr2PostProcessAttrib.AttributeNames) {
        if (name !== "lutPath") values.set(name, _Tr2PostProcessAttrib.Accumulate(name, sources, undefined, debugObserver));
      }
      values.set("depthOfFieldForegroundBlurNeeded", _Tr2PostProcessAttrib.Accumulate("depthOfFieldForegroundBlurNeeded", sources, true, debugObserver));
      const lutPaths = _Tr2PostProcessAttrib.AccumulateLuts(sources, debugObserver);
      const value = name => values.get(name);
      _Tr2PostProcessAttrib.SetEffect(postProcess, "Bloom", null);
      _Tr2PostProcessAttrib.SetEffect(postProcess, "Desaturate", null);
      _Tr2PostProcessAttrib.SetEffect(postProcess, "Fade", null);
      _Tr2PostProcessAttrib.SetEffect(postProcess, "FilmGrain", null);
      _Tr2PostProcessAttrib.SetEffect(postProcess, "SignalLoss", null);
      _Tr2PostProcessAttrib.SetEffect(postProcess, "Vignette", null);
      _Tr2PostProcessAttrib.SetEffect(postProcess, "DepthOfField", null);
      _Tr2PostProcessAttrib.SetEffect(postProcess, "ColorCorrection", null);
      postProcess.ClearLuts?.();
      if (!postProcess.ClearLuts) postProcess.luts.length = 0;
      const signalLossIntensity = value("signalLossIntensity");
      if (signalLossIntensity > 0) {
        const effect = new _Tr2PPSignalLossEffec();
        effect.strength = signalLossIntensity;
        _Tr2PostProcessAttrib.SetEffect(postProcess, "SignalLoss", effect);
      }
      const bloomBrightness = value("bloomBrightness");
      if (bloomBrightness > 0) {
        const effect = new _Tr2PPBloomEffect();
        effect.brightness = bloomBrightness;
        effect.luminanceThreshold = value("bloomLuminanceThreshold");
        effect.luminanceScale = value("bloomLuminanceScale");
        effect.sizeScale = value("bloomSizeScale");
        effect.directionalWeight = value("bloomDirectionalWeight");
        for (let index = 1; index <= 6; index++) {
          effect[`step${index}Size`] = value(`bloomStepSize${index}`);
          effect[`step${index}Tint`] = value(`bloomStepTint${index}`);
        }
        _Tr2PostProcessAttrib.SetEffect(postProcess, "Bloom", effect);
      }
      const grimeIntensity = value("grimeIntensity");
      if (grimeIntensity > 0) {
        const effect = postProcess.GetBloomIfAvailable?.() ?? postProcess.bloom ?? new _Tr2PPBloomEffect();
        effect.grimeWeight = grimeIntensity;
        effect.grimePath = value("grimePath");
        _Tr2PostProcessAttrib.SetEffect(postProcess, "Bloom", effect);
      }
      const filmGrainIntensity = value("filmGrainIntensity");
      if (filmGrainIntensity > 0) {
        const effect = new _Tr2PPFilmGrainEffect();
        effect.intensity = filmGrainIntensity;
        effect.grainSize = value("filmGrainSize");
        effect.grainDensity = value("filmGrainDensity");
        effect.grainContrast = value("filmGrainContrast");
        effect.brightnessModifier = value("filmGrainBrightnessModifier");
        effect.colored = value("filmGrainColored");
        effect.colorAmount = value("filmGrainColorAmount");
        _Tr2PostProcessAttrib.SetEffect(postProcess, "FilmGrain", effect);
      }
      const saturation = value("saturation");
      if (saturation !== 0) {
        const effect = new _Tr2PPDesaturateEffec();
        effect.intensity = saturation + 1;
        _Tr2PostProcessAttrib.SetEffect(postProcess, "Desaturate", effect);
      }
      const fadeIntensity = value("fadeIntensity");
      if (fadeIntensity > 0) {
        const effect = new _Tr2PPFadeEffect();
        effect.intensity = fadeIntensity;
        effect.color = value("fadeColor");
        _Tr2PostProcessAttrib.SetEffect(postProcess, "Fade", effect);
      }
      const lutIntensity = value("lutIntensity");
      for (const lut of lutPaths) {
        const effect = new _Tr2PPLutEffect();
        effect.influence = lut.weight * lutIntensity;
        effect.path = lut.value;
        if (postProcess.AddLut) postProcess.AddLut(effect);else postProcess.luts.push(effect);
      }
      const vignetteIntensity = value("vignetteIntensity");
      if (vignetteIntensity > 0) {
        const effect = new _Tr2PPVignetteEffect();
        effect.intensity = vignetteIntensity;
        effect.opacity = value("vignetteOpacity");
        effect.color = value("vignetteColor");
        effect.detail1Size = value("vignetteDetail1Size");
        effect.detail1Scroll = value("vignetteDetail1Scroll");
        effect.detail2Size = value("vignetteDetail2Size");
        effect.detail2Scroll = value("vignetteDetail2Scroll");
        effect.shapePath = value("vignetteShapePath");
        effect.detailPath = value("vignetteDetailPath");
        effect.sineFrequency = value("vignetteSineFrequency");
        effect.sineMinimum = value("vignetteMinSineFrequency");
        effect.sineMaximum = value("vignetteMaxSineFrequency");
        _Tr2PostProcessAttrib.SetEffect(postProcess, "Vignette", effect);
      }
      const depthOfFieldScale = value("depthOfFieldScale");
      if (depthOfFieldScale > 0) {
        const effect = new _Tr2PPDepthOfFieldEff();
        effect.scale = depthOfFieldScale;
        effect.cocScale = 1;
        effect.focalDistance = value("depthOfFieldFocalDistance");
        effect.focalLength = value("depthOfFieldFocalLength");
        effect.bokehShape = value("depthOfFieldShape");
        effect.foregroundBlurNeeded = value("depthOfFieldForegroundBlurNeeded");
        _Tr2PostProcessAttrib.SetEffect(postProcess, "DepthOfField", effect);
      }
      postProcess.exposureAdjustment = value("exposureAdjustment");
      const whiteTemperature = value("whiteTemperature");
      if (whiteTemperature > 0) {
        const effect = new _Tr2PPColorCorrection();
        effect.whiteTemperature = whiteTemperature;
        effect.whiteTint = value("whiteTint");
        effect.colorSaturation = value("colorSaturation");
        effect.colorContrast = value("colorContrast");
        effect.colorGamma = value("colorGamma");
        effect.colorGain = value("colorGain");
        effect.colorOffset = value("colorOffset");
        _Tr2PostProcessAttrib.SetEffect(postProcess, "ColorCorrection", effect);
      }
      return postProcess;
    }
  }];
  Priority = Priority;
  AttributeType = AttributeType;
  SCENE_DEFAULT_PRIORITY = 0;
  LOW_PRIORITY = 1;
  MEDIUM_PRIORITY = 2;
  HIGH_PRIORITY = 3;
  UI_PRIORITY = 4;
  PRIORITY_COUNT = 5;
  AttributeNames = Object.freeze(["signalLossIntensity", "bloomBrightness", "bloomLuminanceThreshold", "bloomLuminanceScale", "bloomSizeScale", "bloomDirectionalWeight", "bloomStepSize1", "bloomStepSize2", "bloomStepSize3", "bloomStepSize4", "bloomStepSize5", "bloomStepSize6", "bloomStepTint1", "bloomStepTint2", "bloomStepTint3", "bloomStepTint4", "bloomStepTint5", "bloomStepTint6", "grimeIntensity", "grimePath", "exposureAdjustment", "filmGrainIntensity", "filmGrainSize", "filmGrainDensity", "filmGrainContrast", "filmGrainBrightnessModifier", "filmGrainColored", "filmGrainColorAmount", "saturation", "fadeIntensity", "fadeColor", "lutIntensity", "lutPath", "vignetteIntensity", "vignetteOpacity", "vignetteColor", "vignetteDetail1Size", "vignetteDetail1Scroll", "vignetteDetail2Size", "vignetteDetail2Scroll", "vignetteShapePath", "vignetteDetailPath", "vignetteSineFrequency", "vignetteMinSineFrequency", "vignetteMaxSineFrequency", "depthOfFieldScale", "depthOfFieldFocalDistance", "depthOfFieldFocalLength", "depthOfFieldShape", "whiteTemperature", "whiteTint", "colorSaturation", "colorContrast", "colorGamma", "colorGain", "colorOffset"]);
  DefaultValues = Object.freeze({
    signalLossIntensity: 0,
    bloomBrightness: 0,
    bloomLuminanceThreshold: 0,
    bloomLuminanceScale: 0,
    bloomSizeScale: 4,
    bloomDirectionalWeight: 0,
    bloomStepSize1: 0.3,
    bloomStepSize2: 1,
    bloomStepSize3: 2,
    bloomStepSize4: 10,
    bloomStepSize5: 30,
    bloomStepSize6: 64,
    bloomStepTint1: vec4.fromValues(0.3465, 0.3465, 0.3465, 0.3465),
    bloomStepTint2: vec4.fromValues(0.138, 0.138, 0.138, 0.138),
    bloomStepTint3: vec4.fromValues(0.1176, 0.1176, 0.1176, 0.1176),
    bloomStepTint4: vec4.fromValues(0.066, 0.066, 0.066, 0.066),
    bloomStepTint5: vec4.fromValues(0.066, 0.066, 0.066, 0.066),
    bloomStepTint6: vec4.fromValues(0.061, 0.061, 0.061, 0.061),
    grimeIntensity: 0,
    grimePath: "",
    exposureAdjustment: 0,
    filmGrainIntensity: 0,
    filmGrainSize: 0,
    filmGrainDensity: 0,
    filmGrainContrast: 0,
    filmGrainBrightnessModifier: 0,
    filmGrainColored: false,
    filmGrainColorAmount: 0,
    saturation: 0,
    fadeIntensity: 0,
    fadeColor: vec4.fromValues(0, 0, 0, 1),
    lutIntensity: 0,
    lutPath: "",
    vignetteIntensity: 0,
    vignetteOpacity: 0,
    vignetteColor: vec4.fromValues(1, 1, 1, 1),
    vignetteDetail1Size: vec2.fromValues(16, 16),
    vignetteDetail1Scroll: vec2.create(),
    vignetteDetail2Size: vec2.fromValues(16, 16),
    vignetteDetail2Scroll: vec2.create(),
    vignetteShapePath: "",
    vignetteDetailPath: "",
    vignetteSineFrequency: 0,
    vignetteMinSineFrequency: 0,
    vignetteMaxSineFrequency: 0,
    depthOfFieldScale: 0,
    depthOfFieldFocalDistance: 0,
    depthOfFieldFocalLength: 0,
    depthOfFieldShape: 0,
    depthOfFieldForegroundBlurNeeded: false,
    whiteTemperature: 6500,
    whiteTint: 0,
    colorSaturation: 1,
    colorContrast: 1,
    colorGamma: 1,
    colorGain: vec3.fromValues(1, 1, 1),
    colorOffset: vec3.create()
  });
  MaxWeightAttributes = Object.freeze(new Set(["grimePath", "filmGrainColored", "vignetteShapePath", "vignetteDetailPath", "depthOfFieldShape", "depthOfFieldForegroundBlurNeeded"]));
  Shape = _Tr2PPDepthOfFieldEff.Shape;
  constructor() {
    super(_Tr2PostProcessAttrib), _initClass();
  }
}();

export { _Tr2PostProcessAttrib as Tr2PostProcessAttributes };
//# sourceMappingURL=Tr2PostProcessAttributes.js.map
