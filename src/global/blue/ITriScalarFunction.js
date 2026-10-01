// Source: blue/include/ITriFunction.h:36-63
import { CjsSchema, meta } from "#schema";
import { ITriFunction } from "./ITriFunction.js";


/**
 * Scalar-valued time function. JavaScript has no overloads: each Be::Time and
 * double pair is one abstract operation. This contract performs no time
 * conversion; the concrete class documents its accepted representation.
 */
export class ITriScalarFunction extends ITriFunction
{
  /**
   * Updates and returns the current scalar value.
   * Native signatures: float Update(Be::Time time) = 0; float Update(double time) = 0.
   * @param {number|bigint} _time Native Be::Time or double argument; the concrete implementation owns its representation.
   * @returns {number} Native float value.
   */
  Update(_time)
  {
  }

  /**
   * Evaluates the scalar without changing the function's internal state.
   * Native signatures: float GetValueAt(Be::Time time) = 0; float GetValueAt(double time) = 0.
   * @param {number|bigint} _time Native Be::Time or double argument; the concrete implementation owns its representation.
   * @returns {number} Native float value.
   */
  GetValueAt(_time)
  {
  }

  /**
   * Scales the function's time coordinates.
   * Native signature: void ScaleTime(float s) = 0.
   * @param {number} _s Native float scale.
   * @returns {void}
   */
  ScaleTime(_s)
  {
  }
}

for (const method of [ "Update", "GetValueAt", "ScaleTime" ])
{
  CjsSchema.decorateMethod(ITriScalarFunction, method, meta.compose.abstract, meta.impl.abstract);
}
CjsSchema.define(ITriScalarFunction, {
  className: "ITriScalarFunction", carbon: "ITriScalarFunction", family: "blue", fields: {}
});
