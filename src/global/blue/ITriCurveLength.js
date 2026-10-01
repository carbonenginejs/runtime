// Source: blue/include/ITriCurveLength.h:8-13
import { CjsSchema, meta } from "#schema";


/**
 * Reports a curve's length in seconds. Carbon derives this interface from
 * IRoot; JavaScript uses Blue's plain registered interface convention.
 */
export class ITriCurveLength
{
  /**
   * Returns the curve's length in seconds.
   * Native signature: float Length() = 0.
   * @returns {number} Length in seconds.
   */
  Length()
  {
  }
}

CjsSchema.decorateMethod(ITriCurveLength, "Length", meta.compose.abstract, meta.impl.abstract);
CjsSchema.define(ITriCurveLength, {
  className: "ITriCurveLength", carbon: "ITriCurveLength", family: "blue", fields: {}
});
