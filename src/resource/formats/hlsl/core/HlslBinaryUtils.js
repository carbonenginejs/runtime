import { float32FromBits } from "#utils/bytes";

/**
 * Reinterprets a little-endian uint32 annotation payload as a float32.
 *
 * Retained as the HLSL-facing spelling; the reinterpretation itself is shared
 * with the render-state block, which needs the same conversion.
 *
 * @param {number} value Unsigned 32-bit integer containing float bits.
 * @returns {number} Float value represented by the same bits.
 */
export function cjsUint32ToFloat32(value)
{
    return float32FromBits(value);
}
