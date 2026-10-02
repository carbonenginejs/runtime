// Source: trinity/trinity/Curves/TriCurveSet.h
// Source: trinity/trinity/Curves/TriCurveSet.cpp
// Source: trinity/trinity/Curves/TriCurveSet_Blue.cpp
import * as CcpLog from "../../global/logging/ccpLog.js";
import { meta } from "#schema";
import { CjsScriptCallback, IInitialize, ISimTimeRebaseNotify, blue, TimeAsDouble, BlueList } from "#blue";
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
@meta.define({
  className: "TriCurveSet",
  family: "curves"
})
@meta.blue.inherit(ITr2Updateable, ISimTimeRebaseNotify)
export class TriCurveSet extends IInitialize
{
  /** Authored curve-set name. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /** Functions sampled in stored order before bindings are copied. */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("ITriFunction")
  curves = new BlueList(ITriFunction, { className: null, listOps: 0 });

  /** Bindings copied after all function samples. */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("ITr2ValueBinding")
  bindings = new BlueList(ITr2ValueBinding, { className: null, listOps: 0 });

  /** Optional owner of the source-time conversion. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("ICurveSetDriver")
  driver = null;

  /** Named playback intervals in scaled seconds. */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("Tr2CurveSetRange")
  ranges = new BlueList(Tr2CurveSetRange, { className: "Tr2CurveSetRange", listOps: 0 });

  /** Multiplier applied to each source-time delta. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  scale = 1;

  /** Whether Initialize starts playback. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  playOnLoad = true;

  /** Whether updates sample functions and copy bindings. */
  @meta.blue.read
  @meta.type.boolean
  isPlaying = false;

  /** Current scaled sample time in seconds. */
  @meta.blue.readwrite
  @meta.type.float64
  scaledTime = 0;

  /** Whether initialization requests simulation-clock rebasing. */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  useSimTimeRebase = false;

  /** Whether the two-clock Update overload selects real time. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
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
   * Updates playback using source seconds or Carbon's real/sim tick overload.
   * Converts only the selected two-clock timestamp (TriCurveSet.cpp:51-64).
   * @param {number} time Source seconds, or real-time Blue 100ns ticks with simTime.
   * @param {number} [simTime] Simulation time in Blue 100ns ticks.
   * @param {object|null} [renderContext=null] Rendering context forwarded to curves.
   * @returns {void}
   */
  @meta.blue.method
  @meta.implemented
  Update(time, simTime, renderContext = null)
  {
    const selectedTime = simTime === undefined ? time : TimeAsDouble(this.useRealTime ? time : simTime);
    this.UpdateAt(selectedTime, renderContext);
  }

  /**
   * Applies sim-clock rebasing to pending playback times.
   * @param {number} oldTime Previous simulation time in Blue ticks.
   * @param {number} newTime New simulation time in Blue ticks.
   * @returns {void}
   */
  @meta.blue.method
  @meta.implemented
  OnSimClockRebase(oldTime, newTime)
  {
    const diff = TimeAsDouble(newTime - oldTime);
    this._startTime += diff;
    if (this._endTime > 0)
    {
      this._endTime += diff;
    }
  }

  /**
   * Updates playback at the supplied source time.
   * Custom: implements the scalar Update overload separately so JavaScript can expose both call shapes.
   * @param {number} time Source seconds before optional driver conversion.
   * @param {object|null} [renderContext=null] Active rendering context.
   * @returns {void}
   */
  @meta.ours
  UpdateAt(time, renderContext = null)
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
        this.scaledTime = this._endTime - this._startTime - 0.001;
        this._stopOnNextFrame = true;
      }
      this.Apply(renderContext);
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
   * @param {object|null} [renderContext=null] Active rendering context forwarded to functions.
   * @returns {void}
   */
  @meta.blue.method
  @meta.implemented
  Apply(renderContext = null)
  {
    for (const curve of this.curves)
    {
      curve.UpdateValue(this.scaledTime, renderContext);
    }
    for (const binding of this.bindings)
    {
      binding.CopyValue();
    }
  }

  /**
   * Applies all curves and bindings at an explicit scaled time.
   * @param {number} time Scaled sample time in seconds.
   * @param {object|null} [renderContext=null] Active rendering context.
   * @returns {void}
   */
  @meta.blue.method
  @meta.implemented
  ApplyTime(time, renderContext = null)
  {
    this.scaledTime = time;
    this.Apply(renderContext);
  }

  /**
   * Starts playback on load when configured.
   * Adapted: repeated reader/copy initialization acquires at most one OS subscription; Dispose releases that owner because JavaScript has no deterministic destructor. The current OS retains listeners but does not dispatch rebases.
   * @returns {boolean} True after playback initialization.
   */
  @meta.blue.method
  @meta.adapted
  Initialize()
  {
    if (this.playOnLoad)
    {
      this.Play();
    }
    if (this.useSimTimeRebase && !this._isUsingSimTimeRebase)
    {
      const os = blue.os;
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
  @meta.blue.method
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
  @meta.blue.method
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
  @meta.blue.method
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
  @meta.blue.method
  @meta.implemented
  Stop()
  {
    this.isPlaying = false;
  }

  /**
   * Stops playback after the next update.
   * @returns {void}
   */
  @meta.blue.method
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
  @meta.blue.method
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
  @meta.blue.method
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
  @meta.blue.method
  @meta.implemented
  GetTimeScale()
  {
    return this.scale;
  }

  /**
   * Gets the current scaled time.
   * @returns {number} Current sample time in seconds.
   */
  @meta.blue.method
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
  @meta.blue.method
  @meta.implemented
  SetName(name)
  {
    this.name = name;
  }

  /**
   * Gets the authored curve-set name.
   * @returns {string} Authored curve-set name.
   */
  @meta.blue.method
  @meta.implemented
  GetName()
  {
    return this.name;
  }

  /**
   * Gets the number of curves.
   * @returns {number} Number of stored functions.
   */
  @meta.blue.method
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
  @meta.blue.method
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
  @meta.blue.method
  @meta.implemented
  AddCurve(curve)
  {
    this.curves.Append(curve);
  }

  /**
   * Gets the number of bindings.
   * @returns {number} Number of stored bindings.
   */
  @meta.blue.method
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
  @meta.blue.method
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
  @meta.blue.method
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
  @meta.blue.method
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
  @meta.blue.method
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
  @meta.blue.method
  @meta.implemented
  IsPlaying()
  {
    return this.isPlaying;
  }

  /**
   * Updates using wall-clock seconds.
   * Adapted: the existing JavaScript wrapper accepts explicit seconds and defaults to the host wall clock. Native TriCurveSet.cpp:320-322 instead casts the raw frame tick value to double; that wrapper discrepancy is retained in this pass.
   * @param {number} [time] Source time in seconds.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  UpdateWithCurrentTime(time = Date.now() / 1000)
  {
    this.Update(time);
  }

  /**
   * Sets a temporary scaled-time range.
   * @param {number} timeMin First scaled-time endpoint.
   * @param {number} timeMax Second scaled-time endpoint.
   * @param {boolean} [looped=true] Whether the interval wraps.
   * @returns {void}
   */
  @meta.blue.method
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
  @meta.blue.method
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
  @meta.blue.method
  @meta.implemented
  HasTimeRange()
  {
    return this._hasTimeRange;
  }

  /**
   * Gets the active temporary scaled-time range.
   * @returns {Array<number>} New pair of active interval endpoints.
   */
  @meta.blue.method
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
  @meta.ours
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
  @meta.ours
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
  @meta.ours
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
  @meta.ours
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
  @meta.ours
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
meta.blue.interfaceTable({
  interfaces: [TriCurveSet, IInitialize, ITr2Updateable],
  chainTo: null
})(TriCurveSet, { kind: "class" });
