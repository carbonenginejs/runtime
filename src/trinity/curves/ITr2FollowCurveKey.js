import { exposure as be } from "#be";
import { IRoot } from "../../global/blueexposure/IRoot.js";
// Source: trinity/trinity/Curves/Tr2FollowCurveKey.h:23-32
// Source: trinity/trinity/Curves/Tr2FollowCurveKey_Blue.cpp:6

/**
 * Native position, time, interpolation and tangent contract for follow-curve keys.
 * Carbon derives this interface from IRoot; JavaScript uses a plain registered
 * interface. Vector methods use caller-provided output buffers instead of native
 * value returns, matching the existing concrete follow-key methods.
 */
@be.interface("ITr2FollowCurveKey")
@be.inherit(IRoot)
export class ITr2FollowCurveKey extends IRoot
{
  /**
   * Gets the key position.
   *
   * @abstract
   * @param {Float32Array} _out Destination vector.
   * @returns {Float32Array} The destination vector.
   */
  @be.abstract
  GetValue(out)
  {
  }

  /**
   * Gets the key time.
   *
   * @abstract
   * @returns {number} The concrete key value.
   */
  @be.abstract
  GetTime()
  {
  }

  /**
   * Gets the native segment interpolation enum.
   *
   * @abstract
   * @returns {number} The concrete key value.
   */
  @be.abstract
  GetInterpolationType()
  {
  }

  /**
   * Gets the incoming tangent.
   *
   * @abstract
   * @param {Float32Array} _out Destination vector.
   * @returns {Float32Array} The destination vector.
   */
  @be.abstract
  GetLeftTangent(out)
  {
  }

  /**
   * Gets the outgoing tangent.
   *
   * @abstract
   * @param {Float32Array} _out Destination vector.
   * @returns {Float32Array} The destination vector.
   */
  @be.abstract
  GetRightTangent(out)
  {
  }
}
