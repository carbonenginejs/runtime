// Source: trinity/trinity/Eve/Turret/EveTurretAiming.h
// Source: trinity/trinity/Eve/Turret/EveTurretAiming.cpp
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";

const DEG_TO_RAD = Math.PI / 180;
const X_AXIS = vec3.fromValues(1, 0, 0);
const Y_AXIS = vec3.fromValues(0, 1, 0);
const DELTA_SCRATCH = quat.create();
const DIRECTION_SCRATCH = vec3.create();
const REL_TARGET_SCRATCH = vec3.create();
const BONE_POSITION_SCRATCH = vec3.create();

// Names of system bones as authored in the model skeleton
// (EveTurretAiming.cpp:8-25; the STRING is authority where names skew).
const SYSTEM_BONE_SKELETON_NAMES = Object.freeze([
  "invalid", // SYSBONE_INVALID
  "Sys_Rotation_Arm", // SYSBONE_ROTATION
  "Sys_Rotation_Arm01", // SYSBONE_ROTATION01
  "Sys_Rotation_Arm02", // SYSBONE_ROTATION02
  "Sys_CounterRotation", // SYSBONE_COUNTER_ROTATION
  "Sys_Pitch_Barrel", // SYSBONE_PITCH
  "Sys_Pitch_Barrel1", // SYSBONE_PITCH1
  "Sys_Pitch_Barrel2", // SYSBONE_PITCH2
  "Sys_Height", // SYSBONE_SCALED_HEIGHT
  "Sys_Pitch_Arm01", // SYSBONE_SCALED_PITCH01
  "Sys_Pitch_Arm02", // SYSBONE_SCALED_PITCH02
  "Sys_Pitch_Arm03", // SYSBONE_SCALED_PITCH03
  "Sys_Pitch_Arm04", // SYSBONE_SCALED_PITCH04
  "Sys_Pitch_Arm05", // SYSBONE_SCALED_PITCH05
  "Sys_Pitch_Arm06" // SYSBONE_SCALED_PITCH06
]);


/**
 * Sysbone aiming math and tuning values shared by EveTurretSet and
 * EveChildTurret. Carbon hosts embed this by value with NO Blue exposure of
 * its own - each host re-exposes the tuning members under its flat
 * `sysBone*` names, which is why this is a plain class, not a model.
 *
 * Quaternion convention (quote-verified against math Quaternion_inline.h:
 * 118-126): Carbon's `a * b` is the reversed-Hamilton product b⊗a, so its
 * "apply this quat after the original one" `rotation * delta` maps to
 * gl-matrix `quat.multiply(out, delta, rotation)` - the aiming delta goes in
 * the FIRST operand. The matrix operand-swap rule does NOT apply here.
 */
export class EveTurretAiming
{

  // Specific system bone tuning values (EveTurretAiming.h:44-54); offsets
  // are authored in degrees.
  sysBoneHeight = 1;
  sysBonePitchOffset = 0;
  sysBonePitchFactor = 1;
  sysBonePitchMin = 0;
  sysBonePitchMax = 90;
  sysBonePitch01Offset = 0;
  sysBonePitch01Factor = 1;
  sysBonePitch02Offset = 0;
  sysBonePitch02Factor = 1;
  sysBonePitch03Offset = 0;
  sysBonePitch03Factor = 1;

  /** System-controlled bones (EveTurretAiming.h:13-31). */
  static SystemBones = Object.freeze({
    SYSBONE_INVALID: 0,
    SYSBONE_ROTATION: 1,
    SYSBONE_ROTATION01: 2,
    SYSBONE_ROTATION02: 3,
    SYSBONE_COUNTER_ROTATION: 4,
    SYSBONE_PITCH: 5,
    SYSBONE_PITCH1: 6,
    SYSBONE_PITCH2: 7,
    SYSBONE_SCALED_HEIGHT: 8,
    SYSBONE_SCALED_PITCH01: 9,
    SYSBONE_SCALED_PITCH02: 10,
    SYSBONE_SCALED_PITCH03: 11,
    SYSBONE_SCALED_PITCH04: 12,
    SYSBONE_SCALED_PITCH05: 13,
    SYSBONE_SCALED_PITCH06: 14,
    SYSBONE_MAX: 15
  });

  /** The skeleton bone name for a system bone, "invalid" out of range. */
  static getSystemBoneName(bone)
  {
    const index = Number(bone) >>> 0;
    return index < EveTurretAiming.SystemBones.SYSBONE_MAX
      ? SYSTEM_BONE_SKELETON_NAMES[index]
      : SYSTEM_BONE_SKELETON_NAMES[0];
  }

  /**
   * Adjusts one system bone's local transform toward a target
   * (EveTurretAiming.cpp:45-107): rotation bones yaw about +Y toward the
   * target (the counter-rotation bone negates the angle), pitch bones
   * elevate about +X, and the height bone extends along +Y by the clamped
   * normalized target height. `position` and `rotation` mutate in place.
   *
   * @param {Number} bone - a SystemBones value
   * @param {Float32Array} target - target position in turret space
   * @param {Float32Array|null} localTransform - the bone's world-of-pose
   *   transform, only ever passed for the main pitch bones
   * @param {Number} trackingInfluence - 0..1 blend applied to every angle
   * @param {Float32Array} position - the bone position to modify
   * @param {Float32Array} rotation - the bone rotation to modify
   */
  ModifySystemBoneTransform(bone, target, localTransform, trackingInfluence, position, rotation)
  {
    const bones = EveTurretAiming.SystemBones;
    switch (bone)
    {
      case bones.SYSBONE_ROTATION:
      case bones.SYSBONE_ROTATION01:
      case bones.SYSBONE_ROTATION02:
      case bones.SYSBONE_COUNTER_ROTATION:
      {
        // Rotation of the turret through 360 degrees; alpha in [-pi, pi],
        // negated at the source for the counter-rotation bone (cpp:55-77).
        let alpha = Math.atan2(target[0], target[2]);
        if (bone === bones.SYSBONE_COUNTER_ROTATION) alpha = -alpha;
        alpha *= trackingInfluence;
        quat.setAxisAngle(DELTA_SCRATCH, Y_AXIS, alpha);
        quat.multiply(rotation, DELTA_SCRATCH, rotation);
        break;
      }
      case bones.SYSBONE_PITCH:
      case bones.SYSBONE_PITCH1:
      case bones.SYSBONE_PITCH2:
        this.CalcTransformForPitchBone(
          target,
          this.sysBonePitchMin * DEG_TO_RAD,
          this.sysBonePitchMax * DEG_TO_RAD,
          bone, localTransform, trackingInfluence, rotation);
        break;
      case bones.SYSBONE_SCALED_HEIGHT:
      {
        // Position extension along +Y scaled by the normalized target
        // height (cpp:85-95).
        vec3.normalize(DIRECTION_SCRATCH, target);
        let height = Math.min(Math.max(DIRECTION_SCRATCH[1], 0), 1);
        height *= trackingInfluence;
        position[1] += height * this.sysBoneHeight;
        break;
      }
      case bones.SYSBONE_SCALED_PITCH01:
      case bones.SYSBONE_SCALED_PITCH02:
      case bones.SYSBONE_SCALED_PITCH03:
      case bones.SYSBONE_SCALED_PITCH04:
      case bones.SYSBONE_SCALED_PITCH05:
      case bones.SYSBONE_SCALED_PITCH06:
        this.CalcTransformForPitchBone(
          target, 0, this.sysBonePitchMax * DEG_TO_RAD,
          bone, null, trackingInfluence, rotation);
        break;
      default:
        break;
    }
  }

  /**
   * Pitches a bone about +X toward the target (EveTurretAiming.cpp:109-146):
   * clamp the elevation angle FIRST, then apply the per-bone factor and
   * degree offset, then the influence. When the bone's pose-world transform
   * is supplied and the target sits behind the bone along its arm, the
   * angle flips through pi. `rotation` mutates in place.
   */
  CalcTransformForPitchBone(target, minPitch, maxPitch, boneIndex, localTransform, trackingInfluence, rotation)
  {
    const pitchOffset = this.GetBonePitchOffset(boneIndex);
    const pitchFactor = this.GetBonePitchFactor(boneIndex);

    if (localTransform)
    {
      vec3.set(BONE_POSITION_SCRATCH,
        localTransform[12], localTransform[13], localTransform[14]);
    }
    else
    {
      vec3.set(BONE_POSITION_SCRATCH, 0, 0, 0);
    }

    vec3.subtract(REL_TARGET_SCRATCH, target, BONE_POSITION_SCRATCH);
    vec3.normalize(DIRECTION_SCRATCH, REL_TARGET_SCRATCH);
    let radians = Math.asin(DIRECTION_SCRATCH[1]);

    if (localTransform)
    {
      const boneLength = vec3.length(BONE_POSITION_SCRATCH);
      vec3.normalize(BONE_POSITION_SCRATCH, BONE_POSITION_SCRATCH);
      const alongArm = vec3.dot(BONE_POSITION_SCRATCH, target);
      if (alongArm < boneLength)
      {
        // TriFloatSign: -1 below zero, +1 otherwise (zero is +1).
        const sign = REL_TARGET_SCRATCH[1] < 0 ? -1 : 1;
        radians = sign * Math.PI - radians;
      }
    }

    let alpha = Math.min(Math.max(radians, minPitch), maxPitch);
    alpha = pitchFactor * alpha + pitchOffset * DEG_TO_RAD;
    alpha *= trackingInfluence;
    quat.setAxisAngle(DELTA_SCRATCH, X_AXIS, -alpha);
    quat.multiply(rotation, DELTA_SCRATCH, rotation);
  }

  /** The pitch factor for a bone; bones without a tuning member use 1 (cpp:148-165). */
  GetBonePitchFactor(boneIndex)
  {
    const bones = EveTurretAiming.SystemBones;
    switch (boneIndex)
    {
      case bones.SYSBONE_PITCH:
      case bones.SYSBONE_PITCH1:
      case bones.SYSBONE_PITCH2:
        return this.sysBonePitchFactor;
      case bones.SYSBONE_SCALED_PITCH01:
        return this.sysBonePitch01Factor;
      case bones.SYSBONE_SCALED_PITCH02:
        return this.sysBonePitch02Factor;
      case bones.SYSBONE_SCALED_PITCH03:
        return this.sysBonePitch03Factor;
      default:
        return 1;
    }
  }

  /** The pitch offset in degrees for a bone; bones without a tuning member use 0 (cpp:167-183). */
  GetBonePitchOffset(boneIndex)
  {
    const bones = EveTurretAiming.SystemBones;
    switch (boneIndex)
    {
      case bones.SYSBONE_PITCH:
      case bones.SYSBONE_PITCH1:
      case bones.SYSBONE_PITCH2:
        return this.sysBonePitchOffset;
      case bones.SYSBONE_SCALED_PITCH01:
        return this.sysBonePitch01Offset;
      case bones.SYSBONE_SCALED_PITCH02:
        return this.sysBonePitch02Offset;
      case bones.SYSBONE_SCALED_PITCH03:
        return this.sysBonePitch03Offset;
      default:
        return 0;
    }
  }

}
