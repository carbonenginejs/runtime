import assert from "node:assert/strict";
import { test } from "node:test";

import { TriGeometryRes } from "../../../npm/dist/resource/geometry/index.js";
import { Tr2RenderBatch } from "../../../npm/dist/trinity/core/index.js";

test("a CMF first-triangle becomes an index, a Carbon first-index does not", () =>
{
  // TriGeometryRes.cpp:905 - `area.m_firstIndex = cmfLodMeshArea.firstElement * 3`.
  assert.equal(TriGeometryRes.getAreaFirstIndex({ firstElement: 7 }), 21);
  assert.equal(TriGeometryRes.getAreaFirstIndex({ firstIndex: 7 }), 7);
});

test("a producer's own name wins when both are present", () =>
{
  assert.equal(TriGeometryRes.getAreaFirstIndex({ firstIndex: 9, firstElement: 100 }), 9);
});

test("a zero first-triangle is converted, not read as absent", () =>
{
  assert.equal(TriGeometryRes.getAreaFirstIndex({ firstElement: 0 }), 0);
  assert.equal(TriGeometryRes.getAreaFirstIndex(null), 0);
});

test("the count converts under neither name, because both count triangles", () =>
{
  assert.equal(TriGeometryRes.getAreaPrimitiveCount({ elementCount: 12 }), 12);
  assert.equal(TriGeometryRes.getAreaPrimitiveCount({ primitiveCount: 12 }), 12);
  assert.equal(TriGeometryRes.getAreaPrimitiveCount(null), 0);
});

test("a CMF-shaped LOD sums its areas, where before it summed zero", () =>
{
  // This is the whole no-draw: `primitiveCount` was undefined on every CMF
  // area, resolveDrawArguments saw zero and returned null, and a correctly
  // loaded ship emitted no draw at all.
  const lod = { areas: [ { firstElement: 0, elementCount: 4 }, { firstElement: 4, elementCount: 6 } ] };

  assert.equal(TriGeometryRes.getPrimitiveCount(lod, 0, 2), 10);
});

test("a LOD's total comes from the index stream, as Carbon takes it", () =>
{
  // TriGeometryRes.cpp:890 - GetStreamElementCount( cmfLod.ib ) / 3.
  assert.equal(TriGeometryRes.getLodPrimitiveCount({ ib: { size: 60, stride: 2 } }), 10);
  // A Carbon-shaped LOD already carries it.
  assert.equal(TriGeometryRes.getLodPrimitiveCount({ primitiveCount: 4, ib: { size: 60, stride: 2 } }), 4);
  // Neither: fall back to the areas rather than to zero.
  assert.equal(TriGeometryRes.getLodPrimitiveCount({ areas: [ { elementCount: 3 } ] }), 3);
});

test("draw arguments resolve from a CMF-shaped LOD", () =>
{
  const lod = {
    ib: { size: 60, stride: 2 },
    areas: [ { firstElement: 0, elementCount: 4 }, { firstElement: 4, elementCount: 6 } ]
  };

  const draw = Tr2RenderBatch.resolveDrawArguments(lod, 1, 1);

  assert.equal(draw.indexCountPerInstance, 18);
  // Area 1 starts at triangle 4, so index 12.
  assert.equal(draw.startIndexLocation, 12);
});

test("a reversed draw counts back from the LOD total", () =>
{
  const lod = {
    ib: { size: 60, stride: 2 },
    areas: [ { firstElement: 0, elementCount: 4 }, { firstElement: 4, elementCount: 6 } ]
  };

  const draw = Tr2RenderBatch.resolveDrawArguments(lod, 0, 1, true);

  // total 10 tris - first 0 - count 4, in indices: 30 - 0 - 12.
  assert.equal(draw.startIndexLocation, 18);
});
