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
 * ## PMDG is a per-target family, and it is not in this table
 *
 * `GlowMap`, `MaterialMap`, `PaintMaskMap` and `DirtMap` were one packed texture
 * until CCP unpacked them, and they are the obvious next family. A row for them
 * was written here and removed, because a row here applies to every target that
 * translates a shader carrying those names - and this one must not.
 *
 * **It never goes on EVE** (operator, 2026-09-18, standing). EVE's quad family
 * is cleared by the light lowering alone, so merging there buys nothing and
 * spends the live game's working hulls to do it.
 *
 * **EVE Frontier cannot do without it.** Measured at build 3512930 on
 * `.sm_depth`, maxima across all bodies so `SOPPT_ENABLED` is included: the
 * light lowering leaves the worst case at 18-19, and only PMDG brings the family
 * under 16. That is the opposite of EVE, which is the whole reason this cannot
 * be one rule.
 *
 * So the selection is a property of the TARGET, not of the shader, and it
 * arrives the way the other translation decisions do - the emitter takes the
 * family list as a profile key rather than importing this table. A game's
 * profile names what it may merge; this file only says what each family IS.
 *
 * Two hazards make the EVE half of that boundary load-bearing rather than
 * tidiness. An array needs its layers to agree on format and mip count, and
 * these do not always: EVE's `gb1_t1` PaintMask carries 12 mips against its
 * siblings' 11, and Frontier's DirtMap is DX10 against ATI1 siblings. A rejected
 * aggregate binds the 1x1 fallback, which blanks the map rather than failing
 * loudly.
 *
 * Numbers, both games, and the substitution of `quadheatdetailv5` by
 * `quadheatv5`: `/docs/contracts/quad-family-texture-budget.md`.
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
        family: "detail-map-array",
        outputName: "DetailArrayMap",
        parameters: Object.freeze([ "Detail1Map", "Detail2Map", "Detail3Map" ]),
        minimum: 2
    }),
    Object.freeze({
        family: "roughness-map-array",
        outputName: "RoughnessArrayMap",
        parameters: Object.freeze([ "Roughness1Map", "Roughness2Map", "Roughness3Map", "Roughness4Map" ]),
        minimum: 2
    }),
    Object.freeze({
        family: "atlas-map-array",
        outputName: "AtlasArrayMap",
        parameters: Object.freeze([ "AtlasAOMap", "AtlasPaintMap", "AtlasCurvatureMap" ]),
        minimum: 2
    }),
    Object.freeze({
        family: "dirt-map-array",
        outputName: "DirtArrayMap",
        parameters: Object.freeze([ "DirtMap1", "DirtMap2" ]),
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
