import { CARBON_VIEW_FORMATS } from "../../../hlsl/core/carbonTypedViews.js";

/**
 * What each Carbon view format (`hlsl/core/carbonTypedViews.js`) means to WGSL:
 * the storage element, the WebGPU storage-texture format, and the
 * four-component value D3D11 returns for an in-bounds element (missing
 * channels 0, alpha 1). Both are single-channel 32-bit formats, which WebGPU
 * allows as read-write storage textures.
 *
 * A uint view applies to render stages only: compute already reads uint
 * buffers as raw words and writes uint UAVs atomically, in the audited
 * histogram profiles among others, and those layouts stay as they are.
 */
export const TYPED_VIEW_FORMATS = Object.freeze({
    R32_FLOAT: Object.freeze({
        returnType: CARBON_VIEW_FORMATS.R32_FLOAT.componentClass,
        element: "f32",
        storageTextureFormat: "r32float",
        renderStagesOnly: false,
        expand: (value) => `vec4<f32>(${value}, 0.0, 0.0, 1.0)`
    }),
    R32_UINT: Object.freeze({
        returnType: CARBON_VIEW_FORMATS.R32_UINT.componentClass,
        element: "u32",
        storageTextureFormat: "r32uint",
        renderStagesOnly: true,
        expand: (value) => `vec4<u32>(${value}, 0u, 0u, 1u)`
    })
});

const SCALAR_EXPANSION = Object.freeze({
    f32: (value) => `vec4<f32>(${value}, 0.0, 0.0, 1.0)`,
    u32: (value) => `vec4<u32>(${value}, 0u, 0u, 1u)`,
    i32: (value) => `vec4<i32>(${value}, 0i, 0i, 1i)`
});

/**
 * A typed-buffer `ld` from a storage array of `element`, zero out of bounds.
 *
 * D3D's `ld` always returns four components, so a scalar element (a
 * single-channel buffer, such as the R32_UINT histogram a compute program
 * reads) widens as a single-channel format does - missing channels 0, alpha 1
 * - and the instruction's swizzle then applies to a vector, as it must.
 * Without the widening a `.x` landed on a scalar: "cannot index into
 * expression of type 'u32'". A vector element is returned as it is.
 *
 * @param {string} element The array's element type, e.g. `u32` or `vec4<f32>`.
 * @param {string} symbol The storage array's name.
 * @param {string} address The element index expression.
 * @param {string} length The array-length expression.
 * @returns {string} A four-component WGSL expression.
 */
export function typedBufferLoad(element, symbol, address, length)
{
    const expand = SCALAR_EXPANSION[element];
    const clamped = `${symbol}[min(${address}, ${length} - 1u)]`;

    return expand
        ? `select(vec4<${element}>(), ${expand(clamped)}, ${address} < ${length})`
        : `select(${element}(), ${clamped}, ${address} < ${length})`;
}
