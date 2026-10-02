// Source: trinity/trinity/Curves/Tr2TranslationAdapter.h
// Source: trinity/trinity/Curves/Tr2TranslationAdapter.cpp
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { ITriVectorFunction } from "#blue";
import { meta } from "#schema";


/**
 * Vector function wrapping a child vector curve behind its own time remapping
 * and rotating the sampled offset by a fixed rotation, falling back to a fixed
 * authored vector when no child curve is attached.
 */
@meta.define({
  className: "Tr2TranslationAdapter",
  family: "curves"
})
export class Tr2TranslationAdapter extends ITriVectorFunction
{
  /**
   * Fallback three-component translation sampled when no child curve is attached. Spatial units
   * belong to the consuming object.
   * @type {Float32Array}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  value = vec3.create();

  /**
   * Optional child vector function sampled using the adapter's local time.
   * @type {ITriVectorFunction|null}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("ITriVectorFunction")
  curve = null;

  /**
   * Quaternion (x, y, z, w) applied to the sampled or fallback vector by Update; UpdateValue and
   * GetValueAt do not apply it.
   * @type {Float32Array}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.quat
  rotationOffset = quat.create();

  /**
   * Cached three-component vector from the latest update, returned by InterpolatedPosition.
   * @type {Float32Array}
   */
  @meta.blue.read
  @meta.type.vec3
  currentValue = vec3.create();

  /**
   * Start timestamp in JavaScript seconds for GetStartAwareLocalTime; zero is its unset/reset
   * sentinel. Native stores ticks; ordinary sampling ignores this field.
   * @type {number}
   */
  _start = 0;

  /**
   * Random time offset in JavaScript seconds used by GetStartAwareLocalTime. Native stores ticks;
   * ordinary sampling ignores this field.
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
  @meta.blue.method
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
   * JavaScript retains the native double-time path with seconds first and output last; the separate tick overload is not dispatched.
   * @param {number} time Time in seconds.
   * @param {Float32Array} out Destination value.
   * @returns {Float32Array} The destination.
   */
  @meta.blue.method
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
  @meta.blue.method
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
  @meta.blue.method
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
   * Writes the native zero second derivative.
   * JavaScript combines native overloads as time-first/output-last calls.
   * @param {number} _time Unused time.
   * @param {Float32Array} out Destination derivative.
   * @returns {Float32Array} The destination.
   */
  @meta.blue.method
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
  @meta.blue.method
  @meta.adapted
  InterpolatedPosition(_time, out)
  {
    return vec3.copy(out, this.currentValue);
  }

  /**
   * Chooses a random local offset within the supplied radius.
   * JavaScript retains Math.random and numeric seconds rather than native rand/modulo tick arithmetic.
   * @param {number} range Radius in seconds; zero or omission selects 60.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  RandomizeStart(range = 60)
  {
    const radius = range || 60;
    this._offset = (Math.random() * 2 - 1) * radius;
  }

  /**
   * Sets the divisor used for local curve time.
   * @param {number} scale Time divisor.
   * @returns {void}
   */
  @meta.blue.method
  @meta.implemented
  ScaleTime(scale)
  {
    this._timeScale = scale;
  }

  /**
   * Clears the retained start timestamp.
   * @returns {void}
   */
  @meta.blue.method
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
  @meta.blue.method
  @meta.implemented
  GetLocalTime(time)
  {
    return time / this._timeScale;
  }

  /**
   * Retains the separate JavaScript start-aware numeric-seconds helper.
   * The native overload takes Be::Time ticks; this helper uses seconds and initializes start locally. Update and sampling keep the double-time path.
   * @param {number} time Time in seconds.
   * @returns {number} Start-aware scaled seconds.
   */
  @meta.ours
  GetStartAwareLocalTime(time)
  {
    if (this._start === 0)
    {
      this._start = time;
    }
    return (time - this._start + this._offset) / this._timeScale;
  }
}

// Exact native exposure table; ITriFunction is intentionally not mapped.
meta.blue.interfaceTable({
  interfaces: [Tr2TranslationAdapter, ITriVectorFunction],
  chainTo: null
})(Tr2TranslationAdapter);
