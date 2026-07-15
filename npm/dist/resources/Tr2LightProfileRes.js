import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/core-types/schema';
import { CjsResource as _CjsResource } from '../CjsResource.js';

let _initClass;

/**
 * Runtime-owned light-profile resource.
 *
 * The attached semantic DTO may be richer than the data retained by the
 * resource or active engine adapter.
 */
let _Tr2LightProfileRes;
new class extends _identity {
  static [class Tr2LightProfileRes extends _CjsResource {
    static {
      [_Tr2LightProfileRes, _initClass] = _applyDecs2311(this, [type.define({
        className: "Tr2LightProfileRes",
        family: "resources"
      })], [], 0, void 0, _CjsResource).c;
    }
  }];
  payload = "light-profile";
  constructor() {
    super(_Tr2LightProfileRes), _initClass();
  }
}();

export { _Tr2LightProfileRes as Tr2LightProfileRes };
//# sourceMappingURL=Tr2LightProfileRes.js.map
