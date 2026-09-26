/**
 * Bound-view formats of the typed buffers Carbon's renderer creates and binds
 * by effect parameter name.
 *
 * A DXBC `dcl_resource`/`dcl_uav_typed` of dimension `buffer` records only the
 * component class `ld` returns, never the DXGI view the C++ binds, so the
 * format cannot come from the shader. It comes from where Carbon creates the
 * buffer:
 *
 * - `Exposure` (and `ExposureBuffer` on the exposure-to-texture pass) is
 *   `Tr2PostProcessRenderer::GetExposureBuffer`, a `Tr2BufferDescriptionAL` of
 *   `PIXEL_FORMAT_R32_FLOAT` with 8 elements, SRV and UAV
 *   (trinity/PostProcess/Tr2PostProcessRenderer.cpp:1700-1705). It is bound
 *   under those names at :794 (tonemapping), :972 (bloom high-pass), :1028
 *   (bloom downsample), :1238 (measure exposure, as a UAV), :1262 (exposure
 *   debug), :1318 (exposure to texture), :1516 (TAA) and :1526 (TAA copy).
 *
 * - `Histogram` is `RenderDynamicExposure`'s 65-element `PIXEL_FORMAT_R32_UINT`
 *   buffer (Tr2PostProcessRenderer.cpp:1196-1198, returned at :1240), read by
 *   tonemapping (:795) and the exposure debug view (:1263).
 * - `FlareOcclusionBuffer` is `Tr2OcclusionBuffer`'s `PIXEL_FORMAT_R32_UINT`
 *   buffer, registered as a global variable under that name
 *   (Eve/EveOccluder.cpp:21, created at :110).
 *
 * A uint view applies to render stages only: compute already reads uint
 * buffers as raw words and writes uint UAVs atomically, in the audited
 * histogram profiles among others, and those layouts stay as they are.
 *
 * A name missing here keeps the typed buffer fail-closed. A name found here
 * whose declaration disagrees with the format's component class is rejected
 * by `lowerBindingLayout`, so a different effect reusing the name cannot be
 * read with the wrong element type.
 */
export const CARBON_TYPED_BUFFER_VIEWS = Object.freeze({
    Exposure: "R32_FLOAT",
    ExposureBuffer: "R32_FLOAT",
    Histogram: "R32_UINT",
    FlareOcclusionBuffer: "R32_UINT"
});

/**
 * What each supported view format means to WGSL: the storage element, the
 * DXBC component class it must be declared with, and the four-component value
 * D3D11 returns for an in-bounds element (missing channels read 0, alpha 1).
 */
export const TYPED_BUFFER_VIEW_FORMATS = Object.freeze({
    R32_FLOAT: Object.freeze({
        element: "f32",
        returnType: "float",
        renderStagesOnly: false,
        expand: (value) => `vec4<f32>(${value}, 0.0, 0.0, 1.0)`
    }),
    R32_UINT: Object.freeze({
        element: "u32",
        returnType: "uint",
        renderStagesOnly: true,
        expand: (value) => `vec4<u32>(${value}, 0u, 0u, 1u)`
    })
});

const SEMANTIC_KIND = Object.freeze({
    resource: "sampled-resource",
    uav: "storage-resource"
});

/**
 * The typed-buffer view policy for one stage: D3D identity to view format,
 * from the stage's Carbon parameter names.
 *
 * @param {object[]} semanticBindings The stage's effect-description bindings.
 * @returns {Object<string, string>} `{ "sampled-resource:0:9": "R32_FLOAT" }`
 */
export function typedBufferViewsFor(semanticBindings)
{
    const views = {};
    for (const binding of semanticBindings || [])
    {
        const kind = SEMANTIC_KIND[binding?.kind];
        const name = binding?.metadataName ?? binding?.carbon?.name;
        const format = kind && typeof name === "string" ? CARBON_TYPED_BUFFER_VIEWS[name] : undefined;
        if (!format) continue;
        views[`${kind}:${binding.registerSpace ?? 0}:${binding.registerIndex}`] = format;
    }
    return views;
}
