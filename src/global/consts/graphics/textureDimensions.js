/**
 * Canonical texture dimension tokens.
 */
export const TextureDimension = Object.freeze({
    D1: "1d",
    D2: "2d",
    D3: "3d",
    CUBE: "cube",
    D2_ARRAY: "2d-array",
    CUBE_ARRAY: "cube-array"
});

/**
 * Normalize a texture dimension token.
 *
 * @param {string} dimension Texture dimension token.
 * @returns {string} Canonical lowercase token.
 */
export function normalizeTextureDimension(dimension)
{
    return dimension ? String(dimension).trim().toLowerCase() : "";
}
