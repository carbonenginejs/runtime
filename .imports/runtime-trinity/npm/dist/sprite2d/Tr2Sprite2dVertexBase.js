import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec2 } from '@carbonenginejs/runtime-utils/vec2';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initClass, _init_position, _init_extra_position, _init_color, _init_extra_color, _init_texCoord, _init_extra_texCoord;

/** Tr2Sprite2dVertexBase (sprite2d) - generated from schema shapeHash 3bb60192.... */
let _Tr2Sprite2dVertexBas;
class Tr2Sprite2dVertexBase extends CjsModel {
  static {
    ({
      e: [_init_position, _init_extra_position, _init_color, _init_extra_color, _init_texCoord, _init_extra_texCoord],
      c: [_Tr2Sprite2dVertexBas, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2Sprite2dVertexBase",
      family: "sprite2d"
    })], [[[type, type.vec3], 16, "position"], [[type, type.color], 16, "color"], [type.array("vec2"), 0, "texCoord"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_texCoord(this);
  }
  /** position (Vector3) */
  position = _init_position(this, vec3.create());

  /** color (Color) */
  color = (_init_extra_position(this), _init_color(this, vec4.fromValues(1, 1, 1, 1)));

  /** texCoord (Vector2) */
  texCoord = (_init_extra_color(this), _init_texCoord(this, [vec2.create(), vec2.create()]));
  static {
    _initClass();
  }
}

export { _Tr2Sprite2dVertexBas as Tr2Sprite2dVertexBase };
//# sourceMappingURL=Tr2Sprite2dVertexBase.js.map
