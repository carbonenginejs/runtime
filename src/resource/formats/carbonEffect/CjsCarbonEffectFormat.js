import { asUint8Array } from "#utils/bytes";
import { CjsFormat } from "../../format/CjsFormat.js";
import { CjsCarbonEffectReader } from "../../format/carbonEffect/CjsCarbonEffectReader.js";
import {
    CLASS_KEYS,
    DEFAULT_VALUES,
    OUTPUT_JSON,
    OUTPUT_METADATA,
    OUTPUT_RAW,
    inspectWithValues,
    normalizeValues,
    readWithValues,
    toJsonValue,
    readDescription,
    writeWithValues,
    validateClass,
    validateClassKey
} from "./core/helpers.js";

const FORMAT_NAME = "CjsCarbonEffectFormat";

/**
 * Read, write and inspect Carbon effect containers without runtime resources.
 *
 * Carbon: Tr2EffectRes::DoLoad (trinity/trinity/Resources/Tr2EffectRes.cpp:138-314)
 * Carbon: Tr2EffectRes::GetShader (trinity/trinity/Resources/Tr2EffectRes.cpp:51-136)
 * Carbon: main (trinity/shadercompiler/ShaderCompiler.cpp:746-845)
 * The last range is the compiler's file assembly ("Saving").
 * Adapted: a standalone JS format utility shares those binary operations with
 * tooling and Trinity. It neither compiles source nor owns GPU state, resource
 * lifecycle, global effect options or a runtime shader cache.
 *
 * JSON and metadata outputs retain the existing projections. Raw output is the
 * existing container reader; readDescription decodes a body on demand. Backend
 * blocks are retained by the shared reader/writer without translating programs.
 */
export class CjsCarbonEffectFormat extends CjsFormat
{
    /** Registered name; `constructor.name` does not survive minification. */
    static className = "CjsCarbonEffectFormat";

    _emit = DEFAULT_VALUES.emit;

    _source = DEFAULT_VALUES.source;

    _permutation = DEFAULT_VALUES.permutation;

    _classes = DEFAULT_VALUES.classes;

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
     * @returns {CjsCarbonEffectFormat} This format profile.
     */
    SetValues(options = {})
    {
        const values = normalizeValues(this.GetValues(), options, FORMAT_NAME);

        this._emit = values.emit;
        this._source = values.source;
        this._permutation = values.permutation;
        this._classes = values.classes;

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
            emit: this._emit,
            source: this._source,
            permutation: this._permutation,
            classes: this._classes
        }, options, FORMAT_NAME);
    }

    /**
     * Set multiple node-class constructors for this profile.
     *
     * @param {object} [classes] Map of node class keys to constructors. See {@link CjsCarbonEffectFormat.classKeys}.
     * @returns {CjsCarbonEffectFormat} This format profile.
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
     * @returns {CjsCarbonEffectFormat} This format profile.
     */
    SetClass(type, Class)
    {
        if (Class === null || Class === undefined)
        {
            validateClassKey(type, FORMAT_NAME);
            const classes = { ...this._classes };
            delete classes[type];
            this._classes = classes;
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
        return this._classes[type];
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
     * @returns {CjsCarbonEffectReader|object} The container reader, compact metadata, or the JSON graph.
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
            const bytes = asUint8Array(input, "CjsCarbonEffectFormat input");
            new CjsCarbonEffectReader(bytes, { source: "probeSupport" });
            return true;
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
     * @returns {CjsCarbonEffectReader|object} The container reader, compact metadata, or the JSON graph.
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

    /**
     * Decode one body with the shared reflection classes, without runtime handles.
     * @param {CjsCarbonEffectReader} reader Retained container reader.
     * @param {number} index Exact permutation index.
     * @param {object} [options] Reader options, including the optional backend flag.
     * @returns {object} Decoded Tr2EffectDescription.
     */
    static readDescription(reader, index, options = {})
    {
        return readDescription(reader, index, options);
    }

    /**
     * Assemble container bytes using the existing Carbon effect writer.
     * @param {object} parts Header fields, permutations and indexed description bodies.
     * @param {object} [options] Writer overrides (version, backend, compilerVersion, sourceHash).
     * @returns {Uint8Array} Compiled effect container bytes.
     */
    static write(parts, options = {})
    {
        return writeWithValues(parts, options);
    }

    /**
     * Write a container with the same contract as the static one-shot.
     * @param {object} parts Header fields, permutations and indexed description bodies.
     * @param {object} [options] Writer overrides.
     * @returns {Uint8Array} Compiled effect container bytes.
     */
    Write(parts, options = {})
    {
        return writeWithValues(parts, options);
    }

    static classKeys = CLASS_KEYS;

    static id = "CjsCarbonEffectFormat";

    static inputs = CjsFormat.defineInputs({
        raw: { default: true, options: [ "version", "backend", "compilerVersion", "sourceHash" ] }
    });

    static outputs = CjsFormat.defineOutputs({
        json: { default: true, decoded: true },
        metadata: { decoded: true },
        raw: { role: "debug", decoded: true }
    });

    static extensions = [ ".sm_hi", ".sm_lo", ".sm_depth" ];

}

export default CjsCarbonEffectFormat;
