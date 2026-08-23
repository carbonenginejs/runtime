/**
 * Small DXGI_FORMAT numeric mirror for formats currently needed by readers.
 *
 * Values match the public DXGI_FORMAT enum.
 */
export const DxgiFormat = Object.freeze({
    UNKNOWN: 0,
    R32G32B32A32_FLOAT: 2,
    R32G32_FLOAT: 16,
    R32_FLOAT: 41,
    R16G16B16A16_FLOAT: 10,
    R8G8_UNORM: 49,
    R8G8B8A8_UNORM: 28,
    R8G8B8A8_UNORM_SRGB: 29,
    R16_FLOAT: 54,
    R8_UNORM: 61,
    BC1_UNORM: 71,
    BC1_UNORM_SRGB: 72,
    BC2_UNORM: 74,
    BC2_UNORM_SRGB: 75,
    BC3_UNORM: 77,
    BC3_UNORM_SRGB: 78,
    BC4_UNORM: 80,
    BC4_SNORM: 81,
    BC5_UNORM: 83,
    BC5_SNORM: 84,
    B8G8R8A8_UNORM: 87,
    B8G8R8X8_UNORM: 88,
    B8G8R8A8_UNORM_SRGB: 91,
    B8G8R8X8_UNORM_SRGB: 93,
    BC6H_UF16: 95,
    BC6H_SF16: 96,
    BC7_UNORM: 98,
    BC7_UNORM_SRGB: 99
});

/**
 * Normalize a DXGI numeric value.
 *
 * @param {number} value Candidate DXGI value.
 * @returns {number} Integer DXGI value or UNKNOWN.
 */
export function normalizeDxgiFormat(value)
{
    return Number.isInteger(value) ? value : DxgiFormat.UNKNOWN;
}
