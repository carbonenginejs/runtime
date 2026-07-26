import { RawData, RawDataType } from './RawData.js';

// Factory + arena for RawData constant-data payloads.
//
// A store is PER-ENGINE (one CjsLibrary = one live backend). It is built with a
// packer (the backend's physical layout rules) and structs are REGISTERED on
// the instance - registration resolves each struct through the packer right
// then, so a struct the engine cannot pack fails loud at registration, naming
// it. The engine must supply a packer for every registered struct; there is no
// silent fallback and no built-in default packer - the consumer always brings
// its own (an engine, or a trivial tight packer in tests).
//
// THE PACKER CONTRACT (the engine-facing duck):
//
//   ResolveLayout(structName, normalizedDef) -> {
//     fields: { [name]: { offset, size, elements, encoding } },  // float offsets
//     stride: number                                             // floats/instance
//   }
//
// `structName` lets a reflection-based engine packer key its per-struct shader
// layout by name (a generic packer ignores it). Offsets are FLOAT offsets
// relative to one instance's slot (the same offset indexes the Float32 and
// Uint32 views). A packer that cannot lay out a struct must throw or return
// null - the store treats that as "not covered" and fails loud at
// RegisterStruct. Trinity owns the LOGICAL shape (names/sizes/encoding kinds);
// the packer owns the PHYSICAL layout (offsets/padding), which is backend-
// specific (WebGL sets uniforms individually; a WebGPU UBO applies std140), so
// Trinity never computes offsets.
//
// Allocation is an ARENA (bump), not a free-list:
//   - Alloc(name) bumps a cursor and returns a view ("snip off what you need")
//     into a RETAINED backing buffer - the buffer is NOT recreated per frame.
//   - Reset() rewinds the cursor; every slot is freed at once, O(1); the
//     chunks are kept and reused next frame.
//   - There is no Unalloc: transient slots live until their batch dispatches,
//     so Reset is the only free. Permanent per-object data is not Alloc'd - a
//     static placeable constructs its own RawData and owns it across frames.
//
// Maps to Carbon: Alloc == accumulator.Allocate (Tr2Renderer::GetPoolAllocator,
// reset per frame). No clear-on-Alloc, so an unwritten field shows the previous
// tenant's bytes - that reproduces Carbon's "unwritten slots = allocator
// garbage" (declared defaults are re-applied on Alloc; everything else is
// write-what-you-rely-on).
//
// Design: PER-OBJECT-DATA-DESIGN-2026-07-24.md

/** Registers constant-data struct shapes and leases packed payloads from a per-engine arena. */
class RawDataStore {
  /** The engine's packer (physical offsets/padding). Required. */
  #packer = null;

  /** Registered layouts: name -> { fields, stride, defaults }. */
  #layouts = new Map();

  /** Retained arena chunks (Float32) and their Uint32 aliases. */
  #chunks = [];
  #chunkAliases = [];

  /** Floats per chunk; also the largest struct a single Alloc may request. */
  #chunkFloats = 8192;
  #chunkIndex = 0;
  #cursor = 0;

  /**
   * @param {object} packer - the backend packer (has ResolveLayout(name, def)).
   *   REQUIRED - the store ships no default; a store with no packer cannot lay
   *   out any struct.
   * @param {object} [options]
   * @param {number} [options.chunkFloats] - arena chunk size in floats.
   */
  constructor(packer, options = {}) {
    if (!packer || typeof packer.ResolveLayout !== "function") {
      throw new Error("RawDataStore needs a packer with ResolveLayout(name, def)");
    }
    this.#packer = packer;
    if (Number.isInteger(options.chunkFloats) && options.chunkFloats > 0) {
      this.#chunkFloats = options.chunkFloats;
    }
    this.#AddChunk();
  }

  /**
   * Register several structs at once: { StructName: def, ... }. Each value is a
   * field-def array (see RegisterStruct) or { def, stages } when the struct
   * binds anywhere other than the default vertex-stage slot. Returns the store
   * for chaining.
   */
  Register(structs) {
    for (const name of Object.keys(structs)) {
      const entry = structs[name];
      if (Array.isArray(entry)) {
        this.RegisterStruct(name, entry);
      } else {
        this.RegisterStruct(name, entry.def, {
          stages: entry.stages
        });
      }
    }
    return this;
  }

  /**
   * Register one struct and RESOLVE it through the packer immediately. `def` is
   * an array of field defs: { name, encoding, size, elements?, default? }, where
   * `size` may instead be a defaults ARRAY whose length is the size. Throws -
   * naming the struct - if the packer supplies no layout for it (the engine must
   * cover every struct). Returns the store for chaining.
   *
   * `options.stages` declares which per-object constant slots the payload binds
   * (default ["vs"]). This is Carbon-SEMANTIC knowledge - which
   * FillAndSetConstants calls exist for the struct - so it travels with the def,
   * not the packer: ["vs"] a vertex-stage payload, ["ps"] a pixel payload (one
   * half of a { vs, ps } record), ["vs", "ps"] the SAME bytes bound to both
   * slots (sphere pin, lensflare). The engine reads it from GetLayout().stages.
   */
  RegisterStruct(name, def, options = {}) {
    const normalized = RawDataStore.normalizeDef(def);
    const stages = RawDataStore.normalizeStages(name, options.stages);
    let resolved;
    try {
      resolved = this.#packer.ResolveLayout(name, normalized);
    } catch (error) {
      throw new Error(`RawDataStore: packer failed to lay out struct "${name}": ${error.message}`);
    }
    if (!resolved || !resolved.fields || !Number.isFinite(resolved.stride)) {
      throw new Error(`RawDataStore: packer supplied no layout for struct "${name}" (the engine must pack every registered struct)`);
    }
    if (resolved.stride > this.#chunkFloats) {
      throw new Error(`RawDataStore: struct "${name}" (${resolved.stride} floats) exceeds the chunk size (${this.#chunkFloats})`);
    }
    const defaults = [];
    for (const field of normalized) {
      if (field.default) {
        const entry = resolved.fields[field.name];
        if (entry) {
          defaults.push({
            offset: entry.offset,
            values: field.default
          });
        }
      }
    }
    this.#layouts.set(name, {
      fields: resolved.fields,
      stride: resolved.stride,
      defaults,
      stages
    });
    return this;
  }

  /** Whether a struct has been registered on this store. */
  Has(name) {
    return this.#layouts.has(name);
  }

  /**
   * Lease a TRANSIENT payload for a registered struct. Bumps the arena and
   * returns a RawData view over the next slot, with declared defaults applied.
   * Valid until the next Reset().
   */
  Alloc(name) {
    const layout = this.#layouts.get(name);
    if (!layout) {
      throw new Error(`RawDataStore: struct "${name}" is not registered on this store (call Register/RegisterStruct first)`);
    }
    const stride = layout.stride;
    if (this.#cursor + stride > this.#chunkFloats) {
      this.#chunkIndex++;
      this.#cursor = 0;
      if (this.#chunkIndex >= this.#chunks.length) {
        this.#AddChunk();
      }
    }
    const start = this.#cursor;
    this.#cursor += stride;
    const floats = this.#chunks[this.#chunkIndex].subarray(start, start + stride);
    const uints = this.#chunkAliases[this.#chunkIndex].subarray(start, start + stride);
    for (const preset of layout.defaults) {
      const values = preset.values;
      for (let index = 0; index < values.length; index++) {
        floats[preset.offset + index] = values[index];
      }
    }
    return new RawData(layout, floats, uints);
  }

  /**
   * Free every transient slot at once (frame end). Rewinds the arena cursor;
   * the backing chunks are RETAINED and reused - nothing is reallocated.
   */
  Reset() {
    this.#chunkIndex = 0;
    this.#cursor = 0;
  }

  /**
   * Appends a fresh arena chunk of chunkFloats floats plus a Uint32 alias view
   * over the same bytes, so payload fields can be written as floats or raw bits.
   */
  #AddChunk() {
    const chunk = new Float32Array(this.#chunkFloats);
    this.#chunks.push(chunk);
    this.#chunkAliases.push(new Uint32Array(chunk.buffer));
  }

  /** The field encoding kinds (packing directives). */
  static Type = RawDataType;

  /** The per-object binding slots a struct may declare via options.stages. */
  static Stages = Object.freeze(["vs", "ps", "gs", "cs", "hs", "ds"]);

  /**
   * Validate a stages declaration: a non-empty array drawn from
   * RawDataStore.Stages, no duplicates. Defaults to ["vs"] (Carbon's most
   * common single-payload binding). Returns a frozen copy.
   */
  static normalizeStages(structName, stages) {
    if (stages === undefined || stages === null) {
      return RawDataStore.defaultStages;
    }
    if (!Array.isArray(stages) || !stages.length) {
      throw new Error(`RawDataStore: struct "${structName}" stages must be a non-empty array`);
    }
    for (const stage of stages) {
      if (!RawDataStore.Stages.includes(stage)) {
        throw new Error(`RawDataStore: struct "${structName}" has unknown stage "${stage}" (expected one of: ${RawDataStore.Stages.join(", ")})`);
      }
    }
    if (new Set(stages).size !== stages.length) {
      throw new Error(`RawDataStore: struct "${structName}" declares a duplicate stage`);
    }
    return Object.freeze([...stages]);
  }
  static defaultStages = Object.freeze(["vs"]);

  /**
   * Normalize a raw def: default elements to 1, resolve size-as-defaults-array,
   * require a name and encoding. Physical offsets are NOT computed here - that
   * is the packer's job.
   */
  static normalizeDef(def) {
    return def.map(field => {
      if (!field.name) {
        throw new Error("RawDataStore: every struct field needs a name");
      }
      if (!field.encoding) {
        throw new Error(`RawDataStore: field "${field.name}" needs an encoding (RawDataStore.Type.*)`);
      }
      let size = field.size;
      let defaultValue = field.default ?? null;
      if (Array.isArray(size)) {
        defaultValue = size;
        size = size.length;
      }
      if (!Number.isInteger(size) || size <= 0) {
        throw new Error(`RawDataStore: field "${field.name}" needs a positive integer size`);
      }
      return {
        name: field.name,
        elements: Number.isInteger(field.elements) && field.elements > 0 ? field.elements : 1,
        size,
        encoding: field.encoding,
        default: defaultValue
      };
    });
  }

  /**
   * Build a per-engine store. `engine` must expose a packer - itself (has
   * ResolveLayout), or via GetRawDataPacker()/rawDataPacker. Throws if none:
   * the engine MUST supply a packer.
   */
  static from(engine, options = {}) {
    const packer = typeof engine?.ResolveLayout === "function" ? engine : engine?.GetRawDataPacker?.() ?? engine?.rawDataPacker ?? null;
    if (!packer) {
      throw new Error("RawDataStore.from: the engine supplied no packer (needs ResolveLayout / GetRawDataPacker / rawDataPacker)");
    }
    return new RawDataStore(packer, options);
  }
}

export { RawDataStore };
//# sourceMappingURL=RawDataStore.js.map
