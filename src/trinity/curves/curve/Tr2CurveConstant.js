// Source: trinity/trinity/Curves/Tr2CurveConstant.h
// Source: trinity/trinity/Curves/Tr2CurveConstant.cpp
import { quat } from "#math/quat";
import { copyArrayLike } from "#utils";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";


/**
 * Curve returning the same authored vec4 at every time, usable as a scalar,
 * vector, quaternion or color function; its derivatives are always zero
 * (identity for quaternions).
 */
@type.define({
  className: "Tr2CurveConstant",
  family: "curves"
})
export class Tr2CurveConstant extends CjsModel
{
  @io.persist
  @type.string
  name = "";

  @io.persist
  @type.vec4
  value = vec4.create();

  @io.read
  @type.vec4
  currentValue = this.value;

  /**
   * Carbon no-op retained for function interface compatibility.
   */
  @carbon.method
  @impl.noop
  UpdateValue(_time)
  {
  }

  /**
   * Evaluates the constant scalar value.
   */

  /**
   * Copies the constant vector value into `out`.
   */

  /**
   * Copies the constant quaternion value into `out`.
   */

  /**
   * Copies the constant color value into `out`.
   */

  @carbon.method
  @impl.adapted
  Update(time, out)
  {
    if (out === undefined)
    {
      return this.value[0];
    }
    void time;
    return Tr2CurveConstant.#copyValue(out, this.value);
  }

  /**
   * Gets the constant scalar value.
   */

  /**
   * Copies the constant vector value into `out`.
   */

  /**
   * Copies the constant quaternion value into `out`.
   */

  /**
   * Copies the constant color value into `out`.
   */

  @carbon.method
  @impl.adapted
  GetValueAt(time, out)
  {
    if (out === undefined)
    {
      return this.value[0];
    }
    void time;
    return Tr2CurveConstant.#copyValue(out, this.value);
  }

  /**
   * Carbon no-op retained for scalar function interface compatibility.
   */
  @carbon.method
  @impl.noop
  ScaleTime(_scale)
  {
  }

  /**
   * Gets the first derivative vector or quaternion for the supplied time.
   */

  /**
   * Gets the first derivative vector or quaternion for the supplied time.
   */

  @carbon.method
  @impl.implemented
  GetValueDotAt(_time, out)
  {
    return Tr2CurveConstant.#setDerivative(out);
  }

  /**
   * Gets the second derivative vector or quaternion for the supplied time.
   */

  /**
   * Gets the second derivative vector or quaternion for the supplied time.
   */

  @carbon.method
  @impl.implemented
  GetValueDoubleDotAt(_time, out)
  {
    return Tr2CurveConstant.#setDerivative(out);
  }

  /**
   * Copies the constant vector value into `out`.
   */
  @carbon.method
  @impl.adapted
  InterpolatedPosition(_time, out)
  {
    return vec3.copy(out, this.value);
  }

  /**
   * Copies as many components of the constant into the caller-owned `out` as it
   * can hold.
   */
  static #copyValue(out, value)
  {
    return copyArrayLike(out, value);
  }

  /**
   * Writes the zero derivative into `out`, using the identity quaternion for a
   * 4-component output and the zero vector otherwise.
   */
  static #setDerivative(out)
  {
    if (out.length > 3)
    {
      return quat.identity(out);
    }
    return vec3.zero(out);
  }
}
