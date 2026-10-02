// Source: trinity/trinity/Eve/SpaceObject/Utils/EveThrottleable.h
// Source: trinity/trinity/Eve/SpaceObject/Utils/EveThrottleable.cpp
import { meta } from "#schema";
import { CjsEveThrottleableState } from "./CjsEveThrottleableState.js";


/**
 * Update-rate state for objects that run at less than frame rate, mapping a
 * normalized detail level onto an update frequency between authored bounds.
 */
@meta.define({
  className: "EveThrottleable",
  family: "eve/utils"
})
export class EveThrottleable
{
  @meta.blue.read
  @meta.type.float32
  currentUpdateFrequency = 10;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  updateThrottle = true;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.uint32
  maxUpdateFrequency = 20;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.uint32
  minUpdateFrequency = 2;

  _throttle = new CjsEveThrottleableState();

  /**
   * Whether this object should skip the current update; an update that is
   * allowed also picks the next update time from the detail level, so callers
   * must not call this more than once per intended update.
   */
  @meta.blue.method
  @meta.adapted
  ShouldSkipUpdate(normalizedUpdateFrequency = 0.5, currentTime = 0)
  {
    return this._throttle.ShouldSkipUpdate(this, normalizedUpdateFrequency, currentTime);
  }
}

meta.blue.interfaceTable({ interfaces: [EveThrottleable], chainTo: null })(EveThrottleable, { kind: "class" });
