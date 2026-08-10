import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, impl } from '@carbonenginejs/runtime-utils/schema';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { Tr2Light as _Tr2Light } from './Tr2Light.js';

let _initProto, _initClass, _init_castsShadows, _init_extra_castsShadows, _init_flags, _init_extra_flags, _init_position, _init_extra_position, _init_rotation, _init_extra_rotation, _init_boneIndex, _init_extra_boneIndex, _init_radius, _init_extra_radius, _init_innerRadius, _init_extra_innerRadius, _init_innerAngle, _init_extra_innerAngle, _init_outerAngle, _init_extra_outerAngle, _init_color, _init_extra_color, _init_brightness, _init_extra_brightness, _init_noiseAmplitude, _init_extra_noiseAmplitude, _init_noiseFrequency, _init_extra_noiseFrequency, _init_noiseOctaves, _init_extra_noiseOctaves, _init_isVolumetric, _init_extra_isVolumetric, _init_name, _init_extra_name, _init_factionColor, _init_extra_factionColor, _init_saturation, _init_extra_saturation, _init_isSpotlight, _init_extra_isSpotlight, _init_lightProfilePath, _init_extra_lightProfilePath, _init_lightProfile, _init_extra_lightProfile;

/** A light whose colour is derived from a faction palette entry blended by a saturation factor, in addition to its own authored light attributes. */
let _Tr2FactionLight;
new class extends _identity {
  static [class Tr2FactionLight extends _Tr2Light {
    static {
      ({
        e: [_init_castsShadows, _init_extra_castsShadows, _init_flags, _init_extra_flags, _init_position, _init_extra_position, _init_rotation, _init_extra_rotation, _init_boneIndex, _init_extra_boneIndex, _init_radius, _init_extra_radius, _init_innerRadius, _init_extra_innerRadius, _init_innerAngle, _init_extra_innerAngle, _init_outerAngle, _init_extra_outerAngle, _init_color, _init_extra_color, _init_brightness, _init_extra_brightness, _init_noiseAmplitude, _init_extra_noiseAmplitude, _init_noiseFrequency, _init_extra_noiseFrequency, _init_noiseOctaves, _init_extra_noiseOctaves, _init_isVolumetric, _init_extra_isVolumetric, _init_name, _init_extra_name, _init_factionColor, _init_extra_factionColor, _init_saturation, _init_extra_saturation, _init_isSpotlight, _init_extra_isSpotlight, _init_lightProfilePath, _init_extra_lightProfilePath, _init_lightProfile, _init_extra_lightProfile, _initProto],
        c: [_Tr2FactionLight, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2FactionLight",
        family: "eve/lights"
      })], [[[io, io.notify, io, io.persist, type, type.int32, void 0, type.enum("PerLightShadowSetting")], 16, "castsShadows"], [[io, io.persist, type, type.uint16], 16, "flags"], [[io, io.persist, type, type.vec3], 16, "position"], [[io, io.persist, type, type.quat], 16, "rotation"], [[io, io.notify, io, io.persist, type, type.int32], 16, "boneIndex"], [[io, io.persist, type, type.float32], 16, "radius"], [[io, io.persist, type, type.float32], 16, "innerRadius"], [[io, io.persist, type, type.float32], 16, "innerAngle"], [[io, io.persist, type, type.float32], 16, "outerAngle"], [[io, io.notify, io, io.persist, type, type.color], 16, "color"], [[io, io.notify, io, io.persist, type, type.float32], 16, "brightness"], [[io, io.persist, type, type.float32], 16, "noiseAmplitude"], [[io, io.persist, type, type.float32], 16, "noiseFrequency"], [[io, io.persist, type, type.uint32], 16, "noiseOctaves"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "isVolumetric"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.notify, io, io.persist, type, type.int32], 16, "factionColor"], [[io, io.notify, io, io.persist, type, type.float32], 16, "saturation"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "isSpotlight"], [[io, io.notify, io, io.persist, type, type.string], 16, "lightProfilePath"], [[io, io.read, void 0, type.objectRef("Tr2LightProfileRes")], 16, "lightProfile"], [[impl, impl.implemented], 18, "SetInheritProperties"], [[impl, impl.implemented], 18, "SetLightColorFromFactionColor"], [[impl, impl.implemented], 18, "GetSelectedColor"], [[impl, impl.adapted, void 0, impl.reason("Browser property notifications identify the changed field by name rather than Carbon's Be::Var pointer.")], 18, "OnModified"]], 0, void 0, _Tr2Light));
    }
    #parentColorSet = (_initProto(this), null);

    /** m_lightData.castsShadows (PerLightShadowSetting) [READWRITE, PERSIST, NOTIFY, ENUM] */
    castsShadows = _init_castsShadows(this, 0);

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

    /** m_lightData.innerAngle (float) [READWRITE, PERSIST] */
    innerAngle = (_init_extra_innerRadius(this), _init_innerAngle(this, 0));

    /** m_lightData.outerAngle (float) [READWRITE, PERSIST] */
    outerAngle = (_init_extra_innerAngle(this), _init_outerAngle(this, 0));

    /** m_lightData.color (Color) [READWRITE, PERSIST, NOTIFY] */
    color = (_init_extra_outerAngle(this), _init_color(this, vec4.createLinear()));

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

    /** m_name (std::string) [READWRITE, PERSIST] */
    name = (_init_extra_isVolumetric(this), _init_name(this, ""));

    /** m_selectedColor (int) [READWRITE, PERSIST, NOTIFY, ENUM] */
    factionColor = (_init_extra_name(this), _init_factionColor(this, -1));

    /** m_saturation (float) [READWRITE, PERSIST, NOTIFY] */
    saturation = (_init_extra_factionColor(this), _init_saturation(this, 1));

    /** m_isSpotlight (bool) [READWRITE, PERSIST, NOTIFY] */
    isSpotlight = (_init_extra_saturation(this), _init_isSpotlight(this, false));

    /** m_lightProfilePath (std::wstring) [READWRITE, PERSIST, NOTIFY] */
    lightProfilePath = (_init_extra_isSpotlight(this), _init_lightProfilePath(this, ""));

    /** m_lightProfile (Tr2LightProfileResPtr) [READ] */
    lightProfile = (_init_extra_lightProfilePath(this), _init_lightProfile(this, null));
    type = (_init_extra_lightProfile(this), _Tr2Light.POINT_LIGHT);

    /**
     * Stores an inherited faction colour palette and recomputes the light's colour from it.
     */
    SetInheritProperties(colorSet) {
      if (colorSet) {
        this.#parentColorSet = colorSet;
        this.SetLightColorFromFactionColor();
      }
    }

    /**
     * Recolours the light by blending its palette entry's luminance with the full palette colour by the saturation factor, reporting false when no palette entry is available.
     */
    SetLightColorFromFactionColor() {
      const color = this.#parentColorSet?.[this.factionColor];
      if (!color) {
        return false;
      }
      const intensity = color[0] * 0.299 + color[1] * 0.587 + color[2] * 0.114;
      const saturation = Math.max(0, Number(this.saturation) || 0);
      this.color[0] = intensity + (color[0] - intensity) * saturation;
      this.color[1] = intensity + (color[1] - intensity) * saturation;
      this.color[2] = intensity + (color[2] - intensity) * saturation;
      this.color[3] = color[3] ?? 1;
      return true;
    }

    /**
     * The light's current colour.
     */
    GetSelectedColor() {
      return this.color;
    }

    /**
     * Switches the light between spot and point when the spotlight flag is edited, and recomputes the faction-derived colour when the faction colour or saturation changes.
     */
    OnModified(propertyName) {
      if (propertyName === "isSpotlight") {
        this.type = this.isSpotlight ? _Tr2Light.SPOT_LIGHT : _Tr2Light.POINT_LIGHT;
      }
      if (propertyName === "factionColor" || propertyName === "saturation") {
        this.SetLightColorFromFactionColor();
      }
      return true;
    }
  }];
  LightDataFields = ["flags", "position", "rotation", "boneIndex", "radius", "innerRadius", "color", "brightness", "innerAngle", "outerAngle", "noiseAmplitude", "noiseFrequency", "noiseOctaves", "castsShadows", "isVolumetric"];
  constructor() {
    super(_Tr2FactionLight), _initClass();
  }
}();

export { _Tr2FactionLight as Tr2FactionLight };
//# sourceMappingURL=Tr2FactionLight.js.map
