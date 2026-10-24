import { test } from "node:test";
import assert from "node:assert/strict";
import * as legacy from "../src/index.js";

let realm = 0;
async function fresh()
{
    return import(`../src/initialize.js?test=${realm++}`);
}

test("initialization selects the existing double functions once without wrappers", async () =>
{
    const { initializeMath } = await fresh();
    const api = initializeMath();
    assert.equal(api.precision, "double");
    assert.equal(api, initializeMath({ precision: "double" }));
    for (const name of ["matrix", "quaternion", "vector2", "vector3", "vector4", "plane", "sphere",
        "axisAlignedBox", "axisAlignedEllipsoid", "ray", "color", "float16", "vector2_16", "vector3_16", "vector4_16"])
    {
        assert.equal(api[name], legacy[name]);
        assert.ok(Object.isFrozen(api[name]));
    }
    assert.ok(Object.isFrozen(api));
    assert.throws(() => initializeMath({ precision: "float32" }), /immutable/);
});

test("invalid or unavailable requests do not commit initialization state", async () =>
{
    const { initializeMath } = await fresh();
    for (const bad of [null, [], "double", { precision: null }, { precision: "float64" }, { precison: "double" }])
    {
        assert.throws(() => initializeMath(bad), TypeError);
    }
    assert.throws(() => initializeMath({ precision: "float32" }), error => error.code === "CARBON_FLOAT32_UNAVAILABLE");
    assert.equal(initializeMath({ precision: "double" }).precision, "double");
});

test("captured functions and their dependencies cannot be replaced", async () =>
{
    const { initializeMath } = await fresh();
    const api = initializeMath();
    const transformCoords = api.matrix.transformCoords;
    assert.throws(() => { api.precision = "float32"; }, TypeError);
    assert.throws(() => { api.matrix.transformCoord = () => {}; }, TypeError);
    assert.throws(() => { legacy.matrix.transformCoord = () => {}; }, TypeError);
    assert.throws(() => { api.matrix = {}; }, TypeError);
    const m = api.matrix.create();
    m[12] = 7;
    const input = new Float32Array([2, 3, 4]);
    const output = new Float32Array(3);
    transformCoords(output, 0, 3, input, 0, 3, 1, m);
    assert.deepEqual(Array.from(output), [9, 3, 4]);
    output[0] = 99;
    assert.equal(output[0], 99);
});

test("independent module instances do not lock one another", async () =>
{
    const first = await fresh(), second = await fresh();
    first.initializeMath();
    assert.throws(() => second.initializeMath({ precision: "float32" }), error => error.code === "CARBON_FLOAT32_UNAVAILABLE");
    assert.notEqual(first.initializeMath(), second.initializeMath());
});

test("quaternion Exp follows native nonzero semantics for NaN", () =>
{
    const out = new Float32Array(4);
    legacy.quaternion.exp(out, new Float32Array([NaN, 0, 0, 1]));
    assert.ok(out.every(Number.isNaN));
    legacy.quaternion.exp(out, new Float32Array([0, 0, 0, NaN]));
    assert.deepEqual(Array.from(out), [0, 0, 0, 1]);
});
