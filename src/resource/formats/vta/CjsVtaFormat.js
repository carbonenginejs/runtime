import { asUint8Array } from "#utils/bytes";
import { CjsFormat } from "../../format/CjsFormat.js";
import {
    DEFAULT_VALUES,
    decodeVolumeFrames,
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
 * Extends CjsFormat in runtime's resource layer. Callers supply bytes and receive
 * raw bytes, structural debug JSON, or decoded R8 volume payloads. This class
 * owns container inspection and decoding; it performs no resource acquisition,
 * filesystem access, playback scheduling or GPU texture allocation.
 *
 * Tr2TextureAnimation is the playback consumer in the Trinity layer. It acquires
 * bytes through blue.resMan.ReadResource, calls CjsVtaFormat.readFrames to decode
 * one frame ahead, and uses the render context to create and update a stable 3D
 * texture for each grid. Looping, pause, restart and texture disposal belong to
 * Tr2TextureAnimation; the format remains usable by tools without that class.
 *
 * Read serves raw and debug outputs. ReadAsync also decodes volume payloads;
 * ReadFrames/readFrames yields sequential frames without retaining the entire
 * decoded animation. Each frame blob is zlib-compressed and inflated through
 * DecompressionStream, so volume decoding is asynchronous.
 *
 * Profiles default to raw output. When volume output is requested, defaults
 * select frame zero and all grids; callers can select a grid explicitly.
 * Carbon's separate static-texture path uses grid zero and frame zero.
 */
export class CjsVtaFormat extends CjsFormat
{
    /** Registered name; `constructor.name` does not survive minification. */
    static className = "CjsVtaFormat";

    _values = DEFAULT_VALUES;

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
        this._values = normalizeValues(this._values, options, FORMAT_NAME);
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
        return normalizeValues(this._values, options, FORMAT_NAME);
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
     * Streams selected grids from frame zero, retaining only decoder working data.
     * Each yielded volume payload contains one detached frame per grid.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input VTA bytes.
     * @param {object} [options] Grid selection; decoding always starts at frame zero.
     * @returns {AsyncGenerator<object>} Sequential volume payloads.
     */
    static readFrames(input, options = {})
    {
        const values = normalizeValues(DEFAULT_VALUES, { ...options, emit: OUTPUT_VOLUME, allFrames: true, frame: 0 }, FORMAT_NAME);
        return decodeVolumeFrames(asUint8Array(input, "VTA input"), values);
    }

    /**
     * Streams frames using this profile's grid selection.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input VTA bytes.
     * @param {object} [options] Per-call grid selection.
     * @returns {AsyncGenerator<object>} Sequential volume payloads.
     */
    ReadFrames(input, options = {})
    {
        return CjsVtaFormat.readFrames(input, this.GetValues(options));
    }

    static id = "CjsVtaFormat";

    static mediaTypes = [ "image" ];

    static outputs = CjsFormat.defineOutputs({

        volume: { decoded: true, readMode: "async", probes: [ "volume" ] },

        vtaJson: { role: "debug", probes: [ "vtaJson", "raw" ] },

        raw: { role: "debug", default: true, passthrough: true }

    });

    static extensions = [ ".vta" ];
}

export default CjsVtaFormat;
