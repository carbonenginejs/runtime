import assert from "node:assert/strict";
import { test } from "node:test";

import {
  EveMeshOverlayEffect,
  EveSpaceObject2,
  Tr2Mesh,
  Tr2MeshArea,
  TriRenderBatchAccumulator
} from "../../npm/dist/trinity/index.js";

import { TriBatchType } from "../../npm/dist/global/consts/graphics/index.js";

const OPAQUE = TriBatchType.TRIBATCHTYPE_OPAQUE;
const DECAL = TriBatchType.TRIBATCHTYPE_DECAL;
const TRANSPARENT = TriBatchType.TRIBATCHTYPE_TRANSPARENT;

function area(effect, { index = 0, count = 1, castsShadows = true } = {})
{
  const meshArea = new Tr2MeshArea();
  meshArea.SetMaterial(effect);
  meshArea.SetIndex(index);
  meshArea.SetCount(count);
  meshArea.SetCastsShadows(castsShadows);
  return meshArea;
}

test("CollectAreaBlocks skips non-shadow-casting OPAQUE areas only", () =>
{
  const mesh = new Tr2Mesh();
  mesh.AddArea(OPAQUE, area({}, { index: 0 }));
  mesh.AddArea(OPAQUE, area({}, { index: 1, castsShadows: false }));
  mesh.AddArea(TRANSPARENT, area({}, { index: 5, castsShadows: false }));

  const opaqueBlocks = mesh.CollectAreaBlocks([], OPAQUE);
  assert.equal(opaqueBlocks.length, 1, "non-shadow-casting OPAQUE area skipped");
  assert.equal(opaqueBlocks[0].startIndex, 0);

  const transparentBlocks = mesh.CollectAreaBlocks([], TRANSPARENT);
  assert.equal(transparentBlocks.length, 1, "the OPAQUE skip rule does not apply to TRANSPARENT");
});

test("CollectAreaBlocksWithSharedMaterials groups by material and skips DECAL non-casters", () =>
{
  const fxA = { id: "A" };
  const fxB = { id: "B" };
  const mesh = new Tr2Mesh();
  mesh.AddArea(OPAQUE, area(fxA, { index: 0 }));
  mesh.AddArea(OPAQUE, area(fxB, { index: 1 }));
  mesh.AddArea(OPAQUE, area(fxA, { index: 2 }));

  const collectors = mesh.CollectAreaBlocksWithSharedMaterials([], OPAQUE);
  assert.equal(collectors.length, 2, "two shared-material groups");
  const groupA = collectors.find(entry => entry.shaderMaterial === fxA);
  assert.equal(groupA.areaBlockVector.length, 2, "both A-areas grouped");

  const decalMesh = new Tr2Mesh();
  decalMesh.AddArea(DECAL, area(fxA, { castsShadows: false }));
  assert.equal(decalMesh.CollectAreaBlocksWithSharedMaterials([], DECAL).length, 0,
    "DECAL non-caster skipped in the shared-material variant");
});

test("GetShadowBatches emits one batch per coalesced shared-material block", () =>
{
  const fx = { id: "shared" };
  const object = new EveSpaceObject2();
  object.mesh = new Tr2Mesh();
  object.mesh.AddArea(OPAQUE, area(fx, { index: 0 }));
  object.mesh.AddArea(OPAQUE, area(fx, { index: 1 }));

  const accumulator = new TriRenderBatchAccumulator();
  assert.equal(object.GetShadowBatches(accumulator, null, 512), true,
    "reports that batches were accumulated (JS boolean addition)");

  const batches = accumulator.GetBatches();
  assert.equal(batches.length, 1, "adjacent same-material areas coalesce into one block");
  assert.equal(batches[0].material, fx, "the area's own material is the shadow material");
  assert.deepEqual(
    { areaIndex: batches[0].geometrySource.areaIndex, count: batches[0].geometrySource.count },
    { areaIndex: 0, count: 2 }
  );
});

test("overlay effects route per batch type with the display gate; impact overlay draws last-priority", () =>
{
  const hullFx = { id: "hull" };
  const overlayFx = { id: "overlay" };
  const damageFx = { id: "damage" };

  const object = new EveSpaceObject2();
  object.mesh = new Tr2Mesh();
  object.mesh.AddArea(OPAQUE, area(hullFx, { index: 0 }));

  const overlay = new EveMeshOverlayEffect();
  overlay.opaqueEffects.push(overlayFx);
  object.overlayEffects.push(overlay);
  object.impactOverlay = {
    GetArmorDamageShader()
    {
      return damageFx;
    }
  };

  const accumulator = new TriRenderBatchAccumulator();
  object.GetBatches(accumulator, OPAQUE, null, 0);

  const batches = accumulator.GetBatches();
  const ids = batches.map(batch => batch.material.id).sort();
  assert.deepEqual(ids, [ "damage", "hull", "overlay" ]);
  const damage = batches.find(batch => batch.material === damageFx);
  assert.equal(damage.priority, 0xFFFFFFFF, "impact overlay draws at maximum priority");

  // Hidden overlay contributes nothing (the Carbon display gate).
  overlay.display = false;
  const hidden = new TriRenderBatchAccumulator();
  object.GetBatches(hidden, OPAQUE, null, 0);
  assert.deepEqual(hidden.GetBatches().map(batch => batch.material.id).sort(), [ "damage", "hull" ]);
});

test("HasTransparentBatches includes the overlay transparent contribution", () =>
{
  const object = new EveSpaceObject2();
  object.mesh = new Tr2Mesh();
  assert.equal(object.HasTransparentBatches(), false);

  const overlay = new EveMeshOverlayEffect();
  overlay.transparentEffects.push({ id: "t" });
  object.overlayEffects.push(overlay);
  assert.equal(object.HasTransparentBatches(), true, "overlay with transparent effects counts");
});

test("RebuildCachedData refreshes the cached blocks after mesh edits", () =>
{
  const fx = { id: "fx" };
  const object = new EveSpaceObject2();
  object.mesh = new Tr2Mesh();
  object.mesh.AddArea(OPAQUE, area(fx, { index: 0 }));

  const first = new TriRenderBatchAccumulator();
  object.GetShadowBatches(first, null, 512);
  assert.equal(first.GetBatchCount(), 1);

  // The lazy cache is stale until explicitly rebuilt (Carbon rebuilds on the
  // geometry-resource notify; the realizer owns re-triggering here).
  object.mesh.AddArea(OPAQUE, area(fx, { index: 4 }));
  object.RebuildCachedData();

  const second = new TriRenderBatchAccumulator();
  object.GetShadowBatches(second, null, 512);
  assert.equal(second.GetBatchCount(), 2, "non-adjacent areas stay separate blocks after rebuild");
});
