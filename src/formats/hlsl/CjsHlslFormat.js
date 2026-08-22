import { CjsFormat } from "../../format/CjsFormat.js";
/**
 * Exposed CarbonEngineJS-facing Tr2 effect container format class.
 *
 * Keep this file small and reviewable: the Tr2 effect graph parser lives
 * under src/core/tr2 (internal parsing machinery, not part of this
 * package's public surface); input/option normalization, the shared read
 * path, and the JSON emitters live under src/core.
 */

import { HlslEffectRes } from "./core/tr2/resources/HlslEffectRes.js";
import {
    CLASS_KEYS,
    DEFAULT_VALUES,
    OUTPUT_JSON,
    OUTPUT_METADATA,
    OUTPUT_RAW,
    inspectWithValues,
    normalizeValues,
    readWithValues,
    toBytes,
    toJsonValue,
    validateClass,
    validateClassKey
} from "./core/helpers.js";

const FORMAT_NAME = "CjsHlslFormat";

/**
 * CarbonEngineJS-facing reader for CCP's Tr2 compiled effect container
 * format (`.sm_hi` / `.sm_lo` / `.sm_depth` bodies).
 *
 * The Cjs prefix marks this as a JavaScript format/construction boundary.
 * This format profile has no dependency on any DXBC/shader-bytecode decoder: shader
 * bodies stay as opaque bytes in the emitted graph. The public contract is
 * plain JSON data (`emit: "json"`, the default) — the documented effect
 * graph shape described in `docs/reference/json-graph.md`. `emit: "raw"`
 * exposes the internal
 * HlslEffectRes graph directly; treat it as unstable, not schema-guaranteed
 * internals, useful mainly for resolving multiple permutations by hand.
 *
 * The `classes` option lets a caller register constructors for specific
 * node kinds in the emitted JSON graph (see `CjsHlslFormat.CLASS_KEYS`);
 * class registration does not depend on importing internal graph classes.
 */
export class CjsHlslFormat extends CjsFormat
{

    #emit = DEFAULT_VALUES.emit;
    #source = DEFAULT_VALUES.source;
    #permutation = DEFAULT_VALUES.permutation;
    #classes = DEFAULT_VALUES.classes;

    /**
     * Create a reusable format profile.
     *
     * @param {object} [options] Default format values.
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
     * @returns {CjsHlslFormat} This format profile.
     */
    SetValues(options = {})
    {
        const values = normalizeValues(this.GetValues(), options, FORMAT_NAME);

        this.#emit = values.emit;
        this.#source = values.source;
        this.#permutation = values.permutation;
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
            source: this.#source,
            permutation: this.#permutation,
            classes: this.#classes
        }, options, FORMAT_NAME);
    }

    /**
     * Set multiple node-class constructors for this profile.
     *
     * @param {object} [classes] Map of node class keys to constructors. See {@link CjsHlslFormat.CLASS_KEYS}.
     * @returns {CjsHlslFormat} This format profile.
     */
    SetClasses(classes = {})
    {
        return this.SetValues({ classes });
    }

    /**
     * Set one node-class constructor for this profile.
     *
     * @param {string} type Node class key.
     * @param {Function|null|undefined} Class Constructor to use, or nullish to delete.
     * @returns {CjsHlslFormat} This format profile.
     */
    SetClass(type, Class)
    {
        if (Class === null || Class === undefined)
        {
            validateClassKey(type, FORMAT_NAME);
            const classes = { ...this.#classes };
            delete classes[type];
            this.#classes = classes;
            return this;
        }

        validateClass(type, Class, FORMAT_NAME);
        return this.SetValues({ classes: { [type]: Class } });
    }

    /**
     * Get a configured node-class constructor.
     *
     * @param {string} type Node class key.
     * @returns {Function|undefined} The registered constructor, if any.
     */
    GetClass(type)
    {
        validateClassKey(type, FORMAT_NAME);
        return this.#classes[type];
    }

    /**
     * Whether this reader has a constructor registered for a node class key.
     *
     * @param {string} type Node class key.
     * @returns {boolean} True when a constructor is registered.
     */
    HasClass(type)
    {
        return !!this.GetClass(type);
    }

    /**
     * Read a Tr2 effect payload with this profile's values.
     *
     * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input Tr2 effect container bytes.
     * @param {object} [options] Per-call value overrides.
     * @returns {HlslEffectRes|object} The raw HlslEffectRes instance, compact metadata, or the documented JSON graph.
     */
    Read(input, options = {})
    {
        return readWithValues(input, this.GetValues(options));
    }

    /**
     * Inspect a Tr2 effect payload: header facts plus the default (or
     * selected) permutation's technique names and stage counts.
     *
     * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input Tr2 effect container bytes.
     * @param {object} [options] Per-call value overrides.
     * @returns {object} Plain summary data.
     */
    Inspect(input, options = {})
    {
        return inspectWithValues(input, this.GetValues(options));
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
     * Static payload sniff. Static methods use camelCase by convention.
     *
     * The Tr2 effect container has no magic number, so this attempts a
     * cheap header-only load (version, string table, permutation axes and
     * body offsets — no shader bodies) and reports whether it succeeded.
     *
     * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input Candidate bytes.
     * @returns {boolean} True when the payload's header decodes as a supported Tr2 effect.
     */
    static probeSupport(input)
    {
        try
        {
            const bytes = toBytes(input);
            return new HlslEffectRes().DoLoad(bytes, { source: "probeSupport" });
        }
        catch
        {
            return false;
        }
    }

    /**
     * Static one-shot read.
     *
     * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input Tr2 effect container bytes.
     * @param {object} [options] Format values.
     * @returns {HlslEffectRes|object} The raw HlslEffectRes instance, compact metadata, or the documented JSON graph.
     */
    static read(input, options = {})
    {
        return readWithValues(input, normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME));
    }

    /**
     * Static one-shot inspection.
     *
     * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input Tr2 effect container bytes.
     * @param {object} [options] Format values.
     * @returns {object} Plain summary data.
     */
    static inspect(input, options = {})
    {
        return inspectWithValues(input, normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME));
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

    static OUTPUT_JSON = OUTPUT_JSON;
    static OUTPUT_METADATA = OUTPUT_METADATA;
    static OUTPUT_RAW = OUTPUT_RAW;
    static CLASS_KEYS = CLASS_KEYS;
    static id = "hlsl";
    static mediaTypes = Object.freeze([ "shader" ]);
    static outputs = CjsFormat.defineOutputs({
        json: { default: true, decoded: true },
        metadata: { decoded: true },
        raw: { role: "debug", decoded: true }
    });
    static extensions = Object.freeze([ ".sm_hi", ".sm_lo", ".sm_depth" ]);

}

export default CjsHlslFormat;
