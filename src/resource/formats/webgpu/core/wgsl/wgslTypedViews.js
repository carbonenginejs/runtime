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
