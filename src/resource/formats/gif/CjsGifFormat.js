import { CjsSchema } from "#schema/CjsSchema";

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
    /** Registered name; `constructor.name` does not survive minification. */
    static className = "CjsGifFormat";

    _values = DEFAULT_VALUES;

    /**
     * Creates a CjsGifFormat with caller-provided reader configuration.
     *
     * @param {Partial<import("./core/helpers.js").GifValues>} [options={}] Reader options.
     */
    constructor(options = {})
    {
        super();
        this.SetValues(options);
    }

    /**
     * Applies caller-provided options after normalizing supported fields for the
     * GIF format configuration.
     *
     * @param {Partial<import("./core/helpers.js").GifValues>} [options={}] Reader options.
     * @param {string} [options.emit] Output to emit.
     * @param {string} [options.inputType="gif"] Expected source type.
     * @param {string} [options.source] Diagnostic source label.
     * @returns {this} This format.
     */
    SetValues(options = {})
    {
        this._values = normalizeValues(this._values, { inputType: "gif", ...options }, FORMAT_NAME);
        return this;
    }

    /**
     * Returns a snapshot of the normalized reader options for the GIF format
     * configuration.
     *
     * @param {Partial<import("./core/helpers.js").GifValues>} [options={}] Per-call overrides.
     * @param {string} [options.emit] Output to emit.
     * @param {string} [options.inputType="gif"] Expected source type.
     * @param {string} [options.source] Diagnostic source label.
     * @returns {import("./core/helpers.js").GifValues} The normalized values.
     */
    GetValues(options = {})
    {
        return normalizeValues(this._values, { inputType: "gif", ...options }, FORMAT_NAME);
    }

    /**
     * Reads the primary public payload representation from the supplied input
     * for the GIF format configuration.
     *
     * @param {Uint8Array|ArrayBuffer|ArrayBufferView} input File bytes.
     * @param {Partial<import("./core/helpers.js").GifValues>} [options={}] Per-call overrides.
     * @returns {object} Raw bytes with metadata, the inspection, or the decoded RGBA image, per `emit`.
     */
    Read(input, options = {})
    {
        return readWithValues(input, this.GetValues(options));
    }

    /**
     * Reads the primary public payload representation asynchronously for the GIF
     * format configuration.
     *
     * @param {Uint8Array|ArrayBuffer|ArrayBufferView} input File bytes.
     * @param {Partial<import("./core/helpers.js").GifValues>} [options={}] Per-call overrides.
     * @returns {Promise<object>} The `Read` result.
     */
    async ReadAsync(input, options = {})
    {
        return this.Read(input, options);
    }

    /**
     * Returns structural metadata without materializing the decoded payload for
     * the GIF format configuration.
     *
     * @param {Uint8Array|ArrayBuffer|ArrayBufferView} input File bytes.
     * @param {Partial<import("./core/helpers.js").GifValues>} [options={}] Per-call overrides.
     * @returns {import("./core/helpers.js").GifInspection} The header and frame metadata.
     */
    Inspect(input, options = {})
    {
        return inspectWithValues(input, this.GetValues(options));
    }

    /**
     * Converts the current decoded payload into a JSON-safe representation for
     * the GIF format configuration.
     *
     * @param {*} value Decoded payload.
     * @returns {*} JSON-safe copy with byte arrays reported as `{ byteLength }`.
     */
    ToJSON(value)
    {
        return toJsonValue(value);
    }

    /**
     * Provides the one-shot GIF payload reader entry point.
     *
     * @param {Uint8Array|ArrayBuffer|ArrayBufferView} input File bytes.
     * @param {Partial<import("./core/helpers.js").GifValues>} [options={}] Reader options.
     * @returns {object} The `Read` result.
     */
    static read(input, options = {})
    {
        return readWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "gif", ...options }, FORMAT_NAME));
    }

    /**
     * Provides the asynchronous one-shot GIF payload reader entry point.
     *
     * @param {Uint8Array|ArrayBuffer|ArrayBufferView} input File bytes.
     * @param {Partial<import("./core/helpers.js").GifValues>} [options={}] Reader options.
     * @returns {Promise<object>} The `read` result.
     */
    static async readAsync(input, options = {})
    {
        return CjsGifFormat.read(input, options);
    }

    /**
     * Provides the one-shot GIF metadata inspection entry point.
     *
     * @param {Uint8Array|ArrayBuffer|ArrayBufferView} input File bytes.
     * @param {Partial<import("./core/helpers.js").GifValues>} [options={}] Reader options.
     * @returns {import("./core/helpers.js").GifInspection} The header and frame metadata.
     */
    static inspect(input, options = {})
    {
        return inspectWithValues(input, normalizeValues(DEFAULT_VALUES, { inputType: "gif", ...options }, FORMAT_NAME));
    }

    /**
     * Provides the one-shot GIF JSON conversion entry point.
     *
     * @param {*} value Decoded payload.
     * @returns {*} JSON-safe copy with byte arrays reported as `{ byteLength }`.
     */
    static toJSON(value)
    {
        return toJsonValue(value);
    }

    /**
     * Checks whether caller-provided bytes carry the expected GIF signature.
     *
     * @param {Uint8Array|ArrayBuffer|ArrayBufferView} input File bytes.
     * @returns {boolean} True for a GIF87a/GIF89a header; false otherwise or for non-byte input.
     */
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

    static id = "CjsGifFormat";

    static outputs = CjsFormat.defineOutputs({
        image: { decoded: true, probes: [ "image", "rgba" ] },
        rgba: { decoded: true },
        gifJson: { role: "debug", probes: [ "gifJson", "raw" ] },
        raw: { role: "debug", default: true, passthrough: true }
    });

    /**
     * Fill a HostBitmap through this format's RGBA8 output, for Carbon's ImageIO
     * registry (ImageIO). See CjsImageFormat.readImageFromRgbaPayload.
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

CjsSchema.meta.define("CjsGifFormat")(CjsGifFormat);
