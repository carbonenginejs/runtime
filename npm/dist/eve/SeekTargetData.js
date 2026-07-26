import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { type } from '@carbonenginejs/runtime-utils/schema';

let _initClass, _init_bucketId, _init_extra_bucketId, _init_locatorIndex, _init_extra_locatorIndex, _init_timePassed, _init_extra_timePassed, _init_position, _init_extra_position, _init_direction, _init_extra_direction, _init_arrived, _init_extra_arrived, _init_hasSpawned, _init_extra_hasSpawned;

/**
 * Per-agent scratch for the SeekTarget child behaviour: the locator being
 * sought, the position and direction of the approach, and whether the agent has
 * spawned and arrived. The behaviour allocates one record per agent and rewrites
 * it on every behaviour update.
 */
let _SeekTargetData;
class SeekTargetData extends CjsModel {
  static {
    ({
      e: [_init_bucketId, _init_extra_bucketId, _init_locatorIndex, _init_extra_locatorIndex, _init_timePassed, _init_extra_timePassed, _init_position, _init_extra_position, _init_direction, _init_extra_direction, _init_arrived, _init_extra_arrived, _init_hasSpawned, _init_extra_hasSpawned],
      c: [_SeekTargetData, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "SeekTargetData",
      family: "eve/child/behaviors"
    })], [[[type, type.int32], 16, "bucketId"], [[type, type.int32], 16, "locatorIndex"], [[type, type.float32], 16, "timePassed"], [[type, type.vec3], 16, "position"], [[type, type.vec3], 16, "direction"], [[type, type.boolean], 16, "arrived"], [[type, type.boolean], 16, "hasSpawned"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_hasSpawned(this);
  }
  bucketId = _init_bucketId(this, -1);
  locatorIndex = (_init_extra_bucketId(this), _init_locatorIndex(this, -1));
  timePassed = (_init_extra_locatorIndex(this), _init_timePassed(this, 0));
  position = (_init_extra_timePassed(this), _init_position(this, vec3.create()));
  direction = (_init_extra_position(this), _init_direction(this, vec3.create()));
  arrived = (_init_extra_direction(this), _init_arrived(this, true));
  hasSpawned = (_init_extra_arrived(this), _init_hasSpawned(this, false));
  static {
    _initClass();
  }
}

export { _SeekTargetData as SeekTargetData };
//# sourceMappingURL=SeekTargetData.js.map
