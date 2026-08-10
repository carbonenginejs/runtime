import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initClass, _init_lightColor, _init_extra_lightColor, _init_flags, _init_extra_flags, _init_boneIndex, _init_extra_boneIndex, _init_name, _init_extra_name, _init_position, _init_extra_position, _init_radius, _init_extra_radius, _init_innerRadius, _init_extra_innerRadius, _init_brightness, _init_extra_brightness, _init_noiseAmplitude, _init_extra_noiseAmplitude, _init_noiseFrequency, _init_extra_noiseFrequency, _init_noiseOctaves, _init_extra_noiseOctaves;

/** EveSOFDataHullLightSetItem (eve) - generated from schema shapeHash 81e9a739.... */
let _EveSOFDataHullLightS;
new class extends _identity {
  static [class EveSOFDataHullLightSetItem extends CjsModel {
    static {
      ({
        e: [_init_lightColor, _init_extra_lightColor, _init_flags, _init_extra_flags, _init_boneIndex, _init_extra_boneIndex, _init_name, _init_extra_name, _init_position, _init_extra_position, _init_radius, _init_extra_radius, _init_innerRadius, _init_extra_innerRadius, _init_brightness, _init_extra_brightness, _init_noiseAmplitude, _init_extra_noiseAmplitude, _init_noiseFrequency, _init_extra_noiseFrequency, _init_noiseOctaves, _init_extra_noiseOctaves],
        c: [_EveSOFDataHullLightS, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveSOFDataHullLightSetItem",
        family: "eve"
      })], [[[io, io.persist, type, type.int32, void 0, type.enum("ColorType")], 16, "lightColor"], [[io, io.persist, type, type.uint16], 16, "flags"], [[io, io.persist, type, type.int32], 16, "boneIndex"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.vec3], 16, "position"], [[io, io.persist, type, type.float32], 16, "radius"], [[io, io.persist, type, type.float32], 16, "innerRadius"], [[io, io.persist, type, type.float32], 16, "brightness"], [[io, io.persist, type, type.float32], 16, "noiseAmplitude"], [[io, io.persist, type, type.float32], 16, "noiseFrequency"], [[io, io.persist, type, type.int32], 16, "noiseOctaves"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_noiseOctaves(this);
    }
    /** m_data.lightColor (SOFDataFactionColorChooser::ColorType - enum ColorType) [READWRITE, PERSIST, ENUM] */
    lightColor = _init_lightColor(this, 0);

    /** m_data.flags (uint16_t) [READWRITE, PERSIST] */
    flags = (_init_extra_lightColor(this), _init_flags(this, 1));

    /** m_data.boneIndex (int) [READWRITE, PERSIST] */
    boneIndex = (_init_extra_flags(this), _init_boneIndex(this, -1));

    /** m_name (std::string) [READWRITE, PERSIST] */
    name = (_init_extra_boneIndex(this), _init_name(this, ""));

    /** m_data.position (Vector3) [READWRITE, PERSIST] */
    position = (_init_extra_name(this), _init_position(this, vec3.create()));

    /** m_data.radius (float) [READWRITE, PERSIST] */
    radius = (_init_extra_position(this), _init_radius(this, 0));

    /** m_data.innerRadius (float) [READWRITE, PERSIST] */
    innerRadius = (_init_extra_radius(this), _init_innerRadius(this, 0));

    /** m_data.brightness (float) [READWRITE, PERSIST] */
    brightness = (_init_extra_innerRadius(this), _init_brightness(this, 0));

    /** m_data.noiseAmplitude (float) [READWRITE, PERSIST] */
    noiseAmplitude = (_init_extra_brightness(this), _init_noiseAmplitude(this, 0));

    /** m_data.noiseFrequency (float) [READWRITE, PERSIST] */
    noiseFrequency = (_init_extra_noiseAmplitude(this), _init_noiseFrequency(this, 1));

    /** m_data.noiseOctaves (int) [READWRITE, PERSIST] */
    noiseOctaves = (_init_extra_noiseFrequency(this), _init_noiseOctaves(this, 1));
  }];
  LightType = Object.freeze({
    POINT_LIGHT: 0,
    TEXTURED_POINT_LIGHT: 1,
    SPOT_LIGHT: 2
  });
  constructor() {
    super(_EveSOFDataHullLightS), _initClass();
  }
}();

export { _EveSOFDataHullLightS as EveSOFDataHullLightSetItem };
//# sourceMappingURL=EveSOFDataHullLightSetItem.js.map
