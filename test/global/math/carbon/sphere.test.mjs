import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sphere } from "../../../../npm/dist/global/math/carbon/sphere.js";

function closeTo(expected, actual, message)
{
    assert.ok(Math.abs(expected - actual) <= 1e-6, `${message || ""} expected ${expected} got ${actual}`);
}

// Contract tests for the literal Sphere port (Carbon ships no Sphere gtest)
describe("Sphere", () =>
{

    it("default sphere is uninitialized (radius -1)", () =>
    {
        const s = sphere.create();
        assert.equal(s[3], -1);
        assert.equal(sphere.isInitialized(s), false);
        assert.equal(sphere.isInitialized(sphere.fromValues(0, 0, 0, 0)), true);
    });

    it("fromVector4 unpacks [x,y,z,w=radius]", () =>
    {
        const s = sphere.fromVector4(sphere.create(), new Float32Array([1, 2, 3, 4]));
        assert.deepEqual(Array.from(s), [1, 2, 3, 4]);
    });

    it("fromBox: center is the box center, radius is half the diagonal", () =>
    {
        // box [0..2]x[0..4]x[0..4]: diagonal sqrt(4+16+16)=6, radius 3
        const box = new Float32Array([0, 0, 0, 2, 4, 4]);
        const s = sphere.fromBox(sphere.create(), box);
        closeTo(1, s[0]);
        closeTo(2, s[1]);
        closeTo(2, s[2]);
        closeTo(3, s[3]);
    });

    it("fromBoxTransformed: transforms min/max then bounds them (Sphere.cpp:10)", () =>
    {
        const box = new Float32Array([0, 0, 0, 2, 4, 4]);
        // translation-only Carbon row-major matrix, translation at [12..14]
        const m = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 10, 20, 30, 1]);
        const s = sphere.fromBoxTransformed(sphere.create(), box, m);
        closeTo(11, s[0]);
        closeTo(22, s[1]);
        closeTo(32, s[2]);
        closeTo(3, s[3]);
    });

    it("includePoint: first point seeds a zero-radius sphere, growth is exact, re-include is a no-op", () =>
    {
        const s = sphere.create();
        const p1 = new Float32Array([0, 0, 0]);
        const p2 = new Float32Array([2, 0, 0]);

        sphere.includePoint(s, p1);
        assert.deepEqual(Array.from(s), [0, 0, 0, 0]);

        // deltaLen 2: center moves to midpoint, radius to 1
        sphere.includePoint(s, p2);
        closeTo(1, s[0]);
        closeTo(0, s[1]);
        closeTo(0, s[2]);
        closeTo(1, s[3]);

        // both points now inside: idempotent
        const before = Array.from(s);
        sphere.includePoint(s, p1);
        sphere.includePoint(s, p2);
        assert.deepEqual(Array.from(s), before);
    });

    it("includeSphere: exact two-sphere hull, then idempotent", () =>
    {
        const s = sphere.fromValues(0, 0, 0, 1);
        const other = sphere.fromValues(4, 0, 0, 1);

        // deltaLen 4: center (2,0,0), radius 0.5*(1+1+4)=3
        sphere.includeSphere(s, other);
        closeTo(2, s[0]);
        closeTo(0, s[1]);
        closeTo(0, s[2]);
        closeTo(3, s[3]);

        // contained spheres do not change it; an uninitialized argument is ignored
        const before = Array.from(s);
        sphere.includeSphere(s, other);
        sphere.includeSphere(s, sphere.fromValues(2, 0, 0, 0.5));
        sphere.includeSphere(s, sphere.create());
        assert.deepEqual(Array.from(s), before);

        // an uninitialized receiver copies the argument
        const t = sphere.create();
        sphere.includeSphere(t, other);
        assert.deepEqual(Array.from(t), Array.from(other));
    });

    it("isPointInside honours the 1e-4 squared epsilon and rejects on uninitialized", () =>
    {
        const s = sphere.fromValues(0, 0, 0, 1);
        assert.equal(sphere.isPointInside(s, new Float32Array([1, 0, 0])), true);
        // 1.00004^2 = 1.0000800016 <= 1 + 1e-4 -> inside via epsilon
        assert.equal(sphere.isPointInside(s, new Float32Array([1.00004, 0, 0])), true);
        assert.equal(sphere.isPointInside(s, new Float32Array([1.1, 0, 0])), false);
        assert.equal(sphere.isPointInside(sphere.create(), new Float32Array([0, 0, 0])), false);
    });

    it("isSphereInside: radius pre-check, containment compare, uninitialized rejects", () =>
    {
        const big = sphere.fromValues(0, 0, 0, 3);
        const small = sphere.fromValues(1, 0, 0, 1);
        assert.equal(sphere.isSphereInside(big, small), true);
        assert.equal(sphere.isSphereInside(small, big), false);
        // touching from inside: |delta|=2 == 3-1 -> inside (<=)
        assert.equal(sphere.isSphereInside(big, sphere.fromValues(2, 0, 0, 1)), true);
        assert.equal(sphere.isSphereInside(big, sphere.fromValues(2.5, 0, 0, 1)), false);
        assert.equal(sphere.isSphereInside(big, sphere.create()), false);
        assert.equal(sphere.isSphereInside(sphere.create(), small), false);
    });

    it("transform: center via TransformCoord, radius by the largest basis scale", () =>
    {
        // scale (2,3,4) + translation (1,2,3), Carbon row-major
        const m = new Float32Array([2, 0, 0, 0, 0, 3, 0, 0, 0, 0, 4, 0, 1, 2, 3, 1]);
        const s = sphere.fromValues(1, 1, 1, 2);
        sphere.transform(s, s, m);
        closeTo(3, s[0]);
        closeTo(5, s[1]);
        closeTo(7, s[2]);
        closeTo(8, s[3]); // max scale 4 * radius 2

        // uninitialized spheres pass through untouched
        const u = sphere.create();
        sphere.transform(u, u, m);
        assert.equal(sphere.isInitialized(u), false);
    });

});
