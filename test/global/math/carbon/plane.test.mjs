import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { plane } from "../../../../npm/dist/global/math/carbon/plane.js";

// EXPECT_FLOAT_EQ stand-in
function closeTo(expected, actual, message)
{
    assert.ok(Math.abs(expected - actual) <= 1e-6, `${message || ""} expected ${expected} got ${actual}`);
}

// Ported from e:\carbonengine\math\tests\Plane.cpp
describe("Plane", () =>
{

    it("Constructors", () =>
    {
        const p1 = plane.fromValues(1, 2, 3, 4);
        assert.equal(p1[0], 1);
        assert.equal(p1[1], 2);
        assert.equal(p1[2], 3);
        assert.equal(p1[3], 4);

        const p2 = plane.copy(plane.create(), p1);
        assert.equal(p2[0], 1);
        assert.equal(p2[1], 2);
        assert.equal(p2[2], 3);
        assert.equal(p2[3], 4);
    });

    it("Scaling", () =>
    {
        const a = plane.fromValues(1, 2, 3, 4);

        plane.multiplyScalar(a, a, 0.5);
        assert.equal(a[0], 0.5);
        assert.equal(a[1], 1);
        assert.equal(a[2], 1.5);
        assert.equal(a[3], 2);

        const b = plane.multiplyScalar(plane.create(), a, -10);
        assert.equal(b[0], -5);
        assert.equal(b[1], -10);
        assert.equal(b[2], -15);
        assert.equal(b[3], -20);

        plane.divideScalar(b, b, -2);
        assert.equal(b[0], 2.5);
        assert.equal(b[1], 5);
        assert.equal(b[2], 7.5);
        assert.equal(b[3], 10);

        const c = plane.divideScalar(plane.create(), b, 0.1);
        assert.equal(c[0], 25);
        assert.equal(c[1], 50);
        assert.equal(c[2], 75);
        assert.equal(c[3], 100);

        plane.multiplyScalar(b, b, 0);
        assert.equal(b[0], 0);
        assert.equal(b[1], 0);
        assert.equal(b[2], 0);
        assert.equal(b[3], 0);

        plane.divideScalar(c, c, b[0]);
        assert.ok(!Number.isFinite(c[0]));
        assert.ok(!Number.isFinite(c[1]));
        assert.ok(!Number.isFinite(c[2]));
        assert.ok(!Number.isFinite(c[3]));

        // Plane d( 3.f * a ) - scale * plane commutes through multiplyScalar
        const d = plane.multiplyScalar(plane.create(), a, 3);
        assert.equal(d[0], 1.5);
        assert.equal(d[1], 3);
        assert.equal(d[2], 4.5);
        assert.equal(d[3], 6);
    });

    it("Signs", () =>
    {
        const a = plane.fromValues(1, 2, 3, 4);

        // unary + is a copy
        const b = plane.copy(plane.create(), a);
        assert.equal(b[0], 1);
        assert.equal(b[1], 2);
        assert.equal(b[2], 3);
        assert.equal(b[3], 4);

        const c = plane.negate(plane.create(), a);
        assert.equal(c[0], -1);
        assert.equal(c[1], -2);
        assert.equal(c[2], -3);
        assert.equal(c[3], -4);
    });

    it("Comparisons", () =>
    {
        assert.ok(plane.equals(plane.fromValues(1, 2, 3, 4), plane.fromValues(1, 2, 3, 4)));
        assert.ok(!plane.equals(plane.fromValues(1, 2, 3, 4), plane.fromValues(3, 2, 3, 4)));
        assert.ok(!plane.equals(plane.fromValues(1, 2, 3, 4), plane.fromValues(1, 0, 3, 4)));
        assert.ok(!plane.equals(plane.fromValues(1, 2, 3, 4), plane.fromValues(1, 2, 0, 4)));
        assert.ok(!plane.equals(plane.fromValues(1, 0, 3, 4), plane.fromValues(1, 2, 3, 4)));
        assert.ok(!plane.equals(plane.fromValues(1, 0, 3, 4), plane.fromValues(1, 2, 3, 5)));

        assert.ok(!plane.notEquals(plane.fromValues(1, 2, 3, 4), plane.fromValues(1, 2, 3, 4)));
        assert.ok(plane.notEquals(plane.fromValues(1, 2, 3, 4), plane.fromValues(3, 2, 3, 4)));
        assert.ok(plane.notEquals(plane.fromValues(1, 2, 3, 4), plane.fromValues(1, 0, 3, 4)));
        assert.ok(plane.notEquals(plane.fromValues(1, 2, 3, 4), plane.fromValues(1, 2, 0, 4)));
        assert.ok(plane.notEquals(plane.fromValues(1, 0, 3, 4), plane.fromValues(1, 2, 3, 4)));
        assert.ok(plane.notEquals(plane.fromValues(1, 0, 3, 4), plane.fromValues(1, 2, 3, 5)));
    });

    it("PlaneDotCoord", () =>
    {
        const a = plane.fromValues(1, 2, 3, 4);
        const b = new Float32Array([4, 5, 6]);
        assert.equal(plane.dotCoord(a, b), 36);
    });

    it("PlaneDotNormal", () =>
    {
        const a = plane.fromValues(1, 2, 3, 4);
        const b = new Float32Array([4, 5, 6]);
        assert.equal(plane.dotNormal(a, b), 32);
    });

    it("PlaneNormalize", () =>
    {
        const a = plane.fromValues(1, 2, 3, 4);
        const l = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);

        const b = plane.normalize(plane.create(), a);
        closeTo(a[0] / l, b[0], "a");
        closeTo(a[1] / l, b[1], "b");
        closeTo(a[2] / l, b[2], "c");
        closeTo(a[3] / l, b[3], "d");
    });

    it("PlaneIntersectLine", () =>
    {
        const p1 = plane.fromValues(1, 0, 0, 0);
        const a11 = new Float32Array([0, 2, 0]);
        const a12 = new Float32Array([0, 3, 0]);

        const out1 = new Float32Array(3);
        assert.equal(plane.intersectLine(out1, p1, a11, a12), false);

        const a21 = new Float32Array([1, 4, 0]);
        const a22 = new Float32Array([2, 4, 0]);

        const out2 = new Float32Array(3);
        assert.equal(plane.intersectLine(out2, p1, a21, a22), true);
        assert.equal(out2[0], 0);
        assert.equal(out2[1], 4);
        assert.equal(out2[2], 0);
    });

});
