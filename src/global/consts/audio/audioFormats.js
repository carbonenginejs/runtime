/**
 * Canonical audio sample format tokens.
 */
export const AudioSampleFormat = Object.freeze({
    UNKNOWN: "unknown",
    U8: "u8",
    S16: "s16",
    S24: "s24",
    S32: "s32",
    F32: "f32",
    F64: "f64"
});

/**
 * Canonical audio channel layout tokens.
 */
export const AudioChannelLayout = Object.freeze({
    UNKNOWN: "unknown",
    MONO: "mono",
    STEREO: "stereo",
    SURROUND_5_1: "5.1",
    SURROUND_7_1: "7.1"
});

/**
 * Normalize an audio sample format token.
 *
 * @param {string} format Audio sample format token.
 * @returns {string} Canonical lowercase token.
 */
export function normalizeAudioSampleFormat(format)
{
    return format ? String(format).trim().toLowerCase() : AudioSampleFormat.UNKNOWN;
}
