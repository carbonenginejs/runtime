// Source: trinity/trinityal/Tr2DrawUPHelper.cpp, trinity/trinityal/Tr2DrawUPHelper.h
//
// The DX9 `Draw*PrimitiveUP` calls let a caller hand the driver vertices and
// indices out of its own memory, with nothing bound. No modern API can do that,
// so Carbon emulates them ONCE, in a backend-agnostic helper every backend
// delegates to: DX11 `m_drawUP` (`Tr2RenderContextDx11.cpp:1114-1139`), DX12
// `m_drawUPHelper` (`Tr2RenderContextDx12.cpp:1199-1224`), Metal the same
// (`Tr2RenderContextMetal.mm:558-571`). The emulation is the obvious one: copy
// the caller's bytes into a scratch buffer, bind it, issue an ordinary draw.
//
// THE RING IS WHY IT IS A CLASS AND NOT A FUNCTION. Four vertex buffers, four
// 16-bit index buffers, four 32-bit, each cursor advancing after use. A single
// scratch buffer would be rewritten while a previous draw in the same frame
// still referred to it, and the second draw would silently take the first's
// geometry. Four is Carbon's number (`DRAW_UP_RING_SIZE`), and it is not a
// guess about GPU latency: these draws come from line sets and debug geometry,
// which issue a handful per frame.
//
// GROWTH IS ONE-WAY. A buffer too small for the request is recreated at the new
// size and never shrinks again, so a frame that draws one big batch leaves the
// slot large. Carbon does the same by calling `Create` on the existing
// `Tr2BufferAL`; here the context's `CreateBuffer` hands back a fresh buffer of
// the running backend's kind, because a shared file cannot name one.
//
// ONE SIGNATURE DIFFERENCE. Carbon's methods take the render context AND the
// device, because its `Tr2BufferAL::Create` wants the device. Ours reaches the
// device through the context, as every other buffer creation here does, so the
// parameter is gone. Carbon's two indexed overloads differ only in index width;
// this is one method that reads the width off the array it is given.

import { ALResult, Failed } from "./ALResult.js";
import { Tr2BufferDescriptionAL } from "./stub/Tr2BufferALStub.js";
import { CjsSchema } from "#schema";
import { Topology, Tr2CpuUsage, Tr2GpuUsage } from "../global/consts/renderContext/index.js";


/** `DRAW_UP_RING_SIZE`. */
const RING_SIZE = 4;


// Carbon's file-local `ComputeVertexCount` (`Tr2DrawUPHelper.cpp:13-33`).
//
// IT DISAGREES WITH THE RENDER CONTEXT'S OWN TABLE ON ONE ENTRY, and the
// disagreement is Carbon's: a triangle fan counts as `primitiveCount` here and
// as `primitiveCount + 2` where a fan is converted. Transcribed as written,
// because no backend draws a fan at all - DX11 calls the topology invalid
// (`Tr2RenderContextEnum.h:138`), Metal says NOT SUPPORTED
// (`Tr2RenderContextMetal.mm:370`) - so the entry describes a path that cannot
// be reached rather than a count anything relies on.
const VERTEX_COUNT = Object.freeze({
  [Topology.TOP_TRIANGLES]: count => count * 3,
  [Topology.TOP_TRIANGLE_STRIP]: count => count + 2,
  [Topology.TOP_LINES]: count => count * 2,
  [Topology.TOP_LINE_STRIP]: count => count + 1,
  [Topology.TOP_POINTS]: count => count,
  [Topology.TOP_TRIANGLE_FAN]: count => count
});


/**
 * Returns the caller's bytes as a byte view, whatever view they arrived in.
 *
 * @param {ArrayBufferView} data The caller's data.
 * @returns {Uint8Array} A view over the same bytes.
 */
function bytesOf(data)
{
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
}


/**
 * Emulates the user-pointer draws with scratch buffers.
 *
 * A backend owns one of these and forwards its `Draw*PrimitiveUP` to it.
 */
export class Tr2DrawUPHelper
{
  /** m_nextRingVB. */
  _nextRingVB = 0;

  /** m_nextRingIB16. */
  _nextRingIB16 = 0;

  /** m_nextRingIB32. */
  _nextRingIB32 = 0;

  /** m_vertexUP. */
  _vertexUP = new Array(RING_SIZE).fill(null);

  /** m_indexUP16. */
  _indexUP16 = new Array(RING_SIZE).fill(null);

  /** m_indexUP32. */
  _indexUP32 = new Array(RING_SIZE).fill(null);

  /**
   * Drops every scratch buffer and rewinds the ring.
   *
   * @returns {void}
   */
  Destroy()
  {
    for (const ring of [ this._vertexUP, this._indexUP16, this._indexUP32 ])
    {
      for (let i = 0; i !== RING_SIZE; ++i)
      {
        ring[i]?.Destroy();
        ring[i] = null;
      }
    }

    this._nextRingVB = 0;
    this._nextRingIB16 = 0;
    this._nextRingIB32 = 0;
  }

  /**
   * Draws non-indexed from caller memory.
   *
   * @param {number} topology A `Topology` value; the context's bound topology.
   * @param {number} primitiveCount Primitives to draw.
   * @param {ArrayBufferView} vertexStreamZeroData The vertices.
   * @param {number} vertexStreamZeroStride Bytes per vertex.
   * @param {object} renderContext The render context to bind and draw through.
   * @returns {number} An `ALResult` value.
   */
  DrawPrimitiveUP(topology, primitiveCount, vertexStreamZeroData, vertexStreamZeroStride, renderContext)
  {
    if (primitiveCount === 0) return ALResult.S_OK;

    const vertexCount = this._VertexCount(topology, primitiveCount);

    if (vertexCount === 0) return ALResult.E_INVALIDARG;

    const slot = this._nextRingVB;
    const filled = this._FillVertices(vertexCount, vertexStreamZeroData, vertexStreamZeroStride, slot, renderContext);

    if (Failed(filled)) return filled;

    if (!renderContext.SetStreamSource(0, this._vertexUP[slot], 0, vertexStreamZeroStride))
    {
      return ALResult.E_FAIL;
    }

    this._nextRingVB = (this._nextRingVB + 1) % RING_SIZE;

    return renderContext.DrawPrimitive(0, primitiveCount) ? ALResult.S_OK : ALResult.E_FAIL;
  }

  /**
   * Draws indexed from caller memory.
   *
   * @param {number} topology A `Topology` value; the context's bound topology.
   * @param {number} numVertices Vertices the index data spans.
   * @param {number} primitiveCount Primitives to draw.
   * @param {Uint16Array|Uint32Array} indexData The indices; its width picks the ring.
   * @param {ArrayBufferView} vertexStreamZeroData The vertices.
   * @param {number} vertexStreamZeroStride Bytes per vertex.
   * @param {object} renderContext The render context to bind and draw through.
   * @returns {number} An `ALResult` value.
   */
  DrawIndexedPrimitiveUP(
    topology,
    numVertices,
    primitiveCount,
    indexData,
    vertexStreamZeroData,
    vertexStreamZeroStride,
    renderContext
  )
  {
    if (primitiveCount === 0) return ALResult.S_OK;
    if (!indexData || !vertexStreamZeroData) return ALResult.E_INVALIDARG;

    // Carbon picks the overload at the call site and so picks the ring with it.
    // A JavaScript caller hands one array, so the ELEMENT WIDTH decides - which
    // is the same information, read later.
    const bytesPerIndex = indexData.BYTES_PER_ELEMENT;

    if (bytesPerIndex !== 2 && bytesPerIndex !== 4) return ALResult.E_INVALIDARG;

    const indexCount = this._VertexCount(topology, primitiveCount);

    if (indexCount === 0) return ALResult.E_INVALIDARG;

    const vertexSlot = this._nextRingVB;
    const filled = this._FillVertices(
      numVertices,
      vertexStreamZeroData,
      vertexStreamZeroStride,
      vertexSlot,
      renderContext
    );

    if (Failed(filled)) return filled;

    if (!renderContext.SetStreamSource(0, this._vertexUP[vertexSlot], 0, vertexStreamZeroStride))
    {
      return ALResult.E_FAIL;
    }

    this._nextRingVB = (this._nextRingVB + 1) % RING_SIZE;

    const ring = bytesPerIndex === 2 ? this._indexUP16 : this._indexUP32;
    const indexSlot = bytesPerIndex === 2 ? this._nextRingIB16 : this._nextRingIB32;
    const indices = this._FillIndices(indexCount, indexData, bytesPerIndex, ring, indexSlot, renderContext);

    if (Failed(indices)) return indices;

    if (!renderContext.SetIndices(ring[indexSlot], bytesPerIndex)) return ALResult.E_FAIL;

    if (bytesPerIndex === 2) this._nextRingIB16 = (this._nextRingIB16 + 1) % RING_SIZE;
    else this._nextRingIB32 = (this._nextRingIB32 + 1) % RING_SIZE;

    return renderContext.DrawIndexedPrimitive(numVertices, 0, primitiveCount) ? ALResult.S_OK : ALResult.E_FAIL;
  }

  /**
   * Carbon's `ComputeVertexCount`, refusing a topology it has no entry for.
   *
   * Carbon asserts and returns zero; an assert is not available here, so zero
   * is the whole answer and the callers turn it into `E_INVALIDARG`.
   *
   * @param {number} topology A `Topology` value.
   * @param {number} primitiveCount Primitives.
   * @returns {number} Vertices, or zero for an unsupported topology.
   */
  _VertexCount(topology, primitiveCount)
  {
    return VERTEX_COUNT[topology]?.(primitiveCount) ?? 0;
  }

  /**
   * `FillUPVertexBuffer`: grows the slot if needed, then copies the vertices in.
   *
   * @param {number} vertexCount Vertices to copy.
   * @param {ArrayBufferView} vertexStreamZeroData The vertices.
   * @param {number} vertexStreamZeroStride Bytes per vertex.
   * @param {number} slot Ring slot to fill.
   * @param {object} renderContext The render context.
   * @returns {number} An `ALResult` value.
   */
  _FillVertices(vertexCount, vertexStreamZeroData, vertexStreamZeroStride, slot, renderContext)
  {
    const totalSize = vertexCount * vertexStreamZeroStride;

    // Carbon returns S_OK for nothing to copy and goes on to bind and draw the
    // slot anyway, so a zero-size request is not an error. It IS a no-draw here
    // when the slot is still empty, because there is no buffer to bind.
    if (totalSize === 0) return this._vertexUP[slot] ? ALResult.S_OK : ALResult.E_INVALIDARG;

    if (!vertexStreamZeroData) return ALResult.E_INVALIDARG;
    if (bytesOf(vertexStreamZeroData).length < totalSize) return ALResult.E_INVALIDARG;

    const existing = this._vertexUP[slot];

    if (!existing || existing.GetDesc().GetSizeInBytes() < totalSize)
    {
      // Carbon's own rounding: a four-byte stride over `(totalSize + 3) / 4`
      // elements, so the buffer is described in words whatever the vertex
      // stride is. The stride the DRAW uses comes from `SetStreamSource`, not
      // from the description, so the two never have to agree.
      const created = renderContext.CreateBuffer(
        Tr2BufferDescriptionAL.FromStride(
          4,
          Math.floor((totalSize + 3) / 4),
          Tr2GpuUsage.VERTEX_BUFFER,
          Tr2CpuUsage.WRITE_OFTEN
        )
      );

      if (!created) return ALResult.E_FAIL;

      existing?.Destroy();
      this._vertexUP[slot] = created;
    }

    return this._Copy(this._vertexUP[slot], bytesOf(vertexStreamZeroData).subarray(0, totalSize), renderContext);
  }

  /**
   * `FillUPIndexBuffer`: grows the slot if needed, then copies the indices in.
   *
   * @param {number} indexCount Indices to copy.
   * @param {Uint16Array|Uint32Array} indices The indices.
   * @param {number} bytesPerIndex Index width in bytes.
   * @param {Array<object|null>} ring The ring for this width.
   * @param {number} slot Ring slot to fill.
   * @param {object} renderContext The render context.
   * @returns {number} An `ALResult` value.
   */
  _FillIndices(indexCount, indices, bytesPerIndex, ring, slot, renderContext)
  {
    if (indices.length < indexCount) return ALResult.E_INVALIDARG;

    const existing = ring[slot];

    // Carbon compares the COUNT here and the byte size for vertices
    // (`:74,164`), which comes to the same thing while the width is fixed.
    if (!existing || existing.GetDesc().count < indexCount)
    {
      const created = renderContext.CreateBuffer(
        Tr2BufferDescriptionAL.FromStride(bytesPerIndex, indexCount, Tr2GpuUsage.INDEX_BUFFER, Tr2CpuUsage.WRITE_OFTEN)
      );

      if (!created) return ALResult.E_FAIL;

      existing?.Destroy();
      ring[slot] = created;
    }

    const source = new Uint8Array(indices.buffer, indices.byteOffset, indexCount * bytesPerIndex);

    return this._Copy(ring[slot], source, renderContext);
  }

  /**
   * Maps a scratch buffer, copies bytes into it and unmaps.
   *
   * @param {object} buffer The scratch buffer.
   * @param {Uint8Array} source The bytes to copy.
   * @param {object} renderContext The render context.
   * @returns {number} An `ALResult` value.
   */
  _Copy(buffer, source, renderContext)
  {
    // `UpdateBuffer` is NOT the route: it refuses a `WRITE_OFTEN` buffer, as
    // Carbon's stub does (`Tr2BufferALStub.cpp:138-141`), and these are all
    // `WRITE_OFTEN`. The map family is the write path for this usage, which is
    // what Carbon's helper uses too.
    const { result, data } = buffer.MapForWriting(renderContext);

    if (Failed(result) || !data)
    {
      buffer.UnmapForWriting(renderContext);

      return Failed(result) ? result : ALResult.E_FAIL;
    }

    data.set(source);
    buffer.UnmapForWriting(renderContext);

    return ALResult.S_OK;
  }
}


// DECLARED AS A CALL, NOT A DECORATOR. The abstraction layer is imported
// straight from source by its tests - `#trinityal/...` resolves to `src/` - and
// raw Node cannot parse decorator syntax, so a decorator here breaks every test
// that reaches this file without a build first.
CjsSchema.define(Tr2DrawUPHelper, { className: "Tr2DrawUPHelper", carbon: "Tr2DrawUPHelper" });
