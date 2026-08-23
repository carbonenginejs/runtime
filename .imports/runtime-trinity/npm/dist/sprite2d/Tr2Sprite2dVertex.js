import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { Tr2Sprite2dVertexBase as _Tr2Sprite2dVertexBas } from './Tr2Sprite2dVertexBase.js';
import { vec2 } from '@carbonenginejs/runtime-utils/vec2';

let _initProto, _initClass;

/** Represents one Sprite2D polygon vertex with two validated texture-coordinate channels. */
let _Tr2Sprite2dVertex;
new class extends _identity {
  static [class Tr2Sprite2dVertex extends _Tr2Sprite2dVertexBas {
    static {
      ({
        e: [_initProto],
        c: [_Tr2Sprite2dVertex, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2Sprite2dVertex",
        family: "sprite2d"
      })], [[[carbon, carbon.method, impl, impl.implemented], 18, "GetTexCoord"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetTexCoord"]], 0, void 0, _Tr2Sprite2dVertexBas));
    }
    constructor(...args) {
      super(...args);
      _initProto(this);
    }
    /** Carbon method GetTexCoord (MAP_METHOD_AND_WRAP). */
    GetTexCoord(index) {
      const value = this.texCoord[_Tr2Sprite2dVertex.#GetIndex(index)];
      return vec2.clone(value);
    }

    /** Carbon method SetTexCoord (MAP_METHOD_AND_WRAP). */
    SetTexCoord(index, value) {
      vec2.copy(this.texCoord[_Tr2Sprite2dVertex.#GetIndex(index)], value);
    }

    /** Validates and returns a texture-coordinate slot index. */
  }];
  #GetIndex(index) {
    const value = Number(index);
    if (value !== 0 && value !== 1) {
      throw new RangeError("texture coordinate index must be 0 or 1");
    }
    return value;
  }
  constructor() {
    super(_Tr2Sprite2dVertex), _initClass();
  }
}();

export { _Tr2Sprite2dVertex as Tr2Sprite2dVertex };
//# sourceMappingURL=Tr2Sprite2dVertex.js.map
