// Source: blue/include/ITriFunction.h:187-216
import { CjsSchema, meta } from "#schema";
import { ITriFunction } from "./ITriFunction.js";


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
}

for (const method of [ "Update", "GetValueAt" ])
{
  CjsSchema.decorateMethod(ITriColorFunction, method, meta.compose.abstract, meta.impl.abstract);
}
CjsSchema.define(ITriColorFunction, {
  className: "ITriColorFunction", carbon: "ITriColorFunction", family: "blue", fields: {}
});
