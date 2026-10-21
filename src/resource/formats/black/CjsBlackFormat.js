import { CjsSchema } from "#schema/CjsSchema";

import { CjsFormat } from "../../format/CjsFormat.js";
import { CLASS_KEYS } from "./core/schema.js";
import {
    DEFAULT_VALUES,
    OUTPUT_JSON,
    OUTPUT_PAYLOAD,
    OUTPUT_RUNTIME,
    normalizeValues,
    toJsonValue,
    validateClass,
    validateClassKey
} from "./core/helpers.js";
import {
    CJS_BLACK_EXTENSION,
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
export class CjsBlackFormat extends CjsFormat
{
    /** Registered name; `constructor.name` does not survive minification. */
    static className = "CjsBlackFormat";

    _emit = DEFAULT_VALUES.emit;

    _schema = DEFAULT_VALUES.schema;

    _readerOptions = {};

    _classes = {};

    /**
     * Plain payload outputs can be decoded in a browser worker. Runtime output
     * retains class identity and therefore stays on the caller thread.
     */
    static worker = {
        module: import.meta.url,
        exportName: "CjsBlackFormat",
        outputTypes: [ OUTPUT_JSON, OUTPUT_PAYLOAD ],
        defaultOutput: OUTPUT_JSON
    };

    /**
     * Create a reusable format profile.
     *
     * @param {Partial<import("./core/helpers.js").BlackReaderValues>} [options] Default format values.
     */
    constructor(options = {})
    {
        super();
        this.SetValues(options);
    }

    /**
     * Set format values for this reusable profile.
     *
     * @param {Partial<import("./core/helpers.js").BlackReaderValues>} [options] Values to merge into the profile.
     * @returns {CjsBlackFormat} This format profile.
     */
    SetValues(options = {})
    {
        const values = normalizeValues(this.GetValues(), options, CLASS_KEYS, FORMAT_NAME);
        this._emit = values.emit;
        this._schema = values.schema;
        this._classes = values.classes;
        this._readerOptions = CjsBlackFormat.copyReaderOptions(values);
        return this;
    }

    /**
     * Get this profile's current values, optionally with per-call overrides.
     *
     * @param {Partial<import("./core/helpers.js").BlackReaderValues>} [options] Optional values to merge into a copy.
     * @returns {import("./core/helpers.js").BlackReaderValues} A copy of the effective values.
     */
    GetValues(options = {})
    {
        return normalizeValues({
            emit: this._emit,
            schema: this._schema,
            ...this._readerOptions,
            classes: this._classes
        }, options, CLASS_KEYS, FORMAT_NAME);
    }

    /**
     * Set multiple runtime class constructors for this profile.
     *
     * @param {Object<string, Function>} [classes] Map of Black class names to constructors.
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
            delete this._classes[type];
            return this;
        }

        validateClass(CLASS_KEYS, type, Class, FORMAT_NAME);
        this._classes = { ...this._classes, [type]: Class };
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
        return this._classes[type];
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
     * @param {import("./core/helpers.js").BlackInput} input Black format input.
     * @param {Partial<import("./core/helpers.js").BlackReaderValues>} [options] Per-call value overrides.
     * @returns {import("./core/helpers.js").BlackPayload|import("./core/helpers.js").BlackRuntimeResult} Public payload output by default.
     */
    Read(input, options = {})
    {
        return CjsBlackFormat.read(input, this.GetValues(options));
    }

    /**
     * Read Black data as runtime objects or plain source-shaped objects.
     *
     * @param {import("./core/helpers.js").BlackInput} input Black format input.
     * @param {Partial<import("./core/helpers.js").BlackReaderValues>} [options] Per-call value overrides.
     * @returns {import("./core/helpers.js").BlackRuntimeResult} Runtime read result.
     */
    ReadRuntime(input, options = {})
    {
        return CjsBlackFormat.readRuntime(input, this.GetValues(options));
    }

    /**
     * Read Black data as compact public payload JSON.
     *
     * @param {import("./core/helpers.js").BlackInput} input Black format input.
     * @param {Partial<import("./core/helpers.js").BlackReaderValues>} [options] Per-call value overrides.
     * @returns {import("./core/helpers.js").BlackPayload} Public payload output.
     */
    ReadPayload(input, options = {})
    {
        return CjsBlackFormat.readPayload(input, this.GetValues(options));
    }

    /**
     * Inspect Black data with this profile's values.
     *
     * @param {import("./core/helpers.js").BlackInput} input Black format input.
     * @param {Partial<import("./core/helpers.js").BlackReaderValues>} [options] Per-call value overrides.
     * @returns {import("./core/helpers.js").BlackInspection} Plain summary data.
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
     * @param {import("./core/helpers.js").BlackInput} input Black format input.
     * @param {Partial<import("./core/helpers.js").BlackReaderValues>} [options] Format values.
     * @returns {import("./core/helpers.js").BlackPayload|import("./core/helpers.js").BlackRuntimeResult} Format output.
     */
    static read(input, options = {})
    {
        const values = normalizeValues(DEFAULT_VALUES, options, CLASS_KEYS, FORMAT_NAME);
        if (values.emit === OUTPUT_RUNTIME) return CjsBlackFormat.readRuntime(input, values);
        return CjsBlackFormat.readPayload(input, values);
    }

    /**
     * Static one-shot runtime read.
     *
     * @param {import("./core/helpers.js").BlackInput} input Black format input.
     * @param {Partial<import("./core/helpers.js").BlackReaderValues>} [options] Format values.
     * @returns {import("./core/helpers.js").BlackRuntimeResult} Runtime read result.
     */
    static readRuntime(input, options = {})
    {
        return CjsBlackFormat.createObjectBuilder(input, options).ReadRuntime();
    }

    /**
     * The object builder for one file: a reader over its bytes whose
     * `CreateObject()` builds a new graph each call, as Carbon's resource
     * manager keeps a BlackReader per file (BlueResMan.cpp:722-773).
     *
     * @param {import("./core/helpers.js").BlackInput} input Black format input.
     * @param {Partial<import("./core/helpers.js").BlackReaderValues>} [options] Format values.
     * @returns {CjsBlackReader} The builder.
     */
    static createObjectBuilder(input, options = {})
    {
        return new CjsBlackReader(input, normalizeValues(DEFAULT_VALUES, options, CLASS_KEYS, FORMAT_NAME));
    }

    /**
     * Static one-shot public payload read.
     *
     * @param {import("./core/helpers.js").BlackInput} input Black format input.
     * @param {Partial<import("./core/helpers.js").BlackReaderValues>} [options] Format values.
     * @returns {import("./core/helpers.js").BlackPayload} Public payload output.
     */
    static readPayload(input, options = {})
    {
        return new CjsBlackReader(input, normalizeValues(DEFAULT_VALUES, options, CLASS_KEYS, FORMAT_NAME)).ReadPayload();
    }

    /**
     * Static one-shot inspection.
     *
     * @param {import("./core/helpers.js").BlackInput} input Black format input.
     * @param {Partial<import("./core/helpers.js").BlackReaderValues>} [options] Format values.
     * @returns {import("./core/helpers.js").BlackInspection} Plain summary data.
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
     * Performs the bounded Black content discriminator used by ordered object
     * routes. Magic selects the Black reader; version and body failures remain
     * that reader's errors and are never reinterpreted as Red/YAML.
     *
     * @param {ArrayBuffer|ArrayBufferView} input Candidate source bytes.
     * @returns {boolean} True when the little-endian Black magic is present.
     */
    static probeSupport(input)
    {
        const view = getBlackProbeView(input);
        return Boolean(
            view
            && view.byteLength >= 4
            && view.getUint32(0, true) === CJS_BLACK_FOURCC
        );
    }

    static classKeys = CLASS_KEYS;

    static id = "CjsBlackFormat";

    static extensions = [CJS_BLACK_EXTENSION];

    static fourCC = CJS_BLACK_FOURCC;

    static version = CJS_BLACK_VERSION;

    static outputs = CjsFormat.defineOutputs({
        json: { default: true, decoded: true },
        payload: { decoded: true },
        runtime: { decoded: true }
    });

    /**
     * Provides the one-shot Black copy reader options helper entry point.
     *
     * @param {import("./core/helpers.js").BlackReaderValues} values Normalized values.
     * @returns {Partial<import("./core/helpers.js").BlackReaderValues>} The values without `emit`, `schema` and `classes`.
     */
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

/**
 * Returns a DataView over probe input, or null when the input is not binary.
 *
 * @param {unknown} input Candidate source.
 * @returns {DataView|null} A view over the bytes, or null.
 */
function getBlackProbeView(input)
{
    if (input instanceof ArrayBuffer) return new DataView(input);
    if (!ArrayBuffer.isView(input)) return null;
    return new DataView(input.buffer, input.byteOffset, input.byteLength);
}

export default CjsBlackFormat;

CjsSchema.meta.define("CjsBlackFormat")(CjsBlackFormat);
