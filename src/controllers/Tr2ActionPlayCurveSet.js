// Source: E:\carbonengine\trinity\trinity\Controllers\Actions\Tr2ActionPlayCurveSet.h
// Source: E:\carbonengine\trinity\trinity\Controllers\Actions\Tr2ActionPlayCurveSet.cpp
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { GetControllerTimeSeconds } from "./contracts.js";
import { ITr2ControllerAction } from "./ITr2ControllerAction.js";


/**
 * Controller action that plays a named curve set (optionally one named range) on
 * its owner for the duration of the action, and can hold off state transitions
 * until a synced range iteration has completed.
 */
@type.define({
  className: "Tr2ActionPlayCurveSet",
  family: "controllers"
})
export class Tr2ActionPlayCurveSet extends CjsModel
{
  @io.persist
  @type.string
  curveSetName = "";

  @io.persist
  @type.string
  rangeName = "";

  @io.persist
  @type.boolean
  syncToRange = false;

  #controller = null;

  #startTime = 0;

  #prevTime = 0;

  #duration = 0;

  /**
   * Plays the configured curve set.
   */
  @carbon.method
  @impl.adapted
  Start(controller)
  {
    const owner = ITr2ControllerAction.getOwner(controller);
    this.#controller = controller;
    this.#duration = 0;
    if (!this.#play(owner))
    {
      return;
    }
    if (this.syncToRange && this.rangeName)
    {
      this.#duration = this.#getRangeDuration(owner);
      this.#startTime = ITr2ControllerAction.getTime(controller, GetControllerTimeSeconds());
      this.#prevTime = this.#startTime;
      controller.RegisterUpdateable?.(this);
    }
  }

  /**
   * Stops the configured curve set.
   */
  @carbon.method
  @impl.adapted
  Stop(controller)
  {
    const owner = ITr2ControllerAction.getOwner(controller);
    controller.UnRegisterUpdateable?.(this);
    if (this.#controller === controller)
    {
      this.#controller = null;
    }
    if (ITr2ControllerAction.hasFunction(owner, "StopCurveSet"))
    {
      owner.StopCurveSet(this.curveSetName);
    }
  }

  /**
   * Rebases the sync-to-range time cursor.
   */
  @carbon.method
  @impl.implemented
  RebaseSimTime(diff)
  {
    this.#startTime += diff;
    this.#prevTime += diff;
  }

  /**
   * Prevents transition until a synced range iteration has completed.
   */
  @carbon.method
  @impl.adapted
  CanTransition()
  {
    if (!this.syncToRange || this.#duration <= 0)
    {
      return true;
    }
    const now = GetControllerTimeSeconds();
    if (now === this.#startTime)
    {
      return true;
    }
    const previous = Math.floor((this.#prevTime - this.#startTime) / this.#duration);
    const current = Math.floor((now - this.#startTime) / this.#duration);
    return previous !== current;
  }

  /**
   * Stores the last update time for synced transitions.
   */
  @carbon.method
  @impl.implemented
  Update(_realTime, simTime)
  {
    this.#prevTime = simTime;
  }

  /**
   * Starts the curve set on the owner, returning false when the owner exposes no
   * PlayCurveSet.
   */
  #play(owner)
  {
    if (ITr2ControllerAction.hasFunction(owner, "PlayCurveSet"))
    {
      owner.PlayCurveSet(this.curveSetName, this.rangeName);
      return true;
    }
    return false;
  }

  /**
   * Gets the authored range duration in seconds from the owner, or 0 when the
   * owner cannot report one.
   */
  #getRangeDuration(owner)
  {
    const ownerDuration = ITr2ControllerAction.callTarget(owner, "GetRangeDuration", this.curveSetName, this.rangeName);
    if (ownerDuration !== undefined)
    {
      return ITr2ControllerAction.toNumber(ownerDuration);
    }
    return 0;
  }
}
