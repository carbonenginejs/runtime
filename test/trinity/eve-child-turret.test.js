import { getRegisteredClassName } from "../../npm/dist/global/compose/className.js";
import test from "node:test";
import { ITr2AudEmitter } from "../../npm/dist/audio/trinity/trinityAudioApi/ITr2AudEmitter.js";
import assert from "node:assert/strict";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { be } from "../../npm/dist/global/blue/index.js";
import { quat } from "../../npm/dist/global/math/quat.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";
import { EveChildTurret } from "../../npm/dist/trinity/eve/child/EveChildTurret.js";
import { EveTurretAiming } from "../../npm/dist/trinity/eve/attachment/turrets/EveTurretAiming.js";
import { EveTurretSet } from "../../npm/dist/trinity/eve/attachment/turrets/EveTurretSet.js";
import { EveTurretFiringFX } from "../../npm/dist/trinity/eve/attachment/turrets/EveTurretFiringFX.js";
import { EveEffectRoot2 } from "../../npm/dist/trinity/eve/spaceObject/EveEffectRoot2.js";
import { EveUpdateContext } from "../../npm/dist/trinity/eve/EveUpdateContext.js";
import { EveChildUpdateParams } from "../../npm/dist/trinity/eve/EveChildUpdateParams.js";
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


/**
 * A target the turret admits: EveEffectRoot2 maps ITriTargetable and IWorldPosition (Carbon
 * EveTurretTarget.cpp:69-79 queries both), and every locator answers one fixed world position.
 */
class FixedTarget extends EveEffectRoot2
{
  constructor(x, y, z)
  {
    super();
    this.fixedPosition = vec3.fromValues(x, y, z);
  }

  GetDamageLocatorPosition(_index, _inWorldSpace, out)
  {
    vec3.copy(out, this.fixedPosition);
    return true;
  }

  GetWorldPosition(out)
  {
    return vec3.copy(out, this.fixedPosition);
  }
}

/** Wraps a real method: records the call, then runs the real one. */
function spy(instance, name, record)
{
  const real = instance[name].bind(instance);
  instance[name] = (...args) =>
  {
    record(...args);
    return real(...args);
  };
}

test("EveChildTurret hooks itself as the animation updater's pose modifier", () =>
{
  const turret = new EveChildTurret();
  assert.equal(getRegisteredClassName(turret.GetTarget().constructor), "EveTurretTarget");
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
  assert.equal(turret.GetTarget().SetTargetable(new FixedTarget(10, 0, 10)), true);
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
  const firingTarget = new FixedTarget(1, 0, 0);
  firingTarget.GetClosestDamageLocatorIndex = () => 3;
  assert.equal(turret.GetTarget().SetTargetable(firingTarget), true);
  spy(turret.GetTarget(), "StartFireAtLocator", (locator, delay, length, source) =>
  {
    started.push([ locator, delay, length, Array.from(source) ]);
  });
  turret.EnterStateFiring();
  assert.equal(turret.state, State.STATE_FIRING);
  assert.equal(updater.calls.some(call => call[0] === "play" && call[1] === "Fire"), true);
  assert.equal(started.length, 1);
  assert.equal(started[0][0], 3);

  // Deactivating from firing falls through targeting: fire stops, pack plays.
  const stops = [];
  turret.firingEffect = null;
  spy(turret.GetTarget(), "StopFireAtLocator", () => stops.push("stopped"));
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
  spy(turret.GetTarget(), "FindClosestLocator", () => {});
  spy(turret.GetTarget(), "StartFireAtLocator", () => {});

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
  // One context whose clock advances by each step; EveUpdateContext derives GetDeltaT from consecutive times.
  const context = new EveUpdateContext(), params = new EveChildUpdateParams();
  let ticks = 10 * 10_000_000;
  context.SetTime(ticks);
  const step = seconds => { ticks += Math.round(seconds * 10_000_000); context.SetTime(ticks); return context; };
  turret.UpdateAsyncronous(step(0.001), params);
  turret.UpdateAsyncronous(step(0.5), params);
  assert.ok(turret.trackingInfluence > 0.49 && turret.trackingInfluence <= 0.8);
  turret.UpdateAsyncronous(step(2), params);
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
  class MovementEmitter extends ITr2AudEmitter
  {
    SendEvent(name) { events.push(name); }
  }
  const emitter = new MovementEmitter();
  turret.turretMovementObserver = { GetObserver: () => emitter };
  turret.idleToTargetingMovementAudioEvent = "turret_move_start";
  turret.state = State.STATE_IDLE;
  turret.SetTargetObject(new FixedTarget(0, 0, 0));
  assert.deepEqual(events, [ "turret_move_start" ]);
});


test("clearing a child turret's target drops it to idle and controllers reach the firing effect (Carbon ee9dfdca, 4c9b4d24, 7e04c301)", () =>
{
  const turret = new EveChildTurret();
  turret.animationUpdater = createUpdaterDuck();
  const targetable = new FixedTarget(1, 0, 0);
  turret.SetTargetObject(targetable);
  turret.EnterStateTargeting();
  assert.equal(turret.state, State.STATE_TARGETING);
  assert.ok(turret.GetTargetObject() === targetable, "child turret holds the targetable");

  turret.SetTargetObject(null);
  assert.equal(turret.state, State.STATE_IDLE);
  assert.ok(turret.GetTargetObject() === null, "child turret target cleared");

  const calls = [];
  // A real firing effect: SetFiringEffect registers it with the quad renderer
  // (EveChildTurret.cpp:686), which a bare record cannot answer.
  const firingEffect = new EveTurretFiringFX();
  firingEffect.SetControllerVariable = (name, value) => { calls.push([ "set", name, value ]); };
  firingEffect.StartControllers = () => { calls.push([ "start" ]); };
  turret.firingEffect = firingEffect;
  turret.SetControllerVariable("Heat", 0.5);
  turret.StartControllers();
  assert.deepEqual(calls, [ [ "set", "Heat", 0.5 ], [ "start" ] ]);
});


test("turret targets clear on null and expose the shot-time variance (Carbon 89f5a177)", t =>
{
  const set = new EveTurretSet();
  const targetable = new FixedTarget(1, 0, 0);
  assert.equal(set.GetShotTimeVariance(), 0.6);
  assert.equal(set.target.GetShotTimeVariance(), 0.6);
  assert.equal(set.SetTargetObject(targetable), true);
  // The ship set cannot clear its target (Carbon EveTurretSet.cpp:3630-3633).
  assert.equal(set.SetTargetObject(null), false);
  assert.ok(set.GetTargetObject() === targetable, "ship set keeps its target");
  // The target itself can (Carbon EveTurretTarget.cpp:62-67).
  assert.equal(set.target.SetTargetable(null), true);
  assert.ok(set.GetTargetObject() === null, "target cleared through EveTurretTarget");
  // SetShotMissed stamps TimeAsDouble( BeOS->GetActualTime() ) (EveTurretTarget.cpp:407).
  t.mock.method(be.os, "GetActualTime", () => 120_000_000);
  set.target.SetShotMissed(true);
  assert.equal(set.MissQueueSize(), 1);
  assert.equal(set.GetLastShotTime(), 12);
});
