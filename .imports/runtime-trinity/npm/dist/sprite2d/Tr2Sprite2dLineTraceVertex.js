import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec2 } from '@carbonenginejs/runtime-utils/vec2';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initClass, _init_color, _init_extra_color, _init_name, _init_extra_name, _init_position, _init_extra_position;

/** Tr2Sprite2dLineTraceVertex (sprite2d) - generated from schema shapeHash 9d769463.... */
let _Tr2Sprite2dLineTrace;
class Tr2Sprite2dLineTraceVertex extends CjsModel {
  static {
    ({
      e: [_init_color, _init_extra_color, _init_name, _init_extra_name, _init_position, _init_extra_position],
      c: [_Tr2Sprite2dLineTrace, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2Sprite2dLineTraceVertex",
      family: "sprite2d"
    })], [[[io, io.persist, type, type.color], 16, "color"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.vec2], 16, "position"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_position(this);
  }
  /** m_color (Color) [READWRITE, PERSIST] */
  color = _init_color(this, vec4.fromValues(1, 1, 1, 1));

  /** m_name (std::string) [READWRITE, PERSIST] */
  name = (_init_extra_color(this), _init_name(this, ""));

  /** m_position (Vector2) [READWRITE, PERSIST] */
  position = (_init_extra_name(this), _init_position(this, vec2.create()));
  static {
    _initClass();
  }
}

export { _Tr2Sprite2dLineTrace as Tr2Sprite2dLineTraceVertex };
//# sourceMappingURL=Tr2Sprite2dLineTraceVertex.js.map
