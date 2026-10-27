import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Ray } from "../src/ray.js";
import { AxisAlignedBox } from "../src/axisAlignedBox.js";

// Contract tests for the literal Ray port (Carbon's Ray is a plain aggregate; no gtest exists)
describe("Ray", () =>
{

    it("default ray is zero origin and direction", () =>
    {
        assert.deepEqual(Array.from(Ray.create()), [0, 0, 0, 0, 0, 0]);
    });

    it("fromValues and fromOriginDirection store origin then direction", () =>
    {
        const a = Ray.fromValues(1, 2, 3, 4, 5, 6);
        assert.deepEqual(Array.from(a), [1, 2, 3, 4, 5, 6]);

        const b = Ray.fromOriginDirection(Ray.create(), new Float32Array([1, 2, 3]), new Float32Array([4, 5, 6]));
        assert.deepEqual(Array.from(b), Array.from(a));
    });

    it("copy duplicates all six components", () =>
    {
        const a = Ray.fromValues(1, 2, 3, 4, 5, 6);
        const b = Ray.copy(Ray.create(), a);
        assert.deepEqual(Array.from(b), Array.from(a));
        b[0] = 9;
        assert.equal(a[0], 1);
    });

    it("layout is consumed correctly by AxisAlignedBox.intersectsRay", () =>
    {
        const box = AxisAlignedBox.fromMinMax([1, 1, 1], [2, 2, 2]);
        const r = Ray.fromOriginDirection(Ray.create(), new Float32Array([0, 0, 0]), new Float32Array([1, 1, 1]));
        const out = new Float32Array(3);
        assert.equal(AxisAlignedBox.intersectsRay(out, box, r), true);
    });

});
