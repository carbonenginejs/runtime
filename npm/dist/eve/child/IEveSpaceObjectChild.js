import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { Origin } from '../../generated/eve/child/enums.js';

let _initClass;

/**
 * Base type for space-object children, carrying the shared Origin enum that
 * distinguishes space-authored placement from SOF-authored placement.
 */
let _IEveSpaceObjectChild;
new class extends _identity {
  static [class IEveSpaceObjectChild extends CjsModel {
    static {
      [_IEveSpaceObjectChild, _initClass] = _applyDecs2311(this, [type.define({
        className: "IEveSpaceObjectChild",
        family: "eve/child"
      })], [], 0, void 0, CjsModel).c;
    }
  }];
  Origin = Origin;
  constructor() {
    super(_IEveSpaceObjectChild), _initClass();
  }
}();

export { _IEveSpaceObjectChild as IEveSpaceObjectChild };
//# sourceMappingURL=IEveSpaceObjectChild.js.map
