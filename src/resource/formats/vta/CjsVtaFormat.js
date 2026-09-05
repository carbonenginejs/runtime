import { asUint8Array } from "#utils/bytes";
import { CjsFormat } from "../../format/CjsFormat.js";
import {
    DEFAULT_VALUES,
    OUTPUT_JSON,
    OUTPUT_RAW,
    OUTPUT_VOLUME,
    OUTPUT_VTA_JSON,
    VTA_ENCODING,
    VTA_VERSION,
    inspectWithValues,
    isVTA,
    normalizeValues,
    probeSupportWithValues,
    readAsyncWithValues,
    readWithValues,
    toJsonValue
} from "./core/helpers.js";

const FORMAT_NAME = "CjsVtaFormat";

/**
 * VTA format profile - Carbon's Volume Texture Animation container.
 *
 * Reads `.vta` bytes into raw, structural debug JSON, or decoded R8 volume
 * payloads (per grid, per frame). Volume decode is asynchronous because
 * every frame blob is zlib-compressed and inflates through
 * DecompressionStream; `Read` serves the synchronous targets and points
 * volume callers at `ReadAsync`. Carbon's static texture path is grid 0 /
 * frame 0 - the profile's defaults select exactly that frame.
 */
export class CjsVtaFormat extends CjsFormat
{
    #values = DEFAULT_VALUES;

    /**
     * Create a reusable VTA format profile.
     *
     * @param {object} [options] Default read options.
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
     * @returns {CjsVtaFormat} This format profile.
     */
    SetValues(options = {})
    {
        this.#values = normalizeValues(this.#values, options, FORMAT_NAME);
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
        return normalizeValues(this.#values, options, FORMAT_NAME);
    }

    /**
     * Read VTA bytes with this profile - raw and debug targets only.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input VTA bytes.
     * @param {object} [options] Per-call values.
     * @returns {object} Raw or structural payload for the selected emit target.
     */
    Read(input, options = {})
    {
        return readWithValues(input, this.GetValues(options));
    }

    /**
     * Read VTA bytes asynchronously with this profile, including volumes.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input VTA bytes.
     * @param {object} [options] Per-call values.
     * @returns {Promise<object>} Payload for the selected emit target.
     */
    async ReadAsync(input, options = {})
    {
        return readAsyncWithValues(input, this.GetValues(options));
    }

    /**
     * Inspect VTA bytes without decoding any payload.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input VTA bytes.
     * @returns {object} Header, grid table, offsets and metadata.
     */
    Inspect(input)
    {
        return inspectWithValues(input);
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
     * One-shot VTA read - raw and debug targets only.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input VTA bytes.
     * @param {object} [options] Read options.
     * @returns {object} Raw or structural payload for the selected emit target.
     */
    static read(input, options = {})
    {
        return readWithValues(input, normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME));
    }

    /**
     * One-shot asynchronous VTA read, including decoded volumes.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input VTA bytes.
     * @param {object} [options] Read options.
     * @returns {Promise<object>} Payload for the selected emit target.
     */
    static async readAsync(input, options = {})
    {
        return readAsyncWithValues(input, normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME));
    }

    /**
     * One-shot VTA inspection.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input VTA bytes.
     * @returns {object} Header, grid table, offsets and metadata.
     */
    static inspect(input)
    {
        return inspectWithValues(input);
    }

    /**
     * One-shot VTA support probe.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input VTA bytes.
     * @returns {object} Support/probe report.
     */
    static probeSupport(input)
    {
        return probeSupportWithValues(input);
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
     * Test whether bytes look like a version-1 VTA file.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input Candidate bytes.
     * @returns {boolean} True when the signature and version match.
     */
    static isVTA(input)
    {
        try
        {
            return isVTA(asUint8Array(input, "VTA input"));
        }
        catch
        {
            return false;
        }
    }

    /**
     * Grid payload encodings. Rle7/Rle7_5/Rle6 differ only in the encoder's
     * quantization; one decoder serves all three.
     */
    static Encoding = VTA_ENCODING;

    /** The only VTA container version Carbon ever wrote. */
    static VERSION = VTA_VERSION;

    /**
     * Emit targets for this format (canonical frozen enum).
     */
    static Output = Object.freeze({
        VOLUME: OUTPUT_VOLUME,
        RAW: OUTPUT_RAW,
        JSON: OUTPUT_JSON
    });

    static OUTPUT_VTA_JSON = OUTPUT_VTA_JSON;

    static id = "vta";

    static mediaTypes = Object.freeze([ "image" ]);

    static outputs = CjsFormat.defineOutputs({

        volume: { decoded: true, readMode: "async", probes: [ "volume" ] },

        vtaJson: { role: "debug", probes: [ "vtaJson", "raw" ] },

        raw: { role: "debug", default: true, passthrough: true }

    });

    static extensions = Object.freeze([ ".vta" ]);
}

export default CjsVtaFormat;
