import { toJsonWithCollections as toJsonValue } from "../../../format/jsonPolicies.js";
import { asUint8Array } from "#utils/bytes";

import { HlslEffectReadError } from "../../hlsl/core/HlslEffectReadError.js";
import {
    emitEffectMetadata,
    resolveSelectedOptions
} from "./metadata.js";
import { CjsCarbonEffectReader } from "../../../format/carbonEffect/CjsCarbonEffectReader.js";
import { CjsCarbonEffectWriter } from "../../../format/carbonEffect/CjsCarbonEffectWriter.js";
import { Tr2EffectDescription } from "../../../shader/reflection/Tr2EffectDescription.js";
import { effectHeader } from "../../../format/effect/effectHeader.js";
import { CLASS_KEYS, emitEffectJson } from "./json.js";

export const OUTPUT_JSON = "json";
export const OUTPUT_RAW = "raw";
export const OUTPUT_METADATA = "metadata";

export const DEFAULT_VALUES = {
    emit: OUTPUT_JSON,
    source: "memory",
    permutation: null,
    classes: {}
};

const VALID_EMITS = new Set([ OUTPUT_JSON, OUTPUT_RAW, OUTPUT_METADATA ]);
const OPTION_KEYS = new Set([ "emit", "source", "permutation", "classes" ]);

/**
 * Validate a `classes` node key against {@link CLASS_KEYS}.
 *
 * @param {string} key Candidate node key.
 * @param {string} [readerName] Reader name used in the thrown error.
 */
export function validateClassKey(key, readerName = "CjsCarbonEffectFormat")
{
    if (!CLASS_KEYS.includes(key))
    {
        throw new Error(`${readerName}: unknown class key ${JSON.stringify(key)}; expected one of ${CLASS_KEYS.join(", ")}`);
    }
}

/**
 * Validate a single `classes` entry: a known key mapped to a constructor.
 *
 * @param {string} key Node key.
 * @param {Function} Class Candidate constructor.
 * @param {string} [readerName] Reader name used in thrown errors.
 */
export function validateClass(key, Class, readerName = "CjsCarbonEffectFormat")
{
    validateClassKey(key, readerName);
    if (typeof Class !== "function")
    {
        throw new TypeError(`${readerName}: class ${JSON.stringify(key)} must be a constructor`);
    }
}

/**
 * Merge and validate a `classes` map over a base map.
 *
 * @param {object} base Current classes map.
 * @param {object} classes Incoming classes map to merge in.
 * @param {string} readerName Reader name used in thrown errors.
 * @returns {object} Merged, validated classes map.
 */
function mergeClasses(base, classes, readerName)
{
    if (!classes || typeof classes !== "object")
    {
        throw new TypeError(`${readerName}: classes option must be an object`);
    }

    const next = { ...base };
    for (const [ key, Class ] of Object.entries(classes))
    {
        if (Class === null || Class === undefined)
        {
            delete next[key];
            continue;
        }
        validateClass(key, Class, readerName);
        next[key] = Class;
    }
    return next;
}

/**
 * Merge format values over a base set and validate them.
 *
 * @param {object} base Current values.
 * @param {object} [options] Values to merge in.
 * @param {string} [readerName] Reader name used in error messages.
 * @returns {object} A validated copy of the merged values.
 */
export function normalizeValues(base, options = {}, readerName = "CjsCarbonEffectFormat")
{
    if (!options || typeof options !== "object")
    {
        throw new TypeError(`${readerName}: options must be an object`);
    }
    for (const key of Object.keys(options))
    {
        if (!OPTION_KEYS.has(key))
        {
            throw new TypeError(`${readerName}: unknown option ${JSON.stringify(key)}`);
        }
    }

    const values = { ...base, ...options };

    if (!VALID_EMITS.has(values.emit))
    {
        throw new TypeError(`${readerName}: emit must be one of ${Array.from(VALID_EMITS, (emit) => JSON.stringify(emit)).join(", ")}, got ${JSON.stringify(values.emit)}`);
    }
    if (typeof values.source !== "string" || !values.source)
    {
        values.source = DEFAULT_VALUES.source;
    }
    values.classes = Object.prototype.hasOwnProperty.call(options, "classes")
        ? mergeClasses(base.classes || {}, options.classes, readerName)
        : { ...(base.classes || {}) };

    return {
        emit: values.emit,
        source: values.source,
        permutation: values.permutation ?? null,
        classes: values.classes
    };
}

/**
 * Open caller-supplied effect bytes; the source is a diagnostic label, not a route.
 * @param {ArrayBuffer|ArrayBufferView} input Container bytes.
 * @param {object} values Format values.
 * @returns {CjsCarbonEffectReader} Retained reader, with no resource lifecycle.
 */
export function readRaw(input, values)
{
    try
    {
        return new CjsCarbonEffectReader(asUint8Array(input, "CjsCarbonEffectFormat input"), { source: values.source });
    }
    catch (cause)
    {
        throw new HlslEffectReadError(cause.message, { source: values.source, cause });
    }
}

/**
 * Decode a selected body's existing reflection representation.
 * Carbon: Tr2Shader effect Read (Resources/Tr2EffectRes.cpp:126-134).
 * Adapted: no Tr2Shader or resource is needed to obtain the same description.
 * @param {CjsCarbonEffectReader} reader Container reader.
 * @param {number} index Exact permutation index.
 * @param {object} [options] Binary reader options, including backend block presence.
 * @returns {Tr2EffectDescription} Fresh description; runtime caching stays with Trinity.
 */
export function readDescription(reader, index, options = {})
{
    return Tr2EffectDescription.fromCarbonBinary(reader.readDescription(index, options));
}

/**
 * Resolve a description for inspection, reporting an undecodable body as null.
 * @param {CjsCarbonEffectReader} reader Container reader.
 * @param {object} values Explicit permutation choices.
 * @returns {Tr2EffectDescription|null} Decoded description or null.
 */
export function resolveDescription(reader, values)
{
    try
    {
        return readDescription(reader, resolveSelectedOptions(reader, values.permutation || []).bodyIndex);
    }
    catch
    {
        return null;
    }
}

/**
 * Read the selected projection, retaining the existing JSON and metadata shapes.
 * @param {ArrayBuffer|ArrayBufferView} input Container bytes.
 * @param {object} values Normalized format values.
 * @returns {object} Reader, JSON or metadata.
 */
export function readWithValues(input, values)
{
    const reader = readRaw(input, values);
    if (values.emit === OUTPUT_RAW) return reader;
    const description = resolveDescription(reader, values);
    if (values.emit === OUTPUT_METADATA)
    {
        return emitEffectMetadata(reader, description, resolveSelectedOptions(reader, values.permutation || []));
    }
    return emitEffectJson(reader, description, { classes: values.classes });
}

/**
 * Inspect header facts and the selected body's technique names without JSON conversion.
 * @param {ArrayBuffer|ArrayBufferView} input Container bytes.
 * @param {object} values Normalized format values.
 * @returns {object} Inspection summary.
 */
export function inspectWithValues(input, values)
{
    const reader = readRaw(input, values);
    const header = effectHeader(reader);
    const description = resolveDescription(reader, values);
    return {
        source: values.source,
        version: header.version,
        compilerVersion: header.compilerVersion,
        isGood: true,
        permutationCount: header.permutations.length,
        bodyCount: header.records.length,
        effectName: description ? reader.source : null,
        techniques: description ? description.techniques.map(technique => ({
            name: technique.name,
            passCount: technique.passes.length,
            stageCounts: technique.passes.map(pass => pass.stageInputs.filter(stage => stage && stage.exists).length)
        })) : []
    };
}

/**
 * Write indexed Carbon description records with the existing binary writer.
 * @param {object} parts Header fields, permutations and bodies ({index, description}).
 * @param {object} [options] Explicit writer overrides.
 * @returns {Uint8Array} Container bytes.
 */
export function writeWithValues(parts, options = {})
{
    const writer = new CjsCarbonEffectWriter({
        version: parts.version,
        compilerVersion: parts.compilerVersion,
        sourceHash: parts.sourceHash,
        backend: parts.backend,
        ...options
    });
    for (const axis of parts.permutations ?? []) writer.addPermutation(axis);
    for (const body of parts.bodies) writer.addBody(body.index, body.description);
    return writer.toBytes();
}

export { toJsonValue, HlslEffectReadError, CLASS_KEYS };
