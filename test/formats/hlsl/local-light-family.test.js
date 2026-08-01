import test from "node:test";
import assert from "node:assert/strict";

import {
    LOCAL_LIGHT_RESOURCE_NAMES,
    recogniseLocalLightFamily
} from "../../../src/formats/hlsl/core/localLightFamily.js";

/** A reflected structured buffer, as Carbon records one. */
function buffer(name, registerIndex)
{
    return { name, registerIndex, type: 7, arrayElements: 1, isSRGB: false };
}

/** A reflected texture array. */
function textureArray(name, registerIndex)
{
    return { name, registerIndex, type: 5, arrayElements: 1, isSRGB: false };
}

/** The shipped arrangement, from `unpackedskinned_quaddetailv5.sm_depth`. */
const SHIPPED = [
    { name: "AlbedoMap", registerIndex: 6, type: 2 },
    buffer("LightIndexBuffer", 13),
    buffer("LightBuffer", 14),
    textureArray("LightProfileArray", 15)
];

test("the shipped family is recognised with its profile", () =>
{
    const plan = recogniseLocalLightFamily(SHIPPED);

    assert.equal(plan.indexRegister, 13);
    assert.equal(plan.dataRegister, 14);
    assert.equal(plan.profileRegister, 15);
    assert.deepEqual(plan.registers, [ 13, 14, 15 ]);
});

test("the profile array is optional, and absent is not the same as no family", () =>
{
    const plan = recogniseLocalLightFamily([
        buffer("LightIndexBuffer", 11),
        buffer("LightBuffer", 12)
    ]);

    // Some permutations never sample the profile array; the family is still
    // present and still needs lowering.
    assert.notEqual(plan, null);
    assert.equal(plan.profileRegister, null);
    assert.deepEqual(plan.registers, [ 11, 12 ]);
});

test("registers are read, never assumed", () =>
{
    // The same family binds at different registers per permutation. A fixed
    // register set would lower the wrong resources.
    const low = recogniseLocalLightFamily([
        buffer("LightIndexBuffer", 11), buffer("LightBuffer", 12)
    ]);
    const high = recogniseLocalLightFamily([
        buffer("LightIndexBuffer", 13), buffer("LightBuffer", 14)
    ]);

    assert.equal(low.indexRegister, 11);
    assert.equal(high.indexRegister, 13);
});

test("either buffer missing is not the family", () =>
{
    assert.equal(recogniseLocalLightFamily([ buffer("LightIndexBuffer", 13) ]), null);
    assert.equal(recogniseLocalLightFamily([ buffer("LightBuffer", 14) ]), null);
    assert.equal(recogniseLocalLightFamily([ textureArray("LightProfileArray", 15) ]), null);
    assert.equal(recogniseLocalLightFamily([]), null);
    assert.equal(recogniseLocalLightFamily(null), null);
});

test("a same-named resource that is not a structured buffer is refused", () =>
{
    // Lowering a 2D texture as though it held packed light rows would misread
    // every light rather than fail visibly.
    assert.equal(recogniseLocalLightFamily([
        { name: "LightIndexBuffer", registerIndex: 13, type: 2 },
        buffer("LightBuffer", 14)
    ]), null);
});

test("the family name list covers every member", () =>
{
    assert.deepEqual([ ...LOCAL_LIGHT_RESOURCE_NAMES ], [
        "LightIndexBuffer", "LightBuffer", "LightProfileArray"
    ]);
});
