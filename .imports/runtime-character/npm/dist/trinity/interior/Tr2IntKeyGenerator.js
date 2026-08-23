import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initStatic, _initClass;

/** Stable-sort policy for interior render batches. */
let _Tr2IntKeyGenerator;
new class extends _identity {
  static [class Tr2IntKeyGenerator extends CjsModel {
    static {
      ({
        e: [_initStatic],
        c: [_Tr2IntKeyGenerator, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2IntKeyGenerator",
        family: "interior"
      })], [[[carbon, carbon.method, impl, impl.implemented], 26, "Less"], [[carbon, carbon.method, impl, impl.implemented], 26, "GetSortType"]], 0, void 0, CjsModel));
      _initStatic(this);
    }
    /** Carbon static comparator for interior render batches. */
    static Less(batch1, batch2) {
      if (batch1.renderingMode < batch2.renderingMode) return true;
      if (batch1.renderingMode > batch2.renderingMode) return false;
      return batch1.renderingMode === 4 ? batch1.depth < batch2.depth : false;
    }

    /** Carbon requests stable sorting so authored decal order is preserved. */
    static GetSortType() {
      return 2;
    }
  }];
  ALLOW_GDPR = false;
  constructor() {
    super(_Tr2IntKeyGenerator), _initClass();
  }
}();

export { _Tr2IntKeyGenerator as Tr2IntKeyGenerator };
//# sourceMappingURL=Tr2IntKeyGenerator.js.map
