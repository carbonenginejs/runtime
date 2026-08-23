import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { PerLightShadowSetting } from '../../generated/eve/lights/enums.js';

let _initClass, _init_position, _init_extra_position, _init_color, _init_extra_color, _init_brightness, _init_extra_brightness, _init_noiseAmplitude, _init_extra_noiseAmplitude, _init_noiseFrequency, _init_extra_noiseFrequency, _init_noiseOctaves, _init_extra_noiseOctaves, _init_radius, _init_extra_radius, _init_innerRadius, _init_extra_innerRadius, _init_rotation, _init_extra_rotation, _init_outerAngle, _init_extra_outerAngle, _init_innerAngle, _init_extra_innerAngle, _init_texturePath, _init_extra_texturePath, _init_boneIndex, _init_extra_boneIndex, _init_flags, _init_extra_flags, _init_startTime, _init_extra_startTime, _init_castsShadows, _init_extra_castsShadows, _init_isVolumetric, _init_extra_isVolumetric;

/**
 * Full authored attribute set of a light - position, colour, brightness and
 * noise, radii, orientation and cone angles, texture path, bone index, flags,
 * shadow setting and volumetric flag - used as the compat view over a light's
 * flattened fields.
 */
let _CjsLightData;
new class extends _identity {
  static [class CjsLightData extends CjsModel {
    static {
      ({
        e: [_init_position, _init_extra_position, _init_color, _init_extra_color, _init_brightness, _init_extra_brightness, _init_noiseAmplitude, _init_extra_noiseAmplitude, _init_noiseFrequency, _init_extra_noiseFrequency, _init_noiseOctaves, _init_extra_noiseOctaves, _init_radius, _init_extra_radius, _init_innerRadius, _init_extra_innerRadius, _init_rotation, _init_extra_rotation, _init_outerAngle, _init_extra_outerAngle, _init_innerAngle, _init_extra_innerAngle, _init_texturePath, _init_extra_texturePath, _init_boneIndex, _init_extra_boneIndex, _init_flags, _init_extra_flags, _init_startTime, _init_extra_startTime, _init_castsShadows, _init_extra_castsShadows, _init_isVolumetric, _init_extra_isVolumetric],
        c: [_CjsLightData, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "CjsLightData",
        sourceClass: "LightData",
        aliases: ["LightData"],
        family: "eve/lights"
      })], [[[type, type.vec3], 16, "position"], [[type, type.color], 16, "color"], [[type, type.float32], 16, "brightness"], [[type, type.float32], 16, "noiseAmplitude"], [[type, type.float32], 16, "noiseFrequency"], [[type, type.uint32], 16, "noiseOctaves"], [[type, type.float32], 16, "radius"], [[type, type.float32], 16, "innerRadius"], [[type, type.quat], 16, "rotation"], [[type, type.float32], 16, "outerAngle"], [[type, type.float32], 16, "innerAngle"], [[type, type.string], 16, "texturePath"], [[type, type.int32], 16, "boneIndex"], [[type, type.uint16], 16, "flags"], [[type, type.float64], 16, "startTime"], [[type, type.int32, void 0, type.enum("PerLightShadowSetting")], 16, "castsShadows"], [[type, type.boolean], 16, "isVolumetric"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_isVolumetric(this);
    }
    position = _init_position(this, vec3.create());
    color = (_init_extra_position(this), _init_color(this, vec4.createLinear()));
    brightness = (_init_extra_color(this), _init_brightness(this, 1));
    noiseAmplitude = (_init_extra_brightness(this), _init_noiseAmplitude(this, 0));
    noiseFrequency = (_init_extra_noiseAmplitude(this), _init_noiseFrequency(this, 1));
    noiseOctaves = (_init_extra_noiseFrequency(this), _init_noiseOctaves(this, 1));
    radius = (_init_extra_noiseOctaves(this), _init_radius(this, 0));
    innerRadius = (_init_extra_radius(this), _init_innerRadius(this, 0));
    rotation = (_init_extra_innerRadius(this), _init_rotation(this, quat.create()));
    outerAngle = (_init_extra_rotation(this), _init_outerAngle(this, 0));
    innerAngle = (_init_extra_outerAngle(this), _init_innerAngle(this, 0));
    texturePath = (_init_extra_innerAngle(this), _init_texturePath(this, ""));
    boneIndex = (_init_extra_texturePath(this), _init_boneIndex(this, -1));
    flags = (_init_extra_boneIndex(this), _init_flags(this, 1));
    startTime = (_init_extra_flags(this), _init_startTime(this, 0));
    castsShadows = (_init_extra_startTime(this), _init_castsShadows(this, 0));
    isVolumetric = (_init_extra_castsShadows(this), _init_isVolumetric(this, false));
  }];
  Fields = ["position", "color", "brightness", "noiseAmplitude", "noiseFrequency", "noiseOctaves", "radius", "innerRadius", "rotation", "outerAngle", "innerAngle", "texturePath", "boneIndex", "flags", "startTime", "castsShadows", "isVolumetric"];
  PerLightShadowSetting = PerLightShadowSetting;
  constructor() {
    super(_CjsLightData), _initClass();
  }
}();
function createCjsLightDataView(owner, fieldNames) {
  const view = new _CjsLightData();
  const descriptors = {};
  for (const fieldName of fieldNames) {
    delete view[fieldName];
    descriptors[fieldName] = {
      configurable: true,
      enumerable: true,
      get() {
        return owner[fieldName];
      },
      set(value) {
        owner.SetValues({
          [fieldName]: value
        });
      }
    };
  }
  Object.defineProperties(view, descriptors);
  return view;
}

/**
 * Routes a nested `lightData` value bag (the pre-flatten hydration shape,
 * still emitted by runtime-sof) into the owner's flattened fields, then
 * applies everything through one schema-backed SetValues pass. Explicit flat
 * keys win over the nested bag.
 */
function setCjsLightDataOwnerValues(owner, values, options, setOwnerValues, fieldNames) {
  if (!values || typeof values !== "object") return setOwnerValues(values, options);
  if (!Object.prototype.hasOwnProperty.call(values, "lightData")) return setOwnerValues(values, options);
  const merged = {};
  for (const [key, value] of Object.entries(values)) {
    if (key !== "lightData") merged[key] = value;
  }
  const nested = values.lightData?.GetValues?.() ?? values.lightData;
  if (nested && typeof nested === "object") {
    const fieldSet = new Set(fieldNames);
    for (const fieldName of _CjsLightData.Fields) {
      if (!fieldSet.has(fieldName)) continue;
      if (!Object.prototype.hasOwnProperty.call(nested, fieldName)) continue;
      if (Object.prototype.hasOwnProperty.call(values, fieldName)) continue;
      merged[fieldName] = nested[fieldName];
    }
  }
  return setOwnerValues(merged, options);
}

export { _CjsLightData as CjsLightData, createCjsLightDataView, setCjsLightDataOwnerValues };
//# sourceMappingURL=CjsLightData.js.map
