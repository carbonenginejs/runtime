/**
 * Canonical GPU-free pixel format names used by decoded images and textures.
 */
export const PixelFormat = Object.freeze({
    UNKNOWN: "unknown",

    R8_UNORM: "r8unorm",
    RG8_UNORM: "rg8unorm",
    RGB8_UNORM: "rgb8unorm",
    RGBA8_UNORM: "rgba8unorm",
    BGRA8_UNORM: "bgra8unorm",
    BGRX8_UNORM: "bgrx8unorm",
    RGBA8_UNORM_SRGB: "rgba8unorm-srgb",
    BGRA8_UNORM_SRGB: "bgra8unorm-srgb",
    BGRX8_UNORM_SRGB: "bgrx8unorm-srgb",

    R16_UINT: "r16uint",
    R16_FLOAT: "r16float",
    RG16_FLOAT: "rg16float",
    RGBA16_FLOAT: "rgba16float",

    R32_UINT: "r32uint",
    R32_FLOAT: "r32float",
    RG32_FLOAT: "rg32float",
    RGBA32_FLOAT: "rgba32float",

    BC1_RGBA_UNORM: "bc1-rgba-unorm",
    BC1_RGBA_UNORM_SRGB: "bc1-rgba-unorm-srgb",
    BC2_RGBA_UNORM: "bc2-rgba-unorm",
    BC2_RGBA_UNORM_SRGB: "bc2-rgba-unorm-srgb",
    BC3_RGBA_UNORM: "bc3-rgba-unorm",
    BC3_RGBA_UNORM_SRGB: "bc3-rgba-unorm-srgb",
    BC4_R_UNORM: "bc4-r-unorm",
    BC4_R_SNORM: "bc4-r-snorm",
    BC5_RG_UNORM: "bc5-rg-unorm",
    BC5_RG_SNORM: "bc5-rg-snorm",
    BC6H_RGB_UFLOAT: "bc6h-rgb-ufloat",
    BC6H_RGB_FLOAT: "bc6h-rgb-float",
    BC7_RGBA_UNORM: "bc7-rgba-unorm",
    BC7_RGBA_UNORM_SRGB: "bc7-rgba-unorm-srgb"
});

const COMPRESSED_FORMATS = new Set([
    PixelFormat.BC1_RGBA_UNORM,
    PixelFormat.BC1_RGBA_UNORM_SRGB,
    PixelFormat.BC2_RGBA_UNORM,
    PixelFormat.BC2_RGBA_UNORM_SRGB,
    PixelFormat.BC3_RGBA_UNORM,
    PixelFormat.BC3_RGBA_UNORM_SRGB,
    PixelFormat.BC4_R_UNORM,
    PixelFormat.BC4_R_SNORM,
    PixelFormat.BC5_RG_UNORM,
    PixelFormat.BC5_RG_SNORM,
    PixelFormat.BC6H_RGB_UFLOAT,
    PixelFormat.BC6H_RGB_FLOAT,
    PixelFormat.BC7_RGBA_UNORM,
    PixelFormat.BC7_RGBA_UNORM_SRGB
]);

const BYTES_PER_BLOCK = Object.freeze({
    [PixelFormat.R8_UNORM]: 1,
    [PixelFormat.RG8_UNORM]: 2,
    [PixelFormat.RGB8_UNORM]: 3,
    [PixelFormat.RGBA8_UNORM]: 4,
    [PixelFormat.BGRA8_UNORM]: 4,
    [PixelFormat.BGRX8_UNORM]: 4,
    [PixelFormat.RGBA8_UNORM_SRGB]: 4,
    [PixelFormat.BGRA8_UNORM_SRGB]: 4,
    [PixelFormat.BGRX8_UNORM_SRGB]: 4,
    [PixelFormat.R16_UINT]: 2,
    [PixelFormat.R16_FLOAT]: 2,
    [PixelFormat.RG16_FLOAT]: 4,
    [PixelFormat.RGBA16_FLOAT]: 8,
    [PixelFormat.R32_UINT]: 4,
    [PixelFormat.R32_FLOAT]: 4,
    [PixelFormat.RG32_FLOAT]: 8,
    [PixelFormat.RGBA32_FLOAT]: 16,
    [PixelFormat.BC1_RGBA_UNORM]: 8,
    [PixelFormat.BC1_RGBA_UNORM_SRGB]: 8,
    [PixelFormat.BC2_RGBA_UNORM]: 16,
    [PixelFormat.BC2_RGBA_UNORM_SRGB]: 16,
    [PixelFormat.BC3_RGBA_UNORM]: 16,
    [PixelFormat.BC3_RGBA_UNORM_SRGB]: 16,
    [PixelFormat.BC4_R_UNORM]: 8,
    [PixelFormat.BC4_R_SNORM]: 8,
    [PixelFormat.BC5_RG_UNORM]: 16,
    [PixelFormat.BC5_RG_SNORM]: 16,
    [PixelFormat.BC6H_RGB_UFLOAT]: 16,
    [PixelFormat.BC6H_RGB_FLOAT]: 16,
    [PixelFormat.BC7_RGBA_UNORM]: 16,
    [PixelFormat.BC7_RGBA_UNORM_SRGB]: 16
});

/**
 * Normalize a pixel format token.
 *
 * @param {string} format Pixel format token.
 * @returns {string} Canonical lowercase token or empty string.
 */
export function normalizePixelFormat(format)
{
    return format ? String(format).trim().toLowerCase() : "";
}

/**
 * Test whether a pixel format is block compressed.
 *
 * @param {string} format Pixel format token.
 * @returns {boolean} True when the format is compressed.
 */
export function isCompressedPixelFormat(format)
{
    return COMPRESSED_FORMATS.has(normalizePixelFormat(format));
}

/**
 * Test whether a pixel format is marked as sRGB.
 *
 * @param {string} format Pixel format token.
 * @returns {boolean} True when the token ends with -srgb.
 */
export function isSrgbPixelFormat(format)
{
    return normalizePixelFormat(format).endsWith("-srgb");
}

/**
 * Get bytes per texel or compressed block for a pixel format.
 *
 * @param {string} format Pixel format token.
 * @returns {number} Bytes per texel/block, or 0 when unknown.
 */
export function getPixelFormatBytesPerBlock(format)
{
    return BYTES_PER_BLOCK[normalizePixelFormat(format)] || 0;
}

/**
 * Get the block width for a pixel format.
 *
 * @param {string} format Pixel format token.
 * @returns {number} Block width in texels.
 */
export function getPixelFormatBlockWidth(format)
{
    return isCompressedPixelFormat(format) ? 4 : 1;
}

/**
 * Get the block height for a pixel format.
 *
 * @param {string} format Pixel format token.
 * @returns {number} Block height in texels.
 */
export function getPixelFormatBlockHeight(format)
{
    return isCompressedPixelFormat(format) ? 4 : 1;
}
