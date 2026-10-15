import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObject/Utils/EveThrottleable.h
// Source: trinity/trinity/Eve/SpaceObject/Utils/EveThrottleable.cpp
import { meta, type, blue } from "#schema";
import { CjsEveThrottleableState } from "./CjsEveThrottleableState.js";


/**
 * Update-rate state for objects that run at less than frame rate, mapping a
 * normalized detail level onto an update frequency between authored bounds.
 */
@blue.define("EveThrottleable")
@blue.inherit(IRoot)
@blue.interface()
export class EveThrottleable
{
  @blue.read
  @type.float32
  currentUpdateFrequency = 10;

  @blue.readwrite
  @blue.persist
  @type.boolean
  updateThrottle = true;

  @blue.readwrite
  @blue.persist
  @type.uint32
  maxUpdateFrequency = 20;

  @blue.readwrite
  @blue.persist
  @type.uint32
  minUpdateFrequency = 2;

  _throttle = new CjsEveThrottleableState();

  /**
   * Whether this object should skip the current update; an update that is
   * allowed also picks the next update time from the detail level, so callers
   * must not call this more than once per intended update.
   */
  @blue.method
  @meta.adapted
  ShouldSkipUpdate(normalizedUpdateFrequency = 0.5, currentTime = 0)
  {
    return this._throttle.ShouldSkipUpdate(this, normalizedUpdateFrequency, currentTime);
  }
}
