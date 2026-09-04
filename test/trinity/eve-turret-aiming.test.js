import test from "node:test";
import assert from "node:assert/strict";
import { quat } from "../../npm/dist/global/math/quat.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";
import { EveTurretAiming } from "../../npm/dist/trinity/eve/attachment/turrets/EveTurretAiming.js";
import { EveTurretSet } from "../../npm/dist/trinity/eve/attachment/turrets/EveTurretSet.js";

const { SystemBones } = EveTurretAiming;

const assertVecNear = (actual, expected, epsilon = 1e-5) =>
{
  for (let index = 0; index < expected.length; index++)
  {
    assert.ok(Math.abs(actual[index] - expected[index]) <= epsilon,
      `component ${index}: expected ${expected[index]}, received ${actual[index]}`);
  }
};

function modify(bone, target, { aiming = new EveTurretAiming(), localTransform = null, influence = 1, rotation = quat.create(), position = vec3.create() } = {})
{
  aiming.ModifySystemBoneTransform(bone, target, localTransform, influence, position, rotation);
  return { position, rotation };
}


test("system bone names match the authored skeleton table", () =>
{
  assert.equal(EveTurretAiming.getSystemBoneName(SystemBones.SYSBONE_ROTATION), "Sys_Rotation_Arm");
  assert.equal(EveTurretAiming.getSystemBoneName(SystemBones.SYSBONE_COUNTER_ROTATION), "Sys_CounterRotation");
  assert.equal(EveTurretAiming.getSystemBoneName(SystemBones.SYSBONE_PITCH), "Sys_Pitch_Barrel");
  assert.equal(EveTurretAiming.getSystemBoneName(SystemBones.SYSBONE_SCALED_HEIGHT), "Sys_Height");
  assert.equal(EveTurretAiming.getSystemBoneName(SystemBones.SYSBONE_SCALED_PITCH06), "Sys_Pitch_Arm06");
  assert.equal(EveTurretAiming.getSystemBoneName(SystemBones.SYSBONE_MAX), "invalid");
  assert.equal(EveTurretAiming.getSystemBoneName(-1), "invalid");
});


test("rotation bones yaw the barrel onto the target and counter-rotation negates", () =>
{
  // Target 45 degrees off +Z: the rotated +Z axis must face it.
  const target = vec3.fromValues(1, 0, 1);
  const { rotation } = modify(SystemBones.SYSBONE_ROTATION, target);
  const forward = vec3.transformQuat(vec3.create(), [ 0, 0, 1 ], rotation);
  assertVecNear(forward, [ Math.SQRT1_2, 0, Math.SQRT1_2 ]);

  const counter = modify(SystemBones.SYSBONE_COUNTER_ROTATION, target).rotation;
  const counterForward = vec3.transformQuat(vec3.create(), [ 0, 0, 1 ], counter);
  assertVecNear(counterForward, [ -Math.SQRT1_2, 0, Math.SQRT1_2 ]);

  // Influence scales the angle; zero influence is an exact no-op.
  const frozen = modify(SystemBones.SYSBONE_ROTATION, target, { influence: 0 }).rotation;
  assertVecNear(frozen, [ 0, 0, 0, 1 ]);

  // The aiming delta applies AFTER the sampled pose rotation: with a pose of
  // 90deg about +Y, aiming at 45deg lands the barrel at 135deg total.
  const pose = quat.setAxisAngle(quat.create(), [ 0, 1, 0 ], Math.PI / 2);
  const composed = modify(SystemBones.SYSBONE_ROTATION, target, { rotation: pose }).rotation;
  const composedForward = vec3.transformQuat(vec3.create(), [ 0, 0, 1 ], composed);
  assertVecNear(composedForward, [ Math.SQRT1_2, 0, -Math.SQRT1_2 ]);
});


test("pitch bones elevate about +X with clamp-then-factor-then-influence", () =>
{
  // Target 45 degrees up: +Z pitches toward +Y.
  const up = vec3.fromValues(0, 1, 1);
  const { rotation } = modify(SystemBones.SYSBONE_PITCH, up);
  const forward = vec3.transformQuat(vec3.create(), [ 0, 0, 1 ], rotation);
  assertVecNear(forward, [ 0, Math.SQRT1_2, Math.SQRT1_2 ]);

  // Below the horizon the default minPitch of 0 clamps the elevation away.
  const down = modify(SystemBones.SYSBONE_PITCH, [ 0, -1, 1 ]).rotation;
  assertVecNear(down, [ 0, 0, 0, 1 ]);

  // The clamp applies BEFORE the factor: a 0.5 factor halves the clamped
  // 90-degree elevation of a straight-up target rather than the raw angle.
  const aiming = new EveTurretAiming();
  aiming.sysBonePitchFactor = 0.5;
  const halved = modify(SystemBones.SYSBONE_PITCH, [ 0, 1, 0 ], { aiming }).rotation;
  const halvedForward = vec3.transformQuat(vec3.create(), [ 0, 0, 1 ], halved);
  assertVecNear(halvedForward, [ 0, Math.SQRT1_2, Math.SQRT1_2 ]);

  // Offsets are authored in degrees.
  const offsetAiming = new EveTurretAiming();
  offsetAiming.sysBonePitch01Offset = 90;
  const offsetOnly = modify(SystemBones.SYSBONE_SCALED_PITCH01, [ 0, 0, 1 ], { aiming: offsetAiming }).rotation;
  const offsetForward = vec3.transformQuat(vec3.create(), [ 0, 0, 1 ], offsetOnly);
  assertVecNear(offsetForward, [ 0, 1, 0 ]);

  // Arm bones 04-06 have no tuning members: factor 1, offset 0.
  assert.equal(new EveTurretAiming().GetBonePitchFactor(SystemBones.SYSBONE_SCALED_PITCH04), 1);
  assert.equal(new EveTurretAiming().GetBonePitchOffset(SystemBones.SYSBONE_SCALED_PITCH05), 0);
});


test("the behind-the-arm pitch flip and the height extension", () =>
{
  // A pitch bone 10 units out along +Z aiming at a target BEHIND the arm
  // flips the elevation through pi, then clamps to the 90-degree max.
  const aiming = new EveTurretAiming();
  const localTransform = new Float32Array(16);
  localTransform[0] = localTransform[5] = localTransform[10] = localTransform[15] = 1;
  localTransform[14] = 10;
  const rotation = quat.create();
  aiming.CalcTransformForPitchBone(
    [ 0, 0, -1 ], 0, Math.PI / 2, SystemBones.SYSBONE_PITCH, localTransform, 1, rotation);
  const forward = vec3.transformQuat(vec3.create(), [ 0, 0, 1 ], rotation);
  assertVecNear(forward, [ 0, 1, 0 ]);

  // The height bone extends position along +Y by the clamped normalized
  // target height times the tuning value; below the horizon it is inert.
  const tall = new EveTurretAiming();
  tall.sysBoneHeight = 3;
  const raised = modify(SystemBones.SYSBONE_SCALED_HEIGHT, [ 0, 5, 0 ], { aiming: tall, position: vec3.fromValues(1, 2, 3) });
  assertVecNear(raised.position, [ 1, 5, 3 ]);
  const flat = modify(SystemBones.SYSBONE_SCALED_HEIGHT, [ 0, -5, 1 ], { aiming: tall });
  assertVecNear(flat.position, [ 0, 0, 0 ]);
});


test("EveTurretSet exposes the shared aiming math synced from its flat tuning fields", () =>
{
  const set = new EveTurretSet();
  set.sysBoneHeight = 4;
  set.sysBonePitchMax = 45;
  set.sysBonePitch02Factor = 0.25;
  const aiming = set.GetAiming();
  assert.ok(aiming instanceof EveTurretAiming);
  assert.equal(aiming.sysBoneHeight, 4);
  assert.equal(aiming.sysBonePitchMax, 45);
  assert.equal(aiming.GetBonePitchFactor(SystemBones.SYSBONE_SCALED_PITCH02), 0.25);
  // The same instance resyncs on each access.
  set.sysBoneHeight = 7;
  assert.equal(set.GetAiming(), aiming);
  assert.equal(aiming.sysBoneHeight, 7);
});
