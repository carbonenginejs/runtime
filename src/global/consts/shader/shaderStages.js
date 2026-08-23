/**
 * Canonical shader stage tokens.
 */
export const ShaderStage = Object.freeze({
    VERTEX: "vertex",
    FRAGMENT: "fragment",
    PIXEL: "pixel",
    COMPUTE: "compute",
    GEOMETRY: "geometry",
    HULL: "hull",
    DOMAIN: "domain"
});

/**
 * Canonical shader model/profile tokens.
 */
export const ShaderModel = Object.freeze({
    UNKNOWN: "unknown",
    SM2: "sm2",
    SM3: "sm3",
    SM4: "sm4",
    SM5: "sm5",
    SM6: "sm6",
    GLSL_ES_300: "glsl-es-300",
    WGSL: "wgsl"
});

/**
 * Normalize a shader stage token.
 *
 * @param {string} stage Shader stage token.
 * @returns {string} Canonical lowercase token.
 */
export function normalizeShaderStage(stage)
{
    return stage ? String(stage).trim().toLowerCase() : "";
}
