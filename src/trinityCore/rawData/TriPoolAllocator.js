// Factory + arena for RawData constant-data payloads.
//
// Named for Carbon TriPoolAllocator (TriPoolAllocator.h/.cpp): the same job,
// lifetime and per-frame Clear. Carbon bump-allocates with placement new and
// wholesale Clear()s at EndRenderContext (Tr2Renderer.cpp:1072-1081), which is
// exactly what Alloc/Reset do here. It also carries the struct-layout registry,
// which C++ gets free from the type system via Allocate<T>().
//
// A pool is PER-ENGINE (one CjsLibrary = one live backend). Structs are
// REGISTERED on the instance - registration resolves each struct's layout right
// then, so a struct that cannot be laid out fails loud at registration, naming
// it.
//
// TRINITY COMPUTES THE OFFSETS. This once required an engine-injected packer,
// on the premise that the physical layout is BACKEND-SPECIFIC. That premise is
// false for these buffers, verified 2026-07-28: every backend declares them as
// a flat array of vec4 - WGSL `array<vec4<f32>, N>`, GLSL `vec4 cbN[N]`, or a
// std140 block wrapping `vec4 data[N]` - and std140's stride for an array of
// vec4 is 16 bytes, identical to tight C++ packing. The std140 rules that DO
// diverge (vec3 padded to 16, scalar array stride) never engage, because there
// are no struct members to pad: the translated shader indexes the flat array
// and reassembles fields itself.
//
// Layouts resolve from two sources, in order:
//
//   1. CjsPerObjectLayouts, when the struct name is a Carbon struct. Those
//      offsets are declared, not derived, because Carbon memcpy's the C++
//      struct (EveSpaceObject2.cpp:1469-1483) and its members sit on float4
//      boundaries - tight-packing a FLOAT member would drift from it.
//   2. tight packing of the supplied def, for an ad-hoc struct the catalog
//      does not carry.
//
// Offsets are FLOAT offsets relative to one instance's slot (the same offset
// indexes the Float32 and Uint32 views).
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
import { RawData, RawDataType } from "./RawData.js";
import { CjsPerObjectLayouts } from "./CjsPerObjectLayouts.js";


/** Declared catalog type -> the encoder kind that writes its bytes. */
const CATALOG_ENCODINGS = {
  [CjsPerObjectLayouts.Types.MATRIX4]: RawDataType.MATRIX,
  [CjsPerObjectLayouts.Types.UINT32]: RawDataType.UINT,
  [CjsPerObjectLayouts.Types.INT32]: RawDataType.INT
};


/**
 * A catalog layout as a store field-def array.
 *
 * A default on an array field is repeated across every element: the store
 * applies each default at a single offset, and Carbon's neutral for a slot
 * (identity for an unused custom mask) applies to every slot, not just the
 * first.
 */
function catalogDef(layout)
{
  const def = [];

  for (const field of layout.fields.values())
  {
    let value = null;

    if (field.default)
    {
      value = field.count > 1
        ? Array.from({ length: field.count }, () => [ ...field.default ]).flat()
        : [ ...field.default ];
    }

    def.push({
      name: field.name,
      size: field.size,
      elements: field.count,
      encoding: CATALOG_ENCODINGS[field.type] ?? RawDataType.VECTOR,
      default: value
    });
  }

  return def;
}


/**
 * Carbon's declared layout for a struct, or null when the catalog omits it.
 */
function catalogLayout(structName)
{
  const layout = CjsPerObjectLayouts.Get(structName);

  if (!layout)
  {
    return null;
  }

  const fields = {};

  for (const field of layout.fields.values())
  {
    fields[field.name] = {
      offset: field.offset,
      size: field.size,
      elements: field.count,
      encoding: CATALOG_ENCODINGS[field.type] ?? RawDataType.VECTOR
    };
  }

  return { fields, stride: layout.stride };
}


/**
 * Tight layout for an ad-hoc struct the catalog does not carry: fields in
 * declared order, no padding.
 */
function tightLayout(normalized)
{
  const fields = {};
  let offset = 0;

  for (const field of normalized)
  {
    fields[field.name] = {
      offset,
      size: field.size,
      elements: field.elements,
      encoding: field.encoding
    };
    offset += field.size * field.elements;
  }

  return { fields, stride: offset };
}


/** Registers constant-data struct shapes and leases packed payloads from a per-engine arena. */
export class TriPoolAllocator
{
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
   * @param {object} [options]
   * @param {number} [options.chunkFloats] - arena chunk size in floats.
   */
  constructor(options = {})
  {
    if (Number.isInteger(options.chunkFloats) && options.chunkFloats > 0)
    {
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
  Register(structs)
  {
    for (const name of Object.keys(structs))
    {
      const entry = structs[name];

      if (Array.isArray(entry))
      {
        this.RegisterStruct(name, entry);
      }
      else
      {
        this.RegisterStruct(name, entry.def, { stages: entry.stages });
      }
    }

    return this;
  }

  /**
   * Register one struct and RESOLVE its layout immediately. `def` is an array
   * of field defs: { name, encoding, size, elements?, default? }, where `size`
   * may instead be a defaults ARRAY whose length is the size. Omit `def`
   * entirely for a Carbon struct and the catalog supplies it. Returns the store
   * for chaining.
   *
   * `options.stages` declares which per-object constant slots the payload binds
   * (default ["vs"]). This is Carbon-SEMANTIC knowledge - which
   * FillAndSetConstants calls exist for the struct - so it travels with the def
   * rather than the layout: ["vs"] a vertex-stage payload, ["ps"] a pixel payload (one
   * half of a { vs, ps } record), ["vs", "ps"] the SAME bytes bound to both
   * slots (sphere pin, lensflare). The engine reads it from GetLayout().stages.
   */
  RegisterStruct(name, def, options = {})
  {
    if (def === undefined)
    {
      // No def supplied: take Carbon's, from the catalog.
      const layout = CjsPerObjectLayouts.Get(name);

      if (!layout)
      {
        throw new Error(
          `TriPoolAllocator: struct "${name}" is not in CjsPerObjectLayouts - add it there, or pass a def explicitly`
        );
      }

      def = catalogDef(layout);
      options = { ...options, stages: options.stages ?? layout.stages };
    }

    const normalized = TriPoolAllocator.normalizeDef(def);
    const stages = TriPoolAllocator.normalizeStages(name, options.stages);

    // Carbon's declared offsets win: its members sit on float4 boundaries, so
    // tight-packing them would drift the moment a struct carries a FLOAT.
    const resolved = catalogLayout(name) ?? tightLayout(normalized);

    if (resolved.stride > this.#chunkFloats)
    {
      throw new Error(`TriPoolAllocator: struct "${name}" (${resolved.stride} floats) exceeds the chunk size (${this.#chunkFloats})`);
    }

    const defaults = [];

    for (const field of normalized)
    {
      if (field.default)
      {
        const entry = resolved.fields[field.name];

        if (entry)
        {
          defaults.push({ offset: entry.offset, values: field.default });
        }
      }
    }

    this.#layouts.set(name, { fields: resolved.fields, stride: resolved.stride, defaults, stages });

    return this;
  }

  /** Whether a struct has been registered on this store. */
  Has(name)
  {
    return this.#layouts.has(name);
  }

  /**
   * Lease a TRANSIENT payload for a registered struct. Bumps the arena and
   * returns a RawData view over the next slot, with declared defaults applied.
   * Valid until the next Reset().
   */
  Alloc(name)
  {
    const layout = this.#layouts.get(name);

    if (!layout)
    {
      throw new Error(`TriPoolAllocator: struct "${name}" is not registered on this store (call Register/RegisterStruct first)`);
    }

    const stride = layout.stride;

    if (this.#cursor + stride > this.#chunkFloats)
    {
      this.#chunkIndex++;
      this.#cursor = 0;

      if (this.#chunkIndex >= this.#chunks.length)
      {
        this.#AddChunk();
      }
    }

    const start = this.#cursor;
    this.#cursor += stride;

    const floats = this.#chunks[this.#chunkIndex].subarray(start, start + stride);
    const uints = this.#chunkAliases[this.#chunkIndex].subarray(start, start + stride);

    for (const preset of layout.defaults)
    {
      const values = preset.values;

      for (let index = 0; index < values.length; index++)
      {
        floats[preset.offset + index] = values[index];
      }
    }

    return new RawData(layout, floats, uints, name);
  }

  /**
   * Free every transient slot at once (frame end). Rewinds the arena cursor;
   * the backing chunks are RETAINED and reused - nothing is reallocated.
   */
  Reset()
  {
    this.#chunkIndex = 0;
    this.#cursor = 0;
  }

  /**
   * Appends a fresh arena chunk of chunkFloats floats plus a Uint32 alias view
   * over the same bytes, so payload fields can be written as floats or raw bits.
   */
  #AddChunk()
  {
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
   * TriPoolAllocator.Stages, no duplicates. Defaults to ["vs"] (Carbon's most
   * common single-payload binding). Returns a frozen copy.
   */
  static normalizeStages(structName, stages)
  {
    if (stages === undefined || stages === null)
    {
      return TriPoolAllocator.defaultStages;
    }

    if (!Array.isArray(stages) || !stages.length)
    {
      throw new Error(`TriPoolAllocator: struct "${structName}" stages must be a non-empty array`);
    }

    for (const stage of stages)
    {
      if (!TriPoolAllocator.Stages.includes(stage))
      {
        throw new Error(`TriPoolAllocator: struct "${structName}" has unknown stage "${stage}" (expected one of: ${TriPoolAllocator.Stages.join(", ")})`);
      }
    }

    if (new Set(stages).size !== stages.length)
    {
      throw new Error(`TriPoolAllocator: struct "${structName}" declares a duplicate stage`);
    }

    return Object.freeze([...stages]);
  }

  static defaultStages = Object.freeze(["vs"]);

  /**
   * Normalize a raw def: default elements to 1, resolve size-as-defaults-array,
   * require a name and encoding. Physical offsets are NOT computed here - they
   * are resolved at registration, from the catalog or by tight packing.
   */
  static normalizeDef(def)
  {
    return def.map(field =>
    {
      if (!field.name)
      {
        throw new Error("TriPoolAllocator: every struct field needs a name");
      }

      if (!field.encoding)
      {
        throw new Error(`TriPoolAllocator: field "${field.name}" needs an encoding (TriPoolAllocator.Type.*)`);
      }

      let size = field.size;
      let defaultValue = field.default ?? null;

      if (Array.isArray(size))
      {
        defaultValue = size;
        size = size.length;
      }

      if (!Number.isInteger(size) || size <= 0)
      {
        throw new Error(`TriPoolAllocator: field "${field.name}" needs a positive integer size`);
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

}
