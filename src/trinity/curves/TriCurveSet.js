// Source: trinity/trinity/Curves/TriCurveSet.h
// Source: trinity/trinity/Curves/TriCurveSet.cpp
// Source: trinity/trinity/Curves/TriCurveSet_Blue.cpp
import { exposure as be } from "#be";
import * as CcpLog from "../../global/logging/ccpLog.js";
import { type } from "#schema";
import { BlueScriptCallback, IInitialize, ISimTimeRebaseNotify, blue, BlueList, CcpTime } from "#blue";
import { ITriFunction } from "../../blue/interfaces/ITriFunction.js";
import { ITriCurveLength } from "../../blue/interfaces/ITriCurveLength.js";
import { ITr2Updateable } from "../core/ITr2Updateable.js";
import { ITriDuration } from "./ITriDuration.js";
import { ITr2ValueBinding } from "./ITr2ValueBinding.js";
import { Tr2CurveSetRange } from "./Tr2CurveSetRange.js";
import { mappedInterfaces } from "../../blue/compose/interface.js";


/**
 * Playable group of curves and value bindings sharing one scaled playhead,
 * applying every curve and copying every binding each update while it is
 * playing.
 */
@be.define({
  name: "TriCurveSet",
  inherit: [ ITr2Updateable, ISimTimeRebaseNotify ],
  // TriCurveSet_Blue.cpp:28-159, in Carbon's order.
  interfaces: [ IInitialize, ITr2Updateable ],
  members: [
    [ be.ATTR, "name", be.READWRITE | be.PERSIST ],
    [ be.ATTR, "curves", be.READ | be.PERSIST ],
    [ be.ATTR, "bindings", be.READ | be.PERSIST ],
    [ be.ATTR, "driver", be.READWRITE | be.PERSIST ],
    [ be.ATTR, "ranges", be.READ | be.PERSIST ],
    [ be.ATTR, "scale", be.READWRITE | be.PERSIST ],
    [ be.ATTR, "playOnLoad", be.READWRITE | be.PERSIST ],
    [ be.ATTR, "isPlaying", be.READ ],
    [ be.ATTR, "scaledTime", be.READWRITE ],
    [ be.ATTR, "useSimTimeRebase", be.READWRITE | be.NOTIFY | be.PERSIST ],
    [ be.ATTR, "useRealTime", be.READWRITE | be.PERSIST ],
    [ be.METHOD, "Update", be.WRAP, "UpdateWithCurrentTime" ],
    [ be.METHOD, "Play", be.WRAP ],
    [ be.METHOD, "PlayFrom", be.WRAP ],
    [ be.METHOD, "Stop", be.WRAP ],
    [ be.METHOD, "StopOnNextFrame", be.WRAP ],
    [ be.METHOD, "StopAfter", be.WRAP ],
    [ be.METHOD, "GetMaxCurveDuration", be.WRAP ],
    [ be.METHOD, "StopAfterWithCallback", be.WRAP ],
    [ be.METHOD, "Apply", be.WRAP ],
    [ be.METHOD, "SetTimeRange", be.WRAP_OPTIONAL_ARGS, 1 ],
    [ be.METHOD, "ResetTimeRange", be.WRAP ],
    [ be.METHOD, "HasTimeRange", be.WRAP ],
    [ be.METHOD, "GetTimeRange", be.WRAP ]
  ]
})
export class TriCurveSet extends IInitialize
{
  /** Authored curve-set name. */

  @type.string
  name = "";

  /** Functions sampled in stored order before bindings are copied. */

  @type.list("ITriFunction")
  curves = new BlueList(ITriFunction, { className: null, listOps: 0 });

  /** Bindings copied after all function samples. */

  @type.list("ITr2ValueBinding")
  bindings = new BlueList(ITr2ValueBinding, { className: null, listOps: 0 });

  /** Optional owner of the source-time conversion. */

  @type.object.ref("ICurveSetDriver")
  driver = null;

  /** Named playback intervals in scaled seconds. */

  @type.list("Tr2CurveSetRange")
  ranges = new BlueList(Tr2CurveSetRange, { className: "Tr2CurveSetRange", listOps: 0 });

  /** Multiplier applied to each source-time delta. */

  @type.float32
  scale = 1;

  /** Whether Initialize starts playback. */

  @type.boolean
  playOnLoad = true;

  /** Whether updates sample functions and copy bindings. */
  @type.boolean
  isPlaying = false;

  /** Current scaled sample time in seconds. */
  @type.float64
  scaledTime = 0;

  /** Whether initialization requests simulation-clock rebasing. */


  @type.boolean
  useSimTimeRebase = false;

  /** Whether the two-clock Update overload selects real time. */

  @type.boolean
  useRealTime = false;

  _stopOnNextFrame = false;

  _isUsingSimTimeRebase = false;

  _hasTimeRange = false;

  _loopedTimeRange = true;

  _startTime = 0;

  _lastTime = 0;

  _endTime = 0;

  _timeRangeMin = 0;

  _timeRangeMax = 0;

  /** Carbon's `m_callback`: a BlueScriptCallback value member, invalid until set. */
  _callback = new BlueScriptCallback();

  /**
   * Carbon's Update( Be::Time realTime, Be::Time simTime ) (TriCurveSet.cpp:51-64):
   * converts the clock selected by useRealTime to seconds and updates at it.
   *
   * @implemented
   * @param {number} realTime Real-time Blue 100ns ticks.
   * @param {number} simTime Simulation time in Blue 100ns ticks.
   * @returns {void}
   */
  Update__RealTimeSimTime(realTime, simTime)
  {
    this.Update(CcpTime.timeAsDouble(this.useRealTime ? realTime : simTime));
  }

  /**
   * Applies sim-clock rebasing to pending playback times.
   *
   * @implemented
   * @param {number} oldTime Previous simulation time in Blue ticks.
   * @param {number} newTime New simulation time in Blue ticks.
   * @returns {void}
   */

  OnSimClockRebase(oldTime, newTime)
  {
    const diff = CcpTime.timeAsDouble(newTime - oldTime);
    this._startTime += diff;
    if (this._endTime > 0)
    {
      this._endTime += diff;
    }
  }

  /**
   * Carbon's Update( double time ): updates playback at the supplied source
   * time (formerly the invented name UpdateAt). Engine owners call this or the
   * Be::Time overload with their own clock, as Carbon's C++ owners do. It is
   * not the method Python reaches as `Update`: Carbon's exposure maps that name
   * to UpdateWithCurrentTime (TriCurveSet_Blue.cpp:100-103), and JavaScript keeps
   * the C++ names, so a script-style caller uses UpdateWithCurrentTime.
   *
   * @implemented
   * @param {number} time Source seconds before optional driver conversion.
   * @returns {void}
   */
  Update(time)
  {
    if (this.driver)
    {
      time = this.driver.GetCurveSetTime(time);
    }
    if (this._endTime < 0)
    {
      this._endTime = time - this._endTime;
    }
    if (this.isPlaying)
    {
      if (this._startTime < 0)
      {
        this._startTime = this.driver ? 0 : time;
      }
      const current = time - this._startTime;
      const delta = current - this._lastTime;
      this._lastTime = current;
      this.scaledTime += this.scale * delta;
      this.ApplyTimeRange();
      if (this._endTime > 0 && this._startTime + this.scaledTime >= this._endTime)
      {
        this.scaledTime = this._endTime - this._startTime - Math.fround(0.001);
        this._stopOnNextFrame = true;
      }
      this.Apply();
    }
    if (this._stopOnNextFrame)
    {
      this.CallStopCallback();
      this.isPlaying = false;
      this._stopOnNextFrame = false;
    }
  }

  /**
   * Applies all curves at the current scaled time, then copies bindings.
   *
   * @implemented
   * @returns {void}
   */
  Apply()
  {
    for (const curve of this.curves)
    {
      curve.UpdateValue(this.scaledTime);
    }
    for (const binding of this.bindings)
    {
      binding.CopyValue();
    }
  }

  /**
   * Applies all curves and bindings at an explicit scaled time.
   *
   * @implemented
   * @param {number} time Scaled sample time in seconds.
   * @returns {void}
   */

  ApplyTime(time)
  {
    this.scaledTime = time;
    this.Apply();
  }

  /**
   * Starts playback on load when configured.
   *
   * @adapted does not register for sim-time rebases: no TiDi sync reaches the browser (BlueOS.RegisterForSimTimeRebase). m_isUsingSimTimeRebase still records the request.
   * @returns {boolean} True after playback initialization.
   */

  Initialize()
  {
    if (this.playOnLoad)
    {
      this.Play();
    }
    if (this.useSimTimeRebase)
    {
      // blue.os.RegisterForSimTimeRebase(this); // cpp:182; no TiDi sync reaches the browser.
      this._isUsingSimTimeRebase = true;
    }
    return true;
  }

  /**
   * Plays from the start.
   *
   * @implemented
   * @returns {void}
   */
  Play()
  {
    this.PlayFrom(0);
  }

  /**
   * Plays a named range if present.
   *
   * @implemented
   * @param {string} name Authored range name.
   * @returns {void}
   */

  PlayTimeRange(name)
  {
    const range = this.ranges.find(item => item.name === name);
    if (!range)
    {
      return;
    }
    this.SetTimeRange(range.startTime, range.endTime, range.looped);
    this.Play();
  }

  /**
   * Starts playback from a scaled-time offset.
   *
   * @implemented
   * @param {number} time Initial scaled sample time in seconds.
   * @returns {void}
   */
  PlayFrom(time)
  {
    this._startTime = -1;
    this._endTime = 0;
    this.isPlaying = true;
    this._lastTime = 0;
    this.scaledTime = time;
    for (const curve of this.curves)
    {
      curve.Reset();
    }
    this.DestroyStopCallback();
  }

  /**
   * Stops playback.
   *
   * @implemented
   * @returns {void}
   */
  Stop()
  {
    this.isPlaying = false;
  }

  /**
   * Stops playback after the next update.
   *
   * @implemented
   * @returns {void}
   */
  StopOnNextFrame()
  {
    this._stopOnNextFrame = true;
  }

  /**
   * Stops playback after the supplied number of seconds.
   *
   * @implemented
   * @param {number} seconds Delay measured on the source timeline.
   * @returns {void}
   */
  StopAfter(seconds)
  {
    this._endTime = -seconds;
  }

  /**
   * Stops playback after the supplied seconds and invokes a callback
   * (`TriCurveSet.cpp:246-250`).
   *
   * @adapted Carbon copies a BlueScriptCallback into its value member. The
   *   argument is adapted once through BlueScriptCallback.from (a function, a
   *   BlueScriptCallback, or a Call/CallVoid host object; null stores an invalid
   *   callback) and held in a fresh BlueScriptCallback, so the stored slot is a
   *   copy: destroying it later leaves the caller's own callback valid, as
   *   destroying Carbon's copy does.
   * @param {number} seconds Delay measured on the source timeline.
   * @param {BlueScriptCallback|Function|object|null} callback Callback copied into the owned slot.
   * @returns {void}
   */
  StopAfterWithCallback(seconds, callback)
  {
    this.StopAfter(seconds);
    this._callback = new BlueScriptCallback(BlueScriptCallback.from(callback));
  }

  /**
   * Gets the time scale.
   *
   * @implemented
   * @returns {number} Authored time multiplier.
   */

  GetTimeScale()
  {
    return this.scale;
  }

  /**
   * Gets the current scaled time.
   *
   * @implemented
   * @returns {number} Current sample time in seconds.
   */

  GetScaledTime()
  {
    return this.scaledTime;
  }

  /**
   * Sets the authored curve-set name.
   *
   * @implemented
   * @param {string} name Authored curve-set name.
   * @returns {void}
   */

  SetName(name)
  {
    this.name = name;
  }

  /**
   * Gets the authored curve-set name.
   *
   * @implemented
   * @returns {string} Authored curve-set name.
   */

  GetName()
  {
    return this.name;
  }

  /**
   * Gets the number of curves.
   *
   * @implemented
   * @returns {number} Number of stored functions.
   */

  GetCurvesCount()
  {
    return this.curves.length;
  }

  /**
   * Gets a curve by index.
   *
   * @implemented
   * @param {number} index Stored function index.
   * @returns {ITriFunction} Stored function.
   */

  GetCurve(index)
  {
    return this.curves[index];
  }

  /**
   * Adds a curve function.
   *
   * @implemented
   * @param {ITriFunction} curve Function to append.
   * @returns {void}
   */

  AddCurve(curve)
  {
    this.curves.Append(curve);
  }

  /**
   * Gets the number of bindings.
   *
   * @implemented
   * @returns {number} Number of stored bindings.
   */

  GetBindingsCount()
  {
    return this.bindings.length;
  }

  /**
   * Gets a binding by index.
   *
   * @implemented
   * @param {number} index Stored binding index.
   * @returns {ITr2ValueBinding} Stored binding.
   */

  GetBinding(index)
  {
    return this.bindings[index];
  }

  /**
   * Adds a value binding.
   *
   * @implemented
   * @param {ITr2ValueBinding} binding Binding to append.
   * @returns {void}
   */

  AddBinding(binding)
  {
    this.bindings.Append(binding);
  }

  /**
   * Gets the longest duration exposed through a native duration interface.
   *
   * @adapted native BlueCastPtr checks the exact exposure table, with ITriDuration before ITriCurveLength; JavaScript keeps the same object identity for either interface.
   * @returns {number} Greatest reported duration, or zero.
   */
  GetMaxCurveDuration()
  {
    let maxDuration = 0;
    for (const curve of this.curves)
    {
      const interfaces = mappedInterfaces(curve.constructor);
      const candidate = interfaces.has(ITriDuration) ? curve : interfaces.has(ITriCurveLength) ? curve : null;
      const length = candidate ? candidate.Length() : 0;
      if (length > maxDuration)
      {
        maxDuration = length;
      }
    }
    return maxDuration;
  }

  /**
   * Gets the duration of a named time range.
   *
   * @implemented
   * @param {string} rangeName Authored interval name.
   * @returns {number} End minus start, or zero when absent.
   */

  GetRangeDuration(rangeName)
  {
    const range = this.ranges.find(item => item.name === rangeName);
    return range ? range.endTime - range.startTime : 0;
  }

  /**
   * Gets whether playback is active.
   *
   * @implemented
   * @returns {boolean} Whether playback is active.
   */

  IsPlaying()
  {
    return this.isPlaying;
  }

  /**
   * Updates with the current frame time, as Carbon does: Update( double(
   * BeOS->GetCurrentFrameTime() ) ) (TriCurveSet.cpp:320-322), reading blue.os at
   * the call. This is the method Carbon exposes to script as `Update`
   * (TriCurveSet_Blue.cpp:100-103).
   *
   * Carbon quirk (CE-51), reproduced: the raw Be::Time tick count is cast to double and
   * passed to the seconds overload, so the set is sampled 10^7 times too far
   * along.
   *
   * @implemented
   * @returns {void}
   */
  UpdateWithCurrentTime()
  {
    this.Update(blue.os.GetCurrentFrameTime());
  }

  /**
   * Sets a temporary scaled-time range.
   *
   * @implemented
   * @param {number} timeMin First scaled-time endpoint.
   * @param {number} timeMax Second scaled-time endpoint.
   * @param {boolean} [looped=true] Whether the interval wraps.
   * @returns {void}
   */
  SetTimeRange(timeMin, timeMax, looped = true)
  {
    this._hasTimeRange = true;
    this._timeRangeMin = Math.min(timeMin, timeMax);
    this._timeRangeMax = Math.max(timeMin, timeMax);
    this._loopedTimeRange = looped;
  }

  /**
   * Clears the temporary scaled-time range.
   *
   * @implemented
   * @returns {void}
   */
  ResetTimeRange()
  {
    this._hasTimeRange = false;
    this._timeRangeMin = 0;
    this._timeRangeMax = 0;
  }

  /**
   * Gets whether a temporary scaled-time range is active.
   *
   * @implemented
   * @returns {boolean} Whether an interval is active.
   */
  HasTimeRange()
  {
    return this._hasTimeRange;
  }

  /**
   * Gets the active temporary scaled-time range.
   *
   * @implemented
   * @returns {Array<number>} New pair of active interval endpoints.
   */
  GetTimeRange()
  {
    return [this._timeRangeMin, this._timeRangeMax];
  }

  /**
   * Gets whether sim-time rebase registration was requested during Initialize.
   * Custom: exposes the native registration-state member for runtime inspection.
   * @returns {boolean} Whether rebasing was requested during initialization.
   */
  IsUsingSimTimeRebase()
  {
    return this._isUsingSimTimeRebase;
  }

  /**
   * Constrains the playhead to the active temporary range, wrapping it around
   * the range for a looped range and clamping it to the range end otherwise;
   * does nothing when no range is set.
   * Custom: extracts the native scalar Update interval calculation.
   * @returns {void}
   */
  ApplyTimeRange()
  {
    if (!this._hasTimeRange)
    {
      return;
    }
    if (this.scaledTime < this._timeRangeMin)
    {
      this.scaledTime = this._timeRangeMin;
    }
    if (this._loopedTimeRange)
    {
      const length = this._timeRangeMax - this._timeRangeMin;
      // Native quirk: zero-length loops produce NaN (TriCurveSet.cpp:125).
      this.scaledTime = (this.scaledTime - this._timeRangeMin) % length + this._timeRangeMin;
    }
    else
    {
      this.scaledTime = Math.min(this.scaledTime, this._timeRangeMax);
    }
  }

  /**
   * Invokes the stored stop callback when it is valid, then destroys the
   * current slot (`TriCurveSet.cpp:144-148`). The slot destroyed is whatever
   * it holds after the call, so a replacement installed by the callback itself
   * is released, as in the donor.
   *
   * Custom: Extracts the native update-site call and cleanup into a helper.
   * JavaScript exceptions are reported with CcpLog so playback still
   * stops; Carbon's BlueScriptCallbackStatus reports without throwing.
   * @returns {void}
   */
  CallStopCallback()
  {
    if (!this._callback.IsValid())
    {
      return;
    }
    try
    {
      this._callback.CallVoid();
    }
    catch (error)
    {
      CcpLog.CCP_LOGERR_CH(CcpLog.GetModuleChannel("trinity"), "%s %s", "Curve-set stop callback failed", error);
    }
    this.DestroyStopCallback();
  }

  /**
   * Destroys the stored stop callback without invoking it, leaving the slot
   * invalid (`m_callback.Destroy()`, `TriCurveSet.cpp:147,228`).
   *
   * Custom: Extracts native callback disposal into a shared helper for the
   * stop and PlayFrom paths.
   * @returns {void}
   */
  DestroyStopCallback()
  {
    this._callback.Destroy();
  }

  /**
   * Releases the native owned callback during graph teardown.
   * Carbon destructor: trinity/trinity/Curves/TriCurveSet.cpp:43-49.
   * @adapted No sim-rebase registration is acquired in JS; retain its existing request-flag reset.
   * @adapted Explicit callback Destroy replaces native by-value member destruction (blueexposure/BlueScriptCallback.cpp:244-247).
   * @returns {void}
   */
  _Destructor()
  {
    this._isUsingSimTimeRebase = false;
    this.DestroyStopCallback();
  }

  /**
   * Existing disposal entry delegates to graph teardown.
   * @adapted Retains the existing JS caller API; introduces no new lifetime caller.
   * @returns {void}
   */
  Dispose()
  {
    this.Destruct();
  }

}

// Native exposure omits nominal ISimTimeRebaseNotify and has no parent chain.
