/**
 * Internal read-pipeline glue for CjsHlslFormat.
 *
 * Keeps the public class file small: input normalization, option/classes
 * normalization, the shared read path used by both the instance and the
 * static one-shots, and JSON conversion live here. The actual Tr2 effect
 * container parser lives under src/core/tr2 (internal parsing machinery,
 * not part of this package's public surface); this module wires bytes into
 * that graph and, for `emit: "json"`, converts it via src/core/json.js into
 * the documented plain-data shape.
 */

import { HlslEffectReadError } from "./HlslEffectReadError.js";
import {
    emitEffectMetadata,
    resolveSelectedOptions
} from "./metadata.js";
import { HlslEffectRes } from "./tr2/resources/HlslEffectRes.js";
import { CLASS_KEYS, emitEffectJson } from "./json.js";

export const OUTPUT_JSON = "json";
export const OUTPUT_RAW = "raw";
export const OUTPUT_METADATA = "metadata";

export const DEFAULT_VALUES = Object.freeze({
    emit: OUTPUT_JSON,
    source: "memory",
    permutation: null,
    classes: Object.freeze({})
});

const VALID_EMITS = new Set([ OUTPUT_JSON, OUTPUT_RAW, OUTPUT_METADATA ]);
const OPTION_KEYS = new Set([ "emit", "source", "permutation", "classes" ]);

/**
 * Validate a `classes` node key against {@link CLASS_KEYS}.
 *
 * @param {string} key Candidate node key.
 * @param {string} [readerName] Reader name used in the thrown error.
 */
export function validateClassKey(key, readerName = "CjsHlslFormat")
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
export function validateClass(key, Class, readerName = "CjsHlslFormat")
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
export function normalizeValues(base, options = {}, readerName = "CjsHlslFormat")
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
 * Normalize caller input into a Uint8Array of Tr2 effect bytes.
 *
 * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input Candidate payload.
 * @returns {Uint8Array} The payload bytes.
 */
export function toBytes(input)
{
    if (input instanceof Uint8Array) return input;
    if (typeof ArrayBuffer !== "undefined" && input instanceof ArrayBuffer) return new Uint8Array(input);
    if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    throw new TypeError("CjsHlslFormat: input must be Tr2 effect bytes (Uint8Array, Buffer, DataView or ArrayBuffer)");
}

/**
 * The shared read path used by the instance Read, Inspect, and the static
 * one-shots: normalizes input bytes and loads a HlslEffectRes graph. This is
 * internal parsing machinery — the documented public contract is the plain
 * JSON shape produced by {@link readWithValues}, not this raw graph.
 *
 * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input Tr2 effect payload.
 * @param {object} values Normalized format values.
 * @returns {HlslEffectRes} The loaded effect resource graph.
 */
export function readRaw(input, values)
{
    const bytes = toBytes(input);
    const effect = new HlslEffectRes();
    const ok = effect.DoLoad(bytes, { source: values.source });

    if (!ok)
    {
        throw new HlslEffectReadError(
            effect.loadError ? effect.loadError.message : "Failed to read Tr2 effect resource",
            {
                source: values.source,
                cause: effect.loadError || null
            }
        );
    }

    return effect;
}

/**
 * Resolves one permutation's HlslShader from a loaded effect, tolerating
 * bodies that fail to decode (returns null instead of throwing).
 *
 * @param {HlslEffectRes} effect Loaded effect resource graph.
 * @param {object} values Normalized format values.
 * @returns {object|null} Resolved HlslShader, or null.
 */
function resolveShader(effect, values)
{
    try
    {
        return effect.GetShader(values.permutation || []);
    }
    catch
    {
        return null;
    }
}

/**
 * Shared read entry honouring the emit mode.
 *
 * `emit: "raw"` returns the live HlslEffectRes instance — internal,
 * unstable, and not schema-guaranteed across versions. `emit: "json"`
 * (the default) returns the documented plain-data effect graph, honouring
 * `values.classes`.
 *
 * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input Tr2 effect payload.
 * @param {object} values Normalized format values.
 * @returns {HlslEffectRes|object} The raw HlslEffectRes instance, or the documented JSON graph.
 */
export function readWithValues(input, values)
{
    const effect = readRaw(input, values);
    if (values.emit === OUTPUT_RAW) return effect;

    const shader = resolveShader(effect, values);
    if (values.emit === OUTPUT_METADATA)
    {
        const selection = resolveSelectedOptions(effect, values.permutation || []);
        return emitEffectMetadata(effect, shader, selection);
    }

    return emitEffectJson(effect, shader, { classes: values.classes });
}

/**
 * Cheap inspection: effect header facts plus the default permutation's
 * technique names and stage counts, without a full JSON conversion of the
 * decoded graph.
 *
 * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input Tr2 effect payload.
 * @param {object} values Normalized format values.
 * @returns {object} Plain summary data.
 */
export function inspectWithValues(input, values)
{
    const effect = readRaw(input, values);

    const summary = {
        source: values.source,
        version: effect.m_version,
        compilerVersion: effect.m_compilerVersion,
        isGood: effect.IsGood(),
        permutationCount: effect.m_permutations.length,
        bodyCount: effect.m_offsetCount,
        effectName: null,
        techniques: []
    };

    try
    {
        const shader = effect.GetShader(values.permutation || []);
        if (shader)
        {
            const description = shader.GetEffectDescription();
            summary.effectName = description.effectName || null;
            summary.techniques = description.techniques.map((technique) => ({
                name: technique.name,
                passCount: technique.passes.length,
                stageCounts: technique.passes.map(
                    (pass) => pass.stageInputs.filter((stage) => stage && stage.m_exists).length
                )
            }));
        }
    }
    catch (error)
    {
        summary.inspectError = { name: error.name, message: error.message };
    }

    return summary;
}

/**
 * Deep-convert a value to plain JSON-compatible data. Typed arrays become
 * plain number arrays; Maps/Sets become objects/arrays; class instances
 * with toJSON are honoured.
 *
 * @param {any} value Value to convert.
 * @returns {any} Plain data.
 */
export function toJsonValue(value)
{
    if (value === null || value === undefined) return value ?? null;
    if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") return value;
    if (typeof value === "bigint") return value.toString();
    if (ArrayBuffer.isView(value)) return Array.from(value);
    if (Array.isArray(value)) return value.map(toJsonValue);
    if (value instanceof Map)
    {
        const out = {};
        for (const [ key, entry ] of value) out[key] = toJsonValue(entry);
        return out;
    }
    if (value instanceof Set) return Array.from(value, toJsonValue);
    if (typeof value === "object")
    {
        if (typeof value.toJSON === "function") return toJsonValue(value.toJSON());
        const out = {};
        for (const key of Object.keys(value)) out[key] = toJsonValue(value[key]);
        return out;
    }
    return null;
}

export { HlslEffectReadError };
export { CLASS_KEYS };
