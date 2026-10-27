import { describe, test } from "node:test";
import assert from "node:assert";
import { AxisAlignedBox, Float4x3, Matrix, Quaternion, boundingBox, boundingSphere, matrixUtils } from "../src/index.js";

// Carbon has no tests for these helpers, so these check the identities they must satisfy
// and agreement with the archive's independent ports (AxisAlignedBox) where one exists.

function closeTo(actual, expected, tolerance = 1e-5, message = "")
{
    assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1.0, Math.abs(expected)),
        `${message} expected ${expected}, got ${actual}`);
}

function closeToArray(actual, expected, tolerance = 1e-5)
{
    for (let i = 0; i < expected.length; ++i)
    {
        closeTo(actual[i], expected[i], tolerance, `[${i}]`);
    }
}

const v3 = (x, y, z) => new Float32Array([x, y, z]);
const v4 = (x, y, z, w) => new Float32Array([x, y, z, w]);
const rotation = () => Quaternion.normalize(new Float32Array(4), v4(0.2, -0.4, 0.3, 0.8));
const affine = () => Matrix.transformationMatrix(new Float32Array(16), v3(2, 3, 4), rotation(), v3(5, -6, 7));

/** A deterministic LCG for repeatable random cases */
function lcg(seed)
{
    let state = seed >>> 0;
    return () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
}

describe("matrixUtils", () =>
{
    test("Float4x3 round-trips an affine matrix; triMatrixCopyFrom3x4 keeps the fourth column", () =>
    {
        const m = affine();
        const f = Float4x3.create__Matrix(m);
        assert.deepStrictEqual(Float4x3.toMatrix(new Float32Array(16), f), m);
        const out = new Float32Array(16).fill(9);
        matrixUtils.triMatrixCopyFrom3x4(out, f);
        assert.deepStrictEqual([ out[3], out[7], out[11], out[15] ], [ 9, 9, 9, 9 ]);
        assert.strictEqual(out[12], m[12]);
        assert.deepStrictEqual(matrixUtils.triMatrixCopyFrom3x4__Granny3x4(new Float32Array(16), f), matrixUtils.triMatrixCopyFrom3x4__Float4x3(new Float32Array(16), f));
    });

    test("decomposeMirrorAware recomposes a mirrored matrix with a negative scale", () =>
    {
        const m = Matrix.transformationMatrix(new Float32Array(16), v3(-2, 3, 4), rotation(), v3(5, -6, 7));
        assert.strictEqual(matrixUtils.isMirrored(m), true);
        const scale = v3(0, 0, 0), q = new Float32Array(4), t = v3(0, 0, 0);
        matrixUtils.decomposeMirrorAware(scale, q, t, m);
        assert.ok(scale[0] < 0);
        closeToArray(Matrix.transformationMatrix(new Float32Array(16), scale, q, t), m, 1e-4);
    });

    test("deconstructProjectionMatrix recovers a right-handed perspective", () =>
    {
        const proj = Matrix.perspectiveFovMatrix(new Float32Array(16), 1.1, 1.6, 0.5, 900);
        const [ asp, fov, front, back ] = matrixUtils.deconstructProjectionMatrix(new Float32Array(4), proj);
        closeTo(asp, 1.6);
        closeTo(fov, 1.1);
        closeTo(front, 0.5);
        closeTo(back, 900, 1e-3);
    });
});

describe("boundingBox", () =>
{
    test("initialize, update and isInside", () =>
    {
        const min = v3(0, 0, 0), max = v3(0, 0, 0);
        boundingBox.boundingBoxInitialize__MinMax(min, max);
        assert.strictEqual(boundingBox.isBoundingBoxEmpty(min, max), true);
        boundingBox.boundingBoxUpdate__Pos(min, max, v3(1, 2, 3));
        boundingBox.boundingBoxUpdate__OtherMinOtherMax(min, max, v3(-1, 0, 0), v3(0, 5, 0));
        boundingBox.boundingBoxUpdate__Sphere(min, max, v4(0, 0, 0, 0.5));
        assert.deepStrictEqual(Array.from(min), [ -1, -0.5, -0.5 ]);
        assert.deepStrictEqual(Array.from(max), [ 1, 5, 3 ]);
        assert.strictEqual(boundingBox.boundingBoxIsInside__Pos(min, max, v3(1, 5, 3)), true);
        assert.strictEqual(boundingBox.boundingBoxIsInside__Pos(min, max, v3(1.01, 5, 3)), false);
        assert.strictEqual(boundingBox.boundingBoxIsInside__PosEpsilon(min, max, v3(1.01, 5, 3), 0.02), true);
        boundingBox.boundingBoxInitialize__Sphere(v4(1, 2, 3, 2), min, max);
        assert.deepStrictEqual([ ...min, ...max ], [ -1, 0, 1, 3, 4, 5 ]);
    });

    test("boundingBoxTransform agrees with AxisAlignedBox.transform", () =>
    {
        const m = affine();
        const min = v3(-1, -2, 0.5), max = v3(3, 1, 2);
        const expected = AxisAlignedBox.transform(new Float32Array(6), new Float32Array([ ...min, ...max ]), m);
        boundingBox.boundingBoxTransform(min, max, m);
        closeToArray([ ...min, ...max ], expected, 1e-6);
    });

    test("ray against a box: hit, miss, and the degenerate-box quirk", () =>
    {
        const hit = v3(0, 0, 0);
        assert.strictEqual(boundingBox.intersectAxisAlignedBoxRay(v3(-1, -1, -1), v3(1, 1, 1), v3(-5, 0.5, 0), v3(1, 0, 0), hit), true);
        assert.deepStrictEqual(Array.from(hit), [ -1, 0.5, 0 ]);
        assert.strictEqual(boundingBox.intersectAxisAlignedBoxRay(v3(-1, -1, -1), v3(1, 1, 1), v3(-5, 3, 0), v3(1, 0, 0), hit), false);
        // Carbon quirk: a point box reports a hit for a ray pointing straight away from it
        assert.strictEqual(boundingBox.intersectAxisAlignedBoxRay(v3(2, 2, 2), v3(2, 2, 2), v3(0, 0, 0), v3(-1, 0, 0), hit), true);
        assert.deepStrictEqual(Array.from(hit), [ 2, 2, 2 ]);
    });

    test("oriented boxes with identity orientations agree with the axis-aligned test", () =>
    {
        const random = lcg(7);
        const identity = v4(0, 0, 0, 1);
        for (let i = 0; i < 200; ++i)
        {
            const cA = v3(random() * 4 - 2, random() * 4 - 2, random() * 4 - 2), hA = v3(random() + 0.1, random() + 0.1, random() + 0.1);
            const cB = v3(random() * 4 - 2, random() * 4 - 2, random() * 4 - 2), hB = v3(random() + 0.1, random() + 0.1, random() + 0.1);
            const minA = v3(cA[0] - hA[0], cA[1] - hA[1], cA[2] - hA[2]), maxA = v3(cA[0] + hA[0], cA[1] + hA[1], cA[2] + hA[2]);
            const minB = v3(cB[0] - hB[0], cB[1] - hB[1], cB[2] - hB[2]), maxB = v3(cB[0] + hB[0], cB[1] + hB[1], cB[2] + hB[2]);
            assert.strictEqual(
                boundingBox.intersectOrientedBoxAxisAlignedBox(cA, hA, identity, minB, maxB),
                boundingBox.intersectAxisAlignedBoxAxisAlignedBox(minA, maxA, minB, maxB), `case ${i}`);
        }
    });

    test("a rotated oriented box separates only where its rotation says", () =>
    {
        // A unit cube turned 45 degrees about Z reaches sqrt(2) along X
        const q = Quaternion.rotationQuaternion__AxisAngle(new Float32Array(4), v3(0, 0, 1), Math.PI / 4);
        const extents = v3(1, 1, 1);
        assert.strictEqual(boundingBox.intersectOrientedBoxAxisAlignedBox(v3(0, 0, 0), extents, q, v3(1.3, -0.05, -0.05), v3(1.4, 0.05, 0.05)), true);
        assert.strictEqual(boundingBox.intersectOrientedBoxAxisAlignedBox(v3(0, 0, 0), extents, q, v3(1.3, 0.9, -0.05), v3(1.4, 1.0, 0.05)), false);
    });

    test("triangle tests: the quick test passes a triangle the full test rejects", () =>
    {
        const identity = Matrix.identityMatrix(new Float32Array(16));
        // On the plane x + y + z = 3.5, beyond the box corner (1, 1, 1), with no face separating it
        const a = v3(3.5, 0, 0), b = v3(0, 3.5, 0), c = v3(0, 0, 3.5);
        assert.strictEqual(boundingBox.intersectTriangleOrientedBox__TriangleVertices(new Float32Array([ ...a, ...b, ...c ]), identity), true);
        assert.strictEqual(boundingBox.intersectTriangleOrientedBox__V0V1V2(a, b, c, identity), false);
        const inside = [ v3(-0.5, -0.5, 0), v3(0.5, -0.5, 0), v3(0, 0.5, 0) ];
        assert.strictEqual(boundingBox.intersectTriangleOrientedBox__V0V1V2(...inside, identity), true);
        const far = [ v3(5, 5, 5), v3(6, 5, 5), v3(5, 6, 5) ];
        assert.strictEqual(boundingBox.intersectTriangleOrientedBox__V0V1V2(...far, identity), false);
        assert.strictEqual(boundingBox.intersectTriangleAABB(...far, v3(-1, -1, -1), v3(1, 1, 1)), false);
        assert.strictEqual(boundingBox.intersectTriangleAABB(...inside, v3(-1, -1, -1), v3(1, 1, 1)), true);
    });

    test("closest point clamps into the box", () =>
    {
        assert.deepStrictEqual(Array.from(boundingBox.closestPointToBoundingBox(v3(0, 0, 0), v3(-1, -1, -1), v3(1, 1, 1), v3(3, 0.5, -4))), [ 1, 0.5, -1 ]);
    });

    test("item sets group bounds by bone and transform them by their bones", () =>
    {
        const item = (box, bone) => ({ GetBounds: () => new Float32Array(box), GetBoneIndex: () => bone });
        const items = [ item([ 0, 0, 0, 1, 1, 1 ], 2), item([ -1, -1, -1, 0, 0, 0 ], -1), item([ 1, 1, 1, 2, 2, 2 ], 2), item([ 5, 5, 5, 6, 6, 6 ], 0) ];
        const staticBounds = AxisAlignedBox.create(), boneBounds = [ [ 9, null ] ];
        boundingBox.createItemSetBoundingBoxes(staticBounds, boneBounds, true, items);
        assert.deepStrictEqual(Array.from(staticBounds), [ -1, -1, -1, 0, 0, 0 ]);
        assert.deepStrictEqual(boneBounds.map(([ bone, box ]) => [ bone, Array.from(box) ]), [ [ 0, [ 5, 5, 5, 6, 6, 6 ] ], [ 2, [ 0, 0, 0, 2, 2, 2 ] ] ]);

        // bone 0 translates by (10, 0, 0); bone 2 is past boneCount, so it is included untransformed
        const bones = Float4x3.create__Matrix(Matrix.translationMatrix__XYZ(new Float32Array(16), 10, 0, 0));
        const aabb = boundingBox.getItemSetAabb(new Float32Array(6), staticBounds, boneBounds, bones, 1);
        assert.deepStrictEqual(Array.from(aabb), [ -1, -1, -1, 16, 6, 6 ]);
    });
});

describe("boundingSphere", () =>
{
    test("update with a point and with a sphere contains both", () =>
    {
        const sphere = v4(0, 0, 0, 1);
        boundingSphere.boundingSphereUpdate__Pos(v3(3, 0, 0), sphere);
        closeToArray(sphere, [ 1, 0, 0, 2 ]);
        assert.ok(boundingSphere.boundingSphereIsInside(sphere, v3(3, 0, 0)));
        assert.ok(boundingSphere.boundingSphereIsInside(sphere, v3(-1, 0, 0)));
        const result = v4(0, 0, 0, 1);
        boundingSphere.boundingSphereUpdate__AddSphere(v4(4, 0, 0, 1), result);
        closeToArray(result, [ 2, 0, 0, 3 ]);
        boundingSphere.boundingSphereUpdate__AddSphere(v4(0, 0, 0, 10), result);
        assert.deepStrictEqual(Array.from(result), [ 0, 0, 0, 10 ]);
    });

    test("transform moves the center and scales the radius by the largest axis", () =>
    {
        const sphere = v4(1, 0, 0, 2);
        boundingSphere.boundingSphereTransform(affine(), sphere);
        closeTo(sphere[3], 8);
        const expected = Matrix.transformCoord(v3(0, 0, 0), v3(1, 0, 0), affine());
        closeToArray(sphere, expected);
    });

    test("fromBox, sphere-box intersection and point-in-ellipsoid", () =>
    {
        const sphere = v4(0, 0, 0, 0);
        boundingSphere.boundingSphereFromBox(sphere, v3(-1, -1, -1), v3(1, 1, 1));
        closeToArray(sphere, [ 0, 0, 0, Math.sqrt(3) ]);
        assert.strictEqual(boundingSphere.intersectSphereAxisAlignedBox(v4(3, 0, 0, 2.01), v3(-1, -1, -1), v3(1, 1, 1)), true);
        assert.strictEqual(boundingSphere.intersectSphereAxisAlignedBox(v4(3, 3, 0, 2), v3(-1, -1, -1), v3(1, 1, 1)), false);
        assert.strictEqual(boundingSphere.isPointInsideEllipsoid(v3(0, 0, 0), v3(2, 1, 1), v3(1.9, 0, 0)), true);
        assert.strictEqual(boundingSphere.isPointInsideEllipsoid(v3(0, 0, 0), v3(2, 1, 1), v3(0, 1.1, 0)), false);
    });

    test("ellipsoid rays: nearest non-negative t, and the closest-magnitude variant", () =>
    {
        const out = v3(0, 0, 0), t = new Float32Array(1);
        assert.strictEqual(boundingSphere.intersectEllipsoidRay__T(out, t, v3(0, 0, 0), v3(2, 1, 1), v3(-5, 0, 0), v3(1, 0, 0)), true);
        closeToArray(out, [ -2, 0, 0 ]);
        closeTo(t[0], 3);
        // from inside, the forward root
        boundingSphere.intersectEllipsoidRay__Out(out, v3(0, 0, 0), v3(2, 1, 1), v3(1, 0, 0), v3(1, 0, 0));
        closeToArray(out, [ 2, 0, 0 ]);
        // closest by magnitude, even behind the origin
        boundingSphere.intersectEllipsoidRayClosest(out, v3(0, 0, 0), v3(2, 1, 1), v3(-1.5, 0, 0), v3(1, 0, 0));
        closeToArray(out, [ -2, 0, 0 ]);
        assert.strictEqual(boundingSphere.intersectEllipsoidRay__Out(out, v3(0, 0, 0), v3(1, 1, 1), v3(-5, 3, 0), v3(1, 0, 0)), false);
    });

    test("fromPoints encloses every point, for 2, 3, 4 and many points", () =>
    {
        const random = lcg(11);
        for (const count of [ 2, 3, 4, 5, 12, 40 ])
        {
            const points = Array.from({ length: count }, () => v3(random() * 6 - 3, random() * 6 - 3, random() * 6 - 3));
            const sphere = v4(0, 0, 0, 0);
            boundingSphere.boundingSphereFromPoints__Vector4(sphere, points.slice(), count);
            for (const p of points)
            {
                const d = Math.hypot(p[0] - sphere[0], p[1] - sphere[1], p[2] - sphere[2]);
                assert.ok(d <= sphere[3] + 1e-4, `count ${count}: ${d} > ${sphere[3]}`);
            }
        }
        // the six axis points of the unit sphere give the unit sphere
        const axes = [ v3(1, 0, 0), v3(-1, 0, 0), v3(0, 1, 0), v3(0, -1, 0), v3(0, 0, 1), v3(0, 0, -1) ];
        const sphere = new Float64Array(4);
        boundingSphere.boundingSphereFromPoints__Vector4d(sphere, axes, axes.length);
        closeToArray(sphere, [ 0, 0, 0, 1 ], 1e-3);
        const two = v4(0, 0, 0, 0);
        boundingSphere.boundingSphereFromPoints__Point1Point2(two, v3(0, 0, 0), v3(2, 0, 0));
        closeToArray(two, [ 1, 0, 0, 1.0001 ]);
    });
});

describe("bounds overload routers (rule 11)", () =>
{
    test("routers return exactly what the specific variants return", () =>
    {
        const a = [ v3(0, 0, 0), v3(0, 0, 0) ], b = [ v3(0, 0, 0), v3(0, 0, 0) ];
        boundingBox.boundingBoxInitialize(...a);
        boundingBox.boundingBoxInitialize__MinMax(...b);
        assert.deepStrictEqual(a, b);
        boundingBox.boundingBoxUpdate(...a, v4(1, 2, 3, 1));
        boundingBox.boundingBoxUpdate__Sphere(...b, v4(1, 2, 3, 1));
        assert.deepStrictEqual(a, b);
        boundingBox.boundingBoxUpdate(...a, v3(9, 9, 9));
        boundingBox.boundingBoxUpdate__Pos(...b, v3(9, 9, 9));
        assert.deepStrictEqual(a, b);
        assert.strictEqual(boundingBox.boundingBoxIsInside(...a, v3(9.5, 9, 9), 0.6), true);
        assert.strictEqual(boundingBox.boundingBoxIsInside(...a, v3(9.5, 9, 9)), false);

        const s1 = v4(0, 0, 0, 1), s2 = v4(0, 0, 0, 1);
        boundingSphere.boundingSphereUpdate(v3(3, 0, 0), s1);
        boundingSphere.boundingSphereUpdate__Pos(v3(3, 0, 0), s2);
        assert.deepStrictEqual(s1, s2);
        boundingSphere.boundingSphereUpdate(v4(-5, 0, 0, 1), s1);
        boundingSphere.boundingSphereUpdate__AddSphere(v4(-5, 0, 0, 1), s2);
        assert.deepStrictEqual(s1, s2);

        const points = [ v3(0, 0, 0), v3(2, 0, 0), v3(0, 2, 0) ];
        const f = v4(0, 0, 0, 0), d = new Float64Array(4);
        boundingSphere.boundingSphereFromPoints(f, points, 3);
        boundingSphere.boundingSphereFromPoints(d, points, 3);
        assert.deepStrictEqual(Array.from(f), Array.from(Float32Array.from(d)));
    });

    test("routers throw where no Carbon overload matches", () =>
    {
        assert.throws(() => boundingBox.boundingBoxUpdate(v3(0, 0, 0), v3(0, 0, 0), new Float32Array(2)), TypeError);
        assert.throws(() => boundingSphere.boundingSphereUpdate(new Float32Array(2), v4(0, 0, 0, 1)), TypeError);
        assert.throws(() => boundingBox.intersectTriangleOrientedBox(v3(0, 0, 0)), TypeError);
    });
});
