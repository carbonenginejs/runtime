// ShadowCaster nominal implementations: EveTurretSet (EveTurretSet.cpp:2022-2051,
// 2221-2254, 2275-2290, 2520-2523) and EveSwarmRenderable (EveSwarm.cpp:
// 242-267, 269-298, 61-71, 300-303) plus the EveSwarm.GetBoundingSphere
// companion (EveSwarm.cpp:801-808; BoundingSphereFromBox
// Utilities/BoundingSphere.cpp:182-197; BoundingSphereTransform cpp:70-81).
import test from "node:test";
import { TriBatchType } from "../../npm/dist/global/consts/graphics/index.js";
import assert from "node:assert/strict";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";
import { vec4 } from "../../npm/dist/global/math/vec4.js";
import {
  EveShip2,
  EveSwarm,
  EveSwarmRenderable,
  EveTurretSet,
  Tr2RenderReason
} from "../../npm/dist/trinity/index.js";
import { makePerObjectStore } from "./helpers/perObjectStore.js";


const EPSILON = 1e-5;

function assertClose(actual, expected, message, epsilon = EPSILON)
{
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `${message}: expected ${expected}, got ${actual}`
  );
}

/** A recording shadow-frustum duck: IsVisible captures the cull sphere,
 * GetSizeInShadow maps radius -> radius * 10. */
function MakeShadowFrustum(sizeOf = sphere => sphere[3] * 10)
{
  const seen = [];
  return {
    seen,
    IsVisible(cameraFrustum, sphere)
    {
      seen.push(Array.from(sphere));
      return true;
    },
    GetSizeInShadow(sphere)
    {
      return sizeOf(sphere);
    }
  };
}

test("EveTurretSet.IsCastingShadow: early-outs never write the out-param (cpp:2024-2032)", () =>
{
  const set = new EveTurretSet();
  const stale = [99];

  // display true by default but no geometry resource.
  assert.equal(set.IsCastingShadow({}, MakeShadowFrustum(), 0, stale), false, "geometry gate");
  assert.equal(stale[0], 99, "geometry early-out leaves the stale value");

  set.geometryResource = {};
  assert.equal(
    set.IsCastingShadow({}, MakeShadowFrustum(), Tr2RenderReason.TR2RENDERREASON_REFLECTION, stale),
    false,
    "reflection gate"
  );
  assert.equal(stale[0], 99, "reflection early-out leaves the stale value");
});

test("EveTurretSet.IsCastingShadow: per-turret sphere transform, max accumulation, > 5 threshold (cpp:2034-2050)", () =>
{
  const set = new EveTurretSet();
  set.geometryResource = {};
  vec4.set(set.boundingSphere, 0, 0, 0, 1);
  set.SetTurrets([{}, {}]);
  const [first, second] = set.GetTurrets();
  mat4.fromTranslation(first.worldMatrix, [10, 0, 0]);
  mat4.fromScaling(second.worldMatrix, [2, 2, 2]);
  // Per-turret visibility is deliberately NOT consulted (no GetDynamicBounds,
  // no turret.visible gate - cpp:2036-2048).
  second.display = false;

  const frustum = MakeShadowFrustum();
  const sizeOut = [99];
  assert.equal(set.IsCastingShadow({}, frustum, 0, sizeOut), true, "casting");
  assert.equal(frustum.seen.length, 2, "invisible turrets still tested");
  // First sphere: center (10,0,0) radius 1; second: radius scaled by the max
  // basis length 2 (BoundingSphereTransform cpp:74-80).
  assertClose(frustum.seen[0][0], 10, "transformed center");
  assertClose(frustum.seen[0][3], 1, "unscaled radius");
  assertClose(frustum.seen[1][3], 2, "radius scaled by max basis length");
  assertClose(sizeOut[0], 20, "max GetSizeInShadow accumulated");

  // Zero-radius set sphere: every transformed w is 0, gate w > 0 skips all
  // (cpp:2042), the out-param IS written 0 (cpp:2034) and the result is false.
  vec4.set(set.boundingSphere, 0, 0, 0, 0);
  const zeroOut = [99];
  assert.equal(set.IsCastingShadow({}, MakeShadowFrustum(), 0, zeroOut), false, "below threshold");
  assert.equal(zeroOut[0], 0, "sizeInShadow reset past the early-outs");
});

test("EveTurretSet.GetShadowBatches: instanced batch, ignored shadowPixelSize (cpp:2221-2254)", () =>
{
  const set = new EveTurretSet();
  const committed = [];
  const batches = { Commit: batch => (committed.push(batch), true) };

  set.SetTurrets([]);
  assert.equal(set.GetShadowBatches(batches, null, 0), false, "visibleCount gate");

  set.SetTurrets([{}, {}, {}]);
  assert.equal(set.GetShadowBatches(batches, null, 0), false, "geometry gate");

  set.geometryResource = { name: "turretGeometry" };
  assert.equal(set.GetShadowBatches(batches, null, 0), false, "null material batch is invalid");

  set.turretEffect = { name: "turretEffect" };
  const perObjectData = { object: set };
  assert.equal(set.GetShadowBatches(batches, perObjectData, -12345), true, "committed (pixel size ignored)");
  const batch = committed[0];
  assert.equal(batch.material, set.turretEffect, "turret effect material");
  assert.equal(batch.geometrySource.geometry, set.geometryResource, "geometry source");
  assert.equal(batch.instanceCount, 3, "instance count = visibleCount");
  assert.equal(batch.objectData, perObjectData, "caller per-object data threaded");
});

test("EveTurretSet.GetBatches: opaque instanced batch and fixed sort contracts (cpp:2163-2213, 2260-2263)", () =>
{
  const set = new EveTurretSet();
  const committed = [];
  const batches = { Commit: batch => (committed.push(batch), true) };
  set.SetTurrets([{}, {}]);
  set.geometryResource = { name: "turretGeometry" };
  set.turretEffect = { name: "turretEffect" };
  const perObjectData = { object: set };

  assert.equal(set.GetBatches(batches, TriBatchType.TRIBATCHTYPE_ADDITIVE, perObjectData, 0), false);
  assert.equal(set.GetBatches(batches, TriBatchType.TRIBATCHTYPE_OPAQUE, perObjectData, 0), true);
  assert.equal(set.HasTransparentBatches(), false);
  assert.equal(set.GetSortValue(), 1);
  assert.equal(committed[0].material, set.turretEffect);
  assert.equal(committed[0].geometrySource.geometry, set.geometryResource);
  assert.equal(committed[0].instanceCount, 2);
  assert.equal(committed[0].objectData, perObjectData);
});

test("EveTurretSet.GetPerObjectData: null without geometry (legal on batches), forward from the shadow variant (cpp:2277-2290, 2520-2523)", () =>
{
  const set = new EveTurretSet();
  assert.equal(set.GetPerObjectData(), null, "null without geometry");
  set.geometryResource = {};
  // Carbon allocates the record from the accumulator, so no accumulator means
  // no record - the same legal null the batch path already tolerates.
  assert.equal(set.GetShadowPerObjectData(), null, "null without an accumulator");

  const store = makePerObjectStore();
  const data = set.GetShadowPerObjectData({ Alloc: (name) => store.Alloc(name) });
  assert.equal(data.vs.GetStruct(), "EveTurretSetVSData", "the shadow variant forwards to the same fill");
  assert.equal(data.ps.GetStruct(), "EveTurretSetPSData", "and carries the PS half");
});

test("EveSwarm.GetBoundingSphere: squad box sphere plus the ship radius (EveSwarm.cpp:801-808)", () =>
{
  const swarm = new EveSwarm();
  vec3.set(swarm.squadBoundsMin, -10, -10, -10);
  vec3.set(swarm.squadBoundsMax, 30, 10, 10);

  const shipSphere = vec4.create();
  EveShip2.prototype.GetBoundingSphere.call(swarm, shipSphere);

  const sphere = vec4.create();
  assert.equal(swarm.GetBoundingSphere(sphere), true, "always true");
  assertClose(sphere[0], 10, "box center x");
  assertClose(sphere[1], 0, "box center y");
  // radius = half box diagonal + ship sphere radius.
  assertClose(sphere[3], Math.hypot(40, 20, 20) / 2 + shipSphere[3], "combined radius", 1e-3);
});

test("EveSwarmRenderable.IsCastingShadow: squad radius centered at the fighter, > 15 threshold (EveSwarm.cpp:242-267)", () =>
{
  const renderable = new EveSwarmRenderable();
  const stale = [99];
  assert.equal(renderable.IsCastingShadow({}, MakeShadowFrustum(), 0, stale), false, "owner gate");
  assert.equal(stale[0], 99, "owner early-out leaves the stale value");

  renderable.owner = {
    GetBoundingSphere(sphere)
    {
      vec4.set(sphere, 5, 5, 5, 50);
      return true;
    }
  };
  assert.equal(
    renderable.IsCastingShadow({}, MakeShadowFrustum(), Tr2RenderReason.TR2RENDERREASON_REFLECTION, stale),
    false,
    "reflection gate"
  );
  assert.equal(stale[0], 99, "reflection early-out leaves the stale value");

  renderable.worldTransform[12] = 100;
  renderable.worldTransform[13] = 0;
  renderable.worldTransform[14] = 0;

  // GetSizeInShadow 16 > 15 -> casting; the owner sphere CENTER is discarded
  // in favor of the fighter's world translation (cpp:257).
  const frustum = MakeShadowFrustum(() => 16);
  const sizeOut = [0];
  assert.equal(renderable.IsCastingShadow({}, frustum, 0, sizeOut), true, "casting above 15");
  assertClose(frustum.seen[0][0], 100, "fighter-centered x");
  assertClose(frustum.seen[0][3], 50, "squad-wide radius kept");
  assertClose(sizeOut[0], 16, "size written");

  // 14 is below the swarm's own 15 threshold but still written to the out -
  // the volumetric/spot call sites re-check > 5 on the raw value themselves.
  const smaller = MakeShadowFrustum(() => 14);
  const smallOut = [0];
  assert.equal(renderable.IsCastingShadow({}, smaller, 0, smallOut), false, "5 < size <= 15 is cascade-only false");
  assertClose(smallOut[0], 14, "raw size still written for the caller re-check");
});

test("EveSwarmRenderable.GetShadowBatches delegates OPAQUE areas through the mesh (EveSwarm.cpp:269-298)", () =>
{
  const renderable = new EveSwarmRenderable();
  assert.equal(renderable.GetShadowBatches({}, null, 1), false, "mesh gate");

  const calls = [];
  renderable.mesh = {
    display: true,
    GetBatches(...args)
    {
      calls.push(args);
      return true;
    }
  };
  const batches = {};
  const perObjectData = {};
  assert.equal(renderable.GetShadowBatches(batches, perObjectData, 123), true, "committed");
  assert.equal(calls[0][0], batches, "accumulator threaded");
  assert.equal(calls[0][1], TriBatchType.TRIBATCHTYPE_OPAQUE, "OPAQUE areas only");
  assert.equal(calls[0][2], perObjectData, "per-object data threaded");

  renderable.mesh.display = false;
  assert.equal(renderable.GetShadowBatches(batches, perObjectData, 123), false, "mesh display gate");
});

test("EveSwarmRenderable.GetPerObjectData record + shadow forward (EveSwarm.cpp:61-71, 300-303)", () =>
{
  const renderable = new EveSwarmRenderable();
  const data = renderable.GetShadowPerObjectData();
  // The shadow variant forwards to the same PERSISTENT pair.
  assert.equal(data.vs.GetStruct(), "EveSpaceObjectVSData", "the VS half");
  assert.equal(data.ps.GetStruct(), "EveSpaceObjectPSData", "the PS half");
  assert.equal(renderable.GetPerObjectData().vs, data.vs, "same record both ways");
});
