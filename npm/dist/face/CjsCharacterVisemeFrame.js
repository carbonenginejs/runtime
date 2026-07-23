import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type, io } from '@carbonenginejs/core-types/schema';
import { CjsCharacterNode as _CjsCharacterNode } from '../CjsCharacterNode.js';

let _initClass, _init_time, _init_extra_time, _init_weights, _init_extra_weights;
let _CjsCharacterVisemeFr;
class CjsCharacterVisemeFrame extends _CjsCharacterNode {
  static {
    ({
      e: [_init_time, _init_extra_time, _init_weights, _init_extra_weights],
      c: [_CjsCharacterVisemeFr, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterVisemeFrame",
      family: "character"
    })], [[[type, type.float32, io, io.persist], 16, "time"], [[void 0, type.map("float32"), io, io.persist], 16, "weights"]], 0, void 0, _CjsCharacterNode));
  }
  constructor(...args) {
    super(...args);
    _init_extra_weights(this);
  }
  time = _init_time(this, 0);
  weights = (_init_extra_time(this), _init_weights(this, new Map()));
  static {
    _initClass();
  }
}

export { _CjsCharacterVisemeFr as CjsCharacterVisemeFrame };
//# sourceMappingURL=CjsCharacterVisemeFrame.js.map
