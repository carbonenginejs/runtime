// Source: trinity/trinity/Tr2VirtualAllocator.h
// Source: trinity/trinity/Tr2VirtualAllocator.cpp
import { CjsSchema, meta } from "#schema";

/** Allocates aligned virtual byte ranges, reclaiming frees and expanding by reserved blocks. */
export class Tr2VirtualAllocator
{
  m_blockSize = 0;

  m_maxSize = 0;

  m_currentSize = 0;

  m_allocatedMemory = 0;

  m_reservedBlocks = [];

  /** Adapted: ordered free spans replace VMA's native virtual-block handle. */
  block = [];

  /**
   * Reserve the maximum address space, then expose the initial block count.
   * Adapted: JavaScript spans replace VMA; Carbon's reservations and size rules remain.
   */
  constructor(blockSize, maxSize, initialSize)
  {
    if (!Number.isSafeInteger(blockSize) || blockSize <= 0 || !Number.isInteger(Math.log2(blockSize))
      || !Number.isSafeInteger(maxSize) || maxSize < blockSize || maxSize % blockSize !== 0
      || !Number.isSafeInteger(initialSize) || initialSize < 0 || initialSize > maxSize || initialSize % blockSize !== 0)
    {
      throw new RangeError("Tr2VirtualAllocator requires a power-of-two block and block-aligned sizes.");
    }
    this.m_blockSize = blockSize;
    this.m_maxSize = maxSize;
    this.block = [ { offset: 0, size: maxSize } ];
    for (let index = 0; index < maxSize / blockSize; index += 1)
    {
      const allocation = {};
      this.Allocate(blockSize, 1, allocation);
      this.m_reservedBlocks.push(allocation);
    }
    this.m_reservedBlocks.reverse();
    while (this.m_currentSize < initialSize) this.Expand();
  }

  /** Exposes the lowest reserved block, or returns false at the maximum size. */
  Expand()
  {
    if (this.m_reservedBlocks.length === 0) return false;
    this.m_currentSize += this.m_blockSize;
    this.Free(this.m_reservedBlocks[this.m_reservedBlocks.length - 1]);
    this.m_reservedBlocks.pop();
    return true;
  }

  /**
   * Allocate a range and fill Carbon's VirtualAllocation output record.
   * Adapted: best-fit free spans replace VMA MIN_MEMORY; VMA's internal tie
   * ordering is not reproduced. Non-power-of-two alignments reserve Carbon's
   * extra alignment-minus-one bytes before manually aligning the result.
   *
   * @param {number} size Requested bytes, excluding padding.
   * @param {number} alignment Required byte alignment.
   * @param {object} result Output with allocation, offset and size.
   * @returns {boolean} Whether a range was reserved.
   */
  Allocate(size, alignment, result)
  {
    if (!Number.isSafeInteger(size) || size <= 0 || !Number.isSafeInteger(alignment) || alignment <= 0) return false;
    const powerOfTwo = Number.isInteger(Math.log2(alignment));
    const reservedSize = size + (powerOfTwo ? 0 : alignment - 1);
    const reservedAlignment = powerOfTwo ? alignment : 1;
    let best = -1;
    let bestOffset = 0;
    for (let index = 0; index < this.block.length; index += 1)
    {
      const span = this.block[index];
      const offset = Math.ceil(span.offset / reservedAlignment) * reservedAlignment;
      if (offset + reservedSize > span.offset + span.size) continue;
      if (best === -1 || span.size < this.block[best].size)
      {
        best = index;
        bestOffset = offset;
      }
    }
    if (best === -1) return false;

    const span = this.block[best];
    const end = span.offset + span.size;
    this.block.splice(best, 1);
    if (bestOffset > span.offset)
    {
      this.block.splice(best, 0, { offset: span.offset, size: bestOffset - span.offset });
      best += 1;
    }
    if (bestOffset + reservedSize < end)
    {
      this.block.splice(best, 0, { offset: bestOffset + reservedSize, size: end - bestOffset - reservedSize });
    }
    result.allocation = { offset: bestOffset, size: reservedSize };
    result.offset = Math.ceil(bestOffset / alignment) * alignment;
    result.size = size;
    this.m_allocatedMemory += size;
    return true;
  }

  /**
   * Reclaim the complete reserved span and subtract its requested byte count.
   * Adapted: coalescing adjacent JavaScript spans replaces vmaVirtualFree.
   */
  Free(allocation)
  {
    const span = allocation.allocation;
    let index = 0;
    while (index < this.block.length && this.block[index].offset < span.offset) index += 1;
    this.block.splice(index, 0, { offset: span.offset, size: span.size });
    if (index > 0 && this.block[index - 1].offset + this.block[index - 1].size === span.offset)
    {
      this.block[index - 1].size += span.size;
      this.block.splice(index, 1);
      index -= 1;
    }
    const current = this.block[index];
    const next = this.block[index + 1];
    if (next && current.offset + current.size === next.offset)
    {
      current.size += next.size;
      this.block.splice(index + 1, 1);
    }
    this.m_allocatedMemory -= allocation.size;
  }

  /** Bytes exposed by each successful Expand. */
  GetBlockSize()
  {
    return this.m_blockSize;
  }

  /** Maximum virtual address-space size. */
  GetMaxSize()
  {
    return this.m_maxSize;
  }

  /** Currently exposed capacity, including free spans. */
  GetCurrentSize()
  {
    return this.m_currentSize;
  }

  /** Requested bytes held by clients, excluding padding and reserved blocks. */
  GetAllocatedMemory()
  {
    return this.m_allocatedMemory - this.m_reservedBlocks.length * this.m_blockSize;
  }
}

CjsSchema.define(Tr2VirtualAllocator, {
  className: "Tr2VirtualAllocator",
  methods: {
    Expand: [ meta.blue.method, meta.implemented ],
    Allocate: [ meta.blue.method, meta.adapted ],
    Free: [ meta.blue.method, meta.adapted ],
    GetBlockSize: [ meta.blue.method, meta.implemented ],
    GetMaxSize: [ meta.blue.method, meta.implemented ],
    GetCurrentSize: [ meta.blue.method, meta.implemented ],
    GetAllocatedMemory: [ meta.blue.method, meta.implemented ]
  }
});
