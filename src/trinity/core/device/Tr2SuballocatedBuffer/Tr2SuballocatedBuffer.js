// Source: trinity/trinity/Tr2SuballocatedBuffer.h
//   trinity/trinity/Tr2SuballocatedBuffer.cpp
//
// Carbon's suballocated device buffer: one big `Tr2BufferAL` that many
// allocations share, so that a mesh's vertices are `(buffer, offset, stride)`
// rather than a buffer of their own. `TriGeometryRes` keeps ONE of these for
// the whole process (`TriGeometryRes.cpp:33-38`, 32 MiB blocks), and a render
// batch carries the shared buffer plus a stride while the allocation's offset
// rides `baseVertexLocation` / `startIndexLocation` (`Tr2MeshBase.cpp:372-392`).
//
// WHERE THIS DIFFERS. Carbon grows by `Expand()`: a bigger buffer, a GPU copy of
// the old contents, one buffer still. WebGPU can copy buffer to buffer only
// inside a command encoder, which a load-time allocation does not have, so this
// grows by adding a BLOCK: a second `Tr2BufferAL` of the block size, and
// allocations after it carry that block. A batch binds its allocation's own
// buffer, so nothing above notices - except that two meshes in different
// blocks cannot share one stream binding, which they could not anyway.
//
// Not ported: `Free` (Carbon's virtual allocator reclaims; ours is append-only
// until the resource that owns the buffer releases it), `MapForReading`.
import { Tr2SuballocatedBufferAllocation } from "./Tr2SuballocatedBufferAllocation.js";
import { Tr2BufferDescriptionAL } from "../../../../trinityal/stub/Tr2BufferALStub.js";
import { Tr2CpuUsage } from "#consts/render-context";
import { Failed } from "../../../../trinityal/ALResult.js";


/** `SHARED_BUFFER_BLOCK_SIZE` (`TriGeometryRes.h:15`). */
export const SHARED_BUFFER_BLOCK_SIZE = 32 * 1024 * 1024;

/** `SHARED_BUFFER_MAX_SIZE` (`TriGeometryRes.h:16`). */
export const SHARED_BUFFER_MAX_SIZE = 2048 * 1024 * 1024;


/**
 * Carbon's `Tr2SuballocatedBuffer`: one growable pool of device buffer blocks
 * that hands out `Tr2SuballocatedBufferAllocation` slices.
 */
export class Tr2SuballocatedBuffer
{
  m_name = "";

  m_gpuUsage = 0;

  m_blockSize = SHARED_BUFFER_BLOCK_SIZE;

  m_maxSize = SHARED_BUFFER_MAX_SIZE;

  /** The blocks, each a `Tr2BufferAL` of `m_blockSize` bytes. */
  m_blocks = [];

  /** The next free byte in the last block. */
  m_offset = 0;

  m_allocations = [];

  /**
   * @param {string} name A debug name.
   * @param {number} gpuUsage `Tr2GpuUsage` flags for every block.
   * @param {number} [blockSize] Bytes per block.
   * @param {number} [maxSize] Bytes in total before allocation refuses.
   */
  constructor(name, gpuUsage, blockSize = SHARED_BUFFER_BLOCK_SIZE, maxSize = SHARED_BUFFER_MAX_SIZE)
  {
    this.m_name = String(name ?? "");
    this.m_gpuUsage = gpuUsage;
    this.m_blockSize = blockSize;
    this.m_maxSize = maxSize;
  }

  /**
   * Reserves `count` elements of `stride` bytes and uploads them.
   *
   * Carbon asserts `offset % stride == 0` (`Tr2SuballocatedBuffer.cpp:24-63`):
   * the offset is element-aligned so `GetStartIndex` is exact. Alignment here
   * is to the least common multiple of the stride and four, which keeps the
   * offset both element-aligned and a legal `writeBuffer` offset.
   *
   * @param {number} stride Bytes per element.
   * @param {number} count Elements.
   * @param {ArrayBufferView|null} data The bytes, or null to reserve only.
   * @param {object} renderContext The context to create and update through.
   * @returns {Tr2SuballocatedBufferAllocation|null} The allocation, or null when refused.
   */
  Allocate(stride, count, data, renderContext)
  {
    if (!Number.isInteger(stride) || stride <= 0 || !Number.isInteger(count) || count <= 0) return null;

    const size = stride * count;

    if (size > this.m_blockSize) return null;

    const alignment = Lcm(stride, 4);
    let offset = Math.ceil(this.m_offset / alignment) * alignment;

    if (this.m_blocks.length === 0 || offset + size > this.m_blockSize)
    {
      if ((this.m_blocks.length + 1) * this.m_blockSize > this.m_maxSize) return null;
      if (!this.#AddBlock(renderContext)) return null;

      offset = 0;
    }

    const allocation = new Tr2SuballocatedBufferAllocation();

    allocation.m_buffer = this.m_blocks[this.m_blocks.length - 1];
    allocation.m_offset = offset;
    allocation.m_size = size;
    allocation.m_stride = stride;
    allocation.m_parent = this;

    this.m_offset = offset + size;
    this.m_allocations.push(allocation);

    if (data && Failed(allocation.Update(data, renderContext)))
    {
      this.m_allocations.pop();

      return null;
    }

    return allocation;
  }

  /** Carbon's `OnPrepareResources`: the block is a stride-4 byte pool. */
  #AddBlock(renderContext)
  {
    const description = Tr2BufferDescriptionAL.FromStride(4, this.m_blockSize / 4, this.m_gpuUsage, Tr2CpuUsage.WRITE);
    const block = renderContext.CreateBuffer(description, null);

    if (!block) return false;

    block.SetName(`${this.m_name} block ${this.m_blocks.length}`);
    this.m_blocks.push(block);
    this.m_offset = 0;

    return true;
  }

  /** The most recent block, Carbon's one buffer. */
  GetBuffer()
  {
    return this.m_blocks[this.m_blocks.length - 1] ?? null;
  }

  /** Every block this buffer has made. */
  GetBlocks()
  {
    return this.m_blocks;
  }

  /** Releases every block and forgets every allocation. */
  ReleaseResources()
  {
    for (const block of this.m_blocks) block.Destroy();

    this.m_blocks = [];
    this.m_offset = 0;

    for (const allocation of this.m_allocations)
    {
      allocation.m_buffer = null;
      allocation.m_size = 0;
    }

    this.m_allocations = [];
  }
}


function Gcd(a, b)
{
  while (b) [ a, b ] = [ b, a % b ];

  return a;
}

function Lcm(a, b)
{
  return (a * b) / Gcd(a, b);
}
