import { CjsFormatWriteError } from '../CjsFormatError.js';

// Source: trinity/shadercompiler/EffectData.h (Save methods)
// Source: trinity/trinity/Shader/Tr2EffectDescription.cpp (Read)


/**
 * The only description-blob version this module reads or writes.
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
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  const shared = Math.min(left.length, right.length);
  for (let index = 0; index < shared; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return left.length - right.length;
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
 * Reads one `Constant` (`EffectData.h:283-294`, `ReadConstant`
 * `Tr2EffectDescription.cpp:136-170`).
 *
 * @param {import("../CjsByteReader.js").CjsByteReader} reader Source reader.
 * @returns {object} Constant record.
 */
function readConstant(reader) {
  return {
    name: readStringRef(reader),
    offset: reader.readUint32(),
    size: reader.readUint32(),
    type: reader.readUint8(),
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
 * `arrayElements`.
 *
 * @param {import("../CjsByteReader.js").CjsByteReader} reader Source reader.
 * @returns {object} Texture record.
 */
function readTexture(reader) {
  return {
    name: readStringRef(reader),
    type: reader.readUint8(),
    count: reader.readUint32(),
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
 * @returns {object} UAV record.
 */
function readUav(reader) {
  return {
    name: readStringRef(reader),
    type: reader.readUint8(),
    count: reader.readUint32(),
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
 * @param {import("../CjsByteReader.js").CjsByteReader} reader Source reader.
 * @returns {object} Sampler record.
 */
function readSampler(reader) {
  return {
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
    maxLOD: reader.readFloat32(),
    isDynamic: reader.readUint8()
  };
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
 * Reads the `StageData` block: registers, static samplers, constants, default
 * constant values, textures, samplers, UAVs, annotations
 * (`StageData::Save` `EffectData.h:631-676`).
 *
 * Carbon's reader splits this single contiguous run across two functions —
 * `ReadRegisters` takes the first two sub-records
 * (`Tr2EffectDescription.cpp:258-367`) and `ReadInput` the remaining six
 * (`:369-472`). Keeping them adjacent here is what makes the split invisible.
 *
 * @param {import("../CjsByteReader.js").CjsByteReader} reader Source reader.
 * @param {Function} makeError Error factory.
 * @returns {object} Stage data record.
 */
function readStageData(reader, makeError) {
  const registers = [];
  const registerCount = reader.readUint8();
  for (let index = 0; index < registerCount; index += 1) {
    registers.push({
      registerType: reader.readUint8(),
      registerIndex: reader.readUint32(),
      registerCount: reader.readUint32(),
      registerSpace: reader.readUint8()
    });
  }
  const staticSamplers = [];
  const staticSamplerCount = reader.readUint8();
  for (let index = 0; index < staticSamplerCount; index += 1) {
    staticSamplers.push(readStaticSampler(reader));
  }
  const constants = [];
  const constantCount = reader.readUint32();
  for (let index = 0; index < constantCount; index += 1) {
    constants.push(readConstant(reader));
  }
  const defaultValues = readBlobRef(reader);
  const textures = [];
  const textureCount = sanityCheck(reader.readUint8(), "textures", makeError);
  for (let index = 0; index < textureCount; index += 1) {
    const registerIndex = reader.readUint8();
    textures.push({
      registerIndex,
      ...readTexture(reader)
    });
  }
  const samplers = [];
  const samplerCount = sanityCheck(reader.readUint8(), "samplers", makeError);
  for (let index = 0; index < samplerCount; index += 1) {
    const registerIndex = reader.readUint8();
    samplers.push({
      registerIndex,
      ...readSampler(reader)
    });
  }
  const uavs = [];
  const uavCount = sanityCheck(reader.readUint8(), "uavs", makeError);
  for (let index = 0; index < uavCount; index += 1) {
    const registerIndex = reader.readUint8();
    uavs.push({
      registerIndex,
      ...readUav(reader)
    });
  }
  return {
    registers,
    staticSamplers,
    constants,
    defaultValues,
    textures,
    samplers,
    uavs,
    annotations: readAnnotations(reader)
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
 * Reads one stage (`StageInput::Save` `EffectData.h:691-709`,
 * `Tr2EffectDescription.cpp:532-585`).
 *
 * At v15 the program payload comes first and the signature tables follow.
 * Before v14 it was the other way round; the reorder is the v14 change, and
 * Carbon marks its own v14 branch `// CHECK` (`:578`). Verified against the
 * writer: `type`, `shaderSize`, `shaderData`, `threadGroupSize[0..2]`,
 * `pipelineInputs`, then `StageData`.
 *
 * @param {import("../CjsByteReader.js").CjsByteReader} reader Source reader.
 * @param {Function} makeError Error factory.
 * @returns {object} Stage record.
 */
function readStage(reader, makeError) {
  const type = reader.readUint8();
  const shaderData = readBlobRef(reader);
  const threadGroupSize = [reader.readUint32(), reader.readUint32(), reader.readUint32()];
  const pipelineInputs = [];
  const pipelineInputCount = sanityCheck(reader.readUint8(), "pipelineInputs", makeError);
  for (let index = 0; index < pipelineInputCount; index += 1) {
    pipelineInputs.push({
      usage: reader.readUint8(),
      registerIndex: reader.readUint8(),
      usageIndex: reader.readUint8(),
      usedMask: reader.readUint8(),
      type: reader.readUint8(),
      dimension: reader.readUint8()
    });
  }
  return {
    type,
    shaderData,
    threadGroupSize,
    pipelineInputs,
    ...readStageData(reader, makeError)
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
 * @param {Function} makeError Error factory.
 * @returns {object} Pass record.
 */
function readPass(reader, makeError) {
  const stages = [];
  const stageCount = sanityCheck(reader.readUint8(), "stages", makeError);
  for (let index = 0; index < stageCount; index += 1) {
    stages.push(readStage(reader, makeError));
  }
  const renderStates = [];
  const stateCount = sanityCheck(reader.readUint8(), "renderStates", makeError);
  for (let index = 0; index < stateCount; index += 1) {
    renderStates.push({
      state: reader.readUint32(),
      value: reader.readUint32()
    });
  }
  return {
    stages,
    renderStates
  };
}

/**
 * Writes one pass.
 *
 * @param {import("../CjsByteWriter.js").CjsByteWriter} writer Target writer.
 * @param {object} arena Arena resolver.
 * @param {object} pass Pass record.
 */
function writePass(writer, arena, pass) {
  writer.u8(pass.stages.length);
  for (const stage of pass.stages) {
    writeStage(writer, arena, stage);
  }
  writer.u8(pass.renderStates.length);
  for (const entry of pass.renderStates) {
    writer.u32(entry.state);
    writer.u32(entry.value);
  }
}

/**
 * Reads one raytracing library (`Library::Save` `EffectData.h:760-775`,
 * `Tr2EffectDescription.cpp:675-721`). A library carries two `StageData`
 * blocks and no pipeline inputs, thread group size, or stage type.
 *
 * @param {import("../CjsByteReader.js").CjsByteReader} reader Source reader.
 * @param {Function} makeError Error factory.
 * @returns {object} Library record.
 */
function readLibrary(reader, makeError) {
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
  return {
    payloadSize,
    shaderData,
    exports,
    hitGroupName: readStringRef(reader),
    globalInputs: readStageData(reader, makeError),
    localInputs: readStageData(reader, makeError)
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
 * @returns {object} Description record tree.
 */
function readEffectDescription(reader, options = {}) {
  const makeError = options.makeError ?? ((message, details) => reader._error(message, details));
  const techniques = [];
  const techniqueCount = reader.readUint8();
  for (let techniqueIndex = 0; techniqueIndex < techniqueCount; techniqueIndex += 1) {
    const name = readStringRef(reader);
    const passes = [];
    const passCount = sanityCheck(reader.readUint8(), "passes", makeError);
    for (let passIndex = 0; passIndex < passCount; passIndex += 1) {
      passes.push(readPass(reader, makeError));
    }
    const libraries = [];
    const libraryCount = reader.readUint8();
    for (let libraryIndex = 0; libraryIndex < libraryCount; libraryIndex += 1) {
      libraries.push(readLibrary(reader, makeError));
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
 * @returns {import("../CjsByteWriter.js").CjsByteWriter} The writer.
 */
function writeEffectDescription(writer, description, options = {}) {
  const arena = options.arena ?? passthroughArena;
  writer.u8(description.techniques.length);
  for (const technique of description.techniques) {
    writer.u32(arena.string(technique.name));
    writer.u8(sanityCheck(technique.passes.length, "passes", writeError));
    for (const pass of technique.passes) {
      sanityCheck(pass.stages.length, "stages", writeError);
      sanityCheck(pass.renderStates.length, "renderStates", writeError);
      writePass(writer, arena, pass);
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

export { CARBON_ANNOTATION_TYPE, CARBON_EFFECT_COUNT_CAPS, CARBON_EFFECT_DATA_VERSION, CARBON_SHADER_CONSTANTS_MAX, collectArena, compareAnnotationNames, internArena, passthroughArena, readEffectDescription, writeEffectDescription };
//# sourceMappingURL=carbonEffectRecords.js.map
