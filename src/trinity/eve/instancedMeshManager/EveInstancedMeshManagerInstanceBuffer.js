// Source: trinity/trinity/Eve/EveInstancedMeshManager.h:206-235
// Source: trinity/trinity/Eve/EveInstancedMeshManager.cpp:398-507
import { meta, type, blue } from "#schema";
import { Tr2CpuUsage, Tr2GpuUsage } from "#consts/render-context";
import { Tr2BufferAL } from "../../../trinityal/Tr2BufferAL/Tr2BufferAL.js";
import { Tr2BufferDescriptionAL } from "../../../trinityal/Tr2BufferAL/Tr2BufferDescriptionAL.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../core/context/Tr2RenderContext.js";
import { EveInstancedMeshManagerInstanceBufferAllocation } from "./EveInstancedMeshManagerInstanceBufferAllocation.js";
import { EveInstancedMeshManagerInstanceBufferRegion } from "./EveInstancedMeshManagerInstanceBufferRegion.js";


/**
 * Carbon EveInstancedMeshManager::InstanceBuffer (private, h:206-235): a ring
 * of per-instance GPU records. Each frame's draws allocate spans from the
 * end of the last region; a region stays reserved until the frame that wrote
 * it has rendered (TrimRegions), and when no span fits the buffer is retired
 * - kept alive until the next trim - and replaced by one twice the size.
 *
 * All sizes and offsets are in bytes: the AL buffer is created with a stride
 * of 4, so its element count is a quarter of its byte size.
 */
@blue.define({ className: "EveInstancedMeshManagerInstanceBuffer", donors: [ "EveInstancedMeshManager::InstanceBuffer" ] })
export class EveInstancedMeshManagerInstanceBuffer
{

  /** Carbon InstanceBuffer::Allocation (h:209-214). */
  static Allocation = EveInstancedMeshManagerInstanceBufferAllocation;

  /** Carbon InstanceBuffer::Region (private, h:223-228). */
  static _Region = EveInstancedMeshManagerInstanceBufferRegion;

  /** buffer (std::unique_ptr<Tr2BufferAL>, private). Carbon starts it empty. */
  @type.rawStruct("Tr2BufferAL")
  _buffer = null;

  /** regions (std::vector<Region>, private). */
  @type.list("EveInstancedMeshManagerInstanceBufferRegion")
  _regions = [];

  /** retiredBuffers (std::vector<std::unique_ptr<Tr2BufferAL>>, private): replaced buffers kept alive until the next trim. */
  @type.list("Tr2BufferAL")
  _retiredBuffers = [];

  /** mappedRetiredBuffers (std::vector<Tr2BufferAL*>, private): retired buffers still mapped, unmapped by DoneCopying. */
  @type.list("Tr2BufferAL")
  _mappedRetiredBuffers = [];

  /** mappedData (uint8_t*, private): the current buffer's mapping, null when unmapped. */
  @type.uint8Array
  _mappedData = null;

  /**
   * Carbon Allocate (cpp:398-432): finds `count` free bytes, retiring the
   * buffer for one twice the size (at least 128 KiB elements) when none fit,
   * maps the buffer, and records the span as this recording frame's - merged
   * into the last region when that one is this frame's and ends where the
   * span starts.
   *
   * Adapted: Carbon's `Create( 4, newCount, ... )` stride overload is reached
   * through `Create( description )` with `Tr2BufferDescriptionAL.create__Stride`,
   * because our Tr2BufferAL ports only the description overload. The map's
   * result is read from the returned record, where Carbon fills an
   * out-parameter and ignores the result; a failed map leaves `data` null
   * where Carbon would hand out `nullptr + offset`. `data` is a subarray view
   * of the mapping (allocation per call) standing in for pointer arithmetic.
   * @param {number} count Bytes wanted.
   * @returns {EveInstancedMeshManagerInstanceBufferAllocation}
   */
  @blue.method
  @meta.adapted
  Allocate(count)
  {
    const renderContext = Tr2RenderContext_GetMainThreadRenderContext();

    const frameNumber = renderContext.GetRecordingFrameNumber();

    let offset = this.GetUnusedRegion(count);
    if (offset === null)
    {
      if (this._mappedData !== null)
      {
        this._mappedRetiredBuffers.push(this._buffer);
        this._mappedData = null;
      }
      const oldCount = this._buffer ? this._buffer.GetDesc().count : 0;
      this._retiredBuffers.push(this._buffer);
      this._buffer = new Tr2BufferAL();
      const newCount = Math.max(count, oldCount ? (oldCount * 2) >>> 0 : 128 * 1024);
      this._buffer.Create(Tr2BufferDescriptionAL.create__Stride(4, newCount, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.WRITE_OFTEN | Tr2CpuUsage.NON_SYNCRONIZED_WRITE), null, renderContext);
      this._regions.length = 0;
      offset = 0;
    }

    this._mappedData = this._buffer.MapForWriting(renderContext).data;

    const last = this._regions.length ? this._regions[this._regions.length - 1] : null;
    if (last !== null && last.recordedFrame === frameNumber && last.offset + last.length === offset)
    {
      last.length += count;
    }
    else
    {
      const region = new EveInstancedMeshManagerInstanceBufferRegion();
      region.offset = offset;
      region.length = count;
      region.recordedFrame = frameNumber;
      this._regions.push(region);
    }

    const allocation = new EveInstancedMeshManagerInstanceBufferAllocation();
    allocation.buffer = this._buffer;
    allocation.data = this._mappedData === null ? null : this._mappedData.subarray(offset); // alloc: view standing in for mappedData + offset.
    allocation.offset = offset;
    return allocation;
  }

  /**
   * Carbon GetUnusedRegion (cpp:434-471): the byte offset of `count` free
   * bytes after the last region - wrapping to 0 when the tail is too short
   * but the head before the first region is not - or none.
   *
   * Carbon quirk, reproduced: both wrap-case tests are strict (`count <
   * totalCount - offset`, `count < endOffset`), so a span that would fit
   * exactly is refused there, while the non-wrapped test (`endOffset >=
   * offset + count`) accepts an exact fit.
   *
   * Adapted: `std::optional<uint32_t>` is a number or `null`.
   * @param {number} count Bytes wanted (Carbon's header names it minSize).
   * @returns {number|null} The byte offset, or null when nothing fits.
   */
  @blue.method
  @meta.adapted
  GetUnusedRegion(count)
  {
    if (!this._buffer || !this._buffer.IsValid())
    {
      return null;
    }
    const totalCount = (this._buffer.GetDesc().count * this._buffer.GetDesc().stride) >>> 0;

    if (this._regions.length === 0)
    {
      if (count <= totalCount)
      {
        return 0;
      }
      return null;
    }

    const back = this._regions[this._regions.length - 1];
    let offset = back.offset + back.length;
    const endOffset = this._regions[0].offset;
    if (endOffset < offset)
    {
      if (count < totalCount - offset)
      {
        return offset;
      }
      if (count < endOffset)
      {
        offset = 0;
        return offset;
      }
      return null;
    }
    if (endOffset >= offset + count)
    {
      return offset;
    }
    return null;
  }

  /**
   * Carbon DoneCopying (cpp:473-487): unmaps the current buffer if mapped,
   * then every retired buffer that was retired while mapped.
   */
  @blue.method
  @meta.implemented
  DoneCopying()
  {
    if (this._mappedData !== null)
    {
      const renderContext = Tr2RenderContext_GetMainThreadRenderContext();
      this._buffer.UnmapForWriting(renderContext);
      this._mappedData = null;
    }
    for (const buf of this._mappedRetiredBuffers)
    {
      const renderContext = Tr2RenderContext_GetMainThreadRenderContext();
      buf.UnmapForWriting(renderContext);
    }
    this._mappedRetiredBuffers.length = 0;
  }

  /**
   * Carbon TrimRegions (cpp:489-502): drops the leading regions whose frame
   * has rendered, then releases every retired buffer.
   *
   * Adapted: clearing Carbon's vector of unique_ptrs destroys the buffers;
   * JavaScript has no destructors, so each retired buffer is destroyed
   * explicitly. The first retirement pushes Carbon's empty unique_ptr, which
   * is null here and has nothing to destroy.
   * @param {number} renderedFrame The last frame the device has finished.
   */
  @blue.method
  @meta.adapted
  TrimRegions(renderedFrame)
  {
    let used = 0;
    while (used !== this._regions.length)
    {
      if (this._regions[used].recordedFrame > renderedFrame)
      {
        break;
      }
      ++used;
    }
    this._regions.splice(0, used);

    for (const retired of this._retiredBuffers)
    {
      if (retired !== null)
      {
        retired.Destroy();
      }
    }
    this._retiredBuffers.length = 0;
  }

  /**
   * Carbon GetSize (cpp:504-507): the current buffer's size in bytes, 0 without one.
   * @returns {number}
   */
  @blue.method
  @meta.implemented
  GetSize()
  {
    return this._buffer ? (this._buffer.GetDesc().count * this._buffer.GetDesc().stride) >>> 0 : 0;
  }

}
