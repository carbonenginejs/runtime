import { CjsByteWriter } from '../../../format/CjsByteWriter.js';
import '../../../format/CjsByteReader.js';
import { CjsFormatWriteError } from '../../../format/CjsFormatError.js';
import { writeInlineString, writeTransformSection } from '../../../format/carbonEffect/carbonEffectResourceTransform.js';
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
 * Both codecs start at their own version 1, and that is safe: which one parses a
 * given block is decided by the resource path the file came from, the same way
 * the backend itself is chosen. Nothing has to sniff.
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
 */

/** Current block version. Bump when a field is added; readers may skip unknown. */
const GLSL_BACKEND_BLOCK_VERSION = 1;

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

/** Marks an absent optional `u8`. */
const ABSENT_U8 = 0xff;

/**
 * Rejects the local-light lowering profiles.
 *
 * `--packed-light-texture` and `--light-constant-buffer` synthesise a data
 * texture or a capacity-sized UBO to stand in for local lights, and tag the
 * binding with a `cewgSemantic`. Those profiles are off by default and are not
 * carried into this container: local lights reach a shader through a constant
 * buffer whose register index carries its meaning
 * (docs/contracts/constant-buffer-slots.md), and a synthesised substitute would
 * put a second, undocumented mechanism next to that contract.
 *
 * This fails closed rather than dropping the field, so enabling a profile
 * produces an error naming the binding instead of a container that packages
 * cleanly and renders without lights.
 *
 * @param {object} binding Emitter binding record.
 */
function rejectLightProfileBinding(binding) {
  if (!binding.cewgSemantic) return;
  throw new CjsFormatWriteError(`Binding "${binding.name}" carries the "${binding.cewgSemantic}" local-light lowering ` + "profile, which the WebGL container does not encode; build without " + "--packed-light-texture / --light-constant-buffer", {
    name: binding.name,
    semantic: binding.cewgSemantic
  });
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
        break;
      }
    case "bufferTexture":
      writer.u16(binding.width);
      writeStringList(writer, binding.returnTypes);
      break;
    case "structuredTexture":
      writer.u32(binding.strideBytes ?? 0);
      writer.u16(binding.width);
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
  writer.u8(GLSL_BACKEND_BLOCK_VERSION);

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
      rejectLightProfileBinding(binding);
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

export { GLSL_BACKEND_BINDING_KIND, GLSL_BACKEND_BLOCK_VERSION, GLSL_BACKEND_CONSTANT_BUFFER_STYLE, GLSL_BACKEND_STAGE, writeGlslBackendBlock };
//# sourceMappingURL=glslBackendBlock.js.map
