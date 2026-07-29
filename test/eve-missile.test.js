import test from "node:test";
import { CjsPerObjectLayouts } from "../src/trinityCore/rawData/CjsPerObjectLayouts.js";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { CjsSchema } from "@carbonenginejs/runtime-utils/schema";
import {
  EveLocator2,
  EveLocatorSets,
  EveMissile,
  EveMissileWarhead,
  EveMobile,
  EveSpaceObject2,
  EveTransform,
  EveTurretSet,
  Locator,
  TriRenderBatchAccumulator
} from "../npm/dist/index.js";
import { makePerObjectStore } from "./helpers/perObjectStore.js";


test("missile, transform, and mobile classes are maintained Carbon graph owners", () =>
{
  for (const constructor of [EveTransform, EveMissileWarhead, EveMissile, EveMobile])
  {
    assert.equal(CjsSchema.GetConstructor(constructor.name), constructor);
  }
  assert.equal(new EveMissileWarhead() instanceof EveTransform, true);
  for (const name of ["EveTransform", "EveMissileWarhead", "EveMissile", "EveMobile"])
  {
    assert.equal(existsSync(new URL(`../src/generated/eve/spaceObject/${name}.js`, import.meta.url)), false, name);
  }
});

test("EveSpaceObject2 exposes Carbon's targetable locator and shield collision surface", () =>
{
  const object = new EveSpaceObject2();
  const set = new EveLocatorSets();
  const locator = new Locator();
  vec3.set(locator.position, 0, 2, 0);
  set.SetName("damage");
  set.locators.push(locator);
  object.locatorSets.push(set);
  object.UpdateWorldTransform(1);

  assert.equal(object.GetClosestDamageLocatorIndex(vec3.fromValues(0, 10, 0)), 0);
  assert.equal(object.GetDamageLocatorPosition(0, true, EveMissileTest.locatorPosition), true);
  assert.deepEqual(Array.from(EveMissileTest.locatorPosition), [0, 2, 0]);
  assert.equal(object.GetRadius(), -1);

  object.impactOverlay = {
    HasShieldEllipsoid() { return true; },
    GetImpactConfiguration() { return EveSpaceObject2.ImpactConfiguration.IMPACT_SHIELD; }
  };
  vec3.set(object.shapeEllipsoidRadius, 2, 2, 2);
  const impact = vec3.create();
  assert.equal(object.GetImpactPosition(0, vec3.fromValues(-3, 0, 0), vec3.create(), 0, impact), true);
  assert.ok(Math.abs(impact[0] + 2) < 1e-6);
});

test("EveMissileWarhead follows Carbon launch, state, particle, impact, and POD contracts", () =>
{
  const events = [];
  const warhead = new EveMissileWarhead();
  warhead.id = 4;
  warhead.particleEmitters.push({ Enable(value) { events.push(value); } });
  warhead.PrepareLaunch();
  const launch = mat4.fromTranslation(mat4.create(), vec3.fromValues(3, 4, 5));
  warhead.Launch(launch);

  assert.equal(warhead.GetState(), EveMissileWarhead.State.STATE_DELAYED);
  assert.equal(warhead.UpdateState(0, 2, null), EveMissileWarhead.StateChangeEvent.EVT_NONE);
  assert.equal(warhead.GetState(), EveMissileWarhead.State.STATE_LAUNCH);
  warhead.UpdateState(0, 2, null);
  assert.equal(warhead.GetState(), EveMissileWarhead.State.STATE_EJECTING);
  assert.deepEqual(events, [true]);
  warhead.UpdateState(0, 2, null);
  assert.equal(warhead.GetState(), EveMissileWarhead.State.STATE_START_TRACKING);
  warhead.UpdateState(0, 2, null);
  assert.equal(warhead.GetState(), EveMissileWarhead.State.STATE_TRACKING_FINAL);

  warhead.UpdateWarhead(0.1, 2, vec3.create(), vec3.create(), mat4.create(), mat4.create(), vec3.create());
  warhead.Update({ currentTime: 0.1, deltaTime: 0.1, originShift: vec3.create() });
  assert.equal(warhead.CheckImpact(0.1, 2, null), EveMissileWarhead.StateChangeEvent.EVT_EXPLODE);
  assert.deepEqual(Array.from(warhead.explosionPosition), Array.from(warhead.GetWorldPosition()));
  assert.equal(warhead.CheckImpact(0.1, 2, null), EveMissileWarhead.StateChangeEvent.EVT_NONE);

  const accumulator = new TriRenderBatchAccumulator().SetTriPoolAllocator(makePerObjectStore());
  const data = warhead.GetPerObjectData(accumulator);
  const missileSize = new Float32Array(4);
  data.Copy("missileSize", missileSize);
  assert.deepEqual(Array.from(missileSize), [1, 1, 0, 0]);
  const sphere = vec4.create();
  assert.equal(warhead.GetLocalBoundingSphere(sphere), true);
  assert.equal(sphere[3], 0.5);
});

test("EveMissile drives MIRV state and invokes each explosion callback once", () =>
{
  const missile = new EveMissile();
  const warhead = new EveMissileWarhead();
  warhead.id = 7;
  warhead.PrepareLaunch();
  warhead.Launch(mat4.create());
  missile.warheads.push(warhead);
  const exploded = [];
  missile.explosionCallback = id => exploded.push(id);
  missile.Initialize();
  missile.Start(vec3.create(), 2);
  const context = { currentTime: 0, deltaTime: 0.1, originShift: vec3.create() };
  for (let frame = 0; frame < 6; frame++)
  {
    context.currentTime += context.deltaTime;
    missile.UpdateSyncronous(context);
  }
  assert.deepEqual(exploded, [7]);
  assert.equal(warhead.GetState(), EveMissileWarhead.State.STATE_DEAD);
  assert.equal(missile.boundingSphereRadius, 0.5);
});

test("EveMobile maps authored turret locators and drives the active count", () =>
{
  const mobile = new EveMobile();
  for (const [name, x] of [["locator_turret_1a", 1], ["locator_turret_1b", 2]])
  {
    const locator = new EveLocator2();
    locator.name = name;
    mat4.fromTranslation(locator.transform, vec3.fromValues(x, 0, 0));
    mobile.locators.push(locator);
  }
  const turretSet = new EveTurretSet();
  turretSet.locatorName = "locator_turret_";
  turretSet.slotNumber = 1;
  mobile.turretSets.push(turretSet);
  mobile.Initialize();

  assert.equal(mobile.GetTurretLocatorCount(), 1);
  assert.equal(mobile.GetTurretLocatorIndex(0, 1), 1);
  mobile.UpdateAsyncronous({ currentTime: 1, deltaTime: 0, originShift: vec3.create() });
  assert.equal(turretSet.GetTurrets().length, 2);
  assert.deepEqual(Array.from(turretSet.GetTurrets()[1].worldMatrix.subarray(12, 15)), [2, 0, 0]);

  turretSet.state = EveTurretSet.State.STATE_FIRING;
  mobile.UpdateSyncronous({ currentTime: 1, deltaTime: 0 });
  assert.equal(mobile.GetActiveTurretCount(), 1);
});

test("turret fixed POD arrays and tracking fade preserve Carbon dimensions and ordering", () =>
{
  // The fixed POD dimensions are the catalog element counts now.
  const vs = CjsPerObjectLayouts.Get("EveTurretSetVSData").fields;
  const ps = CjsPerObjectLayouts.Get("EveTurretSetPSData").fields;
  assert.equal(vs.get("_unused").count, 2);
  assert.equal(vs.get("turretTranslation").count, 24);
  assert.equal(vs.get("turretRotation").count, 24);
  assert.equal(ps.get("shLightingCoefficients").count, 7);
  // Distinct slots: each array element occupies its own span, so slot 1 starts
  // one element past slot 0 rather than aliasing it.
  const translation = vs.get("turretTranslation");
  assert.equal(translation.size, 4, "each turret translation is one vec4");
  assert.equal(ps.get("shLightingCoefficients").size, 4, "each coefficient is one vec4");

  const turretSet = new EveTurretSet();
  turretSet.maxTrackingTime = 2;
  turretSet.SetTurrets([mat4.create()]);
  turretSet.EnterStateTargeting();
  turretSet.UpdateAsyncronous({ deltaTime: 0.5 }, mat4.create());
  assert.equal(turretSet.trackingInfluence, 0);
  turretSet.UpdateAsyncronous({ deltaTime: 0.5 }, mat4.create());
  assert.equal(turretSet.trackingInfluence, 0.5);
});

class EveMissileTest
{
  static locatorPosition = vec3.create();
}
