// Source: videoplayer/Metadata.h (StreamType)
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

/** Carbon videoplayer/Metadata.h:255-260; one stream mask shared by requests and format outputs. */
export const StreamType = Object.freeze({
    STREAM_AUDIO: 1,
    STREAM_VIDEO: 2,
    STREAM_AUDIO_VIDEO: 3
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
