import assert from "node:assert/strict";
import { test } from "node:test";

import {
  Tr2MeshBase,
  Tr2MeshArea,
  TriRenderBatchAccumulator,
  Tr2PerObjectData
} from "../../npm/dist/trinity/core/index.js";

import { TriBatchType } from "../../npm/dist/global/consts/graphics/index.js";

function area(effect, { index = 0, count = 1, reversed = false, display = true } = {})
{
  const meshArea = new Tr2MeshArea();
  meshArea.SetMaterial(effect);
  meshArea.SetIndex(index);
  meshArea.SetCount(count);
  meshArea.SetReversed(reversed);
  meshArea.SetDisplay(display);
  return meshArea;
}

test("GetBatches emits one descriptor batch per displayed, materialled area", () =>
{
  const mesh = new Tr2MeshBase();
  mesh.meshIndex = 3;
  const effect = { id: "fx" };

  mesh.AddArea(TriBatchType.TRIBATCHTYPE_OPAQUE, area(effect, { index: 2, count: 4 }));
  mesh.AddArea(TriBatchType.TRIBATCHTYPE_OPAQUE, area(effect, { index: 6, count: 2 }));
  mesh.AddArea(TriBatchType.TRIBATCHTYPE_OPAQUE, area(effect, { display: false }));
  mesh.AddArea(TriBatchType.TRIBATCHTYPE_OPAQUE, area(null));

  const accumulator = new TriRenderBatchAccumulator();
  const perObjectData = new Tr2PerObjectData();
  perObjectData.SetUserData(7);

  mesh.GetBatches(accumulator, TriBatchType.TRIBATCHTYPE_OPAQUE, perObjectData);

  const batches = accumulator.GetBatches();
  assert.equal(batches.length, 2, "hidden and material-less areas are skipped");

  const [ first ] = batches;
  assert.equal(first.material, effect);
  assert.equal(first.shader, effect, "the effect stands in as the shader key");
  assert.equal(first.objectData, perObjectData);
  assert.equal(first.pickingData, (3 << 8) | 2);
  assert.deepEqual(
    {
      meshIndex: first.geometrySource.meshIndex,
      areaIndex: first.geometrySource.areaIndex,
      count: first.geometrySource.count
    },
    { meshIndex: 3, areaIndex: 2, count: 4 }
  );
});

test("GetBatches routes by TriBatchType through GetAreas", () =>
{
  const mesh = new Tr2MeshBase();
  const effect = {};
  mesh.AddArea(TriBatchType.TRIBATCHTYPE_TRANSPARENT, area(effect));

  const opaque = new TriRenderBatchAccumulator();
  mesh.GetBatches(opaque, TriBatchType.TRIBATCHTYPE_OPAQUE, null);
  assert.equal(opaque.GetBatchCount(), 0, "no opaque areas");

  const transparent = new TriRenderBatchAccumulator();
  mesh.GetBatches(transparent, TriBatchType.TRIBATCHTYPE_TRANSPARENT, null);
  assert.equal(transparent.GetBatchCount(), 1);
});

test("GetBatches accepts an already-resolved area list", () =>
{
  const mesh = new Tr2MeshBase();
  const effect = {};
  const accumulator = new TriRenderBatchAccumulator();
  mesh.GetBatches(accumulator, [ area(effect), area(effect) ], null);
  assert.equal(accumulator.GetBatchCount(), 2);
});

test("a hidden mesh emits nothing", () =>
{
  const mesh = new Tr2MeshBase();
  mesh.display = false;
  mesh.AddArea(TriBatchType.TRIBATCHTYPE_OPAQUE, area({}));

  const accumulator = new TriRenderBatchAccumulator();
  mesh.GetBatches(accumulator, TriBatchType.TRIBATCHTYPE_OPAQUE, null);
  assert.equal(accumulator.GetBatchCount(), 0);
});

// A geometry resource realized into ONE pooled buffer, the shape Carbon
// assumes: the index allocation starts 900 indices in, the vertex allocation
// 64 vertices in (2048 bytes / 32-byte stride).
function pooledGeometry({ reversedIndicesValid = true } = {})
{
  const lod = {
    primitiveCount: 30,
    reversedIndicesValid,
    areas: [
      { firstIndex: 0,  primitiveCount: 10 },
      { firstIndex: 30, primitiveCount: 12 },
      { firstIndex: 66, primitiveCount: 8 }
    ],
    indexAllocation: { GetStartIndex: () => 900 },
    reversedIndexAllocation: { GetStartIndex: () => 5000 },
    vertexAllocation: { offset: 2048, stride: 32 }
  };

  return { lod, GetMeshLod: () => lod };
}

test("CreateGeometryBatch fills Carbon's draw arguments from a realized LOD", () =>
{
  const mesh = new Tr2MeshBase();
  const geometry = pooledGeometry();
  const effect = { id: "fx" };

  // Areas 1..2: 12 + 8 = 20 primitives, starting at area 1's firstIndex.
  const batch = mesh.CreateGeometryBatch(
    geometry, area(effect, { index: 1, count: 2 }), null, false, geometry.lod);

  assert.equal(batch.indexCountPerInstance, 60, "20 primitives x 3");
  assert.equal(batch.instanceCount, 1);
  assert.equal(batch.startIndexLocation, 930, "allocation start 900 + firstIndex 30");
  assert.equal(batch.baseVertexLocation, 64, "vertex offset 2048 / stride 32");
  assert.equal(batch.startInstanceLocation, 0);
});

test("reversed draws read the reversed allocation and count back from the end", () =>
{
  const mesh = new Tr2MeshBase();
  const geometry = pooledGeometry();

  // Carbon: startIndex = reversedStart + lodPrimitiveCount*3 - firstIndex - primCount*3
  //                    = 5000 + 90 - 30 - 36 = 5024
  const batch = mesh.CreateGeometryBatch(
    geometry, area({ id: "fx" }, { index: 1, count: 1, reversed: true }), null, false, geometry.lod);

  assert.equal(batch.startIndexLocation, 5024);
  assert.equal(batch.indexCountPerInstance, 36);
  assert.equal(batch.geometrySource.reversed, true);
});

test("reverseWinding XORs the area's authored winding, it does not replace it", () =>
{
  const mesh = new Tr2MeshBase();
  const geometry = pooledGeometry();
  const forward = area({ id: "fx" }, { index: 0, count: 1 });
  const authoredReverse = area({ id: "fx" }, { index: 0, count: 1, reversed: true });

  assert.equal(
    mesh.CreateGeometryBatch(geometry, forward, null, true, geometry.lod).geometrySource.reversed,
    true, "forward area + reverseWinding = reversed");
  assert.equal(
    mesh.CreateGeometryBatch(geometry, authoredReverse, null, true, geometry.lod).geometrySource.reversed,
    false, "authored-reverse area + reverseWinding = forward again");
});

test("a reversed draw with no reversed indices leaves draw arguments unfilled", () =>
{
  const mesh = new Tr2MeshBase();
  const geometry = pooledGeometry({ reversedIndicesValid: false });

  const batch = mesh.CreateGeometryBatch(
    geometry, area({ id: "fx" }, { index: 0, count: 1, reversed: true }), null, false, geometry.lod);

  assert.equal(batch.indexCountPerInstance, 0, "Carbon emits no batch; the GPU-free port emits no draw");
  assert.ok(batch.geometrySource, "the descriptor is still recorded");
});

test("an unrealized mesh keeps zero bases, which is correct for a non-pooling engine", () =>
{
  const mesh = new Tr2MeshBase();
  const lod = {
    primitiveCount: 10,
    areas: [ { firstIndex: 0, primitiveCount: 10 } ],
    indexAllocation: null,
    vertexAllocation: null
  };

  const batch = mesh.CreateGeometryBatch({ GetMeshLod: () => lod }, area({ id: "fx" }), null, false, lod);

  assert.equal(batch.indexCountPerInstance, 30, "geometry data alone completes the count");
  assert.equal(batch.startIndexLocation, 0);
  assert.equal(batch.baseVertexLocation, 0);
});

test("GetBatches resolves the LOD once from the caller's screen size", () =>
{
  const mesh = new Tr2MeshBase();
  mesh.meshIndex = 2;
  const effect = { id: "fx" };
  mesh.AddArea(TriBatchType.TRIBATCHTYPE_OPAQUE, area(effect, { index: 0, count: 1 }));
  mesh.AddArea(TriBatchType.TRIBATCHTYPE_OPAQUE, area(effect, { index: 1, count: 1 }));

  const requested = [];
  const geometry = pooledGeometry();
  mesh.GetGeometryResource = () => ({
    GetMeshLod(meshIndex, screenSize)
    {
      requested.push([ meshIndex, screenSize ]);
      return geometry.lod;
    }
  });

  const accumulator = new TriRenderBatchAccumulator();
  mesh.GetBatches(accumulator, TriBatchType.TRIBATCHTYPE_OPAQUE, null, 128);

  assert.deepEqual(requested, [ [ 2, 128 ] ], "one lookup for the whole area list");
  assert.deepEqual(
    accumulator.GetBatches().map(batch => batch.indexCountPerInstance),
    [ 30, 36 ], "each area gets its own primitive count");
});

test("a mesh batch carries its vertex-declaration handle, so binning can tell meshes apart", () =>
{
  const mesh = new Tr2MeshBase();
  const effect = { id: "fx" };
  const lod = { primitiveCount: 4, areas: [ { firstIndex: 0, primitiveCount: 4 } ] };

  const declA = [ { usage: 0, usageIndex: 0, type: "FLOAT3", offset: 0, stream: 0 } ];
  const declB = [ { usage: 0, usageIndex: 0, type: "FLOAT3", offset: 4, stream: 0 } ];

  const geometryFor = decl => ({ GetMeshLod: () => lod, GetMeshVertexElements: () => decl });

  const first = mesh.CreateGeometryBatch(geometryFor(declA), area(effect), null, false, lod);
  const same = mesh.CreateGeometryBatch(geometryFor(declA), area(effect), null, false, lod);
  const other = mesh.CreateGeometryBatch(geometryFor(declB), area(effect), null, false, lod);

  assert.equal(first.vertexDeclaration, same.vertexDeclaration, "one declaration, one handle");
  assert.notEqual(first.vertexDeclaration, other.vertexDeclaration,
    "the same semantics packed differently is a different input layout");
});
