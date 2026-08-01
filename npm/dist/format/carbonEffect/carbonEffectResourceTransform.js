import { CjsFormatWriteError } from '../CjsFormatError.js';

/**
 * The resource-transform section, shared by every backend's per-pass block.
 *
 * A resource transform is a recipe for building one backend resource out of
 * several Carbon ones. It is deliberately backend-neutral: `detail-map-array`
 * merges `Detail1Map`, `Detail2Map` and `Detail3Map` into one array texture, and
 * that decision is about the *resources*, not about WGSL or GLSL. Both backends
 * want the identical merge, for different reasons - WebGPU to reduce binding
 * churn, WebGL 2 because the family otherwise needs 17 texture units against a
 * limit of 16 (docs/contracts/webgl2-texture-budget.md).
 *
 * So the section lives here rather than in either backend's block codec, and the
 * two codecs compose it. A transform written by one backend decodes identically
 * under the other.
 */

/**
 * Resource-transform families. The discriminator exists so `kind`,
 * `representation`, `missingLayer` and the output name stay derivable without
 * pinning the format to one recognizer: a second family costs an enum value
 * rather than a format version bump.
 */
const CARBON_BACKEND_TRANSFORM_FAMILY = Object.freeze(["detail-map-array"]);

/** Constants a `detail-map-array` transform restores rather than storing. */
const DETAIL_MAP_ARRAY_DEFAULTS = Object.freeze({
  version: 1,
  kind: "texture-2d-array",
  stage: "fragment",
  representation: "native-or-rgba8",
  missingLayer: "reject",
  viewDimension: "2d-array",
  outputName: "DetailMapArray"
});

/**
 * Writes a length-prefixed UTF-8 string.
 *
 * @param {object} writer Target byte writer.
 * @param {string} value Text value.
 */
function writeInlineString(writer, value) {
  const bytes = new TextEncoder().encode(String(value ?? ""));
  if (bytes.length > 0xffff) {
    throw new CjsFormatWriteError("Backend block string exceeds 65535 bytes", {
      byteLength: bytes.length
    });
  }
  writer.u16(bytes.length);
  writer.bytes(bytes);
}

/**
 * Reads a length-prefixed UTF-8 string.
 *
 * @param {object} reader Source byte reader.
 * @returns {string} Decoded text.
 */
function readInlineString(reader) {
  const length = reader.readUint16();
  return new TextDecoder("utf-8", {
    fatal: false
  }).decode(reader.readRaw(length));
}

/**
 * Writes the count-prefixed resource-transform section.
 *
 * @param {object} writer Target byte writer.
 * @param {object[]} transforms Resource transforms.
 */
function writeTransformSection(writer, transforms) {
  writer.u8(transforms.length);
  for (const transform of transforms) {
    const family = CARBON_BACKEND_TRANSFORM_FAMILY.indexOf(transform.family ?? "detail-map-array");
    if (family < 0) {
      throw new CjsFormatWriteError(`Unknown transform family "${transform.family}"`, {
        family: transform.family
      });
    }
    writer.u8(family);
    // `id` stays on the wire: a caller may supply it, and it propagates into
    // the engine binding as `transformId`. Deriving it would foreclose the
    // caller-supplied plan path to save four bytes.
    writeInlineString(writer, transform.id);
    writer.u8(transform.inputs.length);
    for (const input of transform.inputs) {
      // Array position is the layer. Safe because `parameter` stays on the
      // wire, so layer identity remains cross-checkable rather than
      // asserted by position.
      writer.u8(input.registerSpace);
      writer.u8(input.registerIndex);
      writeInlineString(writer, input.parameter);
    }
  }
}

/**
 * Reads the count-prefixed resource-transform section, restoring derived fields.
 *
 * @param {object} reader Source byte reader.
 * @param {string|null} layoutKey Enclosing pass key, restored onto records.
 * @returns {object[]} Resource transforms.
 */
function readTransformSection(reader, layoutKey) {
  const transforms = [];
  const transformCount = reader.readUint8();
  for (let index = 0; index < transformCount; index += 1) {
    const family = CARBON_BACKEND_TRANSFORM_FAMILY[reader.readUint8()];
    const id = readInlineString(reader);
    const inputs = [];
    const inputCount = reader.readUint8();
    for (let layer = 0; layer < inputCount; layer += 1) {
      const registerSpace = reader.readUint8();
      const registerIndex = reader.readUint8();
      const parameter = readInlineString(reader);
      const identity = `sampled-resource:${registerSpace}:${registerIndex}`;
      inputs.push({
        parameter,
        layer,
        identity,
        scopeIdentity: `${identity}@${DETAIL_MAP_ARRAY_DEFAULTS.stage}`
      });
    }
    transforms.push({
      id,
      family,
      version: DETAIL_MAP_ARRAY_DEFAULTS.version,
      kind: DETAIL_MAP_ARRAY_DEFAULTS.kind,
      stage: DETAIL_MAP_ARRAY_DEFAULTS.stage,
      representation: DETAIL_MAP_ARRAY_DEFAULTS.representation,
      missingLayer: DETAIL_MAP_ARRAY_DEFAULTS.missingLayer,
      layoutKey,
      inputs,
      output: {
        name: DETAIL_MAP_ARRAY_DEFAULTS.outputName,
        viewDimension: DETAIL_MAP_ARRAY_DEFAULTS.viewDimension,
        layerCount: inputs.length,
        identity: inputs[0]?.identity ?? null,
        scopeIdentity: inputs[0]?.scopeIdentity ?? null
      }
    });
  }
  return transforms;
}

export { CARBON_BACKEND_TRANSFORM_FAMILY, DETAIL_MAP_ARRAY_DEFAULTS, readInlineString, readTransformSection, writeInlineString, writeTransformSection };
//# sourceMappingURL=carbonEffectResourceTransform.js.map
