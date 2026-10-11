/**
 * Opt-in PCM decoders for Wwise codecs the wem reader does not ship.
 *
 * The reader always recognizes a codec by its `fmt ` tag, but decoding some
 * codecs needs material this package does not distribute (PTADPCM's step
 * table, for one). A host that has such a decoder registers it here by codec
 * name; until then the codec reports PCM output as unsupported and
 * `CjsWemFormat.toPcm` throws `CJS_FORMAT_OUTPUT_NOT_SUPPORTED`.
 *
 * The registry is per JavaScript realm: a decoder registered on the main
 * thread is not visible to a resource-manager worker.
 */

/**
 * @typedef {object} CjsWemPcmDecoder
 * @property {(bytes: Uint8Array, metadata: object) => object} decode Decodes
 *   the wem's data chunk to `{ channelData, sampleCount, sampleRate, channels }`.
 */

const decoders = new Map();

/**
 * Register a PCM decoder for one wem codec, replacing any earlier one.
 *
 * @param {string} codec Codec name as reported by `inspect`, e.g. "wwise-ptadpcm".
 * @param {CjsWemPcmDecoder} decoder Decoder implementation.
 * @returns {void}
 */
export function registerPcmDecoder(codec, decoder)
{
    if (typeof codec !== "string" || !codec)
    {
        throw new TypeError("wem: PCM decoder codec must be a non-empty string");
    }
    if (typeof decoder?.decode !== "function")
    {
        throw new TypeError(`wem: PCM decoder for ${codec} must have a decode function`);
    }
    decoders.set(codec, decoder);
}

/**
 * Remove the PCM decoder registered for one wem codec.
 *
 * @param {string} codec Codec name.
 * @returns {boolean} True when a decoder was removed.
 */
export function unregisterPcmDecoder(codec)
{
    return decoders.delete(codec);
}

/**
 * Look up the PCM decoder registered for one wem codec.
 *
 * @param {string} codec Codec name.
 * @returns {CjsWemPcmDecoder|null} The decoder, or null when none is registered.
 */
export function getPcmDecoder(codec)
{
    return decoders.get(codec) ?? null;
}
