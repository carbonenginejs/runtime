import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_useRealTime, _init_extra_useRealTime, _init_playOnLoad, _init_extra_playOnLoad, _init_bindings, _init_extra_bindings, _init_curves, _init_extra_curves, _init_ranges, _init_extra_ranges, _init_name, _init_extra_name, _init_scale, _init_extra_scale, _init_useSimTimeRebase, _init_extra_useSimTimeRebase, _init_driver, _init_extra_driver, _init_scaledTime, _init_extra_scaledTime, _init_isPlaying, _init_extra_isPlaying;

/**
 * Playable group of curves and value bindings sharing one scaled playhead,
 * applying every curve and copying every binding each update while it is
 * playing.
 */
let _TriCurveSet;
class TriCurveSet extends CjsModel {
  static {
    ({
      e: [_init_useRealTime, _init_extra_useRealTime, _init_playOnLoad, _init_extra_playOnLoad, _init_bindings, _init_extra_bindings, _init_curves, _init_extra_curves, _init_ranges, _init_extra_ranges, _init_name, _init_extra_name, _init_scale, _init_extra_scale, _init_useSimTimeRebase, _init_extra_useSimTimeRebase, _init_driver, _init_extra_driver, _init_scaledTime, _init_extra_scaledTime, _init_isPlaying, _init_extra_isPlaying, _initProto],
      c: [_TriCurveSet, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriCurveSet",
      family: "curves"
    })], [[[io, io.persist, type, type.boolean], 16, "useRealTime"], [[io, io.persist, type, type.boolean], 16, "playOnLoad"], [[io, io.persist, void 0, type.list("ITr2ValueBinding")], 16, "bindings"], [[io, io.persist, void 0, type.list("ITriFunction")], 16, "curves"], [[io, io.persist, void 0, type.list("Tr2CurveSetRange")], 16, "ranges"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.float32], 16, "scale"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "useSimTimeRebase"], [[io, io.persist, void 0, type.objectRef("ICurveSetDriver")], 16, "driver"], [[io, io.readwrite, type, type.float64], 16, "scaledTime"], [[io, io.read, type, type.boolean], 16, "isPlaying"], [[carbon, carbon.method, impl, impl.implemented], 18, "Update"], [[carbon, carbon.method, impl, impl.implemented], 18, "OnSimClockRebase"], [[carbon, carbon.method, impl, impl.implemented], 18, "Apply"], [[carbon, carbon.method, impl, impl.implemented], 18, "ApplyTime"], [[carbon, carbon.method, impl, impl.adapted], 18, "Initialize"], [[carbon, carbon.method, impl, impl.implemented], 18, "Play"], [[carbon, carbon.method, impl, impl.implemented], 18, "PlayTimeRange"], [[carbon, carbon.method, impl, impl.adapted], 18, "PlayFrom"], [[carbon, carbon.method, impl, impl.implemented], 18, "Stop"], [[carbon, carbon.method, impl, impl.implemented], 18, "StopOnNextFrame"], [[carbon, carbon.method, impl, impl.implemented], 18, "StopAfter"], [[carbon, carbon.method, impl, impl.adapted], 18, "StopAfterWithCallback"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetTimeScale"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetScaledTime"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetName"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetName"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetCurvesCount"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetCurve"], [[carbon, carbon.method, impl, impl.implemented], 18, "AddCurve"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetBindingsCount"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetBinding"], [[carbon, carbon.method, impl, impl.implemented], 18, "AddBinding"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetMaxCurveDuration"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetRangeDuration"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsPlaying"], [[carbon, carbon.method, impl, impl.adapted], 18, "UpdateWithCurrentTime"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetTimeRange"], [[carbon, carbon.method, impl, impl.implemented], 18, "ResetTimeRange"], [[carbon, carbon.method, impl, impl.implemented], 18, "HasTimeRange"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetTimeRange"]], 0, void 0, CjsModel));
  }
  useRealTime = (_initProto(this), _init_useRealTime(this, false));
  playOnLoad = (_init_extra_useRealTime(this), _init_playOnLoad(this, true));
  bindings = (_init_extra_playOnLoad(this), _init_bindings(this, []));
  curves = (_init_extra_bindings(this), _init_curves(this, []));
  ranges = (_init_extra_curves(this), _init_ranges(this, []));
  name = (_init_extra_ranges(this), _init_name(this, ""));
  scale = (_init_extra_name(this), _init_scale(this, 1));
  useSimTimeRebase = (_init_extra_scale(this), _init_useSimTimeRebase(this, false));
  driver = (_init_extra_useSimTimeRebase(this), _init_driver(this, null));
  scaledTime = (_init_extra_driver(this), _init_scaledTime(this, 0));
  isPlaying = (_init_extra_scaledTime(this), _init_isPlaying(this, false));
  #stopOnNextFrame = (_init_extra_isPlaying(this), false);
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
  Update(time, simTime, renderContext = null) {
    const selectedTime = simTime === undefined ? time : this.useRealTime ? time : simTime;
    this.UpdateAt(selectedTime, renderContext);
  }

  /**
   * Applies sim-clock rebasing to pending playback times.
   */
  OnSimClockRebase(oldTime, newTime) {
    const diff = newTime - oldTime;
    this.#startTime += diff;
    if (this.#endTime > 0) {
      this.#endTime += diff;
    }
  }

  /**
   * Updates playback at the supplied source time.
   */
  UpdateAt(time, renderContext = null) {
    if (this.driver) {
      time = this.driver.GetCurveSetTime(time);
    }
    if (this.#endTime < 0) {
      this.#endTime = time - this.#endTime;
    }
    if (this.isPlaying) {
      if (this.#startTime < 0) {
        this.#startTime = this.driver ? 0 : time;
      }
      const current = time - this.#startTime;
      const delta = current - this.#lastTime;
      this.#lastTime = current;
      this.scaledTime += this.scale * delta;
      this.ApplyTimeRange();
      if (this.#endTime > 0 && this.#startTime + this.scaledTime >= this.#endTime) {
        this.scaledTime = this.#endTime - this.#startTime - 0.001;
        this.#stopOnNextFrame = true;
      }
      this.Apply(renderContext);
    }
    if (this.#stopOnNextFrame) {
      this.CallStopCallback();
      this.isPlaying = false;
      this.#stopOnNextFrame = false;
    }
  }

  /**
   * Applies all curves at the current scaled time, then copies bindings.
   */
  Apply(renderContext = null) {
    for (const curve of this.curves) {
      curve.UpdateValue(this.scaledTime, renderContext);
    }
    for (const binding of this.bindings) {
      binding.CopyValue();
    }
  }

  /**
   * Applies all curves and bindings at an explicit scaled time.
   */
  ApplyTime(time, renderContext = null) {
    this.scaledTime = time;
    this.Apply(renderContext);
  }

  /**
   * Starts playback on load when configured.
   */
  Initialize() {
    if (this.playOnLoad) {
      this.Play();
    }
    this.#isUsingSimTimeRebase = this.useSimTimeRebase;
    return true;
  }

  /**
   * Plays from the start.
   */
  Play() {
    this.PlayFrom(0);
  }

  /**
   * Plays a named range if present.
   */
  PlayTimeRange(name) {
    const range = this.ranges.find(item => item.name === name);
    if (!range) {
      return;
    }
    this.SetTimeRange(range.startTime, range.endTime, range.looped);
    this.Play();
  }

  /**
   * Starts playback from a scaled-time offset.
   */
  PlayFrom(time) {
    this.#startTime = -1;
    this.#endTime = 0;
    this.isPlaying = true;
    this.#lastTime = 0;
    this.scaledTime = time;
    for (const curve of this.curves) {
      curve.Reset?.();
    }
    this.DestroyStopCallback();
  }

  /**
   * Stops playback.
   */
  Stop() {
    this.isPlaying = false;
  }

  /**
   * Stops playback after the next update.
   */
  StopOnNextFrame() {
    this.#stopOnNextFrame = true;
  }

  /**
   * Stops playback after the supplied number of seconds.
   */
  StopAfter(seconds) {
    this.#endTime = -seconds;
  }

  /**
   * Stops playback after the supplied seconds and invokes a callback.
   */
  StopAfterWithCallback(seconds, callback) {
    this.StopAfter(seconds);
    this.#callback = callback;
  }

  /**
   * Gets the time scale.
   */
  GetTimeScale() {
    return this.scale;
  }

  /**
   * Gets the current scaled time.
   */
  GetScaledTime() {
    return this.scaledTime;
  }

  /**
   * Sets the authored curve-set name.
   */
  SetName(name) {
    return this.SetValues({
      name
    }, {
      source: this,
      returnBoolean: true
    });
  }

  /**
   * Gets the authored curve-set name.
   */
  GetName() {
    return this.name;
  }

  /**
   * Gets the number of curves.
   */
  GetCurvesCount() {
    return this.curves.length;
  }

  /**
   * Gets a curve by index.
   */
  GetCurve(index) {
    return this.curves[index];
  }

  /**
   * Adds a curve function.
   */
  AddCurve(curve) {
    this.curves.push(curve);
  }

  /**
   * Gets the number of bindings.
   */
  GetBindingsCount() {
    return this.bindings.length;
  }

  /**
   * Gets a binding by index.
   */
  GetBinding(index) {
    return this.bindings[index];
  }

  /**
   * Adds a value binding.
   */
  AddBinding(binding) {
    this.bindings.push(binding);
  }

  /**
   * Gets the duration of the longest curve with a Length method.
   */
  GetMaxCurveDuration() {
    let maxDuration = 0;
    for (const curve of this.curves) {
      const candidate = curve;
      const length = typeof candidate.Length === "function" ? candidate.Length() : 0;
      if (length > maxDuration) {
        maxDuration = length;
      }
    }
    return maxDuration;
  }

  /**
   * Gets the duration of a named time range.
   */
  GetRangeDuration(rangeName) {
    const range = this.ranges.find(item => item.name === rangeName);
    return range ? range.endTime - range.startTime : 0;
  }

  /**
   * Gets whether playback is active.
   */
  IsPlaying() {
    return this.isPlaying;
  }

  /**
   * Updates using wall-clock seconds.
   */
  UpdateWithCurrentTime(time = Date.now() / 1000) {
    this.Update(time);
  }

  /**
   * Sets a temporary scaled-time range.
   */
  SetTimeRange(timeMin, timeMax, looped = true) {
    this.#hasTimeRange = true;
    this.#timeRangeMin = Math.min(timeMin, timeMax);
    this.#timeRangeMax = Math.max(timeMin, timeMax);
    this.#loopedTimeRange = looped;
  }

  /**
   * Clears the temporary scaled-time range.
   */
  ResetTimeRange() {
    this.#hasTimeRange = false;
    this.#timeRangeMin = 0;
    this.#timeRangeMax = 0;
  }

  /**
   * Gets whether a temporary scaled-time range is active.
   */
  HasTimeRange() {
    return this.#hasTimeRange;
  }

  /**
   * Gets the active temporary scaled-time range.
   */
  GetTimeRange() {
    return [this.#timeRangeMin, this.#timeRangeMax];
  }

  /**
   * Gets whether sim-time rebase registration was requested during Initialize.
   */
  IsUsingSimTimeRebase() {
    return this.#isUsingSimTimeRebase;
  }

  /**
   * Constrains the playhead to the active temporary range, wrapping it around
   * the range for a looped range and clamping it to the range end otherwise;
   * does nothing when no range is set.
   */
  ApplyTimeRange() {
    if (!this.#hasTimeRange) {
      return;
    }
    if (this.scaledTime < this.#timeRangeMin) {
      this.scaledTime = this.#timeRangeMin;
    }
    if (this.#loopedTimeRange) {
      const length = this.#timeRangeMax - this.#timeRangeMin;
      if (length !== 0) {
        this.scaledTime = (this.scaledTime - this.#timeRangeMin) % length + this.#timeRangeMin;
      }
    } else {
      this.scaledTime = Math.min(this.scaledTime, this.#timeRangeMax);
    }
  }

  /**
   * Invokes the registered stop callback exactly once and releases it, accepting
   * either a plain function or a Carbon callable that is called and then
   * destroyed.
   */
  CallStopCallback() {
    if (!this.#callback) {
      return;
    }
    if (typeof this.#callback === "function") {
      this.#callback();
    } else {
      this.#callback.CallVoid?.();
      this.#callback.Destroy?.();
    }
    this.#callback = null;
  }

  /**
   * Releases the registered stop callback without invoking it, destroying it
   * when it is a Carbon callable.
   */
  DestroyStopCallback() {
    if (this.#callback && typeof this.#callback !== "function") {
      this.#callback.Destroy?.();
    }
    this.#callback = null;
  }
  static {
    _initClass();
  }
}

export { _TriCurveSet as TriCurveSet };
//# sourceMappingURL=TriCurveSet.js.map
