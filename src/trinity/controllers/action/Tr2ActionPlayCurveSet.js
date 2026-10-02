// Source: trinity/trinity/Controllers/Actions/Tr2ActionPlayCurveSet.h
// Source: trinity/trinity/Controllers/Actions/Tr2ActionPlayCurveSet.cpp
// Source: trinity/trinity/Controllers/Actions/Tr2ActionPlayCurveSet_Blue.cpp
import { meta, types } from "#schema";
import { blue, TimeAsFloat } from "#blue";
import { ITr2ControllerAction } from "./ITr2ControllerAction.js";
import { ITr2Updateable } from "../../core/ITr2Updateable.js";


/**
 * Controller action that plays a named curve set (optionally one named range) on
 * its owner for the duration of the action, and can hold off state transitions
 * until a synced range iteration has completed.
 */
@meta.define({
  className: "Tr2ActionPlayCurveSet",
  family: "controllers"
})
@meta.carbon.inherit(ITr2Updateable)
export class Tr2ActionPlayCurveSet extends ITr2ControllerAction
{
  /**
   * Name of the owner curve set played on Start and stopped on Stop.
   * @type {string}
   */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.string
  curveSetName = "";

  /**
   * Named time range to play; an empty string selects the full curve set.
   * @type {string}
   */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.string
  rangeName = "";

  /**
   * Whether transitions wait for a named range iteration boundary when its duration is positive.
   * @type {boolean}
   */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.boolean
  syncToRange = false;

  _startTime = 0;

  _prevTime = 0;

  _duration = 0;

  /**
   * Plays the configured curve set and optionally tracks its range iterations.
   *
   * Adapted: Retains the owner adapter because real JS owners such as
   * EveEffectRoot2 have not yet declared ITr2CurveSetOwner. Native uses that
   * nominal dynamic_cast; repairing those owners is a separate domain pass. The
   * start time is Blue's per-frame time in ticks, as Carbon's BeOS clock is
   * (`Tr2ActionPlayCurveSet.cpp:21-36`).
   */
  @meta.carbon.method
  @meta.impl.adapted
  Start(controller)
  {
    const owner = ITr2ControllerAction.getOwner(controller);
    this._duration = 0;
    if (!this._play(owner))
    {
      return;
    }
    if (this.syncToRange && this.rangeName)
    {
      this._duration = this._getRangeDuration(owner);
      this._startTime = blue.os.GetCurrentFrameTime();
      this._prevTime = this._startTime;
      controller.RegisterUpdateable(this);
    }
  }

  /**
   * Unregisters updates and stops the configured curve set.
   *
   * Adapted: Uses the runtime owner adapter instead of Carbon's owner cast.
   */
  @meta.carbon.method
  @meta.impl.adapted
  Stop(controller)
  {
    const owner = ITr2ControllerAction.getOwner(controller);
    controller.UnRegisterUpdateable(this);
    if (ITr2ControllerAction.hasFunction(owner, "StopCurveSet"))
    {
      owner.StopCurveSet(this.curveSetName);
    }
  }

  /**
   * Rebases the sync-to-range time cursor.
   */
  @meta.carbon.method
  @meta.impl.implemented
  RebaseSimTime(diff)
  {
    this._startTime += diff;
    this._prevTime += diff;
  }

  /**
   * Allows transition when the frame clock crosses a synced range iteration.
   * Iteration conversion truncates toward zero, including before the start time
   * (`Tr2ActionPlayCurveSet.cpp:53-67`). Blue's frame time is held for the whole
   * frame, so a probe in the frame the action started returns true.
   */
  @meta.carbon.method
  @meta.impl.implemented
  CanTransition()
  {
    if (!this.syncToRange || this._duration <= 0)
    {
      return true;
    }
    const now = blue.os.GetCurrentFrameTime();
    if (now === this._startTime)
    {
      return true;
    }
    const previous = Math.trunc(TimeAsFloat(this._prevTime - this._startTime) / this._duration);
    const current = Math.trunc(TimeAsFloat(now - this._startTime) / this._duration);
    return previous !== current;
  }

  /**
   * Records the frame clock for synced transitions, ignoring the update arguments
   * (`Tr2ActionPlayCurveSet.cpp:69-72`).
   */
  @meta.carbon.method
  @meta.impl.implemented
  Update(_realTime, _simTime)
  {
    this._prevTime = blue.os.GetCurrentFrameTime();
  }

  /**
   * Starts the curve set on the owner, returning false when the owner exposes no
   * PlayCurveSet.
   */
  _play(owner)
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
  _getRangeDuration(owner)
  {
    const ownerDuration = ITr2ControllerAction.callTarget(owner, "GetRangeDuration", this.curveSetName, this.rangeName);
    if (ownerDuration !== undefined)
    {
      return ITr2ControllerAction.toNumber(ownerDuration);
    }
    return 0;
  }
}

// Native exposure ends at this concrete table (Tr2ActionPlayCurveSet_Blue.cpp:12-13,18).
meta.carbon.interfaceTable({
  interfaces: [Tr2ActionPlayCurveSet, ITr2ControllerAction],
  chainTo: null
})(Tr2ActionPlayCurveSet);
