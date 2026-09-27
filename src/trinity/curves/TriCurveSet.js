// Source: trinity/trinity/Curves/TriCurveSet.h
// Source: trinity/trinity/Curves/TriCurveSet.cpp
import * as CcpLog from "../../global/logging/ccpLog.js";
import { CjsModel } from "#model";
import { carbon, impl, edit, type } from "#schema";
import { CjsScriptCallback } from "#blue";


/**
 * Playable group of curves and value bindings sharing one scaled playhead,
 * applying every curve and copying every binding each update while it is
 * playing.
 */
@type.define({
  className: "TriCurveSet",
  family: "curves"
})
export class TriCurveSet extends CjsModel
{
  @edit.readwrite
  @edit.persist
  @type.boolean
  useRealTime = false;

  @edit.readwrite
  @edit.persist
  @type.boolean
  playOnLoad = true;

  @edit.read
  @edit.persist
  @type.list("ITr2ValueBinding")
  bindings = [];

  @edit.read
  @edit.persist
  @type.list("ITriFunction")
  curves = [];

  @edit.read
  @edit.persist
  @type.list("Tr2CurveSetRange")
  ranges = [];

  @edit.readwrite
  @edit.persist
  @type.string
  name = "";

  @edit.readwrite
  @edit.persist
  @type.float32
  scale = 1;

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.boolean
  useSimTimeRebase = false;

  @edit.readwrite
  @edit.persist
  @type.objectRef("ICurveSetDriver")
  driver = null;

  @edit.readwrite
  @type.float64
  scaledTime = 0;

  @edit.read
  @type.boolean
  isPlaying = false;

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
  _callback = new CjsScriptCallback();

  /**
   * Updates playback using a single time value or Carbon's real/sim overload.
   */
  @carbon.method
  @impl.implemented
  Update(time, simTime, renderContext = null)
  {
    const selectedTime = simTime === undefined ? time : this.useRealTime ? time : simTime;
    this.UpdateAt(selectedTime, renderContext);
  }

  /**
   * Applies sim-clock rebasing to pending playback times.
   */
  @carbon.method
  @impl.implemented
  OnSimClockRebase(oldTime, newTime)
  {
    const diff = newTime - oldTime;
    this._startTime += diff;
    if (this._endTime > 0)
    {
      this._endTime += diff;
    }
  }

  /**
   * Updates playback at the supplied source time.
   */
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
   */
  @carbon.method
  @impl.implemented
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
   */
  @carbon.method
  @impl.implemented
  ApplyTime(time, renderContext = null)
  {
    this.scaledTime = time;
    this.Apply(renderContext);
  }

  /**
   * Starts playback on load when configured.
   */
  @carbon.method
  @impl.adapted
  Initialize()
  {
    if (this.playOnLoad)
    {
      this.Play();
    }
    this._isUsingSimTimeRebase = this.useSimTimeRebase;
    return true;
  }

  /**
   * Plays from the start.
   */
  @carbon.method
  @impl.implemented
  Play()
  {
    this.PlayFrom(0);
  }

  /**
   * Plays a named range if present.
   */
  @carbon.method
  @impl.implemented
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
   */
  @carbon.method
  @impl.adapted
  PlayFrom(time)
  {
    this._startTime = -1;
    this._endTime = 0;
    this.isPlaying = true;
    this._lastTime = 0;
    this.scaledTime = time;
    for (const curve of this.curves)
    {
      curve.Reset?.();
    }
    this.DestroyStopCallback();
  }

  /**
   * Stops playback.
   */
  @carbon.method
  @impl.implemented
  Stop()
  {
    this.isPlaying = false;
  }

  /**
   * Stops playback after the next update.
   */
  @carbon.method
  @impl.implemented
  StopOnNextFrame()
  {
    this._stopOnNextFrame = true;
  }

  /**
   * Stops playback after the supplied number of seconds.
   */
  @carbon.method
  @impl.implemented
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
   */
  @carbon.method
  @impl.adapted
  StopAfterWithCallback(seconds, callback)
  {
    this.StopAfter(seconds);
    this._callback = new CjsScriptCallback(CjsScriptCallback.from(callback));
  }

  /**
   * Gets the time scale.
   */
  @carbon.method
  @impl.implemented
  GetTimeScale()
  {
    return this.scale;
  }

  /**
   * Gets the current scaled time.
   */
  @carbon.method
  @impl.implemented
  GetScaledTime()
  {
    return this.scaledTime;
  }

  /**
   * Sets the authored curve-set name.
   */
  @carbon.method
  @impl.implemented
  SetName(name)
  {
    return this.SetValues({ name }, { source: this, returnBoolean: true });
  }

  /**
   * Gets the authored curve-set name.
   */
  @carbon.method
  @impl.implemented
  GetName()
  {
    return this.name;
  }

  /**
   * Gets the number of curves.
   */
  @carbon.method
  @impl.implemented
  GetCurvesCount()
  {
    return this.curves.length;
  }

  /**
   * Gets a curve by index.
   */
  @carbon.method
  @impl.implemented
  GetCurve(index)
  {
    return this.curves[index];
  }

  /**
   * Adds a curve function.
   */
  @carbon.method
  @impl.implemented
  AddCurve(curve)
  {
    this.curves.push(curve);
  }

  /**
   * Gets the number of bindings.
   */
  @carbon.method
  @impl.implemented
  GetBindingsCount()
  {
    return this.bindings.length;
  }

  /**
   * Gets a binding by index.
   */
  @carbon.method
  @impl.implemented
  GetBinding(index)
  {
    return this.bindings[index];
  }

  /**
   * Adds a value binding.
   */
  @carbon.method
  @impl.implemented
  AddBinding(binding)
  {
    this.bindings.push(binding);
  }

  /**
   * Gets the duration of the longest curve with a Length method.
   */
  @carbon.method
  @impl.adapted
  GetMaxCurveDuration()
  {
    let maxDuration = 0;
    for (const curve of this.curves)
    {
      const candidate = curve;
      const length = typeof candidate.Length === "function" ? candidate.Length() : 0;
      if (length > maxDuration)
      {
        maxDuration = length;
      }
    }
    return maxDuration;
  }

  /**
   * Gets the duration of a named time range.
   */
  @carbon.method
  @impl.implemented
  GetRangeDuration(rangeName)
  {
    const range = this.ranges.find(item => item.name === rangeName);
    return range ? range.endTime - range.startTime : 0;
  }

  /**
   * Gets whether playback is active.
   */
  @carbon.method
  @impl.implemented
  IsPlaying()
  {
    return this.isPlaying;
  }

  /**
   * Updates using wall-clock seconds.
   */
  @carbon.method
  @impl.adapted
  UpdateWithCurrentTime(time = Date.now() / 1000)
  {
    this.Update(time);
  }

  /**
   * Sets a temporary scaled-time range.
   */
  @carbon.method
  @impl.implemented
  SetTimeRange(timeMin, timeMax, looped = true)
  {
    this._hasTimeRange = true;
    this._timeRangeMin = Math.min(timeMin, timeMax);
    this._timeRangeMax = Math.max(timeMin, timeMax);
    this._loopedTimeRange = looped;
  }

  /**
   * Clears the temporary scaled-time range.
   */
  @carbon.method
  @impl.implemented
  ResetTimeRange()
  {
    this._hasTimeRange = false;
    this._timeRangeMin = 0;
    this._timeRangeMax = 0;
  }

  /**
   * Gets whether a temporary scaled-time range is active.
   */
  @carbon.method
  @impl.implemented
  HasTimeRange()
  {
    return this._hasTimeRange;
  }

  /**
   * Gets the active temporary scaled-time range.
   */
  @carbon.method
  @impl.implemented
  GetTimeRange()
  {
    return [this._timeRangeMin, this._timeRangeMax];
  }

  /**
   * Gets whether sim-time rebase registration was requested during Initialize.
   */
  IsUsingSimTimeRebase()
  {
    return this._isUsingSimTimeRebase;
  }

  /**
   * Constrains the playhead to the active temporary range, wrapping it around
   * the range for a looped range and clamping it to the range end otherwise;
   * does nothing when no range is set.
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
   */
  @impl.custom
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
   */
  @impl.custom
  DestroyStopCallback()
  {
    this._callback.Destroy();
  }
}
