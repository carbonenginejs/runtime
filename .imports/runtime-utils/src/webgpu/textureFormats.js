import { PixelFormat } from "../graphics/pixelFormats.js";
import { DxgiFormat } from "../d3d/dxgiFormats.js";

/**
 * WebGPU texture format tokens mirrored as stable strings.
 */
export const GpuTextureFormat = Object.freeze({
    R8_UNORM: "r8unorm",
    RG8_UNORM: "rg8unorm",
    RGBA8_UNORM: "rgba8unorm",
    RGBA8_UNORM_SRGB: "rgba8unorm-srgb",
    BGRA8_UNORM: "bgra8unorm",
    BGRA8_UNORM_SRGB: "bgra8unorm-srgb",
    R16_FLOAT: "r16float",
    RG16_FLOAT: "rg16float",
    RGBA16_FLOAT: "rgba16float",
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

/**
 * Map canonical CarbonEngineJS pixel formats to WebGPU texture format strings.
 */
export const PixelFormatToWebGpu = Object.freeze({
    [PixelFormat.R8_UNORM]: GpuTextureFormat.R8_UNORM,
    [PixelFormat.RG8_UNORM]: GpuTextureFormat.RG8_UNORM,
    [PixelFormat.RGBA8_UNORM]: GpuTextureFormat.RGBA8_UNORM,
    [PixelFormat.RGBA8_UNORM_SRGB]: GpuTextureFormat.RGBA8_UNORM_SRGB,
    [PixelFormat.BGRA8_UNORM]: GpuTextureFormat.BGRA8_UNORM,
    [PixelFormat.BGRA8_UNORM_SRGB]: GpuTextureFormat.BGRA8_UNORM_SRGB,
    [PixelFormat.R16_FLOAT]: GpuTextureFormat.R16_FLOAT,
    [PixelFormat.RG16_FLOAT]: GpuTextureFormat.RG16_FLOAT,
    [PixelFormat.RGBA16_FLOAT]: GpuTextureFormat.RGBA16_FLOAT,
    [PixelFormat.R32_FLOAT]: GpuTextureFormat.R32_FLOAT,
    [PixelFormat.RG32_FLOAT]: GpuTextureFormat.RG32_FLOAT,
    [PixelFormat.RGBA32_FLOAT]: GpuTextureFormat.RGBA32_FLOAT,
    [PixelFormat.BC1_RGBA_UNORM]: GpuTextureFormat.BC1_RGBA_UNORM,
    [PixelFormat.BC1_RGBA_UNORM_SRGB]: GpuTextureFormat.BC1_RGBA_UNORM_SRGB,
    [PixelFormat.BC2_RGBA_UNORM]: GpuTextureFormat.BC2_RGBA_UNORM,
    [PixelFormat.BC2_RGBA_UNORM_SRGB]: GpuTextureFormat.BC2_RGBA_UNORM_SRGB,
    [PixelFormat.BC3_RGBA_UNORM]: GpuTextureFormat.BC3_RGBA_UNORM,
    [PixelFormat.BC3_RGBA_UNORM_SRGB]: GpuTextureFormat.BC3_RGBA_UNORM_SRGB,
    [PixelFormat.BC4_R_UNORM]: GpuTextureFormat.BC4_R_UNORM,
    [PixelFormat.BC4_R_SNORM]: GpuTextureFormat.BC4_R_SNORM,
    [PixelFormat.BC5_RG_UNORM]: GpuTextureFormat.BC5_RG_UNORM,
    [PixelFormat.BC5_RG_SNORM]: GpuTextureFormat.BC5_RG_SNORM,
    [PixelFormat.BC6H_RGB_UFLOAT]: GpuTextureFormat.BC6H_RGB_UFLOAT,
    [PixelFormat.BC6H_RGB_FLOAT]: GpuTextureFormat.BC6H_RGB_FLOAT,
    [PixelFormat.BC7_RGBA_UNORM]: GpuTextureFormat.BC7_RGBA_UNORM,
    [PixelFormat.BC7_RGBA_UNORM_SRGB]: GpuTextureFormat.BC7_RGBA_UNORM_SRGB
});

/**
 * Map selected DXGI formats to canonical CarbonEngineJS pixel formats.
 */
export const DxgiFormatToPixelFormat = Object.freeze({
    [DxgiFormat.R32G32B32A32_FLOAT]: PixelFormat.RGBA32_FLOAT,
    [DxgiFormat.R32G32_FLOAT]: PixelFormat.RG32_FLOAT,
    [DxgiFormat.R32_FLOAT]: PixelFormat.R32_FLOAT,
    [DxgiFormat.R16G16B16A16_FLOAT]: PixelFormat.RGBA16_FLOAT,
    [DxgiFormat.R8G8_UNORM]: PixelFormat.RG8_UNORM,
    [DxgiFormat.R8G8B8A8_UNORM]: PixelFormat.RGBA8_UNORM,
    [DxgiFormat.R8G8B8A8_UNORM_SRGB]: PixelFormat.RGBA8_UNORM_SRGB,
    [DxgiFormat.R16_FLOAT]: PixelFormat.R16_FLOAT,
    [DxgiFormat.R8_UNORM]: PixelFormat.R8_UNORM,
    [DxgiFormat.BC1_UNORM]: PixelFormat.BC1_RGBA_UNORM,
    [DxgiFormat.BC1_UNORM_SRGB]: PixelFormat.BC1_RGBA_UNORM_SRGB,
    [DxgiFormat.BC2_UNORM]: PixelFormat.BC2_RGBA_UNORM,
    [DxgiFormat.BC2_UNORM_SRGB]: PixelFormat.BC2_RGBA_UNORM_SRGB,
    [DxgiFormat.BC3_UNORM]: PixelFormat.BC3_RGBA_UNORM,
    [DxgiFormat.BC3_UNORM_SRGB]: PixelFormat.BC3_RGBA_UNORM_SRGB,
    [DxgiFormat.BC4_UNORM]: PixelFormat.BC4_R_UNORM,
    [DxgiFormat.BC4_SNORM]: PixelFormat.BC4_R_SNORM,
    [DxgiFormat.BC5_UNORM]: PixelFormat.BC5_RG_UNORM,
    [DxgiFormat.BC5_SNORM]: PixelFormat.BC5_RG_SNORM,
    [DxgiFormat.B8G8R8A8_UNORM]: PixelFormat.BGRA8_UNORM,
    [DxgiFormat.B8G8R8X8_UNORM]: PixelFormat.BGRX8_UNORM,
    [DxgiFormat.B8G8R8A8_UNORM_SRGB]: PixelFormat.BGRA8_UNORM_SRGB,
    [DxgiFormat.B8G8R8X8_UNORM_SRGB]: PixelFormat.BGRX8_UNORM_SRGB,
    [DxgiFormat.BC6H_UF16]: PixelFormat.BC6H_RGB_UFLOAT,
    [DxgiFormat.BC6H_SF16]: PixelFormat.BC6H_RGB_FLOAT,
    [DxgiFormat.BC7_UNORM]: PixelFormat.BC7_RGBA_UNORM,
    [DxgiFormat.BC7_UNORM_SRGB]: PixelFormat.BC7_RGBA_UNORM_SRGB
});

/**
 * Convert a pixel format token to a WebGPU texture format token.
 *
 * @param {string} format Pixel format token.
 * @returns {string} WebGPU texture format token or empty string.
 */
export function toWebGpuTextureFormat(format)
{
    return PixelFormatToWebGpu[format] || "";
}

/**
 * Convert a DXGI numeric format to a pixel format token.
 *
 * @param {number} format DXGI_FORMAT numeric value.
 * @returns {string} Pixel format token or unknown.
 */
export function dxgiToPixelFormat(format)
{
    return DxgiFormatToPixelFormat[format] || PixelFormat.UNKNOWN;
}
