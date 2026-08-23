import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CjsBatchManager,
  EveMissileWarhead,
  EveSpaceObject2,
  EveSpaceScene,
  EveTransform,
  RawData,
  Tr2Mesh,
  Tr2MeshArea,
  Tr2PerObjectData,
  Tr2RenderContext,
  TriRenderBatchAccumulator
} from "../../npm/dist/trinity/index.js";

import { TriBatchType } from "../../npm/dist/global/consts/graphics/index.js";
import { makePerObjectStore, makeRenderContextWithStore } from "./helpers/perObjectStore.js";

// An accumulator wired with a test per-object-data store.
function makeAccumulator()
{
  return new TriRenderBatchAccumulator().SetTriPoolAllocator(makePerObjectStore());
}

const OPAQUE = TriBatchType.TRIBATCHTYPE_OPAQUE;
const TRANSPARENT = TriBatchType.TRIBATCHTYPE_TRANSPARENT;

function areaWithEffect(effect = {}, { index = 0, count = 1 } = {})
{
  const area = new Tr2MeshArea();
  area.SetMaterial(effect);
  area.SetIndex(index);
  area.SetCount(count);
  return area;
}

function meshWithOpaqueArea(effect = {})
{
  const mesh = new Tr2Mesh();
  mesh.AddArea(OPAQUE, areaWithEffect(effect));
  return mesh;
}

test("Tr2Mesh declares geometry/batches rebuild tokens", () =>
{
  const mesh = Tr2Mesh.from({});
  assert.ok(mesh.__state.rebuild.has("geometry"), "construction arms the geometry token");
  assert.ok(mesh.__state.rebuild.has("batches"), "inherited Tr2MeshBase fields arm the batches token");

  // Consumer clears; a declared-field CHANGE re-adds, an equal write does not.
  mesh.__state.rebuild.clear();
  mesh.SetValues({ meshIndex: 3 });
  assert.ok(mesh.__state.rebuild.has("batches"));
  assert.equal(mesh.__state.rebuild.has("geometry"), false);

  mesh.__state.rebuild.clear();
  mesh.SetValues({ meshIndex: 3 });
  assert.equal(mesh.__state.rebuild.size, 0, "equal-value write adds nothing");

  mesh.SetValues({ geometryResPath: "res:/geometry.gr2" });
  assert.ok(mesh.__state.rebuild.has("geometry"));

  // The direct-mutation setter schedules the same consequence explicitly.
  mesh.__state.rebuild.clear();
  mesh.SetGeometryRes({ GetPath() { return "res:/other.gr2"; } });
  assert.ok(mesh.__state.rebuild.has("geometry"));
});

test("EveTransform.GetBatches delegates to mesh.GetBatches via GetAreas, gated on display", () =>
{
  const transform = new EveTransform();
  transform.mesh = meshWithOpaqueArea({ id: "fx" });

  const accumulator = new TriRenderBatchAccumulator();
  assert.equal(transform.GetBatches(accumulator, OPAQUE, null, 0), true,
    "reports that batches were accumulated (JS boolean addition)");
  assert.equal(accumulator.GetBatchCount(), 1);

  transform.display = false;
  const hidden = new TriRenderBatchAccumulator();
  assert.equal(transform.GetBatches(hidden, OPAQUE, null, 0), false, "hidden transform reports none");
  assert.equal(hidden.GetBatchCount(), 0, "hidden transform emits nothing");
});

test("HasTransparentBatches reads the transparent area vector", () =>
{
  const transform = new EveTransform();
  transform.mesh = new Tr2Mesh();
  assert.equal(transform.HasTransparentBatches(), false);

  transform.mesh.AddArea(TRANSPARENT, areaWithEffect());
  assert.equal(transform.HasTransparentBatches(), true);

  transform.display = false;
  assert.equal(transform.HasTransparentBatches(), false);
});

test("GetSortValue measures view-position distance scaled by the multiplier", () =>
{
  const transform = new EveTransform();
  transform.worldTransform[12] = 3;
  transform.worldTransform[13] = 4;
  transform.sortValueMultiplier = 2;

  const context = {
    GetViewPosition()
    {
      return [ 3, 0, 0 ];
    }
  };
  assert.equal(transform.GetSortValue(context), 8, "distance 4 x multiplier 2");
  assert.throws(() => transform.GetSortValue(), /GetViewPosition/u,
    "the owned camera contract fails visibly when no render context is supplied");
});

test("GetPerObjectData applies the Carbon singular-world patch fixup", () =>
{
  const transform = new EveTransform();
  transform.worldTransform[0] = 0; // zero X basis -> singular world

  const data = transform.GetPerObjectData(makeAccumulator());
  const inv = new Float32Array(16);
  data.Copy("worldInverse", inv); // stored transposed; diagonal is transpose-invariant
  assert.ok(Math.abs(inv[0] - 10) < 1e-5, "patched 0.1 diagonal inverts to 10");
  assert.equal(inv[5], 1, "unaffected rows invert normally");
});

test("GetPerObjectData Allocs a RawData record from the accumulator store", () =>
{
  const transform = new EveTransform();
  const data = transform.GetPerObjectData(makeAccumulator());
  assert.ok(data instanceof RawData, "record Alloc'd through the accumulator store");
  // world is stored TRANSPOSED by the store (Set encodes) - translation moves
  // from logical [12..14] to [3],[7],[11].
  transform.worldTransform[12] = 9;
  const world = transform.GetPerObjectData(makeAccumulator());
  const out = new Float32Array(16);
  world.Copy("world", out);
  assert.equal(out[3], 9, "logical translation transposed to [3]");
});

test("EveSpaceScene.GetRenderables aggregates objects and the camera attachment parent", () =>
{
  const scene = new EveSpaceScene();
  const stub = (name) => ({
    name,
    GetRenderables(out)
    {
      out.push(this);
      return out;
    }
  });
  const a = stub("a");
  const b = stub("b");
  const camera = stub("camera");
  scene.objects.push(a, b);
  scene.cameraAttachmentParent = camera;

  assert.deepEqual(scene.GetRenderables().map(entry => entry.name), [ "a", "b", "camera" ]);
});

test("manager transparent pass draws renderables back-to-front in insertion order", () =>
{
  const nearFx = { id: "near" };
  const farFx = { id: "far" };

  const makeTransparent = (effect, z) =>
  {
    const transform = new EveTransform();
    transform.sortValueMultiplier = 1;
    transform.worldTransform[14] = z;
    transform.mesh = new Tr2Mesh();
    transform.mesh.AddArea(TRANSPARENT, areaWithEffect(effect));
    return transform;
  };

  const near = makeTransparent(nearFx, 5);
  const far = makeTransparent(farFx, 10);

  const manager = new CjsBatchManager();
  manager.Initialize();

  const store = makePerObjectStore();
  const context = {
    GetViewPosition()
    {
      return [ 0, 0, 0 ];
    },
    GetTriPoolAllocator()
    {
      return store;
    }
  };

  const batchMap = manager.Collect([ near, far ], 0, context);
  const transparent = batchMap.GetAccumulator(TRANSPARENT);
  assert.equal(transparent.IsChainedByEffect(), false, "order-preserving accumulator");
  assert.deepEqual(
    transparent.GetBatches().map(batch => batch.material.id),
    [ "far", "near" ],
    "farther renderable committed (and therefore drawn) first"
  );
  assert.equal(batchMap.GetAccumulator(OPAQUE).GetBatchCount(), 0, "nothing leaked into opaque");
});

test("EveSpaceObject2.GetBatches recurses activated attachments and delegates the hull mesh", () =>
{
  const object = new EveSpaceObject2();
  object.mesh = meshWithOpaqueArea({ id: "hull" });

  const seen = [];
  object.attachments.push({
    GetBatches(batches, batchType, perObjectData, reason)
    {
      seen.push({ batchType, perObjectData, reason });
    }
  });

  const accumulator = new TriRenderBatchAccumulator();
  object.GetBatches(accumulator, OPAQUE, null, 3);
  assert.equal(seen.length, 1, "activated attachment recursed (activationStrength default 1)");
  assert.equal(seen[0].reason, 3);
  assert.equal(accumulator.GetBatchCount(), 1, "hull mesh delegated");

  object.activationStrength = 0;
  object.GetBatches(new TriRenderBatchAccumulator(), OPAQUE, null, 3);
  assert.equal(seen.length, 1, "deactivated object skips attachments");
});

test("EveSpaceObject2 transparent areas are sorted back-to-front by world-space bbox distance", () =>
{
  const nearFx = { id: "near" };
  const farFx = { id: "far" };
  const object = new EveSpaceObject2();
  object.mesh = new Tr2Mesh();
  object.mesh.AddArea(TRANSPARENT, areaWithEffect(nearFx, { index: 0 }));
  object.mesh.AddArea(TRANSPARENT, areaWithEffect(farFx, { index: 1 }));
  object.mesh.SetGeometryRes({
    GetPath()
    {
      return "res:/geometry.gr2";
    },
    GetAreaBoundingBox(meshIndex, areaIndex, outMin, outMax)
    {
      const z = areaIndex === 0 ? 2 : 30;
      outMin[0] = 0; outMin[1] = 0; outMin[2] = z - 1;
      outMax[0] = 0; outMax[1] = 0; outMax[2] = z + 1;
      return true;
    }
  });

  const context = {
    GetViewPosition()
    {
      return [ 0, 0, 0 ];
    }
  };

  const accumulator = new TriRenderBatchAccumulator();
  object.GetBatches(accumulator, TRANSPARENT, null, 0, context);
  assert.deepEqual(
    accumulator.GetBatches().map(batch => batch.material.id),
    [ "far", "near" ],
    "descending squared distance commits back-to-front"
  );
});

test("EveSpaceObject2.GetPerObjectData/GetSortValue honor the Carbon contracts", () =>
{
  const object = new EveSpaceObject2();
  const accumulator = new TriRenderBatchAccumulator();
  // Carbon EveSpaceObject2::GetPerObjectData returns a pooled handle over the
  // object's two PERSISTENT buffers, so the JS record is the { vs, ps } pair
  // the owner keeps across frames - not a lease and not a deferred marker.
  const data = object.GetPerObjectData(accumulator);
  assert.equal(data.vs.GetStruct(), "EveSpaceObjectVSData", "the VS half is the persistent record");
  assert.equal(data.ps.GetStruct(), "EveSpaceObjectPSData", "the PS half is the persistent record");
  assert.equal(object.GetPerObjectData(accumulator).vs, data.vs, "the record persists across calls");

  object.worldTransform[12] = 3;
  object.worldTransform[13] = 4;
  const context = {
    GetViewPosition()
    {
      return [ 0, 0, 0 ];
    }
  };
  assert.equal(object.GetSortValue(context), 5, "plain distance, no multiplier");
});

test("EveMissileWarhead.GetPerObjectData Allocs a RawData record from the store", () =>
{
  const warhead = new EveMissileWarhead();
  const data = warhead.GetPerObjectData(makeAccumulator());
  assert.ok(data instanceof RawData);
});

test("end-to-end: real EveTransform through CjsBatchManager produces finalized batches", () =>
{
  const effect = { id: "fx" };
  const transform = new EveTransform();
  transform.mesh = meshWithOpaqueArea(effect);

  const manager = new CjsBatchManager();
  manager.Initialize();

  const batchMap = manager.Collect([ transform ], undefined, makeRenderContextWithStore());
  const batches = batchMap.GetAccumulator(OPAQUE).GetBatches();
  assert.equal(batches.length, 1);
  assert.equal(batches[0].material, effect);
  assert.ok(batches[0].objectData instanceof RawData,
    "per-object data Alloc'd once through the pool accumulator store and attached to the batch");
  assert.equal(batches[0].groupCount, 1, "finalize ran");
});

test("end-to-end: a real Tr2RenderContext supplies the pool with no engine setup", () =>
{
  const transform = new EveTransform();
  transform.mesh = meshWithOpaqueArea({ id: "fx" });

  const renderContext = new Tr2RenderContext();
  const store = renderContext.GetTriPoolAllocator();
  assert.ok(store.Has("EveBasicPerObjectData"),
    "the catalogued Carbon structs are registered without an engine registering them");

  const manager = new CjsBatchManager();
  manager.Initialize();

  const batch = manager.Collect([ transform ], undefined, renderContext)
    .GetAccumulator(OPAQUE).GetBatches()[0];
  assert.ok(batch.objectData instanceof RawData, "leased from the context's own pool");

  const world = batch.objectData.GetTransposed("world");
  renderContext.EndRenderContext();
  const reused = store.Alloc("EveBasicPerObjectData");
  assert.equal(reused.GetData().byteOffset, batch.objectData.GetData().byteOffset,
    "EndRenderContext rewinds the arena, so the next frame re-leases the same slot");
  assert.equal(world.length, 16);
});
