import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { Tr2RenderBatch } from './Tr2RenderBatch.js';

let _initProto, _initClass, _init_vertexBufferOffset, _init_extra_vertexBufferOffset, _init_lastInstanceDataSize, _init_extra_lastInstanceDataSize, _init_bufferAlignment, _init_extra_bufferAlignment, _init_bufferSize, _init_extra_bufferSize;

/** One registered quad effect (Carbon Tr2QuadRenderer::EffectRecord). */
class Tr2QuadRendererEffectRecord {
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
let _Tr2QuadRenderer;
new class extends _identity {
  static [class Tr2QuadRenderer extends CjsModel {
    static {
      ({
        e: [_init_vertexBufferOffset, _init_extra_vertexBufferOffset, _init_lastInstanceDataSize, _init_extra_lastInstanceDataSize, _init_bufferAlignment, _init_extra_bufferAlignment, _init_bufferSize, _init_extra_bufferSize, _initProto],
        c: [_Tr2QuadRenderer, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2QuadRenderer",
        family: "trinityCore"
      })], [[[type, type.uint32], 16, "vertexBufferOffset"], [[type, type.uint32], 16, "lastInstanceDataSize"], [[type, type.uint32], 16, "bufferAlignment"], [[type, type.uint32], 16, "bufferSize"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterEffect"], [[carbon, carbon.method, impl, impl.implemented], 18, "UnregisterEffect"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Single-threaded JS collapses the per-thread TLS buffers to one pending list; bytes stay float32-typed.")], 18, "AddQuads"], [[carbon, carbon.method, impl, impl.implemented], 18, "MergeBuffers"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("UpdateInstanceBuffer/RecreateQuadBuffers/PrepareResources are GPU realization; the merged CPU state is exposed for the engine.")], 18, "BeginRendering"], [[carbon, carbon.method, impl, impl.implemented], 18, "DoneRendering"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Quad and ring buffers become deferred descriptors the engine realizes; Carbon binds live AL buffers here.")], 18, "GetBatches"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetInstanceDataSize"]], 0, void 0, CjsModel));
    }
    /** m_vertexBufferOffset (uint32_t) - ring offset; engine stamps the real one. */
    vertexBufferOffset = (_initProto(this), _init_vertexBufferOffset(this, 0));

    /** m_lastInstanceDataSize (uint32_t) */
    lastInstanceDataSize = (_init_extra_vertexBufferOffset(this), _init_lastInstanceDataSize(this, 0));

    /** m_bufferAlignment (uint32_t) - lcm of registered instance sizes. */
    bufferAlignment = (_init_extra_lastInstanceDataSize(this), _init_bufferAlignment(this, 4));

    /** m_bufferSize - bytes accumulated this frame across all records. */
    bufferSize = (_init_extra_bufferAlignment(this), _init_bufferSize(this, 0));

    /** m_effects - EffectKey -> Tr2QuadRendererEffectRecord. */
    #effects = (_init_extra_bufferSize(this), new Map());

    /** The merged CPU instance buffer for the frame (Float32Array). */
    #mergedData = null;

    /** Largest quadCount among records with instances (RecreateQuadBuffers input). */
    #maxQuadCount = 0;

    /**
     * Registers a quad effect once per key (Carbon Tr2QuadRenderer.cpp:30-53).
     * instanceSize is in bytes; the buffer alignment grows to the lcm of all
     * registered instance sizes.
     */
    RegisterEffect(key, batchType, instanceSize, quadCount, definition, effect) {
      if (this.#effects.has(key)) {
        return;
      }
      const record = new Tr2QuadRendererEffectRecord();
      record.effect = effect ?? null;
      record.batchType = batchType;
      record.instanceSize = instanceSize >>> 0;
      record.quadCount = quadCount >>> 0;
      record.definition = definition ?? null;
      this.#effects.set(key, record);
      this.bufferAlignment = _Tr2QuadRenderer.#Lcm(this.bufferAlignment, record.instanceSize || 1);
    }

    /**
     * Drops a registered effect and the quads accumulated for it.
     */
    UnregisterEffect(key) {
      this.#effects.delete(key);
    }

    /**
     * Accumulates instance data for a registered effect (Carbon cpp:60-79).
     * Accepts float data (Float32Array or number[]) covering
     * count * instanceSize bytes; unknown keys are ignored like Carbon.
     */
    AddQuads(effectKey, sprites, count = 1) {
      const record = this.#effects.get(effectKey);
      if (!record || !sprites) {
        return;
      }
      const size = count * record.instanceSize;
      const floats = new Float32Array(size / 4);
      const source = sprites;
      for (let index = 0; index < floats.length; index++) {
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
    MergeBuffers() {
      let padded = this.bufferSize;
      for (const record of this.#effects.values()) {
        padded += record.instanceSize;
      }
      const merged = new Float32Array(Math.ceil(padded / 4));
      let offset = 0;
      let quadCount = 0;
      for (const record of this.#effects.values()) {
        offset = _Tr2QuadRenderer.#Align(offset, record.instanceSize || 1);
        record.bufferOffset = offset;
        for (const chunk of record.pending) {
          merged.set(chunk, offset / 4);
          offset += chunk.length * 4;
        }
        record.pending.length = 0;
        record.addedSize = 0;
        record.count = record.instanceSize ? (offset - record.bufferOffset) / record.instanceSize : 0;
        if (record.count) {
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
    BeginRendering(_renderContext = null) {
      const quadCount = this.MergeBuffers();
      this.lastInstanceDataSize = this.bufferSize;
      return quadCount;
    }

    /** Frame-end reset (Carbon cpp:55-58). */
    DoneRendering(_renderContext = null) {
      this.bufferSize = 0;
    }

    /**
     * Emits one instanced batch per live record of the requested type
     * (Carbon cpp:188-207). The quad vertex/index buffers are shared engine
     * resources, carried as descriptors on the batch; startInstanceLocation
     * derives from the ring offset + record offset exactly like Carbon.
     * Returns whether any batch was committed (JS convention).
     */
    GetBatches(batchType, accumulator) {
      let committed = false;
      for (const record of this.#effects.values()) {
        if (!record.count || record.batchType !== batchType) {
          continue;
        }
        const batch = typeof accumulator?.Allocate === "function" ? accumulator.Allocate(Tr2RenderBatch) : new Tr2RenderBatch();
        batch.SetMaterial(record.effect);
        batch.SetGeometry(record.definition, _Tr2QuadRenderer.QuadVertexSource, 4, _Tr2QuadRenderer.QuadIndexSource, 2);
        batch.SetStreamSource(1, {
          quadInstanceData: this.#mergedData,
          byteOffset: record.bufferOffset,
          instanceSize: record.instanceSize
        }, record.instanceSize);
        batch.SetDrawIndexedInstanced(6 * record.quadCount, record.count, 0, 0, record.instanceSize ? (this.vertexBufferOffset + record.bufferOffset) / record.instanceSize : 0);
        committed = accumulator?.Commit?.(batch) === true || committed;
      }
      return committed;
    }

    /**
     * The per-instance byte size an engine allocates for a registered effect.
     */
    GetInstanceDataSize() {
      return this.lastInstanceDataSize;
    }

    /** The frame's merged CPU instance buffer for the engine uploader. */
    GetMergedData() {
      return this.#mergedData;
    }

    /** The largest quadCount among live records (quad IB sizing). */
    GetMaxQuadCount() {
      return this.#maxQuadCount;
    }

    /** The registered effect records (engine declaration resolution). */
    GetEffectRecords() {
      return this.#effects;
    }

    /** Carbon Tr2QuadRenderer::Instance - the scene-global singleton. */
    static Instance() {
      if (!_Tr2QuadRenderer.#instance) {
        _Tr2QuadRenderer.#instance = new _Tr2QuadRenderer();
      }
      return _Tr2QuadRenderer.#instance;
    }

    /**
     * Rounds an offset up to the next multiple of an alignment.
     */

    /**
     * The lowest common multiple of two sizes, used to align a shared instance stride.
     */

    /** Deferred descriptor for the engine-owned shared quad vertex buffer. */

    /** Deferred descriptor for the engine-owned shared quad index buffer. */
  }];
  #Align(offset, alignment) {
    return Math.ceil(offset / alignment) * alignment;
  }
  #Lcm(a, b) {
    const gcd = (x, y) => y ? gcd(y, x % y) : x;
    return a * b / gcd(a, b);
  }
  #instance = null;
  QuadVertexSource = Object.freeze({
    quadRendererBuffer: "quad-vertices"
  });
  QuadIndexSource = Object.freeze({
    quadRendererBuffer: "quad-indices"
  });
  TriBatchType = Object.freeze({
    TRIBATCHTYPE_OPAQUE: 0,
    TRIBATCHTYPE_DECAL: 1,
    TRIBATCHTYPE_TRANSPARENT: 2,
    TRIBATCHTYPE_DEPTH: 3,
    TRIBATCHTYPE_ADDITIVE: 4,
    TRIBATCHTYPE_PICKING: 5,
    TRIBATCHTYPE_MIRROR: 6,
    TRIBATCHTYPE_DECALNORMAL: 7,
    TRIBATCHTYPE_DEPTHNORMAL: 8,
    TRIBATCHTYPE_OPAQUE_PREPASS: 9,
    TRIBATCHTYPE_DECAL_PREPASS: 10,
    TRIBATCHTYPE_GEOMETRY_ERASER: 11,
    TRIBATCHTYPE_FLARE: 12,
    TRIBATCHTYPE_DISTORTION: 13,
    TRIBATCHTYPE_COUNT_OF_BATCH_TYPES: 14
  });
  constructor() {
    super(_Tr2QuadRenderer), _initClass();
  }
}();

export { _Tr2QuadRenderer as Tr2QuadRenderer, Tr2QuadRendererEffectRecord };
//# sourceMappingURL=Tr2QuadRenderer.js.map
