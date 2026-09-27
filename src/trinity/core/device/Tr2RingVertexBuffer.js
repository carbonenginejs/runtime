// Source: trinity/trinity/Tr2DynamicRingBuffer.h
//   trinity/trinity/Tr2DynamicRingBuffer.cpp
//
// A ring vertex buffer, declared beside Tr2DynamicRingBuffer in Carbon's header.
import { carbon, impl } from "#schema";
import { Tr2BufferDescriptionAL, ALResult } from "#trinityal";
import { Tr2CpuUsage, Tr2GpuUsage } from "#consts/render-context";
import { Tr2DynamicRingBuffer } from "./Tr2DynamicRingBuffer.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../context/Tr2RenderContext.js";

/** Carbon `Tr2RingVertexBuffer`: the ring as a vertex buffer. */
export class Tr2RingVertexBuffer extends Tr2DynamicRingBuffer
{
  /** Carbon Create (cpp:395-400). */
  @carbon.method
  @impl.implemented
  Create(bufferSize)
  {
    this.ReleaseResources();
    this.m_bufferSize = bufferSize >>> 0;

    return this.PrepareResources();
  }

  /** Carbon CreateBuffer (cpp:411-421): a stride-1 WRITE_OFTEN vertex buffer. */
  @carbon.method
  @impl.implemented
  CreateBuffer(size)
  {
    this.m_buffer?.Destroy();
    this.m_buffer = Tr2RenderContext_GetMainThreadRenderContext().CreateBuffer(
      Tr2BufferDescriptionAL.FromStride(1, size, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.WRITE_OFTEN | Tr2CpuUsage.NON_SYNCRONIZED_WRITE),
      null
    );

    return this.m_buffer ? ALResult.S_OK : ALResult.E_FAIL;
  }
}
