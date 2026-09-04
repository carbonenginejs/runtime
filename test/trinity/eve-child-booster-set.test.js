import test from "node:test";
import assert from "node:assert/strict";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { TriBatchType } from "../../npm/dist/global/consts/graphics/index.js";
import {
  CHILD_BOOSTER_INSTANCE_STRIDE,
  EveChildBoosterSet,
  INVALID_RING_OFFSET
} from "../../npm/dist/trinity/eve/child/EveChildBoosterSet.js";
import { makePerObjectStore } from "./helpers/perObjectStore.js";

const assertNear = (actual, expected, epsilon = 1e-5) =>
{
  assert.ok(Math.abs(actual - expected) <= epsilon, `expected ${expected}, received ${actual}`);
};

function makeSet()
{
  const set = new EveChildBoosterSet();
  set.SetLightData(2, 0.5, 3, 4, [ 1, 0, 0, 1 ], 8, [ 0, 0, 1, 1 ]);
  // Booster 5 back along +Z, scale 2 on X/Y.
  const transform = mat4.create();
  transform[0] = 2;
  transform[5] = 2;
  transform[14] = 5;
  set.Add(transform, 3, 4, 1.5);
  return set;
}

function updateParams(parentScale = 1)
{
  const parent = mat4.create();
  parent[0] = parent[5] = parent[10] = parentScale;
  return { isVisible: true, localToWorldTransform: parent };
}


test("EveChildBoosterSet.Add derives light state, bounds and max size", () =>
{
  const set = makeSet();
  const [ booster ] = set.GetSingleBoosters();
  // Light position: (0,0,-lightOffset) THROUGH the local matrix.
  assert.deepEqual(Array.from(booster.lightPosition), [ 0, 0, 3 ]);
  assertNear(booster.lightRadius, 3, 1e-6); // scale 2 * lightScale 1.5
  assert.equal(booster.atlasIndex0, 3);
  assert.equal(booster.atlasIndex1, 4);
  assertNear(set.maxSize, 2);

  // Bounds report only after the first async update; the pad offsets the
  // centre back half a radius, doubles it, then scales by the parent.
  const sphere = new Float32Array(4);
  assert.equal(set.GetBoundingSphere(sphere), false);
  set.UpdateAsyncronous(null, updateParams(3));
  assert.equal(set.GetBoundingSphere(sphere), true);
  // Single point: radius 0 -> centre [0,0,5] scaled by 3, w 0.
  assert.deepEqual(Array.from(sphere), [ 0, 0, 15, 0 ]);
  assertNear(set.thrust, 0);
});


test("EveChildBoosterSet packs 64-byte instance rows and gates draws on the ring", () =>
{
  const set = makeSet();
  set.thrust = 0.75;
  set.SetControllerVariable("ThrustMain", 0.75);
  set.UpdateAsyncronous(null, updateParams());

  const { data, count, stride } = set.GetInstanceBufferData();
  assert.equal(count, 1);
  assert.equal(stride, CHILD_BOOSTER_INSTANCE_STRIDE);
  // Float4x3 rows are the transpose's rows: (m0 m4 m8 m12) ...
  assert.deepEqual(Array.from(data.subarray(0, 12)),
    [ 2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1, 5 ]);
  assertNear(data[12], 0.75); // intensity = thrust
  const u32 = new Uint32Array(data.buffer, data.byteOffset, 16);
  assert.equal(u32[14], 3);
  assert.equal(u32[15], 4);

  // No ring buffer: Carbon's invalid-offset no-draw path.
  const committed = [];
  const accumulator = { Commit: batch => committed.push(batch) };
  set.GetBatches(accumulator, TriBatchType.TRIBATCHTYPE_ADDITIVE, null);
  assert.equal(committed.length, 0);

  // With a ring buffer the offset lands in the per-object data and the
  // additive batch draws 36 indices per instance.
  set.SetRingBuffer({ UploadTransforms: () => 7 });
  set.effect = { name: "booster-effect" };
  set.UpdateAsyncronous(null, updateParams());
  set.UpdateVisibility({
    GetFrustum: () => ({
      GetPixelSizeAccross: () => 1000,
      IsSphereVisible: () => true
    }),
    GetMediumDetailThreshold: () => 10,
    GetLowDetailThreshold: () => 5
  });
  set.GetBatches(accumulator, TriBatchType.TRIBATCHTYPE_ADDITIVE, null);
  assert.equal(committed.length, 1);
  assert.equal(committed[0].indexCountPerInstance, 36);
  assert.equal(committed[0].instanceCount, 1);
  assert.equal(committed[0].proceduralVertexBufferName, "ChildBoosterBoxVB");
  set.GetBatches(accumulator, TriBatchType.TRIBATCHTYPE_OPAQUE, null);
  assert.equal(committed.length, 1, "additive-only");

  const store = makePerObjectStore();
  const records = set.GetPerObjectData({ Alloc: name => store.Alloc(name) });
  assert.ok(records?.vs);
  // UINT lanes bit-cast into the float buffer; read back through a u32 view.
  const offsetLane = records.vs.Get("instanceOffset");
  assert.equal(new Uint32Array(offsetLane.buffer, offsetLane.byteOffset, 1)[0], 7);
  assertNear(records.vs.Get("maxBoosterSize")[0], 2);
  assertNear(records.ps.Get("warpIntensity")[0], 0);

  // Clearing the ring buffer returns the set to the undrawable state.
  set.SetRingBuffer(null);
  set.GetPerObjectData({ Alloc: name => store.Alloc(name) });
  assert.equal(set.GetInstanceBufferData().count, 1);
  committed.length = 0;
  set.GetBatches(accumulator, TriBatchType.TRIBATCHTYPE_ADDITIVE, null);
  assert.equal(committed.length, 0);
  void INVALID_RING_OFFSET;
});


test("EveChildBoosterSet observes its drive controller and warp state", () =>
{
  const set = new EveChildBoosterSet();
  assert.equal(set.driveName, "ThrustMain");
  set.SetDriveName("ThrustCustom");
  set.SetControllerVariable("ThrustMain", 0.9);
  assert.equal(set.thrust, 0, "renamed drive ignores the default name");
  set.SetControllerVariable("ThrustCustom", 0.9);
  assertNear(set.thrust, 0.9);
  set.SetControllerVariable("WarpState", 0.4);
  assertNear(set.warpIntensity, 0.4);
});


test("EveChildBoosterSet flickers its lights scaled by the parent transform", () =>
{
  const set = makeSet();
  set.SetControllerVariable("ThrustMain", 1);
  set.UpdateAsyncronous(null, updateParams(2));

  const lights = [];
  set.GetLights({
    GetAnimationTime: () => 0,
    AddPointLight: (position, radius, color) => lights.push({
      position: Array.from(position), radius, color: Array.from(color)
    })
  });
  assert.equal(lights.length, 1);
  // Light position lifted through the parent (scale 2): [0,0,3] -> [0,0,6].
  assert.deepEqual(lights[0].position, [ 0, 0, 6 ]);
  // Radius: booster.lightRadius 3 * lightRadius 4 * parentScale 2 = 24,
  // warp blend zero.
  assertNear(lights[0].radius, 24, 1e-4);

  // Zero thrust silences the lights entirely.
  set.SetControllerVariable("ThrustMain", 0);
  const silent = [];
  set.GetLights({ GetAnimationTime: () => 0, AddPointLight: () => silent.push(1) });
  assert.equal(silent.length, 0);
});
