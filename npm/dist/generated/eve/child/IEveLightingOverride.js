import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_value, _init_extra_value, _init_sunIntensity, _init_extra_sunIntensity, _init_backgroundIntensity, _init_extra_backgroundIntensity, _init_reflectionIntensity, _init_extra_reflectionIntensity, _init_intensity, _init_extra_intensity, _init_priority, _init_extra_priority;

/** IEveLightingOverride (eve/child) - generated from schema shapeHash 8e8125e0.... */
let _IEveLightingOverride;
new class extends _identity {
  static [class IEveLightingOverride extends CjsModel {
    static {
      ({
        e: [_init_value, _init_extra_value, _init_sunIntensity, _init_extra_sunIntensity, _init_backgroundIntensity, _init_extra_backgroundIntensity, _init_reflectionIntensity, _init_extra_reflectionIntensity, _init_intensity, _init_extra_intensity, _init_priority, _init_extra_priority],
        c: [_IEveLightingOverride, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "IEveLightingOverride",
        family: "eve/child"
      })], [[type.rawStruct("Overrides"), 0, "value"], [[type, type.float32], 16, "sunIntensity"], [[type, type.float32], 16, "backgroundIntensity"], [[type, type.float32], 16, "reflectionIntensity"], [[type, type.float32], 16, "intensity"], [[type, type.int32, void 0, type.enum("Priority")], 16, "priority"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_priority(this);
    }
    /** value (Overrides) */
    value = _init_value(this, null);

    /** sunIntensity (float) */
    sunIntensity = (_init_extra_value(this), _init_sunIntensity(this, 0));

    /** backgroundIntensity (float) */
    backgroundIntensity = (_init_extra_sunIntensity(this), _init_backgroundIntensity(this, 0));

    /** reflectionIntensity (float) */
    reflectionIntensity = (_init_extra_backgroundIntensity(this), _init_reflectionIntensity(this, 0));

    /** intensity (float) */
    intensity = (_init_extra_reflectionIntensity(this), _init_intensity(this, 1));

    /** priority (PostProcessEnums::Priority - enum Priority) */
    priority = (_init_extra_intensity(this), _init_priority(this, 2));
  }];
  Priority = Object.freeze({
    SCENE_DEFAULT_PRIORITY: 0,
    LOW_PRIORITY: 1,
    MEDIUM_PRIORITY: 2,
    HIGH_PRIORITY: 3,
    UI_PRIORITY: 4,
    PRIORITY_COUNT: 5
  });
  constructor() {
    super(_IEveLightingOverride), _initClass();
  }
}();

export { _IEveLightingOverride as IEveLightingOverride };
//# sourceMappingURL=IEveLightingOverride.js.map
