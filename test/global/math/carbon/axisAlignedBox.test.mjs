import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { axisAlignedBox } from "../../../../npm/dist/global/math/carbon/axisAlignedBox.js";

function closeTo(expected, actual, tolerance, message)
{
    assert.ok(Math.abs(expected - actual) <= tolerance, `${message || ""} expected ${expected} got ${actual}`);
}

const FLT_MAX = 3.4028234663852886e38;

// Independent row-vector TransformCoord (Carbon Matrix_inline.h:560) for the re-bound oracle
function transformCoordRef(v, m)
{
    const norm = m[3] * v[0] + m[7] * v[1] + m[11] * v[2] + m[15];
    return [
        (v[0] * m[0] + v[1] * m[4] + v[2] * m[8] + m[12]) / norm,
        (v[0] * m[1] + v[1] * m[5] + v[2] * m[9] + m[13]) / norm,
        (v[0] * m[2] + v[1] * m[6] + v[2] * m[10] + m[14]) / norm,
    ];
}

// Contract tests for the literal AxisAlignedBox port (Carbon ships no AxisAlignedBox gtest)
describe("AxisAlignedBox", () =>
{

    it("default box is uninitialized (min FLT_MAX, max -FLT_MAX)", () =>
    {
        const b = axisAlignedBox.create();
        assert.equal(b[0], FLT_MAX);
        assert.equal(b[3], -FLT_MAX);
        assert.equal(axisAlignedBox.isInitialized(b), false);
        assert.equal(axisAlignedBox.isInitialized(axisAlignedBox.fromMinMax([0, 0, 0], [1, 1, 1])), true);
    });

    it("fromSphere / fromVector4Sphere: center +- radius", () =>
    {
        const b = axisAlignedBox.fromSphere(axisAlignedBox.create(), new Float32Array([1, 2, 3, 4]));
        assert.deepEqual(Array.from(b), [-3, -2, -1, 5, 6, 7]);
        const b2 = axisAlignedBox.fromVector4Sphere(axisAlignedBox.create(), new Float32Array([1, 2, 3, 4]));
        assert.deepEqual(Array.from(b2), [-3, -2, -1, 5, 6, 7]);
    });

    it("fromEllipsoid: center +- radii with the [radii, center] layout", () =>
    {
        // ellipsoid radii (1,2,3) center (10,20,30)
        const e = new Float32Array([1, 2, 3, 10, 20, 30]);
        const b = axisAlignedBox.fromEllipsoid(axisAlignedBox.create(), e);
        assert.deepEqual(Array.from(b), [9, 18, 27, 11, 22, 33]);
    });

    it("size, center, includePoint, includeBox, includeSphere", () =>
    {
        const b = axisAlignedBox.create();
        axisAlignedBox.includePoint(b, new Float32Array([1, 2, 3]));
        axisAlignedBox.includePoint(b, new Float32Array([-1, 0, 5]));
        assert.deepEqual(Array.from(b), [-1, 0, 3, 1, 2, 5]);

        const size = axisAlignedBox.getSize(new Float32Array(3), b);
        assert.deepEqual(Array.from(size), [2, 2, 2]);
        const center = axisAlignedBox.getCenter(new Float32Array(3), b);
        assert.deepEqual(Array.from(center), [0, 1, 4]);

        axisAlignedBox.includeBox(b, axisAlignedBox.fromMinMax([-5, 0, 0], [0, 0, 9]));
        assert.deepEqual(Array.from(b), [-5, 0, 0, 1, 2, 9]);

        axisAlignedBox.includeSphere(b, new Float32Array([0, 0, 0, 10]));
        assert.deepEqual(Array.from(b), [-10, -10, -10, 10, 10, 10]);
    });

    it("isPointInside is inclusive on the bounds", () =>
    {
        const b = axisAlignedBox.fromMinMax([0, 0, 0], [1, 1, 1]);
        assert.equal(axisAlignedBox.isPointInside(b, new Float32Array([0.5, 0.5, 0.5])), true);
        assert.equal(axisAlignedBox.isPointInside(b, new Float32Array([1, 1, 1])), true);
        assert.equal(axisAlignedBox.isPointInside(b, new Float32Array([1.001, 0.5, 0.5])), false);
        assert.equal(axisAlignedBox.isPointInside(b, new Float32Array([0.5, -0.001, 0.5])), false);
    });

    it("offset, grow, scale (grow/scale are no-ops on an uninitialized box)", () =>
    {
        const b = axisAlignedBox.fromMinMax([0, 0, 0], [1, 1, 1]);
        axisAlignedBox.offset(b, new Float32Array([1, 2, 3]));
        assert.deepEqual(Array.from(b), [1, 2, 3, 2, 3, 4]);
        axisAlignedBox.growScalar(b, 1);
        assert.deepEqual(Array.from(b), [0, 1, 2, 3, 4, 5]);
        axisAlignedBox.growVector(b, new Float32Array([1, 0, 0]));
        assert.deepEqual(Array.from(b), [-1, 1, 2, 4, 4, 5]);
        axisAlignedBox.scale(b, 2);
        assert.deepEqual(Array.from(b), [-2, 2, 4, 8, 8, 10]);

        const u = axisAlignedBox.create();
        axisAlignedBox.growScalar(u, 1);
        axisAlignedBox.growVector(u, new Float32Array([1, 1, 1]));
        axisAlignedBox.scale(u, 2);
        assert.equal(axisAlignedBox.isInitialized(u), false);
    });

    it("getVertices writes the 8 corners in Carbon's enumeration order", () =>
    {
        const b = axisAlignedBox.fromMinMax([0, 1, 2], [3, 4, 5]);
        const v = axisAlignedBox.getVertices(new Float32Array(24), b);
        // AxisAlignedBox_inline.h:164 order
        assert.deepEqual(Array.from(v), [
            0, 1, 2,
            0, 1, 5,
            0, 4, 2,
            0, 4, 5,
            3, 1, 2,
            3, 1, 5,
            3, 4, 2,
            3, 4, 5,
        ]);
    });

    it("transform agrees with transforming all 8 vertices and re-bounding", () =>
    {
        // rotation about z + non-uniform scale (2,3,4) + translation (5,6,7), Carbon row-major rows
        const t = 0.7;
        const c = Math.cos(t), s = Math.sin(t);
        const m = new Float32Array([
            2 * c, 2 * s, 0, 0,
            -3 * s, 3 * c, 0, 0,
            0, 0, 4, 0,
            5, 6, 7, 1,
        ]);
        const box = axisAlignedBox.fromMinMax([-1, 0.5, 2], [2, 3, 6]);

        // oracle: re-bound the 8 transformed corners independently
        const corners = axisAlignedBox.getVertices(new Float32Array(24), box);
        const min = [Infinity, Infinity, Infinity];
        const max = [-Infinity, -Infinity, -Infinity];
        for (let i = 0; i < 8; ++i)
        {
            const p = transformCoordRef(corners.subarray(i * 3, i * 3 + 3), m);
            for (let k = 0; k < 3; ++k)
            {
                if (p[k] < min[k]) min[k] = p[k];
                if (p[k] > max[k]) max[k] = p[k];
            }
        }

        const out = axisAlignedBox.transform(axisAlignedBox.create(), box, m);
        for (let k = 0; k < 3; ++k)
        {
            closeTo(min[k], out[k], 1e-4, `min[${k}]`);
            closeTo(max[k], out[3 + k], 1e-4, `max[${k}]`);
        }

        // aliasing: out === box gives the same result
        axisAlignedBox.transform(box, box, m);
        assert.deepEqual(Array.from(box), Array.from(out));

        // uninitialized boxes pass through untouched
        const u = axisAlignedBox.create();
        axisAlignedBox.transform(u, u, m);
        assert.equal(axisAlignedBox.isInitialized(u), false);
    });

    it("intersectsRay: hit through the box, with the literal scalar 1/|d| slab scaling", () =>
    {
        const box = axisAlignedBox.fromMinMax([1, 1, 1], [2, 2, 2]);
        const ray = new Float32Array([0, 0, 0, 1, 1, 1]);
        const out = new Float32Array(3);
        assert.equal(axisAlignedBox.intersectsRay(out, box, ray), true);
        // rd = 1/sqrt(3); minT = 1/sqrt(3); intersection = origin + minT * direction
        const e = 1 / Math.sqrt(3);
        closeTo(e, out[0], 1e-6);
        closeTo(e, out[1], 1e-6);
        closeTo(e, out[2], 1e-6);
    });

    it("intersectsRay: miss when the slab intervals do not overlap", () =>
    {
        const box = axisAlignedBox.fromMinMax([1, 1, 5], [2, 2, 6]);
        const ray = new Float32Array([0, 0, 0, 1, 1, 1]);
        const out = new Float32Array(3);
        // minT = 5*rd > maxT = 2*rd
        assert.equal(axisAlignedBox.intersectsRay(out, box, ray), false);
    });

    it("intersectsRay: origin inside the box hits with negative minT", () =>
    {
        const box = axisAlignedBox.fromMinMax([1, 1, 1], [2, 2, 2]);
        const ray = new Float32Array([1.5, 1.5, 1.5, 1, 1, 1]);
        const out = new Float32Array(3);
        assert.equal(axisAlignedBox.intersectsRay(out, box, ray), true);
        // minT = -0.5/sqrt(3): the reported point is BEHIND the origin, literally as Carbon computes it
        const t = -0.5 / Math.sqrt(3);
        closeTo(1.5 + t, out[0], 1e-6);
        closeTo(1.5 + t, out[1], 1e-6);
        closeTo(1.5 + t, out[2], 1e-6);
    });

    it("intersectsRay: axis-parallel ray straight through reports false (literal Carbon slab arithmetic)", () =>
    {
        // Carbon scales every slab by the scalar 1/|direction| instead of per-component
        // reciprocals (AxisAlignedBox.cpp:49), so this genuine hit computes minT=1 > maxT=0.5.
        const box = axisAlignedBox.fromMinMax([1, 1, 1], [2, 2, 2]);
        const ray = new Float32Array([0, 1.5, 1.5, 1, 0, 0]);
        const out = new Float32Array(3);
        assert.equal(axisAlignedBox.intersectsRay(out, box, ray), false);
    });

    it("intersectsRay: degenerate point box and uninitialized box", () =>
    {
        const point = axisAlignedBox.fromMinMax([3, 3, 3], [3, 3, 3]);
        const ray = new Float32Array([0, 0, 0, 1, 0, 0]);
        const out = new Float32Array(3);
        // Carbon compares against 1e10 (AxisAlignedBox.cpp:46), so any direction "hits"
        assert.equal(axisAlignedBox.intersectsRay(out, point, ray), true);
        assert.deepEqual(Array.from(out), [3, 3, 3]);

        const u = axisAlignedBox.create();
        const before = Array.from(out);
        assert.equal(axisAlignedBox.intersectsRay(out, u, ray), false);
        assert.deepEqual(Array.from(out), before); // no write on the uninitialized path
    });

    it("intersectsBox / intersection are the literal (inverted) Carbon expressions", () =>
    {
        const a = axisAlignedBox.fromMinMax([0, 0, 0], [2, 2, 2]);
        const b = axisAlignedBox.fromMinMax([1, 1, 1], [3, 3, 3]);
        const far = axisAlignedBox.fromMinMax([5, 5, 5], [6, 6, 6]);

        // AxisAlignedBox_inline.h:122 negates comparisons that are true for overlap,
        // so overlapping AND disjoint boxes both report false...
        assert.equal(axisAlignedBox.intersectsBox(a, b), false);
        assert.equal(axisAlignedBox.intersectsBox(a, far), false);
        // ...and only an inverted/uninitialized extent satisfies it
        assert.equal(axisAlignedBox.intersectsBox(axisAlignedBox.create(), a), true);

        // Intersection() consumes that literally: overlapping boxes yield the default box
        const out = axisAlignedBox.intersection(axisAlignedBox.fromMinMax([0, 0, 0], [1, 1, 1]), a, b);
        assert.equal(axisAlignedBox.isInitialized(out), false);

        // and an inverted extent takes the min/max branch
        const inverted = axisAlignedBox.fromMinMax([5, 5, 5], [0, 0, 0]);
        assert.equal(axisAlignedBox.intersectsBox(inverted, b), true);
        const out2 = axisAlignedBox.intersection(axisAlignedBox.create(), inverted, b);
        assert.deepEqual(Array.from(out2), [5, 5, 5, 0, 0, 0]);
    });

});
