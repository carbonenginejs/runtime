// Source: blue/include/ITriFunction.h:30-34
import { CjsSchema, meta } from "#schema";


/**
 * Base contract for functions whose current value advances over time. Carbon
 * derives this interface from IRoot; JavaScript follows Blue's plain registered
 * interface convention without supplying a new root implementation.
 */
export class ITriFunction
{
  /**
   * Updates the current value at the supplied time.
   * Native signature: void UpdateValue(double time) = 0.
   * @param {number} _time Native double time.
   * @returns {void}
   */
  UpdateValue(_time)
  {
  }

  /**
   * Retains Carbon's optional, empty reset operation.
   * Native signature: void Reset() {}.
   * @returns {void}
   */
  Reset()
  {
  }
}

CjsSchema.decorateMethod(ITriFunction, "UpdateValue", meta.requires, meta.abstract);
CjsSchema.decorateMethod(ITriFunction, "Reset", meta.noop);
CjsSchema.define(ITriFunction, {
  className: "ITriFunction", carbon: "ITriFunction", family: "blue", fields: {}
});
