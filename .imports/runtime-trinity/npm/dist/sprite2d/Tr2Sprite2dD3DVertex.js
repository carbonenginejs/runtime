import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { Tr2Sprite2dVertexBase as _Tr2Sprite2dVertexBas } from './Tr2Sprite2dVertexBase.js';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initClass, _init_clipRect, _init_extra_clipRect, _init_glowBrightness, _init_extra_glowBrightness, _init_transformIndex, _init_extra_transformIndex, _init_blendMode, _init_extra_blendMode, _init_spriteEffect, _init_extra_spriteEffect, _init_tileMode, _init_extra_tileMode, _init_outlineColor, _init_extra_outlineColor, _init_outlineThreshold, _init_extra_outlineThreshold;

/** Tr2Sprite2dD3DVertex (sprite2d) - generated from schema shapeHash 6e0618c5.... */
let _Tr2Sprite2dD3DVertex;
class Tr2Sprite2dD3DVertex extends _Tr2Sprite2dVertexBas {
  static {
    ({
      e: [_init_clipRect, _init_extra_clipRect, _init_glowBrightness, _init_extra_glowBrightness, _init_transformIndex, _init_extra_transformIndex, _init_blendMode, _init_extra_blendMode, _init_spriteEffect, _init_extra_spriteEffect, _init_tileMode, _init_extra_tileMode, _init_outlineColor, _init_extra_outlineColor, _init_outlineThreshold, _init_extra_outlineThreshold],
      c: [_Tr2Sprite2dD3DVertex, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2Sprite2dD3DVertex",
      family: "sprite2d"
    })], [[type.rawStruct("Tr2Sprite2dClipRect"), 0, "clipRect"], [[type, type.float32], 16, "glowBrightness"], [[type, type.uint8], 16, "transformIndex"], [[type, type.uint8], 16, "blendMode"], [[type, type.uint8], 16, "spriteEffect"], [[type, type.uint8], 16, "tileMode"], [[type, type.color], 16, "outlineColor"], [[type, type.float32], 16, "outlineThreshold"]], 0, void 0, _Tr2Sprite2dVertexBas));
  }
  constructor(...args) {
    super(...args);
    _init_extra_outlineThreshold(this);
  }
  /** clipRect (Tr2Sprite2dClipRect) */
  clipRect = _init_clipRect(this, null);

  /** glowBrightness (float) */
  glowBrightness = (_init_extra_clipRect(this), _init_glowBrightness(this, 0));

  /** transformIndex (uint8_t) */
  transformIndex = (_init_extra_glowBrightness(this), _init_transformIndex(this, 0));

  /** blendMode (uint8_t) */
  blendMode = (_init_extra_transformIndex(this), _init_blendMode(this, 0));

  /** spriteEffect (uint8_t) */
  spriteEffect = (_init_extra_blendMode(this), _init_spriteEffect(this, 0));

  /** tileMode (uint8_t) */
  tileMode = (_init_extra_spriteEffect(this), _init_tileMode(this, 0));

  /** outlineColor (Color) */
  outlineColor = (_init_extra_tileMode(this), _init_outlineColor(this, vec4.create()));

  /** outlineThreshold (float) */
  outlineThreshold = (_init_extra_outlineColor(this), _init_outlineThreshold(this, 0));
  static {
    _initClass();
  }
}

export { _Tr2Sprite2dD3DVertex as Tr2Sprite2dD3DVertex };
//# sourceMappingURL=Tr2Sprite2dD3DVertex.js.map
