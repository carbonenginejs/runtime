import { IRoot } from "./IRoot.js";
// Source: blue/include/ITriCurveLength.h:8-13
import { CjsSchema, meta } from "#schema";


/**
 * Reports a curve's length in seconds. Carbon derives this interface from
 * IRoot; JavaScript uses Blue's plain registered interface convention.
 */
export class ITriCurveLength extends IRoot
{
  /**
   * Returns the curve's length in seconds.
   * Native signature: float Length() = 0.
   *
   * @abstract
   * @returns {number} Length in seconds.
   */
  Length()
  {
  }
}

CjsSchema.decorateMethod(ITriCurveLength, "Length", meta.abstract);
CjsSchema.exposure.interface("ITriCurveLength")(ITriCurveLength);
