import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec2 } from '@carbonenginejs/runtime-utils/vec2';

let _initClass, _init_rotationCenter, _init_extra_rotationCenter, _init_scalingCenter, _init_extra_scalingCenter, _init_useTransform, _init_extra_useTransform, _init_name, _init_extra_name, _init_rotation, _init_extra_rotation, _init_scale, _init_extra_scale, _init_scalingRotation, _init_extra_scalingRotation, _init_translation, _init_extra_translation;

/** Tr2Sprite2dTexture (sprite2d) - generated from schema shapeHash 2861e5a5.... */
let _Tr2Sprite2dTexture;
class Tr2Sprite2dTexture extends CjsModel {
  static {
    ({
      e: [_init_rotationCenter, _init_extra_rotationCenter, _init_scalingCenter, _init_extra_scalingCenter, _init_useTransform, _init_extra_useTransform, _init_name, _init_extra_name, _init_rotation, _init_extra_rotation, _init_scale, _init_extra_scale, _init_scalingRotation, _init_extra_scalingRotation, _init_translation, _init_extra_translation],
      c: [_Tr2Sprite2dTexture, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2Sprite2dTexture",
      family: "sprite2d"
    })], [[[io, io.notify, io, io.readwrite, type, type.vec2], 16, "rotationCenter"], [[io, io.notify, io, io.readwrite, type, type.vec2], 16, "scalingCenter"], [[io, io.notify, io, io.readwrite, type, type.boolean], 16, "useTransform"], [[io, io.readwrite, type, type.string], 16, "name"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "rotation"], [[io, io.notify, io, io.readwrite, type, type.vec2], 16, "scale"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "scalingRotation"], [[io, io.notify, io, io.readwrite, type, type.vec2], 16, "translation"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_translation(this);
  }
  /** m_rotationCenter (Vector2) [READWRITE, NOTIFY] */
  rotationCenter = _init_rotationCenter(this, vec2.fromValues(0.5, 0.5));

  /** m_scalingCenter (Vector2) [READWRITE, NOTIFY] */
  scalingCenter = (_init_extra_rotationCenter(this), _init_scalingCenter(this, vec2.fromValues(0.5, 0.5)));

  /** m_useTransform (bool) [READWRITE, NOTIFY] */
  useTransform = (_init_extra_scalingCenter(this), _init_useTransform(this, false));

  /** m_name (std::wstring) [READWRITE] */
  name = (_init_extra_useTransform(this), _init_name(this, ""));

  /** m_rotation (float) [READWRITE, NOTIFY] */
  rotation = (_init_extra_name(this), _init_rotation(this, 0));

  /** m_scale (Vector2) [READWRITE, NOTIFY] */
  scale = (_init_extra_rotation(this), _init_scale(this, vec2.fromValues(1, 1)));

  /** m_scalingRotation (float) [READWRITE, NOTIFY] */
  scalingRotation = (_init_extra_scale(this), _init_scalingRotation(this, 0));

  /** m_translation (Vector2) [READWRITE, NOTIFY] */
  translation = (_init_extra_scalingRotation(this), _init_translation(this, vec2.create()));
  static {
    _initClass();
  }
}

export { _Tr2Sprite2dTexture as Tr2Sprite2dTexture };
//# sourceMappingURL=Tr2Sprite2dTexture.js.map
