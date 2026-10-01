// Source: blue/include/ITriFunction.h:65-124
import { CjsSchema, meta } from "#schema";
import { ITriFunction } from "./ITriFunction.js";


/**
 * Vector-valued time function. JavaScript has no overloads, so Be::Time and
 * double pairs share an abstract operation. Native pointer-first argument order
 * is retained; this declaration adds no time or output-storage conversion.
 * Concrete class adaptations remain class-owned.
 */
export class ITriVectorFunction extends ITriFunction
{
  /**
   * Updates and returns the current value.
   * Native signatures: Vector3* Update(Vector3* in, Be::Time time) = 0;
   * Vector3* Update(Vector3* in, double time) = 0.
   * @param {*} _out Native pointer argument; the concrete implementation owns its JavaScript storage representation.
   * @param {number|bigint} _time Native Be::Time or double argument; the concrete implementation owns its representation.
   * @returns {*} The concrete implementation's returned value representation.
   */
  Update(_out, _time)
  {
  }

  /**
   * Evaluates the value without changing the function's internal state.
   * Native signatures: Vector3* GetValueAt(Vector3* in, Be::Time time) = 0;
   * Vector3* GetValueAt(Vector3* in, double time) = 0.
   * @param {*} _out Native pointer argument; the concrete implementation owns its JavaScript storage representation.
   * @param {number|bigint} _time Native Be::Time or double argument; the concrete implementation owns its representation.
   * @returns {*} The concrete implementation's returned value representation.
   */
  GetValueAt(_out, _time)
  {
  }

  /**
   * Evaluates the first derivative without changing the function's internal state.
   * Native signatures: Vector3* GetValueDotAt(Vector3* in, Be::Time time) = 0;
   * Vector3* GetValueDotAt(Vector3* in, double time) = 0.
   * @param {*} _out Native pointer argument; the concrete implementation owns its JavaScript storage representation.
   * @param {number|bigint} _time Native Be::Time or double argument; the concrete implementation owns its representation.
   * @returns {*} The concrete implementation's derivative representation.
   */
  GetValueDotAt(_out, _time)
  {
  }

  /**
   * Evaluates the second derivative without changing the function's internal state.
   * Native signatures: Vector3* GetValueDoubleDotAt(Vector3* in, Be::Time time) = 0;
   * Vector3* GetValueDoubleDotAt(Vector3* in, double time) = 0.
   * @param {*} _out Native pointer argument; the concrete implementation owns its JavaScript storage representation.
   * @param {number|bigint} _time Native Be::Time or double argument; the concrete implementation owns its representation.
   * @returns {*} The concrete implementation's derivative representation.
   */
  GetValueDoubleDotAt(_out, _time)
  {
  }

  /**
   * Evaluates an interpolated double-precision position.
   * Native signature: Vector3d* InterpolatedPosition(Vector3d* out, Be::Time time) = 0.
   * @param {*} _out Native pointer argument; the concrete implementation owns its JavaScript storage representation.
   * @param {number|bigint} _time Native Be::Time argument in the concrete implementation's representation.
   * @returns {*} The concrete implementation's Vector3d pointer representation.
   */
  InterpolatedPosition(_out, _time)
  {
  }
}

for (const method of [ "Update", "GetValueAt", "GetValueDotAt", "GetValueDoubleDotAt", "InterpolatedPosition" ])
{
  CjsSchema.decorateMethod(ITriVectorFunction, method, meta.compose.abstract, meta.impl.abstract);
}
CjsSchema.define(ITriVectorFunction, {
  className: "ITriVectorFunction", carbon: "ITriVectorFunction", family: "blue", fields: {}
});
