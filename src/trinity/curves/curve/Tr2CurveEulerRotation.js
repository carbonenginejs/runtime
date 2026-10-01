// Source: trinity/trinity/Curves/Tr2CurveEulerRotation.h
// Source: trinity/trinity/Curves/Tr2CurveEulerRotation.cpp
// Source: trinity/trinity/Curves/Tr2CurveEulerRotation_Blue.cpp
import { fromYawPitchRoll, quat } from "#math/quat";
import { ITriQuaternionFunction, ITriFunction, ITriCurveLength } from "#blue";
import { meta, types } from "#schema";
import { Tr2CurveInterpolation, Tr2CurveTangentType } from "../enums.js";
import { Tr2CurveScalar } from "./Tr2CurveScalar.js";


/**
 * Quaternion curve built from three scalar curves supplying yaw, pitch and roll
 * in radians.
 */
@meta.define({
  className: "Tr2CurveEulerRotation",
  family: "curves"
})
@meta.carbon.inherit(ITriCurveLength)
export class Tr2CurveEulerRotation extends ITriQuaternionFunction
{
  /** Authored narrow-string name. */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.string
  name = "";

  /** Owned yaw component curve in radians. */
  @meta.edit.read
  @meta.edit.persist
  @types.objectRef("Tr2CurveScalar")
  yaw = new Tr2CurveScalar();

  /** Owned pitch component curve in radians. */
  @meta.edit.read
  @meta.edit.persist
  @types.objectRef("Tr2CurveScalar")
  pitch = new Tr2CurveScalar();

  /** Owned roll component curve in radians. */
  @meta.edit.read
  @meta.edit.persist
  @types.objectRef("Tr2CurveScalar")
  roll = new Tr2CurveScalar();

  /** Cached quaternion; exposed read-only without persistence. */
  @meta.edit.read
  @types.quat
  currentValue = quat.create();

  /**
   * Advances the cached quaternion using the existing seconds-based curve contract.
   *
   * @param {number} time Source time in seconds.
   * @returns {void}
   */
  @meta.carbon.method
  @meta.impl.implemented
  UpdateValue(time)
  {
    const yaw = this.yaw.Update(time),
      pitch = this.pitch.Update(time),
      roll = this.roll.Update(time);
    fromYawPitchRoll(this.currentValue, yaw, pitch, roll);
  }

  /**
   * Updates the cached value and copies it into caller-owned storage.
   * Adapted: JavaScript retains time-first seconds and an output buffer instead
   * of Carbon's output-first Be::Time/double overloads.
   *
   * @param {number} time Source time in seconds.
   * @param {Float32Array|number[]} out Caller-owned quaternion.
   * @returns {Float32Array|number[]} The same output buffer.
   */
  @meta.carbon.method
  @meta.impl.adapted
  Update(time, out)
  {
    this.GetValueAt(time, this.currentValue);
    return quat.copy(out, this.currentValue);
  }

  /**
   * Samples into caller-owned storage without changing the cached value.
   * Adapted: JavaScript retains time-first seconds and an output buffer instead
   * of Carbon's output-first Be::Time/double overloads.
   *
   * @param {number} time Source time in seconds.
   * @param {Float32Array|number[]} out Caller-owned quaternion.
   * @returns {Float32Array|number[]} The same output buffer.
   */
  @meta.carbon.method
  @meta.impl.adapted
  GetValueAt(time, out)
  {
    return fromYawPitchRoll(out, this.yaw.GetValue(time), this.pitch.GetValue(time), this.roll.GetValue(time));
  }

  /**
   * Leaves the caller's derivative output unchanged, as Carbon does.
   *
   * @param {number} _time Unused source time in seconds.
   * @param {Float32Array|number[]} out Caller-owned quaternion.
   * @returns {Float32Array|number[]} The unchanged output buffer.
   */
  @meta.carbon.method
  @meta.impl.noop
  GetValueDotAt(_time, out)
  {
    return out;
  }

  /**
   * Leaves the caller's second-derivative output unchanged, as Carbon does.
   *
   * @param {number} _time Unused source time in seconds.
   * @param {Float32Array|number[]} out Caller-owned quaternion.
   * @returns {Float32Array|number[]} The unchanged output buffer.
   */
  @meta.carbon.method
  @meta.impl.noop
  GetValueDoubleDotAt(_time, out)
  {
    return out;
  }

  /**
   * Gets the longest scalar component duration.
   *
   * @returns {number} Duration in seconds.
   */
  @meta.carbon.method
  @meta.impl.implemented
  Length()
  {
    return Math.max(this.yaw.Length(), this.pitch.Length(), this.roll.Length());
  }

  /**
   * Samples the quaternion at the supplied time.
   * Adapted: writes caller-owned storage instead of returning a native value copy.
   *
   * @param {number} time Source time in seconds.
   * @param {Float32Array|number[]} out Caller-owned quaternion.
   * @returns {Float32Array|number[]} The same output buffer.
   */
  @meta.carbon.method
  @meta.impl.adapted
  GetValue(time, out)
  {
    return this.GetValueAt(time, out);
  }

  /**
   * Adds matching keys to the three scalar components.
   * Adapted: optional arrays represent native Optional<Vector3> values. The
   * existing behavior ignores a right tangent when no left tangent is supplied
   * (Carbon quirk, Tr2CurveEulerRotation.cpp:98-99); no key algorithm changes.
   *
   * @param {number} time Key time in seconds.
   * @param {Float32Array|number[]} value Yaw, pitch and roll in radians.
   * @param {number} [interpolation=Tr2CurveInterpolation.HERMITE] Segment interpolation.
   * @param {Float32Array|number[]} [leftTangent] Incoming component tangents.
   * @param {Float32Array|number[]} [rightTangent] Outgoing component tangents.
   * @param {number} [tangentType=Tr2CurveTangentType.AUTO_CLAMP] Tangent policy.
   * @returns {void}
   */
  @meta.carbon.method
  @meta.impl.adapted
  AddKey(time, value, interpolation = Tr2CurveInterpolation.HERMITE, leftTangent, rightTangent, tangentType = Tr2CurveTangentType.AUTO_CLAMP)
  {
    const useRightTangent = !!leftTangent && !!rightTangent;
    this.yaw.AddKey(time, value[0], interpolation, leftTangent?.[0] ?? 0, useRightTangent ? rightTangent[0] : 0, tangentType);
    this.pitch.AddKey(time, value[1], interpolation, leftTangent?.[1] ?? 0, useRightTangent ? rightTangent[1] : 0, tangentType);
    this.roll.AddKey(time, value[2], interpolation, leftTangent?.[2] ?? 0, useRightTangent ? rightTangent[2] : 0, tangentType);
  }

  /**
   * Sets both extrapolation modes on all scalar components.
   *
   * @param {number} extrapolation Native extrapolation enum value.
   * @returns {void}
   */
  @meta.carbon.method
  @meta.impl.implemented
  SetExtrapolation(extrapolation)
  {
    this.yaw.SetExtrapolation(extrapolation);
    this.pitch.SetExtrapolation(extrapolation);
    this.roll.SetExtrapolation(extrapolation);
  }
}

// Native exposure ends at this concrete table; no inherited query-chain fallback.
meta.carbon.interfaceTable({
  interfaces: [ Tr2CurveEulerRotation, ITriQuaternionFunction, ITriFunction, ITriCurveLength ],
  chainTo: null
})(Tr2CurveEulerRotation);
