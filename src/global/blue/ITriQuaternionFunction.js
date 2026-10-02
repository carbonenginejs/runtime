// Source: blue/include/ITriFunction.h:127-184
import { CjsSchema, meta } from "#schema";
import { ITriFunction } from "./ITriFunction.js";


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
}

for (const method of [ "Update", "GetValueAt", "GetValueDotAt", "GetValueDoubleDotAt" ])
{
  CjsSchema.decorateMethod(ITriQuaternionFunction, method, meta.requires, meta.abstract);
}
CjsSchema.define(ITriQuaternionFunction, {
  className: "ITriQuaternionFunction", carbon: "ITriQuaternionFunction", family: "blue", fields: {}
});
