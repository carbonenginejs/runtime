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

// gtest EXPECT_EQ on floats: exact at Float32 precision (both sides frounded,
// mirroring the C++ float compare)
function feq(actual, expected, message)
{
    assert.strictEqual(Math.fround(actual), Math.fround(expected), message);
}

function m4(...values)
{
    return matrix.set(new Float32Array(16), ...values);
}

function expectMatrixEq(expected, actual)
{
    for (let i = 0; i < 16; ++i)
    {
        closeTo(actual[i], expected[i], `[${i}]`);
    }
}

describe("Matrix", () =>
{
    test("Constructors", () =>
    {
        const mat1 = m4(
            11, 12, 13, 14,
            21, 22, 23, 24,
            31, 32, 33, 34,
            41, 42, 43, 44);
        for (let i = 0; i < 4; ++i)
        {
            for (let j = 0; j < 4; ++j)
            {
                assert.strictEqual(mat1[i * 4 + j], (i + 1) * 10 + (j + 1));
            }
        }

        const mat2 = matrix.clone(mat1);
        for (let i = 0; i < 4; ++i)
        {
            for (let j = 0; j < 4; ++j)
            {
                assert.strictEqual(mat2[i * 4 + j], (i + 1) * 10 + (j + 1));
            }
        }

        const elements = [
            11, 12, 13, 14,
            21, 22, 23, 24,
            31, 32, 33, 34,
            41, 42, 43, 44];
        const mat3 = new Float32Array(elements);
        for (let i = 0; i < 4; ++i)
        {
            for (let j = 0; j < 4; ++j)
            {
                assert.strictEqual(mat3[i * 4 + j], (i + 1) * 10 + (j + 1));
            }
        }
    });

    test("ElementAccess", () =>
    {
        const mat1 = m4(
            11, 12, 13, 14,
            21, 22, 23, 24,
            31, 32, 33, 34,
            41, 42, 43, 44);
        for (let i = 0; i < 4; ++i)
        {
            for (let j = 0; j < 4; ++j)
            {
                assert.strictEqual(mat1[i * 4 + j], (i + 1) * 10 + (j + 1));
            }
        }

        for (let i = 0; i < 4; ++i)
        {
            for (let j = 0; j < 4; ++j)
            {
                mat1[i * 4 + j] *= i + j;
                assert.strictEqual(mat1[i * 4 + j], ((i + 1) * 10 + (j + 1)) * (i + j));
            }
        }
    });

    test("Additions", () =>
    {
        const mat1 = m4(
            11, 12, 13, 14,
            21, 22, 23, 24,
            31, 32, 33, 34,
            41, 42, 43, 44);
        const mat2 = m4(
            55, 56, 57, 58,
            65, 66, 67, 68,
            75, 76, 77, 78,
            85, 86, 87, 88);

        matrix.add(mat1, mat1, mat2);
        for (let i = 0; i < 4; ++i)
        {
            for (let j = 0; j < 4; ++j)
            {
                const element = (i + 1) * 10 + (j + 1) + (i + 5) * 10 + (j + 5);
                assert.strictEqual(mat1[i * 4 + j], element);
            }
        }

        const mat3 = matrix.add(new Float32Array(16), mat1, mat2);
        for (let i = 0; i < 4; ++i)
        {
            for (let j = 0; j < 4; ++j)
            {
                assert.strictEqual(mat3[i * 4 + j], mat1[i * 4 + j] + mat2[i * 4 + j]);
            }
        }
    });

    test("Subtractions", () =>
    {
        const mat1 = m4(
            11, 12, 13, 14,
            21, 22, 23, 24,
            31, 32, 33, 34,
            41, 42, 43, 44);

        const elements = new Array(16);
        for (let i = 0; i < 16; ++i)
        {
            elements[i] = 16 - i;
        }
        const mat2 = new Float32Array(elements);

        matrix.subtract(mat1, mat1, mat2);
        for (let i = 0; i < 4; ++i)
        {
            for (let j = 0; j < 4; ++j)
            {
                assert.strictEqual(mat1[i * 4 + j], (i + 1) * 10 + (j + 1) - mat2[i * 4 + j]);
            }
        }

        const mat3 = matrix.subtract(new Float32Array(16), mat1, mat2);
        for (let i = 0; i < 4; ++i)
        {
            for (let j = 0; j < 4; ++j)
            {
                assert.strictEqual(mat3[i * 4 + j], mat1[i * 4 + j] - mat2[i * 4 + j]);
            }
        }
    });

    test("Scaling", () =>
    {
        const mat1 = m4(
            11, 12, 13, 14,
            21, 22, 23, 24,
            31, 32, 33, 34,
            41, 42, 43, 44);

        matrix.scale(mat1, mat1, 0.5);
        for (let i = 0; i < 4; ++i)
        {
            for (let j = 0; j < 4; ++j)
            {
                assert.strictEqual(mat1[i * 4 + j], ((i + 1) * 10 + (j + 1)) * 0.5);
            }
        }

        const mat2 = matrix.scale(new Float32Array(16), mat1, 10);
        for (let i = 0; i < 4; ++i)
        {
            for (let j = 0; j < 4; ++j)
            {
                assert.strictEqual(mat2[i * 4 + j], ((i + 1) * 10 + (j + 1)) * 5);
            }
        }

        matrix.divide(mat2, mat2, 2);
        for (let i = 0; i < 4; ++i)
        {
            for (let j = 0; j < 4; ++j)
            {
                assert.strictEqual(mat2[i * 4 + j], ((i + 1) * 10 + (j + 1)) * 2.5);
            }
        }

        const mat3 = matrix.divide(new Float32Array(16), mat2, 0.1);
        for (let i = 0; i < 4; ++i)
        {
            for (let j = 0; j < 4; ++j)
            {
                feq(mat3[i * 4 + j], ((i + 1) * 10 + (j + 1)) * 25);
            }
        }

        matrix.scale(mat2, mat2, 0);
        for (let i = 0; i < 4; ++i)
        {
            for (let j = 0; j < 4; ++j)
            {
                assert.strictEqual(mat2[i * 4 + j], 0);
            }
        }

        matrix.divide(mat3, mat3, mat2[0]);
        for (let i = 0; i < 4; ++i)
        {
            for (let j = 0; j < 4; ++j)
            {
                assert.ok(!Number.isFinite(mat3[i * 4 + j]));
            }
        }

        const mat4 = matrix.scale(new Float32Array(16), mat1, 3);
        for (let i = 0; i < 4; ++i)
        {
            for (let j = 0; j < 4; ++j)
            {
                assert.strictEqual(mat4[i * 4 + j], ((i + 1) * 10 + (j + 1)) * 1.5);
            }
        }
    });

    test("Signs", () =>
    {
        const mat1 = m4(
            11, 12, 13, 14,
            21, 22, 23, 24,
            31, 32, 33, 34,
            41, 42, 43, 44);

        const mat2 = matrix.clone(mat1);
        for (let i = 0; i < 16; ++i)
        {
            assert.strictEqual(mat2[i], mat1[i]);
        }

        const mat3 = matrix.negate(new Float32Array(16), mat1);
        for (let i = 0; i < 16; ++i)
        {
            assert.strictEqual(mat3[i], -mat1[i]);
        }
    });

    test("Comparisons", () =>
    {
        const mat1 = m4(
            11, 12, 13, 14,
            21, 22, 23, 24,
            31, 32, 33, 34,
            41, 42, 43, 44);
        const mat2 = m4(
            11, 12, 13, 14,
            21, 22, 23, 24,
            31, 32, 33, 34,
            41, 42, 43, 44);
        const mat3 = m4(
            55, 56, 57, 58,
            65, 66, 67, 68,
            75, 76, 77, 78,
            85, 86, 87, 88);

        assert.ok(matrix.exactEquals(mat1, mat2));
        assert.ok(!matrix.exactEquals(mat1, mat3));
        assert.ok(!(!matrix.exactEquals(mat1, mat2)));
        assert.ok(!matrix.exactEquals(mat2, mat3));

        for (let i = 0; i < 4; ++i)
        {
            for (let j = 0; j < 4; ++j)
            {
                const mat4 = matrix.clone(mat1);
                mat4[i * 4 + j] += 1;
                assert.ok(!matrix.exactEquals(mat4, mat1));
                assert.ok(!matrix.exactEquals(mat4, mat1));
            }
        }
    });

    test("Translation", () =>
    {
        const mat1 = m4(
            11, 12, 13, 14,
            21, 22, 23, 24,
            31, 32, 33, 34,
            41, 42, 43, 44);
        const mat2 = matrix.clone(mat1);

        const t = matrix.getTranslation([0, 0, 0], mat1);
        assert.deepStrictEqual(t, [41, 42, 43]);
        matrix.viewTranslation(mat2)[0] = 123;
        assert.deepStrictEqual(matrix.getTranslation([0, 0, 0], mat2), [123, 42, 43]);
    });

    test("XRow", () =>
    {
        const mat1 = m4(
            11, 12, 13, 14,
            21, 22, 23, 24,
            31, 32, 33, 34,
            41, 42, 43, 44);
        const mat2 = matrix.clone(mat1);

        assert.deepStrictEqual(matrix.getX([0, 0, 0], mat1), [11, 12, 13]);
        matrix.viewX(mat2)[0] = 123;
        assert.deepStrictEqual(matrix.getX([0, 0, 0], mat2), [123, 12, 13]);
    });

    test("YRow", () =>
    {
        const mat1 = m4(
            11, 12, 13, 14,
            21, 22, 23, 24,
            31, 32, 33, 34,
            41, 42, 43, 44);
        const mat2 = matrix.clone(mat1);

        assert.deepStrictEqual(matrix.getY([0, 0, 0], mat1), [21, 22, 23]);
        matrix.viewY(mat2)[0] = 123;
        assert.deepStrictEqual(matrix.getY([0, 0, 0], mat2), [123, 22, 23]);
    });

    test("ZRow", () =>
    {
        const mat1 = m4(
            11, 12, 13, 14,
            21, 22, 23, 24,
            31, 32, 33, 34,
            41, 42, 43, 44);
        const mat2 = matrix.clone(mat1);

        assert.deepStrictEqual(matrix.getZ([0, 0, 0], mat1), [31, 32, 33]);
        matrix.viewZ(mat2)[0] = 123;
        assert.deepStrictEqual(matrix.getZ([0, 0, 0], mat2), [123, 32, 33]);
    });

    test("MatrixIdentity", () =>
    {
        const mat2 = matrix.identityMatrix(new Float32Array(16));
        for (let i = 0; i < 4; ++i)
        {
            for (let j = 0; j < 4; ++j)
            {
                assert.strictEqual(mat2[i * 4 + j], i === j ? 1 : 0);
            }
        }
    });

    test("MatrixDeterminant", () =>
    {
        const mat1 = m4(
            11, 12, 13, 14,
            21, 22, 23, 24,
            31, 32, 33, 34,
            41, 42, 43, 44);

        assert.strictEqual(matrix.determinant(mat1), 0);

        assert.strictEqual(matrix.determinant(matrix.create()), 1);
    });

    test("MatrixTranspose", () =>
    {
        const mat1 = m4(
            11, 12, 13, 14,
            21, 22, 23, 24,
            31, 32, 33, 34,
            41, 42, 43, 44);

        const mat3 = matrix.transpose(new Float32Array(16), mat1);
        for (let i = 0; i < 4; ++i)
        {
            for (let j = 0; j < 4; ++j)
            {
                assert.strictEqual(mat3[j * 4 + i], mat1[i * 4 + j]);
            }
        }
    });

    test("MatrixMultiply", () =>
    {
        const mat1 = m4(
            11, 12, 13, 14,
            21, 22, 23, 24,
            31, 32, 33, 34,
            41, 42, 43, 44);
        const mat2 = m4(
            55, 56, 57, 58,
            65, 66, 67, 68,
            75, 76, 77, 78,
            85, 86, 87, 88);

        const mat12 = m4(
            3550, 3600, 3650, 3700,
            6350, 6440, 6530, 6620,
            9150, 9280, 9410, 9540,
            11950, 12120, 12290, 12460);
        const mat11 = m4(
            1350, 1400, 1450, 1500,
            2390, 2480, 2570, 2660,
            3430, 3560, 3690, 3820,
            4470, 4640, 4810, 4980);

        const mat3 = matrix.multiply(new Float32Array(16), mat1, mat2);
        for (let i = 0; i < 16; ++i)
        {
            assert.strictEqual(mat3[i], mat12[i]);
        }

        const mat4 = matrix.clone(mat1);
        matrix.multiply(mat4, mat4, mat4);
        for (let i = 0; i < 16; ++i)
        {
            assert.strictEqual(mat4[i], mat11[i]);
        }
    });

    test("MatrixInverse", () =>
    {
        const mat1 = matrix.create();
        const mat2 = new Float32Array(16);
        const det1 = matrix.inverseDet(mat2, mat1);
        assert.ok(det1);
        assert.strictEqual(det1, 1);
        assert.ok(matrix.exactEquals(mat2, mat1));

        const mat3 = new Float32Array(16);
        assert.ok(matrix.inverseDet(mat3, mat1));
        assert.ok(matrix.exactEquals(mat3, mat1));

        let mat4 = matrix.inverse(new Float32Array(16), mat1);
        assert.ok(matrix.exactEquals(mat4, mat1));

        const mat6 = m4(
            9.45227336883545, 0, 0, 0,
            0, 6.616590976715088, 0, 0,
            0, 0, 1.001001000404358, 1,
            0, 0, -0.10010010004043579, 0);
        const mat6inv = m4(
            0.10579466074705124, 0, 0, 0,
            0, 0.15113522112369537, 0, 0,
            0, 0, 0, -9.989999771118164,
            0, 0, 1, 10);

        // gtest compared these with EXPECT_EQ on float-computed values; JS
        // computes in double before the Float32 store, so the honest
        // equivalent here is EXPECT_FLOAT_EQ tolerance.
        const det2 = matrix.inverseDet(mat2, mat6);
        assert.ok(det2);
        closeTo(det2, 6.260443210601807);
        expectMatrixEq(mat6inv, mat2);

        assert.ok(matrix.inverseDet(mat3, mat6));
        expectMatrixEq(mat6inv, mat3);

        mat4 = matrix.inverse(new Float32Array(16), mat6);
        expectMatrixEq(mat6inv, mat4);
    });

    test("MatrixScaling", () =>
    {
        const mat2 = matrix.scalingMatrix(new Float32Array(16), 4, 3, 2);
        for (let i = 0; i < 4; ++i)
        {
            for (let j = 0; j < 4; ++j)
            {
                assert.strictEqual(mat2[i * 4 + j], i === j ? (4 - i) : 0);
            }
        }
    });

    test("MatrixTranslation", () =>
    {
        const mat2 = matrix.translationMatrix(new Float32Array(16), 4, 3, 2);
        for (let i = 0; i < 4; ++i)
        {
            for (let j = 0; j < 4; ++j)
            {
                if (i === 3)
                {
                    assert.strictEqual(mat2[i * 4 + j], 4 - j);
                }
                else
                {
                    assert.strictEqual(mat2[i * 4 + j], i === j ? 1 : 0);
                }
            }
        }
    });

    test("MatrixRotationX", () =>
    {
        const rot03 = m4(
            1, 0, 0, 0,
            0, 0.9553365111351013, 0.29552021622657776, 0,
            0, -0.29552021622657776, 0.9553365111351013, 0,
            0, 0, 0, 1);

        expectMatrixEq(rot03, matrix.rotationXMatrix(new Float32Array(16), 0.3));
    });

    test("MatrixRotationY", () =>
    {
        const rot04 = m4(
            0.9210609793663025, 0, -0.3894183337688446, 0,
            0, 1, 0, 0,
            0.3894183337688446, 0, 0.9210609793663025, 0,
            0, 0, 0, 1);

        expectMatrixEq(rot04, matrix.rotationYMatrix(new Float32Array(16), 0.4));
    });

    test("MatrixRotationZ", () =>
    {
        const rot05 = m4(
            0.8775825500488281, 0.4794255495071411, 0, 0,
            -0.4794255495071411, 0.8775825500488281, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1);

        expectMatrixEq(rot05, matrix.rotationZMatrix(new Float32Array(16), 0.5));
    });

    test("MatrixRotationAxis", () =>
    {
        const axis = new Float32Array([1, 2, 3]);
        const result = m4(
            0.9585267305374146, 0.24332378804683685, -0.148391455411911, 0,
            -0.23056279122829437, 0.9680975079536438, 0.0981225893, 0,
            0.16753295063972473, -0.059839606285095215, 0.9840487241744995, 0,
            0, 0, 0, 1);

        expectMatrixEq(result, matrix.rotationMatrix(new Float32Array(16), axis, 0.3));
    });

    test("MatrixRotationQuaternion", () =>
    {
        const q2 = quaternion.set(quaternion.create(), 1, 2, 3, 4);
        const result = m4(
            -25, 28, -10, 0,
            -20, -19, 20, 0,
            22, 4, -9, 0,
            0, 0, 0, 1);

        expectMatrixEq(result, matrix.rotationMatrix(new Float32Array(16), q2));
    });

    // --- sanity additions beyond the gtest ports (3 of the allowed 5) ---

    test("sanity: three-operand multiply chain matches a hand-computed product", () =>
    {
        // Carbon row-vector: S(2,3,4) * T(1,2,3) * T(10,20,30) scales first,
        // then translates twice: diag(2,3,4), row 4 = (11, 22, 33, 1).
        const s = matrix.scalingMatrix(new Float32Array(16), 2, 3, 4);
        const t1 = matrix.translationMatrix(new Float32Array(16), 1, 2, 3);
        const t2 = matrix.translationMatrix(new Float32Array(16), 10, 20, 30);
        const out = matrix.multiply(new Float32Array(16), s, t1);
        matrix.multiply(out, out, t2);
        const expected = m4(
            2, 0, 0, 0,
            0, 3, 0, 0,
            0, 0, 4, 0,
            11, 22, 33, 1);
        assert.ok(matrix.exactEquals(out, expected));
    });

    test("sanity: decompose recovers transformationMatrix inputs", () =>
    {
        const scaling = new Float32Array([2, 3, 4]);
        const rotation = quaternion.rotationQuaternion(quaternion.create(), new Float32Array([0, 0, 1]), 0.5);
        const translation = new Float32Array([5, 6, 7]);
        const m = matrix.transformationMatrix(new Float32Array(16), scaling, rotation, translation);

        const outS = new Float32Array(3);
        const outR = new Float32Array(4);
        const outT = new Float32Array(3);
        matrix.decompose(outS, outR, outT, m);
        for (let i = 0; i < 3; ++i)
        {
            closeTo(outS[i], scaling[i]);
            closeTo(outT[i], translation[i]);
        }
        for (let i = 0; i < 4; ++i)
        {
            closeTo(outR[i], rotation[i]);
        }
    });

    test("sanity: transformCoords strided batch matches transformCoord", () =>
    {
        const m = matrix.transformationMatrix(
            new Float32Array(16),
            new Float32Array([2, 3, 4]),
            quaternion.rotationQuaternion(quaternion.create(), new Float32Array([1, 2, 3]), 0.7),
            new Float32Array([5, -6, 7]));
        const input = new Float32Array(2 + 3 * 5);
        const points = [[1, 2, 3], [-4, 5, -6], [0.5, -0.25, 8]];
        for (let i = 0; i < 3; ++i)
        {
            input.set(points[i], 2 + i * 5);
        }
        const output = new Float32Array(1 + 3 * 4);
        matrix.transformCoords(output, 1, 4, input, 2, 5, 3, m);
        for (let i = 0; i < 3; ++i)
        {
            const single = matrix.transformCoord(new Float32Array(3), new Float32Array(points[i]), m);
            for (let k = 0; k < 3; ++k)
            {
                assert.strictEqual(output[1 + i * 4 + k], single[k]);
            }
        }
    });
});
