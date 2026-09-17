/**
 * Recognises Carbon's Detail-map resource family from reflection alone.
 *
 * Both backends merge `Detail1Map`/`Detail2Map`/`Detail3Map` into a single
 * array texture, and both need to agree exactly on *which* registers take part.
 * That decision is about the resources, not about the shading language, so it
 * lives here rather than twice in the two emitters.
 *
 * What this module does **not** do is prove the merge is safe. Recognising the
 * family is necessary but not sufficient: a backend must also confirm that every
 * use of those registers is a plain sample it can redirect at an array layer. A
 * detail map fetched by integer coordinate, or queried for its size, cannot be
 * merged, and only the code walking the shader can see that. So each backend
 * pairs this recogniser with its own use check and fails closed on anything it
 * does not understand.
 *
 * The WebGL 2 motivation is a hard limit rather than tidiness: the affected
 * shaders sit at exactly 16 textures against a 16-unit guarantee, so merging
 * three maps into one is what creates the headroom lighting needs. See
 * the WebGL2 sampler-unit limit of 16.
 */

import {
    TEXTURE_ARRAY_FAMILIES,
    recogniseTextureArrayFamily,
    textureArrayTransformFor
} from "./textureArrayFamilies.js";

/**
 * The detail family's own row of the table.
 *
 * This module predates the table and is the documented entry point for the
 * detail maps specifically - the contract, the WebGPU plan builder and the
 * container's transform family all name it. It now delegates rather than
 * carrying a second copy of the rules, because two implementations of
 * "which registers take part" is exactly the drift the recogniser exists to
 * prevent.
 */
const DETAIL_DEFINITION = TEXTURE_ARRAY_FAMILIES
    .find((definition) => definition.family === "detail-map-array");

/** The merged array's name, and the transform family it belongs to. */
export const DETAIL_MAP_ARRAY_NAME = DETAIL_DEFINITION.outputName;
export const DETAIL_MAP_ARRAY_FAMILY = DETAIL_DEFINITION.family;

/**
 * Recognises the detail-map family in one stage's reflected resources.
 *
 * @param {Array<object>} resources Reflected resources.
 * @param {object} [options] Recognition options.
 * @returns {object|null} Frozen plan, or null when the family is absent or unusable.
 */
export function recogniseDetailMapFamily(resources, options = {})
{
    return recogniseTextureArrayFamily(DETAIL_DEFINITION, resources, options);
}

/**
 * Builds the transform record the container's shared transform section stores.
 *
 * @param {object} plan Recognised family plan.
 * @param {string} layoutKey Enclosing pass key.
 * @returns {object} Transform record.
 */
export function detailMapTransformFor(plan, layoutKey)
{
    return textureArrayTransformFor(plan, layoutKey);
}

export default recogniseDetailMapFamily;
