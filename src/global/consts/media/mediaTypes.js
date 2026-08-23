/**
 * Canonical high-level media families used by format metadata and resources.
 */
export const MediaType = Object.freeze({
    AUDIO: "audio",
    DATA: "data",
    GEOMETRY: "geometry",
    IMAGE: "image",
    SCHEMA: "schema",
    SHADER: "shader",
    TEXTURE: "texture",
    VIDEO: "video"
});

/**
 * Canonical semantic payload roles emitted by format readers.
 */
export const PayloadType = Object.freeze({
    AUDIO: "audio",
    DATA: "data",
    GEOMETRY: "geometry",
    IMAGE: "image",
    RAW: "raw",
    SCHEMA: "schema",
    SHADER: "shader",
    TEXTURE: "texture",
    VIDEO: "video"
});

/**
 * Normalize a media type token to lowercase canonical text.
 *
 * @param {string} value Input media type.
 * @returns {string} Normalized media type.
 */
export function normalizeMediaType(value)
{
    return value ? String(value).trim().toLowerCase() : "";
}

/**
 * Normalize a payload type token to lowercase canonical text.
 *
 * @param {string} value Input payload type.
 * @returns {string} Normalized payload type.
 */
export function normalizePayloadType(value)
{
    return value ? String(value).trim().toLowerCase() : "";
}
