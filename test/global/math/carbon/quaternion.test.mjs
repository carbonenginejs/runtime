import { describe, test } from "node:test";
import assert from "node:assert";
import { matrix, quaternion } from "../../../../npm/dist/global/math/carbon/index.js";

// gtest EXPECT_FLOAT_EQ equivalent: 1e-6 relative tolerance
function closeTo(actual, expected, message)
{
    const tol = 1e-6 * Math.max(1.0, Math.abs(actual), Math.abs(expected));
    assert.ok(Math.abs(actual - expected) <= tol,
        `${message ?? ""} expected ${expected}, got ${actual}`);
}

function q4(x, y, z, w)
{
    return new Float32Array([x, y, z, w]);
}

function expectQuaternionEq(expected, actual)
{
    closeTo(actual[0], expected[0], "x");
    closeTo(actual[1], expected[1], "y");
    closeTo(actual[2], expected[2], "z");
    closeTo(actual[3], expected[3], "w");
}

describe("Quaternion", () =>
{
    test("Constructors", () =>
    {
        const q1 = q4(1, 2, 3, 4);
        assert.strictEqual(q1[0], 1);
        assert.strictEqual(q1[1], 2);
        assert.strictEqual(q1[2], 3);
        assert.strictEqual(q1[3], 4);

        const q2 = quaternion.clone(q1);
        assert.strictEqual(q2[0], 1);
        assert.strictEqual(q2[1], 2);
        assert.strictEqual(q2[2], 3);
        assert.strictEqual(q2[3], 4);
    });

    test("Additions", () =>
    {
        const a = q4(1, 2, 3, 4);
        const b = q4(4, 5, 6, 7);

        quaternion.add(a, a, b);
        assert.strictEqual(a[0], 5);
        assert.strictEqual(a[1], 7);
        assert.strictEqual(a[2], 9);
        assert.strictEqual(a[3], 11);

        quaternion.add(a, a, a);
        assert.strictEqual(a[0], 10);
        assert.strictEqual(a[1], 14);
        assert.strictEqual(a[2], 18);
        assert.strictEqual(a[3], 22);

        const c = quaternion.add(quaternion.create(), a, b);
        assert.strictEqual(c[0], 14);
        assert.strictEqual(c[1], 19);
        assert.strictEqual(c[2], 24);
        assert.strictEqual(c[3], 29);
    });

    test("Subtractions", () =>
    {
        const a = q4(12, 23, 4, 45);
        const b = q4(4, 5, 6, 7);

        quaternion.subtract(a, a, b);
        assert.strictEqual(a[0], 8);
        assert.strictEqual(a[1], 18);
        assert.strictEqual(a[2], -2);
        assert.strictEqual(a[3], 38);

        const c = quaternion.subtract(quaternion.create(), a, b);
        assert.strictEqual(c[0], 4);
        assert.strictEqual(c[1], 13);
        assert.strictEqual(c[2], -8);
        assert.strictEqual(c[3], 31);

        const d = quaternion.subtract(quaternion.create(), a, a);
        assert.strictEqual(d[0], 0);
        assert.strictEqual(d[1], 0);
        assert.strictEqual(d[2], 0);
        assert.strictEqual(d[3], 0);
    });

    test("Scaling", () =>
    {
        const a = q4(1, 2, 3, 4);

        quaternion.scale(a, a, 0.5);
        assert.strictEqual(a[0], 0.5);
        assert.strictEqual(a[1], 1);
        assert.strictEqual(a[2], 1.5);
        assert.strictEqual(a[3], 2);

        const b = quaternion.scale(quaternion.create(), a, -10);
        assert.strictEqual(b[0], -5);
        assert.strictEqual(b[1], -10);
        assert.strictEqual(b[2], -15);
        assert.strictEqual(b[3], -20);

        quaternion.divide(b, b, -2);
        assert.strictEqual(b[0], 2.5);
        assert.strictEqual(b[1], 5);
        assert.strictEqual(b[2], 7.5);
        assert.strictEqual(b[3], 10);

        const c = quaternion.divide(quaternion.create(), b, 0.1);
        assert.strictEqual(c[0], 25);
        assert.strictEqual(c[1], 50);
        assert.strictEqual(c[2], 75);
        assert.strictEqual(c[3], 100);

        quaternion.scale(b, b, 0);
        assert.strictEqual(b[0], 0);
        assert.strictEqual(b[1], 0);
        assert.strictEqual(b[2], 0);
        assert.strictEqual(b[3], 0);

        quaternion.divide(c, c, b[0]);
        assert.ok(!Number.isFinite(c[0]));
        assert.ok(!Number.isFinite(c[1]));
        assert.ok(!Number.isFinite(c[2]));
        assert.ok(!Number.isFinite(c[3]));

        const d = quaternion.scale(quaternion.create(), a, 3);
        assert.strictEqual(d[0], 1.5);
        assert.strictEqual(d[1], 3);
        assert.strictEqual(d[2], 4.5);
        assert.strictEqual(d[3], 6);
    });

    test("Signs", () =>
    {
        const a = q4(1, 2, 3, 4);

        const b = quaternion.clone(a);
        assert.strictEqual(b[0], 1);
        assert.strictEqual(b[1], 2);
        assert.strictEqual(b[2], 3);
        assert.strictEqual(b[3], 4);

        const c = quaternion.negate(quaternion.create(), a);
        assert.strictEqual(c[0], -1);
        assert.strictEqual(c[1], -2);
        assert.strictEqual(c[2], -3);
        assert.strictEqual(c[3], -4);
    });

    test("Comparisons", () =>
    {
        assert.ok(quaternion.exactEquals(q4(1, 2, 3, 4), q4(1, 2, 3, 4)));
        assert.ok(!quaternion.exactEquals(q4(1, 2, 3, 4), q4(3, 2, 3, 4)));
        assert.ok(!quaternion.exactEquals(q4(1, 2, 3, 4), q4(1, 0, 3, 4)));
        assert.ok(!quaternion.exactEquals(q4(1, 2, 3, 4), q4(1, 2, 0, 4)));
        assert.ok(!quaternion.exactEquals(q4(1, 0, 3, 4), q4(1, 2, 3, 4)));
        assert.ok(!quaternion.exactEquals(q4(1, 0, 3, 4), q4(1, 2, 3, 5)));

        assert.ok(!(!quaternion.exactEquals(q4(1, 2, 3, 4), q4(1, 2, 3, 4))));
        assert.ok(!quaternion.exactEquals(q4(1, 2, 3, 4), q4(3, 2, 3, 4)));
        assert.ok(!quaternion.exactEquals(q4(1, 2, 3, 4), q4(1, 0, 3, 4)));
        assert.ok(!quaternion.exactEquals(q4(1, 2, 3, 4), q4(1, 2, 0, 4)));
        assert.ok(!quaternion.exactEquals(q4(1, 0, 3, 4), q4(1, 2, 3, 4)));
        assert.ok(!quaternion.exactEquals(q4(1, 0, 3, 4), q4(1, 2, 3, 5)));
    });

    test("Multiplication", () =>
    {
        const q1 = q4(1, 2, 3, 4);
        const q2 = q4(2.4, 7.1, -3.1, 0.2);
        const result = q4(37.2999992, 18.4999981, -14.0999994, -6.50000095);

        const q5 = quaternion.multiply(quaternion.create(), q1, q2);
        expectQuaternionEq(result, q5);

        const q6 = quaternion.clone(q1);
        quaternion.multiply(q6, q6, q2);
        expectQuaternionEq(result, q6);
    });

    test("QuaternionLength", () =>
    {
        const q1 = q4(1, 2, 3, 4);
        assert.strictEqual(quaternion.length(q1), 5.477225575051661);
    });

    test("QuaternionDot", () =>
    {
        const q1 = q4(1, 2, 3, 4);
        const q2 = q4(2.4, 7.1, -3.1, 0.2);
        closeTo(quaternion.dot(q1, q2), 8.100000381469727);
    });

    test("QuaternionIdentity", () =>
    {
        assert.ok(quaternion.exactEquals(
            quaternion.identityQuaternion(quaternion.create()),
            q4(0, 0, 0, 1)));
    });

    test("QuaternionConjugate", () =>
    {
        const q1 = q4(1, -2, 3, 4);
        const result = q4(-1, 2, -3, 4);

        const q3 = quaternion.conjugate(quaternion.create(), q1);
        assert.ok(quaternion.exactEquals(q3, result));
    });

    test("QuaternionToAxisAngle", () =>
    {
        const q1 = q4(0.18257418274879456, 0.3651483654975891, 0.5477225184440613, 0.7302967309951782);
        const axis = new Float32Array([0.18257418274879456, 0.3651483654975891, 0.5477225184440613]);
        const angle = 1.50408018;

        const outAxis = new Float32Array(3);
        const resultAngle = quaternion.getAxisAngle(outAxis, q1);
        assert.strictEqual(outAxis[0], axis[0]);
        assert.strictEqual(outAxis[1], axis[1]);
        assert.strictEqual(outAxis[2], axis[2]);
        closeTo(resultAngle, angle);
    });

    test("QuaternionRotationMatrix", () =>
    {
        const id = matrix.create();

        let q2 = quaternion.rotationQuaternion(quaternion.create(), id);
        expectQuaternionEq(quaternion.identityQuaternion(quaternion.create()), q2);

        const m = matrix.rotationXMatrix(new Float32Array(16), 0.5);
        const expected = q4(0.24740396, 0.00000000, 0.00000000, 0.96891242);

        q2 = quaternion.rotationQuaternion(quaternion.create(), m);
        expectQuaternionEq(expected, q2);
    });

    test("QuaternionRotationAxis", () =>
    {
        const axis = new Float32Array([1, 2, 3]);

        let q2 = quaternion.rotationQuaternion(quaternion.create(), axis, 0.0);
        assert.ok(quaternion.exactEquals(q2, quaternion.identityQuaternion(quaternion.create())));

        const angle = 0.5;
        const expected = q4(0.066121489, 0.13224298, 0.19836447, 0.96891242);

        q2 = quaternion.rotationQuaternion(quaternion.create(), axis, angle);
        expectQuaternionEq(expected, q2);
    });

    test("QuaternionRotationYawPitchRoll", () =>
    {
        let q2 = quaternion.rotationQuaternion(quaternion.create(), 0.0, 0.0, 0.0);
        assert.ok(quaternion.exactEquals(q2, quaternion.identityQuaternion(quaternion.create())));

        const yaw = 0.5;
        const pitch = 0.6;
        const roll = 0.7;
        const expected = q4(0.350018859, 0.123841502, 0.248718783, 0.894588768);

        q2 = quaternion.rotationQuaternion(quaternion.create(), yaw, pitch, roll);
        expectQuaternionEq(expected, q2);
    });

    test("QuaternionNormalize", () =>
    {
        const q = q4(1, 2, 3, 4);
        const expected = q4(0.18257418, 0.36514837, 0.54772258, 0.73029673);

        // gtest used EXPECT_EQ on float-computed values; JS computes in double
        // before the Float32 store, so the honest equivalent is FLOAT_EQ tolerance.
        const q2 = quaternion.normalize(quaternion.create(), q);
        expectQuaternionEq(expected, q2);
    });

    test("QuaternionInverse", () =>
    {
        const id = quaternion.identityQuaternion(quaternion.create());

        let q2 = quaternion.inverse(quaternion.create(), id);
        assert.ok(quaternion.exactEquals(id, q2));

        const q = q4(1, 2, 3, 4);
        const expected = q4(-0.033333331, -0.066666663, -0.099999994, 0.13333333);

        q2 = quaternion.inverse(quaternion.create(), q);
        expectQuaternionEq(expected, q2);
    });

    test("QuaternionExp", () =>
    {
        const zero = q4(0, 0, 0, 0);

        let q2 = quaternion.exp(quaternion.create(), zero);
        assert.ok(quaternion.exactEquals(quaternion.identityQuaternion(quaternion.create()), q2));

        const example = q4(1, 2, 3, 0);
        const expected = q4(-0.15092136, -0.30184272, -0.45276409, -0.82529902);

        q2 = quaternion.exp(quaternion.create(), example);
        expectQuaternionEq(expected, q2);
    });

    test("Slerp", () =>
    {
        const a = quaternion.normalize(quaternion.create(), q4(1, 2, 3, 4));
        const b = quaternion.normalize(quaternion.create(), q4(0.4, -0.3, 0.2, 0.1));

        let q2 = quaternion.slerp(quaternion.create(), a, b, 0.0);
        expectQuaternionEq(q2, a);

        q2 = quaternion.slerp(quaternion.create(), a, b, 1.0);
        expectQuaternionEq(b, q2);

        const half = q4(0.57353938, -0.11470790, 0.57353932, 0.57353932);

        q2 = quaternion.slerp(quaternion.create(), a, b, 0.5);
        expectQuaternionEq(half, q2);
    });

    // --- sanity additions beyond the gtest ports (2 of the allowed 5) ---

    test("sanity: slerp takes the linear branch inside Carbon's 0.001 threshold", () =>
    {
        const a = quaternion.normalize(quaternion.create(), q4(1, 2, 3, 4));
        const b = quaternion.clone(a);
        // dot(a, b) == 1, so 1 - dot <= 0.001: temp/u stay linear weights
        const q2 = quaternion.slerp(quaternion.create(), a, b, 0.25);
        expectQuaternionEq(a, q2);
    });

    test("sanity: axis-angle round-trips through getAxisAngle", () =>
    {
        const axis = new Float32Array([0, 0, 1]);
        const angle = 0.8;
        const q = quaternion.rotationQuaternion(quaternion.create(), axis, angle);
        const outAxis = new Float32Array(3);
        const outAngle = quaternion.getAxisAngle(outAxis, q);
        closeTo(outAngle, angle);
        // getAxisAngle returns the raw (x, y, z) = sin(angle/2) * axis, as Carbon does
        closeTo(outAxis[0], 0);
        closeTo(outAxis[1], 0);
        closeTo(outAxis[2], Math.sin(angle / 2));
    });
});
