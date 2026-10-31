// Source: trinity/trinity/Curves/Tr2CurveConstant.h
// Source: trinity/trinity/Curves/Tr2CurveConstant.cpp
import { ITriScalarFunction, ITriVectorFunction, ITriQuaternionFunction, ITriColorFunction, ITriFunction, CcpTime } from "#blue";
import { quat } from "#math/quat";
import { copyArrayLike } from "#utils";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { exposure as be } from "#be";
import { type } from "#schema";


/**
 * Curve returning the same authored vec4 at every time, usable as a scalar,
 * vector, quaternion or color function; its derivatives are always zero
 * (identity for quaternions). JavaScript combines native overloads into time-first
 * calls with an optional output buffer; the mapped interfaces retain their identities.
 */
@be.define("Tr2CurveConstant")
@be.inherit(ITriVectorFunction, ITriQuaternionFunction, ITriColorFunction)
@be.mapInterface(ITriScalarFunction)
@be.mapInterface(ITriVectorFunction)
@be.mapInterface(ITriQuaternionFunction)
@be.mapInterface(ITriColorFunction)
export class Tr2CurveConstant extends ITriScalarFunction
{
  /**
   * Name identifying this constant function across its mapped value interfaces (native std::string m_name).
   * @type {string}
   */
  @be.mapAttribute(be.READWRITE | be.PERSIST)
  @type.string
  name = "";

  /**
   * Authored constant Vector4 storage; scalar sampling reads x and currentValue aliases the same buffer.
   * Carbon maps m_value twice: "value" READWRITE | PERSIST and "currentValue" READ (Tr2CurveConstant_Blue.cpp:27, 33).
   * @type {Float32Array|number[]}
   */
  @be.mapAttribute(be.READ, "currentValue")
  @be.mapAttribute(be.READWRITE | be.PERSIST)
  @type.vec4
  value = vec4.create();

  /**
   * Carbon exposes m_value twice; the JavaScript alias follows replacement too.
   * @returns {Float32Array|number[]} The authored value storage.
   */
  get currentValue()
  {
    return this.value;
  }

  /**
   * Carbon no-op retained for function interface compatibility.
   *
   * @adapted
   * @param {number} _time Time in seconds.
   * @returns {void}
   */

  UpdateValue(_time)
  {
  }

  /**
   * Returns the scalar component, or copies the constant into the supplied output.
   *
   * @adapted
   * @param {number} time Time in seconds.
   * @param {Float32Array|number[]} [out] Caller-owned output storage.
   * @returns {number|Float32Array|number[]} The supplied output or scalar value.
   */

  Update(time, out)
  {
    if (out === undefined)
    {
      return this.value[0];
    }
    void time;
    return Tr2CurveConstant._copyValue(out, this.value);
  }

  /**
   * Returns the scalar component, or copies the constant into the supplied output.
   *
   * @adapted
   * @param {number} time Time in seconds.
   * @param {Float32Array|number[]} [out] Caller-owned output storage.
   * @returns {number|Float32Array|number[]} The supplied output or scalar value.
   */

  GetValueAt(time, out)
  {
    if (out === undefined)
    {
      return this.value[0];
    }
    void time;
    return Tr2CurveConstant._copyValue(out, this.value);
  }

  /**
   * Carbon's Update(Be::Time) for every interface the constant implements: the scalar form returns the value, the
   * vector, quaternion and color forms copy it into out (cpp:49-67, 114-131). The scalar base's one-argument tick
   * method would drop out, so the constant declares its own. JavaScript cannot overload on argument type, so the Be::Time overload has its own name.
   *
   * @adapted
   * @param {number} time Scene time in Blue 100ns ticks.
   * @param {Float32Array|number[]} [out] Caller-owned output storage for the non-scalar forms.
   * @returns {number|Float32Array|number[]} The supplied output or scalar value.
   */
  Update__Ticks(time, out)
  {
    return this.Update(CcpTime.timeAsDouble(time), out);
  }

  /**
   * Carbon's GetValueAt(Be::Time) for every interface the constant implements, as Update__Ticks. JavaScript cannot overload on argument type, so the Be::Time overload has its own name.
   *
   * @adapted
   * @param {number} time Scene time in Blue 100ns ticks.
   * @param {Float32Array|number[]} [out] Caller-owned output storage for the non-scalar forms.
   * @returns {number|Float32Array|number[]} The supplied output or scalar value.
   */
  GetValueAt__Ticks(time, out)
  {
    return this.GetValueAt(CcpTime.timeAsDouble(time), out);
  }

  /**
   * Carbon no-op retained for scalar function interface compatibility.
   *
   * @adapted
   * @param {number} _scale Curve parameter.
   * @returns {void}
   */

  ScaleTime(_scale)
  {
  }

  /**
   * Gets the first derivative vector or quaternion for the supplied time.
   *
   * @implemented
   * @param {number} _time Time in seconds.
   * @param {Float32Array|number[]} out Caller-owned output storage.
   * @returns {Float32Array|number[]} The caller-owned output.
   */

  GetValueDotAt(_time, out)
  {
    return Tr2CurveConstant._setDerivative(out);
  }

  /**
   * Gets the second derivative vector or quaternion for the supplied time.
   *
   * @implemented
   * @param {number} _time Time in seconds.
   * @param {Float32Array|number[]} out Caller-owned output storage.
   * @returns {Float32Array|number[]} The caller-owned output.
   */

  GetValueDoubleDotAt(_time, out)
  {
    return Tr2CurveConstant._setDerivative(out);
  }

  /**
   * Copies the constant vector value into `out`.
   *
   * @adapted
   * @param {number} _time Time in seconds.
   * @param {Float32Array|number[]} out Caller-owned output storage.
   * @returns {Float32Array|number[]} The caller-owned output.
   */

  InterpolatedPosition(_time, out)
  {
    return vec3.copy(out, this.value);
  }

  /**
   * Copies as many components of the constant into the caller-owned `out` as it
   * can hold.
   *
   * @param {Float32Array|number[]} out Caller-owned output storage.
   * @param {Float32Array|number[]} value Curve parameter.
   * @returns {Float32Array|number[]} The caller-owned output.
   */
  static _copyValue(out, value)
  {
    return copyArrayLike(out, value);
  }

  /**
   * Writes the zero derivative into `out`, using the identity quaternion for a
   * 4-component output and the zero vector otherwise.
   *
   * @param {Float32Array|number[]} out Caller-owned output storage.
   * @returns {Float32Array|number[]} The caller-owned output.
   */
  static _setDerivative(out)
  {
    if (out.length > 3)
    {
      return quat.identity(out);
    }
    return vec3.zero(out);
  }
}

// Native exposure ends at this concrete table (Tr2CurveConstant_Blue.cpp).
