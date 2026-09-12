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
import { Tr2BufferDescriptionAL } from "../../../../trinityal/stub/Tr2BufferALStub.js";
import { Tr2CpuUsage } from "#consts/render-context";
import { Failed } from "../../../../trinityal/ALResult.js";


/** `SHARED_BUFFER_BLOCK_SIZE` (`TriGeometryRes.h:15`). */
export const SHARED_BUFFER_BLOCK_SIZE = 32 * 1024 * 1024;

/** `SHARED_BUFFER_MAX_SIZE` (`TriGeometryRes.h:16`). */
export const SHARED_BUFFER_MAX_SIZE = 2048 * 1024 * 1024;


/**
 * Carbon's `Tr2SuballocatedBuffer::Allocation`: where in which buffer, at
 * what stride.
 */
export class Tr2SuballocatedBufferAllocation
{
  /** The block's `Tr2BufferAL`. */
  m_buffer = null;

  m_offset = 0;

  m_size = 0;

  m_stride = 0;

  m_parent = null;

  /** The block's `Tr2BufferAL`. */
  GetBuffer()
  {
    return this.m_buffer;
  }

  /** The allocation's first byte within that block. */
  GetOffset()
  {
    return this.m_offset;
  }

  /** The allocation's size in bytes. */
  GetSize()
  {
    return this.m_size;
  }

  /** Bytes per element, which `GetStartIndex` divides by. */
  GetStride()
  {
    return this.m_stride;
  }

  /** `m_offset / m_stride`: the first element, which the draw arguments add. */
  GetStartIndex()
  {
    return this.m_stride ? Math.floor(this.m_offset / this.m_stride) : 0;
  }

  /** Whether the allocation names a block and has any size. */
  IsValid()
  {
    return this.m_buffer !== null && this.m_size > 0;
  }

  /**
   * Rewrites the allocation, whole or in part.
   *
   * @param {ArrayBufferView} data The bytes.
   * @param {object} renderContext The context to update through.
   * @param {number} [offset] Byte offset within the allocation.
   * @param {number} [size] Bytes to write.
   * @returns {number} An `ALResult` value.
   */
  Update(data, renderContext, offset = 0, size = data.byteLength)
  {
    return this.m_buffer.UpdateBuffer(this.m_offset + offset, size, data, renderContext);
  }
}
