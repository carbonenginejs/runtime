// Source: trinity/trinity/Curves/Tr2RotationAdapter.h
// Source: trinity/trinity/Curves/Tr2RotationAdapter.cpp
import { quat } from "#math/quat";
import { ITriQuaternionFunction } from "#blue";
import { meta, type, blue } from "#schema";
import { CcpTime } from "#blue";


/**
 * Quaternion function wrapping a child quaternion curve behind its own time
 * remapping, falling back to a fixed authored quaternion when no child curve is
 * attached.
 */
@blue.define("Tr2RotationAdapter")
export class Tr2RotationAdapter extends ITriQuaternionFunction
{
  /**
   * Authored fallback quaternion (x, y, z, w), used by Update and GetValueAt when no child curve
   * is attached.
   * @type {Float32Array}
   */
  @blue.readwrite
  @blue.persist
  @type.quat
  value = quat.create();

  /**
   * Optional child quaternion function sampled using the adapter's remapped time.
   * @type {ITriQuaternionFunction|null}
   */
  @blue.readwrite
  @blue.persist
  @type.rootRef("ITriQuaternionFunction")
  curve = null;

  /**
   * Cached quaternion from the latest update; UpdateValue leaves it unchanged when no child curve
   * is attached.
   * @type {Float32Array}
   */
  @blue.read
  @type.quat
  currentValue = quat.create();

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
   * Dimensionless divisor applied to incoming sample time, set by ScaleTime.
   * @type {number}
   */
  _timeScale = 1;

  /**
   * Updates the cached quaternion through the required child Update method when present.
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
   * Updates the cache and copies the quaternion into the output buffer.
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
  @blue.method
  @meta.adapted
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
  @blue.method
  @meta.adapted
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
  @blue.method
  @meta.adapted
  GetValueDoubleDotAt(_time, out)
  {
    return quat.identity(out);
  }

  /**
   * Chooses a random local offset within the supplied radius.
   * JavaScript draws uniformly with Math.random rather than native rand()/modulo tick arithmetic; the offset is stored in ticks.
   * @param {number} range Radius in seconds; zero or omission selects 60.
   * @returns {void}
   */
  @blue.method
  @meta.adapted
  RandomizeStart(range = 60)
  {
    const radius = range || 60;
    this._offset = Math.round((Math.random() * 2 - 1) * radius * 10_000_000);
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
   * Carbon's GetLocalTime(Be::Time): ticks since the latched start plus the offset, in scaled seconds (Tr2RotationAdapter.cpp:145-148).
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
   * Carbon's Update(Be::Time): latches the start on first use, then updates from local time.
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
      quat.copy(this.currentValue, this.value);
    }
    return quat.copy(out, this.currentValue);
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
    return quat.copy(out, this.value);
  }
}

// Exact native exposure table; ITriFunction is intentionally not mapped.
blue.interface(ITriQuaternionFunction)(Tr2RotationAdapter);
