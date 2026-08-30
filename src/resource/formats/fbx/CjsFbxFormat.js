import { CjsFormat } from "../../format/CjsFormat.js";
import {
    CLASS_KEYS,
    DEFAULT_VALUES,
    OUTPUT_CMF,
    OUTPUT_FBX_JSON,
    OUTPUT_GR2,
    OUTPUT_JSON,
    OUTPUT_RAW,
    inspectWithValues,
    isFBX,
    probeSupportWithValues,
    normalizeValues,
    readWithValues,
    toBytes,
    toJsonValue,
    validateClass,
    validateClassKey
} from "./core/helpers.js";
import { writeFbx, writeSharedFbx } from "./core/writer.js";

const FORMAT_NAME = "CjsFbxFormat";

/**
 * CarbonEngineJS-facing FBX format surface.
 *
 * FBX is recognized, inspected, imported into CMF/GR2 compatibility graphs,
 * and exported from native CMF in pure JavaScript. Geometry, skeletons, skin,
 * morph targets, and their animations are in scope; cameras and lights are not.
 */
export class CjsFbxFormat extends CjsFormat
{
    #values = DEFAULT_VALUES;

    /**
     * Create a reusable FBX format profile.
     *
     * @param {object} [options] Default read/inspect options.
     */
    constructor(options = {})
    {
        super();
        this.SetValues(options);
    }

    /**
     * Merge options into this profile.
     *
     * @param {object} [options] Values to merge.
     * @returns {CjsFbxFormat} This format profile.
     */
    SetValues(options = {})
    {
        this.#values = normalizeValues(this.#values, { inputType: "fbx", ...options }, FORMAT_NAME);
        return this;
    }

    /**
     * Get normalized profile values with optional per-call overrides.
     *
     * @param {object} [options] Per-call values.
     * @returns {object} Normalized read values.
     */
    GetValues(options = {})
    {
        return normalizeValues(this.#values, { inputType: "fbx", ...options }, FORMAT_NAME);
    }

    /**
     * Set multiple output node constructors for this profile.
     *
     * These constructors are used only for explicit runtime output targets such
     * as `emit: "gr2"` and `emit: "cmf"` paths. Debug `fbxJson` output
     * remains plain data.
     *
     * @param {object} [classes] Map of output node class keys to constructors.
     * @returns {CjsFbxFormat} This format profile.
     */
    SetClasses(classes = {})
    {
        return this.SetValues({ classes });
    }

    /**
     * Set one output node constructor for this profile.
     *
     * @param {string} type Output node class key.
     * @param {Function|null|undefined} Class Constructor to use, or nullish to delete.
     * @returns {CjsFbxFormat} This format profile.
     */
    SetClass(type, Class)
    {
        validateClassKey(type, FORMAT_NAME);

        if (Class === null || Class === undefined)
        {
            const classes = { ...this.#values.classes };
            delete classes[type];
            this.#values = { ...this.#values, classes };
            return this;
        }

        validateClass(type, Class, FORMAT_NAME);
        return this.SetValues({ classes: { [type]: Class } });
    }

    /**
     * Get a configured output node constructor.
     *
     * @param {string} type Output node class key.
     * @returns {Function|undefined} The registered constructor, if any.
     */
    GetClass(type)
    {
        validateClassKey(type, FORMAT_NAME);
        return this.#values.classes[type];
    }

    /**
     * Whether this profile has a constructor registered for an output node key.
     *
     * @param {string} type Output node class key.
     * @returns {boolean} True when a constructor is registered.
     */
    HasClass(type)
    {
        return !!this.GetClass(type);
    }

    /**
     * Read FBX bytes with this profile.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input FBX bytes.
     * @param {object} [options] Per-call values.
     * @returns {object} Raw or debug payload for the selected emit target.
     */
    Read(input, options = {})
    {
        return readWithValues(input, this.GetValues(options));
    }

    /** Write a native CMF graph as deterministic binary FBX 7400 bytes. */
    Write(input, options = {})
    {
        return writeFbx(input, options);
    }

    /** Convert shared or GR2-shaped geometry through CMF and write FBX. */
    WriteShared(input, options = {})
    {
        return writeSharedFbx(input, options);
    }

    /**
     * Read FBX bytes asynchronously with this profile.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input FBX bytes.
     * @param {object} [options] Per-call values.
     * @returns {Promise<object>} Raw or debug payload for the selected emit target.
     */
    async ReadAsync(input, options = {})
    {
        return this.Read(input, options);
    }

    /**
     * Inspect FBX bytes without converting geometry.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input FBX bytes.
     * @param {object} [options] Per-call values.
     * @returns {object} Lightweight FBX metadata.
     */
    Inspect(input, options = {})
    {
        return inspectWithValues(input, this.GetValues(options));
    }

    /**
     * Convert format output into JSON-compatible debug data.
     *
     * @param {any} value Format output.
     * @returns {any} JSON-compatible value.
     */
    ToJSON(value)
    {
        return toJsonValue(value);
    }

    /**
     * One-shot FBX read.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input FBX bytes.
     * @param {object} [options] Read options.
     * @returns {object} Raw or debug payload for the selected emit target.
     */
    static read(input, options = {})
    {
        return readWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "fbx", ...options }, FORMAT_NAME));
    }

    /** Write a native CMF graph as deterministic binary FBX 7400 bytes. */
    static write(input, options = {})
    {
        return writeFbx(input, options);
    }

    /** Convert shared or GR2-shaped geometry through CMF and write FBX. */
    static writeShared(input, options = {})
    {
        return writeSharedFbx(input, options);
    }

    /**
     * One-shot asynchronous FBX read.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input FBX bytes.
     * @param {object} [options] Read options.
     * @returns {Promise<object>} Raw or debug payload for the selected emit target.
     */
    static async readAsync(input, options = {})
    {
        return CjsFbxFormat.read(input, options);
    }

    /**
     * One-shot FBX inspection.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input FBX bytes.
     * @param {object} [options] Inspect options.
     * @returns {object} Lightweight FBX metadata.
     */
    static inspect(input, options = {})
    {
        return inspectWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "fbx", ...options }, FORMAT_NAME));
    }

    /**
     * One-shot FBX support probe.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input FBX bytes.
     * @param {object} [options] Probe options.
     * @returns {object} Support/probe report.
     */
    static probeSupport(input, options = {})
    {
        return probeSupportWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "fbx", ...options }, FORMAT_NAME));
    }

    /**
     * Convert format output into JSON-compatible debug data.
     *
     * @param {any} value Format output.
     * @returns {any} JSON-compatible value.
     */
    static toJSON(value)
    {
        return toJsonValue(value);
    }

    /**
     * Test whether bytes look like an FBX file.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input Candidate FBX bytes.
     * @returns {boolean} True when the input appears to be FBX.
     */
    static isFBX(input)
    {
        try
        {
            return isFBX(toBytes(input));
        }
        catch
        {
            return false;
        }
    }

    /**
     * Emit targets for this format (canonical frozen enum).
     */
    static Output = Object.freeze({
        CMF: OUTPUT_CMF,
        GR2: OUTPUT_GR2,
        RAW: OUTPUT_RAW,
        JSON: OUTPUT_JSON,
        FBX_JSON: OUTPUT_FBX_JSON
    });
    static CLASS_KEYS = CLASS_KEYS;
    static id = "fbx";
    static mediaTypes = Object.freeze([ "geometry" ]);
    static outputs = CjsFormat.defineOutputs({
        gr2: { decoded: true },
        cmf: { decoded: true },
        fbxJson: { role: "debug", decoded: true, probes: [ "fbxJson", "document" ] },
        raw: { role: "debug", default: true, passthrough: true, probes: [ "raw", "document" ] }
    });
    static extensions = Object.freeze([ ".fbx" ]);
}

export default CjsFbxFormat;
