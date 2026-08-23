import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { type } from '@carbonenginejs/runtime-utils/schema';

let _initClass, _init_tunnelLock, _init_extra_tunnelLock, _init_tunnelPoint, _init_extra_tunnelPoint;

/**
 * Per-agent scratch for the FollowASpline child behaviour: which tunnel the
 * agent is locked onto and which point along it the agent is heading for. The
 * behaviour allocates one record per agent and rewrites it on every behaviour
 * update.
 */
let _FollowASplineData;
class FollowASplineData extends CjsModel {
  static {
    ({
      e: [_init_tunnelLock, _init_extra_tunnelLock, _init_tunnelPoint, _init_extra_tunnelPoint],
      c: [_FollowASplineData, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "FollowASplineData",
      family: "eve/child/behaviors"
    })], [[[type, type.int32], 16, "tunnelLock"], [[type, type.int32], 16, "tunnelPoint"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_tunnelPoint(this);
  }
  tunnelLock = _init_tunnelLock(this, -1);
  tunnelPoint = (_init_extra_tunnelLock(this), _init_tunnelPoint(this, 0));
  static {
    _initClass();
  }
}

export { _FollowASplineData as FollowASplineData };
//# sourceMappingURL=FollowASplineData.js.map
