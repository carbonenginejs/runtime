// Source: E:\carbonengine\trinity\trinity\Curves\TriCurveSet.h
// Source: E:\carbonengine\trinity\trinity\Curves\TriCurveSet.cpp
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";


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
  @io.persist
  @type.boolean
  useRealTime = false;

  @io.persist
  @type.boolean
  playOnLoad = true;

  @io.persist
  @type.list("ITr2ValueBinding")
  bindings = [];

  @io.persist
  @type.list("ITriFunction")
  curves = [];

  @io.persist
  @type.list("Tr2CurveSetRange")
  ranges = [];

  @io.persist
  @type.string
  name = "";

  @io.persist
  @type.float32
  scale = 1;

  @io.notify
  @io.persist
  @type.boolean
  useSimTimeRebase = false;

  @io.persist
  @type.objectRef("ICurveSetDriver")
  driver = null;

  @io.readwrite
  @type.float64
  scaledTime = 0;

  @io.read
  @type.boolean
  isPlaying = false;

  #stopOnNextFrame = false;

  #isUsingSimTimeRebase = false;

  #hasTimeRange = false;

  #loopedTimeRange = true;

  #startTime = 0;

  #lastTime = 0;

  #endTime = 0;

  #timeRangeMin = 0;

  #timeRangeMax = 0;

  #callback = null;

  /**
   * Updates playback using a single time value or Carbon's real/sim overload.
   */
  @carbon.method
  @impl.implemented
  Update(time, simTime)
  {
    const selectedTime = simTime === undefined ? time : this.useRealTime ? time : simTime;
    this.UpdateAt(selectedTime);
  }

  /**
   * Applies sim-clock rebasing to pending playback times.
   */
  @carbon.method
  @impl.implemented
  OnSimClockRebase(oldTime, newTime)
  {
    const diff = newTime - oldTime;
    this.#startTime += diff;
    if (this.#endTime > 0)
    {
      this.#endTime += diff;
    }
  }

  /**
   * Updates playback at the supplied source time.
   */
  UpdateAt(time)
  {
    if (this.driver)
    {
      time = this.driver.GetCurveSetTime(time);
    }
    if (this.#endTime < 0)
    {
      this.#endTime = time - this.#endTime;
    }
    if (this.isPlaying)
    {
      if (this.#startTime < 0)
      {
        this.#startTime = this.driver ? 0 : time;
      }
      const current = time - this.#startTime;
      const delta = current - this.#lastTime;
      this.#lastTime = current;
      this.scaledTime += this.scale * delta;
      this.ApplyTimeRange();
      if (this.#endTime > 0 && this.#startTime + this.scaledTime >= this.#endTime)
      {
        this.scaledTime = this.#endTime - this.#startTime - 0.001;
        this.#stopOnNextFrame = true;
      }
      this.Apply();
    }
    if (this.#stopOnNextFrame)
    {
      this.CallStopCallback();
      this.isPlaying = false;
      this.#stopOnNextFrame = false;
    }
  }

  /**
   * Applies all curves at the current scaled time, then copies bindings.
   */
  @carbon.method
  @impl.implemented
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
   */
  @carbon.method
  @impl.implemented
  ApplyTime(time)
  {
    this.scaledTime = time;
    this.Apply();
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
    this.#isUsingSimTimeRebase = this.useSimTimeRebase;
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
    this.#startTime = -1;
    this.#endTime = 0;
    this.isPlaying = true;
    this.#lastTime = 0;
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
    this.#stopOnNextFrame = true;
  }

  /**
   * Stops playback after the supplied number of seconds.
   */
  @carbon.method
  @impl.implemented
  StopAfter(seconds)
  {
    this.#endTime = -seconds;
  }

  /**
   * Stops playback after the supplied seconds and invokes a callback.
   */
  @carbon.method
  @impl.adapted
  StopAfterWithCallback(seconds, callback)
  {
    this.StopAfter(seconds);
    this.#callback = callback;
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
    this.#hasTimeRange = true;
    this.#timeRangeMin = Math.min(timeMin, timeMax);
    this.#timeRangeMax = Math.max(timeMin, timeMax);
    this.#loopedTimeRange = looped;
  }

  /**
   * Clears the temporary scaled-time range.
   */
  @carbon.method
  @impl.implemented
  ResetTimeRange()
  {
    this.#hasTimeRange = false;
    this.#timeRangeMin = 0;
    this.#timeRangeMax = 0;
  }

  /**
   * Gets whether a temporary scaled-time range is active.
   */
  @carbon.method
  @impl.implemented
  HasTimeRange()
  {
    return this.#hasTimeRange;
  }

  /**
   * Gets the active temporary scaled-time range.
   */
  @carbon.method
  @impl.implemented
  GetTimeRange()
  {
    return [this.#timeRangeMin, this.#timeRangeMax];
  }

  /**
   * Gets whether sim-time rebase registration was requested during Initialize.
   */
  IsUsingSimTimeRebase()
  {
    return this.#isUsingSimTimeRebase;
  }

  /**
   * Constrains the playhead to the active temporary range, wrapping it around
   * the range for a looped range and clamping it to the range end otherwise;
   * does nothing when no range is set.
   */
  ApplyTimeRange()
  {
    if (!this.#hasTimeRange)
    {
      return;
    }
    if (this.scaledTime < this.#timeRangeMin)
    {
      this.scaledTime = this.#timeRangeMin;
    }
    if (this.#loopedTimeRange)
    {
      const length = this.#timeRangeMax - this.#timeRangeMin;
      if (length !== 0)
      {
        this.scaledTime = (this.scaledTime - this.#timeRangeMin) % length + this.#timeRangeMin;
      }
    }
    else
    {
      this.scaledTime = Math.min(this.scaledTime, this.#timeRangeMax);
    }
  }

  /**
   * Invokes the registered stop callback exactly once and releases it, accepting
   * either a plain function or a Carbon callable that is called and then
   * destroyed.
   */
  CallStopCallback()
  {
    if (!this.#callback)
    {
      return;
    }
    if (typeof this.#callback === "function")
    {
      this.#callback();
    }
    else
    {
      this.#callback.CallVoid?.();
      this.#callback.Destroy?.();
    }
    this.#callback = null;
  }

  /**
   * Releases the registered stop callback without invoking it, destroying it
   * when it is a Carbon callable.
   */
  DestroyStopCallback()
  {
    if (this.#callback && typeof this.#callback !== "function")
    {
      this.#callback.Destroy?.();
    }
    this.#callback = null;
  }
}
