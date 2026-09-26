/**
 * Bound-view formats of the typed buffers and typed UAV textures Carbon's
 * renderer creates and binds by effect parameter name.
 *
 * A DXBC typed resource or UAV declaration records only the component class a
 * load returns, never the DXGI format the C++ binds, and Carbon's container
 * keeps no more (`Tr2EffectResource`: name, type, array size, sRGB and
 * auto-register flags; shipped DXBC carries no RDEF). So the format comes from
 * where Carbon creates the resource. It is a fact about Carbon's resources, not
 * about a shading language, so both translators read it from here, as they read
 * the Detail-map family from `detailMapFamily.js`:
 *
 * - `Exposure` (and `ExposureBuffer` on the exposure-to-texture pass) is
 *   `Tr2PostProcessRenderer::GetExposureBuffer`, a `Tr2BufferDescriptionAL` of
 *   `PIXEL_FORMAT_R32_FLOAT` with 8 elements, SRV and UAV
 *   (trinity/PostProcess/Tr2PostProcessRenderer.cpp:1700-1705). It is bound
 *   under those names at :794 (tonemapping), :972 (bloom high-pass), :1028
 *   (bloom downsample), :1238 (measure exposure, as a UAV), :1262 (exposure
 *   debug), :1318 (exposure to texture), :1516 (TAA) and :1526 (TAA copy).
 * - `Histogram` is `RenderDynamicExposure`'s 65-element `PIXEL_FORMAT_R32_UINT`
 *   buffer (Tr2PostProcessRenderer.cpp:1196-1198, returned at :1240), read by
 *   tonemapping (:795) and the exposure debug view (:1263).
 * - `FlareOcclusionBuffer` is `Tr2OcclusionBuffer`'s `PIXEL_FORMAT_R32_UINT`
 *   buffer, registered as a global variable under that name
 *   (Eve/EveOccluder.cpp:21, created at :110).
 * - `CooldownMap` is the "TAA Cooldown" texture, `PIXEL_FORMAT_R32_UINT` with
 *   UAV and SRV usage (Tr2PostProcessRenderer.cpp:1463-1469), bound to the TAA
 *   effect at :1514; the medium and high quality tiers read and write it from
 *   the pixel stage.
 *
 * A name missing here leaves the format unknown, and each backend decides what
 * that means. A backend must also reject a declaration whose component class
 * disagrees with the format, so a different effect reusing a name cannot be
 * read with the wrong element type.
 */
export const CARBON_TYPED_VIEWS = Object.freeze({
    Exposure: "R32_FLOAT",
    ExposureBuffer: "R32_FLOAT",
    Histogram: "R32_UINT",
    FlareOcclusionBuffer: "R32_UINT",
    CooldownMap: "R32_UINT"
});

/**
 * The formats named above, in backend-neutral terms: the DXBC component class
 * a declaration of them must carry, the channel count and the element size.
 * D3D11 returns missing channels as 0 and a missing alpha as 1.
 */
export const CARBON_VIEW_FORMATS = Object.freeze({
    R32_FLOAT: Object.freeze({ componentClass: "float", channels: 1, bytesPerElement: 4 }),
    R32_UINT: Object.freeze({ componentClass: "uint", channels: 1, bytesPerElement: 4 })
});

const SEMANTIC_KIND = Object.freeze({
    resource: "sampled-resource",
    uav: "storage-resource"
});

/**
 * The typed-view formats for one stage: D3D identity to view format, from the
 * stage's Carbon parameter names.
 *
 * @param {object[]} semanticBindings The stage's effect-description bindings.
 * @returns {Object<string, string>} `{ "sampled-resource:0:9": "R32_FLOAT" }`
 */
export function typedViewsFor(semanticBindings)
{
    const views = {};
    for (const binding of semanticBindings || [])
    {
        const kind = SEMANTIC_KIND[binding?.kind];
        const name = binding?.metadataName ?? binding?.carbon?.name;
        const format = kind && typeof name === "string" ? CARBON_TYPED_VIEWS[name] : undefined;
        if (!format) continue;
        views[`${kind}:${binding.registerSpace ?? 0}:${binding.registerIndex}`] = format;
    }
    return views;
}
