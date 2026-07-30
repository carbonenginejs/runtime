import { CjsFormatWriteError } from '../CjsFormatError.js';
import { compareUtf8 } from '../compareUtf8.js';
import { CARBON_ANNOTATION_TYPE } from './carbonEffectRecords.js';

/**
 * Maps a portable effect-body reflection onto Carbon v15 description records.
 *
 * This is the one mapping in the port with no oracle in CCP's files, because CCP
 * never wrote one of our packages. Everything else the container does — arena
 * policy, offset arithmetic, alias decisions, exhaustiveness — is Carbon records in
 * and the same Carbon records out, checkable against shipped bytes. This direction
 * is new: *our producer's data* into Carbon records.
 *
 * There is still an oracle, and it is strong. Our reflection is derived from a dx11
 * file's own reflection through the HLSL reader, so the Carbon region we emit for an
 * effect should be near-identical to the Carbon region of the file it came from —
 * same constants at the same offsets, same texture and sampler slots, same
 * registers, same render states. Every difference must be nameable. See
 * `test/format/carbon-mapping.test.js`, which diffs the two field for field and
 * fails on anything unexplained.
 *
 * Ordering is a mapping decision, not a copy. Carbon writes `textures`, `samplers`
 * and `uavs` in ascending register index because they are `std::map`s
 * (`EffectData.h:683-685`), render states likewise (`:719`), and it sorts annotation
 * keys by `strcmp` before writing (`:613-616`, `:839-842`). The portable reflection
 * preserves whatever order it was read in, so this module sorts explicitly rather
 * than trusting that the input happened to arrive sorted.
 */

/**
 * Wraps a string as the record codec's arena reference shape.
 *
 * @param {string} value Text value.
 * @returns {{offset:number, value:string}} String reference.
 */
function str(value) {
  return {
    offset: 0,
    value: String(value ?? "")
  };
}

/**
 * Wraps bytes as the record codec's sized blob reference.
 *
 * A zero-length blob keeps Carbon's null offset: the writer leaves the reference
 * unset and the reader consumes the word without dereferencing it.
 *
 * @param {Uint8Array} bytes Blob bytes.
 * @param {number} [declaredSize] Size to declare, when it is tracked separately.
 * @returns {{size:number, offset:number, bytes:Uint8Array}} Blob reference.
 */
function blob(bytes, declaredSize) {
  const owned = bytes instanceof Uint8Array ? bytes : new Uint8Array(0);
  const size = declaredSize ?? owned.byteLength;
  return {
    size,
    offset: size === 0 ? 0xffffffff : 0,
    bytes: owned
  };
}
const rawFloatBuffer = new DataView(new ArrayBuffer(4));

/**
 * Reinterprets a portable `*Raw` field's `u32` bit pattern as the float it encodes.
 *
 * The portable reflection stores sampler LOD and border-colour values as raw bits —
 * `mipLODBiasRaw`, `minLODRaw`, `maxLODRaw`, `borderColorRaw` — precisely so that a
 * value like `-FLT_MAX` survives JSON without going through a decimal round trip.
 * Carbon's records store them as `float` (`EffectData.h:379,387-388`), so the bits
 * have to be reinterpreted rather than assigned. Assigning the `u32` straight across
 * writes `4286578687.0` where the file says `-3.4028235e38`, which every structural
 * check in the container would accept.
 *
 * @param {number} bits Raw 32-bit pattern.
 * @returns {number} The float those bits encode.
 */
function floatFromRaw(bits) {
  if (!Number.isFinite(bits)) return 0;
  rawFloatBuffer.setUint32(0, bits >>> 0, true);
  return rawFloatBuffer.getFloat32(0, true);
}

/**
 * Encodes a portable annotation's `u32` value as Carbon's four raw bytes.
 *
 * Carbon writes the value through the `float` member of a `{float,int32_t}` union
 * and reads it back through a different union (`EffectData.h:582-593`,
 * `Tr2EffectDescription.cpp:129-132`), so the bytes are the only faithful
 * representation and no numeric conversion may happen here.
 *
 * @param {number} rawValue Portable annotation value.
 * @returns {Uint8Array} Four little-endian bytes.
 */
function annotationBytes(rawValue) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, rawValue >>> 0, true);
  return bytes;
}

/**
 * Maps one annotation list, in Carbon's `strcmp` key order.
 *
 * @param {object[]} annotations Portable annotations.
 * @returns {object[]} Annotation records.
 */
function mapAnnotations(annotations) {
  return (annotations ?? []).map(annotation => annotation.type === CARBON_ANNOTATION_TYPE.STRING ? {
    name: str(annotation.name),
    type: annotation.type,
    stringValue: str(annotation.stringValue),
    rawValue: null
  } : {
    name: str(annotation.name),
    type: annotation.type,
    stringValue: null,
    rawValue: annotationBytes(annotation.rawValue)
  }).sort((left, right) => compareUtf8(left.name.value, right.name.value));
}

/**
 * Maps a portable sampler descriptor onto Carbon's sampler record.
 *
 * @param {object} entry Portable sampler entry.
 * @returns {object} Sampler record.
 */
function mapSampler(entry) {
  const descriptor = entry.descriptor ?? {};
  return {
    registerIndex: entry.registerIndex,
    // Carbon nulls a sampler's name when it is not dynamic
    // (`Tr2EffectDescription.cpp:430-433`), so an absent name round-trips as
    // the empty string rather than being dropped.
    name: str(entry.name ?? ""),
    comparison: descriptor.comparison ? 1 : 0,
    minFilter: descriptor.minFilter,
    magFilter: descriptor.magFilter,
    mipFilter: descriptor.mipFilter,
    addressU: descriptor.addressU,
    addressV: descriptor.addressV,
    addressW: descriptor.addressW,
    mipLODBias: floatFromRaw(descriptor.mipLODBiasRaw),
    maxAnisotropy: descriptor.maxAnisotropy,
    comparisonFunc: descriptor.comparisonFunc,
    // On one line deliberately: the raw-field guard requires the
    // reinterpretation to be visible on the same line as the raw access.
    borderColor: (descriptor.borderColorRaw ?? [0, 0, 0, 0]).slice(0, 4).map(floatFromRaw),
    minLOD: floatFromRaw(descriptor.minLODRaw),
    maxLOD: floatFromRaw(descriptor.maxLODRaw),
    isDynamic: entry.isDynamic ? 1 : 0
  };
}

/**
 * Maps a portable static sampler onto Carbon's static-sampler record.
 *
 * Border colour is a one-byte enum here, unlike the four floats on a dynamic
 * sampler (`EffectData.h:565` versus `:453`).
 *
 * @param {object} entry Portable static sampler entry.
 * @returns {object} Static sampler record.
 */
function mapStaticSampler(entry) {
  const descriptor = entry.descriptor ?? {};
  return {
    registerIndex: entry.registerIndex,
    registerSpace: entry.registerSpace,
    comparison: descriptor.comparison ? 1 : 0,
    minFilter: descriptor.minFilter,
    magFilter: descriptor.magFilter,
    mipFilter: descriptor.mipFilter,
    addressU: descriptor.addressU,
    addressV: descriptor.addressV,
    addressW: descriptor.addressW,
    mipLODBias: floatFromRaw(descriptor.mipLODBiasRaw),
    maxAnisotropy: descriptor.maxAnisotropy,
    comparisonFunc: descriptor.comparisonFunc,
    borderColor: descriptor.borderColor,
    minLOD: floatFromRaw(descriptor.minLODRaw),
    maxLOD: floatFromRaw(descriptor.maxLODRaw)
  };
}

/**
 * Maps a portable resource entry onto Carbon's texture record.
 *
 * @param {object} entry Portable resource entry.
 * @returns {object} Texture record.
 */
function mapTexture(entry) {
  return {
    registerIndex: entry.registerIndex,
    name: str(entry.name),
    type: entry.type,
    count: entry.arrayElements,
    isSRGB: entry.isSRGB ? 1 : 0,
    isAutoregister: entry.isAutoregister ? 1 : 0
  };
}

/**
 * Maps a portable resource entry onto Carbon's UAV record.
 *
 * A UAV record is one byte shorter than a texture record: it carries no `isSRGB`
 * (`EffectData.h:345-352`, `Tr2EffectDescription.cpp:450`).
 *
 * @param {object} entry Portable resource entry.
 * @returns {object} UAV record.
 */
function mapUav(entry) {
  return {
    registerIndex: entry.registerIndex,
    name: str(entry.name),
    type: entry.type,
    count: entry.arrayElements,
    isAutoregister: entry.isAutoregister ? 1 : 0
  };
}

/**
 * Maps a portable input onto Carbon's `StageData` block.
 *
 * @param {object} input Portable input.
 * @returns {object} Stage data record.
 */
function mapStageData(input) {
  const signature = input?.signature ?? {};
  const byRegister = (left, right) => left.registerIndex - right.registerIndex;
  return {
    registers: (signature.registers ?? []).map(entry => {
      // Carbon stores one field that its reader calls `arrayCount` and its
      // writer calls `registerCount` (`EffectData.h:495` / `Tr2ShaderAL.h:100`).
      // The portable reflection carries both names; they must agree, or the
      // collapse to one wire field would silently pick a side.
      if (entry.arrayCount !== entry.registerCount) {
        throw new CjsFormatWriteError("Portable register arrayCount and registerCount disagree; Carbon stores one field", {
          arrayCount: entry.arrayCount,
          registerCount: entry.registerCount
        });
      }
      return {
        registerType: entry.registerType,
        registerIndex: entry.registerIndex,
        registerCount: entry.registerCount,
        registerSpace: entry.registerSpace
      };
    }),
    staticSamplers: (signature.staticSamplers ?? []).map(mapStaticSampler),
    constants: (input?.constants ?? []).map(constant => ({
      name: str(constant.name),
      offset: constant.offset,
      size: constant.size,
      type: constant.type,
      dimension: constant.dimension,
      elements: constant.elements,
      isSRGB: constant.isSRGB ? 1 : 0,
      isAutoregister: constant.isAutoregister ? 1 : 0
    })),
    defaultValues: blob(input?.constantDefaults?.bytes, input?.constantDefaults?.declaredByteLength),
    textures: (input?.resources ?? []).map(mapTexture).sort(byRegister),
    samplers: (input?.samplers ?? []).map(mapSampler).sort(byRegister),
    uavs: (input?.uavs ?? []).map(mapUav).sort(byRegister),
    annotations: mapAnnotations(input?.annotations)
  };
}

/**
 * Maps one portable stage onto Carbon's `StageInput` record.
 *
 * @param {object} stage Portable stage.
 * @returns {object} Stage record.
 */
function mapStage(stage) {
  const signature = stage.input?.signature ?? {};
  const program = stage.sourceProgram ?? {};
  const threadGroupSize = signature.threadGroupSize ?? {};
  return {
    type: stage.stageType,
    shaderData: blob(program.bytes, program.shaderSize),
    threadGroupSize: [threadGroupSize.x ?? 0, threadGroupSize.y ?? 0, threadGroupSize.z ?? 0],
    pipelineInputs: (signature.pipelineInputs ?? []).map(entry => ({
      usage: entry.usage,
      registerIndex: entry.registerIndex,
      usageIndex: entry.usageIndex,
      usedMask: entry.usedMask,
      type: entry.type,
      dimension: entry.dimension
    })),
    ...mapStageData(stage.input)
  };
}

/**
 * Maps one portable library onto Carbon's raytracing library record.
 *
 * @param {object} library Portable library.
 * @returns {object} Library record.
 */
function mapLibrary(library) {
  const program = library.sourceProgram ?? {};
  return {
    payloadSize: library.payloadSize >>> 0,
    shaderData: blob(program.bytes, program.shaderSize),
    exports: (library.exports ?? []).map(entry => ({
      type: entry.type,
      name: str(entry.name)
    })),
    hitGroupName: str(library.hitGroupName),
    globalInputs: mapStageData(library.globalInput),
    localInputs: mapStageData(library.localInput)
  };
}

/**
 * Maps a portable effect-body reflection onto a Carbon v15 description record tree.
 *
 * @param {object} reflection Portable effect-body reflection.
 * @returns {object} Description record tree, ready for `writeEffectDescription`.
 */
function carbonDescriptionFromPortable(reflection) {
  const effect = reflection?.effect;
  if (!effect) {
    throw new CjsFormatWriteError("Portable reflection has no effect", {});
  }
  return {
    techniques: (effect.techniques ?? []).map(technique => ({
      name: str(technique.name),
      passes: (technique.passes ?? []).map(pass => ({
        stages: (pass.stages ?? []).map(mapStage),
        renderStates: (pass.renderStates ?? []).map(entry => ({
          state: entry.state >>> 0,
          value: entry.value >>> 0
        })).sort((left, right) => left.state - right.state)
      })),
      libraries: (technique.libraries ?? []).map(mapLibrary)
    })),
    annotations: (effect.annotations ?? []).map(group => ({
      name: str(group.parameterName),
      annotations: mapAnnotations(group.annotations)
    })).sort((left, right) => compareUtf8(left.name.value, right.name.value))
  };
}

export { carbonDescriptionFromPortable };
//# sourceMappingURL=carbonDescriptionFromPortable.js.map
