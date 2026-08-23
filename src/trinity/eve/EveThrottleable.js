// Source: trinity/trinity/Eve/SpaceObject/Utils/EveThrottleable.h
// Source: trinity/trinity/Eve/SpaceObject/Utils/EveThrottleable.cpp
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";
import { CjsEveThrottleableState } from "./CjsEveThrottleableState.js";


/**
 * Update-rate state for objects that run at less than frame rate, mapping a
 * normalized detail level onto an update frequency between authored bounds.
 */
@type.define({
  className: "EveThrottleable",
  family: "eve/utils"
})
export class EveThrottleable extends CjsModel
{
  @io.read
  @type.float32
  currentUpdateFrequency = 10;

  @io.persist
  @type.boolean
  updateThrottle = true;

  @io.persist
  @type.uint32
  maxUpdateFrequency = 20;

  @io.persist
  @type.uint32
  minUpdateFrequency = 2;

  #throttle = new CjsEveThrottleableState();

  /**
   * Whether this object should skip the current update; an update that is
   * allowed also picks the next update time from the detail level, so callers
   * must not call this more than once per intended update.
   */
  @carbon.method
  @impl.adapted
  ShouldSkipUpdate(normalizedUpdateFrequency = 0.5, currentTime = 0)
  {
    return this.#throttle.ShouldSkipUpdate(this, normalizedUpdateFrequency, currentTime);
  }
}
