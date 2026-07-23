import { applyDecs2311 as _applyDecs2311 } from './_virtual/_rollupPluginBabelHelpers.js';
import { type, io } from '@carbonenginejs/core-types/schema';
import { vec2 } from '@carbonenginejs/core-math/vec2';
import { vec3 } from '@carbonenginejs/core-math/vec3';
import { CjsCharacterNode as _CjsCharacterNode } from './CjsCharacterNode.js';

let _initClass, _init_index, _init_extra_index, _init_position, _init_extra_position, _init_coordinates, _init_extra_coordinates, _init_weights, _init_extra_weights;
let _CjsCharacterSculptVe;
class CjsCharacterSculptVertex extends _CjsCharacterNode {
  static {
    ({
      e: [_init_index, _init_extra_index, _init_position, _init_extra_position, _init_coordinates, _init_extra_coordinates, _init_weights, _init_extra_weights],
      c: [_CjsCharacterSculptVe, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterSculptVertex",
      family: "character"
    })], [[[type, type.uint32, io, io.persist], 16, "index"], [[type, type.vec3, io, io.persist], 16, "position"], [[type, type.vec2, io, io.persist], 16, "coordinates"], [[void 0, type.map("float32"), io, io.persist], 16, "weights"]], 0, void 0, _CjsCharacterNode));
  }
  constructor(...args) {
    super(...args);
    _init_extra_weights(this);
  }
  index = _init_index(this, 0);
  position = (_init_extra_index(this), _init_position(this, vec3.create()));
  coordinates = (_init_extra_position(this), _init_coordinates(this, vec2.create()));
  weights = (_init_extra_coordinates(this), _init_weights(this, new Map()));
  static {
    _initClass();
  }
}

export { _CjsCharacterSculptVe as CjsCharacterSculptVertex };
//# sourceMappingURL=CjsCharacterSculptVertex.js.map
