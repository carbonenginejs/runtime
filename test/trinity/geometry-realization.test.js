import assert from "node:assert/strict";
import test from "node:test";

import { Tr2RenderBatch, Tr2RenderContext } from "../../npm/dist/trinity/core/index.js";
import { Tr2SuballocatedBuffer } from "../../npm/dist/trinity/core/device/Tr2SuballocatedBuffer/Tr2SuballocatedBuffer.js";
import { CreateLodAllocations, RealizeBatchGeometry, SharedGeometryBuffer } from "../../npm/dist/trinity/core/mesh/TriGeometryResAllocations.js";
import { TriGeometryRes } from "../../npm/dist/resource/geometry/index.js";
import { Tr2BufferALStub } from "../../npm/dist/trinityal/index.js";
import { Tr2GpuUsage } from "../../npm/dist/global/consts/renderContext/index.js";

// Carbon puts a LOD's vertices and indices into one shared suballocated buffer
// at load (TriGeometryRes.cpp:2019-2140) and the batch carries the buffer plus
// a stride, the allocation's offset riding the draw arguments
// (Tr2MeshBase.cpp:372-392). Ours does it at the first submit through the
// submitting context. These pin the allocator and that hand-off.

const HULL_DECL = [
  { usage: "Position", usageIndex: 0, type: "Float32", elementCount: 3, offset: 0 },
  { usage: "TexCoord", usageIndex: 0, type: "Float32", elementCount: 2, offset: 12 }
];

/** Four vertices, two triangles, one area covering both. */
function meshPayload()
{
  return {
    meshes: [ {
      decl: HULL_DECL,
      vertex: {
        position: [ 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0 ],
        texcoord0: [ 0, 0, 1, 0, 1, 1, 0, 1 ]
      },
      indices: [ { faces: [ 0, 1, 2, 0, 2, 3 ] } ],
      areas: [ { firstElement: 0, elementCount: 2 } ]
    } ]
  };
}

function context()
{
  const renderContext = new Tr2RenderContext();

  renderContext.GetRenderContextAL().CreateDevice();

  return renderContext;
}

test("the suballocated buffer hands out element-aligned regions of one block, and adds a block when full", () =>
{
  const renderContext = context();
  const buffer = new Tr2SuballocatedBuffer("test", Tr2GpuUsage.VERTEX_BUFFER | Tr2GpuUsage.INDEX_BUFFER, 256, 1024);

  const first = buffer.Allocate(20, 4, new Uint8Array(80), renderContext);

  assert.ok(first.IsValid());
  assert.ok(first.GetBuffer() instanceof Tr2BufferALStub, "the context's kind of buffer");
  assert.deepEqual([ first.GetOffset(), first.GetSize(), first.GetStride(), first.GetStartIndex() ], [ 0, 80, 20, 0 ]);

  // Stride 2 after 80 bytes: offset 80, start index 40. Carbon asserts
  // offset % stride == 0, so GetStartIndex is exact.
  const second = buffer.Allocate(2, 6, new Uint8Array(12), renderContext);

  assert.equal(second.GetBuffer(), first.GetBuffer(), "same block");
  assert.deepEqual([ second.GetOffset(), second.GetStartIndex() ], [ 80, 40 ]);

  // Stride 12 must land on a multiple of 12 AND of 4: 96.
  const third = buffer.Allocate(12, 2, new Uint8Array(24), renderContext);

  assert.deepEqual([ third.GetOffset(), third.GetStartIndex() ], [ 96, 8 ]);

  // 200 bytes do not fit the 256-byte block's remaining 136: a second block,
  // offset zero again - Carbon would Expand and copy; we add a block.
  const fourth = buffer.Allocate(4, 50, new Uint8Array(200), renderContext);

  assert.notEqual(fourth.GetBuffer(), first.GetBuffer());
  assert.equal(fourth.GetOffset(), 0);
  assert.equal(buffer.GetBlocks().length, 2);

  assert.equal(buffer.Allocate(4, 100, new Uint8Array(400), renderContext), null, "more than a block is refused");
  assert.equal(buffer.Allocate(0, 1, null, renderContext), null);

  buffer.ReleaseResources();
  assert.equal(first.IsValid(), false);
  assert.equal(buffer.GetBlocks().length, 0);
});

test("a LOD's allocations are made once, with a reversed index copy, and the batch gets buffers and offsets", () =>
{
  const renderContext = context();
  const geometry = new TriGeometryRes();

  geometry.SetPayload(meshPayload());

  const lod = geometry.GetMeshLodByIndex(0, 0);

  assert.ok(lod, "a single-LOD mesh is its own LOD");
  assert.equal(lod.allocationsValid, undefined);

  // The shared buffer is per backend; a first allocation sits at offset zero,
  // so the start indices are zero - which is why the batch's arguments would
  // have been right by accident. A second mesh exposes the offsets.
  const filler = SharedGeometryBuffer(renderContext).Allocate(20, 10, new Uint8Array(200), renderContext);

  assert.equal(filler.GetOffset(), 0);

  assert.equal(CreateLodAllocations(geometry, 0, lod, renderContext), true);
  assert.equal(lod.allocationsValid, true);
  assert.equal(lod.vertexAllocation.GetStride(), 20, "position + texcoord, already a multiple of four");
  assert.equal(lod.vertexAllocation.GetOffset(), 200);
  assert.equal(lod.vertexAllocation.GetStartIndex(), 10);
  assert.equal(lod.indexAllocation.GetStride(), 2);
  assert.equal(lod.indexAllocation.GetSize(), 12);
  assert.equal(lod.reversedIndicesValid, true);
  assert.equal(lod.reversedIndexAllocation.GetStartIndex(), lod.indexAllocation.GetStartIndex() + 6);

  const before = lod.vertexAllocation;

  assert.equal(CreateLodAllocations(geometry, 0, lod, renderContext), true);
  assert.equal(lod.vertexAllocation, before, "made once");

  // The batch: descriptor in, buffers and draw arguments out.
  const batch = new Tr2RenderBatch();

  batch.SetGeometrySource(geometry, 0, 0, 1, false, lod);
  assert.equal(RealizeBatchGeometry(batch, renderContext), true);
  assert.equal(batch.vertexStreams[0], lod.vertexAllocation.GetBuffer());
  assert.equal(batch.stride[0], 20);
  assert.equal(batch.indexBuffer, lod.indexAllocation.GetBuffer());
  assert.equal(batch.indexStride, 2);
  assert.equal(batch.indexCountPerInstance, 6);
  assert.equal(batch.baseVertexLocation, 10, "the vertex allocation's start index");
  assert.equal(batch.startIndexLocation, lod.indexAllocation.GetStartIndex());

  // Reversed winding reads the reversed copy, Carbon's arithmetic
  // (Tr2MeshBase.cpp:376-385).
  const reversed = new Tr2RenderBatch();

  reversed.SetGeometrySource(geometry, 0, 0, 1, true, lod);
  RealizeBatchGeometry(reversed, renderContext);
  assert.equal(reversed.startIndexLocation, lod.reversedIndexAllocation.GetStartIndex() + 6 - 0 - 6);
});

test("SubmitGeometry realizes a descriptor batch through the submitting context and draws it", () =>
{
  const renderContext = context();
  const al = renderContext.GetRenderContextAL();
  const geometry = new TriGeometryRes();

  geometry.SetPayload(meshPayload());

  const batch = new Tr2RenderBatch();

  batch.SetGeometrySource(geometry, 0, 0, 1, false, geometry.GetMeshLodByIndex(0, 0));
  batch.topology = 4;

  al.BeginScene();
  assert.equal(renderContext.SubmitGeometry(batch), true);
  assert.ok(batch.vertexStreams[0] instanceof Tr2BufferALStub, "the descriptor became the shared buffer at submit");
  assert.equal(batch.indexCountPerInstance, 6);

  // A second submit finds the buffers already there.
  assert.equal(renderContext.SubmitGeometry(batch), true);
});
