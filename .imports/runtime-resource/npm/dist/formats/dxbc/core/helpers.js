import { DxbcContainer } from './container.js';
import { DxbcSignatureChunk } from './signature.js';
import { DxbcShaderProgram } from './program.js';
import { DxbcInstructionDecoder } from './decoder.js';

/**
 * Internal read-pipeline glue for CjsDxbcFormat.
 *
 * Keeps the public class file small: input normalization, option
 * normalization, the shared read path used by both the instance and the
 * static one-shots, and JSON conversion live here.
 */

const OUTPUT_JSON = "json";
const OUTPUT_RAW = "raw";
const DEFAULT_VALUES = Object.freeze({
  emit: OUTPUT_JSON,
  source: "memory",
  decodeInstructions: true
});
const VALID_EMITS = new Set([OUTPUT_JSON, OUTPUT_RAW]);
const INPUT_SIGNATURE_TAGS = ["ISGN", "ISG1"];
const OUTPUT_SIGNATURE_TAGS = ["OSGN", "OSG1", "OSG5"];
const PATCH_SIGNATURE_TAGS = ["PCSG", "PSG1"];

/**
 * Merge format values over a base set and validate them.
 *
 * @param {object} base Current values.
 * @param {object} [options] Values to merge in.
 * @param {string} [readerName] Reader name used in error messages.
 * @returns {object} A validated copy of the merged values.
 */
function normalizeValues(base, options = {}, readerName = "CjsDxbcFormat") {
  const values = {
    ...base,
    ...options
  };
  if (!VALID_EMITS.has(values.emit)) {
    throw new TypeError(`${readerName}: emit must be "${OUTPUT_JSON}" or "${OUTPUT_RAW}", got ${JSON.stringify(values.emit)}`);
  }
  if (typeof values.source !== "string" || !values.source) {
    values.source = DEFAULT_VALUES.source;
  }
  values.decodeInstructions = !!values.decodeInstructions;
  return {
    emit: values.emit,
    source: values.source,
    decodeInstructions: values.decodeInstructions
  };
}

/**
 * Normalize caller input into a Uint8Array of DXBC bytes.
 *
 * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input Candidate payload.
 * @returns {Uint8Array} The payload bytes.
 */
function toBytes(input) {
  if (input instanceof Uint8Array) return input;
  if (typeof ArrayBuffer !== "undefined" && input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  throw new TypeError("CjsDxbcFormat: input must be DXBC bytes (Uint8Array, Buffer, DataView or ArrayBuffer)");
}

/**
 * Read a signature chunk group from a container if present.
 *
 * @param {DxbcContainer} container Parsed container.
 * @param {string[]} tags Chunk fourCC candidates in priority order.
 * @param {string} source Source name for errors.
 * @returns {?DxbcSignatureChunk} Parsed signature or null.
 */
function readSignature(container, tags, source) {
  for (const tag of tags) {
    const chunk = container.getChunk(tag);
    if (chunk) return new DxbcSignatureChunk().Read(chunk, {
      source
    });
  }
  return null;
}

/**
 * The shared read path used by the instance Read and the static read.
 *
 * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input DXBC payload.
 * @param {object} values Normalized format values.
 * @returns {object} Raw read result (class instances).
 */
function readRaw(input, values) {
  const bytes = toBytes(input);
  const source = values.source;
  const container = new DxbcContainer().Read(bytes, {
    source
  });
  const shex = container.getChunk("SHEX") || container.getChunk("SHDR");
  const result = {
    source,
    container,
    program: null,
    decoder: null,
    inputSignature: readSignature(container, INPUT_SIGNATURE_TAGS, source),
    outputSignature: readSignature(container, OUTPUT_SIGNATURE_TAGS, source),
    patchSignature: readSignature(container, PATCH_SIGNATURE_TAGS, source)
  };
  if (shex) {
    result.program = new DxbcShaderProgram().Read(shex, {
      source
    });
    if (values.decodeInstructions) {
      result.decoder = new DxbcInstructionDecoder().Decode(result.program, {
        source
      });
    }
  }
  return result;
}

/**
 * Convert a raw read result to plain JSON-compatible data.
 *
 * @param {object} raw Raw read result from readRaw.
 * @returns {object} Plain data.
 */
function rawToJson(raw) {
  return toJsonValue({
    source: raw.source,
    container: raw.container.toJSON(),
    program: raw.program ? {
      fourCC: raw.program.fourCC,
      programType: raw.program.programType,
      programTypeName: raw.program.programTypeName,
      majorVersion: raw.program.majorVersion,
      minorVersion: raw.program.minorVersion,
      lengthDwords: raw.program.lengthDwords
    } : null,
    inputSignature: raw.inputSignature ? raw.inputSignature.elements : null,
    outputSignature: raw.outputSignature ? raw.outputSignature.elements : null,
    patchSignature: raw.patchSignature ? raw.patchSignature.elements : null,
    instructions: raw.decoder ? raw.decoder.instructions : null
  });
}

/**
 * Shared read entry honouring the emit mode.
 *
 * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input DXBC payload.
 * @param {object} values Normalized format values.
 * @returns {object} Raw result or plain JSON data per values.emit.
 */
function readWithValues(input, values) {
  const raw = readRaw(input, values);
  return values.emit === OUTPUT_RAW ? raw : rawToJson(raw);
}

/**
 * Cheap inspection: container/program facts without instruction decode.
 *
 * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input DXBC payload.
 * @param {object} values Normalized format values.
 * @returns {object} Plain summary data.
 */
function inspectWithValues(input, values) {
  const raw = readRaw(input, {
    ...values,
    decodeInstructions: false
  });
  return toJsonValue({
    source: raw.source,
    isDxbc: true,
    version: raw.container.version,
    totalSize: raw.container.totalSize,
    chunks: raw.container.chunks.map(({
      fourCC,
      offset,
      size
    }) => ({
      fourCC,
      offset,
      size
    })),
    programTypeName: raw.program ? raw.program.programTypeName : null,
    shaderModel: raw.program ? `${raw.program.majorVersion}.${raw.program.minorVersion}` : null,
    inputElementCount: raw.inputSignature ? raw.inputSignature.elements.length : 0,
    outputElementCount: raw.outputSignature ? raw.outputSignature.elements.length : 0
  });
}

/**
 * Deep-convert a value to plain JSON-compatible data. Typed arrays become
 * plain number arrays; Maps/Sets become objects/arrays; class instances
 * with toJSON are honoured.
 *
 * @param {any} value Value to convert.
 * @returns {any} Plain data.
 */
function toJsonValue(value) {
  if (value === null || value === undefined) return value ?? null;
  if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (ArrayBuffer.isView(value)) return Array.from(value);
  if (Array.isArray(value)) return value.map(toJsonValue);
  if (value instanceof Map) {
    const out = {};
    for (const [key, entry] of value) out[key] = toJsonValue(entry);
    return out;
  }
  if (value instanceof Set) return Array.from(value, toJsonValue);
  if (typeof value === "object") {
    if (typeof value.toJSON === "function") return toJsonValue(value.toJSON());
    const out = {};
    for (const key of Object.keys(value)) out[key] = toJsonValue(value[key]);
    return out;
  }
  return null;
}

export { DEFAULT_VALUES, OUTPUT_JSON, OUTPUT_RAW, inspectWithValues, normalizeValues, rawToJson, readRaw, readWithValues, toBytes, toJsonValue };
//# sourceMappingURL=helpers.js.map
