import { CjsFormat } from "../../format/CjsFormat.js";
/**
 * Exposed CarbonEngineJS-facing CMF format class.
 *
 * CMF is expected to become the common CarbonEngineJS geometry container, so
 * this public wrapper keeps parsing details under core/ and exposes CMF-native
 * data by default.
 */

import { convertGr2SkeletonsAndAnimations } from "./core/gr2Anim.js";
import { packGraphBuffers } from "./core/pack.js";
import { buildCmfFromShared } from "./core/shared.js";
import { writeCmf, writeCmfAsync } from "./core/writer.js";
import {
    CLASS_KEYS,
    DEFAULT_VALUES,
    OUTPUT_CMF,
    OUTPUT_CMF_JSON,
    OUTPUT_GR2,
    OUTPUT_JSON,
    OUTPUT_NATIVE,
    OUTPUT_RAW,
    OUTPUT_SHARED,
    inspectRawCmfResult,
    loadNativeWithValues,
    loadSharedWithValues,
    normalizeValues,
    readRawInput,
    readRawInputAsync,
    readWithValues,
    readWithValuesAsync,
    toJsonValue,
    validateClass,
    validateClassKey
} from "./core/helpers.js";

/**
 * CarbonEngineJS-facing CMF reader.
 *
 * The Cjs prefix marks this as a JavaScript format/construction boundary. It
 * can load CMF files, load CMF-native JSON, construct CMF-native data from
 * shared geometry, emit shared geometry when requested, or hydrate
 * caller-supplied CarbonEngineJS-style classes.
 */
export class CjsCmfFormat extends CjsFormat
{
    #emit = DEFAULT_VALUES.emit;
    #validateCrc = DEFAULT_VALUES.validateCrc;
    #decodeBuffers = DEFAULT_VALUES.decodeBuffers;
    #classes = {};

    /**
     * Create a reusable format profile.
     *
     * @param {object} [options] Default format/build values.
     */
    constructor(options = {})
    {
        super();
        this.SetValues(options);
    }

    /**
     * Set format values for this reusable profile.
     *
     * @param {object} [options] Values to merge into the profile.
     * @returns {CjsCmfFormat} This format profile.
     */
    SetValues(options = {})
    {
        const values = normalizeValues(this.GetValues(), options);

        this.#emit = values.emit;
        this.#validateCrc = values.validateCrc;
        this.#decodeBuffers = values.decodeBuffers;
        this.#classes = values.classes;

        return this;
    }

    /**
     * Get this profile's current values, optionally with per-call overrides.
     *
     * @param {object} [options] Optional values to merge into a copy.
     * @returns {object} A copy of the effective values.
     */
    GetValues(options = {})
    {
        return normalizeValues({
            emit: this.#emit,
            validateCrc: this.#validateCrc,
            decodeBuffers: this.#decodeBuffers,
            classes: this.#classes
        }, options);
    }

    /**
     * Set multiple CMF JSON node constructors for this profile.
     *
     * @param {object} [classes] Map of node class keys to constructors.
     * @returns {CjsCmfFormat} This format profile.
     */
    SetClasses(classes = {})
    {
        return this.SetValues({ classes });
    }

    /**
     * Set a CMF JSON node constructor for this profile.
     *
     * @param {string} type Node class key.
     * @param {Function|null|undefined} Class Constructor to use, or nullish to delete.
     * @returns {CjsCmfFormat} This format profile.
     */
    SetClass(type, Class)
    {
        validateClassKey(type);
        if (Class === null || Class === undefined)
        {
            delete this.#classes[type];
            return this;
        }

        validateClass(type, Class);
        this.#classes = { ...this.#classes, [type]: Class };
        return this;
    }

    /**
     * Get a configured CMF JSON node constructor.
     *
     * @param {string} type Node class key.
     * @returns {Function|undefined}
     */
    GetClass(type)
    {
        validateClassKey(type);
        return this.#classes[type];
    }

    /**
     * Whether this reader has a constructor for a CMF JSON node key.
     *
     * @param {string} type Node class key.
     * @returns {boolean}
     */
    HasClass(type)
    {
        return !!this.GetClass(type);
    }

    /**
     * Parse a .cmf buffer and return CMF-native JSON by default, shared
     * geometry when `emit` is "shared", or raw parsed data when `emit` is
     * "raw".
     *
     * @param {Uint8Array|Buffer|ArrayBuffer|object} input Raw .cmf bytes or an existing raw read result.
     * @param {object} [options] Per-call values.
     * @returns {object}
     */
    Read(input, options = {})
    {
        return readWithValues(this, input, this.GetValues(options));
    }

    /**
     * Load CMF-native JSON. Shared geometry uses LoadShared.
     *
     * @param {object} input CMF-native JSON root.
     * @param {object} [options] Per-call values.
     * @returns {object}
     */
    Load(input, options = {})
    {
        return loadNativeWithValues(input, this.GetValues(options));
    }

    /**
     * Build CMF-native JSON from shared CarbonEngineJS geometry.
     *
     * @param {object} input Shared geometry root or mesh.
     * @param {object} [options] Per-call values.
     * @returns {object}
     */
    LoadShared(input, options = {})
    {
        return loadSharedWithValues(input, this.GetValues(options));
    }

    /**
     * Parse a .cmf buffer and emit the shared deinterleaved mesh graph.
     *
     * @param {Uint8Array|Buffer|ArrayBuffer|object} input Raw .cmf bytes or an existing raw read result.
     * @param {object} [options] Per-call values.
     * @returns {object}
     */
    ReadShared(input, options = {})
    {
        return this.Read(input, { ...options, emit: OUTPUT_SHARED });
    }

    /**
     * Parse a .cmf buffer with async meshoptimizer initialization support.
     *
     * @param {Uint8Array|Buffer|ArrayBuffer|object} input Raw .cmf bytes or an existing raw read result.
     * @param {object} [options] Per-call values.
     * @returns {Promise<object>}
     */
    async ReadAsync(input, options = {})
    {
        return readWithValuesAsync(this, input, this.GetValues(options));
    }

    /**
     * Parse a .cmf buffer asynchronously and emit the shared deinterleaved mesh graph.
     *
     * @param {Uint8Array|Buffer|ArrayBuffer|object} input Raw .cmf bytes or an existing raw read result.
     * @param {object} [options] Per-call values.
     * @returns {Promise<object>}
     */
    async ReadSharedAsync(input, options = {})
    {
        return this.ReadAsync(input, { ...options, emit: OUTPUT_SHARED });
    }

    /**
     * Parse a .cmf buffer into the raw parsed CMF graph.
     *
     * @param {Uint8Array|Buffer|ArrayBuffer|object} input Raw .cmf bytes or an existing raw read result.
     * @param {object} [options] Per-call values.
     * @returns {object}
     */
    ReadRaw(input, options = {})
    {
        return readRawInput(input, this.GetValues(options));
    }

    /**
     * Parse a .cmf buffer into the raw parsed CMF graph with async
     * meshoptimizer initialization support.
     *
     * @param {Uint8Array|Buffer|ArrayBuffer|object} input Raw .cmf bytes or an existing raw read result.
     * @param {object} [options] Per-call values.
     * @returns {Promise<object>}
     */
    async ReadRawAsync(input, options = {})
    {
        return readRawInputAsync(input, this.GetValues(options));
    }

    /**
     * Return a stable, lightweight summary for a CMF buffer or raw result.
     *
     * @param {Uint8Array|Buffer|ArrayBuffer|object} input Raw .cmf bytes or an existing raw read result.
     * @param {object} [options] Per-call values.
     * @returns {object}
     */
    Inspect(input, options = {})
    {
        return inspectRawCmfResult(input, this.GetValues(options));
    }

    /**
     * Convert format output to plain JSON-compatible data.
     *
     * @param {object} value Format output to convert.
     * @returns {any} Plain JSON-compatible data.
     */
    ToJSON(value)
    {
        return toJsonValue(value);
    }

    /**
     * Serialize a CMF-native graph to binary .cmf bytes without compression.
     *
     * Use WriteAsync for meshoptimizer-compressed GPU sections. The graph
     * shape matches Read output: meshes/skeletons/animations plus optional
     * metadata and a `buffers` list supplying uncompressed bytes per
     * BufferView index.
     *
     * @param {object} graph CMF-native graph.
     * @param {object} [options] Writer options (`compress`).
     * @returns {Uint8Array} Complete .cmf file bytes.
     */
    Write(graph, options = {})
    {
        return writeCmf(graph, options);
    }

    /**
     * Serialize a CMF-native graph to binary .cmf bytes with meshoptimizer
     * compression enabled by default.
     *
     * @param {object} graph CMF-native graph.
     * @param {object} [options] Writer options (`compress`, default true).
     * @returns {Promise<Uint8Array>} Complete .cmf file bytes.
     */
    async WriteAsync(graph, options = {})
    {
        return writeCmfAsync(graph, options);
    }

    /**
     * Serialize shared CarbonEngineJS geometry (e.g. from the GR2/OBJ/glTF
     * readers) straight to binary .cmf bytes without compression.
     *
     * Channels are interleaved into GPU buffers per the generated
     * declaration. Skeletons/animations must already be CMF-native shaped.
     *
     * @param {object} input Shared geometry root or mesh.
     * @param {object} [options] Writer options (`compress`).
     * @returns {Uint8Array} Complete .cmf file bytes.
     */
    WriteShared(input, options = {})
    {
        return CjsCmfFormat.writeShared(input, options);
    }

    /**
     * Serialize shared CarbonEngineJS geometry to compressed .cmf bytes.
     *
     * @param {object} input Shared geometry root or mesh.
     * @param {object} [options] Writer options (`compress`, default true).
     * @returns {Promise<Uint8Array>} Complete .cmf file bytes.
     */
    async WriteSharedAsync(input, options = {})
    {
        return CjsCmfFormat.writeSharedAsync(input, options);
    }

    /**
     * Static one-shot read. Static methods use camelCase by convention.
     *
     * @param {Uint8Array|Buffer|ArrayBuffer|object} input Raw .cmf bytes or an existing raw read result.
     * @param {object} [options] Reader values.
     * @returns {object}
     */
    static read(input, options = {})
    {
        return readWithValues(CjsCmfFormat, input, normalizeValues(DEFAULT_VALUES, options));
    }

    /**
     * Static one-shot CMF-native JSON load.
     *
     * @param {object} input CMF-native JSON root.
     * @param {object} [options] Reader values.
     * @returns {object}
     */
    static load(input, options = {})
    {
        return loadNativeWithValues(input, normalizeValues(DEFAULT_VALUES, options));
    }

    /**
     * Static one-shot shared geometry to CMF-native JSON construction.
     *
     * @param {object} input Shared geometry root or mesh.
     * @param {object} [options] Reader values.
     * @returns {object}
     */
    static loadShared(input, options = {})
    {
        return loadSharedWithValues(input, normalizeValues(DEFAULT_VALUES, options));
    }

    /**
     * Static one-shot read to shared geometry.
     *
     * @param {Uint8Array|Buffer|ArrayBuffer|object} input Raw .cmf bytes or an existing raw read result.
     * @param {object} [options] Reader values.
     * @returns {object}
     */
    static readShared(input, options = {})
    {
        return CjsCmfFormat.read(input, { ...options, emit: OUTPUT_SHARED });
    }

    /**
     * Static one-shot async read.
     *
     * @param {Uint8Array|Buffer|ArrayBuffer|object} input Raw .cmf bytes or an existing raw read result.
     * @param {object} [options] Reader values.
     * @returns {Promise<object>}
     */
    static async readAsync(input, options = {})
    {
        return readWithValuesAsync(CjsCmfFormat, input, normalizeValues(DEFAULT_VALUES, options));
    }

    /**
     * Static one-shot async read to shared geometry.
     *
     * @param {Uint8Array|Buffer|ArrayBuffer|object} input Raw .cmf bytes or an existing raw read result.
     * @param {object} [options] Reader values.
     * @returns {Promise<object>}
     */
    static async readSharedAsync(input, options = {})
    {
        return CjsCmfFormat.readAsync(input, { ...options, emit: OUTPUT_SHARED });
    }

    /**
     * Static one-shot raw read.
     *
     * @param {Uint8Array|Buffer|ArrayBuffer|object} input Raw .cmf bytes or an existing raw read result.
     * @param {object} [options] Reader values.
     * @returns {object}
     */
    static readRaw(input, options = {})
    {
        return readRawInput(input, normalizeValues(DEFAULT_VALUES, options));
    }

    /**
     * Static one-shot async raw read.
     *
     * @param {Uint8Array|Buffer|ArrayBuffer|object} input Raw .cmf bytes or an existing raw read result.
     * @param {object} [options] Reader values.
     * @returns {Promise<object>}
     */
    static async readRawAsync(input, options = {})
    {
        return readRawInputAsync(input, normalizeValues(DEFAULT_VALUES, options));
    }

    /**
     * Static one-shot inspection.
     *
     * @param {Uint8Array|Buffer|ArrayBuffer|object} input Raw .cmf bytes or an existing raw read result.
     * @param {object} [options] Reader values.
     * @returns {object}
     */
    static inspect(input, options = {})
    {
        return inspectRawCmfResult(input, normalizeValues(DEFAULT_VALUES, options));
    }

    /**
     * Static JSON-compatible conversion.
     *
     * @param {object} value Format output to convert.
     * @returns {any} Plain JSON-compatible data.
     */
    static toJSON(value)
    {
        return toJsonValue(value);
    }

    /**
     * Static one-shot binary write without compression.
     *
     * @param {object} graph CMF-native graph.
     * @param {object} [options] Writer options (`compress`).
     * @returns {Uint8Array} Complete .cmf file bytes.
     */
    static write(graph, options = {})
    {
        return writeCmf(graph, options);
    }

    /**
     * Static one-shot binary write with meshoptimizer compression enabled by
     * default.
     *
     * @param {object} graph CMF-native graph.
     * @param {object} [options] Writer options (`compress`, default true).
     * @returns {Promise<Uint8Array>} Complete .cmf file bytes.
     */
    static async writeAsync(graph, options = {})
    {
        return writeCmfAsync(graph, options);
    }

    /**
     * Static one-shot shared-geometry write without compression.
     *
     * Equivalent to `loadShared` + buffer packing + `write`; this is the
     * GR2/OBJ/glTF → CMF conversion entry point.
     *
     * @param {object} input Shared geometry root or mesh.
     * @param {object} [options] Writer options (`compress`).
     * @returns {Uint8Array} Complete .cmf file bytes.
     */
    static writeShared(input, options = {})
    {
        const root = input && input.meshes ? input : { meshes: [ input ] };
        const converted = convertGr2SkeletonsAndAnimations(root, options);
        const packed = packGraphBuffers(buildCmfFromShared(converted));
        return writeCmf({ ...packed.graph, buffers: packed.buffers }, options);
    }

    /**
     * Static one-shot shared-geometry write with meshoptimizer compression
     * enabled by default.
     *
     * @param {object} input Shared geometry root or mesh.
     * @param {object} [options] Writer options (`compress`, default true).
     * @returns {Promise<Uint8Array>} Complete .cmf file bytes.
     */
    static async writeSharedAsync(input, options = {})
    {
        const root = input && input.meshes ? input : { meshes: [ input ] };
        const converted = convertGr2SkeletonsAndAnimations(root, options);
        const packed = packGraphBuffers(buildCmfFromShared(converted));
        return writeCmfAsync({ ...packed.graph, buffers: packed.buffers }, options);
    }

    /**
     * Emit targets for this format (canonical frozen enum).
     */
    static Output = Object.freeze({
        JSON: OUTPUT_JSON,
        CMF: OUTPUT_CMF,
        CMF_JSON: OUTPUT_CMF_JSON,
        GR2: OUTPUT_GR2,
        NATIVE: OUTPUT_NATIVE,
        RAW: OUTPUT_RAW,
        SHARED: OUTPUT_SHARED
    });
    static CLASS_KEYS = CLASS_KEYS;
    static id = "cmf";
    static mediaTypes = Object.freeze([ "geometry" ]);
    static outputs = CjsFormat.defineOutputs({
        cmf: { default: true, decoded: true },
        gr2: { decoded: true },
        shared: { decoded: true },
        json: { role: "debug", payloadType: "cmf", decoded: true },
        cmfJson: { role: "debug", payloadType: "cmf", decoded: true },
        raw: { role: "debug", decoded: true }
    });
    static extensions = Object.freeze([ ".cmf" ]);
}

export default CjsCmfFormat;
