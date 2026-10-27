// Ported from math\tests\Vector4.cpp (gtest). Same test names.
// Deliberately not ported: Vec4Transform and MultiplyByMatrix - they exercise
// Matrix's Transform / operator*(Vector4, Matrix), which belong to the matrix
// module being ported separately.

import { test } from "node:test";
import assert from "node:assert/strict";
import { Vector4 } from "../src/vector4.js";
import { Vector3 } from "../src/vector3.js";

test("Vector4Test.Constructors", () =>
{
    const vec1 = Vector4.fromValues(1, 2, 3, 4);
    assert.equal(vec1[0], 1);
    assert.equal(vec1[1], 2);
    assert.equal(vec1[2], 3);
    assert.equal(vec1[3], 4);

    const vec2 = Vector4.copy(Vector4.create(), vec1);
    assert.equal(vec2[0], 1);
    assert.equal(vec2[1], 2);
    assert.equal(vec2[2], 3);
    assert.equal(vec2[3], 4);

    const xyz = Vector3.fromValues(1, 2, 3);
    const vec4 = Vector4.fromVector3(Vector4.create(), xyz, 4);
    assert.equal(vec4[0], 1);
    assert.equal(vec4[1], 2);
    assert.equal(vec4[2], 3);
    assert.equal(vec4[3], 4);
});

test("Vector4Test.Subscripts", () =>
{
    const vec1 = Vector4.fromValues(1, 2, 3, 4);
    assert.equal(vec1[0], 1);
    assert.equal(vec1[1], 2);
    assert.equal(vec1[2], 3);
    assert.equal(vec1[3], 4);

    const vec2 = Vector4.fromValues(1, 2, 3, 4);
    assert.equal(vec2[0], 1);
    assert.equal(vec2[1], 2);
    assert.equal(vec2[2], 3);
    assert.equal(vec2[3], 4);
});

test("Vector4Test.Additions", () =>
{
    const a = Vector4.fromValues(1, 2, 3, 4);
    const b = Vector4.fromValues(4, 5, 6, 7);

    Vector4.add(a, a, b);
    assert.equal(a[0], 5);
    assert.equal(a[1], 7);
    assert.equal(a[2], 9);
    assert.equal(a[3], 11);

    Vector4.add(a, a, a);
    assert.equal(a[0], 10);
    assert.equal(a[1], 14);
    assert.equal(a[2], 18);
    assert.equal(a[3], 22);

    const c = Vector4.add(Vector4.create(), a, b);
    assert.equal(c[0], 14);
    assert.equal(c[1], 19);
    assert.equal(c[2], 24);
    assert.equal(c[3], 29);
});

test("Vector4Test.Subtractions", () =>
{
    const a = Vector4.fromValues(12, 23, 4, 45);
    const b = Vector4.fromValues(4, 5, 6, 7);

    Vector4.subtract(a, a, b);
    assert.equal(a[0], 8);
    assert.equal(a[1], 18);
    assert.equal(a[2], -2);
    assert.equal(a[3], 38);

    const c = Vector4.subtract(Vector4.create(), a, b);
    assert.equal(c[0], 4);
    assert.equal(c[1], 13);
    assert.equal(c[2], -8);
    assert.equal(c[3], 31);

    const d = Vector4.subtract(Vector4.create(), a, a);
    assert.equal(d[0], 0);
    assert.equal(d[1], 0);
    assert.equal(d[2], 0);
    assert.equal(d[3], 0);
});

test("Vector4Test.Scaling", () =>
{
    const a = Vector4.fromValues(1, 2, 3, 4);

    Vector4.scale(a, a, 0.5);
    assert.equal(a[0], 0.5);
    assert.equal(a[1], 1);
    assert.equal(a[2], 1.5);
    assert.equal(a[3], 2);

    const b = Vector4.scale(Vector4.create(), a, -10);
    assert.equal(b[0], -5);
    assert.equal(b[1], -10);
    assert.equal(b[2], -15);
    assert.equal(b[3], -20);

    Vector4.divideScalar(b, b, -2);
    assert.equal(b[0], 2.5);
    assert.equal(b[1], 5);
    assert.equal(b[2], 7.5);
    assert.equal(b[3], 10);

    const c = Vector4.divideScalar(Vector4.create(), b, 0.1);
    assert.equal(c[0], 25);
    assert.equal(c[1], 50);
    assert.equal(c[2], 75);
    assert.equal(c[3], 100);

    Vector4.scale(b, b, 0);
    assert.equal(b[0], 0);
    assert.equal(b[1], 0);
    assert.equal(b[2], 0);
    assert.equal(b[3], 0);

    Vector4.divideScalar(c, c, b[0]);
    assert.ok(!Number.isFinite(c[0]));
    assert.ok(!Number.isFinite(c[1]));
    assert.ok(!Number.isFinite(c[2]));
    assert.ok(!Number.isFinite(c[3]));

    const d = Vector4.scale(Vector4.create(), a, 3);
    assert.equal(d[0], 1.5);
    assert.equal(d[1], 3);
    assert.equal(d[2], 4.5);
    assert.equal(d[3], 6);
});

test("Vector4Test.Signs", () =>
{
    const a = Vector4.fromValues(1, 2, 3, 4);

    const b = Vector4.copy(Vector4.create(), a);
    assert.equal(b[0], 1);
    assert.equal(b[1], 2);
    assert.equal(b[2], 3);
    assert.equal(b[3], 4);

    const c = Vector4.negate(Vector4.create(), a);
    assert.equal(c[0], -1);
    assert.equal(c[1], -2);
    assert.equal(c[2], -3);
    assert.equal(c[3], -4);
});

test("Vector4Test.Comparisons", () =>
{
    const v = Vector4.fromValues;
    assert.ok(Vector4.exactEquals(v(1, 2, 3, 4), v(1, 2, 3, 4)));
    assert.ok(!Vector4.exactEquals(v(1, 2, 3, 4), v(3, 2, 3, 4)));
    assert.ok(!Vector4.exactEquals(v(1, 2, 3, 4), v(1, 0, 3, 4)));
    assert.ok(!Vector4.exactEquals(v(1, 2, 3, 4), v(1, 2, 0, 4)));
    assert.ok(!Vector4.exactEquals(v(1, 0, 3, 4), v(1, 2, 3, 4)));
    assert.ok(!Vector4.exactEquals(v(1, 0, 3, 4), v(1, 2, 3, 5)));

    assert.ok(!(!Vector4.exactEquals(v(1, 2, 3, 4), v(1, 2, 3, 4))));
    assert.ok(!Vector4.exactEquals(v(1, 2, 3, 4), v(3, 2, 3, 4)));
    assert.ok(!Vector4.exactEquals(v(1, 2, 3, 4), v(1, 0, 3, 4)));
    assert.ok(!Vector4.exactEquals(v(1, 2, 3, 4), v(1, 2, 0, 4)));
    assert.ok(!Vector4.exactEquals(v(1, 0, 3, 4), v(1, 2, 3, 4)));
    assert.ok(!Vector4.exactEquals(v(1, 0, 3, 4), v(1, 2, 3, 5)));
});

test("Vector4Test.DotProduct", () =>
{
    const a = Vector4.fromValues(1, 2, 3, 4);
    const b = Vector4.fromValues(4, 5, 6, 7);
    assert.equal(Vector4.dot(a, b), 60);
});
