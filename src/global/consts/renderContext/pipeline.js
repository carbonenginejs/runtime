// Source: trinity/trinityal/Tr2RenderContextEnum.h (Topology, ShaderType)
//
// The two vocabularies the AL's binding verbs speak. `SetTopology` takes a
// `Topology` and `SetConstants` takes a `ShaderType`, so both belong beside the
// other render-context enums rather than inside any one backend.

/**
 * Primitive topology, as the AL names it.
 *
 * NOT the same numbering as `D3dPrimitiveTopology`. Carbon's own
 * `Tr2RenderBatch::m_topology` holds one of THESE values and
 * `Tr2RenderContext.cpp:86` hands it straight to `SetTopology`, so the AL is
 * the vocabulary a batch should be carrying.
 */
export const Topology = Object.freeze({
    TOP_INVALID: 0,
    TOP_TRIANGLES: 1,
    TOP_TRIANGLE_STRIP: 2,
    /** Invalid on DX11, and Carbon's header says so. Carried for completeness. */
    TOP_TRIANGLE_FAN: 3,
    TOP_LINES: 4,
    TOP_LINE_STRIP: 5,
    TOP_POINTS: 6,
    /** The exclusive upper bound the stub validates against (`cpp:113-118`). */
    TOP_MAX_TOPOLOGY: 7
});

/**
 * Shader stages, in Carbon's order.
 *
 * `VERTEX_SHADER` is 0 and `PIXEL_SHADER` is 1, which is why `Tr2Renderer` can
 * treat the pixel stage as the one exception when picking a per-object
 * register.
 */
export const ShaderType = Object.freeze({
    VERTEX_SHADER: 0,
    PIXEL_SHADER: 1,
    COMPUTE_SHADER: 2,
    GEOMETRY_SHADER: 3,
    HULL_SHADER: 4,
    DOMAIN_SHADER: 5,
    INVALID_SHADER: 6,
    SHADER_TYPE_FIRST: 0,
    /** Carbon's `SHADER_TYPE_COUNT`, which aliases `INVALID_SHADER`. */
    SHADER_TYPE_COUNT: 6
});
