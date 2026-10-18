// Source: trinity/trinity/Curves/TriCurveSet.h
// Source: trinity/trinity/Curves/TriCurveSet.cpp
// Source: trinity/trinity/Curves/TriCurveSet_Blue.cpp
import * as CcpLog from "../../global/logging/ccpLog.js";
import { meta, type, blue } from "#schema";
import { CjsScriptCallback, IInitialize, ISimTimeRebaseNotify, be, BlueList, CcpTime } from "#blue";
import { ITriFunction } from "../../global/blue/ITriFunction.js";
import { ITriCurveLength } from "../../global/blue/ITriCurveLength.js";
import { ITr2Updateable } from "../core/ITr2Updateable.js";
import { ITriDuration } from "./ITriDuration.js";
import { ITr2ValueBinding } from "./ITr2ValueBinding.js";
import { Tr2CurveSetRange } from "./Tr2CurveSetRange.js";
import { mappedInterfaces } from "../../global/compose/interface.js";


/**
 * Playable group of curves and value bindings sharing one scaled playhead,
 * applying every curve and copying every binding each update while it is
 * playing.
 */
@blue.define("TriCurveSet")
@blue.inherit(ITr2Updateable, ISimTimeRebaseNotify)
@blue.interface(IInitialize, ITr2Updateable)
export class TriCurveSet extends IInitialize
{
  /** Authored curve-set name. */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  /** Functions sampled in stored order before bindings are copied. */
  @blue.read
  @blue.persist
  @type.list("ITriFunction")
  curves = new BlueList(ITriFunction, { className: null, listOps: 0 });

  /** Bindings copied after all function samples. */
  @blue.read
  @blue.persist
  @type.list("ITr2ValueBinding")
  bindings = new BlueList(ITr2ValueBinding, { className: null, listOps: 0 });

  /** Optional owner of the source-time conversion. */
  @blue.readwrite
  @blue.persist
  @type.rootRef("ICurveSetDriver")
  driver = null;

  /** Named playback intervals in scaled seconds. */
  @blue.read
  @blue.persist
  @type.list("Tr2CurveSetRange")
  ranges = new BlueList(Tr2CurveSetRange, { className: "Tr2CurveSetRange", listOps: 0 });

  /** Multiplier applied to each source-time delta. */
  @blue.readwrite
  @blue.persist
  @type.float32
  scale = 1;

  /** Whether Initialize starts playback. */
  @blue.readwrite
  @blue.persist
  @type.boolean
  playOnLoad = true;

  /** Whether updates sample functions and copy bindings. */
  @blue.read
  @type.boolean
  isPlaying = false;

  /** Current scaled sample time in seconds. */
  @blue.readwrite
  @type.float64
  scaledTime = 0;

  /** Whether initialization requests simulation-clock rebasing. */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.boolean
  useSimTimeRebase = false;

  /** Whether the two-clock Update overload selects real time. */
  @blue.readwrite
  @blue.persist
  @type.boolean
  useRealTime = false;

  _stopOnNextFrame = false;

  _isUsingSimTimeRebase = false;

  /** OS that owns this instance's rebase subscription; released explicitly. */
  _rebaseOS = null;

  _hasTimeRange = false;

  _loopedTimeRange = true;

  _startTime = 0;

  _lastTime = 0;

  _endTime = 0;

  _timeRangeMin = 0;

  _timeRangeMax = 0;

  /** Carbon's `m_callback`: a BlueScriptCallback value member, invalid until set. */
  _callback = new CjsScriptCallback();

  /**
   * Carbon's Update( Be::Time realTime, Be::Time simTime ) (TriCurveSet.cpp:51-64):
   * converts the clock selected by useRealTime to seconds and updates at it.
   * @param {number} realTime Real-time Blue 100ns ticks.
   * @param {number} simTime Simulation time in Blue 100ns ticks.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  Update__RealTimeSimTime(realTime, simTime)
  {
    this.Update(CcpTime.timeAsDouble(this.useRealTime ? realTime : simTime));
  }

  /**
   * Applies sim-clock rebasing to pending playback times.
   * @param {number} oldTime Previous simulation time in Blue ticks.
   * @param {number} newTime New simulation time in Blue ticks.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
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
   * @param {number} time Source seconds before optional driver conversion.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
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
   * @returns {void}
   */
  @blue.method
  @meta.implemented
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
   * @param {number} time Scaled sample time in seconds.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  ApplyTime(time)
  {
    this.scaledTime = time;
    this.Apply();
  }

  /**
   * Starts playback on load when configured.
   * Adapted: repeated reader/copy initialization acquires at most one OS subscription; Dispose releases that owner because JavaScript has no deterministic destructor. The current OS retains listeners but does not dispatch rebases.
   * @returns {boolean} True after playback initialization.
   */
  @blue.method
  @meta.adapted
  Initialize()
  {
    if (this.playOnLoad)
    {
      this.Play();
    }
    if (this.useSimTimeRebase && !this._isUsingSimTimeRebase)
    {
      const os = be.os;
      os.RegisterForSimTimeRebase(this);
      this._rebaseOS = os;
      this._isUsingSimTimeRebase = true;
    }
    return true;
  }

  /**
   * Plays from the start.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  Play()
  {
    this.PlayFrom(0);
  }

  /**
   * Plays a named range if present.
   * @param {string} name Authored range name.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
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
   * @param {number} time Initial scaled sample time in seconds.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
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
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  Stop()
  {
    this.isPlaying = false;
  }

  /**
   * Stops playback after the next update.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  StopOnNextFrame()
  {
    this._stopOnNextFrame = true;
  }

  /**
   * Stops playback after the supplied number of seconds.
   * @param {number} seconds Delay measured on the source timeline.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  StopAfter(seconds)
  {
    this._endTime = -seconds;
  }

  /**
   * Stops playback after the supplied seconds and invokes a callback
   * (`TriCurveSet.cpp:246-250`).
   *
   * Adapted: Carbon copies a BlueScriptCallback into its value member. The
   * argument is adapted once through CjsScriptCallback.from (a function, a
   * CjsScriptCallback, or a Call/CallVoid host object; null stores an invalid
   * callback) and held in a fresh CjsScriptCallback, so the stored slot is a
   * copy: destroying it later leaves the caller's own callback valid, as
   * destroying Carbon's copy does.
   * @param {number} seconds Delay measured on the source timeline.
   * @param {CjsScriptCallback|Function|object|null} callback Callback copied into the owned slot.
   * @returns {void}
   */
  @blue.method
  @meta.adapted
  StopAfterWithCallback(seconds, callback)
  {
    this.StopAfter(seconds);
    this._callback = new CjsScriptCallback(CjsScriptCallback.from(callback));
  }

  /**
   * Gets the time scale.
   * @returns {number} Authored time multiplier.
   */
  @blue.method
  @meta.implemented
  GetTimeScale()
  {
    return this.scale;
  }

  /**
   * Gets the current scaled time.
   * @returns {number} Current sample time in seconds.
   */
  @blue.method
  @meta.implemented
  GetScaledTime()
  {
    return this.scaledTime;
  }

  /**
   * Sets the authored curve-set name.
   * @param {string} name Authored curve-set name.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  SetName(name)
  {
    this.name = name;
  }

  /**
   * Gets the authored curve-set name.
   * @returns {string} Authored curve-set name.
   */
  @blue.method
  @meta.implemented
  GetName()
  {
    return this.name;
  }

  /**
   * Gets the number of curves.
   * @returns {number} Number of stored functions.
   */
  @blue.method
  @meta.implemented
  GetCurvesCount()
  {
    return this.curves.length;
  }

  /**
   * Gets a curve by index.
   * @param {number} index Stored function index.
   * @returns {ITriFunction} Stored function.
   */
  @blue.method
  @meta.implemented
  GetCurve(index)
  {
    return this.curves[index];
  }

  /**
   * Adds a curve function.
   * @param {ITriFunction} curve Function to append.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  AddCurve(curve)
  {
    this.curves.Append(curve);
  }

  /**
   * Gets the number of bindings.
   * @returns {number} Number of stored bindings.
   */
  @blue.method
  @meta.implemented
  GetBindingsCount()
  {
    return this.bindings.length;
  }

  /**
   * Gets a binding by index.
   * @param {number} index Stored binding index.
   * @returns {ITr2ValueBinding} Stored binding.
   */
  @blue.method
  @meta.implemented
  GetBinding(index)
  {
    return this.bindings[index];
  }

  /**
   * Adds a value binding.
   * @param {ITr2ValueBinding} binding Binding to append.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  AddBinding(binding)
  {
    this.bindings.Append(binding);
  }

  /**
   * Gets the longest duration exposed through a native duration interface.
   * Adapted: native BlueCastPtr checks the exact exposure table, with ITriDuration before ITriCurveLength; JavaScript keeps the same object identity for either interface.
   * @returns {number} Greatest reported duration, or zero.
   */
  @blue.method
  @meta.adapted
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
   * @param {string} rangeName Authored interval name.
   * @returns {number} End minus start, or zero when absent.
   */
  @blue.method
  @meta.implemented
  GetRangeDuration(rangeName)
  {
    const range = this.ranges.find(item => item.name === rangeName);
    return range ? range.endTime - range.startTime : 0;
  }

  /**
   * Gets whether playback is active.
   * @returns {boolean} Whether playback is active.
   */
  @blue.method
  @meta.implemented
  IsPlaying()
  {
    return this.isPlaying;
  }

  /**
   * Updates with the current frame time, as Carbon does: Update( double(
   * BeOS->GetCurrentFrameTime() ) ) (TriCurveSet.cpp:320-322), reading be.os at
   * the call. This is the method Carbon exposes to script as `Update`
   * (TriCurveSet_Blue.cpp:100-103).
   *
   * Carbon quirk (CE-51), reproduced: the raw Be::Time tick count is cast to double and
   * passed to the seconds overload, so the set is sampled 10^7 times too far
   * along.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  UpdateWithCurrentTime()
  {
    this.Update(be.os.GetCurrentFrameTime());
  }

  /**
   * Sets a temporary scaled-time range.
   * @param {number} timeMin First scaled-time endpoint.
   * @param {number} timeMax Second scaled-time endpoint.
   * @param {boolean} [looped=true] Whether the interval wraps.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  SetTimeRange(timeMin, timeMax, looped = true)
  {
    this._hasTimeRange = true;
    this._timeRangeMin = Math.min(timeMin, timeMax);
    this._timeRangeMax = Math.max(timeMin, timeMax);
    this._loopedTimeRange = looped;
  }

  /**
   * Clears the temporary scaled-time range.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  ResetTimeRange()
  {
    this._hasTimeRange = false;
    this._timeRangeMin = 0;
    this._timeRangeMax = 0;
  }

  /**
   * Gets whether a temporary scaled-time range is active.
   * @returns {boolean} Whether an interval is active.
   */
  @blue.method
  @meta.implemented
  HasTimeRange()
  {
    return this._hasTimeRange;
  }

  /**
   * Gets the active temporary scaled-time range.
   * @returns {Array<number>} New pair of active interval endpoints.
   */
  @blue.method
  @meta.implemented
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
   * Releases the rebase subscription through the OS that acquired it.
   * Custom: JavaScript has no deterministic destructor. The graph owner must
   * dispose an abandoned set; Stop and removal from one playback list do not
   * end its lifetime because the set may be shared or played again.
   * @returns {void}
   */
  Dispose()
  {
    if (this._isUsingSimTimeRebase)
    {
      this._rebaseOS.UnregisterForSimTimeRebase(this);
      this._isUsingSimTimeRebase = false;
      this._rebaseOS = null;
    }
    this.DestroyStopCallback();
  }

}

// Native exposure omits nominal ISimTimeRebaseNotify and has no parent chain.
