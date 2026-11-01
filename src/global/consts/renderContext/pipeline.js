// Source: trinity/trinityal/Tr2RenderContextEnum.h (Topology, ShaderType)
// Source: trinity/trinityal/include/Tr2ShaderAL.h (Tr2ShaderRegisterAL::RegisterType)
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

/**
 * Texture colour space at a shader resource view
 * (`Tr2RenderContextEnum::ColorSpace`, `trinityal/Tr2RenderContextEnum.h:216-221`).
 *
 * PREFIXED, because `ColorSpace` is already taken by `#consts/graphics` and the
 * two are NOT the same vocabulary. That one is a string token describing a
 * decoded image payload (`"display-p3"`, `"rec2020"`); this is the two-value
 * binding decision Carbon's abstraction layer makes when a texture is bound to
 * a register, and the only question it answers is whether the hardware applies
 * the sRGB transfer on read. `Tr2LoadAction` sets the naming precedent.
 */
export const Tr2ColorSpace = Object.freeze({
    COLOR_SPACE_LINEAR: 0,
    COLOR_SPACE_SRGB: 1
});

/**
 * The per-object constant buffers a render context owns
 * (`Tr2RenderContextEnum`, `trinityal/Tr2RenderContextEnum.h:45-50`).
 *
 * One per shader stage, plus a GUI buffer that continues the numbering. Carbon
 * calls them "special case constant buffers added to handle trinity", and the
 * comment on `CBUFFER_COUNT` says what the array is for: "total number of
 * cbuffers passed to SetPerObjectToDevice".
 */
export const ConstantBufferSlot = Object.freeze({
    CBUFFER_GUI: ShaderType.SHADER_TYPE_COUNT,
    CBUFFER_COUNT: ShaderType.SHADER_TYPE_COUNT + 1
});

/**
 * A shader register's kind and, for a view, its dimension: Carbon's
 * `Tr2ShaderRegisterAL::RegisterType` (`trinityal/include/Tr2ShaderAL.h:56-87`).
 * Shader-resource views carry bit 5 (`SRV_REGISTER_FLAG`) and unordered-access
 * views bit 6 (`UAV_REGISTER_FLAG`). Carbon's shader compiler declares the same
 * values as its own `RegisterInputType` (`shadercompiler/EffectData.h:88-116`),
 * and an effect's register signature stores them.
 */
export const RegisterType = Object.freeze({
    CONSTANT_BUFFER: 0,
    SAMPLER: 1,

    SRV_BUFFER: 1 << 5,
    SRV_STRUCTURED_BUFFER: (1 << 5) + 1,
    SRV_TEXTURE1D: (1 << 5) + 2,
    SRV_TEXTURE1DARRAY: (1 << 5) + 3,
    SRV_TEXTURE2D: (1 << 5) + 4,
    SRV_TEXTURE2DARRAY: (1 << 5) + 5,
    SRV_TEXTURE2DMS: (1 << 5) + 6,
    SRV_TEXTURE2DMSARRAY: (1 << 5) + 7,
    SRV_TEXTURE3D: (1 << 5) + 8,
    SRV_TEXTURECUBE: (1 << 5) + 9,
    SRV_TEXTURECUBEARRAY: (1 << 5) + 10,

    UAV_BUFFER: 1 << 6,
    UAV_STRUCTURED_BUFFER: (1 << 6) + 1,
    UAV_TEXTURE1D: (1 << 6) + 2,
    UAV_TEXTURE1DARRAY: (1 << 6) + 3,
    UAV_TEXTURE2D: (1 << 6) + 4,
    UAV_TEXTURE2DARRAY: (1 << 6) + 5,
    UAV_TEXTURE2DMS: (1 << 6) + 6,
    UAV_TEXTURE2DMSARRAY: (1 << 6) + 7,
    UAV_TEXTURE3D: (1 << 6) + 8,
    UAV_TEXTURECUBE: (1 << 6) + 9,
    UAV_TEXTURECUBEARRAY: (1 << 6) + 10
});

/**
 * Ours, not Carbon's: the depth-of-field layer pass a draw belongs to, set on
 * the render context with `SetDepthOfFieldLayerPass` and applied after the
 * authored render states (after ccpwgl 89973207; the register's "Separated
 * depth-of-field layers" entry).
 *
 * - `NONE`: the authored states.
 * - `LAYER_MASK`: RGB multiplied by one minus the shader's alpha (ZERO /
 *   INVSRCALPHA), so a target cleared to white ends as the layer's
 *   transmittance. Carbon's bokeh does not carry alpha through, so the
 *   transparent layer's coverage is blurred as colour, as ccpwgl blurs a mask.
 * - `COVERAGE_DEPTH`: depth write on, colour writes and blend off; with a
 *   coverage-discard mode, the nearest visible surface's depth.
 * - `COMPOSITE_MULTIPLY`: the target's RGB times the source's (ZERO / SRC),
 *   applying a blurred transmittance.
 * - `COMPOSITE_ADD`: the source's RGB added (ONE / ONE): a premultiplied
 *   transparent layer after its transmittance, or an additive layer.
 */
export const CjsDofLayerPass = Object.freeze({
    NONE: 0,
    LAYER_MASK: 1,
    COVERAGE_DEPTH: 2,
    COMPOSITE_MULTIPLY: 3,
    COMPOSITE_ADD: 4
});
