// Ported from e:\carbonengine\math\tests\Vector3.cpp (gtest). Same test names.
// EXPECT_FLOAT_EQ -> expectFloatEq (1e-6 relative); EXPECT_EQ on floats -> strict
// equality (float expectation expressions wrapped in Math.fround).
// Deliberately not ported: Vec3Transform, Vec3TransformCoord, Vec3TransformNormal -
// they exercise Matrix's Transform functions, which belong to the matrix module
// being ported separately.

import { test } from "node:test";
import assert from "node:assert/strict";
import { vector3 } from "../../../../npm/dist/global/math/carbon/vector3.js";

const f32 = Math.fround;

function expectFloatEq(expected, actual)
{
    if (Number.isNaN(expected) && Number.isNaN(actual)) return;
    if (expected === actual) return;
    const tol = 1e-6 * Math.max(Math.abs(expected), Math.abs(actual), 1);
    assert.ok(Math.abs(expected - actual) <= tol, `expected ${expected}, got ${actual}`);
}

test("Vector3Test.Constructors", () =>
{
    const vec1 = vector3.fromValues(1, 2, 3);
    assert.equal(vec1[0], 1);
    assert.equal(vec1[1], 2);
    assert.equal(vec1[2], 3);

    const vec2 = vector3.copy(vector3.create(), vec1);
    assert.equal(vec2[0], 1);
    assert.equal(vec2[1], 2);
    assert.equal(vec2[2], 3);
});

test("Vector3Test.Additions", () =>
{
    const a = vector3.fromValues(1, 2, 3);
    const b = vector3.fromValues(4, 5, 6);

    vector3.add(a, a, b);
    assert.equal(a[0], 5);
    assert.equal(a[1], 7);
    assert.equal(a[2], 9);

    vector3.add(a, a, a);
    assert.equal(a[0], 10);
    assert.equal(a[1], 14);
    assert.equal(a[2], 18);

    const c = vector3.add(vector3.create(), a, b);
    assert.equal(c[0], 14);
    assert.equal(c[1], 19);
    assert.equal(c[2], 24);
});

test("Vector3Test.Subtractions", () =>
{
    const a = vector3.fromValues(12, 23, 4);
    const b = vector3.fromValues(4, 5, 6);

    vector3.subtract(a, a, b);
    assert.equal(a[0], 8);
    assert.equal(a[1], 18);
    assert.equal(a[2], -2);

    const c = vector3.subtract(vector3.create(), a, b);
    assert.equal(c[0], 4);
    assert.equal(c[1], 13);
    assert.equal(c[2], -8);

    const d = vector3.subtract(vector3.create(), a, a);
    assert.equal(d[0], 0);
    assert.equal(d[1], 0);
    assert.equal(d[2], 0);
});

test("Vector3Test.Scaling", () =>
{
    const a = vector3.fromValues(1, 2, 3);

    vector3.scale(a, a, 0.5);
    assert.equal(a[0], 0.5);
    assert.equal(a[1], 1);
    assert.equal(a[2], 1.5);

    const b = vector3.scale(vector3.create(), a, -10);
    assert.equal(b[0], -5);
    assert.equal(b[1], -10);
    assert.equal(b[2], -15);

    vector3.divideScalar(b, b, -2);
    assert.equal(b[0], 2.5);
    assert.equal(b[1], 5);
    assert.equal(b[2], 7.5);

    const c = vector3.divideScalar(vector3.create(), b, 0.1);
    assert.equal(c[0], 25);
    assert.equal(c[1], 50);
    assert.equal(c[2], 75);

    vector3.scale(b, b, 0);
    assert.equal(b[0], 0);
    assert.equal(b[1], 0);
    assert.equal(b[2], 0);

    vector3.divideScalar(c, c, b[0]);
    assert.ok(!Number.isFinite(c[0]));
    assert.ok(!Number.isFinite(c[1]));
    assert.ok(!Number.isFinite(c[2]));

    const d = vector3.scale(vector3.create(), a, 3);
    assert.equal(d[0], 1.5);
    assert.equal(d[1], 3);
    assert.equal(d[2], 4.5);
});

test("Vector3Test.Signs", () =>
{
    const a = vector3.fromValues(1, 2, 3);

    const b = vector3.copy(vector3.create(), a);
    assert.equal(b[0], 1);
    assert.equal(b[1], 2);
    assert.equal(b[2], 3);

    const c = vector3.negate(vector3.create(), a);
    assert.equal(c[0], -1);
    assert.equal(c[1], -2);
    assert.equal(c[2], -3);
});

test("Vector3Test.Comparisons", () =>
{
    const v = vector3.fromValues;
    assert.ok(vector3.exactEquals(v(1, 2, 3), v(1, 2, 3)));
    assert.ok(!vector3.exactEquals(v(1, 2, 3), v(3, 2, 3)));
    assert.ok(!vector3.exactEquals(v(1, 2, 3), v(1, 0, 3)));
    assert.ok(!vector3.exactEquals(v(1, 2, 3), v(1, 2, 0)));
    assert.ok(!vector3.exactEquals(v(1, 0, 3), v(1, 2, 3)));

    assert.ok(!(!vector3.exactEquals(v(1, 2, 3), v(1, 2, 3))));
    assert.ok(!vector3.exactEquals(v(1, 2, 3), v(3, 2, 3)));
    assert.ok(!vector3.exactEquals(v(1, 2, 3), v(1, 0, 3)));
    assert.ok(!vector3.exactEquals(v(1, 2, 3), v(1, 2, 0)));
    assert.ok(!vector3.exactEquals(v(1, 0, 3), v(1, 2, 3)));
});

test("Vector3Test.DotProduct", () =>
{
    const a = vector3.fromValues(1, 2, 3);
    const b = vector3.fromValues(4, 5, 6);
    assert.equal(vector3.dot(a, b), 32);
});

test("Vector3Test.Length", () =>
{
    const a = vector3.fromValues(1, 2, 3);
    assert.equal(vector3.length(a), f32(Math.sqrt(14)));
});

test("Vector3Test.CrossProduct", () =>
{
    const a = vector3.fromValues(1, 2, 3);
    const b = vector3.fromValues(2, 3, 4);
    const c = vector3.cross(vector3.create(), a, b);
    assert.equal(c[0], -1);
    assert.equal(c[1], 2);
    assert.equal(c[2], -1);
});

test("Vector3Test.Vec3Minimize", () =>
{
    const a = vector3.fromValues(14, 2, 53);
    const b = vector3.fromValues(3, 32, 4);

    const c = vector3.minimize(vector3.create(), a, b);
    assert.equal(c[0], 3);
    assert.equal(c[1], 2);
    assert.equal(c[2], 4);
});

test("Vector3Test.Vec3Maximize", () =>
{
    const a = vector3.fromValues(14, 2, 53);
    const b = vector3.fromValues(3, 32, 4);

    const c = vector3.maximize(vector3.create(), a, b);
    assert.equal(c[0], 14);
    assert.equal(c[1], 32);
    assert.equal(c[2], 53);
});

test("Vector3Test.Vec3Lerp", () =>
{
    const a = vector3.fromValues(1, 2, 3);
    const b = vector3.fromValues(2, 10, 14);

    const c = vector3.lerp(vector3.create(), a, b, 0.5);
    assert.equal(c[0], 1.5);
    assert.equal(c[1], 6.0);
    assert.equal(c[2], 8.5);

    vector3.lerp(c, a, b, 1);
    assert.equal(c[0], 2);
    assert.equal(c[1], 10);
    assert.equal(c[2], 14);
});

test("Vector3Test.Normalize", () =>
{
    const a = vector3.fromValues(1, 2, 3);
    const l = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
    const b = vector3.normalize(vector3.create(), a);
    expectFloatEq(a[0] / l, b[0]);
    expectFloatEq(a[1] / l, b[1]);
    expectFloatEq(a[2] / l, b[2]);
});

test("Vector3Test.Vec3Hermite", () =>
{
    const v0 = vector3.fromValues(1, 2, 3);
    const v1 = vector3.fromValues(4, 5, 6);
    const t0 = vector3.fromValues(7, 8, 9);
    const t1 = vector3.fromValues(10, 11, 12);
    const c = vector3.create();

    vector3.hermite(c, v0, t0, v1, t1, 0);
    assert.ok(vector3.exactEquals(c, v0));
    vector3.hermite(c, v0, t0, v1, t1, 1);
    assert.ok(vector3.exactEquals(c, v1));
});

test("Vector3Test.SphereBoundProbe", () =>
{
    const radius = Math.sqrt(77);
    const center = vector3.fromValues(1, 2, 3);
    const rayDirection = vector3.fromValues(2, -4, 2);
    const rayPosition = vector3.fromValues(5, 5, 9);
    assert.ok(vector3.sphereBoundProbe(center, radius, rayPosition, rayDirection));

    rayPosition[0] = 45; rayPosition[1] = -75; rayPosition[2] = 49;
    assert.ok(!vector3.sphereBoundProbe(center, radius, rayPosition, rayDirection));

    rayPosition[0] = 5; rayPosition[1] = 7; rayPosition[2] = 9;
    assert.ok(!vector3.sphereBoundProbe(center, radius, rayPosition, rayDirection));

    rayPosition[0] = 5; rayPosition[1] = 11; rayPosition[2] = 9;
    assert.ok(!vector3.sphereBoundProbe(center, radius, rayPosition, rayDirection));
});

test("Vector3Test.ComputeBoundingSphere", () =>
{
    // C++ TestStream is a Vector3 plus uint16 padding, padded to 16 bytes = stride 4 floats
    const stride = 4;
    const data = new Float32Array([1, 2, 3, 999, 3, 2, 4, 999]);

    const center1 = vector3.create();

    let radius1 = vector3.computeBoundingSphere(center1, data, 0, stride, 0);
    assert.equal(radius1, 0);
    assert.ok(vector3.exactEquals(center1, vector3.fromValues(0, 0, 0)));

    radius1 = vector3.computeBoundingSphere(center1, data, 0, stride, 1);
    assert.equal(radius1, 0);
    assert.ok(vector3.exactEquals(center1, vector3.fromValues(1, 2, 3)));

    radius1 = vector3.computeBoundingSphere(center1, data, 0, stride, 2);
    assert.equal(radius1, f32(1.118034));
    assert.ok(vector3.exactEquals(center1, vector3.fromValues(2, 2, 3.5)));
});
