import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { Tr2SpriteObjectBase as _Tr2SpriteObjectBase } from './Tr2SpriteObjectBase.js';
import { vec2 } from '@carbonenginejs/runtime-utils/vec2';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initClass, _init_blendMode, _init_extra_blendMode, _init_spriteEffect, _init_extra_spriteEffect, _init_spriteTarget, _init_extra_spriteTarget, _init_color, _init_extra_color, _init_depth, _init_extra_depth, _init_glowBrightness, _init_extra_glowBrightness, _init_glowColor, _init_extra_glowColor, _init_glowExpand, _init_extra_glowExpand, _init_glowFactor, _init_extra_glowFactor, _init_shadowOffset, _init_extra_shadowOffset, _init_outlineColor, _init_extra_outlineColor, _init_outlineThreshold, _init_extra_outlineThreshold, _init_shadowColor, _init_extra_shadowColor;

/** Tr2SpriteObject (sprite2d) - generated from schema shapeHash e61ac2e6.... */
let _Tr2SpriteObject;
new class extends _identity {
  static [class Tr2SpriteObject extends _Tr2SpriteObjectBase {
    static {
      ({
        e: [_init_blendMode, _init_extra_blendMode, _init_spriteEffect, _init_extra_spriteEffect, _init_spriteTarget, _init_extra_spriteTarget, _init_color, _init_extra_color, _init_depth, _init_extra_depth, _init_glowBrightness, _init_extra_glowBrightness, _init_glowColor, _init_extra_glowColor, _init_glowExpand, _init_extra_glowExpand, _init_glowFactor, _init_extra_glowFactor, _init_shadowOffset, _init_extra_shadowOffset, _init_outlineColor, _init_extra_outlineColor, _init_outlineThreshold, _init_extra_outlineThreshold, _init_shadowColor, _init_extra_shadowColor],
        c: [_Tr2SpriteObject, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2SpriteObject",
        family: "sprite2d"
      })], [[[io, io.notify, io, io.readwrite, type, type.int32, void 0, type.enum("Tr2SpriteObjectBlendMode")], 16, "blendMode"], [[io, io.notify, io, io.readwrite, type, type.int32, void 0, type.enum("Tr2SpriteObjectEffect")], 16, "spriteEffect"], [[io, io.notify, io, io.readwrite, type, type.int32, void 0, type.enum("Tr2SpriteTarget")], 16, "spriteTarget"], [[io, io.notify, io, io.readwrite, type, type.color], 16, "color"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "depth"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "glowBrightness"], [[io, io.notify, io, io.readwrite, type, type.color], 16, "glowColor"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "glowExpand"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "glowFactor"], [[io, io.notify, io, io.readwrite, type, type.vec2], 16, "shadowOffset"], [[io, io.notify, io, io.readwrite, type, type.color], 16, "outlineColor"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "outlineThreshold"], [[io, io.notify, io, io.readwrite, type, type.color], 16, "shadowColor"]], 0, void 0, _Tr2SpriteObjectBase));
    }
    constructor(...args) {
      super(...args);
      _init_extra_shadowColor(this);
    }
    /** m_blendMode (Tr2SpriteObjectBlendMode - enum Tr2SpriteObjectBlendMode) [READWRITE, ENUM, NOTIFY] */
    blendMode = _init_blendMode(this, 0);

    /** m_spriteEffect (Tr2SpriteObjectEffect - enum Tr2SpriteObjectEffect) [READWRITE, ENUM, NOTIFY] */
    spriteEffect = (_init_extra_blendMode(this), _init_spriteEffect(this, 0));

    /** m_target (Tr2SpriteTarget - enum Tr2SpriteTarget) [READWRITE, ENUM, NOTIFY] */
    spriteTarget = (_init_extra_spriteEffect(this), _init_spriteTarget(this, 1));

    /** m_color (Color) [READWRITE, NOTIFY] */
    color = (_init_extra_spriteTarget(this), _init_color(this, vec4.fromValues(1, 1, 1, 1)));

    /** m_depth (float) [READWRITE, NOTIFY] */
    depth = (_init_extra_color(this), _init_depth(this, 0));

    /** m_glowBrightness (float) [READWRITE, NOTIFY] */
    glowBrightness = (_init_extra_depth(this), _init_glowBrightness(this, 1));

    /** m_glowColor (Color) [READWRITE, NOTIFY] */
    glowColor = (_init_extra_glowBrightness(this), _init_glowColor(this, vec4.fromValues(1, 1, 1, 1)));

    /** m_glowExpand (float) [READWRITE, NOTIFY] */
    glowExpand = (_init_extra_glowColor(this), _init_glowExpand(this, 0));

    /** m_glowFactor (float) [READWRITE, NOTIFY] */
    glowFactor = (_init_extra_glowExpand(this), _init_glowFactor(this, 0));

    /** m_shadowOffset (Vector2) [READWRITE, NOTIFY] */
    shadowOffset = (_init_extra_glowFactor(this), _init_shadowOffset(this, vec2.create()));

    /** m_outlineColor (Color) [READWRITE, NOTIFY] */
    outlineColor = (_init_extra_shadowOffset(this), _init_outlineColor(this, vec4.createLinear()));

    /** m_outlineThreshold (float) [READWRITE, NOTIFY] */
    outlineThreshold = (_init_extra_outlineColor(this), _init_outlineThreshold(this, 0));

    /** m_shadowColor (Color) [READWRITE, NOTIFY] */
    shadowColor = (_init_extra_outlineThreshold(this), _init_shadowColor(this, vec4.createLinear()));
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
  Tr2SpriteTarget = Object.freeze({
    COLOR: 1,
    GLOW: 2,
    COLOR_AND_GLOW: 3
  });
  constructor() {
    super(_Tr2SpriteObject), _initClass();
  }
}();

export { _Tr2SpriteObject as Tr2SpriteObject };
//# sourceMappingURL=Tr2SpriteObject.js.map
