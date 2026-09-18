/**
 * Recognises the resource families that merge into one array texture.
 *
 * A family is a set of textures a shader samples for the same purpose, which
 * can therefore live as layers of a single array texture and cost one binding
 * instead of one each. Both backends must agree exactly on which registers take
 * part, and that decision is about the resources rather than the shading
 * language, so it lives here.
 *
 * ## Why more than one family
 *
 * The detail maps came first and were, for a while, the only family in the
 * shipped corpus. EVE Frontier's pbr/shipquadmaterial then arrived needing 21
 * texture units against WebGL2's guaranteed 16, with no detail maps at all: it
 * carries four roughness maps, an atlas trio and a dirt pair instead, each read
 * for a single channel. Merging those three families takes it to 15.
 *
 * So the rule is a table rather than a special case. Adding a family is a row
 * here; nothing downstream needs to learn its name.
 *
 * ## What recognition proves, and what it does not
 *
 * It proves the RESOURCES can be merged. It does not prove every USE can be
 * redirected at an array layer, and it cannot see sampler state at all, because
 * the texture and sampler pairing lives in the DXBC operands rather than in
 * reflection. Each backend pairs this with its own walk over the shader and
 * fails closed on anything it cannot redirect.
 */

/**
 * ## Lowering is ordered, and it stops as soon as the program fits
 *
 * A row here does not mean "always merge". The families are tried in table
 * order and only as many as the unit budget requires; a stage that already fits
 * merges nothing and keeps its own samplers. That is cheaper at runtime - every
 * aggregate that is never built is one that never has to be composed - and it
 * is what makes the merge invisible to a consumer, because a permutation that
 * drops below the budget simply stops merging.
 *
 * ## Two kinds of merge, and the difference is what the data IS
 *
 * - `array` - the same kind of data in several images, told apart by layer.
 *   The detail maps are this: three images sampled at the same coordinate but
 *   at different scales, which is why each carries its own `LodUvScale`
 *   annotation. They cannot share a texel.
 *
 * - `pack` - different kinds of SCALAR data at one coordinate, each read for a
 *   single channel. Its output name ends `PackMap` where an array's ends
 *   `ArrayMap`, so the name never claims a shape the texture does not have -
 *   and so a pack can never take the name of a map the shader already has, the
 *   way a `NoiseMap` pack would have shadowed the asteroid shader's own. Four of those are one RGBA texture, read once. An array
 *   would also cost one unit, but it would cost four fetches to read four
 *   scalars and a `sampler2DArray` for data that was never layered.
 *
 * Measured on Frontier's `pbr/shipquadmaterial`, thirteen samplers each
 * contribute exactly one scalar - the four roughness maps, the dirt pair, the
 * atlas trio, grunge, gradient and curvature. The storage is not
 * single-channel; the CONSUMPTION is, so the packing happens on our side.
 * `/docs/research/frontier-shader-budget.md`.
 *
 * ## PMDG is a packing family because it always was one texture
 *
 * `PaintMaskMap`, `MaterialMap`, `DirtMap` and `GlowMap` were one texture until
 * CCP separated them - the acronym is that texture's channel order. Merging
 * them is not an invention, it is undoing the split, and the form it undoes to
 * is the original: one RGBA texture, one fetch, four scalars.
 *
 * A row for them was written as an array, removed on a standing "never on EVE"
 * ruling, restored when that ruling was shown to collapse into the ordering,
 * and is now a packing row because the array shape was wrong (operator,
 * 2026-09-18).
 *
 * The ruling collapsed because a per-target list can only change the outcome
 * where the ordering already reached this row - that is, where the stage did
 * NOT fit without it. Withholding it there produces a program over the unit
 * limit rather than a saving. EVE does reach it: `quadheatdetailv5` and its
 * three prefix forms are 17 emitted samplers on `.sm_depth` at build 3503375,
 * the only EVE containers over 16. CCP met the same wall - that shader is in
 * the dx11 tree and absent from gles2, skipped because it could not be lowered.
 *
 * So there is no per-game family list. There is one ordered list and a budget.
 *
 * Numbers for both games: `/docs/contracts/quad-family-texture-budget.md`.
 * What happens when the sources disagree on shape or format:
 * `/docs/contracts/texture-array-realization.md`.
 */

/** Carbon's resource type code for a 2D texture. */
const CARBON_TEXTURE_2D = 2;

/**
 * The families, in layer order.
 *
 * The parameter list is the order the layers take, and it is the only thing
 * that decides a layer index: reflection may list them in any order, and a
 * register that happened to come second is layer 1 only if its name says so.
 *
 * The minimum is how few members still merit a merge. Two is the floor
 * everywhere, because one map in a one-layer array saves nothing.
 */
export const TEXTURE_ARRAY_FAMILIES = Object.freeze([
    Object.freeze({
        kind: "array",
        family: "detail-map-array",
        outputName: "DetailArrayMap",
        parameters: Object.freeze([ "Detail1Map", "Detail2Map", "Detail3Map" ]),
        minimum: 2
    }),
    Object.freeze({
        kind: "array",
        family: "roughness-map-array",
        outputName: "RoughnessArrayMap",
        parameters: Object.freeze([ "Roughness1Map", "Roughness2Map", "Roughness3Map", "Roughness4Map" ]),
        minimum: 2
    }),
    Object.freeze({
        kind: "array",
        family: "atlas-map-array",
        outputName: "AtlasArrayMap",
        parameters: Object.freeze([ "AtlasAOMap", "AtlasPaintMap", "AtlasCurvatureMap" ]),
        minimum: 2
    }),
    Object.freeze({
        kind: "array",
        family: "dirt-map-array",
        outputName: "DirtArrayMap",
        parameters: Object.freeze([ "DirtMap1", "DirtMap2" ]),
        minimum: 2
    }),
    // Frontier's pbr material tree, which the quad sweep missed entirely and
    // which is where the structure and asteroid shaders were failing to link.
    //
    // Grouped by WHAT THE MAP IS, not by "any four scalars that happen to sit
    // together" (operator, 2026-09-18). A family is one kind of map, numbered;
    // that is what every row above already is, and a pack of unrelated scalars
    // would be a different idea wearing the same mechanism.
    //
    // Each read is a single channel, measured from the emitted GLSL rather than
    // assumed - `.x` for every member of all three.
    Object.freeze({
        kind: "pack",
        family: "ambient-occlusion-channel-pack",
        outputName: "AmbientOcclusionPackMap",
        parameters: Object.freeze([ "AmbientOcclusion1Map", "AmbientOcclusion2Map" ]),
        minimum: 2
    }),
    Object.freeze({
        kind: "pack",
        family: "curvature-channel-pack",
        outputName: "CurvaturePackMap",
        parameters: Object.freeze([ "Curvature1Map", "Curvature2Map" ]),
        minimum: 2
    }),
    // The numbered series only. `NoiseMap` is a separate map that happens to be
    // scalar too, and folding it in here would be grouping by storage rather
    // than by what the map is. It is one more unit if one is ever needed.
    Object.freeze({
        kind: "pack",
        family: "noise-channel-pack",
        outputName: "NoisePackMap",
        parameters: Object.freeze([ "Noise1Map", "Noise2Map", "Noise3Map" ]),
        minimum: 2
    }),
    // Last, so it is reached only by a stage that nothing above it could bring
    // under the budget. On EVE that is `quadheatdetailv5` alone.
    Object.freeze({
        kind: "pack",
        family: "pmdg-channel-pack",
        outputName: "PmdgPackMap",
        // Channel order follows the REGISTERS - t4, t8, t9, t10 on both games,
        // in that order - rather than the acronym, because the recogniser
        // requires ascending registers in parameter order. Which scalar lands
        // in which channel does not matter as long as the emitter and whatever
        // builds the texture read it from here, and they both do.
        parameters: Object.freeze([ "GlowMap", "DirtMap", "MaterialMap", "PaintMaskMap" ]),
        minimum: 2
    })
]);

/**
 * Recognises one declared family in a stage's reflected resources.
 *
 * Requires the members to be contiguous from the first name with no gap, in one
 * register space, at strictly ascending registers, and each an ordinary
 * single-element 2D texture declared linear. Anything else returns null: a
 * partial or unusual family is not merged, because guessing produces a shader
 * that links and samples the wrong thing.
 *
 * isSRGB must be present and false rather than merely not true. Carbon's reader
 * always sets it, so an absent flag means the caller is passing something other
 * than resource reflection, and the layers of one array texture cannot disagree
 * about whether sampling decodes sRGB.
 *
 * @param {object} definition One row of TEXTURE_ARRAY_FAMILIES.
 * @param {Array<object>} resources Reflected resources.
 * @param {object} [options] Recognition options.
 * @param {number} [options.registerSpace] Default register space.
 * @returns {object|null} Frozen plan, or null when the family is absent or unusable.
 */
export function recogniseTextureArrayFamily(definition, resources, options = {})
{
    const registerSpace = options.registerSpace ?? 0;
    const byParameter = new Map();

    for (const resource of resources ?? [])
    {
        const value = resource?.toJSON?.() ?? resource;
        const name = value?.name ?? value?.parameter;

        if (typeof name !== "string" || !definition.parameters.includes(name)) continue;

        // A duplicate name means the reflection is not what this recogniser
        // assumes, so it declines rather than picking one.
        if (byParameter.has(name)) return null;
        byParameter.set(name, { registerIndex: value.registerIndex, value });
    }

    if (byParameter.size < definition.minimum) return null;

    // Contiguous from the first name: 1 and 2 merge, 1 and 3 do not.
    const parameters = definition.parameters.slice(0, byParameter.size);

    if (parameters.some((parameter) => !byParameter.has(parameter))) return null;

    const layers = [];

    for (const [ layer, parameter ] of parameters.entries())
    {
        const { registerIndex, value } = byParameter.get(parameter);

        if (!Number.isInteger(registerIndex) || registerIndex < 0
            || value.type !== CARBON_TEXTURE_2D
            || (value.arrayElements ?? 1) !== 1
            || value.isSRGB !== false)
        {
            return null;
        }

        const space = value.registerSpace ?? registerSpace;

        // One array texture occupies one binding, so the layers cannot come
        // from different register spaces.
        if (layer > 0 && space !== layers[layer - 1].registerSpace) return null;
        if (layer > 0 && registerIndex <= layers[layer - 1].registerIndex) return null;

        layers.push({ parameter, layer, registerIndex, registerSpace: space });
    }

    return Object.freeze({
        kind: definition.kind ?? "array",
        family: definition.family,
        outputName: definition.outputName,
        registerSpace,
        layerCount: layers.length,
        layers: layers.map((entry) => entry),
        registers: layers.map((entry) => entry.registerIndex)
    });
}

/**
 * Recognises every declared family in one stage's reflected resources.
 *
 * @param {Array<object>} resources Reflected resources.
 * @param {object} [options] Recognition options.
 * @returns {Array<object>} Plans, in table order; empty when none are present.
 */
export function recogniseTextureArrayFamilies(resources, options = {})
{
    const plans = [];

    for (const definition of TEXTURE_ARRAY_FAMILIES)
    {
        const plan = recogniseTextureArrayFamily(definition, resources, options);

        if (plan) plans.push(plan);
    }

    return plans;
}

/**
 * Builds the transform record the container's shared transform section stores.
 *
 * @param {object} plan Recognised family plan.
 * @param {string} layoutKey Enclosing pass key.
 * @returns {object} Transform record.
 */
export function textureArrayTransformFor(plan, layoutKey)
{
    return {
        id: layoutKey + ":" + plan.family + ":sampled-resource:" + plan.registerSpace + ":" + plan.registers[0],
        family: plan.family,
        layoutKey,
        inputs: plan.layers.map((entry) => ({
            registerSpace: entry.registerSpace,
            registerIndex: entry.registerIndex,
            parameter: entry.parameter
        }))
    };
}

export default recogniseTextureArrayFamilies;
