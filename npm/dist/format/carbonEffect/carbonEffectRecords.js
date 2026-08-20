import { CjsFormatWriteError } from '../CjsFormatError.js';
import { compareUtf8 } from '../compareUtf8.js';

// Source: trinity/shadercompiler/EffectData.h (Save methods)
// Source: trinity/trinity/Shader/Tr2EffectDescription.cpp (Read)


/**
 * The current description-blob version, and the only one this module writes.
 *
 * `DATA_VERSION` in `EffectData.h:10`. Carbon's reader accepts 2..15
 * (`Tr2EffectRes.cpp:209`) but annotates the v13/v14 field-order boundaries as
 * unverified — `// CHECK IS IT IN RIGHT FUNCTION?` at
 * `Tr2EffectDescription.cpp:177`, `// CHECK` at `:257` and `:578`. The v15
 * layout is the one with an authoritative writer to check against, it is the
 * only version the shipped corpus contains, and it is byte-identical to v14 in
 * the body — v15 differs from v14 only by the 36 outer header bytes.
 */
const CARBON_EFFECT_DATA_VERSION = 15;

/**
 * Every version the WRITER can actually produce, newest first.
 *
 * This is deliberately separate from what the reader accepts
 * (`CARBON_EFFECT_MIN_DATA_VERSION`..`CARBON_EFFECT_DATA_VERSION`) and from the
 * default above. Reading a version needs a branch that interprets bytes;
 * emitting one needs a branch that produces them, and we have only ever written
 * the v15 shape.
 *
 * **The version is a parameter, not a constant, so that adding v16 is a matter
 * of adding branches and one entry here rather than re-plumbing every caller.**
 * It is not a promise that any listed version can be requested today.
 *
 * The failure this guards against is the tempting one: accepting a version we
 * cannot emit and writing v15 bytes under its number. That produces a file that
 * lies about itself, which is strictly worse than refusing.
 */
const CARBON_EFFECT_WRITE_VERSIONS = Object.freeze([15]);

/**
 * Validate a requested write version, or fall back to the default.
 *
 * @param {number} [version] Requested container data version.
 * @returns {number} A version this writer can emit.
 */
function resolveWriteVersion(version) {
  if (version === undefined || version === null) return CARBON_EFFECT_DATA_VERSION;
  if (!CARBON_EFFECT_WRITE_VERSIONS.includes(version)) {
    throw new CjsFormatWriteError(`Cannot write Carbon effect container version ${version}`, {
      requested: version,
      writable: [...CARBON_EFFECT_WRITE_VERSIONS]
    });
  }
  return version;
}

/**
 * The oldest description-blob version this module reads.
 *
 * Carbon threads the version through parsing rather than gating on it twice,
 * and its branches reach back to version 2. Maintainer decision, 2026-08-02:
 * **8 is the lowest version worth reading** — the branches below 8 have no
 * examined file, no writer, and no consumer, so restoring them would be code
 * with no evidence. Reading a version is not supporting it: the reader's job
 * ends at a correct record tree, normalized to the v15 record shape.
 */
const CARBON_EFFECT_MIN_DATA_VERSION = 8;

/**
 * Annotation type codes (`EffectData.h:35-41`). Only `STRING` changes the wire
 * shape of the value that follows.
 */
const CARBON_ANNOTATION_TYPE = Object.freeze({
  BOOL: 0,
  INT: 1,
  FLOAT: 2,
  STRING: 3
});

/**
 * Carbon's inclusive count limits, from the `SanityCheck` call sites in
 * `Tr2EffectDescription.cpp:28-36`. `SanityCheck` throws only when
 * `value > limit`, so each number is the largest accepted count.
 *
 * The absent entries are absent in Carbon too: `techniques`, `registers`,
 * `staticSamplers`, `constants`, `libraries`, `exports` and the per-annotation
 * counts are read with no limit at all, guarded only by the end-of-buffer
 * check. We do not invent caps Carbon does not have.
 */
const CARBON_EFFECT_COUNT_CAPS = Object.freeze({
  pipelineInputs: 64,
  passes: 64,
  stages: 6,
  textures: 64,
  samplers: 64,
  uavs: 64,
  renderStates: 64,
  effectAnnotations: 256
});

/**
 * `SHADER_CONSTANTS_MAX` (`Tr2EffectDescription.h:160`) — Carbon clamps a
 * stage's default-constant-value copy to this without rejecting the file, while
 * still advancing the cursor by the untruncated size.
 */
const CARBON_SHADER_CONSTANTS_MAX = 4096;

/**
 * Compares two annotation names the way Carbon sorts annotation keys before
 * writing them (`strcmp`, `EffectData.h:613-616` and `:839-842`).
 *
 * `strcmp` orders by unsigned byte, which for names outside ASCII is not the
 * same as JavaScript's UTF-16 code-unit order — hence the explicit UTF-8
 * comparison.
 *
 * @param {string} a First name.
 * @param {string} b Second name.
 * @returns {number} Negative, zero, or positive ordering result.
 */
function compareAnnotationNames(a, b) {
  return compareUtf8(a, b);
}

/**
 * Resolver that writes each arena reference back at the offset it was read
 * from, reusing the source arena verbatim.
 *
 * This is what proves field order independently of arena policy: a re-emit
 * through this resolver must reproduce the original description bytes exactly,
 * whatever the arena happens to contain.
 */
const passthroughArena = Object.freeze({
  /**
   * Returns a parsed string reference's original offset.
   *
   * @param {{offset:number}} reference Parsed string reference.
   * @returns {number} Original arena offset.
   */
  string(reference) {
    return reference.offset;
  },
  /**
   * Returns a parsed blob reference's original offset.
   *
   * @param {{offset:number}} reference Parsed blob reference.
   * @returns {number} Original arena offset.
   */
  blob(reference) {
    return reference.offset;
  }
});

/**
 * Creates a resolver that re-interns every reference into a fresh string table,
 * so the emitted arena is rebuilt under Carbon's sorted-offset policy.
 *
 * @param {import("../CjsStringTable.js").CjsStringTable} table Target arena.
 * @returns {{string:Function, blob:Function}} Arena resolver.
 */
function internArena(table) {
  return {
    /**
     * Interns a string reference's text and returns its offset.
     *
     * @param {{value:string}} reference Parsed string reference.
     * @returns {number} Arena offset.
     */
    string(reference) {
      return table.offsetOf(table.addString(reference.value));
    },
    /**
     * Interns a blob reference's bytes and returns its offset. A zero-size
     * blob keeps its original reference — Carbon leaves the offset word
     * unset in that case, and the reader never dereferences it.
     *
     * @param {{size:number, offset:number, bytes:Uint8Array}} reference Parsed blob reference.
     * @returns {number} Arena offset.
     */
    blob(reference) {
      if (reference.size === 0) return reference.offset;
      return table.offsetOf(table.addBytes(reference.bytes));
    }
  };
}

/**
 * Creates a resolver that only interns, emitting a placeholder offset.
 *
 * Carbon resolves an arena offset while packing a body
 * (`PackedStream::Save(StringReference)`, `EffectData.h:187-193`), by which
 * point every string must already be in the table — a late `AddString` marks
 * the table dirty and the next `GetOffset` re-sorts it, silently invalidating
 * every offset already baked into a packed body. Carbon dodges this by
 * interning all late strings up front (`ShaderCompiler.cpp:686-694`, before the
 * packing loop at `:697-714`).
 *
 * Running the write walk twice — once collecting, once emitting — reproduces
 * that discipline without depending on a caller remembering it, and because
 * both passes traverse the same code they cannot drift apart.
 *
 * @param {import("../CjsStringTable.js").CjsStringTable} table Target arena.
 * @returns {{string:Function, blob:Function}} Collect-only resolver.
 */
function collectArena(table) {
  return {
    /**
     * Interns a string reference's text.
     *
     * @param {{value:string}} reference Parsed string reference.
     * @returns {number} Placeholder offset.
     */
    string(reference) {
      table.addString(reference.value);
      return 0;
    },
    /**
     * Interns a blob reference's bytes, skipping zero-size blobs.
     *
     * @param {{size:number, bytes:Uint8Array}} reference Parsed blob reference.
     * @returns {number} Placeholder offset.
     */
    blob(reference) {
      if (reference.size !== 0) table.addBytes(reference.bytes);
      return 0;
    }
  };
}

/**
 * Reads a bare `u32` arena offset and the NUL-terminated string behind it.
 *
 * @param {import("../CjsByteReader.js").CjsByteReader} reader Source reader.
 * @returns {{offset:number, value:string}} String reference.
 */
function readStringRef(reader) {
  const offset = reader.readUint32();
  return {
    offset,
    value: reader.readStringAt(offset)
  };
}

/**
 * Reads a `{u32 size, u32 offset}` blob reference.
 *
 * @param {import("../CjsByteReader.js").CjsByteReader} reader Source reader.
 * @returns {{size:number, offset:number, bytes:Uint8Array}} Blob reference.
 */
function readBlobRef(reader) {
  const size = reader.readUint32();
  const blob = reader.readTableBlobOptional(size);
  return {
    size,
    offset: blob.offset,
    bytes: blob.bytes
  };
}

/**
 * Writes a `{u32 size, u32 offset}` blob reference.
 *
 * @param {import("../CjsByteWriter.js").CjsByteWriter} writer Target writer.
 * @param {object} arena Arena resolver.
 * @param {{size:number}} reference Blob reference.
 */
function writeBlobRef(writer, arena, reference) {
  writer.u32(reference.size);
  writer.u32(arena.blob(reference));
}

/**
 * An absent sized blob: zero length, Carbon's null offset. The offset word is
 * still written, and a reader must not dereference it.
 */
const EMPTY_BLOB = Object.freeze({
  size: 0,
  offset: 0xffffffff,
  bytes: new Uint8Array(0)
});

/**
 * Error factory used by the write path's cap checks.
 *
 * @param {string} message Failure reason.
 * @param {object} details Structured details.
 * @returns {CjsFormatWriteError} Write error.
 */
function writeError(message, details) {
  return new CjsFormatWriteError(message, details);
}

/**
 * Requires that a sized record parsed to exactly its declared end.
 *
 * This is the universal form of the rule the backend block discovered, and it
 * carries real weight: it is the successor to roughly 600 lines of cross-chunk
 * agreement checks that the container rewrite deletes. Those checks caught a
 * malformed *tree* — our writer emitting something structurally wrong — not only a
 * malformed file. Under a record layout a writer bug either fails to parse, which
 * is self-announcing, or it parses and leaves the cursor somewhere other than the
 * declared end. Trailing bytes therefore mean one of two things, both fatal: the
 * writer knew fields this reader does not, or the writer miscounted.
 *
 * Applying it to some sized records and not others is a gap that stays invisible
 * until a writer bug hides in one of the others, so every sized record gets it.
 *
 * @param {import("../CjsByteReader.js").CjsByteReader} reader Reader at the record end.
 * @param {string} what Record name for the error message.
 * @param {Function} makeError Error factory.
 */
function requireExhaustive(reader, what, makeError) {
  if (reader.remaining !== 0) {
    throw makeError(`Carbon effect ${what} has ${reader.remaining} unparsed trailing byte(s)`, {
      trailingBytes: reader.remaining,
      offset: reader.offset,
      end: reader.end
    });
  }
}

/**
 * Rejects a count above Carbon's inclusive limit for that field.
 *
 * @param {number} value Count read or about to be written.
 * @param {string} field Cap key in `CARBON_EFFECT_COUNT_CAPS`.
 * @param {Function} makeError Error factory taking a message and details.
 * @returns {number} The count.
 */
function sanityCheck(value, field, makeError) {
  const limit = CARBON_EFFECT_COUNT_CAPS[field];
  if (limit !== undefined && value > limit) {
    throw makeError(`Effect ${field} count ${value} exceeds Carbon's limit of ${limit}`, {
      field,
      value,
      limit
    });
  }
  return value;
}

/**
 * Reads one annotation map: `u8 count`, then name/type/value triples
 * (`ParameterAnnotation::Save` `EffectData.h:601-623`, `ReadAnnotations`
 * `Tr2EffectDescription.cpp:114-134`).
 *
 * A non-string value is kept as its raw four bytes. Carbon writes it through
 * the `float` member of a `{float,int32_t}` union and reads it back through a
 * different union, so the bytes are the only faithful representation; applying
 * an int/float conversion here would corrupt round-trips.
 *
 * @param {import("../CjsByteReader.js").CjsByteReader} reader Source reader.
 * @returns {object[]} Annotation records.
 */
function readAnnotations(reader) {
  const count = reader.readUint8();
  const annotations = [];
  for (let index = 0; index < count; index += 1) {
    const name = readStringRef(reader);
    const type = reader.readUint8();
    if (type === CARBON_ANNOTATION_TYPE.STRING) {
      annotations.push({
        name,
        type,
        stringValue: readStringRef(reader),
        rawValue: null
      });
    } else {
      annotations.push({
        name,
        type,
        stringValue: null,
        rawValue: Uint8Array.from(reader.readRaw(4))
      });
    }
  }
  return annotations;
}

/**
 * Writes one annotation map.
 *
 * @param {import("../CjsByteWriter.js").CjsByteWriter} writer Target writer.
 * @param {object} arena Arena resolver.
 * @param {object[]} annotations Annotation records.
 */
function writeAnnotations(writer, arena, annotations) {
  writer.u8(annotations.length);
  for (const annotation of annotations) {
    writer.u32(arena.string(annotation.name));
    writer.u8(annotation.type);
    if (annotation.type === CARBON_ANNOTATION_TYPE.STRING) {
      writer.u32(arena.string(annotation.stringValue));
    } else {
      writer.bytes(annotation.rawValue);
    }
  }
}

/**
 * Maps a pre-v11 constant type byte onto the current enum
 * (`Tr2EffectDescription.cpp:141-158`). The old wire knew FLOAT/INT/BOOL;
 * the current numbering is FLOAT 0, INT 1, UINT 2, BOOL 3, OTHER 4.
 *
 * @param {number} value Pre-v11 type byte.
 * @returns {number} Current constant type value.
 */
function mapOldConstantType(value) {
  if (value === 0) return 0;
  if (value === 1) return 1;
  if (value === 2) return 3;
  return 4;
}

/**
 * Reads one `Constant` (`EffectData.h:283-294`, `ReadConstant`
 * `Tr2EffectDescription.cpp:136-170`). The byte layout is identical across
 * versions 8..15; only the type byte's numbering changed at v11.
 *
 * @param {import("../CjsByteReader.js").CjsByteReader} reader Source reader.
 * @param {number} version Container data version.
 * @returns {object} Constant record.
 */
function readConstant(reader, version) {
  const name = readStringRef(reader);
  const offset = reader.readUint32();
  const size = reader.readUint32();
  const rawType = reader.readUint8();
  return {
    name,
    offset,
    size,
    type: version < 11 ? mapOldConstantType(rawType) : rawType,
    dimension: reader.readUint8(),
    elements: reader.readUint32(),
    isSRGB: reader.readUint8(),
    isAutoregister: reader.readUint8()
  };
}

/**
 * Writes one `Constant`.
 *
 * @param {import("../CjsByteWriter.js").CjsByteWriter} writer Target writer.
 * @param {object} arena Arena resolver.
 * @param {object} constant Constant record.
 */
function writeConstant(writer, arena, constant) {
  writer.u32(arena.string(constant.name));
  writer.u32(constant.offset);
  writer.u32(constant.size);
  writer.u8(constant.type);
  writer.u8(constant.dimension);
  writer.u32(constant.elements);
  writer.u8(constant.isSRGB);
  writer.u8(constant.isAutoregister);
}

/**
 * Reads one `Texture` (`EffectData.h:320-328`, `ReadResource`
 * `Tr2EffectDescription.cpp:172-190`). `count` is the reader's
 * `arrayElements`; before v13 the field is not on the wire and Carbon
 * defaults it to one element.
 *
 * @param {import("../CjsByteReader.js").CjsByteReader} reader Source reader.
 * @param {number} version Container data version.
 * @returns {object} Texture record.
 */
function readTexture(reader, version) {
  return {
    name: readStringRef(reader),
    type: reader.readUint8(),
    count: version >= 13 ? reader.readUint32() : 1,
    isSRGB: reader.readUint8(),
    isAutoregister: reader.readUint8()
  };
}

/**
 * Writes one `Texture`.
 *
 * @param {import("../CjsByteWriter.js").CjsByteWriter} writer Target writer.
 * @param {object} arena Arena resolver.
 * @param {object} texture Texture record.
 */
function writeTexture(writer, arena, texture) {
  writer.u32(arena.string(texture.name));
  writer.u8(texture.type);
  writer.u32(texture.count);
  writer.u8(texture.isSRGB);
  writer.u8(texture.isAutoregister);
}

/**
 * Reads one `Uav` (`EffectData.h:345-352`, inline at
 * `Tr2EffectDescription.cpp:449-463`).
 *
 * A UAV record is one byte shorter than a texture record: it carries no
 * `isSRGB`. Carbon's reader hardcodes `isSRGB = false`
 * (`Tr2EffectDescription.cpp:450`) rather than reading it, and `Uav::Save`
 * omits it. Reusing a shared "resource" codec for both is the mistake this
 * comment exists to prevent.
 *
 * @param {import("../CjsByteReader.js").CjsByteReader} reader Source reader.
 * @param {number} version Container data version.
 * @returns {object} UAV record.
 */
function readUav(reader, version) {
  return {
    name: readStringRef(reader),
    type: reader.readUint8(),
    count: version >= 13 ? reader.readUint32() : 1,
    isAutoregister: reader.readUint8()
  };
}

/**
 * Writes one `Uav`.
 *
 * @param {import("../CjsByteWriter.js").CjsByteWriter} writer Target writer.
 * @param {object} arena Arena resolver.
 * @param {object} uav UAV record.
 */
function writeUav(writer, arena, uav) {
  writer.u32(arena.string(uav.name));
  writer.u8(uav.type);
  writer.u32(uav.count);
  writer.u8(uav.isAutoregister);
}

/**
 * Reads one `Sampler` (`EffectData.h:368-390`, `ReadSampler`
 * `Tr2EffectDescription.cpp:192-232` plus the name at `:413` and `isDynamic`
 * at `:429`). Border colour here is four floats — unlike a static sampler,
 * where it is a one-byte enum.
 *
 * `isDynamic` joined the wire at v13. For older versions the key is OMITTED
 * from the record rather than synthesised: the concept did not exist, so any
 * invented value would either lie or (via the v15 rule that a non-dynamic
 * sampler's name is cleared) silently erase names a legacy file does carry.
 *
 * @param {import("../CjsByteReader.js").CjsByteReader} reader Source reader.
 * @param {number} version Container data version.
 * @returns {object} Sampler record.
 */
function readSampler(reader, version) {
  const record = {
    name: readStringRef(reader),
    comparison: reader.readUint8(),
    minFilter: reader.readUint8(),
    magFilter: reader.readUint8(),
    mipFilter: reader.readUint8(),
    addressU: reader.readUint8(),
    addressV: reader.readUint8(),
    addressW: reader.readUint8(),
    mipLODBias: reader.readFloat32(),
    maxAnisotropy: reader.readUint8(),
    comparisonFunc: reader.readUint8(),
    borderColor: [reader.readFloat32(), reader.readFloat32(), reader.readFloat32(), reader.readFloat32()],
    minLOD: reader.readFloat32(),
    maxLOD: reader.readFloat32()
  };
  if (version > 12) {
    record.isDynamic = reader.readUint8();
  }
  return record;
}

/**
 * Writes one `Sampler`.
 *
 * @param {import("../CjsByteWriter.js").CjsByteWriter} writer Target writer.
 * @param {object} arena Arena resolver.
 * @param {object} sampler Sampler record.
 */
function writeSampler(writer, arena, sampler) {
  writer.u32(arena.string(sampler.name));
  writer.u8(sampler.comparison);
  writer.u8(sampler.minFilter);
  writer.u8(sampler.magFilter);
  writer.u8(sampler.mipFilter);
  writer.u8(sampler.addressU);
  writer.u8(sampler.addressV);
  writer.u8(sampler.addressW);
  writer.f32(sampler.mipLODBias);
  writer.u8(sampler.maxAnisotropy);
  writer.u8(sampler.comparisonFunc);
  writer.f32(sampler.borderColor[0]);
  writer.f32(sampler.borderColor[1]);
  writer.f32(sampler.borderColor[2]);
  writer.f32(sampler.borderColor[3]);
  writer.f32(sampler.minLOD);
  writer.f32(sampler.maxLOD);
  writer.u8(sampler.isDynamic);
}

/**
 * Reads one `StaticSampler` (`EffectData.h:512-531`, read inside
 * `ReadRegisters` at `Tr2EffectDescription.cpp:324-365`). Border colour is a
 * one-byte enum here, and there is no name.
 *
 * @param {import("../CjsByteReader.js").CjsByteReader} reader Source reader.
 * @returns {object} Static sampler record.
 */
function readStaticSampler(reader) {
  return {
    registerIndex: reader.readUint32(),
    registerSpace: reader.readUint8(),
    comparison: reader.readUint8(),
    minFilter: reader.readUint8(),
    magFilter: reader.readUint8(),
    mipFilter: reader.readUint8(),
    addressU: reader.readUint8(),
    addressV: reader.readUint8(),
    addressW: reader.readUint8(),
    mipLODBias: reader.readFloat32(),
    maxAnisotropy: reader.readUint8(),
    comparisonFunc: reader.readUint8(),
    borderColor: reader.readUint8(),
    minLOD: reader.readFloat32(),
    maxLOD: reader.readFloat32()
  };
}

/**
 * Writes one `StaticSampler`.
 *
 * @param {import("../CjsByteWriter.js").CjsByteWriter} writer Target writer.
 * @param {object} sampler Static sampler record.
 */
function writeStaticSampler(writer, sampler) {
  writer.u32(sampler.registerIndex);
  writer.u8(sampler.registerSpace);
  writer.u8(sampler.comparison);
  writer.u8(sampler.minFilter);
  writer.u8(sampler.magFilter);
  writer.u8(sampler.mipFilter);
  writer.u8(sampler.addressU);
  writer.u8(sampler.addressV);
  writer.u8(sampler.addressW);
  writer.f32(sampler.mipLODBias);
  writer.u8(sampler.maxAnisotropy);
  writer.u8(sampler.comparisonFunc);
  writer.u8(sampler.borderColor);
  writer.f32(sampler.minLOD);
  writer.f32(sampler.maxLOD);
}

/**
 * Maps a pre-v10 register type byte onto the current register-type values
 * (`Tr2EffectDescription.cpp:262-276`).
 *
 * @param {number} value Pre-v10 register type byte.
 * @returns {number} Current register type value.
 */
function mapOldRegisterType(value) {
  if (value === 0) return 0;
  if (value === 1) return 36;
  if (value === 2) return 68;
  if (value === 3) return 1;
  return 36;
}

/**
 * Reads the register signature and (v13+) static-sampler table
 * (`ReadRegisters`, `Tr2EffectDescription.cpp:258-367`).
 *
 * Before v13 a register carries only its type and index; Carbon defaults the
 * count to one and the space to the stage type (`:340-343`), and the record is
 * normalized here so consumers see one shape.
 *
 * @param {import("../CjsByteReader.js").CjsByteReader} reader Source reader.
 * @param {number} version Container data version.
 * @param {number} stageType Stage type owning the signature; only consulted
 *     for the pre-v13 register-space default.
 * @returns {{registers:object[], staticSamplers:object[]}} Signature records.
 */
function readSignature(reader, version, stageType) {
  const registers = [];
  const registerCount = reader.readUint8();
  for (let index = 0; index < registerCount; index += 1) {
    const rawType = reader.readUint8();
    const registerType = version > 9 ? rawType : mapOldRegisterType(rawType);
    const registerIndex = reader.readUint32();
    if (version > 12) {
      registers.push({
        registerType,
        registerIndex,
        registerCount: reader.readUint32(),
        registerSpace: reader.readUint8()
      });
    } else {
      registers.push({
        registerType,
        registerIndex,
        registerCount: 1,
        registerSpace: stageType
      });
    }
  }
  const staticSamplers = [];
  if (version > 12) {
    const staticSamplerCount = reader.readUint8();
    for (let index = 0; index < staticSamplerCount; index += 1) {
      staticSamplers.push(readStaticSampler(reader));
    }
  }
  return {
    registers,
    staticSamplers
  };
}

/**
 * Reads the resource half of a `StageData` block: constants, default constant
 * values, textures, samplers, UAVs, annotations (`ReadInput`,
 * `Tr2EffectDescription.cpp:369-472`).
 *
 * @param {import("../CjsByteReader.js").CjsByteReader} reader Source reader.
 * @param {number} version Container data version.
 * @param {Function} makeError Error factory.
 * @returns {object} Stage resource records.
 */
function readStageResources(reader, version, makeError) {
  const constants = [];
  const constantCount = reader.readUint32();
  for (let index = 0; index < constantCount; index += 1) {
    constants.push(readConstant(reader, version));
  }
  const defaultValues = readBlobRef(reader);
  const textures = [];
  const textureCount = sanityCheck(reader.readUint8(), "textures", makeError);
  for (let index = 0; index < textureCount; index += 1) {
    const registerIndex = reader.readUint8();
    textures.push({
      registerIndex,
      ...readTexture(reader, version)
    });
  }
  const samplers = [];
  const samplerCount = sanityCheck(reader.readUint8(), "samplers", makeError);
  for (let index = 0; index < samplerCount; index += 1) {
    const registerIndex = reader.readUint8();
    samplers.push({
      registerIndex,
      ...readSampler(reader, version)
    });
  }
  const uavs = [];
  const uavCount = sanityCheck(reader.readUint8(), "uavs", makeError);
  for (let index = 0; index < uavCount; index += 1) {
    const registerIndex = reader.readUint8();
    uavs.push({
      registerIndex,
      ...readUav(reader, version)
    });
  }
  return {
    constants,
    defaultValues,
    textures,
    samplers,
    uavs,
    annotations: readAnnotations(reader)
  };
}

/**
 * Reads a whole `StageData` block: registers, static samplers, then the
 * resource half (`StageData::Save` `EffectData.h:631-676`).
 *
 * Carbon's reader splits this single contiguous run across two functions —
 * `ReadRegisters` takes the first two sub-records
 * (`Tr2EffectDescription.cpp:258-367`) and `ReadInput` the remaining six
 * (`:369-472`). The split exists here too, because before v14 the two halves
 * are not adjacent on the wire — the signature precedes the program blob
 * while the resources follow the thread-group size — and `readStage` places
 * each half where its version put it.
 *
 * @param {import("../CjsByteReader.js").CjsByteReader} reader Source reader.
 * @param {number} version Container data version.
 * @param {Function} makeError Error factory.
 * @param {number} stageType Stage type owning the signature.
 * @returns {object} Stage data record.
 */
function readStageData(reader, version, makeError, stageType) {
  return {
    ...readSignature(reader, version, stageType),
    ...readStageResources(reader, version, makeError)
  };
}

/**
 * Writes the `StageData` block.
 *
 * @param {import("../CjsByteWriter.js").CjsByteWriter} writer Target writer.
 * @param {object} arena Arena resolver.
 * @param {object} stageData Stage data record.
 */
function writeStageData(writer, arena, stageData) {
  writer.u8(stageData.registers.length);
  for (const register of stageData.registers) {
    writer.u8(register.registerType);
    writer.u32(register.registerIndex);
    writer.u32(register.registerCount);
    writer.u8(register.registerSpace);
  }
  writer.u8(stageData.staticSamplers.length);
  for (const sampler of stageData.staticSamplers) {
    writeStaticSampler(writer, sampler);
  }
  writer.u32(stageData.constants.length);
  for (const constant of stageData.constants) {
    writeConstant(writer, arena, constant);
  }
  writeBlobRef(writer, arena, stageData.defaultValues);

  // Carbon's compiler enforces none of these caps while its runtime rejects
  // anything above them, so an over-large effect compiles and then fails to
  // load. Check on the way out instead.
  sanityCheck(stageData.textures.length, "textures", writeError);
  sanityCheck(stageData.samplers.length, "samplers", writeError);
  sanityCheck(stageData.uavs.length, "uavs", writeError);
  writer.u8(stageData.textures.length);
  for (const texture of stageData.textures) {
    writer.u8(texture.registerIndex);
    writeTexture(writer, arena, texture);
  }
  writer.u8(stageData.samplers.length);
  for (const sampler of stageData.samplers) {
    writer.u8(sampler.registerIndex);
    writeSampler(writer, arena, sampler);
  }
  writer.u8(stageData.uavs.length);
  for (const uav of stageData.uavs) {
    writer.u8(uav.registerIndex);
    writeUav(writer, arena, uav);
  }
  writeAnnotations(writer, arena, stageData.annotations);
}

/**
 * Reads the pipeline-input list (`Tr2EffectDescription.cpp:234-256`).
 *
 * The `type`/`dimension` bytes joined the wire at v11; before that Carbon
 * derives them — UINT for the blend-index usage, FLOAT otherwise, always four
 * components (`:247-252`) — and the record is normalized here the same way.
 *
 * @param {import("../CjsByteReader.js").CjsByteReader} reader Source reader.
 * @param {number} version Container data version.
 * @param {Function} makeError Error factory.
 * @returns {object[]} Pipeline-input records.
 */
function readPipelineInputs(reader, version, makeError) {
  const pipelineInputs = [];
  const pipelineInputCount = sanityCheck(reader.readUint8(), "pipelineInputs", makeError);
  for (let index = 0; index < pipelineInputCount; index += 1) {
    const usage = reader.readUint8();
    const registerIndex = reader.readUint8();
    const usageIndex = reader.readUint8();
    const usedMask = reader.readUint8();
    if (version > 10) {
      pipelineInputs.push({
        usage,
        registerIndex,
        usageIndex,
        usedMask,
        type: reader.readUint8(),
        dimension: reader.readUint8()
      });
    } else {
      pipelineInputs.push({
        usage,
        registerIndex,
        usageIndex,
        usedMask,
        // Constant-type values: 2 is UINT, 0 is FLOAT; usage 6 is the
        // blend-index semantic.
        type: usage === 6 ? 2 : 0,
        dimension: 4
      });
    }
  }
  return pipelineInputs;
}

/**
 * Reads one stage (`StageInput::Save` `EffectData.h:691-709`,
 * `Tr2EffectDescription.cpp:532-585`).
 *
 * At v15 the program payload comes first and the signature tables follow.
 * Before v14 it was the other way round; the reorder is the v14 change, and
 * Carbon marks its own v14 branch `// CHECK` (`:578`). Verified against the
 * writer for v15: `type`, `shaderSize`, `shaderData`,
 * `threadGroupSize[0..2]`, `pipelineInputs`, then `StageData`. Two further
 * legacy wrinkles, both from Carbon's reader: a stage carries no register
 * signature at all before v9 (`:544`), and two legacy dwords follow the
 * program reference before v12, read and discarded (`:559-563`).
 *
 * @param {import("../CjsByteReader.js").CjsByteReader} reader Source reader.
 * @param {number} version Container data version.
 * @param {Function} makeError Error factory.
 * @returns {object} Stage record.
 */
function readStage(reader, version, makeError) {
  const type = reader.readUint8();
  let pipelineInputs = [];
  let signature = {
    registers: [],
    staticSamplers: []
  };
  if (version < 14) {
    pipelineInputs = readPipelineInputs(reader, version, makeError);
    if (version > 8) {
      signature = readSignature(reader, version, type);
    }
  }
  const shaderData = readBlobRef(reader);
  if (version < 12) {
    reader.readUint32();
    reader.readUint32();
  }
  const threadGroupSize = [reader.readUint32(), reader.readUint32(), reader.readUint32()];
  if (version >= 14) {
    pipelineInputs = readPipelineInputs(reader, version, makeError);
    signature = readSignature(reader, version, type);
  }
  return {
    type,
    shaderData,
    threadGroupSize,
    pipelineInputs,
    ...signature,
    ...readStageResources(reader, version, makeError)
  };
}

/**
 * Writes one stage.
 *
 * @param {import("../CjsByteWriter.js").CjsByteWriter} writer Target writer.
 * @param {object} arena Arena resolver.
 * @param {object} stage Stage record.
 */
function writeStage(writer, arena, stage) {
  sanityCheck(stage.pipelineInputs.length, "pipelineInputs", writeError);
  writer.u8(stage.type);
  writeBlobRef(writer, arena, stage.shaderData);
  writer.u32(stage.threadGroupSize[0]);
  writer.u32(stage.threadGroupSize[1]);
  writer.u32(stage.threadGroupSize[2]);
  writer.u8(stage.pipelineInputs.length);
  for (const input of stage.pipelineInputs) {
    writer.u8(input.usage);
    writer.u8(input.registerIndex);
    writer.u8(input.usageIndex);
    writer.u8(input.usedMask);
    writer.u8(input.type);
    writer.u8(input.dimension);
  }
  writeStageData(writer, arena, stage);
}

/**
 * Reads one pass (`Pass::Save` `EffectData.h:724-738`).
 *
 * @param {import("../CjsByteReader.js").CjsByteReader} reader Source reader.
 * @param {number} version Container data version.
 * @param {Function} makeError Error factory.
 * @param {boolean} backend Whether the optional trailing block is present.
 * @returns {object} Pass record.
 */
function readPass(reader, version, makeError, backend) {
  const stages = [];
  const stageCount = sanityCheck(reader.readUint8(), "stages", makeError);
  for (let index = 0; index < stageCount; index += 1) {
    stages.push(readStage(reader, version, makeError));
  }
  const renderStates = [];
  const stateCount = sanityCheck(reader.readUint8(), "renderStates", makeError);
  for (let index = 0; index < stateCount; index += 1) {
    renderStates.push({
      state: reader.readUint32(),
      value: reader.readUint32()
    });
  }

  // The one optional trailing block, present only in our own containers. A
  // Carbon file ends the pass at the render-state table, so leaving this gate
  // closed reproduces Carbon's bytes exactly.
  const backendBlock = backend ? readBlobRef(reader) : null;
  return {
    stages,
    renderStates,
    ...(backendBlock ? {
      backendBlock
    } : {})
  };
}

/**
 * Writes one pass.
 *
 * @param {import("../CjsByteWriter.js").CjsByteWriter} writer Target writer.
 * @param {object} arena Arena resolver.
 * @param {object} pass Pass record.
 * @param {boolean} backend Whether to emit the optional trailing block.
 */
function writePass(writer, arena, pass, backend) {
  writer.u8(pass.stages.length);
  for (const stage of pass.stages) {
    writeStage(writer, arena, stage);
  }
  writer.u8(pass.renderStates.length);
  for (const entry of pass.renderStates) {
    writer.u32(entry.state);
    writer.u32(entry.value);
  }
  if (backend) {
    writeBlobRef(writer, arena, pass.backendBlock ?? EMPTY_BLOB);
  }
}

/**
 * Reads one raytracing library (`Library::Save` `EffectData.h:760-775`,
 * `Tr2EffectDescription.cpp:675-721`). A library carries two `StageData`
 * blocks and no pipeline inputs, thread group size, or stage type.
 *
 * @param {import("../CjsByteReader.js").CjsByteReader} reader Source reader.
 * @param {number} version Container data version.
 * @param {Function} makeError Error factory.
 * @returns {object} Library record.
 */
function readLibrary(reader, version, makeError) {
  const payloadSize = reader.readUint32();
  const shaderData = readBlobRef(reader);
  const exports = [];
  const exportCount = reader.readUint32();
  for (let index = 0; index < exportCount; index += 1) {
    exports.push({
      type: reader.readUint8(),
      name: readStringRef(reader)
    });
  }

  // Libraries exist only from v14, so the pre-v13 register-space default in
  // the signature reader is unreachable here; the stage type it would need
  // is passed as zero.
  return {
    payloadSize,
    shaderData,
    exports,
    hitGroupName: readStringRef(reader),
    globalInputs: readStageData(reader, version, makeError, 0),
    localInputs: readStageData(reader, version, makeError, 0)
  };
}

/**
 * Writes one raytracing library.
 *
 * @param {import("../CjsByteWriter.js").CjsByteWriter} writer Target writer.
 * @param {object} arena Arena resolver.
 * @param {object} library Library record.
 */
function writeLibrary(writer, arena, library) {
  writer.u32(library.payloadSize);
  writeBlobRef(writer, arena, library.shaderData);
  writer.u32(library.exports.length);
  for (const entry of library.exports) {
    writer.u8(entry.type);
    writer.u32(arena.string(entry.name));
  }
  writer.u32(arena.string(library.hitGroupName));
  writeStageData(writer, arena, library.globalInputs);
  writeStageData(writer, arena, library.localInputs);
}

/**
 * Reads a whole v15 description blob (`EffectData::Save`
 * `EffectData.h:821-849`, `Tr2EffectDescription::Read`
 * `Tr2EffectDescription.cpp:476-731`).
 *
 * @param {import("../CjsByteReader.js").CjsByteReader} reader Reader positioned at the blob.
 * @param {object} [options] Read options.
 * @param {Function} [options.makeError] Error factory taking a message and details.
 * @param {number} [options.version] Container data version; defaults to the
 *     current version. Accepted range is `CARBON_EFFECT_MIN_DATA_VERSION` to
 *     `CARBON_EFFECT_DATA_VERSION`; the record tree comes out normalized to
 *     the v15 shape whatever the wire carried.
 * @param {boolean} [options.backend] Expect our optional per-pass trailing block.
 *     Leave false for a Carbon file, which ends each pass at the render states.
 * @returns {object} Description record tree.
 */
function readEffectDescription(reader, options = {}) {
  const makeError = options.makeError ?? ((message, details) => reader._error(message, details));
  const backend = options.backend === true;
  const version = Number.isInteger(options.version) ? options.version : CARBON_EFFECT_DATA_VERSION;
  if (version < CARBON_EFFECT_MIN_DATA_VERSION || version > CARBON_EFFECT_DATA_VERSION) {
    throw makeError(`Unsupported Carbon effect version ${version}; expected ${CARBON_EFFECT_MIN_DATA_VERSION}..${CARBON_EFFECT_DATA_VERSION}`, {
      version
    });
  }
  const techniques = [];
  const techniqueCount = reader.readUint8();
  for (let techniqueIndex = 0; techniqueIndex < techniqueCount; techniqueIndex += 1) {
    const name = readStringRef(reader);
    const passes = [];
    const passCount = sanityCheck(reader.readUint8(), "passes", makeError);
    for (let passIndex = 0; passIndex < passCount; passIndex += 1) {
      passes.push(readPass(reader, version, makeError, backend));
    }

    // The library table joined the wire at v14; older files end the
    // technique at its passes.
    const libraries = [];
    if (version > 13) {
      const libraryCount = reader.readUint8();
      for (let libraryIndex = 0; libraryIndex < libraryCount; libraryIndex += 1) {
        libraries.push(readLibrary(reader, version, makeError));
      }
    }
    techniques.push({
      name,
      passes,
      libraries
    });
  }
  const annotations = [];
  const parameterCount = sanityCheck(reader.readUint16(), "effectAnnotations", makeError);
  for (let index = 0; index < parameterCount; index += 1) {
    annotations.push({
      name: readStringRef(reader),
      annotations: readAnnotations(reader)
    });
  }
  requireExhaustive(reader, "description blob", makeError);
  return {
    techniques,
    annotations
  };
}

/**
 * Writes a whole v15 description blob.
 *
 * The `arena` resolver decides what an arena reference becomes: `passthroughArena`
 * keeps the source offsets, `internArena(table)` re-interns into a new table.
 *
 * @param {import("../CjsByteWriter.js").CjsByteWriter} writer Target writer.
 * @param {object} description Description record tree.
 * @param {object} [options] Write options.
 * @param {object} [options.arena] Arena resolver; defaults to passthrough.
 * @param {boolean} [options.backend] Emit our optional per-pass trailing block.
 *     Leave false to produce bytes a Carbon reader accepts unchanged.
 * @param {number} [options.version] Container data version to emit; must be one
 *     of `CARBON_EFFECT_WRITE_VERSIONS`. Defaults to the current version.
 * @returns {import("../CjsByteWriter.js").CjsByteWriter} The writer.
 */
function writeEffectDescription(writer, description, options = {}) {
  const arena = options.arena ?? passthroughArena;
  const backend = options.backend === true;
  // Validated, though nothing below branches on it yet: today every writable
  // version produces the same body shape. A caller asking for a version we
  // cannot emit must be refused here, at the description boundary, rather
  // than have its request ignored and v15 bytes written under another number.
  // When a version changes the body, branch on this.
  resolveWriteVersion(options.version);
  writer.u8(description.techniques.length);
  for (const technique of description.techniques) {
    writer.u32(arena.string(technique.name));
    writer.u8(sanityCheck(technique.passes.length, "passes", writeError));
    for (const pass of technique.passes) {
      sanityCheck(pass.stages.length, "stages", writeError);
      sanityCheck(pass.renderStates.length, "renderStates", writeError);
      writePass(writer, arena, pass, backend);
    }
    writer.u8(technique.libraries.length);
    for (const library of technique.libraries) {
      writeLibrary(writer, arena, library);
    }
  }
  writer.u16(sanityCheck(description.annotations.length, "effectAnnotations", writeError));
  for (const parameter of description.annotations) {
    writer.u32(arena.string(parameter.name));
    writeAnnotations(writer, arena, parameter.annotations);
  }
  return writer;
}

export { CARBON_ANNOTATION_TYPE, CARBON_EFFECT_COUNT_CAPS, CARBON_EFFECT_DATA_VERSION, CARBON_EFFECT_MIN_DATA_VERSION, CARBON_EFFECT_WRITE_VERSIONS, CARBON_SHADER_CONSTANTS_MAX, collectArena, compareAnnotationNames, internArena, passthroughArena, readEffectDescription, resolveWriteVersion, writeEffectDescription };
//# sourceMappingURL=carbonEffectRecords.js.map
