import test from "node:test";
import assert from "node:assert/strict";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { quat } from "../../npm/dist/global/math/quat.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";
import { EveChildTurret } from "../../npm/dist/trinity/eve/child/EveChildTurret.js";
import { EveTurretAiming } from "../../npm/dist/trinity/eve/attachment/turrets/EveTurretAiming.js";
import { EveTurretSet } from "../../npm/dist/trinity/eve/attachment/turrets/EveTurretSet.js";
import { Tr2GrannyAnimation } from "../../npm/dist/trinity/core/animation/Tr2GrannyAnimation.js";

const { State } = EveChildTurret;

const assertVecNear = (actual, expected, epsilon = 1e-5) =>
{
  for (let index = 0; index < expected.length; index++)
  {
    assert.ok(Math.abs(actual[index] - expected[index]) <= epsilon,
      `component ${index}: expected ${expected[index]}, received ${actual[index]}`);
  }
};

function createUpdaterDuck()
{
  const calls = [];
  let modifier = null;
  return {
    calls,
    StopAnimations(delay) { calls.push([ "stop", delay ]); },
    PlayAnimation(name, replace, loopCount, delay, speed, clearWhenDone)
    {
      calls.push([ "play", name, loopCount ]);
      void replace; void delay; void speed; void clearWhenDone;
      return true;
    },
    FindAnimationDurationByName(name) { return name === "Deploy" ? 2.5 : 1; },
    GetPoseModifier() { return modifier; },
    SetPoseModifier(next) { modifier = next ?? null; calls.push([ "hook", modifier ]); },
    GetBoneTransform(boneID)
    {
      return mat4.fromTranslation(mat4.create(), [ boneID, 0, 0 ]);
    },
    IsInitialized() { return true; },
    SetUseMeshBinding() {},
    SetSharedGeometryRes() {}
  };
}

function createGeometryDuck(bones)
{
  return {
    IsGood: () => true,
    GetSkeletonCount: () => 1,
    GetSkeletonData: () => ({ bones })
  };
}


test("EveChildTurret hooks itself as the animation updater's pose modifier", () =>
{
  const turret = new EveChildTurret();
  assert.equal(turret.GetTarget().constructor.name, "EveTurretTarget");
  assert.equal(EveChildTurret.State, EveTurretSet.State);

  turret.InitializeAnimation();
  assert.ok(turret.animationUpdater instanceof Tr2GrannyAnimation);
  assert.equal(turret.animationUpdater.GetPoseModifier(), turret);

  // Swapping updaters unhooks the old one and hooks the new.
  const first = turret.animationUpdater;
  const replacement = new Tr2GrannyAnimation();
  turret.animationUpdater = replacement;
  turret.InitializeAnimation();
  assert.equal(first.GetPoseModifier(), null);
  assert.equal(replacement.GetPoseModifier(), turret);

  // CleanUp performs the destructor unhook.
  turret.CleanUp();
  assert.equal(replacement.GetPoseModifier(), null);
});


test("EveChildTurret.ModifyPose aims found system bones toward the tracked target", () =>
{
  const turret = new EveChildTurret();
  const bones = [ "Root", EveTurretAiming.getSystemBoneName(EveTurretAiming.SystemBones.SYSBONE_ROTATION) ];
  turret.mesh = { GetGeometryResource: () => createGeometryDuck(bones) };
  turret.animationUpdater = createUpdaterDuck();
  turret.UpdateCachedGeometryData();

  turret.trackingInfluence = 1;
  turret.GetTarget().SetTargetable({
    GetDamageLocatorPosition(_index, _inWorldSpace, out)
    {
      out[0] = 10; out[1] = 0; out[2] = 10;
      return true;
    },
    GetWorldPosition(out) { out[0] = 10; out[1] = 0; out[2] = 10; return out; }
  });
  // Settle the new-target position blend so tracking reads the live target.
  turret.GetTarget().positionOldInfluence = -1;
  turret.GetTarget().Update(0, [ 0, 0, 0 ]);

  const pose = {
    boneTransforms: bones.map(() => ({ position: vec3.create(), rotation: quat.create() }))
  };
  turret.ModifyPose({ bones }, pose);

  // Bone 0 (not a system bone) untouched; the rotation arm yaws 45 degrees.
  assert.deepEqual(Array.from(pose.boneTransforms[0].rotation), [ 0, 0, 0, 1 ]);
  const forward = vec3.transformQuat(vec3.create(), [ 0, 0, 1 ], pose.boneTransforms[1].rotation);
  assertVecNear(forward, [ Math.SQRT1_2, 0, Math.SQRT1_2 ]);

  // Zero influence is a strict no-op.
  const before = Array.from(pose.boneTransforms[1].rotation);
  turret.trackingInfluence = 0;
  turret.ModifyPose({ bones }, pose);
  assert.deepEqual(Array.from(pose.boneTransforms[1].rotation), before);
});


test("EveChildTurret state machine drives animations, fades and the fire cycle", () =>
{
  const turret = new EveChildTurret();
  const updater = createUpdaterDuck();
  turret.animationUpdater = updater;

  // Offline: state transitions are refused without touching the state.
  turret.isOnline = false;
  turret.state = State.STATE_DEACTIVE;
  turret.EnterStateIdle();
  assert.equal(turret.state, State.STATE_DEACTIVE);
  turret.isOnline = true;

  // Deploying from deactive plays Deploy then the Active loop.
  turret.EnterStateTargeting();
  assert.equal(turret.state, State.STATE_TARGETING);
  assert.deepEqual(updater.calls.filter(call => call[0] === "play"),
    [ [ "play", "Deploy", 1 ], [ "play", "Active", 0 ] ]);
  // The fade-in delay waits for the deploy animation's duration.
  updater.calls.length = 0;

  // Firing from targeting: the fire animation plays and the tracker engages.
  const started = [];
  turret.GetTarget().SetTargetable({
    GetDamageLocatorPosition(_index, _inWorldSpace, out) { vec3.set(out, 1, 0, 0); return true; },
    GetWorldPosition(out) { return vec3.set(out, 1, 0, 0); },
    GetClosestDamageLocatorIndex() { return 3; }
  });
  turret.GetTarget().StartFireAtLocator = (locator, delay, length, source) =>
  {
    started.push([ locator, delay, length, Array.from(source) ]);
  };
  turret.EnterStateFiring();
  assert.equal(turret.state, State.STATE_FIRING);
  assert.equal(updater.calls.some(call => call[0] === "play" && call[1] === "Fire"), true);
  assert.equal(started.length, 1);
  assert.equal(started[0][0], 3);

  // Deactivating from firing falls through targeting: fire stops, pack plays.
  const stops = [];
  turret.firingEffect = null;
  turret.GetTarget().StopFireAtLocator = () => stops.push("stopped");
  updater.calls.length = 0;
  turret.EnterStateDeactive();
  assert.equal(turret.state, State.STATE_DEACTIVE);
  assert.deepEqual(stops, [ "stopped" ]);
  assert.equal(updater.calls.some(call => call[0] === "play" && call[1] === "Pack"), true);

  // Firing from deactive is forbidden.
  assert.equal(turret.SetupFiringState(), false);
});


test("EveChildTurret cycles muzzles and names the fire animations accordingly", () =>
{
  const turret = new EveChildTurret();
  const updater = createUpdaterDuck();
  turret.animationUpdater = updater;
  turret.maxCyclingFirePos = 3;
  turret.cyclingFireGroupCount = 1;
  turret.state = State.STATE_TARGETING;
  turret.GetTarget().FindClosestLocator = () => 0;
  turret.GetTarget().StartFireAtLocator = () => {};

  const fireNames = () => updater.calls.filter(call => call[0] === "play" && call[1].startsWith("Fire")).map(call => call[1]);
  turret.SetupFiringState();
  turret.SetupFiringState();
  turret.SetupFiringState();
  // Cycle: pos 1 -> Fire01, pos 2 -> Fire02, wrap to 0 -> Fire.
  assert.deepEqual(fireNames(), [ "Fire01", "Fire02", "Fire" ]);
  assert.equal(turret.currentCyclingFiresPos, 0);
});


test("EveChildTurret tracking fades, muzzle transforms and movement audio", () =>
{
  const turret = new EveChildTurret();
  const updater = createUpdaterDuck();
  turret.animationUpdater = updater;
  turret.maxTrackingTime = 0.8;

  // Fade-in ramps the influence and clamps at maxTrackingTime.
  turret.EnterStateTargeting();
  turret.UpdateAsyncronous({ deltaTime: 0.001 }, null);
  turret.UpdateAsyncronous({ deltaTime: 0.5 }, null);
  assert.ok(turret.trackingInfluence > 0.49 && turret.trackingInfluence <= 0.8);
  turret.UpdateAsyncronous({ deltaTime: 2 }, null);
  assert.equal(turret.trackingInfluence, 0.8);

  // The firing bone transform lifts the bone through this world transform.
  turret.mesh = { GetGeometryResource: () => null };
  turret.firingEffect = null;
  const fallback = turret.GetFiringBoneWorldTransform(0);
  assert.deepEqual(Array.from(fallback), Array.from(turret.worldTransform));
  const lifted = turret.GetTurretBoneTransform(5);
  assertVecNear([ lifted[12], lifted[13], lifted[14] ], [ 5, 0, 0 ]);

  // Movement audio goes through the observer's emitter on target acquisition.
  const events = [];
  turret.turretMovementObserver = { GetObserver: () => ({ SendEvent: name => events.push(name) }) };
  turret.idleToTargetingMovementAudioEvent = "turret_move_start";
  turret.state = State.STATE_IDLE;
  turret.SetTargetObject({
    GetDamageLocatorPosition(_index, _inWorldSpace, out) { vec3.set(out, 0, 0, 0); return true; },
    GetWorldPosition(out) { return vec3.set(out, 0, 0, 0); }
  });
  assert.deepEqual(events, [ "turret_move_start" ]);
});
