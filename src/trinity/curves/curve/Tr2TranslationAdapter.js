import { random as carbonRandom } from "#math/random";
// Source: trinity/trinity/Curves/Tr2TranslationAdapter.h
// Source: trinity/trinity/Curves/Tr2TranslationAdapter.cpp
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { ITriVectorFunction } from "#blue";
import { meta, type, blue } from "#schema";
import { CcpTime } from "#blue";


/**
 * Vector function wrapping a child vector curve behind its own time remapping
 * and rotating the sampled offset by a fixed rotation, falling back to a fixed
 * authored vector when no child curve is attached.
 */
@blue.define("Tr2TranslationAdapter")
export class Tr2TranslationAdapter extends ITriVectorFunction
{
  /**
   * Fallback three-component translation sampled when no child curve is attached. Spatial units
   * belong to the consuming object.
   * @type {Float32Array}
   */
  @blue.readwrite
  @blue.persist
  @type.vec3
  value = vec3.create();

  /**
   * Optional child vector function sampled using the adapter's local time.
   * @type {ITriVectorFunction|null}
   */
  @blue.readwrite
  @blue.persist
  @type.rootRef("ITriVectorFunction")
  curve = null;

  /**
   * Quaternion (x, y, z, w) applied to the sampled or fallback vector by Update; UpdateValue and
   * GetValueAt do not apply it.
   * @type {Float32Array}
   */
  @blue.readwrite
  @blue.persist
  @type.quat
  rotationOffset = quat.create();

  /**
   * Cached three-component vector from the latest update, returned by InterpolatedPosition.
   * @type {Float32Array}
   */
  @blue.read
  @type.vec3
  currentValue = vec3.create();

  /**
   * m_start - Blue ticks of the first tick-overload sample; zero is unset (latched by the ...Ticks methods, cleared by ResetStart).
   * @type {number}
   */
  _start = 0;

  /**
   * m_offset - Blue ticks added to the latched local time by the ...Ticks methods; set by RandomizeStart.
   * @type {number}
   */
  _offset = 0;

  /**
   * Dimensionless divisor applied to incoming curve time.
   * @type {number}
   */
  _timeScale = 1;

  /**
   * Reusable JavaScript scratch vector for the derivative's sample at local time.
   * @type {Float32Array}
   */
  _dotValue0 = vec3.create();

  /**
   * Reusable JavaScript scratch vector for the derivative's sample 0.1 seconds before local time.
   * @type {Float32Array}
   */
  _dotValue1 = vec3.create();

  /**
   * Updates the cached vector through the required child Update method when present.
   * Uses the native double-time path; a missing child leaves the cache unchanged.
   * @param {number} time Time in seconds.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  UpdateValue(time)
  {
    if (this.curve)
    {
      this.curve.Update(this.GetLocalTime(time), this.currentValue);
    }
  }

  /**
   * Updates the cache and copies the vector into the output buffer.
   * JavaScript retains the native double-time path with seconds first and output last; Update__Ticks is the Be::Time overload.
   * @param {number} time Time in seconds.
   * @param {Float32Array} out Destination value.
   * @returns {Float32Array} The destination.
   */
  @blue.method
  @meta.adapted
  Update(time, out)
  {
    if (this.curve)
    {
      this.curve.Update(this.GetLocalTime(time), this.currentValue);
    }
    else
    {
      vec3.copy(this.currentValue, this.value);
    }
    vec3.transformQuat(this.currentValue, this.currentValue, this.rotationOffset);
    return vec3.copy(out, this.currentValue);
  }

  /**
   * Samples the child in local time, or copies the authored fallback value.
   * JavaScript retains the native double-time path with seconds first and output last.
   * @param {number} time Time in seconds.
   * @param {Float32Array} out Destination value.
   * @returns {Float32Array} The destination.
   */
  @blue.method
  @meta.adapted
  GetValueAt(time, out)
  {
    if (this.curve)
    {
      return this.curve.GetValueAt(this.GetLocalTime(time), out);
    }
    return vec3.copy(out, this.value);
  }

  /**
   * Computes Carbon's backward finite difference without rotation offset.
   * JavaScript retains the native double-time path with seconds first and output last.
   * @param {number} time Time in seconds.
   * @param {Float32Array} out Destination derivative.
   * @returns {Float32Array} The destination.
   */
  @blue.method
  @meta.adapted
  GetValueDotAt(time, out)
  {
    if (!this.curve)
    {
      return vec3.zero(out);
    }
    const localTime = this.GetLocalTime(time);
    this.curve.GetValueAt(localTime, this._dotValue0);
    this.curve.GetValueAt(localTime - 0.1, this._dotValue1);
    vec3.subtract(out, this._dotValue1, this._dotValue0);
    return vec3.scale(out, out, 10);
  }

  /**
   * Carbon's GetValueDotAt(Be::Time): latches the start, then the backward difference at local time (cpp:102-117).
   * JavaScript cannot overload on argument type, so the Be::Time overload has its own name.
   * @param {number} time Scene time in Blue 100ns ticks.
   * @param {Float32Array} out Destination derivative.
   * @returns {Float32Array} The destination.
   */
  @meta.adapted
  GetValueDotAt__Ticks(time, out)
  {
    if (this._start === 0) this._start = time;
    if (!this.curve)
    {
      return vec3.zero(out);
    }
    const localTime = this.GetLocalTime__Ticks(time);
    this.curve.GetValueAt(localTime, this._dotValue0);
    this.curve.GetValueAt(localTime - 0.1, this._dotValue1);
    vec3.subtract(out, this._dotValue1, this._dotValue0);
    return vec3.scale(out, out, 10);
  }

  /**
   * Writes the native zero second derivative.
   * JavaScript combines native overloads as time-first/output-last calls.
   * @param {number} _time Unused time.
   * @param {Float32Array} out Destination derivative.
   * @returns {Float32Array} The destination.
   */
  @blue.method
  @meta.adapted
  GetValueDoubleDotAt(_time, out)
  {
    return vec3.zero(out);
  }

  /**
   * Copies the cached position without sampling the child.
   * JavaScript uses a caller-owned array with time first instead of the native output pointer.
   * @param {number} _time Unused time.
   * @param {Float32Array|Float64Array} out Destination position.
   * @returns {Float32Array|Float64Array} The destination.
   */
  @blue.method
  @meta.adapted
  InterpolatedPosition(_time, out)
  {
    return vec3.copy(out, this.currentValue);
  }

  /**
   * Chooses a random local offset within the supplied radius.
   * Uses the native CRT rand()/modulo tick arithmetic; the offset is stored in ticks.
   * @param {number} range Radius in seconds; zero or omission selects 60.
   * @returns {void}
   */
  @blue.method
  @meta.adapted
  RandomizeStart(range = 60)
  {
    const radius = range || 60;
    const tickRange = Math.trunc(radius * 10_000_000);
    this._offset = carbonRandom.crtRand() % ((tickRange * 2) | 0) - tickRange;
  }

  /**
   * Sets the divisor used for local curve time.
   * @param {number} scale Time divisor.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  ScaleTime(scale)
  {
    this._timeScale = scale;
  }

  /**
   * Clears the retained start timestamp.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  ResetStart()
  {
    this._start = 0;
  }

  /**
   * Computes the native private double-time local value.
   * @param {number} time Time in seconds.
   * @returns {number} Scaled time in seconds.
   */
  @blue.method
  @meta.implemented
  GetLocalTime(time)
  {
    return time / this._timeScale;
  }

  /**
   * Carbon's GetLocalTime(Be::Time): ticks since the latched start plus the offset, in scaled seconds (Tr2TranslationAdapter.cpp:186-189).
   * JavaScript cannot overload on argument type, so the Be::Time overload has its own name.
   * @param {number} time Scene time in Blue 100ns ticks.
   * @returns {number} Local time in seconds.
   */
  @meta.adapted
  GetLocalTime__Ticks(time)
  {
    return CcpTime.timeAsDouble(time - this._start + this._offset) / this._timeScale;
  }

  /**
   * Carbon's Update(Be::Time): latches the start on first use, then updates from local time and applies the rotation offset.
   * JavaScript cannot overload on argument type, so the Be::Time overload has its own name.
   * @param {number} time Scene time in Blue 100ns ticks.
   * @param {Float32Array} out Destination value.
   * @returns {Float32Array} The destination.
   */
  @meta.adapted
  Update__Ticks(time, out)
  {
    if (this._start === 0) this._start = time;
    if (this.curve)
    {
      this.curve.Update(this.GetLocalTime__Ticks(time), this.currentValue);
    }
    else
    {
      vec3.copy(this.currentValue, this.value);
    }
    vec3.transformQuat(this.currentValue, this.currentValue, this.rotationOffset);
    return vec3.copy(out, this.currentValue);
  }

  /**
   * Carbon's GetValueAt(Be::Time): latches the start on first use and samples the child at local time.
   * JavaScript cannot overload on argument type, so the Be::Time overload has its own name.
   * @param {number} time Scene time in Blue 100ns ticks.
   * @param {Float32Array} out Destination value.
   * @returns {Float32Array} The destination.
   */
  @meta.adapted
  GetValueAt__Ticks(time, out)
  {
    if (this._start === 0) this._start = time;
    if (this.curve)
    {
      return this.curve.GetValueAt(this.GetLocalTime__Ticks(time), out);
    }
    return vec3.copy(out, this.value);
  }
}

// Exact native exposure table; ITriFunction is intentionally not mapped.
blue.interface(ITriVectorFunction)(Tr2TranslationAdapter);
