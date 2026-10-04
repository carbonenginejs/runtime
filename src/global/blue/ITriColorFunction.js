// Source: blue/include/ITriFunction.h:187-216
import { CjsSchema, meta } from "#schema";
import { ITriFunction } from "./ITriFunction.js";
import { TimeAsDouble } from "./CcpTime.js";


/**
 * Color-valued time function. JavaScript has no overloads, so Be::Time and
 * double pairs share an abstract operation. Native pointer-first argument order
 * is retained without prescribing a concrete time or color representation.
 */
export class ITriColorFunction extends ITriFunction
{
  /**
   * Updates and returns the current value.
   * Native signatures: Color* Update(Color* in, Be::Time time) = 0;
   * Color* Update(Color* in, double time) = 0.
   * @param {*} _out Native pointer argument; the concrete implementation owns its JavaScript storage representation.
   * @param {number|bigint} _time Native Be::Time or double argument; the concrete implementation owns its representation.
   * @returns {*} The concrete implementation's returned value representation.
   */
  Update(_out, _time)
  {
  }

  /**
   * Evaluates the value without changing the function's internal state.
   * Native signatures: Color* GetValueAt(Color* in, Be::Time time) = 0;
   * Color* GetValueAt(Color* in, double time) = 0.
   * @param {*} _out Native pointer argument; the concrete implementation owns its JavaScript storage representation.
   * @param {number|bigint} _time Native Be::Time or double argument; the concrete implementation owns its representation.
   * @returns {*} The concrete implementation's returned value representation.
   */
  GetValueAt(_out, _time)
  {
  }

  /**
   * Carbon's Update(Be::Time) overload. The shared body converts the ticks with TimeAsDouble and calls the
   * seconds overload, as Carbon's curves do; a class whose Be::Time body differs overrides it.
   * JavaScript cannot overload on argument type: Be::Time and double are both Numbers here
   * (blue/include/ITriFunction.h:65-124), so Carbon's Be::Time overload has its own name.
   * @param {number} time Scene time in Blue 100ns ticks.
   * @param {Float32Array} out Caller-owned value storage.
   * @returns {Float32Array} The Update result.
   */
  Update_Ticks(time, out)
  {
    return this.Update(TimeAsDouble(time), out);
  }

  /**
   * Carbon's GetValueAt(Be::Time) overload. The shared body converts the ticks with TimeAsDouble and calls the
   * seconds overload, as Carbon's curves do; a class whose Be::Time body differs overrides it.
   * JavaScript cannot overload on argument type: Be::Time and double are both Numbers here
   * (blue/include/ITriFunction.h:65-124), so Carbon's Be::Time overload has its own name.
   * @param {number} time Scene time in Blue 100ns ticks.
   * @param {Float32Array} out Caller-owned value storage.
   * @returns {Float32Array} The GetValueAt result.
   */
  GetValueAt_Ticks(time, out)
  {
    return this.GetValueAt(TimeAsDouble(time), out);
  }
}

for (const method of [ "Update", "GetValueAt" ])
{
  CjsSchema.decorateMethod(ITriColorFunction, method, meta.requires, meta.abstract);
}
CjsSchema.decorateMethod(ITriColorFunction, "Update_Ticks", meta.blue.renamed("Update"), meta.adapted);
CjsSchema.decorateMethod(ITriColorFunction, "GetValueAt_Ticks", meta.blue.renamed("GetValueAt"), meta.adapted);
CjsSchema.define(ITriColorFunction, {
  className: "ITriColorFunction", carbon: "ITriColorFunction", family: "blue", fields: {}
});
