import assert from "node:assert/strict";
import test from "node:test";

import { Tr2RenderBatch, Tr2RenderContext } from "../../npm/dist/trinity/core/index.js";
import { CreateLodWireframeIndices, SharedGeometryBuffer } from "../../npm/dist/trinity/core/mesh/TriGeometryResAllocations.js";
import { TriGeometryRes } from "../../npm/dist/resource/geometry/index.js";
import { Topology } from "../../npm/dist/global/consts/renderContext/index.js";
import { ALResult } from "../../npm/dist/trinityal/index.js";

// Carbon draws wireframe through the RS_FILLMODE override
// (Tr2EffectStateManager.cpp:801-812). No browser backend has a fill mode, so
// the ruling is route (a): a line list over a lazy per-LOD edge buffer, the
// area (start, count) drawn at (start * 2, count * 2).

const DECL = [ { usage: "Position", usageIndex: 0, type: "Float32", elementCount: 3, offset: 0 } ];

/** Four vertices, two triangles, two areas of one triangle each. */
function payload()
{
  return {
    meshes: [ {
      decl: DECL,
      vertex: { position: [ 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0 ] },
      indices: [ { faces: [ 0, 1, 2, 0, 2, 3 ] } ],
      areas: [ { firstElement: 0, elementCount: 1 }, { firstElement: 1, elementCount: 1 } ]
    } ]
  };
}

function context()
{
  const renderContext = new Tr2RenderContext();
  renderContext.GetRenderContextAL().CreateDevice();
  return renderContext;
}

function record(renderContext)
{
  const calls = { topology: [], draws: [], indexBuffers: [] };
  const setTopology = renderContext.SetTopology.bind(renderContext);
  renderContext.SetTopology = topology => { calls.topology.push(topology); return setTopology(topology); };
  renderContext.DrawIndexedInstanced = (...args) => { calls.draws.push(args); return ALResult.S_OK; };
  const esm = renderContext._esm;
  const apply = esm.ApplyIndexBuffer__Stride.bind(esm);
  esm.ApplyIndexBuffer__Stride = (buffer, stride) => { calls.indexBuffers.push([ buffer, stride ]); return apply(buffer, stride); };
  return calls;
}

test("the edge list holds each triangle's three lines and is built once", () =>
{
  const renderContext = context();
  const geometry = new TriGeometryRes();
  geometry.SetPayload(payload());
  const lod = geometry.GetMeshLod__LodIndex(0, 0);

  // A filler allocation so the edge start index is not zero by accident.
  SharedGeometryBuffer(renderContext).Allocate(2, 6, new Uint8Array(12), renderContext);

  assert.equal(CreateLodWireframeIndices(geometry, 0, lod, renderContext), true);
  const edges = lod.wireframeIndexAllocation;
  assert.equal(edges.GetStride(), 2);
  assert.equal(edges.GetSize(), 12 * 2, "six indices become twelve");
  assert.ok(edges.GetStartIndex() > 0);

  assert.equal(CreateLodWireframeIndices(geometry, 0, lod, renderContext), true);
  assert.equal(lod.wireframeIndexAllocation, edges, "lazy and once");

  geometry.ReleasePayload();
  assert.equal(lod.wireframeIndexAllocation, null, "freed with the LOD's other allocations");
  assert.equal(edges.IsValid(), false);
});

test("with the ESM wireframe flag on, a mesh batch draws TOP_LINES over the edge range; off, it draws as built", () =>
{
  const renderContext = context();
  const al = renderContext.GetRenderContextAL();
  const geometry = new TriGeometryRes();
  geometry.SetPayload(payload());
  const lod = geometry.GetMeshLod__LodIndex(0, 0);
  const calls = record(renderContext);

  const batch = new Tr2RenderBatch();
  batch.SetGeometrySource(geometry, 0, 1, 1, true, lod);

  al.BeginScene();
  renderContext.SetWireframeRendering(true);
  assert.equal(renderContext.SubmitGeometry(batch), true);

  const edges = lod.wireframeIndexAllocation;
  assert.equal(calls.topology.at(-1), Topology.TOP_LINES);
  assert.deepEqual(calls.indexBuffers.at(-1), [ edges.GetBuffer(), 2 ]);
  // Area 1 starts at triangle index 3: (3, 3) -> (6, 6), forward even for a reversed batch.
  assert.deepEqual(calls.draws.at(-1).slice(0, 3), [ 6, 1, edges.GetStartIndex() + 6 ]);
  assert.equal(batch.topology, Topology.TOP_TRIANGLES, "the batch is left as built");

  renderContext.SetWireframeRendering(false);
  assert.equal(renderContext.SubmitGeometry(batch), true);
  assert.equal(calls.topology.at(-1), Topology.TOP_TRIANGLES);
  assert.deepEqual(calls.draws.at(-1).slice(0, 3), [ 3, 1, batch.startIndexLocation ]);
});
