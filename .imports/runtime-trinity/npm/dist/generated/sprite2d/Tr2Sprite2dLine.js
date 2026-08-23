import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { Tr2TexturedSpriteObject as _Tr2TexturedSpriteObj } from './Tr2TexturedSpriteObject.js';
import { vec2 } from '@carbonenginejs/runtime-utils/vec2';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initClass, _init_textureOffsetBase, _init_extra_textureOffsetBase, _init_colorTo, _init_extra_colorTo, _init_colorFrom, _init_extra_colorFrom, _init_translationTo, _init_extra_translationTo, _init_translationFrom, _init_extra_translationFrom, _init_textureOffset, _init_extra_textureOffset, _init_textureWidth, _init_extra_textureWidth, _init_widthTo, _init_extra_widthTo, _init_widthFrom, _init_extra_widthFrom;

/** Tr2Sprite2dLine (sprite2d) - generated from schema shapeHash 678e9bc0.... */
let _Tr2Sprite2dLine;
class Tr2Sprite2dLine extends _Tr2TexturedSpriteObj {
  static {
    ({
      e: [_init_textureOffsetBase, _init_extra_textureOffsetBase, _init_colorTo, _init_extra_colorTo, _init_colorFrom, _init_extra_colorFrom, _init_translationTo, _init_extra_translationTo, _init_translationFrom, _init_extra_translationFrom, _init_textureOffset, _init_extra_textureOffset, _init_textureWidth, _init_extra_textureWidth, _init_widthTo, _init_extra_widthTo, _init_widthFrom, _init_extra_widthFrom],
      c: [_Tr2Sprite2dLine, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2Sprite2dLine",
      family: "sprite2d"
    })], [[[io, io.notify, io, io.readwrite, type, type.float32], 16, "textureOffsetBase"], [[io, io.notify, io, io.readwrite, type, type.color], 16, "colorTo"], [[io, io.notify, io, io.readwrite, type, type.color], 16, "colorFrom"], [[io, io.notify, io, io.readwrite, type, type.vec2], 16, "translationTo"], [[io, io.notify, io, io.readwrite, type, type.vec2], 16, "translationFrom"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "textureOffset"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "textureWidth"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "widthTo"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "widthFrom"]], 0, void 0, _Tr2TexturedSpriteObj));
  }
  constructor(...args) {
    super(...args);
    _init_extra_widthFrom(this);
  }
  /** m_textureOffsetBase (float) [READWRITE, NOTIFY] */
  textureOffsetBase = _init_textureOffsetBase(this, 0);

  /** m_colorTo (Color) [READWRITE, NOTIFY] */
  colorTo = (_init_extra_textureOffsetBase(this), _init_colorTo(this, vec4.fromValues(1, 1, 1, 1)));

  /** m_colorFrom (Color) [READWRITE, NOTIFY] */
  colorFrom = (_init_extra_colorTo(this), _init_colorFrom(this, vec4.fromValues(1, 1, 1, 1)));

  /** m_translationTo (Vector2) [READWRITE, NOTIFY] */
  translationTo = (_init_extra_colorFrom(this), _init_translationTo(this, vec2.create()));

  /** m_translationFrom (Vector2) [READWRITE, NOTIFY] */
  translationFrom = (_init_extra_translationTo(this), _init_translationFrom(this, vec2.create()));

  /** m_textureOffset (float) [READWRITE, NOTIFY] */
  textureOffset = (_init_extra_translationFrom(this), _init_textureOffset(this, 0));

  /** m_textureWidth (float) [READWRITE, NOTIFY] */
  textureWidth = (_init_extra_textureOffset(this), _init_textureWidth(this, 1));

  /** m_widthTo (float) [READWRITE, NOTIFY] */
  widthTo = (_init_extra_textureWidth(this), _init_widthTo(this, 0));

  /** m_widthFrom (float) [READWRITE, NOTIFY] */
  widthFrom = (_init_extra_widthTo(this), _init_widthFrom(this, 0));
  static {
    _initClass();
  }
}

export { _Tr2Sprite2dLine as Tr2Sprite2dLine };
//# sourceMappingURL=Tr2Sprite2dLine.js.map
