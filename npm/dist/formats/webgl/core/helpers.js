import { CewgPackage } from './cewg/CewgPackage.js';
import { CewgPackageBuilder } from './cewg/CewgPackageBuilder.js';
import { DxbcGlslEmitter } from './glsl/DxbcGlslEmitter.js';
import { WebglReadError } from './errors.js';
import { validateEffectPackageEnvelope } from './effectPackageValidation.js';

/**
 * Internal read-pipeline glue for CjsWebglFormat.
 *
 * Keeps the public class file small: input/option normalization, the shared
 * CEWG package read path used by both the instance and the static one-shots,
 * package construction, DXBC-to-GLSL emission, and JSON conversion all live
 * here. The CEWG container parser lives under src/core/cewg (internal parsing
 * machinery, not part of this package's public surface); the GLSL emitter
 * lives under src/core/glsl.
 */

const OUTPUT_JSON = "json";
const OUTPUT_RAW = "raw";
const CEWG_MAGIC = "CEWG";
const CEWG_FORMAT = "CEWG";
const DEFAULT_VALUES = Object.freeze({
  emit: OUTPUT_JSON,
  source: "memory"
});
const VALID_EMITS = new Set([OUTPUT_JSON, OUTPUT_RAW]);
const OPTION_KEYS = new Set(["emit", "source"]);

/**
 * Merge format values over a base set and validate them.
 *
 * @param {object} base Current values.
 * @param {object} [options] Values to merge in.
 * @param {string} [readerName] Reader name used in error messages.
 * @returns {object} A validated copy of the merged values.
 */
function normalizeValues(base, options = {}, readerName = "CjsWebglFormat") {
  if (!options || typeof options !== "object") {
    throw new TypeError(`${readerName}: options must be an object`);
  }
  for (const key of Object.keys(options)) {
    if (!OPTION_KEYS.has(key)) {
      throw new TypeError(`${readerName}: unknown option ${JSON.stringify(key)}`);
    }
  }
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
  return {
    emit: values.emit,
    source: values.source
  };
}

/**
 * Normalize caller input into a Uint8Array of package/DXBC bytes.
 *
 * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input Candidate payload.
 * @returns {Uint8Array} The payload bytes.
 */
function toBytes(input) {
  if (input instanceof Uint8Array) return input;
  if (typeof ArrayBuffer !== "undefined" && input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  throw new TypeError("CjsWebglFormat: input must be CEWG package bytes (Uint8Array, Buffer, DataView or ArrayBuffer)");
}

/**
 * Sniffs whether a payload starts with the CEWG container magic.
 *
 * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input Candidate payload.
 * @returns {boolean} True when the payload looks like a CEWG package.
 */
function isCewg(input) {
  try {
    const bytes = toBytes(input);
    return bytes.length >= CEWG_MAGIC.length && CEWG_MAGIC.split("").every((char, index) => bytes[index] === char.charCodeAt(0));
  } catch {
    return false;
  }
}

/**
 * The shared read path used by the instance Read/Inspect and the static
 * one-shots: normalizes input bytes and loads a CewgPackage.
 *
 * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input CEWG package payload.
 * @param {object} values Normalized format values.
 * @returns {CewgPackage} The loaded package.
 */
function readRaw(input, values) {
  const bytes = toBytes(input);
  const pkg = new CewgPackage();
  const ok = pkg.Read(bytes, {
    sourcePath: values.source
  });
  if (!ok) {
    throw new WebglReadError(pkg.readError ? pkg.readError.message : "Failed to read CEWG package", {
      source: values.source,
      cause: pkg.readError || null
    });
  }
  try {
    validateEffectPackageEnvelope(pkg);
  } catch (error) {
    throw new WebglReadError(error.message, {
      source: values.source,
      cause: error
    });
  }
  return pkg;
}

/**
 * Reads the `GLSL` chunk's shader records, when present.
 *
 * @param {CewgPackage} pkg Loaded package.
 * @returns {object[]} Shader records, or an empty array when absent.
 */
function glslShaders(pkg) {
  const glslJson = pkg.glslJson;
  return Array.isArray(glslJson?.shaders) ? glslJson.shaders : [];
}

/**
 * Reads the `GLSL` chunk's stage records, when present.
 *
 * @param {CewgPackage} pkg Loaded package.
 * @returns {object[]} Stage records, or an empty array when absent.
 */
function glslStages(pkg) {
  const glslJson = pkg.glslJson;
  return Array.isArray(glslJson?.stages) ? glslJson.stages : [];
}

/**
 * Converts a loaded package to the documented plain JSON shape.
 *
 * @param {CewgPackage} pkg Loaded package.
 * @returns {object} Plain JSON data.
 */
function packageToJson(pkg) {
  return toJsonValue({
    format: CEWG_FORMAT,
    version: pkg.version,
    sourcePath: pkg.sourcePath,
    chunks: pkg.chunks.map(({
      tag,
      size,
      offset
    }) => ({
      tag,
      size,
      offset
    })),
    info: pkg.info,
    metadata: pkg.metadata,
    permutationGraph: pkg.permutationGraph,
    reflection: pkg.reflection,
    reflectionBlobByteLength: pkg.reflectionBlobBytes?.byteLength ?? 0,
    glsl: pkg.glslJson !== null ? pkg.glslJson : pkg.glsl,
    shaders: glslShaders(pkg)
  });
}

/**
 * Shared read entry honouring the emit mode.
 *
 * `emit: "raw"` returns the live CewgPackage instance — internal, unstable,
 * not schema-guaranteed. `emit: "json"` (the default) returns the documented
 * plain-data package shape: parsed INFO/META/GLSL chunks plus a flat shader
 * record list.
 *
 * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input CEWG package payload.
 * @param {object} values Normalized format values.
 * @returns {CewgPackage|object} The raw package instance, or the documented JSON shape.
 */
function readWithValues(input, values) {
  const pkg = readRaw(input, values);
  return values.emit === OUTPUT_RAW ? pkg : packageToJson(pkg);
}

/**
 * Cheap inspection: version, chunk tags/sizes, and GLSL shader/stage counts,
 * without building the full JSON package shape.
 *
 * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input CEWG package payload.
 * @param {object} values Normalized format values.
 * @returns {object} Plain summary data.
 */
function inspectWithValues(input, values) {
  const pkg = readRaw(input, values);
  const info = pkg.info;
  const permutationGraph = pkg.permutationGraph;
  return {
    source: values.source,
    isCewg: true,
    version: pkg.version,
    chunks: pkg.chunks.map(({
      tag,
      size,
      offset
    }) => ({
      tag,
      size,
      offset
    })),
    shaderCount: glslShaders(pkg).length,
    stageCount: glslStages(pkg).length,
    permutationCount: permutationGraph?.variants?.length ?? 0,
    uniqueBodyCount: permutationGraph?.bodies?.length ?? 0,
    reflectionBodyCount: info?.effectReflection?.bodyCount ?? 0,
    reflectionSourceProgramCount: info?.effectReflection?.sourceProgramCount ?? 0,
    reflectionBlobCount: info?.effectReflection?.blobCount ?? 0,
    reflectionBlobByteLength: info?.effectReflection?.blobByteLength ?? 0
  };
}

/**
 * Assembles a CEWG package from ordered chunk payloads.
 *
 * @param {Array<[string, string|object|Uint8Array|ArrayBuffer|ArrayBufferView]>} chunks Ordered package chunks.
 * @returns {Uint8Array} Package bytes.
 */
function buildPackage(chunks) {
  return CewgPackageBuilder.build(chunks);
}
const EMIT_GLSL_OPTION_KEYS = new Set(["constantBufferStyle", "pixelConstantBufferRemap", "samplerName", "vertexStructuredCapacity", "dataTextureWidth", "stubResourceRegisters", "lightConstantBuffer", "lightPackedTexture", "pairVaryings", "source"]);
const EMIT_GLSL_PROFILE_KEYS = new Set(["constantBufferStyle", "pixelConstantBufferRemap", "samplerName", "vertexStructuredCapacity", "dataTextureWidth", "stubResourceRegisters", "lightConstantBuffer", "lightPackedTexture"]);

/**
 * Translates one DXBC stage into GLSL ES 3.00 source, sharing one core path
 * between `CjsWebglFormat.emitGlsl` (static) and `EmitGlsl` (instance).
 *
 * `options` is a flat bag combining the emitter's ccpwgl-profile constructor
 * bits (`constantBufferStyle`, `pixelConstantBufferRemap`, `samplerName`,
 * `vertexStructuredCapacity`, `dataTextureWidth`) with its per-call Emit
 * options (`pairVaryings`, `source`); omitted keys keep the emitter's
 * existing defaults exactly.
 *
 * @param {ArrayBuffer|ArrayBufferView|Uint8Array} dxbcBytes DXBC container bytes.
 * @param {object} [options] Combined profile/emit options.
 * @returns {{source:string,stageName:string,inputs:object[],outputs:object[],bindings:object[],warnings:string[],computeFragment:(object|undefined)}}
 *   GLSL text plus the IO contract the packaging layer records; compute
 *   stages add the emitter's `computeFragment` host contract.
 */
function emitGlslWithOptions(dxbcBytes, options = {}) {
  if (!options || typeof options !== "object") {
    throw new TypeError("CjsWebglFormat: emitGlsl options must be an object");
  }
  for (const key of Object.keys(options)) {
    if (!EMIT_GLSL_OPTION_KEYS.has(key)) {
      throw new TypeError(`CjsWebglFormat: unknown emitGlsl option ${JSON.stringify(key)}`);
    }
  }
  const profile = {};
  for (const key of EMIT_GLSL_PROFILE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(options, key)) profile[key] = options[key];
  }
  const emitter = new DxbcGlslEmitter({
    profile
  });
  return emitter.Emit(dxbcBytes, {
    source: options.source,
    pairVaryings: options.pairVaryings
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

export { CEWG_FORMAT, CEWG_MAGIC, DEFAULT_VALUES, OUTPUT_JSON, OUTPUT_RAW, WebglReadError, buildPackage, emitGlslWithOptions, inspectWithValues, isCewg, normalizeValues, packageToJson, readRaw, readWithValues, toBytes, toJsonValue };
//# sourceMappingURL=helpers.js.map
