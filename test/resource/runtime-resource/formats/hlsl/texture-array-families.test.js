import test from "node:test";
import assert from "node:assert/strict";

import {
    TEXTURE_ARRAY_FAMILIES,
    recogniseTextureArrayFamilies,
    recogniseTextureArrayFamily,
    textureArrayTransformFor
} from "../../../../../src/resource/formats/hlsl/core/textureArrayFamilies.js";

/** A reflected 2D texture, in the shape reflection hands over. */
function texture(name, registerIndex, overrides = {})
{
    return { name, registerIndex, type: 2, arrayElements: 1, isSRGB: false, ...overrides };
}

function familyNamed(name)
{
    return TEXTURE_ARRAY_FAMILIES.find((entry) => entry.family === name);
}

/**
 * EVE Frontier's pbr/shipquadmaterial, at the registers its reflection reports.
 * The three mergeable families sit among textures that are not families at all.
 */
const SHIP_QUAD_MATERIAL = [
    texture("EveSpaceSceneEnvMap", 0),
    texture("SSAOMap", 1),
    texture("NormalMap", 2),
    texture("Roughness1Map", 3),
    texture("Roughness2Map", 4),
    texture("Roughness3Map", 5),
    texture("Roughness4Map", 6),
    texture("DirtMap1", 7),
    texture("DirtMap2", 8),
    texture("AtlasAOMap", 9),
    texture("AtlasPaintMap", 10),
    texture("AtlasCurvatureMap", 11),
    texture("GrungeMap", 12),
    texture("GradientMap", 13),
    texture("CurvatureMap", 14)
];

test("Frontier's ship material yields its three families, in table order", () =>
{
    const plans = recogniseTextureArrayFamilies(SHIP_QUAD_MATERIAL);

    assert.deepEqual(plans.map((plan) => plan.family), [
        "roughness-map-array",
        "atlas-map-array",
        "dirt-map-array"
    ]);
    assert.deepEqual(plans.map((plan) => plan.layerCount), [ 4, 3, 2 ]);
});

test("the merge is worth 6 of its 15 textures", () =>
{
    const plans = recogniseTextureArrayFamilies(SHIP_QUAD_MATERIAL);
    const merged = plans.reduce((total, plan) => total + plan.layerCount, 0);

    // Nine registers become three bindings: 15 textures, 9 of them merged.
    assert.equal(merged, 9);
    assert.equal(SHIP_QUAD_MATERIAL.length - merged + plans.length, 9);
});

test("layer order follows the NAME, not the register order", () =>
{
    const shuffled = [
        texture("Roughness3Map", 5),
        texture("Roughness1Map", 3),
        texture("Roughness4Map", 6),
        texture("Roughness2Map", 4)
    ];
    const [ plan ] = recogniseTextureArrayFamilies(shuffled);

    assert.deepEqual(plan.layers.map((entry) => entry.parameter), [
        "Roughness1Map", "Roughness2Map", "Roughness3Map", "Roughness4Map"
    ]);
    assert.deepEqual(plan.registers, [ 3, 4, 5, 6 ]);
});

test("a gap in the family refuses the merge", () =>
{
    // Roughness1 + Roughness3 with no Roughness2: merging would put the third
    // map at layer 1 and every sample of it would read the wrong map.
    const plans = recogniseTextureArrayFamilies([
        texture("Roughness1Map", 3),
        texture("Roughness3Map", 5)
    ]);

    assert.deepEqual(plans, []);
});

test("one member alone is not a family", () =>
{
    assert.deepEqual(recogniseTextureArrayFamilies([ texture("DirtMap1", 7) ]), []);
});

test("the detail family still behaves exactly as it did", () =>
{
    // The shipped three-map arrangement, from quaddetailv5 at permutation 20.
    const plans = recogniseTextureArrayFamilies([
        texture("AlbedoMap", 5),
        texture("Detail1Map", 13),
        texture("Detail2Map", 14),
        texture("Detail3Map", 15)
    ]);

    assert.equal(plans.length, 1);
    assert.equal(plans[0].family, "detail-map-array");
    assert.equal(plans[0].outputName, "DetailArrayMap");
    assert.deepEqual(plans[0].registers, [ 13, 14, 15 ]);
});

test("two detail maps merge, because heat+detail shaders ship that way", () =>
{
    const [ plan ] = recogniseTextureArrayFamilies([
        texture("Detail1Map", 10),
        texture("Detail2Map", 11)
    ]);

    assert.equal(plan.layerCount, 2);
});

test("anything that is not a plain linear 2D texture refuses", () =>
{
    const roughness = familyNamed("roughness-map-array");

    for (const broken of [
        { isSRGB: true },
        { type: 3 },
        { arrayElements: 2 },
        { registerIndex: -1 }
    ])
    {
        const plan = recogniseTextureArrayFamily(roughness, [
            texture("Roughness1Map", 3),
            texture("Roughness2Map", 4, broken)
        ]);

        assert.equal(plan, null, JSON.stringify(broken));
    }
});

test("layers cannot come from two register spaces, because one binding cannot", () =>
{
    const plan = recogniseTextureArrayFamily(familyNamed("dirt-map-array"), [
        texture("DirtMap1", 7, { registerSpace: 0 }),
        texture("DirtMap2", 8, { registerSpace: 1 })
    ]);

    assert.equal(plan, null);
});

test("registers must ascend with the layer order", () =>
{
    const plan = recogniseTextureArrayFamily(familyNamed("atlas-map-array"), [
        texture("AtlasAOMap", 11),
        texture("AtlasPaintMap", 10),
        texture("AtlasCurvatureMap", 9)
    ]);

    assert.equal(plan, null);
});

test("a duplicate name is reflection this recogniser does not understand", () =>
{
    const plan = recogniseTextureArrayFamily(familyNamed("dirt-map-array"), [
        texture("DirtMap1", 7),
        texture("DirtMap1", 8),
        texture("DirtMap2", 9)
    ]);

    assert.equal(plan, null);
});

test("each family gets its own transform record, keyed by its first register", () =>
{
    const plans = recogniseTextureArrayFamilies(SHIP_QUAD_MATERIAL);
    const records = plans.map((plan) => textureArrayTransformFor(plan, "pass0"));

    assert.deepEqual(records.map((record) => record.id), [
        "pass0:roughness-map-array:sampled-resource:0:3",
        "pass0:atlas-map-array:sampled-resource:0:9",
        "pass0:dirt-map-array:sampled-resource:0:7"
    ]);
    assert.deepEqual(records[0].inputs.map((input) => input.parameter), [
        "Roughness1Map", "Roughness2Map", "Roughness3Map", "Roughness4Map"
    ]);
    assert.equal(new Set(records.map((record) => record.id)).size, 3, "ids must not collide");
});

test("every declared family is well formed", () =>
{
    for (const definition of TEXTURE_ARRAY_FAMILIES)
    {
        assert.ok(definition.parameters.length >= definition.minimum, definition.family);
        assert.equal(new Set(definition.parameters).size, definition.parameters.length, definition.family);
        // The name has to say the shape. An array's output is an array and
        // ends `ArrayMap`; a pack's is one texture whose channels are its
        // members and ends `PackMap`. A pack called `SomethingMap` would also
        // be free to collide with a real parameter of that name, which is how
        // `NoiseArrayMap` was caught shadowing the asteroid shader's `NoiseMap`.
        assert.match(
            definition.outputName,
            (definition.kind ?? "array") === "pack" ? /PackMap$/u : /ArrayMap$/u,
            definition.family
        );
    }

    assert.equal(
        new Set(TEXTURE_ARRAY_FAMILIES.map((entry) => entry.outputName)).size,
        TEXTURE_ARRAY_FAMILIES.length,
        "two families sharing one output name would collide in the emitted GLSL"
    );
});
