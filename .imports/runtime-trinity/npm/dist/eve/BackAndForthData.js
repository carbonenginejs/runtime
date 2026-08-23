import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { type } from '@carbonenginejs/runtime-utils/schema';

let _initClass, _init_locatorTarget, _init_extra_locatorTarget, _init_locatorDirection, _init_extra_locatorDirection, _init_locatorIndex, _init_extra_locatorIndex, _init_seek, _init_extra_seek, _init_deliver, _init_extra_deliver, _init_arrived, _init_extra_arrived, _init_timePassed, _init_extra_timePassed;

/**
 * Per-agent scratch for the BackAndForth child behaviour: the locator the agent
 * is travelling to, the direction it approaches from, and how far through the
 * trip it is. The behaviour allocates one record per agent and rewrites it on
 * every behaviour update.
 */
let _BackAndForthData;
class BackAndForthData extends CjsModel {
  static {
    ({
      e: [_init_locatorTarget, _init_extra_locatorTarget, _init_locatorDirection, _init_extra_locatorDirection, _init_locatorIndex, _init_extra_locatorIndex, _init_seek, _init_extra_seek, _init_deliver, _init_extra_deliver, _init_arrived, _init_extra_arrived, _init_timePassed, _init_extra_timePassed],
      c: [_BackAndForthData, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "BackAndForthData",
      family: "eve/child/behaviors"
    })], [[[type, type.vec3], 16, "locatorTarget"], [[type, type.vec3], 16, "locatorDirection"], [[type, type.int32], 16, "locatorIndex"], [[type, type.boolean], 16, "seek"], [[type, type.boolean], 16, "deliver"], [[type, type.boolean], 16, "arrived"], [[type, type.float32], 16, "timePassed"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_timePassed(this);
  }
  locatorTarget = _init_locatorTarget(this, vec3.create());
  locatorDirection = (_init_extra_locatorTarget(this), _init_locatorDirection(this, vec3.create()));
  locatorIndex = (_init_extra_locatorDirection(this), _init_locatorIndex(this, -1));
  seek = (_init_extra_locatorIndex(this), _init_seek(this, true));
  deliver = (_init_extra_seek(this), _init_deliver(this, false));
  arrived = (_init_extra_deliver(this), _init_arrived(this, true));
  timePassed = (_init_extra_arrived(this), _init_timePassed(this, 0));
  static {
    _initClass();
  }
}

export { _BackAndForthData as BackAndForthData };
//# sourceMappingURL=BackAndForthData.js.map
