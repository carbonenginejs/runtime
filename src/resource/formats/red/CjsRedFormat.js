import { CjsFormat } from "../../format/CjsFormat.js";
import { CLASS_KEYS } from "./core/schema.js";
import {
    DEFAULT_VALUES,
    OUTPUT_JSON,
    OUTPUT_PAYLOAD,
    OUTPUT_RAW,
    OUTPUT_RUNTIME,
    copyReaderOptions,
    normalizeValues,
    toJsonValue,
    validateClass,
    validateClassKey
} from "./core/helpers.js";
import { CjsRedReader } from "./core/CjsRedReader.js";
import blackDefinitions from "./core/blackDefinitions.js";

const FORMAT_NAME = "CjsRedFormat";

/**
 * CarbonEngineJS-facing Red format profile.
 *
 * Reads Red data - a type-discriminated, self-referential YAML object graph -
 * and emits a compact public payload by default, a neutral raw graph, or
 * caller-supplied runtime classes through the runtime global hydration adapter.
 * With payload IDs enabled, repeated sequences and typed tables use an
 * ID-bearing object around a configurable `payloadValuesField` (default
 * `_values`); unique sequences remain arrays. Active payload marker names must
 * be distinct non-empty strings, and authored fields that collide with them
 * are rejected. Remap the markers to preserve authored underscore fields.
 * Disabling the reference marker preserves actual JavaScript identity; a
 * cyclic result in that mode is intentionally not JSON-serializable.
 */
export class CjsRedFormat extends CjsFormat
{

    #emit = DEFAULT_VALUES.emit;
    #schema = DEFAULT_VALUES.schema;
    #readerOptions = {};
    #classes = {};

    /**
     * Create a reusable format profile.
     * @param {object} [options] Default format values.
     */
    constructor(options = {})
    {
        super();
        this.SetValues(options);
    }

    /**
     * Set format values for this reusable profile.
     * @param {object} [options] Values to merge into the profile.
     * @returns {CjsRedFormat} This format profile.
     */
    SetValues(options = {})
    {
        const values = normalizeValues(this.GetValues(), options, CLASS_KEYS, FORMAT_NAME);
        this.#emit = values.emit;
        this.#schema = values.schema;
        this.#classes = values.classes;
        this.#readerOptions = CjsRedFormat.copyReaderOptions(values);
        return this;
    }

    /**
     * Get this profile's current values, optionally with per-call overrides.
     * @param {object} [options] Optional values to merge into a copy.
     * @returns {object} A copy of the effective values.
     */
    GetValues(options = {})
    {
        return normalizeValues({
            ...DEFAULT_VALUES,
            emit: this.#emit,
            schema: this.#schema,
            ...this.#readerOptions,
            classes: this.#classes
        }, options, CLASS_KEYS, FORMAT_NAME);
    }

    /**
     * Set multiple node-class constructors for this profile.
     * @param {object} [classes] Map of Red type names to constructors.
     * @returns {CjsRedFormat} This format profile.
     */
    SetClasses(classes = {})
    {
        return this.SetValues({ classes });
    }

    /**
     * Set one node-class constructor for this profile.
     * @param {string} type Red type name.
     * @param {Function|null|undefined} Class Constructor to use, or nullish to delete.
     * @returns {CjsRedFormat} This format profile.
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
     * Get a configured node-class constructor.
     * @param {string} type Red type name.
     * @returns {Function|undefined} The registered constructor, if any.
     */
    GetClass(type)
    {
        validateClassKey(CLASS_KEYS, type, FORMAT_NAME);
        return this.#classes[type];
    }

    /**
     * Whether this profile has a constructor registered for a Red type.
     * @param {string} type Red type name.
     * @returns {boolean}
     */
    HasClass(type)
    {
        return !!this.GetClass(type);
    }

    /**
     * Read Red data with this profile's values.
     * @param {unknown} input Parsed Red object or YAML string.
     * @param {object} [options] Per-call value overrides.
     * @returns {object} Public payload output by default.
     */
    Read(input, options = {})
    {
        return CjsRedFormat.read(input, this.GetValues(options));
    }

    /**
     * Read Red data as compact public payload data.
     * @param {unknown} input Parsed Red object or YAML string.
     * @param {object} [options] Per-call value overrides.
     * @returns {object} Public payload output.
     */
    ReadPayload(input, options = {})
    {
        return CjsRedFormat.readPayload(input, this.GetValues(options));
    }

    /**
     * Read Red data as runtime objects or plain source-shaped objects.
     * @param {unknown} input Parsed Red object or YAML string.
     * @param {object} [options] Per-call value overrides.
     * @returns {object} Runtime read result.
     */
    ReadRuntime(input, options = {})
    {
        return CjsRedFormat.readRuntime(input, this.GetValues(options));
    }

    /**
     * Read Red data as the cleaned raw object graph (metadata stripped, typed
     * tables decoded, shared references preserved by identity).
     * @param {unknown} input Parsed Red object or YAML string.
     * @param {object} [options] Per-call value overrides.
     * @returns {*} Raw object graph.
     */
    ReadRaw(input, options = {})
    {
        return CjsRedFormat.readRaw(input, this.GetValues(options));
    }

    /**
     * Inspect Red data with this profile's values.
     * @param {unknown} input Parsed Red object or YAML string.
     * @param {object} [options] Per-call value overrides.
     * @returns {object} Plain summary data.
     */
    Inspect(input, options = {})
    {
        return CjsRedFormat.inspect(input, this.GetValues(options));
    }

    /**
     * Convert format output to JSON-compatible data.
     * @param {any} value Format output to convert.
     * @returns {any} Plain JSON-compatible data.
     */
    ToJSON(value)
    {
        return toJsonValue(value);
    }

    /**
     * Static one-shot read. Static methods use camelCase by convention.
     * @param {unknown} input Parsed Red object or YAML string.
     * @param {object} [options] Format values.
     * @returns {object} Format output.
     */
    static read(input, options = {})
    {
        const values = normalizeValues(DEFAULT_VALUES, options, CLASS_KEYS, FORMAT_NAME);
        if (values.emit === OUTPUT_RUNTIME) return CjsRedFormat.readRuntime(input, values);
        if (values.emit === OUTPUT_RAW) return CjsRedFormat.readRaw(input, values);
        return CjsRedFormat.readPayload(input, values);
    }

    /**
     * Static one-shot public payload read.
     * @param {unknown} input Parsed Red object or YAML string.
     * @param {object} [options] Format values.
     * @returns {object} Public payload output.
     */
    static readPayload(input, options = {})
    {
        return new CjsRedReader(input, normalizeValues(DEFAULT_VALUES, options, CLASS_KEYS, FORMAT_NAME)).ReadPayload();
    }

    /**
     * Static one-shot runtime read.
     * @param {unknown} input Parsed Red object or YAML string.
     * @param {object} [options] Format values.
     * @returns {object} Runtime read result.
     */
    static readRuntime(input, options = {})
    {
        return new CjsRedReader(input, normalizeValues(DEFAULT_VALUES, options, CLASS_KEYS, FORMAT_NAME)).ReadRuntime();
    }

    /**
     * Static one-shot raw read.
     * @param {unknown} input Parsed Red object or YAML string.
     * @param {object} [options] Format values.
     * @returns {*} Raw object graph.
     */
    static readRaw(input, options = {})
    {
        return new CjsRedReader(input, normalizeValues(DEFAULT_VALUES, options, CLASS_KEYS, FORMAT_NAME)).ReadRaw();
    }

    /**
     * Static one-shot inspection.
     * @param {unknown} input Parsed Red object or YAML string.
     * @param {object} [options] Format values.
     * @returns {object} Plain summary data.
     */
    static inspect(input, options = {})
    {
        return new CjsRedReader(input, normalizeValues(DEFAULT_VALUES, options, CLASS_KEYS, FORMAT_NAME)).Inspect();
    }

    /**
     * Static JSON-compatible conversion.
     * @param {any} value Format output to convert.
     * @returns {any} Plain JSON-compatible data.
     */
    static toJSON(value)
    {
        return toJsonValue(value);
    }

    /** Provides the one-shot RED copy reader options helper entry point. */
    static copyReaderOptions(values)
    {
        return copyReaderOptions(values);
    }

    /**
     * Emit targets for this format (canonical frozen enum).
     */
    static Output = Object.freeze({
        JSON: OUTPUT_JSON,
        PAYLOAD: OUTPUT_PAYLOAD,
        RUNTIME: OUTPUT_RUNTIME,
        RAW: OUTPUT_RAW
    });
    static CLASS_KEYS = CLASS_KEYS;
    static schema = blackDefinitions;
    static id = "red";
    static extensions = Object.freeze([ ".red" ]);
    static mediaTypes = Object.freeze([ "data" ]);
    static outputs = CjsFormat.defineOutputs({
        json: { default: true, decoded: true },
        payload: { decoded: true },
        runtime: { decoded: true },
        raw: { role: "debug", decoded: true }
    });

}

export default CjsRedFormat;
