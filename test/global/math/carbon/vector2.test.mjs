// Ported from e:\carbonengine\math\tests\Vector2.cpp (gtest). Same test names.
// EXPECT_EQ on floats -> strict equality (float expressions on the expectation side
// are wrapped in Math.fround, matching the C++ float computation).

import { test } from "node:test";
import assert from "node:assert/strict";
import { vector2 } from "../../../../npm/dist/global/math/carbon/vector2.js";

const f32 = Math.fround;

test("Vector2Test.Constructors", () =>
{
    const vec1 = vector2.fromValues(1, 2);
    assert.equal(vec1[0], 1);
    assert.equal(vec1[1], 2);

    const vec2 = vector2.copy(vector2.create(), vec1);
    assert.equal(vec2[0], 1);
    assert.equal(vec2[1], 2);
});

test("Vector2Test.Additions", () =>
{
    const a = vector2.fromValues(1, 2);
    const b = vector2.fromValues(4, 5);

    vector2.add(a, a, b);
    assert.equal(a[0], 5);
    assert.equal(a[1], 7);

    vector2.add(a, a, a);
    assert.equal(a[0], 10);
    assert.equal(a[1], 14);

    const c = vector2.add(vector2.create(), a, b);
    assert.equal(c[0], 14);
    assert.equal(c[1], 19);
});

test("Vector2Test.Subtractions", () =>
{
    const a = vector2.fromValues(12, 23);
    const b = vector2.fromValues(4, 5);

    vector2.subtract(a, a, b);
    assert.equal(a[0], 8);
    assert.equal(a[1], 18);

    const c = vector2.subtract(vector2.create(), a, b);
    assert.equal(c[0], 4);
    assert.equal(c[1], 13);

    const d = vector2.subtract(vector2.create(), a, a);
    assert.equal(d[0], 0);
    assert.equal(d[1], 0);
});

test("Vector2Test.Scaling", () =>
{
    const a = vector2.fromValues(1, 2);

    vector2.scale(a, a, 0.5);
    assert.equal(a[0], 0.5);
    assert.equal(a[1], 1);

    const b = vector2.scale(vector2.create(), a, -10);
    assert.equal(b[0], -5);
    assert.equal(b[1], -10);

    vector2.divideScalar(b, b, -2);
    assert.equal(b[0], 2.5);
    assert.equal(b[1], 5);

    const c = vector2.divideScalar(vector2.create(), b, 0.1);
    assert.equal(c[0], 25);
    assert.equal(c[1], 50);

    vector2.scale(b, b, 0);
    assert.equal(b[0], 0);
    assert.equal(b[1], 0);

    vector2.divideScalar(c, c, b[0]);
    assert.ok(!Number.isFinite(c[0]));
    assert.ok(!Number.isFinite(c[1]));

    const d = vector2.scale(vector2.create(), a, 3);
    assert.equal(d[0], 1.5);
    assert.equal(d[1], 3);
});

test("Vector2Test.Signs", () =>
{
    const a = vector2.fromValues(1, 2);

    const b = vector2.copy(vector2.create(), a);
    assert.equal(b[0], 1);
    assert.equal(b[1], 2);

    const c = vector2.negate(vector2.create(), a);
    assert.equal(c[0], -1);
    assert.equal(c[1], -2);
});

test("Vector2Test.Comparisons", () =>
{
    const v = vector2.fromValues;
    assert.ok(vector2.exactEquals(v(1, 2), v(1, 2)));
    assert.ok(!vector2.exactEquals(v(1, 2), v(3, 2)));
    assert.ok(!vector2.exactEquals(v(1, 2), v(1, 0)));
    assert.ok(!vector2.exactEquals(v(1, 0), v(1, 2)));

    assert.ok(!(!vector2.exactEquals(v(1, 2), v(1, 2))));
    assert.ok(!vector2.exactEquals(v(1, 2), v(3, 2)));
    assert.ok(!vector2.exactEquals(v(1, 2), v(1, 0)));
    assert.ok(!vector2.exactEquals(v(1, 0), v(1, 2)));
});

test("Vector2Test.Length", () =>
{
    const a = vector2.fromValues(1, 2);
    assert.equal(vector2.length(a), f32(Math.sqrt(5)));
});

test("Vector2Test.Vec2Normalize", () =>
{
    const a = vector2.fromValues(1, 2);
    const l = f32(Math.sqrt(a[0] * a[0] + a[1] * a[1]));

    const b = vector2.normalize(vector2.create(), a);
    assert.equal(b[0], f32(a[0] / l));
    assert.equal(b[1], f32(a[1] / l));
});
