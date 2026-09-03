import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ray } from "../../../../npm/dist/global/math/carbon/ray.js";
import { axisAlignedBox } from "../../../../npm/dist/global/math/carbon/axisAlignedBox.js";

// Contract tests for the literal Ray port (Carbon's Ray is a plain aggregate; no gtest exists)
describe("Ray", () =>
{

    it("default ray is zero origin and direction", () =>
    {
        assert.deepEqual(Array.from(ray.create()), [0, 0, 0, 0, 0, 0]);
    });

    it("fromValues and fromOriginDirection store origin then direction", () =>
    {
        const a = ray.fromValues(1, 2, 3, 4, 5, 6);
        assert.deepEqual(Array.from(a), [1, 2, 3, 4, 5, 6]);

        const b = ray.fromOriginDirection(ray.create(), new Float32Array([1, 2, 3]), new Float32Array([4, 5, 6]));
        assert.deepEqual(Array.from(b), Array.from(a));
    });

    it("copy duplicates all six components", () =>
    {
        const a = ray.fromValues(1, 2, 3, 4, 5, 6);
        const b = ray.copy(ray.create(), a);
        assert.deepEqual(Array.from(b), Array.from(a));
        b[0] = 9;
        assert.equal(a[0], 1);
    });

    it("layout is consumed correctly by axisAlignedBox.intersectsRay", () =>
    {
        const box = axisAlignedBox.fromMinMax([1, 1, 1], [2, 2, 2]);
        const r = ray.fromOriginDirection(ray.create(), new Float32Array([0, 0, 0]), new Float32Array([1, 1, 1]));
        const out = new Float32Array(3);
        assert.equal(axisAlignedBox.intersectsRay(out, box, r), true);
    });

});
