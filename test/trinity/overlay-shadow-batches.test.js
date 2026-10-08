import assert from "node:assert/strict";
import { test } from "node:test";

import {
  EveImpactOverlay,
  EveMeshOverlayEffect,
  EveSpaceObject2,
  Tr2Mesh,
  Tr2MeshArea,
  TriRenderBatchAccumulator
} from "../../npm/dist/trinity/index.js";
import { TriGeometryRes } from "../../npm/dist/resource/geometry/index.js";
import { CarbonVertexElements } from "../../npm/dist/trinity/core/index.js";
import { Tr2EffectStateManager } from "../../npm/dist/trinity/shader/index.js";

import { TriBatchType } from "../../npm/dist/global/consts/graphics/index.js";
import { resolveBindingPlan } from "../../npm/dist/trinityal/vertexLayoutMatch.js";
import { FixtureEffect } from "../support/fixtureEffect.js";

const OPAQUE = TriBatchType.TRIBATCHTYPE_OPAQUE;
const DECAL = TriBatchType.TRIBATCHTYPE_DECAL;
const TRANSPARENT = TriBatchType.TRIBATCHTYPE_TRANSPARENT;

function area(effect, { index = 0, count = 1, castsShadows = true } = {})
{
  const meshArea = new Tr2MeshArea();
  meshArea.SetMaterial(FixtureEffect(effect));
  meshArea.SetIndex(index);
  meshArea.SetCount(count);
  meshArea.SetCastsShadows(castsShadows);
  return meshArea;
}

function geometry(primitiveCount = 1)
{
  const resource = new TriGeometryRes().Initialize("res:/geometry/overlay.cmf");
  resource.SetPayload({
    version: 1,
    sourceFormat: "cmf",
    meshes: [ {
      minBounds: [ -1, -1, -1 ],
      maxBounds: [ 1, 1, 1 ],
      positions: [ -1, -1, 0, 1, -1, 0, 0, 1, 0 ],
      indices: [ 0, 1, 2 ],
      lods: [ { maxScreenSize: 1000, areas: [ { firstIndex: 0, primitiveCount } ] } ]
    } ]
  });
  resource.MarkPrepared();
  return resource;
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
  const fxA = FixtureEffect({ id: "A" });
  const fxB = FixtureEffect({ id: "B" });
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
  const fx = FixtureEffect({ id: "shared" });
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

test("shadow batches bind skinned mesh inputs from their own vertex declaration", () =>
{
  // Handle zero can belong to any earlier mesh; it is not a default layout.
  Tr2EffectStateManager.getVertexDeclarationHandle([
    { usage: 0, usageIndex: 7, type: "Float32", elementCount: 1, offset: 0 }
  ]);
  const elements = [
    { usage: "Position", usageIndex: 0, type: "Float32", elementCount: 3, offset: 0 },
    { usage: "TexCoord", usageIndex: 0, type: "Float32", elementCount: 2, offset: 12 },
    { usage: "PackedTangent", usageIndex: 0, type: "UInt16", elementCount: 4, offset: 20 },
    { usage: "BoneIndices", usageIndex: 0, type: "UInt16", elementCount: 4, offset: 44 }
  ];
  const object = new EveSpaceObject2();
  object.mesh = new Tr2Mesh();
  object.mesh.geometry = geometry();
  object.mesh.geometry.GetMeshVertexElements = () => elements;
  object.mesh.AddArea(OPAQUE, area({ id: "skinned-hull" }));
  object.mesh.AddArea(OPAQUE, area({ id: "skinned-booster" }, { index: 1 }));

  const accumulator = new TriRenderBatchAccumulator();
  assert.equal(object.GetShadowBatches(accumulator, null, 512), true);
  const expected = Tr2EffectStateManager.getVertexDeclarationHandle(CarbonVertexElements(elements));
  assert.notEqual(expected, 0, "an unrelated declaration was interned first");
  assert.equal(accumulator.GetBatchCount(), 2);
  for (const batch of accumulator.GetBatches())
  {
    assert.equal(batch.vertexDeclaration, expected);
    const plan = resolveBindingPlan(
      Tr2EffectStateManager.getVertexDeclarationElements(batch.vertexDeclaration),
      [ { usage: 6, usageIndex: 0, registerIndex: 1, type: "uint" } ]);
    assert.equal(plan.unmatched, 0, "the shadow shader must read the mesh's bone indices");
    assert.equal(plan.entries[0].element.offset, 44);
    assert.equal(plan.entries[0].fallbackType, null, "constant-zero bones distort the shadow caster");
  }
});

test("overlay effects route per batch type with the display gate; DECAL damage draws last-priority", () =>
{
  const hullFx = FixtureEffect({ id: "hull" });
  const overlayFx = FixtureEffect({ id: "overlay" });
  const damageFx = FixtureEffect({ id: "damage" });

  const object = new EveSpaceObject2();
  object.mesh = new Tr2Mesh();
  object.mesh.geometry = geometry();
  object.mesh.AddArea(OPAQUE, area(hullFx, { index: 0 }));

  const overlay = new EveMeshOverlayEffect();
  overlay.opaqueEffects.push(overlayFx);
  object.overlayEffects.push(overlay);
  object.impactOverlay = Object.assign(new EveImpactOverlay(), {
    GetArmorDamageShader(batchType)
    {
      return batchType === DECAL ? damageFx : null;
    }
  });

  const accumulator = new TriRenderBatchAccumulator();
  object.GetBatches(accumulator, OPAQUE, null, 0);

  const batches = accumulator.GetBatches();
  const ids = batches.map(batch => batch.material.id).sort();
  assert.deepEqual(ids, [ "hull", "overlay" ]);

  const damageAccumulator = new TriRenderBatchAccumulator();
  object.GetBatches(damageAccumulator, DECAL, null, 0);
  const damage = damageAccumulator.GetBatches().find(batch => batch.material === damageFx);
  assert.ok(damage);
  assert.equal(damage.priority, 0xFFFFFFFF, "impact overlay draws at maximum priority");

  // Hidden overlay contributes nothing (the Carbon display gate).
  overlay.display = false;
  const hidden = new TriRenderBatchAccumulator();
  object.GetBatches(hidden, OPAQUE, null, 0);
  assert.deepEqual(hidden.GetBatches().map(batch => batch.material.id).sort(), [ "hull" ]);
});

test("HasTransparentBatches includes the overlay transparent contribution", () =>
{
  const object = new EveSpaceObject2();
  object.mesh = new Tr2Mesh();
  assert.equal(object.HasTransparentBatches(), false);

  const overlay = new EveMeshOverlayEffect();
  overlay.transparentEffects.push(FixtureEffect({ id: "t" }));
  object.overlayEffects.push(overlay);
  assert.equal(object.HasTransparentBatches(), true, "overlay with transparent effects counts");
});

test("overlay blocks with no realized primitives do not commit a batch", () =>
{
  const object = new EveSpaceObject2();
  object.mesh = new Tr2Mesh();
  object.mesh.geometry = geometry(0);
  object.mesh.AddArea(OPAQUE, area({ id: "hull" }, { index: 1 }));
  const overlay = new EveMeshOverlayEffect();
  overlay.opaqueEffects.push(FixtureEffect({ id: "overlay" }));
  object.overlayEffects.push(overlay);

  const accumulator = new TriRenderBatchAccumulator();
  object.GetBatchesFromOverlayVector(accumulator, null, OPAQUE, object.mesh);
  assert.equal(accumulator.GetBatchCount(), 0);
});

test("RebuildCachedData refreshes the cached blocks after mesh edits", () =>
{
  const fx = FixtureEffect({ id: "fx" });
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

test("an overlay block batch carries the mesh's vertex declaration", () =>
{
  // Carbon binds lod->m_mesh->m_vertexDeclarationHandle onto a block batch just
  // as onto an area batch (EveSpaceObject2.cpp:1214). This path never set it, so
  // every overlay batch carried handle 0 - and the handle is what binning and
  // sorting compare, so blocks of different layouts shared a bin. Silent: a
  // wrong bin still draws.
  // Intern something else FIRST, so the declaration under test cannot land on
  // handle 0 and let an unset handle pass by coincidence.
  Tr2EffectStateManager.getVertexDeclarationHandle([ { usage: 0, usageIndex: 7, type: "Float32", elementCount: 1, offset: 0 } ]);

  const object = new EveSpaceObject2();
  object.mesh = new Tr2Mesh();
  object.mesh.geometry = geometry(1);
  object.mesh.geometry.GetMeshVertexElements = () => [
    { usage: "Position", usageIndex: 0, type: "Float32", elementCount: 3, offset: 99 }
  ];
  object.mesh.AddArea(OPAQUE, area({ id: "hull" }, { index: 0 }));

  const overlay = new EveMeshOverlayEffect();
  overlay.opaqueEffects.push(FixtureEffect({ id: "overlay" }));
  object.overlayEffects.push(overlay);

  const accumulator = new TriRenderBatchAccumulator();
  object.GetBatchesFromOverlayVector(accumulator, null, OPAQUE, object.mesh);

  const [ batch ] = accumulator.GetBatches();
  assert(batch, "the overlay commits a batch");

  // Not "not zero": zero is a LEGITIMATE handle, the first declaration ever
  // interned. The claim is that the batch carries the handle this declaration
  // actually interns to, so compare against it.
  const expected = Tr2EffectStateManager.getVertexDeclarationHandle(CarbonVertexElements([
    { usage: "Position", usageIndex: 0, type: "Float32", elementCount: 3, offset: 99 }
  ]));

  assert.notEqual(expected, 0, "the control declaration must not be handle 0");
  assert.equal(batch.vertexDeclaration, expected);
  assert.equal(batch.geometrySource.lod, object.mesh.geometry.GetMeshLod__ScreenSize(0, Infinity),
    "the resolved LOD rides on the source, so submit realizes that LOD");
});

test("an overlay walk with no resolvable LOD commits nothing", () =>
{
  // Carbon returns early on a missing LOD for the whole walk (cpp:1198-1202)
  // rather than testing per block.
  const object = new EveSpaceObject2();
  object.mesh = new Tr2Mesh();
  object.mesh.geometry = geometry(1);
  object.mesh.geometry.GetMeshLod__ScreenSize = () => null;
  object.mesh.AddArea(OPAQUE, area({ id: "hull" }, { index: 0 }));

  const overlay = new EveMeshOverlayEffect();
  overlay.opaqueEffects.push(FixtureEffect({ id: "overlay" }));
  object.overlayEffects.push(overlay);

  const accumulator = new TriRenderBatchAccumulator();

  assert.equal(object.GetBatchesFromOverlayVector(accumulator, null, OPAQUE, object.mesh), false);
  assert.equal(accumulator.GetBatches().length, 0);
});
