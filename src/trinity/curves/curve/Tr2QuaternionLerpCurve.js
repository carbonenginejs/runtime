// Source: trinity/trinity/Curves/Tr2QuaternionLerpCurve.h
// Source: trinity/trinity/Curves/Tr2QuaternionLerpCurve.cpp
import { num } from "#math/num";
import { quat } from "#math/quat";
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";


/**
 * Quaternion curve that spherically interpolates between two child quaternion
 * curves, ramping the blend from 0 to 1 over `length` seconds starting at
 * `start` and clamping outside that window.
 */
@type.define({
  className: "Tr2QuaternionLerpCurve",
  family: "curves"
})
export class Tr2QuaternionLerpCurve extends CjsModel
{
  @io.persist
  @type.float64
  start = 0;

  @io.persist
  @type.float32
  length = 0;

  @io.persist
  @type.quat
  value = quat.create();

  @io.persist
  @type.objectRef("ITriQuaternionFunction")
  startCurve = null;

  @io.persist
  @type.objectRef("ITriQuaternionFunction")
  endCurve = null;

  #startValue = quat.create();

  #endValue = quat.create();

  /**
   * Updates the cached quaternion value for the supplied time.
   */
  @carbon.method
  @impl.implemented
  UpdateValue(time)
  {
    this.Update(time, this.value);
  }

  /**
   * Updates the cached value and copies it into `out`.
   */
  @carbon.method
  @impl.adapted
  Update(time, out)
  {
    this.GetValueAt(time, this.value);
    return quat.copy(out, this.value);
  }

  /**
   * Gets the quaternion value at `time` into `out`.
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
    const start = this.startCurve.GetValueAt(time, this.#startValue);
    const end = this.endCurve.GetValueAt(time, this.#endValue);
    return quat.slerp(out, start, end, ratio);
  }

  /**
   * Derivative stub retained for Carbon interface compatibility.
   */
  @carbon.method
  @impl.noop
  GetValueDotAt(_time, out)
  {
    return out;
  }

  /**
   * Second-derivative stub retained for Carbon interface compatibility.
   */
  @carbon.method
  @impl.noop
  GetValueDoubleDotAt(_time, out)
  {
    return out;
  }

  /**
   * Gets the authored blend duration.
   */
  @carbon.method
  @impl.implemented
  Length()
  {
    return this.length;
  }
}
