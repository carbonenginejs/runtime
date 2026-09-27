// Source: trinity/trinity/Tr2DynamicRingBuffer.h
//   trinity/trinity/Tr2DynamicRingBuffer.cpp
//
// A ring of GPU memory for data written once and drawn once: PutData copies
// into the first region the GPU is no longer reading, DoneUsingData fences it,
// and regions are reused once their fence is reached. Carbon's header also
// declares Tr2RingVertexBuffer and Tr2RingIndexBuffer; each has its own file.
import { carbon, impl } from "#schema";
import { ALResult, Failed } from "#trinityal";
import { Tr2Renderer } from "../Tr2Renderer.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../context/Tr2RenderContext.js";

/** Carbon's anonymous `Align` (cpp:9-12). */
function Align(offset, alignment)
{
  return Math.floor((offset + alignment - 1) / alignment) * alignment;
}

/**
 * Carbon `Tr2DynamicRingBuffer`: the base of the vertex and index rings.
 *
 * Carbon's `Tr2BufferAL m_buffer` is a value that is empty until created; here
 * it is null until created. `PutData` returns `{ result, offset }` for
 * Carbon's out-parameter.
 */
export class Tr2DynamicRingBuffer
{
  /** m_bufferSize - bytes. */
  m_bufferSize = 0;

  /** m_regions - `{ offset, length, fence }`, oldest first. */
  m_regions = [];

  /** m_sizeIncrement */
  m_sizeIncrement = 0;

  /** m_lastPutSucceeded */
  m_lastPutSucceeded = false;

  /** m_availableFences */
  m_availableFences = [];

  /** m_buffer */
  m_buffer = null;

  /** m_name */
  m_name = "";

  /**
   * Carbon's aligned PutData (cpp:50-117). Its three-argument overload is this
   * with alignment 4 (cpp:40-47).
   *
   * @param {ArrayBufferView} data The bytes.
   * @param {number} size Bytes to copy.
   * @param {number} alignment Alignment of the returned offset.
   * @param {object} renderContext The recording context.
   * @returns {{result: number, offset: number}} The result and the data's offset.
   */
  @carbon.method
  @impl.adapted
  PutData(data, size, alignment, renderContext)
  {
    this.m_lastPutSucceeded = false;
    this.TrimUnusedRegions(renderContext);

    if (!size) return { result: ALResult.S_OK, offset: 0 };
    if (!this.IsValid()) return { result: ALResult.E_INVALIDCALL, offset: 0 };

    const allocationSize = size + alignment;
    let allocationOffset = this.GetUnusedRegion(allocationSize);

    if (allocationOffset === null)
    {
      allocationOffset = 0;
      this.RemoveRegions(0, this.m_regions.length);

      let newSize;
      if (this.m_bufferSize < allocationSize + this.m_sizeIncrement) newSize = allocationSize + this.m_sizeIncrement;
      else if (this.m_sizeIncrement) newSize = this.m_bufferSize + this.m_sizeIncrement;
      else newSize = this.m_bufferSize * 2;

      const created = this.CreateBuffer(newSize);
      if (Failed(created)) return { result: created, offset: 0 };
      if (this.m_name) this.m_buffer.SetName(this.m_name);
      this.m_bufferSize = newSize;
    }

    const bufferOffset = Align(allocationOffset, alignment);
    const updated = this.UpdateBuffer(data, bufferOffset, size, renderContext);
    if (Failed(updated)) return { result: updated, offset: 0 };

    this.m_regions.push({ offset: allocationOffset, length: allocationSize, fence: this.AllocateFence() });
    this.m_lastPutSucceeded = true;

    return { result: ALResult.S_OK, offset: bufferOffset };
  }

  /**
   * Carbon DoneUsingData (cpp:127-139): fences the last region put.
   *
   * @param {object} renderContext The recording context.
   */
  @carbon.method
  @impl.implemented
  DoneUsingData(renderContext)
  {
    if (!this.m_lastPutSucceeded) return;

    const last = this.m_regions.at(-1);
    if (last?.fence && Failed(last.fence.PutFence(renderContext)))
    {
      this.DeallocateFence(last.fence);
      last.fence = null;
    }
    this.m_lastPutSucceeded = false;
  }

  /** Carbon IsRegionUsedByGpu (cpp:151-160). */
  @carbon.method
  @impl.implemented
  IsRegionUsedByGpu(region, renderContext)
  {
    if (!region.fence) return false;

    const { result, isReached } = region.fence.IsReached(renderContext);

    return Failed(result) || !isReached;
  }

  /** Carbon TrimUnusedRegions (cpp:168-180): drops leading regions the GPU is done with. */
  @carbon.method
  @impl.implemented
  TrimUnusedRegions(renderContext)
  {
    let used = 0;
    while (used < this.m_regions.length && !this.IsRegionUsedByGpu(this.m_regions[used], renderContext)) used++;

    this.RemoveRegions(0, used);
  }

  /**
   * Carbon GetUnusedRegion (cpp:192-222), returning the offset, or null for
   * Carbon's false.
   *
   * @param {number} minSize Bytes needed.
   * @returns {number|null} The region's offset, or null when none fits.
   */
  @carbon.method
  @impl.adapted
  GetUnusedRegion(minSize)
  {
    const totalSize = this.m_bufferSize;

    if (!this.m_regions.length) return minSize <= totalSize ? 0 : null;

    const last = this.m_regions.at(-1);
    const offset = last.offset + last.length;
    const endOffset = this.m_regions[0].offset;

    if (endOffset < offset)
    {
      if (minSize < totalSize - offset) return offset;
      if (minSize < endOffset) return 0;
      return null;
    }

    return endOffset >= offset + minSize ? offset : null;
  }

  /** Carbon ReleaseResources (cpp:228-238). */
  @carbon.method
  @impl.implemented
  ReleaseResources(_storage)
  {
    this.m_buffer?.Destroy();
    this.m_buffer = null;
    this.RemoveRegions(0, this.m_regions.length);
    for (const fence of this.m_availableFences) fence.Destroy();
    this.m_availableFences.length = 0;
  }

  /** Carbon Tr2DeviceResource::PrepareResources: creation only when the device allows it. */
  @carbon.method
  @impl.implemented
  PrepareResources()
  {
    return Tr2Renderer.IsResourceCreationAllowed() ? this.OnPrepareResources() : true;
  }

  /** Carbon OnPrepareResources (cpp:246-253). */
  @carbon.method
  @impl.implemented
  OnPrepareResources()
  {
    if (!this.m_bufferSize) return true;

    return !Failed(this.CreateBuffer(this.m_bufferSize));
  }

  /** Carbon AllocateFence (cpp:260-277): a recycled fence, or a new one. */
  @carbon.method
  @impl.implemented
  AllocateFence()
  {
    if (this.m_availableFences.length) return this.m_availableFences.pop();

    return Tr2RenderContext_GetMainThreadRenderContext().CreateFence();
  }

  /** Carbon DeallocateFence (cpp:284-290). */
  @carbon.method
  @impl.implemented
  DeallocateFence(fence)
  {
    if (fence) this.m_availableFences.push(fence);
  }

  /**
   * Carbon RemoveRegions (cpp:298-305), by index range for its iterators.
   *
   * @param {number} begin First region to remove.
   * @param {number} end One past the last.
   */
  @carbon.method
  @impl.adapted
  RemoveRegions(begin, end)
  {
    for (let index = begin; index < end; index++) this.DeallocateFence(this.m_regions[index].fence);

    this.m_regions.splice(begin, end - begin);
  }

  /** Carbon SetSizeIncrement (cpp:312-315). */
  @carbon.method
  @impl.implemented
  SetSizeIncrement(sizeIncrement)
  {
    this.m_sizeIncrement = sizeIncrement >>> 0;
  }

  /** Carbon GetBufferSize (cpp:321-324). */
  @carbon.method
  @impl.implemented
  GetBufferSize()
  {
    return this.m_bufferSize;
  }

  /** Carbon SetName (cpp:326-333). */
  @carbon.method
  @impl.implemented
  SetName(name)
  {
    this.m_name = String(name ?? "");
    if (this.IsValid()) this.m_buffer.SetName(this.m_name);
  }

  /** Carbon IsValid (cpp:342-345). */
  @carbon.method
  @impl.implemented
  IsValid()
  {
    return Boolean(this.m_buffer?.IsValid());
  }

  /** Carbon GetBuffer (cpp:353-356): the AL buffer, null before creation. */
  @carbon.method
  @impl.implemented
  GetBuffer()
  {
    return this.m_buffer;
  }

  /**
   * Carbon's pure virtual CreateBuffer (Tr2DynamicRingBuffer.h:55): each ring
   * kind creates its own buffer.
   *
   * @param {number} _size Bytes.
   * @returns {number} An `ALResult`.
   */
  @carbon.method
  @impl.abstract
  CreateBuffer(_size)
  {
    return ALResult.E_FAIL;
  }

  /**
   * Carbon UpdateBuffer (cpp:368-382): map, copy, unmap.
   *
   * @returns {number} An `ALResult`.
   */
  @carbon.method
  @impl.implemented
  UpdateBuffer(data, offset, size, renderContext)
  {
    const { result, data: mapped } = this.m_buffer.MapForWriting(renderContext);
    if (Failed(result)) return result;
    if (!mapped) return ALResult.E_FAIL;

    mapped.set(new Uint8Array(data.buffer, data.byteOffset, size), offset);
    this.m_buffer.UnmapForWriting(renderContext);

    return ALResult.S_OK;
  }
}
