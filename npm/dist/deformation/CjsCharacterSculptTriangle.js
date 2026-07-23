import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/core-types/schema';
import { CjsCharacterNode as _CjsCharacterNode } from '../CjsCharacterNode.js';

let _initClass, _init_indices, _init_extra_indices;
let _CjsCharacterSculptTr;
class CjsCharacterSculptTriangle extends _CjsCharacterNode {
  static {
    ({
      e: [_init_indices, _init_extra_indices],
      c: [_CjsCharacterSculptTr, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterSculptTriangle",
      family: "character"
    })], [[[void 0, type.list("uint32"), io, io.persist], 16, "indices"]], 0, void 0, _CjsCharacterNode));
  }
  constructor(...args) {
    super(...args);
    _init_extra_indices(this);
  }
  indices = _init_indices(this, []);
  static {
    _initClass();
  }
}

export { _CjsCharacterSculptTr as CjsCharacterSculptTriangle };
//# sourceMappingURL=CjsCharacterSculptTriangle.js.map
