import test from "node:test";
import { CjsPerObjectLayouts } from "../../src/trinity/core/rawData/CjsPerObjectLayouts.js";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";
import { vec4 } from "../../npm/dist/global/math/vec4.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import {
  EveLocator2,
  EveLocatorSets,
  EveMissile,
  ITr2GenericEmitter,
  EveMissileWarhead,
  EveMobile,
  EveSpaceObject2,
  EveTransform,
  EveTurretSet,
  EveUpdateContext,
  Locator,
  TriFrustum,
  TriRenderBatchAccumulator,
  Tr2Mesh,
  Tr2Renderer
} from "../../npm/dist/trinity/index.js";
import { TR2SHADERMODEL } from "../../npm/dist/global/consts/graphics/index.js";
import { makePerObjectStore } from "./helpers/perObjectStore.js";


test("missile, transform, and mobile classes are maintained Carbon graph owners", () =>
{
  for (const constructor of [EveTransform, EveMissileWarhead, EveMissile, EveMobile])
  {
    assert.equal(CjsSchema.GetConstructor(constructor.name), constructor);
  }
  assert.ok(CjsSchema.cast(new EveMissileWarhead(), EveTransform));
  for (const name of ["EveTransform", "EveMissileWarhead", "EveMissile", "EveMobile"])
  {
    assert.equal(existsSync(new URL(`../../src/trinity/generated/eve/spaceObject/${name}.js`, import.meta.url)), false, name);
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
  warhead.particleEmitters.push(new (class extends ITr2GenericEmitter
  {
    Enable(value)
    {
      events.push(value);
    }
    Update(_arguments)
    {
    }
  })());
  warhead.PrepareLaunch();
  const launch = mat4.fromTranslation(mat4.create(), vec3.fromValues(3, 4, 5));
  warhead.Launch(launch);

  assert.equal(warhead.GetState(), EveMissileWarhead.State.STATE_DELAYED);
  assert.equal(warhead.UpdateState(0, 2, null), EveMissileWarhead.StateChangeEvent.EVT_NONE);
  assert.equal(warhead.GetState(), EveMissileWarhead.State.STATE_LAUNCH);
  warhead.UpdateState(0, 2, null);
  assert.equal(warhead.GetState(), EveMissileWarhead.State.STATE_EJECTING);
  assert.deepEqual(events, [], "native shared-emitter cast rejects a generic emitter");
  warhead.UpdateState(0, 2, null);
  assert.equal(warhead.GetState(), EveMissileWarhead.State.STATE_START_TRACKING);
  warhead.UpdateState(0, 2, null);
  assert.equal(warhead.GetState(), EveMissileWarhead.State.STATE_TRACKING_FINAL);

  warhead.UpdateWarhead(0.1, 2, vec3.create(), vec3.create(), mat4.create(), mat4.create(), vec3.create());
  const context = new EveUpdateContext();
  context.SetTime(0);
  context.SetTime(0.1);
  warhead.Update(context);
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

test("constructed single-warhead missile invokes its explosion callback once", () =>
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
  const context = new EveUpdateContext();
  context.SetTime(0);
  for (let frame = 0; frame < 6; frame++)
  {
    context.SetTime((frame + 1) * 0.1);
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
  const context = new EveUpdateContext();
  context.SetTime(1);
  mobile.UpdateAsyncronous(context);
  assert.equal(turretSet.GetTurrets().length, 2);
  assert.deepEqual(Array.from(turretSet.GetTurrets()[1].worldMatrix.subarray(12, 15)), [2, 0, 0]);

  turretSet.state = EveTurretSet.State.STATE_FIRING;
  mobile.UpdateSyncronous(context);
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
  const context = new EveUpdateContext();
  context.SetTime(1);
  context.SetTime(1.5);
  turretSet.UpdateAsyncronous(context, mat4.create());
  assert.equal(turretSet.trackingInfluence, 0);
  context.SetTime(2);
  turretSet.UpdateAsyncronous(context, mat4.create());
  assert.equal(turretSet.trackingInfluence, 0.5);
});

class EveMissileTest
{
  static locatorPosition = vec3.create();
}

// EveMissileWarhead::UpdateVisibility (EveMissileWarhead.cpp:109-157) and
// GetRenderables (:179-182), against a real frustum looking down -Z. The lod
// thresholds are placed around the warhead's own pixel size, so each case lands
// on a known side of them.
function MakeWarheadScene(distance = 500)
{
  const frustum = new TriFrustum();
  const view = mat4.lookAt(mat4.create(), [ 0, 0, 0 ], [ 0, 0, -1 ], [ 0, 1, 0 ]);
  const projection = mat4.perspective(mat4.create(), Math.PI / 2, 1, 0.1, 100000);
  frustum.DeriveFrustum(view, [ 0, 0, 0 ], projection, { width: 1024, height: 1024 });

  const context = new EveUpdateContext();
  context.SetFrustum(frustum);

  const warhead = new EveMissileWarhead();
  warhead.startDataValid = true;
  warhead.display = true;
  warhead.mesh = new Tr2Mesh();
  warhead.warheadLength = 20;

  const parent = mat4.fromTranslation(mat4.create(), [ 0, 0, -distance ]);
  // The pixel size the frustum gives this warhead's world sphere.
  warhead.UpdateVisibility(context, parent);
  const sphere = vec4.create();
  warhead.GetBoundingSphere(sphere);
  const pixels = frustum.GetPixelSizeAccross(sphere);
  return { context, warhead, parent, pixels };
}

test("EveMissileWarhead is not visible before valid start data, when dead, when hidden on low quality, or with display off", () =>
{
  const { context, warhead, parent } = MakeWarheadScene();

  warhead.startDataValid = false;
  assert.equal(warhead.UpdateVisibility(context, parent), false);
  assert.deepEqual(warhead.GetRenderables([]), []);
  warhead.startDataValid = true;

  warhead._state = EveMissileWarhead.State.STATE_DEAD;
  assert.equal(warhead.UpdateVisibility(context, parent), false);
  warhead._state = EveMissileWarhead.State.STATE_DELAYED;

  const shaderModel = Tr2Renderer.GetShaderModel();
  try
  {
    Tr2Renderer.SetShaderModel(TR2SHADERMODEL.TR2SM_3_0_LO);
    warhead.hideOnLowQuality = true;
    assert.equal(warhead.UpdateVisibility(context, parent), false);
    assert.equal(warhead.lodLevel, EveTransform.Tr2Lod.TR2_LOD_LOW);
  }
  finally
  {
    Tr2Renderer.SetShaderModel(shaderModel);
    warhead.hideOnLowQuality = false;
  }

  warhead.display = false;
  assert.equal(warhead.UpdateVisibility(context, parent), false);
  assert.deepEqual(warhead.GetRenderables([]), []);
});

test("EveMissileWarhead lod comes from the medium-detail and visibility thresholds; below MEDIUM it returns nothing", () =>
{
  const { context, warhead, parent, pixels } = MakeWarheadScene();
  assert.ok(pixels > 2, `warhead covers ${pixels} px`);

  context.SetMediumDetailThreshold(pixels - 1);
  context.SetVisibilityThreshold(pixels - 2);
  assert.equal(warhead.UpdateVisibility(context, parent), true);
  assert.equal(warhead.lodLevel, EveTransform.Tr2Lod.TR2_LOD_HIGH);
  assert.deepEqual(warhead.GetRenderables([]), [ warhead ]);

  context.SetMediumDetailThreshold(pixels + 1);
  context.SetVisibilityThreshold(pixels - 1);
  warhead.UpdateVisibility(context, parent);
  assert.equal(warhead.lodLevel, EveTransform.Tr2Lod.TR2_LOD_MEDIUM);
  assert.deepEqual(warhead.GetRenderables([]), [ warhead ]);

  // Below the VISIBILITY threshold (not the low-detail one): visible, but LOW,
  // so the mesh is hidden entirely (cpp:143-146, 179-182).
  context.SetMediumDetailThreshold(pixels + 2);
  context.SetVisibilityThreshold(pixels + 1);
  assert.equal(warhead.UpdateVisibility(context, parent), true);
  assert.equal(warhead.lodLevel, EveTransform.Tr2Lod.TR2_LOD_LOW);
  assert.deepEqual(warhead.GetRenderables([]), []);
});

test("negative control: the old super-call UpdateVisibility renders a warhead below the visibility threshold", () =>
{
  // The pre-port shape: set visible, then run EveTransform's pass, which picks
  // MEDIUM from the LOW-detail threshold (0 here), so the mesh stays drawn.
  class SuperCallWarhead extends EveMissileWarhead
  {
    UpdateVisibility(context, parentTransform)
    {
      this._isVisible = true;
      EveTransform.prototype.UpdateVisibility.call(this, context, parentTransform);
      this._isVisible = true;
      return true;
    }
  }
  const { context, parent, pixels } = MakeWarheadScene();
  const warhead = new SuperCallWarhead();
  warhead.startDataValid = true;
  warhead.display = true;
  warhead.mesh = new Tr2Mesh();
  warhead.warheadLength = 20;
  context.SetMediumDetailThreshold(pixels + 2);
  context.SetVisibilityThreshold(pixels + 1);
  warhead.UpdateVisibility(context, parent);
  assert.notDeepEqual(warhead.GetRenderables([]), []);
});
