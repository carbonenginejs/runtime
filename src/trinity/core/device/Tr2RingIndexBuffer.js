// Source: trinity/trinity/Tr2DynamicRingBuffer.h
//   trinity/trinity/Tr2DynamicRingBuffer.cpp
//
// A ring index buffer, declared beside Tr2DynamicRingBuffer in Carbon's header.
import { carbon, impl } from "#schema";
import { Tr2BufferDescriptionAL, ALResult } from "#trinityal";
import { Tr2CpuUsage, Tr2GpuUsage } from "#consts/render-context";
import { Tr2DynamicRingBuffer } from "./Tr2DynamicRingBuffer.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../context/Tr2RenderContext.js";

/** Carbon `Tr2RingIndexBuffer`: the ring as an index buffer. */
export class Tr2RingIndexBuffer extends Tr2DynamicRingBuffer
{
  /** m_indexSize */
  m_indexSize = 4;

  /** Carbon Create (cpp:440-447). */
  @carbon.method
  @impl.implemented
  Create(numberOfIndices, indexSize)
  {
    this.ReleaseResources();
    this.m_indexSize = indexSize;
    this.m_bufferSize = numberOfIndices * this.m_indexSize;

    return this.PrepareResources();
  }

  /** Carbon CreateBuffer (cpp:458-468). */
  @carbon.method
  @impl.implemented
  CreateBuffer(size)
  {
    this.m_buffer?.Destroy();
    this.m_buffer = Tr2RenderContext_GetMainThreadRenderContext().CreateBuffer(
      Tr2BufferDescriptionAL.FromStride(this.m_indexSize, size / this.m_indexSize, Tr2GpuUsage.INDEX_BUFFER, Tr2CpuUsage.WRITE_OFTEN | Tr2CpuUsage.NON_SYNCRONIZED_WRITE),
      null
    );

    return this.m_buffer ? ALResult.S_OK : ALResult.E_FAIL;
  }
}
