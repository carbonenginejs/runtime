// Source: trinity/trinity/Tr2QuadRenderer.h
//   trinity/trinity/Tr2QuadRenderer.cpp
// Hand-maintained from Carbon source, promoted out of generated intake.
// The CPU half was implemented 2026-07-23 and the GPU half on 2026-09-27: the
// ring instance buffer (UpdateInstanceBuffer), the shared quad vertex and index
// buffers (RecreateQuadBuffers) and the vertex declarations (OnPrepareResources).
import { Tr2QuadRendererEffectRecord } from "./Tr2QuadRendererEffectRecord.js";
import { carbon, impl, type } from "#schema";
import { CjsModel } from "#model";
import { Tr2RenderBatch } from "../batch/TriRenderBatch/index.js";
import { TriBatchType, TriStorageFlags } from "#consts/graphics";
import { Tr2CpuUsage, Tr2GpuUsage } from "#consts/render-context";
import { Tr2BufferDescriptionAL } from "#trinityal";
import { Tr2RingVertexBuffer } from "../device/Tr2RingVertexBuffer.js";
import { Tr2Renderer } from "../Tr2Renderer.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../context/Tr2RenderContext.js";
import { Tr2EffectStateManager } from "../../shader/Tr2EffectStateManager.js";

/** Initial size of the instance buffer (cpp:17). */
const BUFFER_INITIAL_SIZE = 4 * 1024 * 1024;

/** Carbon's anonymous `Align` (cpp:19-22). */
function Align(offset, alignment)
{
  return Math.floor((offset + alignment - 1) / alignment) * alignment;
}

/** The lowest common multiple, Carbon's `std::lcm` (cpp:81). */
function Lcm(a, b)
{
  const gcd = (x, y) => (y ? gcd(y, x % y) : x);
  return (a * b) / gcd(a, b);
}

/** Collects quads from every registered effect into one merged instance buffer and emits them as batches. */
@type.define({ className: "Tr2QuadRenderer", family: "trinityCore" })
export class Tr2QuadRenderer extends CjsModel
{

  /** m_vertexBufferOffset: the frame's ring offset, -1 when the upload failed (cpp:27). */
  @type.int32
  vertexBufferOffset = -1;

  /** m_lastInstanceDataSize (uint32_t) */
  @type.uint32
  lastInstanceDataSize = 0;

  /** m_bufferAlignment (uint32_t) - lcm of registered instance sizes. */
  @type.uint32
  bufferAlignment = 4;

  /** m_bufferSize - bytes accumulated this frame across all records. */
  @type.uint32
  bufferSize = 0;

  /** m_effects - EffectKey -> Tr2QuadRendererEffectRecord. */
  _effects = new Map();

  /** m_buffer - the merged CPU instance bytes. */
  _buffer = null;

  /** m_quad - quad corner indices 0..4n-1 as floats; null until created. */
  _quad = null;

  /** m_quadIB - six uint16 indices per quad; null until created. */
  _quadIB = null;

  /** m_vertexBuffer - the ring the merged instances are uploaded into. */
  _vertexBuffer = null;

  /** Carbon's constructor (cpp:25-35): the ring grows 512 KiB at a time. */
  constructor()
  {
    super();
    this._vertexBuffer = new Tr2RingVertexBuffer();
    this._vertexBuffer.SetSizeIncrement(512 * 1024);
  }

  /**
   * Registers a quad effect once per key (Carbon Tr2QuadRenderer.cpp:61-83).
   * instanceSize is in bytes; the buffer alignment grows to the lcm of all
   * registered instance sizes.
   */
  @carbon.method
  @impl.implemented
  RegisterEffect(key, batchType, instanceSize, quadCount, definition, effect)
  {
    if (this._effects.has(key))
    {
      return;
    }
    const record = new Tr2QuadRendererEffectRecord();
    record.effect = effect ?? null;
    record.batchType = batchType;
    record.instanceSize = instanceSize >>> 0;
    record.count = 0;
    record.quadCount = quadCount >>> 0;
    record.vertexDeclHandle = Tr2EffectStateManager.Unknown;
    record.definition = definition ?? null;
    this._effects.set(key, record);
    this.bufferAlignment = Lcm(this.bufferAlignment, record.instanceSize || 1);
  }

  /**
   * Drops a registered effect and the quads accumulated for it.
   */
  @carbon.method
  @impl.implemented
  UnregisterEffect(key)
  {
    this._effects.delete(key);
  }

  /**
   * Accumulates instance data for a registered effect (Carbon cpp:106-126).
   *
   * Adapted: Carbon keeps a buffer per TBB thread; single-threaded JS keeps
   * one pending list per record. The bytes are copied raw, as Carbon's memcpy;
   * a number array is packed as float32, so a mixed-width record (float16
   * tails) is packed by its producer first.
   */
  @carbon.method
  @impl.adapted
  AddQuads(effectKey, sprites, count = 1)
  {
    const record = this._effects.get(effectKey);
    if (!record)
    {
      return;
    }

    const size = count * record.instanceSize;
    if (!size)
    {
      return;
    }

    record.pending.push(Tr2QuadRenderer._CopyInstanceBytes(sprites, size));
    record.addedSize += size;
    this.bufferSize += size;
  }

  /**
   * Concatenates every record's pending instances into one aligned CPU
   * buffer, stamping per-record bufferOffset/count (Carbon cpp:134-170).
   * Returns the largest quadCount among live records.
   */
  @carbon.method
  @impl.implemented
  MergeBuffers()
  {
    // Add padding to accommodate alignment.
    for (const record of this._effects.values())
    {
      this.bufferSize += record.instanceSize;
    }

    const merged = new Uint8Array(this.bufferSize);
    let offset = 0;
    let quadCount = 0;
    for (const record of this._effects.values())
    {
      offset = Align(offset, record.instanceSize || 1);
      record.bufferOffset = offset;
      for (const chunk of record.pending)
      {
        merged.set(chunk, offset);
        offset += chunk.byteLength;
      }
      record.pending.length = 0;
      record.addedSize = 0;
      record.count = record.instanceSize ? (offset - record.bufferOffset) / record.instanceSize : 0;
      if (record.count)
      {
        quadCount = Math.max(quadCount, record.quadCount);
      }
    }
    this._buffer = merged;
    return quadCount;
  }

  /**
   * Carbon UpdateInstanceBuffer (cpp:178-199): uploads the merged instances
   * into the ring and remembers where they landed.
   */
  @carbon.method
  @impl.implemented
  UpdateInstanceBuffer(renderContext)
  {
    if (this.bufferSize && !this._vertexBuffer.IsValid())
    {
      this._vertexBuffer.Create(BUFFER_INITIAL_SIZE);
    }

    const { result, offset } = this._vertexBuffer.PutData(this._buffer, this.bufferSize, this.bufferAlignment, renderContext);
    if (result < 0)
    {
      this.vertexBufferOffset = -1;
      return;
    }
    this.vertexBufferOffset = offset;
    this.lastInstanceDataSize = this.bufferSize;
  }

  /**
   * Carbon RecreateQuadBuffers (cpp:206-236): the quad corner stream (each
   * vertex is its own index as a float) and the index list, grown to the
   * largest quad count seen.
   */
  @carbon.method
  @impl.implemented
  RecreateQuadBuffers(quadCount)
  {
    if (!quadCount) return;

    const renderContext = Tr2RenderContext_GetMainThreadRenderContext();

    if (!this._quad?.IsValid() || this._quad.GetSize() / 4 < quadCount * 4)
    {
      const quad = new Float32Array(quadCount * 4);
      for (let i = 0; i < quad.length; ++i) quad[i] = i;

      this._quad?.Destroy();
      this._quad = renderContext.CreateBuffer(Tr2BufferDescriptionAL.FromStride(4, 4 * quadCount, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.NONE), quad);
    }
    if (!this._quadIB?.IsValid() || this._quadIB.GetDesc().count < quadCount * 6)
    {
      const corners = [ 0, 2, 1, 0, 3, 2 ];
      const quadIB = new Uint16Array(quadCount * 6);
      for (let i = 0; i < quadCount; ++i)
      {
        for (let j = 0; j < 6; ++j) quadIB[i * 6 + j] = i * 4 + corners[j];
      }

      this._quadIB?.Destroy();
      this._quadIB = renderContext.CreateBuffer(Tr2BufferDescriptionAL.FromStride(2, quadCount * 6, Tr2GpuUsage.INDEX_BUFFER, Tr2CpuUsage.NONE), quadIB);
    }
  }

  /**
   * Carbon BeginRendering (cpp:244-253): merge, upload, size the quad
   * buffers, make the declarations.
   */
  @carbon.method
  @impl.implemented
  BeginRendering(renderContext)
  {
    const quadCount = this.MergeBuffers();
    this.UpdateInstanceBuffer(renderContext);
    this.RecreateQuadBuffers(quadCount);
    this.PrepareResources();
  }

  /** Carbon DoneRendering (cpp:89-93): the ring region is fenced, the size reset. */
  @carbon.method
  @impl.implemented
  DoneRendering(renderContext)
  {
    this._vertexBuffer.DoneUsingData(renderContext);
    this.bufferSize = 0;
  }

  /** Carbon ReleaseResources (cpp:262-271): declarations are recreated on prepare. */
  @carbon.method
  @impl.implemented
  ReleaseResources(storage)
  {
    if (storage & TriStorageFlags.TRISTORAGE_MANAGEDMEMORY)
    {
      for (const record of this._effects.values())
      {
        record.vertexDeclHandle = Tr2EffectStateManager.Unknown;
      }
    }
  }

  /** Carbon Tr2DeviceResource::PrepareResources: creation only when the device allows it. */
  @carbon.method
  @impl.implemented
  PrepareResources()
  {
    return Tr2Renderer.IsResourceCreationAllowed() ? this.OnPrepareResources() : true;
  }

  /** Carbon OnPrepareResources (cpp:279-289): a declaration per registered effect. */
  @carbon.method
  @impl.implemented
  OnPrepareResources()
  {
    for (const record of this._effects.values())
    {
      if (record.vertexDeclHandle === Tr2EffectStateManager.Unknown)
      {
        record.vertexDeclHandle = Tr2EffectStateManager.getVertexDeclarationHandle(record.definition);
      }
    }
    return true;
  }

  /**
   * Emits one instanced batch per live record of the requested type
   * (Carbon cpp:297-318).
   *
   * Adapted: Carbon commits a stack batch the accumulator copies; the
   * accumulator allocates it here.
   */
  @carbon.method
  @impl.adapted
  GetBatches(batchType, accumulator)
  {
    if (this.vertexBufferOffset === -1 || !this._quadIB?.IsValid())
    {
      return;
    }

    for (const record of this._effects.values())
    {
      if (record.count && record.batchType === batchType && record.vertexDeclHandle !== Tr2EffectStateManager.Unknown)
      {
        const batch = accumulator.Allocate(Tr2RenderBatch);
        batch.SetMaterial(record.effect);
        batch.SetGeometry(record.vertexDeclHandle, this._quad, 4, this._quadIB, this._quadIB.GetDesc().stride);
        batch.SetStreamSource(1, this._vertexBuffer.GetBuffer(), record.instanceSize);
        batch.SetDrawIndexedInstanced(6 * record.quadCount, record.count, 0, 0, (this.vertexBufferOffset + record.bufferOffset) / record.instanceSize);
        accumulator.Commit(batch);
      }
    }
  }

  /** Carbon GetInstanceBufferSize (cpp:324-327). */
  @carbon.method
  @impl.implemented
  GetInstanceBufferSize()
  {
    return this._vertexBuffer.GetBufferSize();
  }

  /** Carbon GetInstanceDataSize (cpp:333-336). */
  @carbon.method
  @impl.implemented
  GetInstanceDataSize()
  {
    return this.lastInstanceDataSize;
  }

  /** The registered effect records, for tests and diagnostics. */
  GetEffectRecords()
  {
    return this._effects;
  }

  /** Carbon Tr2QuadRenderer::Instance - the scene-global singleton. */
  static Instance()
  {
    if (!Tr2QuadRenderer._instance)
    {
      Tr2QuadRenderer._instance = new Tr2QuadRenderer();
    }
    return Tr2QuadRenderer._instance;
  }

  /** Copies one AddQuads input as the exact bytes Carbon memcpy would receive. */
  static _CopyInstanceBytes(source, size)
  {
    let bytes;

    if (ArrayBuffer.isView(source))
    {
      bytes = new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
    }
    else if (source instanceof ArrayBuffer)
    {
      bytes = new Uint8Array(source);
    }
    else if (Array.isArray(source))
    {
      const floats = Float32Array.from(source);
      bytes = new Uint8Array(floats.buffer, floats.byteOffset, floats.byteLength);
    }
    else
    {
      throw new TypeError("Tr2QuadRenderer.AddQuads requires terminal bytes or float32-compatible numeric data.");
    }

    if (bytes.byteLength < size)
    {
      throw new RangeError(`Tr2QuadRenderer.AddQuads expected ${size} bytes, received ${bytes.byteLength}.`);
    }

    return bytes.slice(0, size);
  }

  static _instance = null;

  static TriBatchType = TriBatchType;

}
