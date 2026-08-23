import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { Tr2TexturedSpriteObject as _Tr2TexturedSpriteObj } from './Tr2TexturedSpriteObject.js';

let _initClass, _init_effectOpacity, _init_extra_effectOpacity, _init_useSizeFromTexture, _init_extra_useSizeFromTexture, _init_pickRadius, _init_extra_pickRadius, _init_saturation, _init_extra_saturation;

/** Tr2Sprite2d (sprite2d) - generated from schema shapeHash 83f2a5f2.... */
let _Tr2Sprite2d;
class Tr2Sprite2d extends _Tr2TexturedSpriteObj {
  static {
    ({
      e: [_init_effectOpacity, _init_extra_effectOpacity, _init_useSizeFromTexture, _init_extra_useSizeFromTexture, _init_pickRadius, _init_extra_pickRadius, _init_saturation, _init_extra_saturation],
      c: [_Tr2Sprite2d, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2Sprite2d",
      family: "sprite2d"
    })], [[[io, io.notify, io, io.readwrite, type, type.float32], 16, "effectOpacity"], [[io, io.notify, io, io.readwrite, type, type.boolean], 16, "useSizeFromTexture"], [[io, io.readwrite, type, type.float32], 16, "pickRadius"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "saturation"]], 0, void 0, _Tr2TexturedSpriteObj));
  }
  constructor(...args) {
    super(...args);
    _init_extra_saturation(this);
  }
  /** m_effectOpacity (float) [READWRITE, NOTIFY] */
  effectOpacity = _init_effectOpacity(this, 1);

  /** m_useSizeFromTexture (bool) [READWRITE, NOTIFY] */
  useSizeFromTexture = (_init_extra_effectOpacity(this), _init_useSizeFromTexture(this, false));

  /** m_pickRadius (float) [READWRITE] */
  pickRadius = (_init_extra_useSizeFromTexture(this), _init_pickRadius(this, 0));

  /** m_saturation (float) [READWRITE, NOTIFY] */
  saturation = (_init_extra_pickRadius(this), _init_saturation(this, 1));
  static {
    _initClass();
  }
}

export { _Tr2Sprite2d as Tr2Sprite2d };
//# sourceMappingURL=Tr2Sprite2d.js.map
