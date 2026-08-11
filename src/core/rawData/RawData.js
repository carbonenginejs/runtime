import { CjsPerFrameLayouts } from "./CjsPerFrameLayouts.js";
import { CjsPerObjectLayouts } from "./CjsPerObjectLayouts.js";


// GPU-free per-object / per-frame constant data.
//
// A RawData is a thin, write-mostly view over a slice of a packed constant
// buffer: name -> encoded bytes. It is NOT a CjsModel (no persistence, no
// reactivity) - it is GPU staging. Most records are leased per frame from the
// arena and consumed by the engine's uploader; a few are PERSISTENT, owned by
// an object across frames via RawData.create and marked with Invalidate.
//
// Why matrices are stored transposed: Carbon transposes every per-object matrix
// on its way to the GPU (`m_vsData.worldTransform = Transpose( m_worldTransform )`
// and every other PopulatePerObjectData), because HLSL constant buffers pack
// column_major by default while Carbon's Matrix is row-major. The requirement is
// the shader's, not a math-library artifact, so the port pays it identically.
//
// Verbs (name ALWAYS first - a keyed store, not a math op):
//   SetAndTranspose(name, value)   a MATRIX4 field; PERFORMS the transpose
//   GetTransposed(name)            a MATRIX4 field; returns what is stored
//   Set(name, value) / Get(name)   everything else; both throw on a matrix
//   Copy(name, out)                bytes OUT into a caller-owned buffer
//   ...Index(name, index, ...)     one element of an array field
//
// Every matrix is stored TRANSPOSED, so Set/Get refuse matrix fields and name
// the pair to use instead. The orientation is stated at the call site and
// checked at runtime rather than remembered. There is no SetRaw: its only two
// uses computed Inverse(Transpose(M)), which equals Transpose(Inverse(M)), so
// inverting the logical matrix gives the same bytes. See the
// carbon-math-conventions skill, F6.
//
// The indexed forms exist because Carbon fills arrays PARTIALLY - it writes
// m_turretTranslation[i] for VISIBLE turrets only, and the unwritten tail keeps
// whatever the arena held. A whole-array write would destroy that parity.
//
// Get returns a LIVE reference into the buffer, so writing through it is a
// zero-copy write. That is deliberate: Carbon hands out a raw pointer into
// m_psData for exactly this (EveSpaceObject2.cpp:1877-1883).
//
// MULTI-PAYLOAD RENDERABLES: Carbon's dominant composite shape is a distinct
// VS struct + PS struct uploaded as TWO constant buffers (turret, decal,
// booster, the Tr2PerObjectDataWithPersistentBuffers family). That is TWO
// Allocs here, returned from GetPerObjectData as a plain record:
//   { vs: store.Alloc("DecalVSPerObjectData"), ps: store.Alloc("DecalPSPerObjectData") }
// The batch pipeline threads the record through untouched. A payload bound to
// more than one stage from the SAME bytes (sphere pin, lensflare) stays ONE
// RawData whose struct is registered with stages: ["vs", "ps"] - the engine
// reads the binding from GetLayout().stages.

/**
 * The encoding KIND of a struct field - a packing directive, not a math type.
 * Selects which encoder writes the bytes. Constants (not bare strings) so a
 * typo throws at the lookup instead of silently packing wrong.
 */
export const RawDataType = Object.freeze({
  /** Square matrix, stored TRANSPOSED (HLSL column_major). N inferred from size. */
  MATRIX: "matrix",

  /** Straight copy - float / vec2 / vec3 / vec4. */
  VECTOR: "vector",

  /** Integer bit-cast into the float buffer's Uint32 lanes (e.g. bone offsets). */
  UINT: "uint",

  /**
   * SIGNED integer bit-cast (two's complement) - e.g. the interior lightCount.
   * Same bytes as UINT for non-negatives; kept distinct so a reflection-based
   * packer can type the lane i32 vs u32.
   */
  INT: "int",

  /**
   * mat4 packed column-stride into 12 floats (Carbon Float4x3; skill gotcha 7).
   *
   * No CATALOGUED struct has a Float4x3 field - Carbon's per-object structs
   * carry bone ring OFFSETS, not the palette itself - so this encoder is
   * currently exercised only by `test/raw-data.test.js`. It is kept rather than
   * removed because the packing rule it encodes is the one that shipped wrong
   * once already (row-stride instead of column-stride, invisible for identity
   * bones), and `Tr2GrannyAnimation` maintains exactly such a palette. If a
   * struct ever declares a Float4x3, this is the encoder it needs.
   */
  MATRIX_3X4: "matrix3x4"
});

/**
 * Encoders: (floats, uints, field, value) -> void. `field` is the resolved
 * layout entry { offset, size, elements, encoding } with offset RELATIVE to
 * the slice start (the views are already sliced to this struct's slot).
 * `size` is the DESTINATION footprint in floats per element.
 */
// Module scratch for wrapping a scalar write. Written and consumed inside one
// synchronous encoder call, so it never outlives the statement that filled it.
const SCALAR_SCRATCH = [0];


function SCALAR_SCRATCH_SET(value)
{
  SCALAR_SCRATCH[0] = value;

  return SCALAR_SCRATCH;
}


export const RawDataEncoders = Object.freeze({
  [RawDataType.MATRIX](floats, _uints, field, value)
  {
    const n = Math.sqrt(field.size);

    for (let element = 0; element < field.elements; element++)
    {
      const source = element * field.size;
      const destination = field.offset + element * field.size;

      // Transpose on the shared byte layout: buffer(r,c) = value(c,r). This is
      // exactly Carbon's `= Transpose(m)` staging fill.
      for (let row = 0; row < n; row++)
      {
        for (let column = 0; column < n; column++)
        {
          floats[destination + row * n + column] = value[source + column * n + row];
        }
      }
    }
  },

  [RawDataType.VECTOR](floats, _uints, field, value)
  {
    const total = field.size * field.elements;

    for (let index = 0; index < total; index++)
    {
      floats[field.offset + index] = value[index];
    }
  },

  [RawDataType.UINT](_floats, uints, field, value)
  {
    const total = field.size * field.elements;

    for (let index = 0; index < total; index++)
    {
      uints[field.offset + index] = value[index] >>> 0;
    }
  },

  [RawDataType.INT](_floats, uints, field, value)
  {
    const total = field.size * field.elements;

    // Uint32 assignment stores the two's-complement bit pattern, which is
    // exactly what a signed lane needs (-1 -> 0xFFFFFFFF).
    for (let index = 0; index < total; index++)
    {
      uints[field.offset + index] = value[index] | 0;
    }
  },

  [RawDataType.MATRIX_3X4](floats, _uints, field, value)
  {
    // Column-stride pack of a 16-float mat4 into 12 floats (size must be 12):
    // rows come from (v0,v4,v8,v12) / (v1,v5,v9,v13) / (v2,v6,v10,v14).
    for (let element = 0; element < field.elements; element++)
    {
      const source = element * 16;
      const destination = field.offset + element * field.size;

      for (let row = 0; row < 3; row++)
      {
        floats[destination + row * 4 + 0] = value[source + row + 0];
        floats[destination + row * 4 + 1] = value[source + row + 4];
        floats[destination + row * 4 + 2] = value[source + row + 8];
        floats[destination + row * 4 + 3] = value[source + row + 12];
      }
    }
  }
});

/**
 * A packed constant-data slice bound to a resolved layout. Instances are
 * handed out by a TriPoolAllocator (transient, arena-backed) or constructed
 * directly by an object that owns a persistent buffer.
 */
export class RawData
{
  /** Resolved layout: { fields: { name -> { offset, size, elements, encoding } }, stride }. */
  #layout = null;

  /** Float32 view of this struct's slot (offsets are relative to its start). */
  #floats = null;

  /** Uint32 view over the SAME bytes, for UINT lanes. */
  #uints = null;

  /** Whether the payload has changed since an uploader last matched it. */
  #dirty = true;

  /** Catalogued struct name, when this record was built from one. */
  #struct = null;

  /**
   * @param {object} layout - resolved layout for one struct
   * @param {Float32Array} floats - the slice (start = struct slot)
   * @param {Uint32Array} uints - Uint32 view over the same slice
   * @param {String} [struct] - catalogued struct name, when there is one
   */
  constructor(layout, floats, uints, struct = null)
  {
    this.#layout = layout;
    this.#floats = floats;
    this.#uints = uints;
    this.#struct = struct;
  }

  /** The catalogued struct name, or null for an ad-hoc record. */
  GetStruct()
  {
    return this.#struct;
  }

  /** Whether a field exists in the layout. */
  Has(name)
  {
    return Object.prototype.hasOwnProperty.call(this.#layout.fields, name);
  }

  /**
   * Resolve a field, optionally narrowed to ONE element of an array field.
   * The narrowed view shifts the offset by element * size and clamps
   * elements to 1, so every verb writes exactly one slot and the unwritten
   * tail keeps its arena bytes (Carbon's visible-turrets-only fill).
   */
  #Field(name, element)
  {
    const field = this.#layout.fields[name];

    if (!field)
    {
      throw new Error(`RawData: unknown field "${name}"`);
    }

    if (element === undefined)
    {
      return field;
    }

    if (!Number.isInteger(element) || element < 0 || element >= field.elements)
    {
      throw new Error(`RawData: element ${element} is out of range for field "${name}" (elements: ${field.elements})`);
    }

    return {
      offset: field.offset + element * field.size,
      size: field.size,
      elements: 1,
      encoding: field.encoding
    };
  }

  /**
   * Write a non-matrix LOGICAL value, encoded per the field's kind (UINT/INT
   * bit-cast, MATRIX_3X4 column-stride packs, VECTOR copies). Matrix fields
   * must use `SetAndTranspose*`. Pass `element` to write one array slot.
   */
  Set(name, value, element)
  {
    this.#NotMatrix(name, "Set");
    this.#Write(this.#Field(name, element), name, value);
  }

  /**
   * Copy a field's packed bytes OUT into a caller-owned buffer. Never returns
   * a reference into the payload. Debug / inspection only - the render path is
   * write-only. Pass `element` to copy one slot of an array field.
   */
  Copy(name, out, element)
  {
    const field = this.#Field(name, element);
    const total = field.size * field.elements;

    for (let index = 0; index < total; index++)
    {
      out[index] = this.#floats[field.offset + index];
    }

    return out;
  }

  /**
   * Write a matrix, transposing it into the buffer.
   *
   * Carbon stores every per-object matrix transposed (`m_vsData.worldTransform
   * = Transpose( m_worldTransform )`), so the record is GPU-form and terminal.
   * This method performs the transpose, which means a producer passes its
   * LOGICAL matrix and cannot forget the step; it also transposes straight into
   * the destination, so no scratch matrix is needed.
   *
   * Matrix fields only. See carbon-math-conventions F1/F6.
   */
  SetAndTranspose(name, value)
  {
    this.#AssertMatrix(name);
    this.#Write(this.#Field(name, undefined), name, value);
  }

  /** SetAndTranspose for one element of an array field, e.g. customMaskMatrix. */
  SetAndTransposeIndex(name, index, value)
  {
    this.#AssertMatrix(name);
    this.#Write(this.#Field(name, index), name, value);
  }

  /** Write one element of an array field. Non-matrix fields only. */
  SetIndex(name, index, value)
  {
    this.#NotMatrix(name, "SetIndex");
    this.#Write(this.#Field(name, index), name, value);
  }

  /** Encodes one value into a resolved field. */
  #Write(field, name, value)
  {
    const encoder = RawDataEncoders[field.encoding];

    if (!encoder)
    {
      throw new Error(`RawData: no encoder for encoding "${field.encoding}" (field "${name}")`);
    }

    encoder(this.#floats, this.#uints, field, this.#Normalize(field, name, value));

    // DELIBERATE DEVIATION: a write marks the record dirty, where Carbon relies
    // on the owner calling InvalidateBufferData once per frame.
    //
    // Carbon can afford that because its flag is barely load-bearing: the
    // grouped path calls SetPerObjectDataToDevice unconditionally per batch,
    // the dirty protocol exists only on Tr2PersistentPerObjectData, and one of
    // its overloads is excluded on DX11, where the buffer is refilled every
    // time regardless. Ours IS load-bearing, because an engine uploader skips a
    // clean record.
    //
    // Thirteen sites create a persistent record here and two call Invalidate.
    // With the flag as Carbon has it, every other record would upload once and
    // then freeze at its first frame's values - including the per-frame view
    // and projection matrices - and nothing would say so.
    //
    // The failure modes are not symmetric. A missed Invalidate renders stale
    // data with no error at all; a redundant dirty costs one upload that was
    // already going to be correct. So the flag is set where the change actually
    // happens, and Invalidate remains for a caller that changed something
    // without writing through this object.
    this.#dirty = true;
  }

  /**
   * Every encoder reads `value[index]`, so a bare number would write NaN into
   * each lane instead of failing. A single-lane field - a float, a uint, an
   * int - is unambiguous, so accept the scalar and wrap it; anything wider
   * must be indexable, and says so rather than silently filling with NaN.
   */
  #Normalize(field, name, value)
  {
    if (typeof value === "number")
    {
      if (field.size * field.elements !== 1)
      {
        throw new Error(
          `RawData: field "${name}" is ${field.size * field.elements} lanes wide `
          + "and needs an indexable value, not a number"
        );
      }

      return SCALAR_SCRATCH_SET(value);
    }

    return value;
  }

  /**
   * A live reference into the buffer for one field - writing through it is a
   * zero-copy write, which is deliberate: Carbon hands out a raw pointer into
   * `m_psData` for exactly this (GetParentData, cpp:1877-1883).
   *
   * Non-matrix fields only; a matrix is transposed and indistinguishable from a
   * logical one, so it must be read through GetTransposed.
   */
  Get(name)
  {
    this.#NotMatrix(name, "Get");

    return this.#View(this.#Field(name, undefined));
  }

  /** Get for one element of an array field. Non-matrix fields only. */
  GetIndex(name, index)
  {
    this.#NotMatrix(name, "GetIndex");

    return this.#View(this.#Field(name, index));
  }

  /**
   * A live reference to a stored matrix. The value IS transposed - the name
   * says so at the call site, because doing maths with it as though it were
   * logical is silently wrong.
   */
  GetTransposed(name)
  {
    this.#AssertMatrix(name);

    return this.#View(this.#Field(name, undefined));
  }

  /** GetTransposed for one element of an array field. */
  GetTransposedIndex(name, index)
  {
    this.#AssertMatrix(name);

    return this.#View(this.#Field(name, index));
  }

  /** Copy one element of an array field out into a caller-owned buffer. */
  CopyIndex(name, index, out)
  {
    return this.Copy(name, out, index);
  }

  /**
   * Zero every byte - Carbon's `memset( &data, 0, sizeof(data) )`. Declared
   * defaults are NOT re-applied: memset does not respect them either, and a
   * caller that wants them writes them back explicitly, as Carbon does.
   */
  Zero()
  {
    this.#floats.fill(0);
    this.#dirty = true;

    return this;
  }

  /**
   * Copy another record's bytes into this one wholesale - Carbon's by-value
   * struct assignment (`vsData = m_vsData`, cpp:1487). Both records must carry
   * the SAME layout: the bytes are copied without re-encoding, so a mismatched
   * stride would silently reinterpret every field after the first difference.
   */
  CopyFrom(other)
  {
    const source = other?.GetLayout?.();

    // A store-registered layout and a RawData.create layout are distinct
    // objects for the same struct, so identity cannot be the only test - but
    // the STRIDE cannot stand in for it either: EveSpaceObjectVSData and
    // EveSpaceObjectPSData are both 116 floats and share nothing else. The
    // struct name is the test; an unnamed ad-hoc record needs the same layout
    // object.
    const sameStruct = this.#struct !== null && other.GetStruct?.() === this.#struct;

    if (!source || (!sameStruct && source !== this.#layout))
    {
      throw new Error(
        `RawData: CopyFrom requires a record of the same struct (this "${this.#struct}", other "${other?.GetStruct?.() ?? "unknown"}")`
      );
    }

    this.#floats.set(other.GetData());
    this.#dirty = true;

    return this;
  }

  /** A Float32 view over one field's lanes, sharing the record's bytes. */
  #View(field)
  {
    const total = field.size * field.elements;

    return this.#floats.subarray(field.offset, field.offset + total);
  }

  /** Asserts a field IS a matrix. */
  #AssertMatrix(name)
  {
    const field = this.#Field(name, undefined);

    if (field.encoding !== RawDataType.MATRIX)
    {
      throw new Error(
        `RawData: field "${name}" is "${field.encoding}", not a matrix - use Set/Get, not the transposed pair`
      );
    }
  }

  /** Asserts a field is NOT a matrix, so the orientation cannot be lost. */
  #NotMatrix(name, verb)
  {
    const field = this.#Field(name, undefined);

    if (field.encoding === RawDataType.MATRIX)
    {
      throw new Error(
        `RawData: field "${name}" is a matrix and is stored TRANSPOSED - `
        + `use ${verb.startsWith("Set") ? "SetAndTranspose" : "GetTransposed"}, not ${verb}`
      );
    }
  }

  /**
   * Marks the payload as changed since the engine last uploaded it.
   *
   * Only meaningful for a PERSISTENT record - one owned by an object across
   * frames rather than leased from the arena. Carbon's equivalent is
   * `Tr2PersistentPerObjectData::InvalidateBufferData`, called once per frame
   * from the owner's async update (EveSpaceObject2.cpp:626-627); when the flag
   * is clear the engine rebinds the existing GPU buffer with no lock and no
   * memcpy (Tr2PersistentPerObjectData.h:118-124).
   *
   * A transient arena record needs none of this - it is filled and consumed
   * within the frame - so the flag simply stays true there.
   */
  Invalidate()
  {
    this.#dirty = true;

    return this;
  }

  /** Whether the payload has changed since ClearDirty. */
  IsDirty()
  {
    return this.#dirty;
  }

  /** Called by an uploader once the GPU buffer matches this payload. */
  ClearDirty()
  {
    this.#dirty = false;

    return this;
  }

  /**
   * A PERSISTENT record: one this object owns across frames, with its own
   * buffer, outside the arena.
   *
   * This is Carbon's second per-object shape. Most payloads are leased from the
   * frame pool and die at Reset, but five types keep theirs as members because
   * the values are stable across a frame AND are read back - EveSpaceObject2
   * reads its own stored matrices (cpp:3747) and hands shLighting to
   * attachments as a live pointer (cpp:1877-1883). Those are the records that
   * want Get/GetTransposed.
   *
   * Defaults are applied once here rather than per allocation.
   *
   * Both catalogs are consulted. Per-frame buffers are only ever persistent -
   * the scene owns them across the frame and reads them back - so they have no
   * transient counterpart and never appear in an arena lease.
   */
  static create(struct)
  {
    const layout = CjsPerObjectLayouts.ToRawLayout(struct)
      ?? CjsPerFrameLayouts.ToRawLayout(struct);

    if (!layout)
    {
      throw new Error(`RawData: struct "${struct}" is in neither CjsPerObjectLayouts nor CjsPerFrameLayouts`);
    }

    const floats = new Float32Array(layout.stride);
    const uints = new Uint32Array(floats.buffer);

    for (const preset of layout.defaults)
    {
      floats.set(preset.values, preset.offset);
    }

    return new RawData(layout, floats, uints, struct);
  }

  /** The packed Float32 slice - what the engine uploader memcpys/binds. */
  GetData()
  {
    return this.#floats;
  }

  /** The resolved layout (offsets/sizes/encodings) - the engine's bind map. */
  GetLayout()
  {
    return this.#layout;
  }
}
