import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { Origin } from '../../generated/eve/child/enums.js';
import { EveEntity as _EveEntity } from '../EveEntity.js';

let _initClass;

/**
 * Deprecated compatibility identity retained for older serialized and Python
 * type names. New code uses EveSpaceObjectChild.
 *
 * @deprecated Use EveSpaceObjectChild.
 */
let _IEveSpaceObjectChild;
new class extends _identity {
  static [class IEveSpaceObjectChild extends _EveEntity {
    static {
      [_IEveSpaceObjectChild, _initClass] = _applyDecs2311(this, [type.define({
        className: "IEveSpaceObjectChild",
        family: "eve/child"
      })], [], 0, void 0, _EveEntity).c;
    }
  }];
  Origin = Origin;
  constructor() {
    super(_IEveSpaceObjectChild), _initClass();
  }
}();

export { _IEveSpaceObjectChild as IEveSpaceObjectChild };
//# sourceMappingURL=IEveSpaceObjectChild.js.map
