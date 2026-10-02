// Source: trinity/trinity/Tr2DynamicRingBuffer.h
//   trinity/trinity/Tr2DynamicRingBuffer.cpp
//
// A ring of GPU memory for data written once and drawn once: PutData copies
// into the first region the GPU is no longer reading, DoneUsingData fences it,
// and regions are reused once their fence is reached. Carbon's header also
// declares Tr2RingVertexBuffer and Tr2RingIndexBuffer; each has its own file.
import { meta } from "#schema";
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
 * Carbon's `Tr2BufferAL _buffer` is a value that is empty until created; here
 * it is null until created. `PutData` returns `{ result, offset }` for
 * Carbon's out-parameter.
 */
export class Tr2DynamicRingBuffer
{
  /** _bufferSize - bytes. */
  _bufferSize = 0;

  /** _regions - `{ offset, length, fence }`, oldest first. */
  _regions = [];

  /** _sizeIncrement */
  _sizeIncrement = 0;

  /** _lastPutSucceeded */
  _lastPutSucceeded = false;

  /** _availableFences */
  _availableFences = [];

  /** _buffer */
  _buffer = null;

  /** _name */
  _name = "";

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
  @meta.blue.method
  @meta.adapted
  PutData(data, size, alignment, renderContext)
  {
    this._lastPutSucceeded = false;
    this.TrimUnusedRegions(renderContext);

    if (!size) return { result: ALResult.S_OK, offset: 0 };
    if (!this.IsValid()) return { result: ALResult.E_INVALIDCALL, offset: 0 };

    const allocationSize = size + alignment;
    let allocationOffset = this.GetUnusedRegion(allocationSize);

    if (allocationOffset === null)
    {
      allocationOffset = 0;
      this.RemoveRegions(0, this._regions.length);

      let newSize;
      if (this._bufferSize < allocationSize + this._sizeIncrement) newSize = allocationSize + this._sizeIncrement;
      else if (this._sizeIncrement) newSize = this._bufferSize + this._sizeIncrement;
      else newSize = this._bufferSize * 2;

      const created = this.CreateBuffer(newSize);
      if (Failed(created)) return { result: created, offset: 0 };
      if (this._name) this._buffer.SetName(this._name);
      this._bufferSize = newSize;
    }

    const bufferOffset = Align(allocationOffset, alignment);
    const updated = this.UpdateBuffer(data, bufferOffset, size, renderContext);
    if (Failed(updated)) return { result: updated, offset: 0 };

    this._regions.push({ offset: allocationOffset, length: allocationSize, fence: this.AllocateFence() });
    this._lastPutSucceeded = true;

    return { result: ALResult.S_OK, offset: bufferOffset };
  }

  /**
   * Carbon DoneUsingData (cpp:127-139): fences the last region put.
   *
   * @param {object} renderContext The recording context.
   */
  @meta.blue.method
  @meta.implemented
  DoneUsingData(renderContext)
  {
    if (!this._lastPutSucceeded) return;

    const last = this._regions.at(-1);
    if (last?.fence && Failed(last.fence.PutFence(renderContext)))
    {
      this.DeallocateFence(last.fence);
      last.fence = null;
    }
    this._lastPutSucceeded = false;
  }

  /** Carbon IsRegionUsedByGpu (cpp:151-160). */
  @meta.blue.method
  @meta.implemented
  IsRegionUsedByGpu(region, renderContext)
  {
    if (!region.fence) return false;

    const { result, isReached } = region.fence.IsReached(renderContext);

    return Failed(result) || !isReached;
  }

  /** Carbon TrimUnusedRegions (cpp:168-180): drops leading regions the GPU is done with. */
  @meta.blue.method
  @meta.implemented
  TrimUnusedRegions(renderContext)
  {
    let used = 0;
    while (used < this._regions.length && !this.IsRegionUsedByGpu(this._regions[used], renderContext)) used++;

    this.RemoveRegions(0, used);
  }

  /**
   * Carbon GetUnusedRegion (cpp:192-222), returning the offset, or null for
   * Carbon's false.
   *
   * @param {number} minSize Bytes needed.
   * @returns {number|null} The region's offset, or null when none fits.
   */
  @meta.blue.method
  @meta.adapted
  GetUnusedRegion(minSize)
  {
    const totalSize = this._bufferSize;

    if (!this._regions.length) return minSize <= totalSize ? 0 : null;

    const last = this._regions.at(-1);
    const offset = last.offset + last.length;
    const endOffset = this._regions[0].offset;

    if (endOffset < offset)
    {
      if (minSize < totalSize - offset) return offset;
      if (minSize < endOffset) return 0;
      return null;
    }

    return endOffset >= offset + minSize ? offset : null;
  }

  /** Carbon ReleaseResources (cpp:228-238). */
  @meta.blue.method
  @meta.implemented
  ReleaseResources(_storage)
  {
    this._buffer?.Destroy();
    this._buffer = null;
    this.RemoveRegions(0, this._regions.length);
    for (const fence of this._availableFences) fence.Destroy();
    this._availableFences.length = 0;
  }

  /** Carbon Tr2DeviceResource::PrepareResources: creation only when the device allows it. */
  @meta.blue.method
  @meta.implemented
  PrepareResources()
  {
    return Tr2Renderer.IsResourceCreationAllowed() ? this.OnPrepareResources() : true;
  }

  /** Carbon OnPrepareResources (cpp:246-253). */
  @meta.blue.method
  @meta.implemented
  OnPrepareResources()
  {
    if (!this._bufferSize) return true;

    return !Failed(this.CreateBuffer(this._bufferSize));
  }

  /** Carbon AllocateFence (cpp:260-277): a recycled fence, or a new one. */
  @meta.blue.method
  @meta.implemented
  AllocateFence()
  {
    if (this._availableFences.length) return this._availableFences.pop();

    return Tr2RenderContext_GetMainThreadRenderContext().CreateFence();
  }

  /** Carbon DeallocateFence (cpp:284-290). */
  @meta.blue.method
  @meta.implemented
  DeallocateFence(fence)
  {
    if (fence) this._availableFences.push(fence);
  }

  /**
   * Carbon RemoveRegions (cpp:298-305), by index range for its iterators.
   *
   * @param {number} begin First region to remove.
   * @param {number} end One past the last.
   */
  @meta.blue.method
  @meta.adapted
  RemoveRegions(begin, end)
  {
    for (let index = begin; index < end; index++) this.DeallocateFence(this._regions[index].fence);

    this._regions.splice(begin, end - begin);
  }

  /** Carbon SetSizeIncrement (cpp:312-315). */
  @meta.blue.method
  @meta.implemented
  SetSizeIncrement(sizeIncrement)
  {
    this._sizeIncrement = sizeIncrement >>> 0;
  }

  /** Carbon GetBufferSize (cpp:321-324). */
  @meta.blue.method
  @meta.implemented
  GetBufferSize()
  {
    return this._bufferSize;
  }

  /** Carbon SetName (cpp:326-333). */
  @meta.blue.method
  @meta.implemented
  SetName(name)
  {
    this._name = String(name ?? "");
    if (this.IsValid()) this._buffer.SetName(this._name);
  }

  /** Carbon IsValid (cpp:342-345). */
  @meta.blue.method
  @meta.implemented
  IsValid()
  {
    return Boolean(this._buffer?.IsValid());
  }

  /** Carbon GetBuffer (cpp:353-356): the AL buffer, null before creation. */
  @meta.blue.method
  @meta.implemented
  GetBuffer()
  {
    return this._buffer;
  }

  /**
   * Carbon's pure virtual CreateBuffer (Tr2DynamicRingBuffer.h:55): each ring
   * kind creates its own buffer.
   *
   * @param {number} _size Bytes.
   * @returns {number} An `ALResult`.
   */
  @meta.blue.method
  @meta.abstract
  CreateBuffer(_size)
  {
    return ALResult.E_FAIL;
  }

  /**
   * Carbon UpdateBuffer (cpp:368-382): map, copy, unmap.
   *
   * @returns {number} An `ALResult`.
   */
  @meta.blue.method
  @meta.implemented
  UpdateBuffer(data, offset, size, renderContext)
  {
    const { result, data: mapped } = this._buffer.MapForWriting(renderContext);
    if (Failed(result)) return result;
    if (!mapped) return ALResult.E_FAIL;

    mapped.set(new Uint8Array(data.buffer, data.byteOffset, size), offset);
    this._buffer.UnmapForWriting(renderContext);

    return ALResult.S_OK;
  }
}
