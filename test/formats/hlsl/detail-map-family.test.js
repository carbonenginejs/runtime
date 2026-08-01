import test from "node:test";
import assert from "node:assert/strict";

import {
    DETAIL_MAP_ARRAY_NAME,
    detailMapTransformFor,
    recogniseDetailMapFamily
} from "../../../src/formats/hlsl/core/detailMapFamily.js";

/** A reflected 2D texture, in the shape reflection hands over. */
function texture(name, registerIndex, overrides = {})
{
    return { name, registerIndex, type: 2, arrayElements: 1, isSRGB: false, ...overrides };
}

/** The shipped three-map arrangement, taken from `quaddetailv5` at permutation 20. */
const THREE_MAPS = [
    texture("AlbedoMap", 5),
    texture("Detail1Map", 13),
    texture("Detail2Map", 14),
    texture("Detail3Map", 15)
];

test("the three-map family is recognised in layer order", () =>
{
    const plan = recogniseDetailMapFamily(THREE_MAPS);

    assert.equal(plan.layerCount, 3);
    assert.equal(plan.outputName, DETAIL_MAP_ARRAY_NAME);
    assert.deepEqual(plan.registers, [ 13, 14, 15 ]);
    assert.deepEqual(plan.layers.map((entry) => entry.parameter), [
        "Detail1Map", "Detail2Map", "Detail3Map"
    ]);
    assert.deepEqual(plan.layers.map((entry) => entry.layer), [ 0, 1, 2 ]);
});

test("the two-map family is recognised, because heat+detail shaders ship that way", () =>
{
    const plan = recogniseDetailMapFamily([
        texture("Detail1Map", 10),
        texture("Detail2Map", 11)
    ]);

    assert.equal(plan.layerCount, 2);
    assert.deepEqual(plan.registers, [ 10, 11 ]);
});

test("layer order follows the name, not the order reflection lists them in", () =>
{
    const plan = recogniseDetailMapFamily([
        texture("Detail3Map", 15),
        texture("Detail1Map", 13),
        texture("Detail2Map", 14)
    ]);

    assert.deepEqual(plan.layers.map((entry) => entry.parameter), [
        "Detail1Map", "Detail2Map", "Detail3Map"
    ]);
});

test("a shader with no detail maps is not a candidate", () =>
{
    assert.equal(recogniseDetailMapFamily([ texture("AlbedoMap", 5) ]), null);
    assert.equal(recogniseDetailMapFamily([]), null);
    assert.equal(recogniseDetailMapFamily(null), null);
});

test("a single detail map is not merged", () =>
{
    // One map into a one-layer array saves nothing and costs a code path.
    assert.equal(recogniseDetailMapFamily([ texture("Detail1Map", 13) ]), null);
});

test("a gap in the family is refused rather than guessed at", () =>
{
    // Detail1 + Detail3 with no Detail2: merging would silently put Detail3 at
    // layer 1, and every sample of it would read the wrong map.
    assert.equal(recogniseDetailMapFamily([
        texture("Detail1Map", 13),
        texture("Detail3Map", 15)
    ]), null);
});

test("out-of-order or duplicate registers are refused", () =>
{
    assert.equal(recogniseDetailMapFamily([
        texture("Detail1Map", 15),
        texture("Detail2Map", 13)
    ]), null);

    assert.equal(recogniseDetailMapFamily([
        texture("Detail1Map", 13),
        texture("Detail2Map", 13)
    ]), null);
});

test("a detail map that is not a plain 2D texture is refused", () =>
{
    for (const odd of [ { type: 4 }, { arrayElements: 2 }, { isSRGB: true } ])
    {
        assert.equal(
            recogniseDetailMapFamily([ texture("Detail1Map", 13), texture("Detail2Map", 14, odd) ]),
            null,
            JSON.stringify(odd)
        );
    }
});

test("the transform carries the pass key in its identity", () =>
{
    const transform = detailMapTransformFor(recogniseDetailMapFamily(THREE_MAPS), "Main.pass0");

    assert.equal(transform.layoutKey, "Main.pass0");
    assert.ok(transform.id.startsWith("Main.pass0:detail-map-array:"));
    assert.deepEqual(transform.inputs.map((input) => input.registerIndex), [ 13, 14, 15 ]);
    assert.deepEqual(transform.inputs.map((input) => input.parameter), [
        "Detail1Map", "Detail2Map", "Detail3Map"
    ]);
});
