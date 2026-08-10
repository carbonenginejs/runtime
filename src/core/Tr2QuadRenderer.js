// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Tr2QuadRenderer.h
//   trinity/trinity/Tr2QuadRenderer.cpp
// Hand-maintained from Carbon source, promoted out of generated intake.
// CPU half implemented 2026-07-23 (batch-plan P5 scene-global quad collector).
// The generator had flattened the internal EffectRecord/PerThreadData members
// onto the class; corrected to Carbon's nested shape. GPU realization (quad
// vertex/index buffers, ring instance buffer upload, vertex-declaration
// handles) is engine-owned and reads the merged CPU state emitted here.
import { carbon, impl, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { Tr2RenderBatch } from "./batch/Tr2RenderBatch.js";
import { TriBatchType } from "@carbonenginejs/runtime-utils/graphics";

/** One registered quad effect (Carbon Tr2QuadRenderer::EffectRecord). */
export class Tr2QuadRendererEffectRecord
{

  effect = null;

  batchType = 0;

  /** Size of one instance vertex in BYTES. */
  instanceSize = 0;

  /** Number of quads to render per instance. */
  quadCount = 0;

  /** Vertex definition (engine resolves the declaration handle from it). */
  definition = null;

  /** Byte offset of this record's instances in the merged buffer. */
  bufferOffset = 0;

  /** Number of instances merged this frame. */
  count = 0;

  /** Per-frame accumulation (Carbon's per-thread TLS collapses to one list). */
  pending = [];

  /** Bytes accumulated in pending. */
  addedSize = 0;

}

/** Collects quads from every registered effect into one merged instance buffer and emits them as batches. */
@type.define({ className: "Tr2QuadRenderer", family: "trinityCore" })
export class Tr2QuadRenderer extends CjsModel
{

  /** m_vertexBufferOffset (uint32_t) - ring offset; engine stamps the real one. */
  @type.uint32
  vertexBufferOffset = 0;

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
  #effects = new Map();

  /** The merged CPU instance buffer for the frame (Float32Array). */
  #mergedData = null;

  /** Largest quadCount among records with instances (RecreateQuadBuffers input). */
  #maxQuadCount = 0;

  /**
   * Registers a quad effect once per key (Carbon Tr2QuadRenderer.cpp:30-53).
   * instanceSize is in bytes; the buffer alignment grows to the lcm of all
   * registered instance sizes.
   */
  @carbon.method
  @impl.implemented
  RegisterEffect(key, batchType, instanceSize, quadCount, definition, effect)
  {
    if (this.#effects.has(key))
    {
      return;
    }
    const record = new Tr2QuadRendererEffectRecord();
    record.effect = effect ?? null;
    record.batchType = batchType;
    record.instanceSize = instanceSize >>> 0;
    record.quadCount = quadCount >>> 0;
    record.definition = definition ?? null;
    this.#effects.set(key, record);
    this.bufferAlignment = Tr2QuadRenderer.#Lcm(this.bufferAlignment, record.instanceSize || 1);
  }

  /**
   * Drops a registered effect and the quads accumulated for it.
   */
  @carbon.method
  @impl.implemented
  UnregisterEffect(key)
  {
    this.#effects.delete(key);
  }

  /**
   * Accumulates instance data for a registered effect (Carbon cpp:60-79).
   * Accepts float data (Float32Array or number[]) covering
   * count * instanceSize bytes; unknown keys are ignored like Carbon.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Single-threaded JS collapses the per-thread TLS buffers to one pending list; bytes stay float32-typed.")
  AddQuads(effectKey, sprites, count = 1)
  {
    const record = this.#effects.get(effectKey);
    if (!record || !sprites)
    {
      return;
    }
    const size = count * record.instanceSize;
    const floats = new Float32Array(size / 4);
    const source = sprites;
    for (let index = 0; index < floats.length; index++)
    {
      floats[index] = Number(source[index]) || 0;
    }
    record.pending.push(floats);
    record.addedSize += size;
    this.bufferSize += size;
  }

  /**
   * Concatenates every record's pending instances into one aligned CPU
   * buffer, stamping per-record bufferOffset/count (Carbon cpp:81-115).
   * Returns the largest quadCount among live records.
   */
  @carbon.method
  @impl.implemented
  MergeBuffers()
  {
    let padded = this.bufferSize;
    for (const record of this.#effects.values())
    {
      padded += record.instanceSize;
    }
    const merged = new Float32Array(Math.ceil(padded / 4));
    let offset = 0;
    let quadCount = 0;
    for (const record of this.#effects.values())
    {
      offset = Tr2QuadRenderer.#Align(offset, record.instanceSize || 1);
      record.bufferOffset = offset;
      for (const chunk of record.pending)
      {
        merged.set(chunk, offset / 4);
        offset += chunk.length * 4;
      }
      record.pending.length = 0;
      record.addedSize = 0;
      record.count = record.instanceSize ? (offset - record.bufferOffset) / record.instanceSize : 0;
      if (record.count)
      {
        quadCount = Math.max(quadCount, record.quadCount);
      }
    }
    this.#mergedData = merged;
    this.#maxQuadCount = quadCount;
    return quadCount;
  }

  /**
   * Frame-start CPU work (Carbon cpp:160-166): merge the accumulated
   * instances. Buffer upload and quad-buffer creation are engine-owned;
   * the engine reads GetMergedData()/GetMaxQuadCount() and stamps
   * vertexBufferOffset with the ring allocation.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("UpdateInstanceBuffer/RecreateQuadBuffers/PrepareResources are GPU realization; the merged CPU state is exposed for the engine.")
  BeginRendering(_renderContext = null)
  {
    const quadCount = this.MergeBuffers();
    this.lastInstanceDataSize = this.bufferSize;
    return quadCount;
  }

  /** Frame-end reset (Carbon cpp:55-58). */
  @carbon.method
  @impl.implemented
  DoneRendering(_renderContext = null)
  {
    this.bufferSize = 0;
  }

  /**
   * Emits one instanced batch per live record of the requested type
   * (Carbon cpp:188-207). The quad vertex/index buffers are shared engine
   * resources, carried as descriptors on the batch; startInstanceLocation
   * derives from the ring offset + record offset exactly like Carbon.
   * Returns whether any batch was committed (JS convention).
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Quad and ring buffers become deferred descriptors the engine realizes; Carbon binds live AL buffers here.")
  GetBatches(batchType, accumulator)
  {
    let committed = false;
    for (const record of this.#effects.values())
    {
      if (!record.count || record.batchType !== batchType)
      {
        continue;
      }
      const batch = typeof accumulator?.Allocate === "function"
        ? accumulator.Allocate(Tr2RenderBatch)
        : new Tr2RenderBatch();
      batch.SetMaterial(record.effect);
      batch.SetGeometry(record.definition, Tr2QuadRenderer.QuadVertexSource, 4, Tr2QuadRenderer.QuadIndexSource, 2);
      batch.SetStreamSource(1, {
        quadInstanceData: this.#mergedData,
        byteOffset: record.bufferOffset,
        instanceSize: record.instanceSize
      }, record.instanceSize);
      batch.SetDrawIndexedInstanced(
        6 * record.quadCount,
        record.count,
        0,
        0,
        record.instanceSize ? (this.vertexBufferOffset + record.bufferOffset) / record.instanceSize : 0
      );
      committed = (accumulator?.Commit?.(batch) === true) || committed;
    }
    return committed;
  }

  /**
   * The per-instance byte size an engine allocates for a registered effect.
   */
  @carbon.method
  @impl.implemented
  GetInstanceDataSize()
  {
    return this.lastInstanceDataSize;
  }

  /** The frame's merged CPU instance buffer for the engine uploader. */
  GetMergedData()
  {
    return this.#mergedData;
  }

  /** The largest quadCount among live records (quad IB sizing). */
  GetMaxQuadCount()
  {
    return this.#maxQuadCount;
  }

  /** The registered effect records (engine declaration resolution). */
  GetEffectRecords()
  {
    return this.#effects;
  }

  /** Carbon Tr2QuadRenderer::Instance - the scene-global singleton. */
  static Instance()
  {
    if (!Tr2QuadRenderer.#instance)
    {
      Tr2QuadRenderer.#instance = new Tr2QuadRenderer();
    }
    return Tr2QuadRenderer.#instance;
  }

  /**
   * Rounds an offset up to the next multiple of an alignment.
   */
  static #Align(offset, alignment)
  {
    return Math.ceil(offset / alignment) * alignment;
  }

  /**
   * The lowest common multiple of two sizes, used to align a shared instance stride.
   */
  static #Lcm(a, b)
  {
    const gcd = (x, y) => (y ? gcd(y, x % y) : x);
    return (a * b) / gcd(a, b);
  }

  static #instance = null;

  /** Deferred descriptor for the engine-owned shared quad vertex buffer. */
  static QuadVertexSource = Object.freeze({ quadRendererBuffer: "quad-vertices" });

  /** Deferred descriptor for the engine-owned shared quad index buffer. */
  static QuadIndexSource = Object.freeze({ quadRendererBuffer: "quad-indices" });

  static TriBatchType = TriBatchType;

}
