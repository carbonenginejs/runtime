// Source: blue/include/ITriFunction.h:36-63
import { CjsSchema, meta } from "#schema";
import { ITriFunction } from "./ITriFunction.js";
import { CcpTime } from "./CcpTime.js";


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

  /**
   * Carbon's Update(Be::Time) overload. The shared body converts the ticks with TimeAsDouble and calls the
   * seconds overload, as Carbon's curves do; a class whose Be::Time body differs overrides it.
   * JavaScript cannot overload on argument type: Be::Time and double are both Numbers here
   * (blue/include/ITriFunction.h:65-124), so Carbon's Be::Time overload has its own name.
   * @param {number} time Scene time in Blue 100ns ticks.
   * @returns {number} The Update result.
   */
  Update__Ticks(time)
  {
    return this.Update(CcpTime.timeAsDouble(time));
  }

  /**
   * Carbon's GetValueAt(Be::Time) overload. The shared body converts the ticks with TimeAsDouble and calls the
   * seconds overload, as Carbon's curves do; a class whose Be::Time body differs overrides it.
   * JavaScript cannot overload on argument type: Be::Time and double are both Numbers here
   * (blue/include/ITriFunction.h:65-124), so Carbon's Be::Time overload has its own name.
   * @param {number} time Scene time in Blue 100ns ticks.
   * @returns {number} The GetValueAt result.
   */
  GetValueAt__Ticks(time)
  {
    return this.GetValueAt(CcpTime.timeAsDouble(time));
  }
}

for (const method of [ "Update", "GetValueAt", "ScaleTime" ])
{
  CjsSchema.decorateMethod(ITriScalarFunction, method, meta.requires, meta.abstract);
}
CjsSchema.decorateMethod(ITriScalarFunction, "Update__Ticks", meta.adapted);
CjsSchema.decorateMethod(ITriScalarFunction, "GetValueAt__Ticks", meta.adapted);
CjsSchema.blue.define(ITriScalarFunction, {
  className: "ITriScalarFunction",
  fields: {}
});
