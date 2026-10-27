import { describe, test } from "node:test";
import assert from "node:assert";
import { triUtil } from "../src/index.js";

describe("triUtil gamma", () =>
{
    test("float conversions are float pows of 0.454545f and 2.2f", () =>
    {
        assert.strictEqual(triUtil.triLinearToGamma__Float(0.5), Math.fround(Math.pow(0.5, Math.fround(0.454545))));
        assert.strictEqual(triUtil.triGammaToLinear__Float(0.5), Math.fround(Math.pow(0.5, Math.fround(2.2))));
    });

    test("vector overloads convert every component; Vector4 and Color keep w", () =>
    {
        const v4 = new Float32Array([0.25, 0.5, 0.75, 0.3]);
        const g = triUtil.triLinearToGamma__Vector4(new Float32Array(4), v4);
        for (let i = 0; i < 3; ++i)
        {
            assert.strictEqual(g[i], triUtil.triLinearToGamma__Float(v4[i]));
        }
        assert.strictEqual(g[3], v4[3]);
        assert.deepStrictEqual(triUtil.triGammaToLinear__Color(new Float32Array(4), v4), triUtil.triGammaToLinear__Vector4(new Float32Array(4), v4));
        const v2 = triUtil.triGammaToLinear__Vector2(new Float32Array(2), new Float32Array([0.25, 0.5]));
        assert.strictEqual(v2[1], triUtil.triGammaToLinear__Float(0.5));
    });

    test("in-place conversion keeps w", () =>
    {
        const c = new Float32Array([0.25, 0.5, 0.75, 0.3]);
        triUtil.triGammaToLinear__Vector4(c, c);
        assert.strictEqual(c[3], Math.fround(0.3));
    });

    test("routers return exactly what the specific overloads return, and throw on other lengths", () =>
    {
        const v3 = new Float32Array([0.1, 0.2, 0.3]);
        assert.strictEqual(triUtil.triLinearToGamma(null, 0.5), triUtil.triLinearToGamma__Float(0.5));
        assert.deepStrictEqual(triUtil.triLinearToGamma(new Float32Array(3), v3), triUtil.triLinearToGamma__Vector3(new Float32Array(3), v3));
        assert.deepStrictEqual(triUtil.triGammaToLinear(new Float32Array(3), v3), triUtil.triGammaToLinear__Vector3(new Float32Array(3), v3));
        assert.throws(() => triUtil.triGammaToLinear(new Float32Array(5), new Float32Array(5)), TypeError);
    });
});
