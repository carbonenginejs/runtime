/**
 * Exposed CarbonEngineJS-facing CMF format class.
 *
 * CMF is expected to become the common CarbonEngineJS geometry container, so
 * this public wrapper keeps parsing details under core/ and exposes CMF-native
 * data by default.
 */

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
export class CjsCmfFormat
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

    static OUTPUT_JSON = OUTPUT_JSON;
    static OUTPUT_CMF = OUTPUT_CMF;
    static OUTPUT_CMF_JSON = OUTPUT_CMF_JSON;
    static OUTPUT_GR2 = OUTPUT_GR2;
    static OUTPUT_NATIVE = OUTPUT_NATIVE;
    static OUTPUT_RAW = OUTPUT_RAW;
    static OUTPUT_SHARED = OUTPUT_SHARED;
    static CLASS_KEYS = CLASS_KEYS;
    static type = Object.freeze([ "geometry" ]);
    static mediaTypes = Object.freeze([ "geometry" ]);
    static inputTypes = Object.freeze([ "cmf" ]);
    static outputTypes = Object.freeze([ OUTPUT_CMF, OUTPUT_GR2, OUTPUT_SHARED ]);
    static debugOutputTypes = Object.freeze([ OUTPUT_JSON, OUTPUT_CMF_JSON, OUTPUT_RAW ]);
}

export default CjsCmfFormat;
