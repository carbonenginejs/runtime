import {
    buildSoundbanksCatalog,
    isSoundbanksInfo,
    joinSoundbanksInfo,
    parseSoundbanksInfo,
    wwiseIdFromName
} from "./core/soundbanksInfo.js";
import {
    DEFAULT_VALUES,
    HIRC_TYPE_NAMES,
    OUTPUT_BNK_JSON,
    OUTPUT_JSON,
    OUTPUT_MEDIA,
    OUTPUT_RAW,
    extractMedia,
    inspectWithValues,
    isBNK,
    isSupportedWithValues,
    normalizeValues,
    readWithValues,
    toBytes,
    toJsonValue
} from "./core/helpers.js";

const FORMAT_NAME = "CjsBnkFormat";

/**
 * Reader for Audiokinetic Wwise soundbank (.bnk) containers.
 *
 * Inspection decodes the bank header, embedded media index, object hierarchy
 * listing, and referenced bank names without copying payloads. Read can emit
 * the raw bank, debug JSON, or the embedded media items undecoded; Wwise
 * event/graph semantics are deliberately out of scope for this reader.
 */
export class CjsBnkFormat
{
    #values = DEFAULT_VALUES;

    /**
     * Create a reusable bnk format profile.
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
     * @returns {CjsBnkFormat} This format profile.
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
     * Read soundbank bytes with this profile.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input Soundbank bytes.
     * @param {object} [options] Per-call values.
     * @returns {object} GPU-free raw/debug/media payload for the selected emit target.
     */
    Read(input, options = {})
    {
        return readWithValues(input, this.GetValues(options));
    }

    /**
     * Read soundbank bytes asynchronously with this profile.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input Soundbank bytes.
     * @param {object} [options] Per-call values.
     * @returns {Promise<object>} GPU-free raw/debug/media payload for the selected emit target.
     */
    async ReadAsync(input, options = {})
    {
        return this.Read(input, options);
    }

    /**
     * Inspect soundbank bytes without copying media payloads.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input Soundbank bytes.
     * @param {object} [options] Per-call values.
     * @returns {object} Soundbank metadata.
     */
    Inspect(input, options = {})
    {
        return inspectWithValues(input, this.GetValues(options));
    }

    /**
     * Report whether soundbank input and requested output variants are supported.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input Soundbank bytes.
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
     * One-shot soundbank read.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input Soundbank bytes.
     * @param {object} [options] Read options.
     * @returns {object} GPU-free raw/debug/media payload for the selected emit target.
     */
    static read(input, options = {})
    {
        return readWithValues(input, normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME));
    }

    /**
     * One-shot asynchronous soundbank read.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input Soundbank bytes.
     * @param {object} [options] Read options.
     * @returns {Promise<object>} GPU-free raw/debug/media payload for the selected emit target.
     */
    static async readAsync(input, options = {})
    {
        return CjsBnkFormat.read(input, options);
    }

    /**
     * One-shot soundbank inspection.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input Soundbank bytes.
     * @param {object} [options] Inspect options.
     * @returns {object} Soundbank metadata.
     */
    static inspect(input, options = {})
    {
        return inspectWithValues(input, normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME));
    }

    /**
     * One-shot soundbank support probe.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input Soundbank bytes.
     * @param {object} [options] Probe options.
     * @returns {object} Support/probe report.
     */
    static isSupported(input, options = {})
    {
        return isSupportedWithValues(input, normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME));
    }

    /**
     * Extract embedded media payloads as views over the soundbank bytes.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input Soundbank bytes.
     * @param {number} [mediaId] Optional single media id filter.
     * @returns {Array<object>} Extracted media items with undecoded bytes.
     */
    static extractMedia(input, mediaId)
    {
        const bytes = toBytes(input);
        const metadata = inspectWithValues(bytes, DEFAULT_VALUES);
        return extractMedia(bytes, metadata, mediaId);
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
     * Test whether input looks like a Wwise SoundbanksInfo document.
     *
     * @param {Uint8Array|ArrayBuffer|DataView|string|object} input Candidate document.
     * @returns {boolean} True when a SoundBanksInfo bank list is present.
     */
    static isSoundbanksInfo(input)
    {
        return isSoundbanksInfo(input);
    }

    /**
     * Parse a SoundbanksInfo document into a normalized summary.
     *
     * @param {Uint8Array|ArrayBuffer|DataView|string|object} input SoundbanksInfo JSON bytes, text, or object.
     * @returns {object} Normalized document summary with per-bank details.
     */
    static parseSoundbanksInfo(input)
    {
        return parseSoundbanksInfo(input);
    }

    /**
     * Build id-keyed lookup tables from a SoundbanksInfo document.
     *
     * @param {Uint8Array|ArrayBuffer|DataView|string|object} input SoundbanksInfo JSON bytes, text, or object.
     * @returns {object} Catalog with banksById, mediaById, eventsById, and eventsByName.
     */
    static buildSoundbanksCatalog(input)
    {
        return buildSoundbanksCatalog(input);
    }

    /**
     * Join a bank inspection result with a SoundbanksInfo catalog.
     *
     * @param {object} bankInfo Inspect output for a soundbank.
     * @param {object} catalog `buildSoundbanksCatalog` output.
     * @returns {object} Bank/media/event annotations for the inspected bank.
     */
    static joinSoundbanksInfo(bankInfo, catalog)
    {
        return joinSoundbanksInfo(bankInfo, catalog);
    }

    /**
     * Compute the Wwise 32-bit id for a bank, event, switch, or language name.
     *
     * @param {string} name Wwise object name.
     * @returns {number} Unsigned 32-bit Wwise id (FNV-1 of the lowercased name).
     */
    static wwiseIdFromName(name)
    {
        return wwiseIdFromName(name);
    }

    /**
     * Test whether bytes look like a Wwise soundbank.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input Candidate soundbank bytes.
     * @returns {boolean} True when the BKHD header chunk is present.
     */
    static isBNK(input)
    {
        try
        {
            return isBNK(toBytes(input));
        }
        catch
        {
            return false;
        }
    }

    static OUTPUT_RAW = OUTPUT_RAW;
    static OUTPUT_JSON = OUTPUT_JSON;
    static OUTPUT_BNK_JSON = OUTPUT_BNK_JSON;
    static OUTPUT_MEDIA = OUTPUT_MEDIA;
    static HIRC_TYPE_NAMES = HIRC_TYPE_NAMES;
    static type = Object.freeze([ "audio" ]);
    static mediaTypes = Object.freeze([ "audio" ]);
    static inputTypes = Object.freeze([ "bnk" ]);
    static outputTypes = Object.freeze([ OUTPUT_RAW, OUTPUT_MEDIA ]);
    static debugOutputTypes = Object.freeze([ OUTPUT_BNK_JSON, OUTPUT_RAW ]);
}

export default CjsBnkFormat;
