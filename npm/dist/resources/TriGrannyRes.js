import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsResource as _CjsResource } from '../CjsResource.js';
import { AssertResourcePayloadObject, ResourcePayloadError } from './resourceBoundary.js';

let _initClass;

/**
 * Runtime-owned Granny resource.
 *
 * The attached plain payload carries decoded Granny data. This resource
 * owns lifecycle identity; reader and engine-specific behavior stays outside.
 */
let _TriGrannyRes;
new class extends _identity {
  static [class TriGrannyRes extends _CjsResource {
    static {
      [_TriGrannyRes, _initClass] = _applyDecs2311(this, [type.define({
        className: "TriGrannyRes",
        family: "resources"
      })], [], 0, void 0, _CjsResource).c;
    }
    SetPayload(payload = null) {
      if (payload === null) {
        super.SetPayload(null);
        return this;
      }
      AssertResourcePayloadObject("TriGrannyRes", payload);
      if (!Array.isArray(payload.models) && !Array.isArray(payload.meshes)) {
        throw ResourcePayloadError("TriGrannyRes", "Expected a models or meshes array.", "models");
      }
      super.SetPayload(payload);
      return this;
    }
  }];
  payload = "granny";
  constructor() {
    super(_TriGrannyRes), _initClass();
  }
}();

export { _TriGrannyRes as TriGrannyRes };
//# sourceMappingURL=TriGrannyRes.js.map
