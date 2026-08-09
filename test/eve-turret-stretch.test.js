import test from "node:test";
import { CjsPerObjectLayouts } from "../src/core/rawData/CjsPerObjectLayouts.js";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { CjsSchema } from "@carbonenginejs/runtime-utils/schema";
import { makePerObjectStore } from "./helpers/perObjectStore.js";
import {
  EveFiringEffectElementContainer,
  EveLocalPositionCurve,
  EveRemotePositionCurve,
  EveStretch2,
  EveStretch3,
  EveTurretFiringFX,
  EveTurretSet,
  EveTurretTarget
} from "../npm/dist/index.js";


test("stretch and turret classes are maintained in their Carbon families", () =>
{
  for (const constructor of [
    EveFiringEffectElementContainer,
    EveLocalPositionCurve,
    EveRemotePositionCurve,
    EveStretch2,
    EveStretch3,
    EveTurretFiringFX,
    EveTurretSet,
    EveTurretTarget
  ])
  {
    assert.equal(CjsSchema.GetConstructor(constructor.name), constructor);
  }

  assert.equal(existsSync(new URL("../src/eve/renderable/stretch/EveRemotePositionCurve.js", import.meta.url)), true);
  assert.equal(existsSync(new URL("../src/eve/EveRemotePositionCurve.js", import.meta.url)), false);
  assert.equal(existsSync(new URL("../src/generated/eve/renderable/stretch/EveStretch2.js", import.meta.url)), false);
  assert.equal(existsSync(new URL("../src/generated/eve/attachment/turrets/EveTurretSet.js", import.meta.url)), false);

  // The composite is retired; the catalog carries the
  // VS/PS pair it used to wrap.
  assert.ok(CjsPerObjectLayouts.Get("EveTurretSetVSData"));
  assert.ok(CjsPerObjectLayouts.Get("EveTurretSetPSData"));
});

test("EveLocalPositionCurve implements Carbon offset and ellipsoid behavior", () =>
{
  const curve = new EveLocalPositionCurve();
  curve.parentPositionCurve = { GetValueAt(_time, out) { vec3.set(out, 10, 20, 30); } };
  curve.parentRotationCurve = { GetValueAt(_time, out) { out.set([0, 0, 0, 1]); } };
  vec3.set(curve.positionOffset, 1, 2, 3);
  curve.SetBehavior(EveLocalPositionCurve.LocalPositionBehavior.POS_OFFSET_POSITION);
  assert.deepEqual(Array.from(curve.GetValueAt(2, vec3.create())), [11, 22, 33]);

  curve.alignPositionCurve = { GetValueAt(_time, out) { vec3.set(out, 20, 20, 30); } };
  vec3.set(curve.boundingSize, 20, 30, 40);
  curve.offset = 5;
  curve.SetBehavior(EveLocalPositionCurve.LocalPositionBehavior.POS_NEAREST_BOUNDING_POINT);
  assert.deepEqual(Array.from(curve.GetValueAt(2, vec3.create())), [35, 20, 30]);
});

test("EveFiringEffectElementContainer owns active element lifecycle", () =>
{
  const calls = [];
  const container = new EveFiringEffectElementContainer();
  container.element = {
    StartFiring(delay) { calls.push(["start", delay]); },
    StopFiring() { calls.push(["stop"]); },
    SetFiringTransform() { calls.push(["transform"]); },
    Update() { calls.push(["update"]); }
  };

  container.StartFiring(0.25);
  container.UpdateSynchronous({});
  container.UpdateAsynchronous({});
  container.StopFiring();
  assert.equal(container.GetActive(), false);
  assert.deepEqual(calls.map(value => value[0]), ["start", "transform", "update", "stop"]);
});

test("EveStretch2 retains Carbon curve timing and portable render data", () =>
{
  const events = [];
  const curveSet = name => ({
    PlayFrom(value) { events.push([name, "play", value]); },
    Stop() { events.push([name, "stop"]); },
    Play() { events.push([name, "end"]); },
    Update(value) { this.scaledTime = value; },
    GetScaledTime() { return this.scaledTime ?? 0; },
    GetMaxCurveDuration() { return name === "loop" ? 3 : 2; }
  });
  const stretch = new EveStretch2();
  stretch.start = curveSet("start");
  stretch.loop = curveSet("loop");
  stretch.end = curveSet("end");
  stretch.quadCount = 4;
  assert.equal(stretch.Initialize(), true);
  assert.equal(stretch.GetCurveDuration(), 3);
  stretch.SetFiringTransform(vec3.fromValues(1, 2, 3), vec3.fromValues(1, 2, 13));
  stretch.StartFiring(0.5);
  stretch.Update({ currentTime: 2, originShift: vec3.create() });

  // Transient RawData payload (cpp:327-337): the m_source..m_effectData member
  // run as 4 vec4s, same bytes bound to VS and PS (cpp:23-39).
  const store = makePerObjectStore();
  const data = stretch.GetPerObjectData({ Alloc: name => store.Alloc(name) });
  assert.deepEqual([...data.GetLayout().stages], ["vs", "ps"]);
  assert.deepEqual(Array.from(data.Copy("sourceData", new Float32Array(4)).slice(0, 3)), [1, 2, 3]);
  assert.deepEqual(Array.from(data.Copy("destinationData", new Float32Array(4)).slice(0, 3)), [1, 2, 13]);
  assert.equal(stretch.GetRenderables([]).length, 1);
  stretch.StopFiring();
  assert.ok(events.some(value => value[0] === "end" && value[1] === "end"));
});

test("EveStretch3 applies deferred controller firing state", () =>
{
  const events = [];
  const controller = {
    Start() { events.push("start"); },
    SetVariable(name, value) { events.push(`${name}:${value}`); },
    Update() {}
  };
  const stretch = new EveStretch3();
  stretch.controllers.push(controller);
  stretch.source = { Update(_time, out) { vec3.set(out, 0, 0, 0); } };
  stretch.dest = { Update(_time, out) { vec3.set(out, 0, 0, 10); } };
  stretch.StartFiring(0.75);
  stretch.UpdateSynchronous({ currentTime: 1 });
  assert.equal(stretch.length.value, 10);
  assert.deepEqual(events.slice(0, 3), ["start", "FiringDelay:0.75", "IsFiring:1"]);
  stretch.StopFiring();
  stretch.UpdateSynchronous({ currentTime: 2 });
  assert.equal(events.at(-1), "IsFiring:0");
});

test("EveTurretTarget bounds the miss queue and switches projectile destination visibility", () =>
{
  const target = new EveTurretTarget();
  const targetable = {
    position: vec3.fromValues(100, 0, 0),
    GetDamageLocatorPosition(_locator, _world, out) { vec3.set(out, 100, 0, 0); return true; },
    GetGoodDamageLocatorIndex() { return 2; },
    GetClosestDamageLocatorIndex() { return 2; },
    GetMissPosition(_source, out) { vec3.set(out, 100, 10, 0); },
    GetRadius() { return 25; },
    GetImpactConfiguration() { return EveTurretTarget.ImpactConfiguration.IMPACT_ARMOR; }
  };
  assert.equal(target.SetTargetable(targetable), true);
  target.SetBehaviour(false, true, 0, EveTurretTarget.ImpactBehaviour.DAMAGE_LOCATOR);
  for (let index = 0; index < 6; index++) target.SetShotMissed(index % 2 === 0, index);
  assert.equal(target.MissQueueSize(), 4);
  assert.equal(target.GetLastShotTime(), 5);
  target.StartFireAtLocator(2, 0, 1, vec3.create());
  assert.equal(target.GetShotMissed(), true);
  assert.equal(target.ShowDestObject(), false);
  assert.equal(target.GetRadius(), 25);
});

test("EveTurretFiringFX preserves Carbon's one-frame ready-to-fire delay", () =>
{
  const empty = new EveTurretFiringFX();
  empty.Initialize();
  assert.equal(empty.GetFiringDuration(), 1000);

  const events = [];
  const stretch = {
    GetCurveDuration() { return 2; },
    StartFiring(delay) { events.push(["start", delay]); },
    StopFiring() { events.push(["stop"]); },
    SetFiringTransform() {},
    DisplayEndPoints() {},
    UpdateEffectAsync() {},
    UpdateEffectSync() {},
    GetRenderables(out) { out.push(this); }
  };
  const firing = new EveTurretFiringFX();
  firing.stretch.push(stretch);
  firing.Initialize();
  firing.SetMuzzleTransform(0, mat4.fromTranslation(mat4.create(), vec3.fromValues(1, 2, 3)));
  firing.PrepareFiring(0);
  const context = { currentTime: 1, deltaTime: 0.1 };
  assert.equal(firing.UpdateAsynchronous(context), false);
  assert.equal(firing.ReadyToFire(), true);
  assert.equal(firing.UpdateAsynchronous(context), true);
  assert.deepEqual(events[0], ["start", -0.1]);
  const start = vec3.create();
  assert.equal(firing.GetStartPosition(start), true);
  assert.deepEqual(Array.from(start), [1, 2, 3]);
  assert.equal(firing.GetRenderables([]).length, 1);
});

test("EveTurretSet exposes Carbon state values and portable firing transforms", () =>
{
  assert.deepEqual(EveTurretSet.State, {
    STATE_INVALID: 0,
    STATE_DEACTIVE: 1,
    STATE_IDLE: 2,
    STATE_TARGETING: 3,
    STATE_FIRING: 4,
    STATE_RELOADING: 5
  });

  const set = new EveTurretSet();
  const local = mat4.fromTranslation(mat4.create(), vec3.fromValues(5, 0, 0));
  set.SetTurrets([local]);
  set.UpdateTurretTransforms(mat4.fromTranslation(mat4.create(), vec3.fromValues(10, 0, 0)));
  const transform = set.GetFiringBoneWorldTransform(0);
  assert.deepEqual(Array.from(transform.subarray(12, 15)), [15, 0, 0]);
  set.EnterStateDeactive();
  assert.equal(set.state, EveTurretSet.State.STATE_DEACTIVE);
  set.ForceStateTargeting();
  assert.equal(set.state, EveTurretSet.State.STATE_TARGETING);
  assert.equal(set.GetShotTimeVariance(), 0.6);
});
