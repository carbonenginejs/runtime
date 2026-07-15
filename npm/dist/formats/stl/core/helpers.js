import { hydrateJson } from './json.js';
import { CMF_CLASS_KEYS, hydrateCmf, buildCmfFromShared } from './targets.js';
import { parseStl, trianglesToJson, jsonToTriangles, inspectTriangles, writeBinaryStl, writeAsciiStl, trianglesFromInput } from './stl.js';
export { isBinaryStl, isStl, toText } from './stl.js';

/**
 * Internal pipeline glue for CjsStlFormat.
 */

const GR2_CLASS_KEYS = Object.freeze(["Root", "Mesh", "BoneBinding", "IndexGroup", "MorphTarget", "Model", "Skeleton", "Bone", "Animation", "TrackGroup", "TransformTrack", "Curve"]);
const CLASS_KEYS = Object.freeze(Array.from(new Set([...GR2_CLASS_KEYS, ...CMF_CLASS_KEYS])));
const OUTPUT_JSON = "json";
const OUTPUT_STL_JSON = "stlJson";
const OUTPUT_SHARED = "shared";
const OUTPUT_GR2 = "gr2";
const OUTPUT_CMF = "cmf";
const DEFAULT_VALUES = Object.freeze({
  emit: OUTPUT_STL_JSON,
  source: "memory",
  binary: true,
  solidName: "carbonenginejs",
  scale: 1,
  recalculateNormals: true,
  weldVertices: false,
  weldTolerance: 1e-5,
  skipDegenerate: true,
  requireWatertight: false,
  classes: Object.freeze({})
});
const OPTION_KEYS = new Set(["emit", "source", "binary", "solidName", "scale", "recalculateNormals", "weldVertices", "weldTolerance", "skipDegenerate", "requireWatertight", "classes"]);
function validateBoolean(name, value, readerName) {
  if (typeof value === "boolean") return value;
  throw new TypeError(`${readerName}: ${name} must be true or false`);
}
function validateNumber(name, value, readerName, {
  minExclusive = null,
  minInclusive = null
} = {}) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${readerName}: ${name} must be a finite number`);
  }
  if (minExclusive !== null && value <= minExclusive) {
    throw new TypeError(`${readerName}: ${name} must be greater than ${minExclusive}`);
  }
  if (minInclusive !== null && value < minInclusive) {
    throw new TypeError(`${readerName}: ${name} must be at least ${minInclusive}`);
  }
  return value;
}

/**
 * Validate a `classes` node key against {@link CLASS_KEYS}.
 *
 * @param {string} key Candidate node key.
 * @param {string} [readerName] Format name used in thrown errors.
 */
function validateClassKey(key, readerName = "CjsStlFormat") {
  if (!CLASS_KEYS.includes(key)) {
    throw new Error(`${readerName}: unknown class key ${JSON.stringify(key)}; expected one of ${CLASS_KEYS.join(", ")}`);
  }
}

/**
 * Validate a single `classes` entry.
 *
 * @param {string} key Node key.
 * @param {Function} Class Candidate constructor.
 * @param {string} [readerName] Format name used in thrown errors.
 */
function validateClass(key, Class, readerName = "CjsStlFormat") {
  validateClassKey(key, readerName);
  if (typeof Class !== "function") {
    throw new TypeError(`${readerName}: class ${JSON.stringify(key)} must be a constructor`);
  }
}
function mergeClasses(base, classes, readerName) {
  if (!classes || typeof classes !== "object") {
    throw new TypeError(`${readerName}: classes option must be an object`);
  }
  const next = {
    ...base
  };
  for (const [key, Class] of Object.entries(classes)) {
    if (Class === null || Class === undefined) {
      delete next[key];
      continue;
    }
    validateClass(key, Class, readerName);
    next[key] = Class;
  }
  return next;
}
function sanitizeName(value) {
  if (typeof value !== "string" || !value.trim()) return DEFAULT_VALUES.solidName;
  return value.trim();
}

/**
 * Merge format values over a base set and validate them.
 *
 * @param {object} base Current values.
 * @param {object} [options] Values to merge in.
 * @param {string} [readerName] Format name used in error messages.
 * @returns {object} A validated copy of the merged values.
 */
function normalizeValues(base, options = {}, readerName = "CjsStlFormat") {
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
  const emit = normalizeEmit(values.emit, readerName);
  const classes = Object.prototype.hasOwnProperty.call(options, "classes") ? mergeClasses(base.classes || {}, options.classes, readerName) : {
    ...(base.classes || {})
  };
  if ((emit === OUTPUT_GR2 || emit === OUTPUT_CMF) && !hasClasses(classes)) {
    throw new TypeError(`${readerName}: emit "${emit}" requires explicit classes`);
  }
  if (typeof values.source !== "string" || !values.source) {
    values.source = DEFAULT_VALUES.source;
  }
  return {
    emit,
    source: values.source,
    binary: validateBoolean("binary", values.binary, readerName),
    solidName: sanitizeName(values.solidName),
    scale: validateNumber("scale", values.scale, readerName, {
      minExclusive: 0
    }),
    recalculateNormals: validateBoolean("recalculateNormals", values.recalculateNormals, readerName),
    weldVertices: validateBoolean("weldVertices", values.weldVertices, readerName),
    weldTolerance: validateNumber("weldTolerance", values.weldTolerance, readerName, {
      minInclusive: 0
    }),
    skipDegenerate: validateBoolean("skipDegenerate", values.skipDegenerate, readerName),
    requireWatertight: validateBoolean("requireWatertight", values.requireWatertight, readerName),
    classes
  };
}
function normalizeEmit(emit, readerName) {
  if (emit === undefined || emit === null || emit === OUTPUT_JSON || emit === OUTPUT_STL_JSON || emit === OUTPUT_SHARED) {
    return OUTPUT_STL_JSON;
  }
  if (emit === OUTPUT_GR2 || emit === OUTPUT_CMF) return emit;
  throw new TypeError(`${readerName}: emit must be "${OUTPUT_SHARED}", "${OUTPUT_STL_JSON}", "${OUTPUT_GR2}", or "${OUTPUT_CMF}", got ${JSON.stringify(emit)}`);
}
function hasClasses(classes) {
  return !!classes && Object.values(classes).some(Class => typeof Class === "function");
}

/**
 * Read STL text/bytes and return the shared JSON schema.
 *
 * @param {object|Function} format Format instance or constructor.
 * @param {string|Uint8Array|ArrayBuffer|DataView} input STL text or bytes.
 * @param {object} values Normalized format values.
 * @returns {object} Shared JSON graph.
 */
function readWithValues(format, input, values) {
  const parsed = parseStl(input);
  const json = trianglesToJson(parsed.triangles, values, parsed);
  if (values.emit === OUTPUT_CMF) return hydrateCmf(buildCmfFromShared(json), values.classes, {
    source: values.source
  });
  return hydrateJson(json, {
    classes: values.classes,
    source: values.source
  });
}

/**
 * Write the shared JSON geometry schema to STL.
 *
 * @param {object} input Shared JSON root or mesh.
 * @param {object} values Normalized format values.
 * @returns {string|Uint8Array} ASCII STL text or binary STL bytes.
 */
function writeWithValues(input, values) {
  const triangles = jsonToTriangles(input, values);
  if (!triangles.length) {
    throw new Error("CjsStlFormat: write input did not produce any triangles");
  }
  if (values.requireWatertight) {
    const report = inspectTriangles(triangles, values, {
      format: "json",
      source: input.grannyFileSource || values.source
    });
    if (!report.printable) {
      throw new Error(`CjsStlFormat: requireWatertight failed (${report.issues.map(issue => issue.key).join(", ")})`);
    }
  }
  return values.binary ? writeBinaryStl(triangles, values.solidName) : writeAsciiStl(triangles, values.solidName);
}

/**
 * Inspect STL or shared JSON geometry without class hydration.
 *
 * @param {any} input STL text/bytes or shared JSON.
 * @param {object} values Normalized format values.
 * @returns {object} Plain printability report.
 */
function inspectWithValues(input, values) {
  const source = trianglesFromInput(input, values);
  return inspectTriangles(source.triangles, values, source);
}

/**
 * Convert format output to plain JSON-compatible data.
 *
 * @param {any} value Format output.
 * @returns {any} JSON-compatible value.
 */
function toJsonValue(value) {
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;
  if (typeof value.toJSON === "function") {
    const next = value.toJSON();
    if (next !== value) return toJsonValue(next);
  }
  if (Array.isArray(value)) return value.map(toJsonValue);
  if (ArrayBuffer.isView(value) && !(value instanceof DataView)) return Array.from(value);
  const out = {};
  for (const key of Object.keys(value)) {
    out[key] = toJsonValue(value[key]);
  }
  return out;
}

/**
 * Imports a Node built-in module without exposing the specifier to any
 * bundler's static import graph.
 *
 * `await import("node:fs/promises")` written as a literal is resolved
 * eagerly by webpack/Rollup/esbuild alike when they walk the module
 * graph, breaking browser builds even though this path only ever runs
 * under Node (readFile/writeFile are Node-only conveniences). Building
 * the specifier inside a `Function` body hides it from every bundler's
 * static analysis - it only exists at runtime, in the Node process that
 * actually calls readFile/writeFile.
 *
 * @param {string} specifier Node built-in module specifier, e.g. "node:fs/promises".
 * @returns {Promise<any>} The imported module namespace.
 */
function importNodeModule(specifier) {
  // eslint-disable-next-line no-new-func
  return new Function("s", "return import(s)")(specifier);
}

export { CLASS_KEYS, DEFAULT_VALUES, GR2_CLASS_KEYS, OUTPUT_CMF, OUTPUT_GR2, OUTPUT_JSON, OUTPUT_SHARED, OUTPUT_STL_JSON, importNodeModule, inspectWithValues, normalizeValues, readWithValues, toJsonValue, validateClass, validateClassKey, writeWithValues };
//# sourceMappingURL=helpers.js.map
