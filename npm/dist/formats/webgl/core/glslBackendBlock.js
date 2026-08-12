import { CjsByteWriter } from '../../../format/CjsByteWriter.js';
import { CjsByteReader } from '../../../format/CjsByteReader.js';
import { CjsFormatReadError, CjsFormatWriteError } from '../../../format/CjsFormatError.js';
import { readInlineString, readTransformSection, writeInlineString, writeTransformSection } from '../../../format/carbonEffect/carbonEffectResourceTransform.js';
import { DxbcComponentTypeNames } from '../../dxbc/core/signature.js';
import { DxbcResourceDimensionNames } from '../../dxbc/core/decoder.js';

/**
 * The WebGL 2 pass block: what the GLSL text declares but cannot say how to
 * build or bind.
 *
 * This is the GLSL counterpart of `carbonEffectBackendBlock.js`, occupying the
 * same one optional trailing block per pass, and it shares that file's
 * resource-transform section verbatim. Everything else differs, because the two
 * backends' lowering decisions are genuinely different documents: WebGPU records
 * bind-group topology, while WebGL 2 records sampler and uniform declarations,
 * synthesised data textures and UBOs, the vertex attribute ABI, and the recipe
 * for running a compute shader as a fragment pass.
 *
 * The two codecs version independently, and that is safe: which one parses a
 * given block is decided by the resource path the file came from, the same way
 * the backend itself is chosen. Nothing has to sniff. This one is at version 2
 * and reads only version 2 — see the version constant for why it carries no
 * backward-compatible path.
 *
 * ## Why identifiers are on the wire
 *
 * `docs/contracts/constant-buffer-slots.md` establishes that a constant buffer's
 * register index is its meaning, and that identifiers are positional. That is
 * true of the *contract* but not sufficient to derive a name here: the pixel
 * stage remaps slot 0 to `cb7` (`DxbcGlslEmitter.js`, `pixelConstantBufferRemap`),
 * so an identifier is a function of register **and stage**, through a profile
 * table. A reader deriving names would be re-implementing the emitter's naming
 * policy, and a divergence would surface as a uniform that silently never binds
 * rather than as an error. The name is the actual link between this block and
 * the GLSL text, so it is stored and the text stays checkable against it.
 *
 * What is genuinely derived: the sampler type (a total function of the DXBC
 * resource dimension and whether comparison sampling is used) and the data
 * texture formats (constant per binding kind).
 *
 * ## What this block deliberately does not carry
 *
 * **Resource names.** The enclosing Carbon description already lists every
 * texture with its name and register, interned in the string table exactly as a
 * shipped Carbon file does. That is the name authority, and duplicating it here
 * would create two places to disagree.
 *
 * **Merge layer counts.** A merged detail-map array's layer count is the number
 * of inputs on its transform in the section below. The emitter also reports
 * `arrayLayerCount` and `mergedFrom` on the binding for standalone callers with
 * no container around them, and those are intentionally not stored: inside a
 * container the transform is the single source of truth for what merged.
 */

/**
 * ## This block carries no version of its own
 *
 * **Carbon's container version is the only version.** An independent counter
 * here would be a second versioning axis over the same bytes, and the two would
 * have to be reasoned about together at every change — while describing a block
 * that is only ever written and read by the same build, because every consumer
 * calls `buildEffect` and then `read` on its result in-process.
 *
 * A shape change is therefore not a compatibility event, it is a rebuild. Stale
 * artifacts are deleted and regenerated rather than parsed by an older path, and
 * the trailing-byte check at the end of the read is what catches a mismatch: a
 * record that does not land exactly on its declared size is a hard error, not a
 * degraded read.
 *
 * This replaced a private version byte whose v1 wrote sampler registers only for
 * comparison sampling and recovered `comparison` as "that list is non-empty".
 * Carrying the texture-to-sampler pairing for ordinary textures under that
 * encoding would have marked every one of them a shadow sampler, so the two are
 * now independent fields — as they always were independent facts.
 *
 * Why the pairing is here at all: D3D pairs a texture with a sampler at each
 * sample site, GLSL merges the two into one uniform, and Carbon's reflection
 * relates them nowhere. A consumer without this field can only match `t#`
 * against `s#` by number, which is coincidence — see
 * `/docs/contracts/texture-sampler-pairing.md`.
 */

/**
 * Stage names, as a wire index.
 *
 * These are the emitter's own names, which are Carbon's and D3D's: the pixel
 * stage is `pixel`, not `fragment`. The WebGPU block's visibility enum says
 * `fragment` because that is WGSL's word. Neither is translated into the other -
 * each block speaks its own backend's vocabulary, and the stage a record belongs
 * to is never inferred across the two.
 */
const GLSL_BACKEND_STAGE = Object.freeze(["vertex", "pixel", "compute"]);

/**
 * Binding kinds, ordered so the wire value is stable. These are the emitter's
 * own `binding.kind` values (`DxbcGlslEmitter.js`).
 */
const GLSL_BACKEND_BINDING_KIND = Object.freeze(["constantBuffer", "resource", "bufferTexture", "structuredTexture", "structuredUbo", "uavTexture", "dispatchUniform"]);

/** Constant-buffer declaration styles. */
const GLSL_BACKEND_CONSTANT_BUFFER_STYLE = Object.freeze(["array", "std140"]);

/** Sampler type per WebGL2-supported DXBC resource dimension. */
const SAMPLER_TYPE_BY_DIMENSION = Object.freeze({
  2: "sampler2D",
  3: "sampler2D",
  5: "sampler3D",
  6: "samplerCube",
  8: "sampler2DArray"
});

/** Shadow-sampler type per WebGL2-supported DXBC resource dimension. */
const SHADOW_SAMPLER_TYPE_BY_DIMENSION = Object.freeze({
  3: "sampler2DShadow",
  6: "samplerCubeShadow",
  8: "sampler2DArrayShadow"
});

/** Texel formats a synthesised data texture always uses, by binding kind. */
const DATA_TEXTURE_FORMAT = Object.freeze({
  bufferTexture: "RGBA32F",
  structuredTexture: "RGBA32UI"
});

/** Marks an absent optional `u8`. */
const ABSENT_U8 = 0xff;

/**
 * Local-light lowering roles, as a wire index.
 *
 * Carbon puts local lights in two structured buffers plus a profile texture.
 * WebGL 2 has no structured buffers at all, so they have to be re-expressed —
 * this is a *storage* change, not a shading one, and without it the affected
 * shaders cannot bind their lights.
 *
 * The emitter still spells the role `cjsSemantic` on its binding records. That
 * name is not carried onto the wire: it names a defunct package format rather
 * than the thing it describes. Renaming it at the emitter is a separate change.
 */
const GLSL_LOCAL_LIGHT_ROLE = Object.freeze(["packed-texture", "constant-buffer"]);

/** Emitter `cjsSemantic` values, in the same order as the roles above. */
const EMITTER_LIGHT_SEMANTIC = Object.freeze(["packedLocalLights", "localLights"]);

/**
 * Writes the optional local-light lowering record.
 *
 * Carries the source registers so a consumer can tie the synthesised resource
 * back to the Carbon resources it replaced, which is otherwise unrecoverable:
 * the shader no longer declares them.
 *
 * @param {CjsByteWriter} writer Target writer.
 * @param {object} binding Emitter binding record.
 */
function writeLocalLightRecord(writer, binding) {
  const role = EMITTER_LIGHT_SEMANTIC.indexOf(binding.cjsSemantic);
  if (!binding.cjsSemantic) {
    writer.u8(0);
    return;
  }
  if (role < 0) {
    throw new CjsFormatWriteError(`Binding "${binding.name}" carries unknown local-light role "${binding.cjsSemantic}"`, {
      name: binding.name,
      semantic: binding.cjsSemantic
    });
  }
  writer.u8(1);
  writer.u8(role);
  writer.u8(binding.lightIndexRegister);
  writer.u8(binding.lightDataRegister);
  // The profile array is optional: some permutations never sample it, and the
  // lowering replaces it with neutral attenuation when it is absent.
  writer.u8(binding.lightProfileRegister ?? ABSENT_U8);
  writer.u32(binding.dataTexelBase ?? 0);
  writer.u16(binding.capacityLights ?? 0);
}

/**
 * Reads the optional local-light lowering record.
 *
 * @param {CjsByteReader} reader Source reader.
 * @returns {object|null} Local-light fields, or null when the binding is ordinary.
 */
function readLocalLightRecord(reader) {
  if (!reader.readUint8()) return null;
  const role = GLSL_LOCAL_LIGHT_ROLE[reader.readUint8()];
  const lightIndexRegister = reader.readUint8();
  const lightDataRegister = reader.readUint8();
  const profile = reader.readUint8();
  const dataTexelBase = reader.readUint32();
  const capacityLights = reader.readUint16();
  return {
    localLightRole: role,
    lightIndexRegister,
    lightDataRegister,
    lightProfileRegister: profile === ABSENT_U8 ? null : profile,
    ...(role === "packed-texture" ? {
      dataTexelBase
    } : {}),
    ...(role === "constant-buffer" ? {
      capacityLights
    } : {})
  };
}

/**
 * Writes one binding's kind-specific payload.
 *
 * @param {CjsByteWriter} writer Target writer.
 * @param {object} binding Emitter binding record.
 */
function writeBindingBody(writer, binding) {
  switch (binding.kind) {
    case "constantBuffer":
      {
        const style = GLSL_BACKEND_CONSTANT_BUFFER_STYLE.indexOf(binding.style ?? "array");
        if (style < 0) {
          throw new CjsFormatWriteError(`Unknown constant-buffer style "${binding.style}"`, {
            style: binding.style
          });
        }
        writer.u16(binding.sizeInVec4);
        writer.u8(style);
        writeLocalLightRecord(writer, binding);
        break;
      }
    case "resource":
      {
        const dimension = DxbcResourceDimensionNames.indexOf(binding.dimensionName);
        if (dimension < 0) {
          throw new CjsFormatWriteError(`Unknown resource dimension "${binding.dimensionName}"`, {
            dimensionName: binding.dimensionName
          });
        }
        writer.u8(dimension);
        const samplers = binding.comparison ? binding.samplerRegisterIndices ?? [] : [];
        writer.u8(samplers.length);
        for (const register of samplers) writer.u8(register);
        // v2: comparison is its own fact, not "the list above is non-empty",
        // so the pairing below can be written for ordinary textures too.
        writer.u8(binding.comparison ? 1 : 0);
        const paired = binding.pairedSamplerRegisters ?? [];
        writer.u8(paired.length);
        for (const register of paired) writer.u8(register);
        break;
      }
    case "bufferTexture":
      writer.u16(binding.width);
      writeStringList(writer, binding.returnTypes);
      break;
    case "structuredTexture":
      writer.u32(binding.strideBytes ?? 0);
      writer.u16(binding.width);
      writeLocalLightRecord(writer, binding);
      break;
    case "structuredUbo":
      writer.u32(binding.strideBytes ?? 0);
      writer.u16(binding.capacityElements);
      break;
    case "uavTexture":
      writer.u8(binding.slice ?? ABSENT_U8);
      writer.u8(binding.location);
      writeStringList(writer, binding.returnTypes);
      break;
    case "dispatchUniform":
      break;
    default:
      throw new CjsFormatWriteError(`Unknown binding kind "${binding.kind}"`, {
        kind: binding.kind
      });
  }
}

/**
 * Reads one binding's kind-specific payload, restoring derived fields.
 *
 * @param {CjsByteReader} reader Source reader.
 * @param {string} kind Binding kind.
 * @returns {object} Kind-specific fields.
 */
function readBindingBody(reader, kind) {
  switch (kind) {
    case "constantBuffer":
      {
        const sizeInVec4 = reader.readUint16();
        const style = GLSL_BACKEND_CONSTANT_BUFFER_STYLE[reader.readUint8()];
        return {
          sizeInVec4,
          style,
          ...(readLocalLightRecord(reader) ?? {})
        };
      }
    case "resource":
      {
        const dimension = reader.readUint8();
        const samplerCount = reader.readUint8();
        const samplerRegisterIndices = [];
        for (let index = 0; index < samplerCount; index += 1) {
          samplerRegisterIndices.push(reader.readUint8());
        }
        // Comparison is its own fact rather than "the register list above is
        // non-empty", which is what frees the pairing below to be written
        // for ordinary textures too.
        const comparison = reader.readUint8() === 1;
        const pairedSamplerRegisters = [];
        const pairedCount = reader.readUint8();
        for (let index = 0; index < pairedCount; index += 1) {
          pairedSamplerRegisters.push(reader.readUint8());
        }
        const samplerType = comparison ? SHADOW_SAMPLER_TYPE_BY_DIMENSION[dimension] : SAMPLER_TYPE_BY_DIMENSION[dimension];
        if (!samplerType) {
          throw new CjsFormatReadError(`Resource dimension ${dimension} has no ${comparison ? "shadow " : ""}sampler type`, {
            dimension,
            comparison
          });
        }
        return {
          samplerType,
          dimensionName: DxbcResourceDimensionNames[dimension] ?? `dimension_${dimension}`,
          ...(pairedSamplerRegisters.length ? {
            pairedSamplerRegisters
          } : {}),
          ...(comparison ? {
            comparison: true,
            samplerRegisterIndices
          } : {})
        };
      }
    case "bufferTexture":
      return {
        format: DATA_TEXTURE_FORMAT.bufferTexture,
        width: reader.readUint16(),
        returnTypes: readStringList(reader)
      };
    case "structuredTexture":
      {
        const strideBytes = reader.readUint32();
        const width = reader.readUint16();
        return {
          strideBytes,
          format: DATA_TEXTURE_FORMAT.structuredTexture,
          width,
          ...(readLocalLightRecord(reader) ?? {})
        };
      }
    case "structuredUbo":
      return {
        strideBytes: reader.readUint32(),
        capacityElements: reader.readUint16()
      };
    case "uavTexture":
      {
        const slice = reader.readUint8();
        return {
          slice: slice === ABSENT_U8 ? null : slice,
          location: reader.readUint8(),
          returnTypes: readStringList(reader)
        };
      }
    case "dispatchUniform":
      return {};
    default:
      throw new CjsFormatReadError(`Unknown binding kind "${kind}"`, {
        kind
      });
  }
}

/**
 * Writes an optional count-prefixed string list.
 *
 * @param {CjsByteWriter} writer Target writer.
 * @param {string[]|null} values String list, or null.
 */
function writeStringList(writer, values) {
  const list = Array.isArray(values) ? values : [];
  writer.u8(list.length);
  for (const value of list) writeInlineString(writer, value);
}

/**
 * Reads an optional count-prefixed string list.
 *
 * @param {CjsByteReader} reader Source reader.
 * @returns {string[]|null} String list, or null when empty.
 */
function readStringList(reader) {
  const count = reader.readUint8();
  if (!count) return null;
  const values = [];
  for (let index = 0; index < count; index += 1) values.push(readInlineString(reader));
  return values;
}

/**
 * Writes the compute-as-fragment section.
 *
 * @param {CjsByteWriter} writer Target writer.
 * @param {object|null} computeFragment Compute-fragment contract, or null.
 */
function writeComputeFragment(writer, computeFragment) {
  if (!computeFragment) {
    writer.u8(0);
    return;
  }
  writer.u8(1);
  const threadGroup = computeFragment.threadGroup;
  writer.u8(threadGroup ? 1 : 0);
  if (threadGroup) for (const extent of threadGroup) writer.u16(extent);
  writeInlineString(writer, computeFragment.dispatchOriginUniform ?? "");
  const outputs = computeFragment.uavOutputs ?? [];
  writer.u8(outputs.length);
  for (const output of outputs) {
    writer.u8(output.register);
    writer.u8(output.slice ?? ABSENT_U8);
    writer.u8(output.location);
    writeInlineString(writer, output.glslName);
  }
}

/**
 * Reads the compute-as-fragment section.
 *
 * @param {CjsByteReader} reader Source reader.
 * @returns {object|null} Compute-fragment contract, or null.
 */
function readComputeFragment(reader) {
  if (!reader.readUint8()) return null;
  const threadGroup = reader.readUint8() ? [reader.readUint16(), reader.readUint16(), reader.readUint16()] : null;
  const dispatchOriginUniform = readInlineString(reader);
  const uavOutputs = [];
  const outputCount = reader.readUint8();
  for (let index = 0; index < outputCount; index += 1) {
    const register = reader.readUint8();
    const slice = reader.readUint8();
    uavOutputs.push({
      register,
      slice: slice === ABSENT_U8 ? null : slice,
      location: reader.readUint8(),
      glslName: readInlineString(reader)
    });
  }
  return {
    threadGroup,
    dispatchOriginUniform: dispatchOriginUniform === "" ? null : dispatchOriginUniform,
    uavOutputs
  };
}

/**
 * Serialises one pass's GLSL backend block.
 *
 * @param {object} block Block contents.
 * @param {object} [block.stages] Per-stage lowering data, keyed by stage name.
 * @param {object[]} [block.transforms] Resource transforms.
 * @returns {Uint8Array} Self-contained block bytes.
 */
function writeGlslBackendBlock(block) {
  const stages = block.stages ?? {};
  const writer = new CjsByteWriter(256);

  // Canonical stage order, not object insertion order: two passes with the
  // same lowering must produce the same bytes so the arena dedupes them.
  const present = GLSL_BACKEND_STAGE.filter(name => stages[name]);
  writer.u8(present.length);
  for (const stageName of present) {
    const stage = stages[stageName];
    writer.u8(GLSL_BACKEND_STAGE.indexOf(stageName));
    const bindings = stage.bindings ?? [];
    writer.u8(bindings.length);
    for (const binding of bindings) {
      const kind = GLSL_BACKEND_BINDING_KIND.indexOf(binding.kind);
      if (kind < 0) {
        throw new CjsFormatWriteError(`Unknown binding kind "${binding.kind}"`, {
          kind: binding.kind
        });
      }
      writer.u8(kind);
      writer.u8(binding.registerIndex ?? ABSENT_U8);
      writeInlineString(writer, binding.name);
      writeBindingBody(writer, binding);
    }
    const stageInputs = stage.stageInputs ?? [];
    writer.u8(stageInputs.length);
    for (const input of stageInputs) {
      const componentType = DxbcComponentTypeNames.indexOf(input.componentTypeName);
      if (componentType < 0) {
        throw new CjsFormatWriteError(`Unknown component type "${input.componentTypeName}"`, {
          componentTypeName: input.componentTypeName
        });
      }
      writer.u8(input.register);
      writeInlineString(writer, input.name);
      writeInlineString(writer, input.semanticName);
      writer.u8(input.semanticIndex);
      writer.u8(componentType);
      writer.u8(input.mask);
    }
    writeComputeFragment(writer, stage.computeFragment ?? null);
  }
  writeTransformSection(writer, block.transforms ?? []);
  return writer.toBytes();
}

/**
 * Parses one pass's GLSL backend block, restoring every derived field.
 *
 * @param {ArrayBuffer|ArrayBufferView|Uint8Array} bytes Block bytes.
 * @param {object} [options] Read options.
 * @param {string} [options.layoutKey] Enclosing pass key, restored onto records.
 * @param {string} [options.source] Source name for error details.
 * @returns {object} Block contents with derived fields restored.
 */
function readGlslBackendBlock(bytes, options = {}) {
  const reader = new CjsByteReader(bytes, {
    source: options.source ?? "glsl backend block"
  });
  const layoutKey = options.layoutKey ?? null;

  // No version byte is read, because none is written: Carbon's container
  // version is the only version. A block whose shape does not match this build
  // fails on the trailing-byte check below rather than being detected here,
  // and the fix for that is to rebuild the package, never to add a branch.
  const stages = {};
  const stageCount = reader.readUint8();
  for (let index = 0; index < stageCount; index += 1) {
    const stageName = GLSL_BACKEND_STAGE[reader.readUint8()];
    const bindings = [];
    const bindingCount = reader.readUint8();
    for (let bindingIndex = 0; bindingIndex < bindingCount; bindingIndex += 1) {
      const kind = GLSL_BACKEND_BINDING_KIND[reader.readUint8()];
      const registerIndex = reader.readUint8();
      const name = readInlineString(reader);
      bindings.push({
        kind,
        ...(registerIndex === ABSENT_U8 ? {} : {
          registerIndex
        }),
        name,
        ...readBindingBody(reader, kind)
      });
    }
    const stageInputs = [];
    const stageInputCount = reader.readUint8();
    for (let inputIndex = 0; inputIndex < stageInputCount; inputIndex += 1) {
      stageInputs.push({
        register: reader.readUint8(),
        name: readInlineString(reader),
        semanticName: readInlineString(reader),
        semanticIndex: reader.readUint8(),
        componentTypeName: DxbcComponentTypeNames[reader.readUint8()],
        mask: reader.readUint8()
      });
    }
    const computeFragment = readComputeFragment(reader);
    stages[stageName] = {
      bindings,
      stageInputs,
      ...(computeFragment ? {
        computeFragment
      } : {})
    };
  }
  const transforms = readTransformSection(reader, layoutKey);

  // A sized record must land exactly on its declared end. Trailing bytes mean
  // the writer knew fields this reader does not, which without a version byte
  // is the ONLY signal that a block came from a different build - so this is
  // load-bearing rather than defensive, and it is why removing the version is
  // safe. The fix is always to rebuild the package.
  if (reader.remaining !== 0) {
    throw new CjsFormatReadError(`GLSL backend block has ${reader.remaining} unparsed trailing byte(s); rebuild the effect package`, {
      source: options.source ?? "glsl backend block",
      trailingBytes: reader.remaining
    });
  }
  return {
    layoutKey,
    stages,
    transforms,
    trailingBytes: 0
  };
}

export { GLSL_BACKEND_BINDING_KIND, GLSL_BACKEND_CONSTANT_BUFFER_STYLE, GLSL_BACKEND_STAGE, GLSL_LOCAL_LIGHT_ROLE, readGlslBackendBlock, writeGlslBackendBlock };
//# sourceMappingURL=glslBackendBlock.js.map
