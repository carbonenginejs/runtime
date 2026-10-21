import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Curves/Tr2FollowCurveKey.h:23-32
// Source: trinity/trinity/Curves/Tr2FollowCurveKey_Blue.cpp:6
import { CjsSchema, blue } from "#schema";


/**
 * Native position, time, interpolation and tangent contract for follow-curve keys.
 * Carbon derives this interface from IRoot; JavaScript uses a plain registered
 * interface. Vector methods use caller-provided output buffers instead of native
 * value returns, matching the existing concrete follow-key methods.
 */
@blue.inherit(IRoot)
export class ITr2FollowCurveKey
{
  /**
   * Gets the key position.
   * @param {Float32Array} _out Destination vector.
   * @returns {Float32Array} The destination vector.
   */
  GetValue(_out)
  {
  }

  /**
   * Gets the key time.
   * @returns {number} The concrete key value.
   */
  GetTime()
  {
  }

  /**
   * Gets the native segment interpolation enum.
   * @returns {number} The concrete key value.
   */
  GetInterpolationType()
  {
  }

  /**
   * Gets the incoming tangent.
   * @param {Float32Array} _out Destination vector.
   * @returns {Float32Array} The destination vector.
   */
  GetLeftTangent(_out)
  {
  }

  /**
   * Gets the outgoing tangent.
   * @param {Float32Array} _out Destination vector.
   * @returns {Float32Array} The destination vector.
   */
  GetRightTangent(_out)
  {
  }

}

for (const method of [ "GetValue", "GetTime", "GetInterpolationType", "GetLeftTangent", "GetRightTangent" ])
{
  CjsSchema.decorateMethod(ITr2FollowCurveKey, method, blue.abstract);
}
CjsSchema.exposure.interface("ITr2FollowCurveKey")(ITr2FollowCurveKey);
