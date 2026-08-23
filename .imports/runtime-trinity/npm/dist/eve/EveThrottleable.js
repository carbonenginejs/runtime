import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsEveThrottleableState } from './CjsEveThrottleableState.js';

let _initProto, _initClass, _init_currentUpdateFrequency, _init_extra_currentUpdateFrequency, _init_updateThrottle, _init_extra_updateThrottle, _init_maxUpdateFrequency, _init_extra_maxUpdateFrequency, _init_minUpdateFrequency, _init_extra_minUpdateFrequency;

/**
 * Update-rate state for objects that run at less than frame rate, mapping a
 * normalized detail level onto an update frequency between authored bounds.
 */
let _EveThrottleable;
class EveThrottleable extends CjsModel {
  static {
    ({
      e: [_init_currentUpdateFrequency, _init_extra_currentUpdateFrequency, _init_updateThrottle, _init_extra_updateThrottle, _init_maxUpdateFrequency, _init_extra_maxUpdateFrequency, _init_minUpdateFrequency, _init_extra_minUpdateFrequency, _initProto],
      c: [_EveThrottleable, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveThrottleable",
      family: "eve/utils"
    })], [[[io, io.read, type, type.float32], 16, "currentUpdateFrequency"], [[io, io.persist, type, type.boolean], 16, "updateThrottle"], [[io, io.persist, type, type.uint32], 16, "maxUpdateFrequency"], [[io, io.persist, type, type.uint32], 16, "minUpdateFrequency"], [[carbon, carbon.method, impl, impl.adapted], 18, "ShouldSkipUpdate"]], 0, void 0, CjsModel));
  }
  currentUpdateFrequency = (_initProto(this), _init_currentUpdateFrequency(this, 10));
  updateThrottle = (_init_extra_currentUpdateFrequency(this), _init_updateThrottle(this, true));
  maxUpdateFrequency = (_init_extra_updateThrottle(this), _init_maxUpdateFrequency(this, 20));
  minUpdateFrequency = (_init_extra_maxUpdateFrequency(this), _init_minUpdateFrequency(this, 2));
  #throttle = (_init_extra_minUpdateFrequency(this), new CjsEveThrottleableState());

  /**
   * Whether this object should skip the current update; an update that is
   * allowed also picks the next update time from the detail level, so callers
   * must not call this more than once per intended update.
   */
  ShouldSkipUpdate(normalizedUpdateFrequency = 0.5, currentTime = 0) {
    return this.#throttle.ShouldSkipUpdate(this, normalizedUpdateFrequency, currentTime);
  }
  static {
    _initClass();
  }
}

export { _EveThrottleable as EveThrottleable };
//# sourceMappingURL=EveThrottleable.js.map
