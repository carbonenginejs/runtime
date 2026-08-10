import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { Tr2Sprite2dContainer as _Tr2Sprite2dContainer } from './Tr2Sprite2dContainer.js';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initClass, _init_blendMode, _init_extra_blendMode, _init_spriteEffect, _init_extra_spriteEffect, _init_backgroundColor, _init_extra_backgroundColor, _init_color, _init_extra_color, _init_clearBackground, _init_extra_clearBackground;

/** Tr2Sprite2dLayer (sprite2d) - generated from schema shapeHash 2e706a59.... */
let _Tr2Sprite2dLayer;
new class extends _identity {
  static [class Tr2Sprite2dLayer extends _Tr2Sprite2dContainer {
    static {
      ({
        e: [_init_blendMode, _init_extra_blendMode, _init_spriteEffect, _init_extra_spriteEffect, _init_backgroundColor, _init_extra_backgroundColor, _init_color, _init_extra_color, _init_clearBackground, _init_extra_clearBackground],
        c: [_Tr2Sprite2dLayer, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2Sprite2dLayer",
        family: "sprite2d"
      })], [[[io, io.notify, io, io.readwrite, type, type.int32, void 0, type.enum("Tr2SpriteObjectBlendMode")], 16, "blendMode"], [[io, io.notify, io, io.readwrite, type, type.int32, void 0, type.enum("Tr2SpriteObjectEffect")], 16, "spriteEffect"], [[io, io.notify, io, io.persist, type, type.color], 16, "backgroundColor"], [[io, io.notify, io, io.persist, type, type.color], 16, "color"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "clearBackground"]], 0, void 0, _Tr2Sprite2dContainer));
    }
    constructor(...args) {
      super(...args);
      _init_extra_clearBackground(this);
    }
    /** m_blendMode (Tr2SpriteObjectBlendMode - enum Tr2SpriteObjectBlendMode) [READWRITE, ENUM, NOTIFY] */
    blendMode = _init_blendMode(this, 0);

    /** m_spriteEffect (Tr2SpriteObjectEffect - enum Tr2SpriteObjectEffect) [READWRITE, ENUM, NOTIFY] */
    spriteEffect = (_init_extra_blendMode(this), _init_spriteEffect(this, 0));

    /** m_backgroundColor (Color) [READWRITE, PERSIST, NOTIFY] */
    backgroundColor = (_init_extra_spriteEffect(this), _init_backgroundColor(this, vec4.create()));

    /** m_color (Color) [READWRITE, PERSIST, NOTIFY] */
    color = (_init_extra_backgroundColor(this), _init_color(this, vec4.fromValues(1, 1, 1, 1)));

    /** m_clearBackground (bool) [READWRITE, PERSIST, NOTIFY] */
    clearBackground = (_init_extra_color(this), _init_clearBackground(this, true));
  }];
  Tr2SpriteObjectBlendMode = Object.freeze({
    TR2_SBM_NONE: 0,
    TR2_SBM_BLEND: 1,
    TR2_SBM_ADD: 2,
    TR2_SBM_ADDX2: 3
  });
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
    super(_Tr2Sprite2dLayer), _initClass();
  }
}();

export { _Tr2Sprite2dLayer as Tr2Sprite2dLayer };
//# sourceMappingURL=Tr2Sprite2dLayer.js.map
