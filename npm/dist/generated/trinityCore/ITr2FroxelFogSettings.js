import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { Priority } from '../postProcess/enums.js';

let _initClass, _init_logThickness, _init_extra_logThickness, _init_thickness, _init_extra_thickness, _init_lightDirectionality, _init_extra_lightDirectionality, _init_environmentIntensity, _init_extra_environmentIntensity, _init_environmentDirectionality, _init_extra_environmentDirectionality, _init_backgroundVisibility, _init_extra_backgroundVisibility, _init_godRayNoiseIntensity, _init_extra_godRayNoiseIntensity, _init_godRayNoiseFrequency, _init_extra_godRayNoiseFrequency, _init_godRayNoiseAnimationSpeed, _init_extra_godRayNoiseAnimationSpeed, _init_fogNoiseIntensity, _init_extra_fogNoiseIntensity, _init_fogNoiseFrequency, _init_extra_fogNoiseFrequency, _init_intensity, _init_extra_intensity, _init_priority, _init_extra_priority;

/** ITr2FroxelFogSettings (trinityCore) - generated from schema shapeHash 5ffba82f.... */
let _ITr2FroxelFogSetting;
new class extends _identity {
  static [class ITr2FroxelFogSettings extends CjsModel {
    static {
      ({
        e: [_init_logThickness, _init_extra_logThickness, _init_thickness, _init_extra_thickness, _init_lightDirectionality, _init_extra_lightDirectionality, _init_environmentIntensity, _init_extra_environmentIntensity, _init_environmentDirectionality, _init_extra_environmentDirectionality, _init_backgroundVisibility, _init_extra_backgroundVisibility, _init_godRayNoiseIntensity, _init_extra_godRayNoiseIntensity, _init_godRayNoiseFrequency, _init_extra_godRayNoiseFrequency, _init_godRayNoiseAnimationSpeed, _init_extra_godRayNoiseAnimationSpeed, _init_fogNoiseIntensity, _init_extra_fogNoiseIntensity, _init_fogNoiseFrequency, _init_extra_fogNoiseFrequency, _init_intensity, _init_extra_intensity, _init_priority, _init_extra_priority],
        c: [_ITr2FroxelFogSetting, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "ITr2FroxelFogSettings",
        family: "trinityCore"
      })], [[type.rawStruct("PriorityBlend::Attribute<double>"), 0, "logThickness"], [type.rawStruct("PriorityBlend::Attribute<float>"), 0, "thickness"], [type.rawStruct("PriorityBlend::Attribute<float>"), 0, "lightDirectionality"], [type.rawStruct("PriorityBlend::Attribute<float>"), 0, "environmentIntensity"], [type.rawStruct("PriorityBlend::Attribute<float>"), 0, "environmentDirectionality"], [type.rawStruct("PriorityBlend::Attribute<float>"), 0, "backgroundVisibility"], [type.rawStruct("PriorityBlend::Attribute<float>"), 0, "godRayNoiseIntensity"], [type.rawStruct("PriorityBlend::Attribute<float>"), 0, "godRayNoiseFrequency"], [type.rawStruct("PriorityBlend::Attribute<float>"), 0, "godRayNoiseAnimationSpeed"], [type.rawStruct("PriorityBlend::Attribute<float>"), 0, "fogNoiseIntensity"], [type.rawStruct("PriorityBlend::Attribute<float>"), 0, "fogNoiseFrequency"], [[type, type.float32], 16, "intensity"], [[type, type.int32, void 0, type.enum("Priority")], 16, "priority"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_priority(this);
    }
    /** logThickness (PriorityBlend::Attribute<double>) */
    logThickness = _init_logThickness(this, 0);

    /** thickness (PriorityBlend::Attribute<float>) */
    thickness = (_init_extra_logThickness(this), _init_thickness(this, 0));

    /** lightDirectionality (PriorityBlend::Attribute<float>) */
    lightDirectionality = (_init_extra_thickness(this), _init_lightDirectionality(this, 0));

    /** environmentIntensity (PriorityBlend::Attribute<float>) */
    environmentIntensity = (_init_extra_lightDirectionality(this), _init_environmentIntensity(this, 0));

    /** environmentDirectionality (PriorityBlend::Attribute<float>) */
    environmentDirectionality = (_init_extra_environmentIntensity(this), _init_environmentDirectionality(this, 0));

    /** backgroundVisibility (PriorityBlend::Attribute<float>) */
    backgroundVisibility = (_init_extra_environmentDirectionality(this), _init_backgroundVisibility(this, 0));

    /** godRayNoiseIntensity (PriorityBlend::Attribute<float>) */
    godRayNoiseIntensity = (_init_extra_backgroundVisibility(this), _init_godRayNoiseIntensity(this, 0));

    /** godRayNoiseFrequency (PriorityBlend::Attribute<float>) */
    godRayNoiseFrequency = (_init_extra_godRayNoiseIntensity(this), _init_godRayNoiseFrequency(this, 0));

    /** godRayNoiseAnimationSpeed (PriorityBlend::Attribute<float>) */
    godRayNoiseAnimationSpeed = (_init_extra_godRayNoiseFrequency(this), _init_godRayNoiseAnimationSpeed(this, 0));

    /** fogNoiseIntensity (PriorityBlend::Attribute<float>) */
    fogNoiseIntensity = (_init_extra_godRayNoiseAnimationSpeed(this), _init_fogNoiseIntensity(this, 0));

    /** fogNoiseFrequency (PriorityBlend::Attribute<float>) */
    fogNoiseFrequency = (_init_extra_fogNoiseIntensity(this), _init_fogNoiseFrequency(this, 0));

    /** intensity (float) */
    intensity = (_init_extra_fogNoiseFrequency(this), _init_intensity(this, 1));

    /** priority (PostProcessEnums::Priority - enum Priority) */
    priority = (_init_extra_intensity(this), _init_priority(this, 2));
  }];
  Priority = Priority;
  constructor() {
    super(_ITr2FroxelFogSetting), _initClass();
  }
}();

export { _ITr2FroxelFogSetting as ITr2FroxelFogSettings };
//# sourceMappingURL=ITr2FroxelFogSettings.js.map
