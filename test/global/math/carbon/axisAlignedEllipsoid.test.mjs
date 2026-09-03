import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { axisAlignedEllipsoid } from "../../../../npm/dist/global/math/carbon/axisAlignedEllipsoid.js";

function closeTo(expected, actual, tolerance, message)
{
    assert.ok(Math.abs(expected - actual) <= tolerance, `${message || ""} expected ${expected} got ${actual}`);
}

const SQRT3 = Math.sqrt(3);

// Contract tests for the literal AxisAlignedEllipsoid port (Carbon ships no ellipsoid gtest)
// Storage layout: [radiiX, radiiY, radiiZ, centerX, centerY, centerZ]
describe("AxisAlignedEllipsoid", () =>
{

    it("default ellipsoid is all zeros and uninitialized", () =>
    {
        const e = axisAlignedEllipsoid.create();
        assert.deepEqual(Array.from(e), [0, 0, 0, 0, 0, 0]);
        assert.equal(axisAlignedEllipsoid.isInitialized(e), false);
        assert.equal(axisAlignedEllipsoid.isInitialized(
            axisAlignedEllipsoid.fromCenterRadii([0, 0, 0], [1, 1, 1])), true);
    });

    it("fromCenterRadii stores radii first, center second (Carbon member order)", () =>
    {
        const e = axisAlignedEllipsoid.fromCenterRadii([10, 20, 30], [1, 2, 3]);
        assert.deepEqual(Array.from(e), [1, 2, 3, 10, 20, 30]);
    });

    it("fromBox outer (inner=false): the box is the minimum box fitting the ellipsoid", () =>
    {
        const box = new Float32Array([-1, -2, -3, 1, 2, 3]);
        const e = axisAlignedEllipsoid.fromBox(axisAlignedEllipsoid.create(), box, false);
        assert.deepEqual(Array.from(e), [1, 2, 3, 0, 0, 0]);

        // face centers lie on the surface (inside via <=); corners lie outside
        assert.equal(axisAlignedEllipsoid.isPointInside(e, new Float32Array([1, 0, 0])), true);
        assert.equal(axisAlignedEllipsoid.isPointInside(e, new Float32Array([0, 2, 0])), true);
        assert.equal(axisAlignedEllipsoid.isPointInside(e, new Float32Array([1, 2, 3])), false);
    });

    it("fromBox inner (inner=true): radii scale by sqrt(3) so the box corners land on the surface", () =>
    {
        const box = new Float32Array([-1, -1, -1, 1, 1, 1]);
        const e = axisAlignedEllipsoid.fromBox(axisAlignedEllipsoid.create(), box, true);
        closeTo(SQRT3, e[0], 1e-6);
        closeTo(SQRT3, e[1], 1e-6);
        closeTo(SQRT3, e[2], 1e-6);

        // corner (1,1,1) lies exactly on the surface; f32 rounding of sqrt(3) makes the
        // boundary itself unstable, so assert just inside it
        assert.equal(axisAlignedEllipsoid.isPointInside(e, new Float32Array([0.999, 0.999, 0.999])), true);
        // the whole box is inside; a point just past the corner is not
        assert.equal(axisAlignedEllipsoid.isPointInside(e, new Float32Array([1.01, 1.01, 1.01])), false);
        // the outer ellipsoid of the same box does NOT contain the inner's surface corner
        const outer = axisAlignedEllipsoid.fromBox(axisAlignedEllipsoid.create(), box, false);
        assert.equal(axisAlignedEllipsoid.isPointInside(outer, new Float32Array([1, 1, 1])), false);
    });

    it("includePoint: inside is a no-op, outside rebuilds via the inscribed box, then idempotent", () =>
    {
        const box = new Float32Array([-1, -1, -1, 1, 1, 1]);
        const e = axisAlignedEllipsoid.fromBox(axisAlignedEllipsoid.create(), box, true);
        const before = Array.from(e);
        axisAlignedEllipsoid.includePoint(e, new Float32Array([0.5, 0, 0]));
        assert.deepEqual(Array.from(e), before);

        // include (5,0,0): inscribed box [-1..1] grows to x [-1..5];
        // radii = (3*sqrt3, sqrt3, sqrt3), center (2,0,0)  // AxisAlignedEllipsoid_inline.h:59
        axisAlignedEllipsoid.includePoint(e, new Float32Array([5, 0, 0]));
        closeTo(3 * SQRT3, e[0], 1e-5);
        closeTo(SQRT3, e[1], 1e-5);
        closeTo(SQRT3, e[2], 1e-5);
        closeTo(2, e[3], 1e-5);
        closeTo(0, e[4], 1e-5);
        closeTo(0, e[5], 1e-5);

        // the point is now inside, so a second include is a no-op
        const after = Array.from(e);
        axisAlignedEllipsoid.includePoint(e, new Float32Array([5, 0, 0]));
        assert.deepEqual(Array.from(e), after);
    });

    it("includeBox: contained box is a no-op, larger box rebuilds radii/center", () =>
    {
        const e = axisAlignedEllipsoid.fromCenterRadii([0, 0, 0], [SQRT3, SQRT3, SQRT3]);
        const before = Array.from(e);
        axisAlignedEllipsoid.includeBox(e, new Float32Array([-0.5, -0.5, -0.5, 0.5, 0.5, 0.5]));
        assert.deepEqual(Array.from(e), before);

        // inscribed box is [-1..1]; including [-1..3] on x gives box x [-1..3]
        axisAlignedEllipsoid.includeBox(e, new Float32Array([-1, -1, -1, 3, 1, 1]));
        closeTo(2 * SQRT3, e[0], 1e-5);
        closeTo(SQRT3, e[1], 1e-5);
        closeTo(SQRT3, e[2], 1e-5);
        closeTo(1, e[3], 1e-5);
        closeTo(0, e[4], 1e-5);
        closeTo(0, e[5], 1e-5);
    });

    it("includeSphere routes through the sphere's bounding box", () =>
    {
        const e = axisAlignedEllipsoid.fromCenterRadii([0, 0, 0], [SQRT3, SQRT3, SQRT3]);
        const e2 = axisAlignedEllipsoid.fromCenterRadii([0, 0, 0], [SQRT3, SQRT3, SQRT3]);
        // sphere center (1,0,0) radius 2 -> box [-1,-2,-2, 3,2,2]
        axisAlignedEllipsoid.includeSphere(e, new Float32Array([1, 0, 0, 2]));
        axisAlignedEllipsoid.includeBox(e2, new Float32Array([-1, -2, -2, 3, 2, 2]));
        assert.deepEqual(Array.from(e), Array.from(e2));
    });

    it("offset moves the center only; scale variants touch radii only and skip uninitialized", () =>
    {
        const e = axisAlignedEllipsoid.fromCenterRadii([1, 2, 3], [4, 5, 6]);
        axisAlignedEllipsoid.offset(e, new Float32Array([1, 1, 1]));
        assert.deepEqual(Array.from(e), [4, 5, 6, 2, 3, 4]);

        axisAlignedEllipsoid.scaleScalar(e, 2);
        assert.deepEqual(Array.from(e), [8, 10, 12, 2, 3, 4]);
        axisAlignedEllipsoid.scaleVector(e, new Float32Array([0.5, 1, 2]));
        assert.deepEqual(Array.from(e), [4, 10, 24, 2, 3, 4]);

        const u = axisAlignedEllipsoid.create();
        axisAlignedEllipsoid.scaleScalar(u, 2);
        axisAlignedEllipsoid.scaleVector(u, new Float32Array([2, 2, 2]));
        assert.equal(axisAlignedEllipsoid.isInitialized(u), false);
    });

});
