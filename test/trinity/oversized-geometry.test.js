import assert from "node:assert/strict";
import test from "node:test";
import { Tr2SuballocatedBuffer, SHARED_BUFFER_BLOCK_SIZE } from "../../npm/dist/trinity/core/device/Tr2SuballocatedBuffer/Tr2SuballocatedBuffer.js";
import { CreateLodAllocations, SharedGeometryBuffer } from "../../npm/dist/trinity/core/mesh/TriGeometryResAllocations.js";
import { TriGeometryRes } from "../../npm/dist/resource/geometry/index.js";
import { Tr2GpuUsage } from "../../npm/dist/global/consts/renderContext/index.js";
import { StubContext } from "../support/stubContext.js";

test("oversized reservations include stride padding, reuse freed storage and account for all physical bytes", () =>
{
  const context = new StubContext(), pool = new Tr2SuballocatedBuffer("oversized", Tr2GpuUsage.VERTEX_BUFFER, 64, 256);
  try
  {
    const first = pool.Allocate(12, 10, new Uint8Array(120), context);
    assert.ok(first);
    assert.equal(first.GetBuffer().GetSize(), 192, "120 bytes plus native padding rounds to three blocks");
    assert.equal(first.GetOffset() % 12, 0);
    const second = pool.Allocate(4, 16, null, context);
    assert.ok(second);
    assert.equal(second.GetBuffer().GetSize(), 64);
    assert.equal(pool.Allocate(4, 16, null, context), null, "physical sizes, not number of blocks, enforce the cap");
    const old = first.GetBuffer();
    pool.Free(first);
    const reused = pool.Allocate(12, 10, null, context);
    assert.equal(reused.GetBuffer(), old);
    assert.equal(pool.GetBlocks().length, 2);
  }
  finally { pool.ReleaseResources(); context.Destroy(); }
});

test("Chjita-sized mesh realizes once and reuses its allocation across render passes", () =>
{
  const context = new StubContext(), geometry = new TriGeometryRes();
  const count = 639825, stride = 60;
  const uploads = [], create = context.CreateBuffer.bind(context);
  context.CreateBuffer = (...args) =>
  {
    const buffer = create(...args);
    if (!buffer) return buffer;
    const update = buffer.UpdateBuffer.bind(buffer);
    buffer.UpdateBuffer = (offset, size, data, ...rest) =>
    {
      if (size === 38389500)
      {
        const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
        uploads.push({offset,size,first:view.getFloat32(48,true),last:view.getFloat32(size-4,true)});
      }
      return update(offset,size,data,...rest);
    };
    return buffer;
  };
  const position = new Array(count * 3).fill(0);
  position[0] = 7;
  position[position.length - 1] = 19;
  geometry.SetPayload({ meshes: [{
    decl: [{usage:"Position",usageIndex:0,type:"Float32",elementCount:3,offset:48}],
    vertex: {position}, indices:[{faces:[0,1,2]}], areas:[{firstElement:0,elementCount:1}]
  }] });
  const lod = geometry.GetMeshLodByIndex(0,0);
  try
  {
    assert.equal(CreateLodAllocations(geometry,0,lod,context), true);
    const allocation = lod.vertexAllocation;
    assert.equal(allocation.GetStride(), stride);
    assert.equal(allocation.GetSize(), 38389500);
    assert.equal(allocation.GetBuffer().GetSize(), SHARED_BUFFER_BLOCK_SIZE * 2);
    const before = SharedGeometryBuffer(context).m_allocations.length;
    const getPayload = geometry.GetPayload;
    geometry.GetPayload = () => { throw new Error("already-realized LOD must not repack"); };
    for (let pass = 0; pass < 12; pass++) assert.equal(CreateLodAllocations(geometry,0,lod,context), true);
    geometry.GetPayload = getPayload;
    assert.equal(lod.vertexAllocation, allocation);
    assert.equal(SharedGeometryBuffer(context).m_allocations.length, before);
    assert.deepEqual(uploads, [{offset:allocation.GetOffset(),size:38389500,first:7,last:19}]);
  }
  finally { SharedGeometryBuffer(context).ReleaseResources(); context.Destroy(); }
});
