import assert from "node:assert/strict";
import { test } from "node:test";
import { TriGeometryRes as SourceTriGeometryRes } from "../../src/resource/geometry/TriGeometryRes.js";
import { Tr2VirtualAllocator } from "../../src/trinity/core/device/Tr2VirtualAllocator.js";
import { Tr2SuballocatedBuffer } from "../../npm/dist/trinity/core/device/Tr2SuballocatedBuffer/Tr2SuballocatedBuffer.js";
import { Tr2RenderContext } from "../../npm/dist/trinity/core/index.js";
import { TriGeometryRes, CjsMotherLode } from "../../npm/dist/resource/index.js";
import { CreateLodAllocations, SharedGeometryBuffer } from "../../npm/dist/trinity/core/mesh/TriGeometryResAllocations.js";
import { TriStorageFlags } from "../../npm/dist/global/consts/graphics/index.js";
import { Tr2GpuUsage } from "../../npm/dist/global/consts/renderContext/index.js";
import { ALResult } from "../../npm/dist/trinityal/index.js";

// VirtualAllocator imports authored src; geometry runs against both src and
// dist with built suballocators and Carbon's CPU stub. No GPU or server.
function context()
{
  const renderContext = new Tr2RenderContext();
  renderContext.GetRenderContextAL().CreateDevice();
  return renderContext;
}

function usedBytes(buffer)
{
  return buffer.m_allocators.reduce((sum, allocator) => sum + allocator.GetAllocatedMemory(), 0);
}

function mesh()
{
  return {
    decl: [ { usage: "Position", usageIndex: 0, type: "Float32", elementCount: 3, offset: 0 } ],
    vertex: { position: [ 0, 0, 0, 1, 0, 0, 0, 1, 0 ] },
    indices: [ { faces: [ 0, 1, 2 ] } ],
    areas: [ { firstElement: 0, elementCount: 1 } ]
  };
}

test("virtual allocator expands reserved blocks and accounts only requested live bytes", () =>
{
  const allocator = new Tr2VirtualAllocator(64, 256, 64);
  assert.equal(allocator.GetBlockSize(), 64);
  assert.equal(allocator.GetMaxSize(), 256);
  assert.equal(allocator.GetCurrentSize(), 64);
  assert.equal(allocator.GetAllocatedMemory(), 0, "Tr2VirtualAllocator.cpp:137-140 excludes reservations");
  const first = {};
  assert.equal(allocator.Allocate(64, 1, first), true);
  assert.equal(allocator.Allocate(1, 1, {}), false);
  assert.equal(allocator.Expand(), true);
  assert.equal(allocator.GetCurrentSize(), 128);
  const second = {};
  assert.equal(allocator.Allocate(64, 1, second), true);
  assert.equal(second.offset, 64, "Tr2VirtualAllocator.cpp:72-75 exposes the lowest reserved block");
  allocator.Free(first);
  allocator.Free(second);
  assert.equal(allocator.GetAllocatedMemory(), 0);
  assert.equal(allocator.Expand(), true);
  assert.equal(allocator.Expand(), true);
  assert.equal(allocator.Expand(), false);
  const whole = {};
  assert.equal(allocator.Allocate(256, 1, whole), true, "adjacent freed reservations coalesce");
  allocator.Free(whole);
  assert.equal(allocator.GetAllocatedMemory(), 0);
});

test("non-power-of-two virtual alignment preserves and reclaims Carbon's padding", () =>
{
  const allocator = new Tr2VirtualAllocator(128, 128, 128);
  const prefix = {};
  const aligned = {};
  const tail = {};
  assert.equal(allocator.Allocate(4, 4, prefix), true);
  assert.equal(allocator.Allocate(24, 12, aligned), true);
  assert.equal(aligned.offset, 12, "Tr2VirtualAllocator.cpp:89-106 manually aligns the padded reservation");
  assert.equal(allocator.Allocate(4, 4, tail), true);
  assert.equal(tail.offset, 40, "24+11 bytes were reserved at byte 4, through byte 38");
  assert.equal(allocator.GetAllocatedMemory(), 32, "padding is not counted as client memory");
  allocator.Free(aligned);
  allocator.Free(prefix);
  allocator.Free(tail);
  assert.equal(allocator.GetAllocatedMemory(), 0);
  assert.equal(allocator.Allocate(128, 1, {}), true, "all padding is reclaimed on free");
});

test("Free reuses holes in earlier blocks without moving surviving allocations", () =>
{
  const renderContext = context();
  const buffer = new Tr2SuballocatedBuffer("reuse", Tr2GpuUsage.VERTEX_BUFFER, 64, 128);
  const first = buffer.Allocate(4, 8, null, renderContext);
  const survivor = buffer.Allocate(4, 8, null, renderContext);
  const secondBlock = buffer.Allocate(4, 16, null, renderContext);
  const survivorBuffer = survivor.GetBuffer();
  assert.equal(usedBytes(buffer), 128);
  buffer.Free(first);
  assert.equal(first.IsValid(), false, "Tr2SuballocatedBuffer.cpp:217-220 validity follows m_parent");
  assert.equal(first.m_parent, null);
  assert.equal(usedBytes(buffer), 96);
  buffer.Free(first);
  assert.equal(usedBytes(buffer), 96, "Free of a detached allocation is a no-op (cpp:68)");
  const reused = buffer.Allocate(4, 8, null, renderContext);
  assert.ok(reused);
  assert.equal(reused.GetBuffer(), survivorBuffer);
  assert.equal(reused.GetOffset(), 0);
  assert.equal(survivor.GetOffset(), 32);
  buffer.Free(reused);
  buffer.Free(survivor);
  const coalesced = buffer.Allocate(4, 16, null, renderContext);
  assert.ok(coalesced, "coalescing makes the full first block reusable");
  assert.equal(coalesced.GetBuffer(), survivorBuffer);
  assert.equal(secondBlock.IsValid(), true);
  assert.equal(buffer.GetBlocks().length, 2, "reclamation never needs a third block");
  buffer.ReleaseResources();
  assert.equal(secondBlock.m_parent, null);
});

test("failed uploads release their reservation before a later allocation", () =>
{
  const renderContext = context();
  const buffer = new Tr2SuballocatedBuffer("failed upload", Tr2GpuUsage.VERTEX_BUFFER, 64, 64);
  const initial = buffer.Allocate(4, 4, null, renderContext);
  const block = initial.GetBuffer();
  buffer.Free(initial);
  const update = block.UpdateBuffer;
  block.UpdateBuffer = () => ALResult.E_FAIL;
  assert.equal(buffer.Allocate(4, 16, new Uint8Array(64), renderContext), null);
  assert.equal(usedBytes(buffer), 0);
  block.UpdateBuffer = () => { throw new Error("synthetic upload failure"); };
  assert.throws(() => buffer.Allocate(4, 16, new Uint8Array(64), renderContext), /synthetic upload failure/);
  assert.equal(usedBytes(buffer), 0);
  block.UpdateBuffer = update;
  assert.ok(buffer.Allocate(4, 16, null, renderContext));
  buffer.ReleaseResources();
});

test("suballocated buffer ReleaseResources honours managed storage and detaches every handle", () =>
{
  const renderContext = context();
  const buffer = new Tr2SuballocatedBuffer("storage", Tr2GpuUsage.VERTEX_BUFFER, 64, 64);
  const allocation = buffer.Allocate(4, 4, null, renderContext);
  buffer.ReleaseResources(TriStorageFlags.TRISTORAGE_VIDEOMEMORY);
  assert.equal(allocation.IsValid(), true, "Tr2SuballocatedBuffer.cpp:88 gates teardown on managed storage");
  buffer.ReleaseResources();
  assert.equal(allocation.IsValid(), false);
  assert.equal(allocation.m_parent, null);
  assert.equal(buffer.m_allocations.length, 0);
  assert.equal(usedBytes(buffer), 0);
  assert.ok(buffer.Allocate(4, 16, null, renderContext), "the pool can be recreated after full teardown");
  buffer.ReleaseResources();
});

for (const [ source, Geometry ] of [ [ "source", SourceTriGeometryRes ], [ "dist", TriGeometryRes ] ])
test(`${source} geometry evict/reload cycles return every LOD's used bytes to the live-resource baseline`, () =>
{
  const renderContext = context();
  const buffer = SharedGeometryBuffer(renderContext);
  const live = buffer.Allocate(4, 16, null, renderContext);
  const baseline = usedBytes(buffer);
  const liveBuffer = live.GetBuffer();
  const motherLode = new CjsMotherLode({ now: () => 0 });
  const geometry = new Geometry();
  geometry.Initialize("res:/synthetic/eviction.cmf");

  for (let cycle = 0; cycle < 20; cycle += 1)
  {
    const flat = mesh();
    const multi = { ...mesh(), lods: [ mesh(), mesh() ] };
    geometry.SetPayload({ meshes: [ flat, multi ] });
    geometry.MarkPrepared();
    const lods = [ flat, ...multi.lods ];
    const allocations = [];
    for (let index = 0; index < lods.length; index += 1)
    {
      const lod = lods[index];
      assert.equal(CreateLodAllocations(geometry, index === 0 ? 0 : 1, lod, renderContext), true);
      allocations.push(lod.vertexAllocation, lod.indexAllocation, lod.reversedIndexAllocation);
    }
    assert.ok(usedBytes(buffer) > baseline);
    motherLode.Insert(geometry.GetPath(), geometry, { time: 0 });
    const result = motherLode.PurgeInactive({ time: 10, maxIdleMilliseconds: 5 });
    assert.equal(result.purged, 1);
    assert.equal(usedBytes(buffer), baseline, "TriGeometryRes.cpp:1834 and Allocation::~Allocation reclaim every mesh allocation");
    assert.equal(buffer.m_allocations.length, 1, "only the other live resource remains registered");
    assert.equal(buffer.GetBlocks().length, 1, "reload cycles do not grow physical buffer capacity");
    assert.equal(live.GetBuffer(), liveBuffer);
    assert.equal(live.IsValid(), true);
    for (const allocation of allocations) assert.equal(allocation.IsValid(), false);
    for (const lod of lods)
    {
      assert.equal(lod.allocationsValid, false);
      assert.equal(lod.reversedIndicesValid, false);
      assert.equal(lod.vertexAllocation, null);
      assert.equal(lod.indexAllocation, null);
      assert.equal(lod.reversedIndexAllocation, null);
    }
    geometry.ReleasePayload();
    assert.equal(usedBytes(buffer), baseline, "repeated resource cleanup leaves other owners untouched");
  }
  buffer.Free(live);
  assert.equal(usedBytes(buffer), 0);
  buffer.ReleaseResources();
});

test("failed LOD index uploads unwind before retry or resource eviction", () =>
{
  for (const failAt of [ 2, 3 ])
  {
    for (const throws of [ false, true ])
    {
      const renderContext = context();
      const buffer = SharedGeometryBuffer(renderContext);
      const geometry = new TriGeometryRes();
      geometry.SetPayload({ meshes: [ mesh() ] });
      const lod = geometry.GetMeshLodByIndex(0, 0);
      const seed = buffer.Allocate(4, 1, null, renderContext);
      const block = seed.GetBuffer();
      buffer.Free(seed);
      const update = block.UpdateBuffer;
      let attempts = 0;
      block.UpdateBuffer = function (...args)
      {
        attempts += 1;
        if (attempts === failAt)
        {
          if (throws) throw new Error("synthetic LOD upload failure");
          return ALResult.E_FAIL;
        }
        return update.apply(this, args);
      };
      if (throws) assert.throws(() => CreateLodAllocations(geometry, 0, lod, renderContext), /synthetic LOD upload failure/);
      else assert.equal(CreateLodAllocations(geometry, 0, lod, renderContext), false);
      assert.equal(usedBytes(buffer), 0, "TriGeometryRes.cpp:2048-2074 frees preceding allocations on failure");
      assert.equal(lod.vertexAllocation, null);
      assert.equal(lod.indexAllocation, null);
      assert.equal(lod.reversedIndexAllocation, null);
      block.UpdateBuffer = update;
      assert.equal(CreateLodAllocations(geometry, 0, lod, renderContext), true);
      geometry.ReleasePayload();
      assert.equal(usedBytes(buffer), 0);
      buffer.ReleaseResources();
    }
  }
});
