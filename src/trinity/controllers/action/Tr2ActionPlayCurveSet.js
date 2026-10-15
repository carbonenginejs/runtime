// Source: trinity/trinity/Controllers/Actions/Tr2ActionPlayCurveSet.h
// Source: trinity/trinity/Controllers/Actions/Tr2ActionPlayCurveSet.cpp
// Source: trinity/trinity/Controllers/Actions/Tr2ActionPlayCurveSet_Blue.cpp
import { CjsSchema, meta } from "#schema";
import { be, CcpTime } from "#blue";
import { ITr2ControllerAction } from "./ITr2ControllerAction.js";
import { ITr2CurveSetOwner } from "../../curves/ITr2CurveSetOwner.js";
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
@meta.blue.inherit(ITr2Updateable)
@meta.blue.interface(ITr2ControllerAction)
export class Tr2ActionPlayCurveSet extends ITr2ControllerAction
{
  /**
   * Name of the owner curve set played on Start and stopped on Stop.
   * @type {string}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  curveSetName = "";

  /**
   * Named time range to play; an empty string selects the full curve set.
   * @type {string}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  rangeName = "";

  /**
   * Whether transitions wait for a named range iteration boundary when its duration is positive.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  syncToRange = false;

  _startTime = 0;

  _prevTime = 0;

  _duration = 0;

  /**
   * Plays the configured curve set on a curve-set-owning controller owner and optionally tracks its range iterations
   * (`Tr2ActionPlayCurveSet.cpp:21-36`). The start time is Blue's per-frame time in ticks, as Carbon's BeOS clock is.
   */
  @meta.blue.method
  @meta.implemented
  Start(controller)
  {
    this._duration = 0;
    const owner = CjsSchema.cast(controller.GetOwner(), ITr2CurveSetOwner);
    if (!owner)
    {
      return;
    }
    owner.PlayCurveSet(this.curveSetName, this.rangeName);
    if (this.syncToRange && this.rangeName)
    {
      this._duration = owner.GetRangeDuration(this.curveSetName, this.rangeName);
      this._startTime = be.os.GetCurrentFrameTime();
      this._prevTime = this._startTime;
      controller.RegisterUpdateable(this);
    }
  }

  /**
   * Unregisters updates and stops the configured curve set on a curve-set-owning owner (`Tr2ActionPlayCurveSet.cpp:38-45`).
   */
  @meta.blue.method
  @meta.implemented
  Stop(controller)
  {
    controller.UnRegisterUpdateable(this);
    const owner = CjsSchema.cast(controller.GetOwner(), ITr2CurveSetOwner);
    if (owner)
    {
      owner.StopCurveSet(this.curveSetName);
    }
  }

  /**
   * Rebases the sync-to-range time cursor.
   */
  @meta.blue.method
  @meta.implemented
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
  @meta.blue.method
  @meta.implemented
  CanTransition()
  {
    if (!this.syncToRange || this._duration <= 0)
    {
      return true;
    }
    const now = be.os.GetCurrentFrameTime();
    if (now === this._startTime)
    {
      return true;
    }
    const previous = Math.trunc(CcpTime.timeAsFloat(this._prevTime - this._startTime) / this._duration);
    const current = Math.trunc(CcpTime.timeAsFloat(now - this._startTime) / this._duration);
    return previous !== current;
  }

  /**
   * Records the frame clock for synced transitions, ignoring the update arguments
   * (`Tr2ActionPlayCurveSet.cpp:69-72`).
   */
  @meta.blue.method
  @meta.implemented
  Update(_realTime, _simTime)
  {
    this._prevTime = be.os.GetCurrentFrameTime();
  }

}

// Native exposure ends at this concrete table (Tr2ActionPlayCurveSet_Blue.cpp:12-13,18).
