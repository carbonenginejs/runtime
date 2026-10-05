// Source: blue/include/ITriFunction.h:127-184
import { CjsSchema, meta } from "#schema";
import { ITriFunction } from "./ITriFunction.js";
import { CcpTime } from "./CcpTime.js";


/**
 * Quaternion-valued time function. JavaScript has no overloads, so Be::Time
 * and double pairs share an abstract operation. Native pointer-first argument
 * order is retained; concrete classes own their time and output-storage
 * adaptations, and this declaration performs no conversion.
 */
export class ITriQuaternionFunction extends ITriFunction
{
  /**
   * Updates and returns the current value.
   * Native signatures: Quaternion* Update(Quaternion* in, Be::Time time) = 0;
   * Quaternion* Update(Quaternion* in, double time) = 0.
   * @param {*} _out Native pointer argument; the concrete implementation owns its JavaScript storage representation.
   * @param {number|bigint} _time Native Be::Time or double argument; the concrete implementation owns its representation.
   * @returns {*} The concrete implementation's returned value representation.
   */
  Update(_out, _time)
  {
  }

  /**
   * Evaluates the value without changing the function's internal state.
   * Native signatures: Quaternion* GetValueAt(Quaternion* in, Be::Time time) = 0;
   * Quaternion* GetValueAt(Quaternion* in, double time) = 0.
   * @param {*} _out Native pointer argument; the concrete implementation owns its JavaScript storage representation.
   * @param {number|bigint} _time Native Be::Time or double argument; the concrete implementation owns its representation.
   * @returns {*} The concrete implementation's returned value representation.
   */
  GetValueAt(_out, _time)
  {
  }

  /**
   * Evaluates the first derivative without changing the function's internal state.
   * Native signatures: Quaternion* GetValueDotAt(Quaternion* in, Be::Time time) = 0;
   * Quaternion* GetValueDotAt(Quaternion* in, double time) = 0.
   * @param {*} _out Native pointer argument; the concrete implementation owns its JavaScript storage representation.
   * @param {number|bigint} _time Native Be::Time or double argument; the concrete implementation owns its representation.
   * @returns {*} The concrete implementation's derivative representation.
   */
  GetValueDotAt(_out, _time)
  {
  }

  /**
   * Evaluates the second derivative without changing the function's internal state.
   * Native signatures: Quaternion* GetValueDoubleDotAt(Quaternion* in, Be::Time time) = 0;
   * Quaternion* GetValueDoubleDotAt(Quaternion* in, double time) = 0.
   * @param {*} _out Native pointer argument; the concrete implementation owns its JavaScript storage representation.
   * @param {number|bigint} _time Native Be::Time or double argument; the concrete implementation owns its representation.
   * @returns {*} The concrete implementation's derivative representation.
   */
  GetValueDoubleDotAt(_out, _time)
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
    return this.Update(CcpTime.timeAsDouble(time), out);
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
    return this.GetValueAt(CcpTime.timeAsDouble(time), out);
  }

  /**
   * Carbon's GetValueDotAt(Be::Time) overload. The shared body converts the ticks with TimeAsDouble and calls the
   * seconds overload, as Carbon's curves do; a class whose Be::Time body differs overrides it.
   * JavaScript cannot overload on argument type: Be::Time and double are both Numbers here
   * (blue/include/ITriFunction.h:65-124), so Carbon's Be::Time overload has its own name.
   * @param {number} time Scene time in Blue 100ns ticks.
   * @param {Float32Array} out Caller-owned value storage.
   * @returns {Float32Array} The GetValueDotAt result.
   */
  GetValueDotAt_Ticks(time, out)
  {
    return this.GetValueDotAt(CcpTime.timeAsDouble(time), out);
  }

  /**
   * Carbon's GetValueDoubleDotAt(Be::Time) overload. The shared body converts the ticks with TimeAsDouble and calls the
   * seconds overload, as Carbon's curves do; a class whose Be::Time body differs overrides it.
   * JavaScript cannot overload on argument type: Be::Time and double are both Numbers here
   * (blue/include/ITriFunction.h:65-124), so Carbon's Be::Time overload has its own name.
   * @param {number} time Scene time in Blue 100ns ticks.
   * @param {Float32Array} out Caller-owned value storage.
   * @returns {Float32Array} The GetValueDoubleDotAt result.
   */
  GetValueDoubleDotAt_Ticks(time, out)
  {
    return this.GetValueDoubleDotAt(CcpTime.timeAsDouble(time), out);
  }
}

for (const method of [ "Update", "GetValueAt", "GetValueDotAt", "GetValueDoubleDotAt" ])
{
  CjsSchema.decorateMethod(ITriQuaternionFunction, method, meta.requires, meta.abstract);
}
CjsSchema.decorateMethod(ITriQuaternionFunction, "Update_Ticks", meta.renamed("Update"), meta.adapted);
CjsSchema.decorateMethod(ITriQuaternionFunction, "GetValueAt_Ticks", meta.renamed("GetValueAt"), meta.adapted);
CjsSchema.decorateMethod(ITriQuaternionFunction, "GetValueDotAt_Ticks", meta.renamed("GetValueDotAt"), meta.adapted);
CjsSchema.decorateMethod(ITriQuaternionFunction, "GetValueDoubleDotAt_Ticks", meta.renamed("GetValueDoubleDotAt"), meta.adapted);
CjsSchema.define(ITriQuaternionFunction, {
  className: "ITriQuaternionFunction", carbon: "ITriQuaternionFunction", family: "blue", fields: {}
});
