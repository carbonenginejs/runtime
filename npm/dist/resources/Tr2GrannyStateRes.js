import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/core-types/schema';
import { CjsResource as _CjsResource } from '../CjsResource.js';

let _initClass;

/**
 * Runtime-owned GState resource.
 *
 * GState uses the Gr2Reader path but may contain additive skeleton/state data
 * without models. Consumers inspect its semantic DTO rather than assuming the
 * model-bearing TriGrannyRes payload shape.
 */
let _Tr2GrannyStateRes;
new class extends _identity {
  static [class Tr2GrannyStateRes extends _CjsResource {
    static {
      [_Tr2GrannyStateRes, _initClass] = _applyDecs2311(this, [type.define({
        className: "Tr2GrannyStateRes",
        family: "resources"
      })], [], 0, void 0, _CjsResource).c;
    }
  }];
  payload = "granny-state";
  constructor() {
    super(_Tr2GrannyStateRes), _initClass();
  }
}();

export { _Tr2GrannyStateRes as Tr2GrannyStateRes };
//# sourceMappingURL=Tr2GrannyStateRes.js.map
