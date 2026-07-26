import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, schema } from '@carbonenginejs/runtime-utils/schema';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { Tr2Light as _Tr2Light } from './Tr2Light.js';

let _initClass, _init_name, _init_extra_name, _init_lightProfilePath, _init_extra_lightProfilePath, _init_lightProfile, _init_extra_lightProfile, _init_castsShadows, _init_extra_castsShadows, _init_flags, _init_extra_flags, _init_position, _init_extra_position, _init_rotation, _init_extra_rotation, _init_boneIndex, _init_extra_boneIndex, _init_radius, _init_extra_radius, _init_innerRadius, _init_extra_innerRadius, _init_color, _init_extra_color, _init_brightness, _init_extra_brightness, _init_noiseAmplitude, _init_extra_noiseAmplitude, _init_noiseFrequency, _init_extra_noiseFrequency, _init_noiseOctaves, _init_extra_noiseOctaves, _init_isVolumetric, _init_extra_isVolumetric;

/**
 * Omnidirectional light whose LightData attributes are flattened into persisted
 * Blue properties.
 */
let _Tr2PointLight;
new class extends _identity {
  static [class Tr2PointLight extends _Tr2Light {
    static {
      ({
        e: [_init_name, _init_extra_name, _init_lightProfilePath, _init_extra_lightProfilePath, _init_lightProfile, _init_extra_lightProfile, _init_castsShadows, _init_extra_castsShadows, _init_flags, _init_extra_flags, _init_position, _init_extra_position, _init_rotation, _init_extra_rotation, _init_boneIndex, _init_extra_boneIndex, _init_radius, _init_extra_radius, _init_innerRadius, _init_extra_innerRadius, _init_color, _init_extra_color, _init_brightness, _init_extra_brightness, _init_noiseAmplitude, _init_extra_noiseAmplitude, _init_noiseFrequency, _init_extra_noiseFrequency, _init_noiseOctaves, _init_extra_noiseOctaves, _init_isVolumetric, _init_extra_isVolumetric],
        c: [_Tr2PointLight, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2PointLight",
        family: "eve/lights"
      })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.notify, io, io.persist, type, type.string], 16, "lightProfilePath"], [[io, io.read, void 0, type.objectRef("Tr2LightProfileRes")], 16, "lightProfile"], [[io, io.notify, io, io.persist, type, type.int32, void 0, schema.enum("PerLightShadowSetting")], 16, "castsShadows"], [[io, io.persist, type, type.uint16], 16, "flags"], [[io, io.persist, type, type.vec3], 16, "position"], [[io, io.persist, type, type.quat], 16, "rotation"], [[io, io.notify, io, io.persist, type, type.int32], 16, "boneIndex"], [[io, io.persist, type, type.float32], 16, "radius"], [[io, io.persist, type, type.float32], 16, "innerRadius"], [[io, io.notify, io, io.persist, type, type.color], 16, "color"], [[io, io.notify, io, io.persist, type, type.float32], 16, "brightness"], [[io, io.persist, type, type.float32], 16, "noiseAmplitude"], [[io, io.persist, type, type.float32], 16, "noiseFrequency"], [[io, io.persist, type, type.uint32], 16, "noiseOctaves"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "isVolumetric"]], 0, void 0, _Tr2Light));
    }
    name = _init_name(this, "");
    lightProfilePath = (_init_extra_name(this), _init_lightProfilePath(this, ""));
    lightProfile = (_init_extra_lightProfilePath(this), _init_lightProfile(this, null));

    /** m_lightData.castsShadows (PerLightShadowSetting) [READWRITE, PERSIST, NOTIFY, ENUM] */
    castsShadows = (_init_extra_lightProfile(this), _init_castsShadows(this, 0));

    /** m_lightData.flags (uint16_t) [READWRITE, PERSIST] */
    flags = (_init_extra_castsShadows(this), _init_flags(this, 1));

    /** m_lightData.position (Vector3) [READWRITE, PERSIST] */
    position = (_init_extra_flags(this), _init_position(this, vec3.create()));

    /** m_lightData.rotation (Quaternion) [READWRITE, PERSIST] */
    rotation = (_init_extra_position(this), _init_rotation(this, quat.create()));

    /** m_lightData.boneIndex (int32_t) [READWRITE, PERSIST, NOTIFY] */
    boneIndex = (_init_extra_rotation(this), _init_boneIndex(this, -1));

    /** m_lightData.radius (float) [READWRITE, PERSIST] */
    radius = (_init_extra_boneIndex(this), _init_radius(this, 0));

    /** m_lightData.innerRadius (float) [READWRITE, PERSIST] */
    innerRadius = (_init_extra_radius(this), _init_innerRadius(this, 0));

    /** m_lightData.color (Color) [READWRITE, PERSIST, NOTIFY] */
    color = (_init_extra_innerRadius(this), _init_color(this, vec4.createLinear()));

    /** m_lightData.brightness (float) [READWRITE, PERSIST, NOTIFY] */
    brightness = (_init_extra_color(this), _init_brightness(this, 1));

    /** m_lightData.noiseAmplitude (float) [READWRITE, PERSIST] */
    noiseAmplitude = (_init_extra_brightness(this), _init_noiseAmplitude(this, 0));

    /** m_lightData.noiseFrequency (float) [READWRITE, PERSIST] */
    noiseFrequency = (_init_extra_noiseAmplitude(this), _init_noiseFrequency(this, 1));

    /** m_lightData.noiseOctaves (uint32_t) [READWRITE, PERSIST] */
    noiseOctaves = (_init_extra_noiseFrequency(this), _init_noiseOctaves(this, 1));

    /** m_lightData.isVolumetric (bool) [READWRITE, NOTIFY, PERSIST] */
    isVolumetric = (_init_extra_noiseOctaves(this), _init_isVolumetric(this, false));
    type = (_init_extra_isVolumetric(this), _Tr2Light.POINT_LIGHT);
  }];
  LightDataFields = ["flags", "position", "rotation", "boneIndex", "radius", "innerRadius", "color", "brightness", "noiseAmplitude", "noiseFrequency", "noiseOctaves", "castsShadows", "isVolumetric"];
  constructor() {
    super(_Tr2PointLight), _initClass();
  }
}();

export { _Tr2PointLight as Tr2PointLight };
//# sourceMappingURL=Tr2PointLight.js.map
