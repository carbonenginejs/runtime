import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initClass, _init_colorType, _init_extra_colorType, _init_boneIndex, _init_extra_boneIndex, _init_transform, _init_extra_transform, _init_boosterGainInfluence, _init_extra_boosterGainInfluence, _init_groupIndex, _init_extra_groupIndex, _init_spriteScale, _init_extra_spriteScale, _init_coneIntensity, _init_extra_coneIntensity, _init_flareIntensity, _init_extra_flareIntensity, _init_spriteIntensity, _init_extra_spriteIntensity, _init_saturation, _init_extra_saturation, _init_light, _init_extra_light;

/** EveSOFDataHullSpotlightSetItem (eve) - generated from schema shapeHash 653439c4.... */
let _EveSOFDataHullSpotli;
class EveSOFDataHullSpotlightSetItem extends CjsModel {
  static {
    ({
      e: [_init_colorType, _init_extra_colorType, _init_boneIndex, _init_extra_boneIndex, _init_transform, _init_extra_transform, _init_boosterGainInfluence, _init_extra_boosterGainInfluence, _init_groupIndex, _init_extra_groupIndex, _init_spriteScale, _init_extra_spriteScale, _init_coneIntensity, _init_extra_coneIntensity, _init_flareIntensity, _init_extra_flareIntensity, _init_spriteIntensity, _init_extra_spriteIntensity, _init_saturation, _init_extra_saturation, _init_light, _init_extra_light],
      c: [_EveSOFDataHullSpotli, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataHullSpotlightSetItem",
      family: "eve"
    })], [[[io, io.persist, type, type.int32, void 0, type.enum("ColorType")], 16, "colorType"], [[io, io.persist, type, type.int32], 16, "boneIndex"], [[io, io.persist, type, type.mat4], 16, "transform"], [[io, io.persist, type, type.boolean], 16, "boosterGainInfluence"], [[io, io.persist, type, type.int32], 16, "groupIndex"], [[io, io.persist, type, type.vec3], 16, "spriteScale"], [[io, io.persist, type, type.float32], 16, "coneIntensity"], [[io, io.persist, type, type.float32], 16, "flareIntensity"], [[io, io.persist, type, type.float32], 16, "spriteIntensity"], [[io, io.persist, type, type.float32], 16, "saturation"], [[io, io.persist, void 0, type.objectRef("EveSOFDataSpotLightAttachment")], 16, "light"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_light(this);
  }
  /** m_colorType (SOFDataFactionColorChooser::ColorType - enum ColorType) [READWRITE, PERSIST, ENUM] */
  colorType = _init_colorType(this, 12);

  /** m_boneIndex (int32_t) [READWRITE, PERSIST] */
  boneIndex = (_init_extra_colorType(this), _init_boneIndex(this, 0));

  /** m_transform (Matrix) [READWRITE, PERSIST] */
  transform = (_init_extra_boneIndex(this), _init_transform(this, mat4.create()));

  /** m_boosterGainInfluence (bool) [READWRITE, PERSIST] */
  boosterGainInfluence = (_init_extra_transform(this), _init_boosterGainInfluence(this, false));

  /** m_groupIndex (int32_t) [READWRITE, PERSIST] */
  groupIndex = (_init_extra_boosterGainInfluence(this), _init_groupIndex(this, -1));

  /** m_spriteScale (Vector3) [READWRITE, PERSIST] */
  spriteScale = (_init_extra_groupIndex(this), _init_spriteScale(this, vec3.fromValues(1, 1, 1)));

  /** m_coneIntensity (float) [READWRITE, PERSIST] */
  coneIntensity = (_init_extra_spriteScale(this), _init_coneIntensity(this, 0));

  /** m_flareIntensity (float) [READWRITE, PERSIST] */
  flareIntensity = (_init_extra_coneIntensity(this), _init_flareIntensity(this, 0));

  /** m_spriteIntensity (float) [READWRITE, PERSIST] */
  spriteIntensity = (_init_extra_flareIntensity(this), _init_spriteIntensity(this, 0));

  /** m_saturation (float) [READWRITE, PERSIST] */
  saturation = (_init_extra_spriteIntensity(this), _init_saturation(this, 1));

  /** m_light (EveSOFDataSpotLightAttachmentPtr) [READWRITE, PERSIST] */
  light = (_init_extra_saturation(this), _init_light(this, null));
  static {
    _initClass();
  }
}

export { _EveSOFDataHullSpotli as EveSOFDataHullSpotlightSetItem };
//# sourceMappingURL=EveSOFDataHullSpotlightSetItem.js.map
