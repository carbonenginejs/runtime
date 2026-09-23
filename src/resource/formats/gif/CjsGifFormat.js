import { asUint8Array } from "#utils/bytes";
import { CjsFormat } from "../../format/CjsFormat.js";
import { CjsImageFormat } from "../../format/CjsImageFormat.js";
import {
    DEFAULT_VALUES,
    OUTPUT_IMAGE,
    OUTPUT_JSON,
    OUTPUT_RAW,
    OUTPUT_RGBA,
    inspectWithValues,
    isGIF,
    probeSupportWithValues,
    normalizeValues,
    readWithValues,
    toJsonValue
} from "./core/helpers.js";

const FORMAT_NAME = "CjsGifFormat";

/**
 * GIF format profile that inspects header and frame metadata and reads GIF
 * bytes into raw, debug JSON, or LZW-decoded RGBA frame payloads.
 */
export class CjsGifFormat extends CjsImageFormat
{
    _values = DEFAULT_VALUES;

    /** Creates a CjsGifFormat with caller-provided reader configuration. */
    constructor(options = {})
    {
        super();
        this.SetValues(options);
    }

    /**
     * Applies caller-provided options after normalizing supported fields for the
     * GIF format configuration.
     */
    SetValues(options = {})
    {
        this._values = normalizeValues(this._values, { inputType: "gif", ...options }, FORMAT_NAME);
        return this;
    }

    /**
     * Returns a snapshot of the normalized reader options for the GIF format
     * configuration.
     */
    GetValues(options = {})
    {
        return normalizeValues(this._values, { inputType: "gif", ...options }, FORMAT_NAME);
    }

    /**
     * Reads the primary public payload representation from the supplied input
     * for the GIF format configuration.
     */
    Read(input, options = {})
    {
        return readWithValues(input, this.GetValues(options));
    }

    /**
     * Reads the primary public payload representation asynchronously for the GIF
     * format configuration.
     */
    async ReadAsync(input, options = {})
    {
        return this.Read(input, options);
    }

    /**
     * Returns structural metadata without materializing the decoded payload for
     * the GIF format configuration.
     */
    Inspect(input, options = {})
    {
        return inspectWithValues(input, this.GetValues(options));
    }

    /**
     * Converts the current decoded payload into a JSON-safe representation for
     * the GIF format configuration.
     */
    ToJSON(value)
    {
        return toJsonValue(value);
    }

    /** Provides the one-shot GIF payload reader entry point. */
    static read(input, options = {})
    {
        return readWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "gif", ...options }, FORMAT_NAME));
    }

    /** Provides the asynchronous one-shot GIF payload reader entry point. */
    static async readAsync(input, options = {})
    {
        return CjsGifFormat.read(input, options);
    }

    /** Provides the one-shot GIF metadata inspection entry point. */
    static inspect(input, options = {})
    {
        return inspectWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "gif", ...options }, FORMAT_NAME));
    }

    /** Checks one input against the GIF decoder capability contract. */

    /** Provides the one-shot GIF JSON conversion entry point. */
    static toJSON(value)
    {
        return toJsonValue(value);
    }

    /** Checks whether caller-provided bytes carry the expected GIF signature. */
    static isGIF(input)
    {
        try
        {
            return isGIF(asUint8Array(input, "GIF input"));
        }
        catch
        {
            return false;
        }
    }

    /**
     * Emit targets for this format (canonical frozen enum).
     */
    static id = "CjsGifFormat";
    static mediaTypes = [ "image" ];
    static outputs = CjsFormat.defineOutputs({
        image: { decoded: true, probes: [ "image", "rgba" ] },
        rgba: { decoded: true },
        gifJson: { role: "debug", probes: [ "gifJson", "raw" ] },
        raw: { role: "debug", default: true, passthrough: true }
    });
    /**
     * Fill a HostBitmap through this format's RGBA8 output, for Carbon's ImageIO
     * registry (`CjsGifFormat.carbon`). See CjsImageFormat.readImageFromRgbaPayload.
     *
     * @param {Uint8Array|ArrayBuffer} input Image bytes.
     * @param {object} _loadParameters Load parameters; a single-mip image skips nothing.
     * @param {object} bitmap Destination HostBitmap.
     * @param {object|null} [metadata] Optional Metadata out.
     * @returns {object} ImageIOResult.
     */
    static readImageNative(input, _loadParameters, bitmap, metadata = null)
    {
        return this.readImageFromRgbaPayload(this.read(input, { emit: "rgba" }), bitmap, metadata);
    }

    static extensions = [ ".gif" ];
}

export default CjsGifFormat;
