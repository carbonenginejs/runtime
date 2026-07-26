import { CLASS_KEYS } from "./core/schema.js";
import {
    DEFAULT_VALUES,
    OUTPUT_DOCUMENT,
    OUTPUT_JSON,
    OUTPUT_PAYLOAD,
    OUTPUT_RAW,
    OUTPUT_RUNTIME,
    normalizeValues,
    toJsonValue,
    validateClass,
    validateClassKey
} from "./core/helpers.js";
import {
    CJS_BLACK_EXTENSION,
    CJS_BLACK_FORMAT_ID,
    CJS_BLACK_FOURCC,
    CJS_BLACK_VERSION
} from "./core/blackConstants.js";
import { CjsBlackReader } from "./core/CjsBlackReader.js";

const FORMAT_NAME = "CjsBlackFormat";

/**
 * CarbonEngineJS-facing Black format profile.
 *
 * This package reads public-facing `.black` payload data using CarbonEngineJS
 * canonical schemas or source-shape registries.
 */
export class CjsBlackFormat
{

    #emit = DEFAULT_VALUES.emit;
    #schema = DEFAULT_VALUES.schema;
    #readerOptions = {};
    #classes = {};

    /**
     * Plain payload outputs can be decoded in a browser worker. Document and
     * runtime outputs retain class identity and therefore stay on the caller
     * thread.
     */
    static worker = Object.freeze({
        module: import.meta.url,
        exportName: "CjsBlackFormat",
        outputTypes: Object.freeze([ OUTPUT_JSON, OUTPUT_PAYLOAD ]),
        defaultOutput: OUTPUT_JSON
    });

    /**
     * Create a reusable format profile.
     *
     * @param {object} [options] Default format values.
     */
    constructor(options = {})
    {
        this.SetValues(options);
    }

    /**
     * Set format values for this reusable profile.
     *
     * @param {object} [options] Values to merge into the profile.
     * @returns {CjsBlackFormat} This format profile.
     */
    SetValues(options = {})
    {
        const values = normalizeValues(this.GetValues(), options, CLASS_KEYS, FORMAT_NAME);
        this.#emit = values.emit;
        this.#schema = values.schema;
        this.#classes = values.classes;
        this.#readerOptions = CjsBlackFormat.copyReaderOptions(values);
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
            schema: this.#schema,
            ...this.#readerOptions,
            classes: this.#classes
        }, options, CLASS_KEYS, FORMAT_NAME);
    }

    /**
     * Set multiple runtime class constructors for this profile.
     *
     * @param {object} [classes] Map of Black class names to constructors.
     * @returns {CjsBlackFormat} This format profile.
     */
    SetClasses(classes = {})
    {
        return this.SetValues({ classes });
    }

    /**
     * Set one node-class constructor for this profile.
     *
     * @param {string} type Black class name.
     * @param {Function|null|undefined} Class Constructor to use, or nullish to delete.
     * @returns {CjsBlackFormat} This format profile.
     */
    SetClass(type, Class)
    {
        validateClassKey(CLASS_KEYS, type, FORMAT_NAME);
        if (Class === null || Class === undefined)
        {
            delete this.#classes[type];
            return this;
        }

        validateClass(CLASS_KEYS, type, Class, FORMAT_NAME);
        this.#classes = { ...this.#classes, [type]: Class };
        return this;
    }

    /**
     * Get a configured runtime class constructor.
     *
     * @param {string} type Black class name.
     * @returns {Function|undefined} The registered constructor, if any.
     */
    GetClass(type)
    {
        validateClassKey(CLASS_KEYS, type, FORMAT_NAME);
        return this.#classes[type];
    }

    /**
     * Whether this format profile has a constructor registered for a node key.
     *
     * @param {string} type Node class key.
     * @returns {boolean} True when a constructor is registered.
     */
    HasClass(type)
    {
        return !!this.GetClass(type);
    }

    /**
     * Read Black data with this profile's values.
     *
     * @param {unknown} input Black format input.
     * @param {object} [options] Per-call value overrides.
     * @returns {object} Public payload output by default.
     */
    Read(input, options = {})
    {
        return CjsBlackFormat.read(input, this.GetValues(options));
    }

    /**
     * Read Black data as a neutral document graph for diagnostics.
     *
     * @param {unknown} input Black format input.
     * @param {object} [options] Per-call value overrides.
     * @returns {object} CarbonEngineJS document graph.
     */
    ReadDocument(input, options = {})
    {
        return CjsBlackFormat.readDocument(input, this.GetValues(options));
    }

    /**
     * Read Black data as runtime objects or plain source-shaped objects.
     *
     * @param {unknown} input Black format input.
     * @param {object} [options] Per-call value overrides.
     * @returns {object} Runtime read result.
     */
    ReadRuntime(input, options = {})
    {
        return CjsBlackFormat.readRuntime(input, this.GetValues(options));
    }

    /**
     * Read Black data as compact public payload JSON.
     *
     * @param {unknown} input Black format input.
     * @param {object} [options] Per-call value overrides.
     * @returns {object} Public payload output.
     */
    ReadPayload(input, options = {})
    {
        return CjsBlackFormat.readPayload(input, this.GetValues(options));
    }

    /**
     * Inspect Black data with this profile's values.
     *
     * @param {unknown} input Black format input.
     * @param {object} [options] Per-call value overrides.
     * @returns {object} Plain summary data.
     */
    Inspect(input, options = {})
    {
        return CjsBlackFormat.inspect(input, this.GetValues(options));
    }

    /**
     * Convert format output to JSON-compatible data.
     *
     * @param {any} value Format output to convert.
     * @returns {any} Plain JSON-compatible data.
     */
    ToJSON(value)
    {
        return toJsonValue(value);
    }

    /**
     * Static one-shot read. Static methods use camelCase by convention.
     *
     * @param {unknown} input Black format input.
     * @param {object} [options] Format values.
     * @returns {object} Format output.
     */
    static read(input, options = {})
    {
        const values = normalizeValues(DEFAULT_VALUES, options, CLASS_KEYS, FORMAT_NAME);
        if (values.emit === OUTPUT_DOCUMENT || values.emit === OUTPUT_RAW) return CjsBlackFormat.readDocument(input, values);
        if (values.emit === OUTPUT_RUNTIME) return CjsBlackFormat.readRuntime(input, values);
        return CjsBlackFormat.readPayload(input, values);
    }

    /**
     * Static one-shot document read.
     *
     * @param {unknown} input Black format input.
     * @param {object} [options] Format values.
     * @returns {object} CarbonEngineJS document graph.
     */
    static readDocument(input, options = {})
    {
        return new CjsBlackReader(input, normalizeValues(DEFAULT_VALUES, options, CLASS_KEYS, FORMAT_NAME)).ReadDocument();
    }

    /**
     * Static one-shot runtime read.
     *
     * @param {unknown} input Black format input.
     * @param {object} [options] Format values.
     * @returns {object} Runtime read result.
     */
    static readRuntime(input, options = {})
    {
        return new CjsBlackReader(input, normalizeValues(DEFAULT_VALUES, options, CLASS_KEYS, FORMAT_NAME)).ReadRuntime();
    }

    /**
     * Static one-shot public payload read.
     *
     * @param {unknown} input Black format input.
     * @param {object} [options] Format values.
     * @returns {object} Public payload output.
     */
    static readPayload(input, options = {})
    {
        return new CjsBlackReader(input, normalizeValues(DEFAULT_VALUES, options, CLASS_KEYS, FORMAT_NAME)).ReadPayload();
    }

    /**
     * Static one-shot inspection.
     *
     * @param {unknown} input Black format input.
     * @param {object} [options] Format values.
     * @returns {object} Plain summary data.
     */
    static inspect(input, options = {})
    {
        return new CjsBlackReader(input, normalizeValues(DEFAULT_VALUES, options, CLASS_KEYS, FORMAT_NAME)).Inspect();
    }

    /**
     * Static JSON-compatible conversion.
     *
     * @param {any} value Format output to convert.
     * @returns {any} Plain JSON-compatible data.
     */
    static toJSON(value)
    {
        return toJsonValue(value);
    }

    /**
     * Emit targets for this format (canonical frozen enum).
     */
    static Output = Object.freeze({
        JSON: OUTPUT_JSON,
        RAW: OUTPUT_RAW,
        DOCUMENT: OUTPUT_DOCUMENT,
        PAYLOAD: OUTPUT_PAYLOAD,
        RUNTIME: OUTPUT_RUNTIME
    });
    static CLASS_KEYS = CLASS_KEYS;
    static id = CJS_BLACK_FORMAT_ID;
    static extensions = Object.freeze([CJS_BLACK_EXTENSION]);
    static fourCC = CJS_BLACK_FOURCC;
    static version = CJS_BLACK_VERSION;
    static type = Object.freeze([ "data" ]);
    static mediaTypes = Object.freeze([ "data" ]);
    static inputTypes = Object.freeze([ "black" ]);
    static outputTypes = Object.freeze([ OUTPUT_JSON, OUTPUT_DOCUMENT, OUTPUT_PAYLOAD, OUTPUT_RUNTIME ]);
    static debugOutputTypes = Object.freeze([ OUTPUT_RAW ]);

    static copyReaderOptions(values)
    {
        const {
            emit: _emit,
            schema: _schema,
            classes: _classes,
            ...readerOptions
        } = values;
        return readerOptions;
    }

}

export default CjsBlackFormat;
