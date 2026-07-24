import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsResource as _CjsResource } from '../CjsResource.js';
import { AssertResourcePayloadObject, ResourcePayloadError } from './resourceBoundary.js';

let _initClass;

/**
 * Runtime-owned GState resource.
 *
 * GState uses the Gr2Reader path but may contain additive skeleton/state data
 * without models. Consumers inspect its plain payload rather than assuming the
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
    SetPayload(payload = null) {
      if (payload === null) {
        super.SetPayload(null);
        return this;
      }
      AssertResourcePayloadObject("Tr2GrannyStateRes", payload);
      if (!payload.skeleton && !Array.isArray(payload.additiveAnimations)) {
        throw ResourcePayloadError("Tr2GrannyStateRes", "Expected skeleton data or an additiveAnimations array.");
      }
      super.SetPayload(payload);
      return this;
    }
  }];
  payload = "granny-state";
  constructor() {
    super(_Tr2GrannyStateRes), _initClass();
  }
}();

export { _Tr2GrannyStateRes as Tr2GrannyStateRes };
//# sourceMappingURL=Tr2GrannyStateRes.js.map
