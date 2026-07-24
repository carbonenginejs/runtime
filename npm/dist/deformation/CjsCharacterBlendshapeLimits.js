import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type, io } from '@carbonenginejs/runtime-utils/schema';
import { CjsCharacterNode as _CjsCharacterNode } from '../CjsCharacterNode.js';

let _initClass, _init_id, _init_extra_id, _init_sex, _init_extra_sex, _init_head, _init_extra_head, _init_limits, _init_extra_limits;
let _CjsCharacterBlendsha;
class CjsCharacterBlendshapeLimits extends _CjsCharacterNode {
  static {
    ({
      e: [_init_id, _init_extra_id, _init_sex, _init_extra_sex, _init_head, _init_extra_head, _init_limits, _init_extra_limits],
      c: [_CjsCharacterBlendsha, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterBlendshapeLimits",
      family: "character"
    })], [[[type, type.string, io, io.persist], 16, "id"], [[type, type.string, io, io.persist], 16, "sex"], [[type, type.string, io, io.persist], 16, "head"], [[void 0, type.map("vec2"), io, io.persist], 16, "limits"]], 0, void 0, _CjsCharacterNode));
  }
  constructor(...args) {
    super(...args);
    _init_extra_limits(this);
  }
  id = _init_id(this, "");
  sex = (_init_extra_id(this), _init_sex(this, ""));
  head = (_init_extra_sex(this), _init_head(this, ""));
  limits = (_init_extra_head(this), _init_limits(this, new Map()));
  static {
    _initClass();
  }
}

export { _CjsCharacterBlendsha as CjsCharacterBlendshapeLimits };
//# sourceMappingURL=CjsCharacterBlendshapeLimits.js.map
