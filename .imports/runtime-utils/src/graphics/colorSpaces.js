/**
 * Canonical color space tokens for decoded image/texture payloads.
 */
export const ColorSpace = Object.freeze({
    UNKNOWN: "unknown",
    LINEAR: "linear",
    SRGB: "srgb",
    DISPLAY_P3: "display-p3",
    REC709: "rec709",
    REC2020: "rec2020"
});

/**
 * Normalize a color space token.
 *
 * @param {string} colorSpace Color space token.
 * @returns {string} Canonical lowercase token or unknown.
 */
export function normalizeColorSpace(colorSpace)
{
    return colorSpace ? String(colorSpace).trim().toLowerCase() : ColorSpace.UNKNOWN;
}
