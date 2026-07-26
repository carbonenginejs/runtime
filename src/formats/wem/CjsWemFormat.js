import {
    DEFAULT_VALUES,
    OUTPUT_JSON,
    OUTPUT_OGG,
    OUTPUT_PCM,
    OUTPUT_RAW,
    OUTPUT_WEM_JSON,
    WEM_CODEC_NAMES,
    inspectWithValues,
    isSupportedWithValues,
    isWEM,
    normalizeValues,
    readWithValues,
    toBytes,
    toJsonValue
} from "./core/helpers.js";
import { resolveTypeWithValues } from "./core/resolve.js";

const FORMAT_NAME = "CjsWemFormat";

/**
 * Reader for Audiokinetic Wwise media (.wem) containers.
 *
 * Inspection identifies the codec, channel/rate layout, and Vorbis duration
 * without decoding audio data. Read emits the container bytes untouched by
 * default; `emit: "ogg"` repacks Wwise Vorbis into a standard Ogg stream and
 * `emit: "pcm"` decodes PTADPCM / 16-bit PCM media to float32 samples.
 */
export class CjsWemFormat
{
    #values = DEFAULT_VALUES;

    /**
     * Browser-worker module declaration consumed by CjsResManWorkerLoader.
     */
    static worker = Object.freeze({
        module: import.meta.url,
        exportName: "CjsWemFormat"
    });

    /**
     * Create a reusable wem format profile.
     *
     * @param {object} [options] Default read/inspect options.
     */
    constructor(options = {})
    {
        this.SetValues(options);
    }

    /**
     * Merge options into this profile.
     *
     * @param {object} [options] Values to merge.
     * @returns {CjsWemFormat} This format profile.
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
     * Read wem bytes with this profile.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input Wem bytes.
     * @param {object} [options] Per-call values.
     * @returns {object} GPU-free raw/debug payload for the selected emit target.
     */
    Read(input, options = {})
    {
        return readWithValues(input, this.GetValues(options));
    }

    /**
     * Read wem bytes asynchronously with this profile.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input Wem bytes.
     * @param {object} [options] Per-call values.
     * @returns {Promise<object>} GPU-free raw/debug payload for the selected emit target.
     */
    async ReadAsync(input, options = {})
    {
        return this.Read(input, options);
    }

    /**
     * Inspect wem bytes without decoding audio data.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input Wem bytes.
     * @param {object} [options] Per-call values.
     * @returns {object} Wwise container metadata.
     */
    Inspect(input, options = {})
    {
        return inspectWithValues(input, this.GetValues(options));
    }

    /**
     * Report whether wem input and requested output variants are supported.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input Wem bytes.
     * @param {object} [options] Per-call values.
     * @returns {object} Support/probe report.
     */
    IsSupported(input, options = {})
    {
        return isSupportedWithValues(input, this.GetValues(options));
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
     * One-shot wem read.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input Wem bytes.
     * @param {object} [options] Read options.
     * @returns {object} GPU-free raw/debug payload for the selected emit target.
     */
    static read(input, options = {})
    {
        return readWithValues(input, normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME));
    }

    /**
     * One-shot asynchronous wem read.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input Wem bytes.
     * @param {object} [options] Read options.
     * @returns {Promise<object>} GPU-free raw/debug payload for the selected emit target.
     */
    static async readAsync(input, options = {})
    {
        return CjsWemFormat.read(input, options);
    }

    /**
     * One-shot wem inspection.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input Wem bytes.
     * @param {object} [options] Inspect options.
     * @returns {object} Wwise container metadata.
     */
    static inspect(input, options = {})
    {
        return inspectWithValues(input, normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME));
    }

    /**
     * One-shot wem support probe.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input Wem bytes.
     * @param {object} [options] Probe options.
     * @returns {object} Support/probe report.
     */
    static isSupported(input, options = {})
    {
        return isSupportedWithValues(input, normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME));
    }

    /**
     * Content-verified codec/route resolution (kb §5 resolveType seam).
     *
     * Where `isSupported` trusts the fmt tag, this validates the declared
     * codec against the container's actual structure (Vorbis sidecar,
     * PTADPCM frame layout, PCM size consistency - bounded, no audio
     * decode) and tries the other codecs when the declaration fails.
     * The report carries `verified: true`, `preferred` = `ogg`/`pcm`/`raw`,
     * and declared/resolved/mismatch evidence in `metadata`.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input Wem bytes.
     * @param {object} [options] Probe options.
     * @returns {Promise<object>} Content-verified probe report.
     */
    static async resolveType(input, options = {})
    {
        return resolveTypeWithValues(input, normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME));
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
     * Test whether bytes look like a Wwise media container.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input Candidate wem bytes.
     * @returns {boolean} True when RIFF/RIFX WAVE signatures are present.
     */
    static isWEM(input)
    {
        try
        {
            return isWEM(toBytes(input));
        }
        catch
        {
            return false;
        }
    }

    /**
     * Repack Wwise Vorbis wem bytes into a standard Ogg Vorbis stream.
     *
     * Lossless container transform (no audio decode/re-encode); output plays
     * natively where Ogg Vorbis is supported. Equivalent to
     * `read(input, { emit: "ogg" })`.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input Wem bytes.
     * @param {object} [options] Options, including a `codebooks` override.
     * @returns {object} Ogg payload with bytes, timing, and loop metadata.
     */
    static toOgg(input, options = {})
    {
        return CjsWemFormat.read(input, { ...options, emit: OUTPUT_OGG });
    }

    /**
     * Decode wem audio data to per-channel float32 PCM (AudioBuffer-ready).
     *
     * Covers Wwise PTADPCM (0x8311) and uncompressed 16-bit PCM. Wwise Vorbis
     * is not decoded here - repack it with `toOgg()` instead. Equivalent to
     * `read(input, { emit: "pcm" })`.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input Wem bytes.
     * @param {object} [options] Read options.
     * @returns {object} PCM payload with channelData, sample rate, and timing.
     */
    static toPcm(input, options = {})
    {
        return CjsWemFormat.read(input, { ...options, emit: OUTPUT_PCM });
    }

    /**
     * Emit targets for this format (canonical frozen enum).
     */
    static Output = Object.freeze({
        RAW: OUTPUT_RAW,
        JSON: OUTPUT_JSON,
        WEM_JSON: OUTPUT_WEM_JSON,
        OGG: OUTPUT_OGG,
        PCM: OUTPUT_PCM
    });
    static CODEC_NAMES = WEM_CODEC_NAMES;
    static type = Object.freeze([ "audio" ]);
    static mediaTypes = Object.freeze([ "audio" ]);
    static inputTypes = Object.freeze([ "wem" ]);
    static outputTypes = Object.freeze([ OUTPUT_RAW, OUTPUT_OGG, OUTPUT_PCM ]);
    static debugOutputTypes = Object.freeze([ OUTPUT_WEM_JSON, OUTPUT_RAW ]);
}

export default CjsWemFormat;
