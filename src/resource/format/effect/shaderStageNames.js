/** Display names indexed by Carbon's six shader-stage enum values. */
export const shaderStageNames = [
    "vertex",
    "pixel",
    "compute",
    "geometry",
    "hull",
    "domain"
];

/** Display names indexed by Carbon's pipeline-input usage code. */
export const shaderUsageNames = [
    "POSITION",
    "COLOR",
    "NORMAL",
    "TANGENT",
    "BITANGENT",
    "TEXCOORD",
    "BLENDINDICES",
    "BLENDWEIGHTS"
];

/**
 * Name a Carbon stage without conflating compute and geometry.
 * @param {number} stageType Stage enum value.
 * @returns {string} Display name, or unknown.
 */
export function shaderStageName(stageType)
{
    return shaderStageNames[stageType] || "unknown";
}
