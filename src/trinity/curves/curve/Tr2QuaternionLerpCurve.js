// Source: trinity/trinity/Curves/Tr2QuaternionLerpCurve.h
// Source: trinity/trinity/Curves/Tr2QuaternionLerpCurve.cpp
import { num } from "#math/num";
import { quat } from "#math/quat";
import { ITriFunction, ITriQuaternionFunction, ITriCurveLength } from "#blue";
import { carbon, impl, edit, type } from "#schema";


/**
 * Quaternion curve that spherically interpolates between two child quaternion
 * curves, ramping the blend from 0 to 1 over `length` seconds starting at
 * `start` and clamping outside that window.
 */
@type.define({
  className: "Tr2QuaternionLerpCurve",
  family: "curves"
})
@carbon.inherit(ITriCurveLength)
export class Tr2QuaternionLerpCurve extends ITriQuaternionFunction
{
  /**
   * Blend-window start in the existing JavaScript seconds representation; native m_start stores
   * Be::Time ticks.
   * @type {number}
   */
  @edit.readwrite
  @edit.persist
  @type.float64
  start = 0;

  /**
   * Blend duration in seconds; a nonpositive duration leaves the sampling destination unchanged.
   * @type {number}
   */
  @edit.readwrite
  @edit.persist
  @type.float32
  length = 0;

  /**
   * Cached quaternion (x, y, z, w), updated by Update and UpdateValue; retained when blending
   * cannot produce a sample.
   * @type {Float32Array}
   */
  @edit.readwrite
  @edit.persist
  @type.quat
  value = quat.create();

  /**
   * Optional quaternion function supplying the blend's starting orientation at the requested
   * sample time.
   * @type {ITriQuaternionFunction|null}
   */
  @edit.readwrite
  @edit.persist
  @type.objectRef("ITriQuaternionFunction")
  startCurve = null;

  /**
   * Optional quaternion function supplying the blend's ending orientation at the requested sample
   * time.
   * @type {ITriQuaternionFunction|null}
   */
  @edit.readwrite
  @edit.persist
  @type.objectRef("ITriQuaternionFunction")
  endCurve = null;

  /**
   * Reusable JavaScript quaternion buffer for the starting function's sample.
   * @type {Float32Array}
   */
  _startValue = quat.create();

  /**
   * Reusable JavaScript quaternion buffer for the ending function's sample.
   * @type {Float32Array}
   */
  _endValue = quat.create();

  /**
   * Updates the cached value for the supplied time.
   * @param {number} time Time in seconds.
   * @returns {void}
   */
  @carbon.method
  @impl.implemented
  UpdateValue(time)
  {
    this.Update(time, this.value);
  }

  /**
   * Updates the cache and copies it into the caller-owned output.
   * JavaScript combines native time overloads with seconds first and output last.
   * @param {number} time Time in seconds.
   * @param {Float32Array} out Destination value.
   * @returns {Float32Array} The destination.
   */
  @carbon.method
  @impl.adapted
  Update(time, out)
  {
    this.GetValueAt(time, this.value);
    return quat.copy(out, this.value);
  }

  /**
   * Samples into the caller-owned output without updating the cache.
   * JavaScript combines native time overloads with seconds first and output last.
   * The existing seconds-valued start field is retained; native Be::Time conversion remains unported.
   * @param {number} time Time in seconds.
   * @param {Float32Array} out Destination value.
   * @returns {Float32Array} The destination.
   */
  @carbon.method
  @impl.adapted
  GetValueAt(time, out)
  {
    if (!this.startCurve || !this.endCurve || this.length <= 0)
    {
      return out;
    }
    const ratio = num.clamp((time - this.start) / this.length, 0, 1);
    const start = this.startCurve.GetValueAt(time, this._startValue);
    const end = this.endCurve.GetValueAt(time, this._endValue);
    return quat.slerp(out, start, end, ratio);
  }

  /**
   * Retains the native no-op first derivative, leaving output unchanged.
   * @param {number} _time Unused time in seconds.
   * @param {Float32Array} out Destination value.
   * @returns {Float32Array} The unchanged destination.
   */
  @carbon.method
  @impl.noop
  GetValueDotAt(_time, out)
  {
    return out;
  }

  /**
   * Retains the native no-op second derivative, leaving output unchanged.
   * @param {number} _time Unused time in seconds.
   * @param {Float32Array} out Destination value.
   * @returns {Float32Array} The unchanged destination.
   */
  @carbon.method
  @impl.noop
  GetValueDoubleDotAt(_time, out)
  {
    return out;
  }

  /**
   * Gets the authored blend duration.
   * @returns {number} Duration in seconds.
   */
  @carbon.method
  @impl.implemented
  Length()
  {
    return this.length;
  }
}

// Exact native exposure table; no inherited or implicit entries.
carbon.interfaceTable({
  interfaces: [ITriFunction, ITriQuaternionFunction, ITriCurveLength],
  chainTo: null
})(Tr2QuaternionLerpCurve);
