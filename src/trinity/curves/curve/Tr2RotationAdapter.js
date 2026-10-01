// Source: trinity/trinity/Curves/Tr2RotationAdapter.h
// Source: trinity/trinity/Curves/Tr2RotationAdapter.cpp
import { quat } from "#math/quat";
import { ITriQuaternionFunction } from "#blue";
import { carbon, impl, edit, type } from "#schema";


/**
 * Quaternion function wrapping a child quaternion curve behind its own time
 * remapping, falling back to a fixed authored quaternion when no child curve is
 * attached.
 */
@type.define({
  className: "Tr2RotationAdapter",
  family: "curves"
})
export class Tr2RotationAdapter extends ITriQuaternionFunction
{
  @edit.readwrite
  @edit.persist
  @type.quat
  value = quat.create();

  @edit.readwrite
  @edit.persist
  @type.objectRef("ITriQuaternionFunction")
  curve = null;

  @edit.read
  @type.quat
  currentValue = quat.create();

  _start = 0;

  _offset = 0;

  _timeScale = 1;

  /**
   * Updates the cached quaternion through the required child Update method when present.
   * Uses the native double-time path; a missing child leaves the cache unchanged.
   * @param {number} time Time in seconds.
   * @returns {void}
   */
  @carbon.method
  @impl.implemented
  UpdateValue(time)
  {
    if (this.curve)
    {
      this.curve.Update(this.GetLocalTime(time), this.currentValue);
    }
  }

  /**
   * Updates the cache and copies the quaternion into the output buffer.
   * JavaScript retains the native double-time path with seconds first and output last; the separate tick overload is not dispatched.
   * @param {number} time Time in seconds.
   * @param {Float32Array} out Destination value.
   * @returns {Float32Array} The destination.
   */
  @carbon.method
  @impl.adapted
  Update(time, out)
  {
    if (this.curve)
    {
      this.curve.Update(this.GetLocalTime(time), this.currentValue);
    }
    else
    {
      quat.copy(this.currentValue, this.value);
    }
    return quat.copy(out, this.currentValue);
  }

  /**
   * Samples the child in local time, or copies the authored fallback value.
   * JavaScript retains the native double-time path with seconds first and output last.
   * @param {number} time Time in seconds.
   * @param {Float32Array} out Destination value.
   * @returns {Float32Array} The destination.
   */
  @carbon.method
  @impl.adapted
  GetValueAt(time, out)
  {
    if (this.curve)
    {
      return this.curve.GetValueAt(this.GetLocalTime(time), out);
    }
    return quat.copy(out, this.value);
  }

  /**
   * Writes the native identity quaternion derivative.
   * JavaScript combines the native overloads as time-first/output-last calls.
   * @param {number} _time Time in seconds.
   * @param {Float32Array} out Destination derivative.
   * @returns {Float32Array} The destination.
   */
  @carbon.method
  @impl.adapted
  GetValueDotAt(_time, out)
  {
    return quat.identity(out);
  }

  /**
   * Writes the native identity second derivative.
   * JavaScript combines native overloads as time-first/output-last calls.
   * @param {number} _time Unused time.
   * @param {Float32Array} out Destination derivative.
   * @returns {Float32Array} The destination.
   */
  @carbon.method
  @impl.adapted
  GetValueDoubleDotAt(_time, out)
  {
    return quat.identity(out);
  }

  /**
   * Chooses a random local offset within the supplied radius.
   * JavaScript retains Math.random and numeric seconds rather than native rand/modulo tick arithmetic.
   * @param {number} range Radius in seconds; zero or omission selects 60.
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
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
  @carbon.method
  @impl.implemented
  ScaleTime(scale)
  {
    this._timeScale = scale;
  }

  /**
   * Clears the retained start timestamp.
   * @returns {void}
   */
  @carbon.method
  @impl.implemented
  ResetStart()
  {
    this._start = 0;
  }

  /**
   * Computes the native private double-time local value.
   * @param {number} time Time in seconds.
   * @returns {number} Scaled time in seconds.
   */
  @carbon.method
  @impl.implemented
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
  @impl.custom
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
carbon.interfaceTable({
  interfaces: [Tr2RotationAdapter, ITriQuaternionFunction],
  chainTo: null
})(Tr2RotationAdapter);
