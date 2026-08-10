import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { Tr2SpriteObject as _Tr2SpriteObject } from './Tr2SpriteObject.js';

let _initClass, _init_shadowSpriteEffect, _init_extra_shadowSpriteEffect, _init_hasAuxiliaryTooltip, _init_extra_hasAuxiliaryTooltip, _init_textHeight, _init_extra_textHeight, _init_useSizeFromTexture, _init_extra_useSizeFromTexture, _init_useShadowSpriteEffect, _init_extra_useShadowSpriteEffect, _init_texturePrimary, _init_extra_texturePrimary, _init_pickRadius, _init_extra_pickRadius, _init_textWidth, _init_extra_textWidth;

/** Tr2Sprite2dTextObject (sprite2d) - generated from schema shapeHash cebd28e9.... */
let _Tr2Sprite2dTextObjec;
new class extends _identity {
  static [class Tr2Sprite2dTextObject extends _Tr2SpriteObject {
    static {
      ({
        e: [_init_shadowSpriteEffect, _init_extra_shadowSpriteEffect, _init_hasAuxiliaryTooltip, _init_extra_hasAuxiliaryTooltip, _init_textHeight, _init_extra_textHeight, _init_useSizeFromTexture, _init_extra_useSizeFromTexture, _init_useShadowSpriteEffect, _init_extra_useShadowSpriteEffect, _init_texturePrimary, _init_extra_texturePrimary, _init_pickRadius, _init_extra_pickRadius, _init_textWidth, _init_extra_textWidth],
        c: [_Tr2Sprite2dTextObjec, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2Sprite2dTextObject",
        family: "sprite2d"
      })], [[[io, io.notify, io, io.readwrite, type, type.int32, void 0, type.enum("Tr2SpriteObjectEffect")], 16, "shadowSpriteEffect"], [[io, io.readwrite, type, type.boolean], 16, "hasAuxiliaryTooltip"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "textHeight"], [[io, io.notify, io, io.readwrite, type, type.boolean], 16, "useSizeFromTexture"], [[io, io.notify, io, io.readwrite, type, type.boolean], 16, "useShadowSpriteEffect"], [[io, io.notify, io, io.readwrite, void 0, type.objectRef("ITr2Sprite2dTexture")], 16, "texturePrimary"], [[io, io.readwrite, type, type.float32], 16, "pickRadius"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "textWidth"]], 0, void 0, _Tr2SpriteObject));
    }
    constructor(...args) {
      super(...args);
      _init_extra_textWidth(this);
    }
    /** m_shadowSpriteEffect (Tr2SpriteObjectEffect - enum Tr2SpriteObjectEffect) [READWRITE, ENUM, NOTIFY] */
    shadowSpriteEffect = _init_shadowSpriteEffect(this, 43);

    /** m_hasAuxiliaryTooltip (bool) [READWRITE] */
    hasAuxiliaryTooltip = (_init_extra_shadowSpriteEffect(this), _init_hasAuxiliaryTooltip(this, false));

    /** m_textHeight (float) [READWRITE, NOTIFY] */
    textHeight = (_init_extra_hasAuxiliaryTooltip(this), _init_textHeight(this, 0));

    /** m_useSizeFromTexture (bool) [READWRITE, NOTIFY] */
    useSizeFromTexture = (_init_extra_textHeight(this), _init_useSizeFromTexture(this, false));

    /** m_useShadowSpriteEffect (bool) [READWRITE, NOTIFY] */
    useShadowSpriteEffect = (_init_extra_useSizeFromTexture(this), _init_useShadowSpriteEffect(this, false));

    /** m_texturePrimary (ITr2Sprite2dTexturePtr) [READWRITE, NOTIFY] */
    texturePrimary = (_init_extra_useShadowSpriteEffect(this), _init_texturePrimary(this, null));

    /** m_pickRadius (float) [READWRITE] */
    pickRadius = (_init_extra_texturePrimary(this), _init_pickRadius(this, 0));

    /** m_textWidth (float) [READWRITE, NOTIFY] */
    textWidth = (_init_extra_pickRadius(this), _init_textWidth(this, 0));
  }];
  Tr2SpriteObjectEffect = Object.freeze({
    TR2_SFX_NO_TEXTURE: 0,
    TR2_SFX_FILL_AA: 1,
    TR2_SFX_ONE_TEXTURE: 32,
    TR2_SFX_DOT: 33,
    TR2_SFX_NOALPHA: 34,
    TR2_SFX_DROPSHADOW: 35,
    TR2_SFX_OUTLINE: 36,
    TR2_SFX_COLOROVERLAY: 37,
    TR2_SFX_SOFTLIGHT: 38,
    TR2_SFX_BLUR: 39,
    TR2_SFX_BLURBACKGROUNDCOLORED: 40,
    TR2_SFX_BLURBACKGROUND: 41,
    TR2_SFX_GLOW: 42,
    TR2_SFX_FONT: 43,
    TR2_SFX_TWO_TEXTURES: 64,
    TR2_SFX_MASK: 65,
    TR2_SFX_COPY_DOT: 66,
    TR2_SFX_COUNT: 67,
    TR2_SFX_NONE: 4294967295
  });
  constructor() {
    super(_Tr2Sprite2dTextObjec), _initClass();
  }
}();

export { _Tr2Sprite2dTextObjec as Tr2Sprite2dTextObject };
//# sourceMappingURL=Tr2Sprite2dTextObject.js.map
