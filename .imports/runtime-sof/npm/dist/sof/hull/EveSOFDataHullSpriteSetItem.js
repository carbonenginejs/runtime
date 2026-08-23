import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initClass, _init_colorType, _init_extra_colorType, _init_boneIndex, _init_extra_boneIndex, _init_position, _init_extra_position, _init_blinkRate, _init_extra_blinkRate, _init_blinkPhase, _init_extra_blinkPhase, _init_minScale, _init_extra_minScale, _init_maxScale, _init_extra_maxScale, _init_falloff, _init_extra_falloff, _init_intensity, _init_extra_intensity, _init_saturation, _init_extra_saturation, _init_light, _init_extra_light;

/** EveSOFDataHullSpriteSetItem (eve) - generated from schema shapeHash f2705e61.... */
let _EveSOFDataHullSprite;
class EveSOFDataHullSpriteSetItem extends CjsModel {
  static {
    ({
      e: [_init_colorType, _init_extra_colorType, _init_boneIndex, _init_extra_boneIndex, _init_position, _init_extra_position, _init_blinkRate, _init_extra_blinkRate, _init_blinkPhase, _init_extra_blinkPhase, _init_minScale, _init_extra_minScale, _init_maxScale, _init_extra_maxScale, _init_falloff, _init_extra_falloff, _init_intensity, _init_extra_intensity, _init_saturation, _init_extra_saturation, _init_light, _init_extra_light],
      c: [_EveSOFDataHullSprite, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataHullSpriteSetItem",
      family: "eve"
    })], [[[io, io.persist, type, type.int32, void 0, type.enum("ColorType")], 16, "colorType"], [[io, io.persist, type, type.int32], 16, "boneIndex"], [[io, io.persist, type, type.vec3], 16, "position"], [[io, io.persist, type, type.float32], 16, "blinkRate"], [[io, io.persist, type, type.float32], 16, "blinkPhase"], [[io, io.persist, type, type.float32], 16, "minScale"], [[io, io.persist, type, type.float32], 16, "maxScale"], [[io, io.persist, type, type.float32], 16, "falloff"], [[io, io.persist, type, type.float32], 16, "intensity"], [[io, io.persist, type, type.float32], 16, "saturation"], [[io, io.persist, void 0, type.objectRef("EveSOFDataPointLightAttachment")], 16, "light"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_light(this);
  }
  /** m_colorType (SOFDataFactionColorChooser::ColorType - enum ColorType) [READWRITE, PERSIST, ENUM] */
  colorType = _init_colorType(this, 0);

  /** m_boneIndex (int32_t) [READWRITE, PERSIST] */
  boneIndex = (_init_extra_colorType(this), _init_boneIndex(this, 0));

  /** m_position (Vector3) [READWRITE, PERSIST] */
  position = (_init_extra_boneIndex(this), _init_position(this, vec3.create()));

  /** m_blinkRate (float) [READWRITE, PERSIST] */
  blinkRate = (_init_extra_position(this), _init_blinkRate(this, 0.1));

  /** m_blinkPhase (float) [READWRITE, PERSIST] */
  blinkPhase = (_init_extra_blinkRate(this), _init_blinkPhase(this, 0));

  /** m_minScale (float) [READWRITE, PERSIST] */
  minScale = (_init_extra_blinkPhase(this), _init_minScale(this, 1));

  /** m_maxScale (float) [READWRITE, PERSIST] */
  maxScale = (_init_extra_minScale(this), _init_maxScale(this, 10));

  /** m_falloff (float) [READWRITE, PERSIST] */
  falloff = (_init_extra_maxScale(this), _init_falloff(this, 0));

  /** m_intensity (float) [READWRITE, PERSIST] */
  intensity = (_init_extra_falloff(this), _init_intensity(this, 1));

  /** m_saturation (float) [READWRITE, PERSIST] */
  saturation = (_init_extra_intensity(this), _init_saturation(this, 1));

  /** m_light (EveSOFDataPointLightAttachmentPtr) [READWRITE, PERSIST] */
  light = (_init_extra_saturation(this), _init_light(this, null));
  static {
    _initClass();
  }
}

export { _EveSOFDataHullSprite as EveSOFDataHullSpriteSetItem };
//# sourceMappingURL=EveSOFDataHullSpriteSetItem.js.map
