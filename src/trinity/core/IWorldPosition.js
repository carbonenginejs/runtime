import { exposure as be } from "#be";
import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/IWorldPosition.h:11-15

/** Native IRoot-derived contract for a receiver's world position and rotation. */
@be.interface("IWorldPosition")
export class IWorldPosition extends IRoot
{
  /**
   * Writes the receiver's world position into a caller-owned vector (Carbon returns it by value, IWorldPosition.h:13).
   * @param {Float32Array} out Caller-owned position.
   * @returns {Float32Array} out
   */
  @be.abstract
  GetWorldPosition(out)
  {
  }

  /**
   * Gets the receiver's world rotation.
   * @returns {Float32Array} Rotation quaternion.
   */
  @be.abstract
  GetWorldRotation()
  {
  }
}
