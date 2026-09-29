// Source: trinity/trinity/Tr2SuballocatedBuffer.h
// Source: trinity/trinity/Tr2SuballocatedBuffer.cpp
//
// Carbon's shared geometry buffer, with its existing JavaScript block growth:
// allocations retain their own AL block because copying the old buffer into a
// larger one needs a command encoder that load-time allocation does not own.
// Each physical block therefore has a Tr2VirtualAllocator. Free returns the
// allocation to that allocator; a resource release does not destroy a block
// still shared by other resources. MapForReading remains unported.
import { Tr2SuballocatedBufferAllocation } from "./Tr2SuballocatedBufferAllocation.js";
import { Tr2VirtualAllocator } from "../Tr2VirtualAllocator.js";
import { Tr2BufferDescriptionAL } from "../../../../trinityal/stub/Tr2BufferALStub.js";
import { Tr2CpuUsage } from "#consts/render-context";
import { TriStorageFlags } from "#consts/graphics";
import { CjsSchema, carbon, impl } from "#schema";
import * as CcpLog from "../../../../global/logging/ccpLog.js";
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

  /** Adapted: one virtual allocator per physical block instead of one copied buffer. */
  m_allocators = [];

  m_allocations = [];

  /**
   * Creates the shared pool; physical blocks are made on demand.
   * Adapted: block growth replaces Carbon's Expand/copy, as described above.
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
   * Reserves `count` elements and uploads them, reusing freed ranges first.
   *
   * Source: trinity/trinity/Tr2SuballocatedBuffer.cpp:24-64.
   * Adapted: each physical block has its own allocator; alignment is the LCM
   * of stride and four for WebGPU writes. Failure frees the explicit JS handle
   * that a C++ Allocation destructor would release on unwinding.
   *
   * @param {number} stride Bytes per element.
   * @param {number} count Elements.
   * @param {ArrayBufferView|null} data The bytes, or null to reserve only.
   * @param {object} renderContext The context to create and update through.
   * @returns {Tr2SuballocatedBufferAllocation|null} Allocation, or null when refused.
   */
  Allocate(stride, count, data, renderContext)
  {
    if (!Number.isInteger(stride) || stride <= 0 || !Number.isInteger(count) || count <= 0) return null;
    const size = stride * count;
    if (size > this.m_blockSize) return null;
    const alignment = Lcm(stride, 4);
    const reservation = {};
    let blockIndex = 0;
    while (blockIndex < this.m_allocators.length)
    {
      if (this.m_allocators[blockIndex].Allocate(size, alignment, reservation)) break;
      blockIndex += 1;
    }
    if (blockIndex === this.m_allocators.length)
    {
      // Non-power-of-two stride padding is part of Carbon's virtual reservation.
      const reservedSize = size + (Number.isInteger(Math.log2(alignment)) ? 0 : alignment - 1);
      if (reservedSize > this.m_blockSize) return null;
      if ((this.m_blocks.length + 1) * this.m_blockSize > this.m_maxSize) return null;
      if (!this._AddBlock(renderContext)) return null;
      if (!this.m_allocators[blockIndex].Allocate(size, alignment, reservation)) return null;
    }

    const allocation = new Tr2SuballocatedBufferAllocation();
    allocation.m_buffer = this.m_blocks[blockIndex];
    allocation.m_allocation = reservation;
    allocation.m_offset = reservation.offset;
    allocation.m_size = size;
    allocation.m_stride = stride;
    allocation.m_parent = this;
    this.m_allocations.push(allocation);
    try
    {
      if (data && Failed(allocation.Update(data, renderContext)))
      {
        this.Free(allocation);
        return null;
      }
    }
    catch (error)
    {
      this.Free(allocation);
      throw error;
    }
    return allocation;
  }

  /**
   * Returns a registered allocation's reserved range and detaches its owner.
   * Source: trinity/trinity/Tr2SuballocatedBuffer.cpp:66-84.
   * Adapted: select the allocation's physical-block allocator and clear its
   * direct buffer reference, which Carbon obtains through m_parent instead.
   */
  Free(allocation)
  {
    if (!allocation.m_parent) return;
    const index = this.m_allocations.indexOf(allocation);
    if (index === -1)
    {
      CcpLog.CCP_LOGERR_CH(CcpLog.GetModuleChannel("trinity"), "Memory corruption in Tr2SuballocatedBuffer::Free()! Trying to free an allocation that has already been freed!");
      return;
    }
    const blockIndex = this.m_blocks.indexOf(allocation.m_buffer);
    this.m_allocators[blockIndex].Free(allocation.m_allocation);
    allocation.m_parent = null;
    allocation.m_buffer = null;
    this.m_allocations.splice(index, 1);
  }

  /**
   * Creates the next byte pool through Carbon's buffer-description path.
   * Custom: independent blocks replace the donor's single-buffer Expand copy.
   */
  _AddBlock(renderContext)
  {
    const allocator = new Tr2VirtualAllocator(this.m_blockSize, this.m_blockSize, this.m_blockSize);
    const description = Tr2BufferDescriptionAL.FromStride(4, this.m_blockSize / 4, this.m_gpuUsage, Tr2CpuUsage.WRITE);
    const block = renderContext.CreateBuffer(description, null);
    if (!block) return false;
    block.SetName(`${this.m_name} block ${this.m_blocks.length}`);
    this.m_blocks.push(block);
    this.m_allocators.push(allocator);
    return true;
  }

  /** The most recent block; adapted from Carbon's single shared buffer. */
  GetBuffer()
  {
    return this.m_blocks[this.m_blocks.length - 1] ?? null;
  }

  /** Custom: all physical blocks of the JavaScript growth adaptation. */
  GetBlocks()
  {
    return this.m_blocks;
  }

  /**
   * Releases all blocks and allocations only for managed-memory storage.
   * Source: trinity/trinity/Tr2SuballocatedBuffer.cpp:86-102.
   * Adapted: Destroy replaces C++ AL destruction across the physical blocks.
   */
  ReleaseResources(storage = TriStorageFlags.TRISTORAGE_ALL)
  {
    if (!(storage & TriStorageFlags.TRISTORAGE_MANAGEDMEMORY)) return;
    for (const block of this.m_blocks) block.Destroy();
    while (this.m_allocations.length) this.Free(this.m_allocations[this.m_allocations.length - 1]);
    this.m_blocks = [];
    this.m_allocators = [];
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

CjsSchema.define(Tr2SuballocatedBuffer, {
  className: "Tr2SuballocatedBuffer",
  methods: {
    Allocate: [ carbon.method, impl.adapted ],
    Free: [ carbon.method, impl.adapted ],
    GetBuffer: [ carbon.method, impl.adapted ],
    ReleaseResources: [ carbon.method, impl.adapted ],
    _AddBlock: [ impl.custom ],
    GetBlocks: [ impl.custom ]
  }
});
