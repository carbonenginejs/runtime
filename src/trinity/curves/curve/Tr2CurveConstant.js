// Source: trinity/trinity/Curves/Tr2CurveConstant.h
// Source: trinity/trinity/Curves/Tr2CurveConstant.cpp
import { ITriScalarFunction, ITriVectorFunction, ITriQuaternionFunction, ITriColorFunction, ITriFunction } from "#blue";
import { quat } from "#math/quat";
import { copyArrayLike } from "#utils";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { meta } from "#schema";


/**
 * Curve returning the same authored vec4 at every time, usable as a scalar,
 * vector, quaternion or color function; its derivatives are always zero
 * (identity for quaternions). JavaScript combines native overloads into time-first
 * calls with an optional output buffer; the mapped interfaces retain their identities.
 */
@meta.define({
  className: "Tr2CurveConstant",
  family: "curves",
  members: [
    { name: "name", key: "name", type: { kind: "string" }, edit: { read: true, write: true, persist: true } },
    { name: "currentValue", key: "value", type: { kind: "vec4" }, edit: { read: true } },
    { name: "value", key: "value", type: { kind: "vec4" }, edit: { read: true, write: true, persist: true } }
  ]
})
@meta.blue.inherit(ITriVectorFunction, ITriQuaternionFunction, ITriColorFunction)
export class Tr2CurveConstant extends ITriScalarFunction
{
  /**
   * Name identifying this constant function across its mapped value interfaces (native std::string m_name).
   * @type {string}
   */
  name = "";

  /**
   * Authored constant Vector4 storage; scalar sampling reads x and currentValue aliases the same buffer.
   * @type {Float32Array|number[]}
   */
  value = vec4.create();

  /**
   * Carbon exposes m_value twice; the JavaScript alias follows replacement too.
   * @returns {Float32Array|number[]} The authored value storage.
   */
  @meta.ours
  get currentValue()
  {
    return this.value;
  }

  /**
   * Carbon no-op retained for function interface compatibility.
   *
   * @param {number} _time Time in seconds.
   * @returns {void}
   */
  @meta.blue.method
  @meta.noop
  UpdateValue(_time)
  {
  }

  /**
   * Returns the scalar component, or copies the constant into the supplied output.
   *
   * @param {number} time Time in seconds.
   * @param {Float32Array|number[]} [out] Caller-owned output storage.
   * @returns {number|Float32Array|number[]} The supplied output or scalar value.
   */
  @meta.blue.method
  @meta.adapted
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
   * @param {number} time Time in seconds.
   * @param {Float32Array|number[]} [out] Caller-owned output storage.
   * @returns {number|Float32Array|number[]} The supplied output or scalar value.
   */
  @meta.blue.method
  @meta.adapted
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
   * Carbon no-op retained for scalar function interface compatibility.
   *
   * @param {number} _scale Curve parameter.
   * @returns {void}
   */
  @meta.blue.method
  @meta.noop
  ScaleTime(_scale)
  {
  }

  /**
   * Gets the first derivative vector or quaternion for the supplied time.
   *
   * @param {number} _time Time in seconds.
   * @param {Float32Array|number[]} out Caller-owned output storage.
   * @returns {Float32Array|number[]} The caller-owned output.
   */
  @meta.blue.method
  @meta.implemented
  GetValueDotAt(_time, out)
  {
    return Tr2CurveConstant._setDerivative(out);
  }

  /**
   * Gets the second derivative vector or quaternion for the supplied time.
   *
   * @param {number} _time Time in seconds.
   * @param {Float32Array|number[]} out Caller-owned output storage.
   * @returns {Float32Array|number[]} The caller-owned output.
   */
  @meta.blue.method
  @meta.implemented
  GetValueDoubleDotAt(_time, out)
  {
    return Tr2CurveConstant._setDerivative(out);
  }

  /**
   * Copies the constant vector value into `out`.
   *
   * @param {number} _time Time in seconds.
   * @param {Float32Array|number[]} out Caller-owned output storage.
   * @returns {Float32Array|number[]} The caller-owned output.
   */
  @meta.blue.method
  @meta.adapted
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
  @meta.ours
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
  @meta.ours
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
meta.blue.interfaceTable({
  interfaces: [Tr2CurveConstant, ITriScalarFunction, ITriVectorFunction, ITriQuaternionFunction, ITriColorFunction, ITriFunction],
  chainTo: null
})(Tr2CurveConstant);
