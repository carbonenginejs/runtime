import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/core-types/schema';
import { CjsResource as _CjsResource } from '../CjsResource.js';

let _initClass;

/**
 * Runtime-owned Granny resource.
 *
 * The attached semantic DTO carries decoded Granny/CMF data. This resource
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
  }];
  payload = "granny";
  constructor() {
    super(_TriGrannyRes), _initClass();
  }
}();

export { _TriGrannyRes as TriGrannyRes };
//# sourceMappingURL=TriGrannyRes.js.map
