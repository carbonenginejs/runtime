/**
 * Render-context enum values mirrored from Carbon's Trinity renderer.
 */
export const HlslRenderContextEnum = Object.freeze({
    VERTEX_SHADER: 0,
    PIXEL_SHADER: 1,
    COMPUTE_SHADER: 2,
    GEOMETRY_SHADER: 3,
    HULL_SHADER: 4,
    DOMAIN_SHADER: 5,
    INVALID_SHADER: 6,
    SHADER_TYPE_COUNT: 6,
    CBUFFER_GUI: 6,
    CBUFFER_COUNT: 7,

    TEX_TYPE_1D: 1,
    TEX_TYPE_2D: 2,
    TEX_TYPE_3D: 3,
    TEX_TYPE_CUBE: 4,
    TEX_TYPE_TYPELESS: 5
});

/**
 * Human-readable shader stage names indexed by `HlslRenderContextEnum` stage ids.
 */
export const HlslShaderStageNames = Object.freeze([
    "vertex",
    "pixel",
    "compute",
    "geometry",
    "hull",
    "domain"
]);

/**
 * Human-readable vertex usage names indexed by Carbon usage ids.
 */
export const HlslUsageCodeNames = Object.freeze([
    "POSITION",
    "COLOR",
    "NORMAL",
    "TANGENT",
    "BITANGENT",
    "TEXCOORD",
    "BLENDINDICES",
    "BLENDWEIGHTS"
]);

/**
 * Converts a Trinity shader stage id into a stable display name.
 *
 * @param {number} stageType Trinity shader stage enum value.
 * @returns {string} Stage name or `"unknown"`.
 */
export function hlslShaderStageName(stageType)
{
    return HlslShaderStageNames[stageType] || "unknown";
}
