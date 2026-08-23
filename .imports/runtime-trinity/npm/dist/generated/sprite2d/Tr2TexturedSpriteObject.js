import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { Tr2SpriteObject as _Tr2SpriteObject } from './Tr2SpriteObject.js';

let _initClass, _init_texturePrimary, _init_extra_texturePrimary, _init_textureSecondary, _init_extra_textureSecondary;

/** Tr2TexturedSpriteObject (sprite2d) - generated from schema shapeHash 514b2638.... */
let _Tr2TexturedSpriteObj;
class Tr2TexturedSpriteObject extends _Tr2SpriteObject {
  static {
    ({
      e: [_init_texturePrimary, _init_extra_texturePrimary, _init_textureSecondary, _init_extra_textureSecondary],
      c: [_Tr2TexturedSpriteObj, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2TexturedSpriteObject",
      family: "sprite2d"
    })], [[type.objectRef("ITr2Sprite2dTexture"), 0, "texturePrimary"], [type.objectRef("ITr2Sprite2dTexture"), 0, "textureSecondary"]], 0, void 0, _Tr2SpriteObject));
  }
  constructor(...args) {
    super(...args);
    _init_extra_textureSecondary(this);
  }
  /** m_texturePrimary (ITr2Sprite2dTexturePtr) */
  texturePrimary = _init_texturePrimary(this, null);

  /** m_textureSecondary (ITr2Sprite2dTexturePtr) */
  textureSecondary = (_init_extra_texturePrimary(this), _init_textureSecondary(this, null));
  static {
    _initClass();
  }
}

export { _Tr2TexturedSpriteObj as Tr2TexturedSpriteObject };
//# sourceMappingURL=Tr2TexturedSpriteObject.js.map
