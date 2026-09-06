// Factory + arena for RawData constant-data payloads.
//
// Carbon TriPoolAllocator (TriPoolAllocator.h/.cpp): the same names, job,
// lifetime and per-frame Clear. Carbon bump-allocates with placement new and
// wholesale Clear()s at EndRenderContext (Tr2Renderer.cpp:1072-1081) - Clear
// carries the adaptive halve/grow footprint policy, ported exactly. The
// struct-layout registry stands in for what C++ gets free from the type
// system via Allocate<T>().
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
//   - Allocate(name) bumps a cursor and returns a view ("snip off what you
//     need") into the active pool, growing through GetMoreSystemMemory.
//   - Clear() frees every slot at once, O(1), and adapts the pool's footprint
//     to the frame that just ended (Carbon cpp:49-95).
//   - There is no Unalloc: transient slots live until their batch dispatches,
//     so Clear is the only free. Permanent per-object data is not Allocate'd -
//     a static placeable constructs its own RawData and owns it across frames.
//
// No clear-on-Allocate, so an unwritten field can show the previous tenant's
// bytes - Carbon's "unwritten slots = allocator garbage" (declared defaults
// are re-applied on Allocate; everything else is write-what-you-rely-on).
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

  // Carbon's pool shape (TriPoolAllocator.h:38-49): ONE active pool, a list of
  // overflow pools from mid-frame growth, and an adaptive chunk size. Ours in
  // floats rather than bytes; the Uint32 alias view rides the same buffer so
  // payload fields can be written as floats or raw bits.

  /** m_pool - the active arena (null until first use, and after a resize). */
  #pool = null;

  #poolUints = null;

  /** m_previousPools - overflow pools; retained so leased views stay alive. */
  #previousPools = [];

  /** m_chunkSize (ctor 256KB, cpp:12) - adaptive; ours defaults smaller. */
  #chunkFloats = 8192;

  #cursor = 0;

  /** m_totalBytesAllocated, in floats; drives Clear's resize policy. */
  #totalFloatsAllocated = 0;

  /**
   * @param {object} [options]
   * @param {number} [options.chunkFloats] - initial arena chunk size in floats.
   */
  constructor(options = {})
  {
    if (Number.isInteger(options.chunkFloats) && options.chunkFloats > 0)
    {
      this.#chunkFloats = options.chunkFloats;
    }
  }

  // C++ needs no registration step: Allocate<T>() resolves the layout from the
  // type system, so every Carbon struct is allocatable the moment the pool
  // exists. The frame pool reproduces that by registering the whole catalog
  // when it is created (Tr2RenderContext, matching Carbon's pool creation in
  // Tr2Renderer::Initialize), which keeps struct registration a Trinity concern
  // rather than an engine one - Trinity owns the offsets (docs/architecture.md,
  // constant-data ownership). An ad-hoc struct outside the catalog, and a pool
  // sized too small to hold one, still registers explicitly.

  /**
   * Registers every struct in `CjsPerObjectLayouts` with its declared layout;
   * returns the store for chaining.
   */
  RegisterCatalog()
  {
    for (const name of CjsPerObjectLayouts.Names())
    {
      this.RegisterStruct(name);
    }

    return this;
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
    // No size gate here: a struct larger than the chunk is served by
    // GetMoreSystemMemory requesting whole chunk multiples (cpp:102-107).
    const resolved = catalogLayout(name) ?? tightLayout(normalized);

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
   * Lease a TRANSIENT payload for a registered struct - Carbon Allocate
   * (TriPoolAllocator.cpp:26-47, plus the typed Allocate<T> wrapper at
   * h:19-30; the layout registry stands in for the C++ type system). Aligns
   * the slot to 16 bytes exactly as Carbon aligns every size, bumps the
   * cursor, grows through GetMoreSystemMemory on overflow, and accrues
   * m_totalBytesAllocated for Clear's resize policy. The returned RawData
   * view has declared defaults applied and is valid until the next Clear().
   */
  Allocate(name)
  {
    const layout = this.#layouts.get(name);

    if (!layout)
    {
      throw new Error(`TriPoolAllocator: struct "${name}" is not registered on this store (call Register/RegisterStruct first)`);
    }

    // CCP_ALIGN(size, 16) (cpp:30): 16 bytes is 4 floats, and an aligned base
    // plus aligned sizes keeps every slot aligned.
    const stride = (layout.stride + 3) & ~3;

    if (!this.#pool || this.#cursor + stride > this.#pool.length)
    {
      this.#GetMoreSystemMemory(stride);
    }

    const start = this.#cursor;
    this.#cursor += stride;
    this.#totalFloatsAllocated += stride;

    const floats = this.#pool.subarray(start, start + layout.stride);
    const uints = this.#poolUints.subarray(start, start + layout.stride);

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
   * Frame-end clear - Carbon Clear (TriPoolAllocator.cpp:49-95), the
   * load-bearing half of the allocator: free the overflow pools, then ADAPT.
   * A frame that used less than half the active pool frees it and halves the
   * chunk size; one that outgrew the chunk frees it and grows the chunk to
   * the frame's total; a right-sized pool is kept and merely rewound. Both
   * resize arms round the new chunk size up past the next 256-byte multiple
   * with Carbon's exact >>=8; +=1; <<=8 arithmetic.
   *
   * Consequence callers rely on: only the KEEP arm preserves the backing
   * buffer (and therefore last frame's stale bytes); after a resize the next
   * Allocate sees fresh zeroed memory. Both are "allocator garbage" under
   * the write-what-you-rely-on contract - Carbon behaves identically.
   */
  Clear()
  {
    this.#previousPools.length = 0;

    const currentChunkFloats = this.#pool ? this.#pool.length : 0;

    if (this.#totalFloatsAllocated < currentChunkFloats / 2)
    {
      // Pool is too large - free it and shrink the chunk size (cpp:63-73).
      this.#pool = this.#poolUints = null;
      this.#chunkFloats = TriPoolAllocator.#RoundChunkFloats(currentChunkFloats / 2);
    }
    else if (this.#totalFloatsAllocated > this.#chunkFloats)
    {
      // Pool is too small - free it and grow the chunk size (cpp:74-84).
      this.#pool = this.#poolUints = null;
      this.#chunkFloats = TriPoolAllocator.#RoundChunkFloats(this.#totalFloatsAllocated);
    }
    else
    {
      // Right-sized: rewind and reuse (cpp:85-92).
      this.#cursor = 0;
    }

    this.#totalFloatsAllocated = 0;
  }

  /**
   * Carbon GetMoreSystemMemory (TriPoolAllocator.cpp:97-127): retire the
   * active pool to the overflow list and allocate whole chunk-size multiples
   * until the request fits. JS allocation does not fail, so Carbon's
   * null-pool arm has nothing to port.
   */
  #GetMoreSystemMemory(strideFloats)
  {
    if (this.#pool)
    {
      this.#previousPools.push(this.#pool);
    }

    let request = this.#chunkFloats;
    while (request < strideFloats)
    {
      request += this.#chunkFloats;
    }

    this.#pool = new Float32Array(request);
    this.#poolUints = new Uint32Array(this.#pool.buffer);
    this.#cursor = 0;
  }

  /**
   * Carbon's chunk-size rounding (cpp:68-71): in bytes, shift out the low
   * eight bits, add one, shift back - always rounding UP past the next
   * 256-byte boundary. Floored at one 256-byte step.
   */
  static #RoundChunkFloats(floats)
  {
    let bytes = Math.max(0, Math.floor(floats)) * 4;
    bytes = ((bytes >> 8) + 1) << 8;
    return bytes / 4;
  }

  /** The field encoding kinds (packing directives). */
  static Type = RawDataType;

  // Declared in Carbon's ShaderType order (trinityal/Tr2RenderContextEnum.h:31-43:
  // VERTEX, PIXEL, COMPUTE, GEOMETRY, HULL, DOMAIN) so the position of a stage
  // in this list is its shader-type bit. This list previously had gs and cs
  // transposed, which was inert while nothing joined a stage to a bitmask, and
  // wrong the moment something did. Bit positions are declared explicitly in
  // Tr2PerObjectData.StageBits rather than derived from this order.

  /** The per-object binding slots a struct may declare via options.stages. */
  static Stages = Object.freeze(["vs", "ps", "cs", "gs", "hs", "ds"]);

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

    return [...stages];
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
