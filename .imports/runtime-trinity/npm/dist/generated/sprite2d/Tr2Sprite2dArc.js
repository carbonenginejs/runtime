import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { Tr2SpriteObject as _Tr2SpriteObject } from './Tr2SpriteObject.js';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initClass, _init_lineColor, _init_extra_lineColor, _init_endAngle, _init_extra_endAngle, _init_fill, _init_extra_fill, _init_texturePrimary, _init_extra_texturePrimary, _init_radius, _init_extra_radius, _init_textureSecondary, _init_extra_textureSecondary, _init_startAngle, _init_extra_startAngle, _init_lineWidth, _init_extra_lineWidth;

/** Tr2Sprite2dArc (sprite2d) - generated from schema shapeHash 946e291d.... */
let _Tr2Sprite2dArc;
class Tr2Sprite2dArc extends _Tr2SpriteObject {
  static {
    ({
      e: [_init_lineColor, _init_extra_lineColor, _init_endAngle, _init_extra_endAngle, _init_fill, _init_extra_fill, _init_texturePrimary, _init_extra_texturePrimary, _init_radius, _init_extra_radius, _init_textureSecondary, _init_extra_textureSecondary, _init_startAngle, _init_extra_startAngle, _init_lineWidth, _init_extra_lineWidth],
      c: [_Tr2Sprite2dArc, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2Sprite2dArc",
      family: "sprite2d"
    })], [[[io, io.notify, io, io.readwrite, type, type.color], 16, "lineColor"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "endAngle"], [[io, io.notify, io, io.readwrite, type, type.boolean], 16, "fill"], [[io, io.notify, io, io.readwrite, void 0, type.objectRef("ITr2Sprite2dTexture")], 16, "texturePrimary"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "radius"], [[io, io.notify, io, io.readwrite, void 0, type.objectRef("ITr2Sprite2dTexture")], 16, "textureSecondary"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "startAngle"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "lineWidth"]], 0, void 0, _Tr2SpriteObject));
  }
  constructor(...args) {
    super(...args);
    _init_extra_lineWidth(this);
  }
  /** m_lineColor (Color) [READWRITE, NOTIFY] */
  lineColor = _init_lineColor(this, vec4.fromValues(1, 1, 1, 1));

  /** m_endAngle (float) [READWRITE, NOTIFY] */
  endAngle = (_init_extra_lineColor(this), _init_endAngle(this, 0));

  /** m_fill (bool) [READWRITE, NOTIFY] */
  fill = (_init_extra_endAngle(this), _init_fill(this, false));

  /** m_texturePrimary (ITr2Sprite2dTexturePtr) [READWRITE, NOTIFY] */
  texturePrimary = (_init_extra_fill(this), _init_texturePrimary(this, null));

  /** m_radius (float) [READWRITE, NOTIFY] */
  radius = (_init_extra_texturePrimary(this), _init_radius(this, 0));

  /** m_textureSecondary (ITr2Sprite2dTexturePtr) [READWRITE, NOTIFY] */
  textureSecondary = (_init_extra_radius(this), _init_textureSecondary(this, null));

  /** m_startAngle (float) [READWRITE, NOTIFY] */
  startAngle = (_init_extra_textureSecondary(this), _init_startAngle(this, 0));

  /** m_lineWidth (float) [READWRITE, NOTIFY] */
  lineWidth = (_init_extra_startAngle(this), _init_lineWidth(this, 1));
  static {
    _initClass();
  }
}

export { _Tr2Sprite2dArc as Tr2Sprite2dArc };
//# sourceMappingURL=Tr2Sprite2dArc.js.map
