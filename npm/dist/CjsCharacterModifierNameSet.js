import { applyDecs2311 as _applyDecs2311 } from './_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/core-types/schema';
import { CjsCharacterNode as _CjsCharacterNode } from './CjsCharacterNode.js';

let _initClass, _init_body, _init_extra_body, _init_face, _init_extra_face, _init_utility, _init_extra_utility;
let _CjsCharacterModifier;
class CjsCharacterModifierNameSet extends _CjsCharacterNode {
  static {
    ({
      e: [_init_body, _init_extra_body, _init_face, _init_extra_face, _init_utility, _init_extra_utility],
      c: [_CjsCharacterModifier, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterModifierNameSet",
      family: "character"
    })], [[[void 0, type.list("string"), io, io.persist], 16, "body"], [[void 0, type.list("string"), io, io.persist], 16, "face"], [[void 0, type.list("string"), io, io.persist], 16, "utility"]], 0, void 0, _CjsCharacterNode));
  }
  constructor(...args) {
    super(...args);
    _init_extra_utility(this);
  }
  body = _init_body(this, []);
  face = (_init_extra_body(this), _init_face(this, []));
  utility = (_init_extra_face(this), _init_utility(this, []));
  static {
    _initClass();
  }
}

export { _CjsCharacterModifier as CjsCharacterModifierNameSet };
//# sourceMappingURL=CjsCharacterModifierNameSet.js.map
