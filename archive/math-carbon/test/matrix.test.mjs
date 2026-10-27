import { describe, test } from "node:test";
import assert from "node:assert";
import { Matrix, Quaternion } from "../src/index.js";

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
    return Matrix.set(new Float32Array(16), ...values);
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

        const mat2 = Matrix.clone(mat1);
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

        Matrix.add(mat1, mat1, mat2);
        for (let i = 0; i < 4; ++i)
        {
            for (let j = 0; j < 4; ++j)
            {
                const element = (i + 1) * 10 + (j + 1) + (i + 5) * 10 + (j + 5);
                assert.strictEqual(mat1[i * 4 + j], element);
            }
        }

        const mat3 = Matrix.add(new Float32Array(16), mat1, mat2);
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

        Matrix.subtract(mat1, mat1, mat2);
        for (let i = 0; i < 4; ++i)
        {
            for (let j = 0; j < 4; ++j)
            {
                assert.strictEqual(mat1[i * 4 + j], (i + 1) * 10 + (j + 1) - mat2[i * 4 + j]);
            }
        }

        const mat3 = Matrix.subtract(new Float32Array(16), mat1, mat2);
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

        Matrix.scale(mat1, mat1, 0.5);
        for (let i = 0; i < 4; ++i)
        {
            for (let j = 0; j < 4; ++j)
            {
                assert.strictEqual(mat1[i * 4 + j], ((i + 1) * 10 + (j + 1)) * 0.5);
            }
        }

        const mat2 = Matrix.scale(new Float32Array(16), mat1, 10);
        for (let i = 0; i < 4; ++i)
        {
            for (let j = 0; j < 4; ++j)
            {
                assert.strictEqual(mat2[i * 4 + j], ((i + 1) * 10 + (j + 1)) * 5);
            }
        }

        Matrix.divide(mat2, mat2, 2);
        for (let i = 0; i < 4; ++i)
        {
            for (let j = 0; j < 4; ++j)
            {
                assert.strictEqual(mat2[i * 4 + j], ((i + 1) * 10 + (j + 1)) * 2.5);
            }
        }

        const mat3 = Matrix.divide(new Float32Array(16), mat2, 0.1);
        for (let i = 0; i < 4; ++i)
        {
            for (let j = 0; j < 4; ++j)
            {
                feq(mat3[i * 4 + j], ((i + 1) * 10 + (j + 1)) * 25);
            }
        }

        Matrix.scale(mat2, mat2, 0);
        for (let i = 0; i < 4; ++i)
        {
            for (let j = 0; j < 4; ++j)
            {
                assert.strictEqual(mat2[i * 4 + j], 0);
            }
        }

        Matrix.divide(mat3, mat3, mat2[0]);
        for (let i = 0; i < 4; ++i)
        {
            for (let j = 0; j < 4; ++j)
            {
                assert.ok(!Number.isFinite(mat3[i * 4 + j]));
            }
        }

        const mat4 = Matrix.scale(new Float32Array(16), mat1, 3);
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

        const mat2 = Matrix.clone(mat1);
        for (let i = 0; i < 16; ++i)
        {
            assert.strictEqual(mat2[i], mat1[i]);
        }

        const mat3 = Matrix.negate(new Float32Array(16), mat1);
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

        assert.ok(Matrix.exactEquals(mat1, mat2));
        assert.ok(!Matrix.exactEquals(mat1, mat3));
        assert.ok(!(!Matrix.exactEquals(mat1, mat2)));
        assert.ok(!Matrix.exactEquals(mat2, mat3));

        for (let i = 0; i < 4; ++i)
        {
            for (let j = 0; j < 4; ++j)
            {
                const mat4 = Matrix.clone(mat1);
                mat4[i * 4 + j] += 1;
                assert.ok(!Matrix.exactEquals(mat4, mat1));
                assert.ok(!Matrix.exactEquals(mat4, mat1));
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
        const mat2 = Matrix.clone(mat1);

        const t = Matrix.getTranslation([0, 0, 0], mat1);
        assert.deepStrictEqual(t, [41, 42, 43]);
        Matrix.viewTranslation(mat2)[0] = 123;
        assert.deepStrictEqual(Matrix.getTranslation([0, 0, 0], mat2), [123, 42, 43]);
    });

    test("XRow", () =>
    {
        const mat1 = m4(
            11, 12, 13, 14,
            21, 22, 23, 24,
            31, 32, 33, 34,
            41, 42, 43, 44);
        const mat2 = Matrix.clone(mat1);

        assert.deepStrictEqual(Matrix.getX([0, 0, 0], mat1), [11, 12, 13]);
        Matrix.viewX(mat2)[0] = 123;
        assert.deepStrictEqual(Matrix.getX([0, 0, 0], mat2), [123, 12, 13]);
    });

    test("YRow", () =>
    {
        const mat1 = m4(
            11, 12, 13, 14,
            21, 22, 23, 24,
            31, 32, 33, 34,
            41, 42, 43, 44);
        const mat2 = Matrix.clone(mat1);

        assert.deepStrictEqual(Matrix.getY([0, 0, 0], mat1), [21, 22, 23]);
        Matrix.viewY(mat2)[0] = 123;
        assert.deepStrictEqual(Matrix.getY([0, 0, 0], mat2), [123, 22, 23]);
    });

    test("ZRow", () =>
    {
        const mat1 = m4(
            11, 12, 13, 14,
            21, 22, 23, 24,
            31, 32, 33, 34,
            41, 42, 43, 44);
        const mat2 = Matrix.clone(mat1);

        assert.deepStrictEqual(Matrix.getZ([0, 0, 0], mat1), [31, 32, 33]);
        Matrix.viewZ(mat2)[0] = 123;
        assert.deepStrictEqual(Matrix.getZ([0, 0, 0], mat2), [123, 32, 33]);
    });

    test("MatrixIdentity", () =>
    {
        const mat2 = Matrix.identityMatrix(new Float32Array(16));
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

        assert.strictEqual(Matrix.determinant(mat1), 0);

        assert.strictEqual(Matrix.determinant(Matrix.create()), 1);
    });

    test("MatrixTranspose", () =>
    {
        const mat1 = m4(
            11, 12, 13, 14,
            21, 22, 23, 24,
            31, 32, 33, 34,
            41, 42, 43, 44);

        const mat3 = Matrix.transpose(new Float32Array(16), mat1);
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

        const mat3 = Matrix.multiply(new Float32Array(16), mat1, mat2);
        for (let i = 0; i < 16; ++i)
        {
            assert.strictEqual(mat3[i], mat12[i]);
        }

        const mat4 = Matrix.clone(mat1);
        Matrix.multiply(mat4, mat4, mat4);
        for (let i = 0; i < 16; ++i)
        {
            assert.strictEqual(mat4[i], mat11[i]);
        }
    });

    test("MatrixInverse", () =>
    {
        const mat1 = Matrix.create();
        const mat2 = new Float32Array(16);
        const det1 = Matrix.inverse__Det(mat2, mat1);
        assert.ok(det1);
        assert.strictEqual(det1, 1);
        assert.ok(Matrix.exactEquals(mat2, mat1));

        const mat3 = new Float32Array(16);
        assert.ok(Matrix.inverse__Det(mat3, mat1));
        assert.ok(Matrix.exactEquals(mat3, mat1));

        let mat4 = Matrix.inverse(new Float32Array(16), mat1);
        assert.ok(Matrix.exactEquals(mat4, mat1));

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
        const det2 = Matrix.inverse__Det(mat2, mat6);
        assert.ok(det2);
        closeTo(det2, 6.260443210601807);
        expectMatrixEq(mat6inv, mat2);

        assert.ok(Matrix.inverse__Det(mat3, mat6));
        expectMatrixEq(mat6inv, mat3);

        mat4 = Matrix.inverse(new Float32Array(16), mat6);
        expectMatrixEq(mat6inv, mat4);
    });

    test("MatrixScaling", () =>
    {
        const mat2 = Matrix.scalingMatrix(new Float32Array(16), 4, 3, 2);
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
        const mat2 = Matrix.translationMatrix(new Float32Array(16), 4, 3, 2);
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

        expectMatrixEq(rot03, Matrix.rotationXMatrix(new Float32Array(16), 0.3));
    });

    test("MatrixRotationY", () =>
    {
        const rot04 = m4(
            0.9210609793663025, 0, -0.3894183337688446, 0,
            0, 1, 0, 0,
            0.3894183337688446, 0, 0.9210609793663025, 0,
            0, 0, 0, 1);

        expectMatrixEq(rot04, Matrix.rotationYMatrix(new Float32Array(16), 0.4));
    });

    test("MatrixRotationZ", () =>
    {
        const rot05 = m4(
            0.8775825500488281, 0.4794255495071411, 0, 0,
            -0.4794255495071411, 0.8775825500488281, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1);

        expectMatrixEq(rot05, Matrix.rotationZMatrix(new Float32Array(16), 0.5));
    });

    test("MatrixRotationAxis", () =>
    {
        const axis = new Float32Array([1, 2, 3]);
        const result = m4(
            0.9585267305374146, 0.24332378804683685, -0.148391455411911, 0,
            -0.23056279122829437, 0.9680975079536438, 0.0981225893, 0,
            0.16753295063972473, -0.059839606285095215, 0.9840487241744995, 0,
            0, 0, 0, 1);

        expectMatrixEq(result, Matrix.rotationMatrix(new Float32Array(16), axis, 0.3));
    });

    test("MatrixRotationQuaternion", () =>
    {
        const q2 = Quaternion.set(Quaternion.create(), 1, 2, 3, 4);
        const result = m4(
            -25, 28, -10, 0,
            -20, -19, 20, 0,
            22, 4, -9, 0,
            0, 0, 0, 1);

        expectMatrixEq(result, Matrix.rotationMatrix(new Float32Array(16), q2));
    });

    // --- sanity additions beyond the gtest ports (3 of the allowed 5) ---

    test("sanity: three-operand multiply chain matches a hand-computed product", () =>
    {
        // Carbon row-vector: S(2,3,4) * T(1,2,3) * T(10,20,30) scales first,
        // then translates twice: diag(2,3,4), row 4 = (11, 22, 33, 1).
        const s = Matrix.scalingMatrix(new Float32Array(16), 2, 3, 4);
        const t1 = Matrix.translationMatrix(new Float32Array(16), 1, 2, 3);
        const t2 = Matrix.translationMatrix(new Float32Array(16), 10, 20, 30);
        const out = Matrix.multiply(new Float32Array(16), s, t1);
        Matrix.multiply(out, out, t2);
        const expected = m4(
            2, 0, 0, 0,
            0, 3, 0, 0,
            0, 0, 4, 0,
            11, 22, 33, 1);
        assert.ok(Matrix.exactEquals(out, expected));
    });

    test("sanity: decompose recovers transformationMatrix inputs", () =>
    {
        const scaling = new Float32Array([2, 3, 4]);
        const rotation = Quaternion.rotationQuaternion(Quaternion.create(), new Float32Array([0, 0, 1]), 0.5);
        const translation = new Float32Array([5, 6, 7]);
        const m = Matrix.transformationMatrix(new Float32Array(16), scaling, rotation, translation);

        const outS = new Float32Array(3);
        const outR = new Float32Array(4);
        const outT = new Float32Array(3);
        Matrix.decompose(outS, outR, outT, m);
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
        const m = Matrix.transformationMatrix(
            new Float32Array(16),
            new Float32Array([2, 3, 4]),
            Quaternion.rotationQuaternion(Quaternion.create(), new Float32Array([1, 2, 3]), 0.7),
            new Float32Array([5, -6, 7]));
        const input = new Float32Array(2 + 3 * 5);
        const points = [[1, 2, 3], [-4, 5, -6], [0.5, -0.25, 8]];
        for (let i = 0; i < 3; ++i)
        {
            input.set(points[i], 2 + i * 5);
        }
        const output = new Float32Array(1 + 3 * 4);
        Matrix.transformCoords(output, 1, 4, input, 2, 5, 3, m);
        for (let i = 0; i < 3; ++i)
        {
            const single = Matrix.transformCoord(new Float32Array(3), new Float32Array(points[i]), m);
            for (let k = 0; k < 3; ++k)
            {
                assert.strictEqual(output[1 + i * 4 + k], single[k]);
            }
        }
    });
});

describe("overload variants (rule 11)", () =>
{
    test("inverse__Out reports singularity and leaves out untouched, as inverse__Det does", () =>
    {
        const m = m4(2, 0, 0, 0, 0, 4, 0, 0, 0, 0, 8, 0, 1, 2, 3, 1);
        const viaOut = new Float32Array(16);
        const viaDet = new Float32Array(16);
        assert.strictEqual(Matrix.inverse__Out(viaOut, m), true);
        Matrix.inverse__Det(viaDet, m);
        assert.ok(Matrix.exactEquals(viaOut, viaDet));
        const singular = new Float32Array(16);
        const out = new Float32Array(16).fill(5);
        assert.strictEqual(Matrix.inverse__Out(out, singular), false);
        assert.ok(out.every(x => x === 5));
    });

    test("each router returns exactly what its specific variant returns", () =>
    {
        const v = new Float32Array([2, -3, 0.5]);
        const q = Quaternion.normalize(new Float32Array(4), new Float32Array([0.1, 0.2, 0.3, 0.9]));
        const m = m4(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16);
        const pairs = [
            [ Matrix.translationMatrix(new Float32Array(16), 2, -3, 0.5), Matrix.translationMatrix__XYZ(new Float32Array(16), 2, -3, 0.5) ],
            [ Matrix.translationMatrix(new Float32Array(16), v), Matrix.translationMatrix__Vector3(new Float32Array(16), v) ],
            [ Matrix.scalingMatrix(new Float32Array(16), 2, -3, 0.5), Matrix.scalingMatrix__XYZ(new Float32Array(16), 2, -3, 0.5) ],
            [ Matrix.scalingMatrix(new Float32Array(16), v), Matrix.scalingMatrix__Vector3(new Float32Array(16), v) ],
            [ Matrix.rotationMatrix(new Float32Array(16), q), Matrix.rotationMatrix__Quaternion(new Float32Array(16), q) ],
            [ Matrix.rotationMatrix(new Float32Array(16), v, 0.7), Matrix.rotationMatrix__AxisAngle(new Float32Array(16), v, 0.7) ],
            [ Matrix.transform(new Float32Array(4), new Float32Array([1, 2, 3, 4]), m), Matrix.transform__Vector4(new Float32Array(4), new Float32Array([1, 2, 3, 4]), m) ],
            [ Matrix.transform(new Float32Array(4), v, m), Matrix.transform__Vector3(new Float32Array(4), v, m) ],
            [ Matrix.transform(new Float32Array(4), new Float32Array([1, 2]), m), Matrix.transform__Vector2(new Float32Array(4), new Float32Array([1, 2]), m) ]
        ];
        for (const [ routed, specific ] of pairs)
        {
            assert.deepStrictEqual(Array.from(routed), Array.from(specific));
        }
    });

    test("transform throws for a point length no Carbon overload takes", () =>
    {
        assert.throws(() => Matrix.transform(new Float32Array(4), new Float32Array(5), Matrix.create()), TypeError);
        assert.throws(() => Matrix.transform(new Float32Array(4), new Float32Array(1), Matrix.create()), TypeError);
    });
});
