// Source: blue/include/ICurveSetDriver.h:6-8
import { CjsSchema, meta } from "#schema";


/**
 * Supplies a curve set's driven time. Carbon derives this interface from IRoot;
 * the shared JavaScript interface follows Blue's plain-class convention.
 */
export class ICurveSetDriver
{
  /**
   * Returns the curve-set time selected by the concrete driver.
   * Native signature: double GetCurveSetTime(double time) = 0.
   * @param {number} _time The caller's time, represented by Carbon as a double.
   * @returns {number} The driven time, represented by Carbon as a double.
   */
  GetCurveSetTime(_time)
  {
  }
}

CjsSchema.decorateMethod(ICurveSetDriver, "GetCurveSetTime", meta.requires, meta.abstract);
CjsSchema.define(ICurveSetDriver, {
  className: "ICurveSetDriver", carbon: "ICurveSetDriver", family: "blue", fields: {}
});
