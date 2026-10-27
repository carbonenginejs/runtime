import { describe, test } from "node:test";
import assert from "node:assert";
import { Matrix, Quaternion, Vector3, triMath } from "../src/index.js";
import { noise } from "../../../src/global/math/noise.js";

// Carbon has no TriMath tests, so these check identities the functions must satisfy
// and agreement with the independent production ports where one exists.

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
const unitQ = () => Quaternion.normalize(new Float32Array(4), new Float32Array([0.2, -0.4, 0.3, 0.8]));
const someMatrix = () => Matrix.transformationMatrix(new Float32Array(16), v3(2, 3, 4), unitQ(), v3(5, -6, 7));

describe("triMath vectors", () =>
{
    test("triVectorRotateQuaternion matches the rotation matrix", () =>
    {
        const q = unitQ(), v = v3(1, -2, 3);
        const expected = Matrix.transformNormal(v3(0, 0, 0), v, Matrix.rotationMatrix__Quaternion(new Float32Array(16), q));
        closeToArray(triMath.triVectorRotateQuaternion(v3(0, 0, 0), v, q), expected);
    });

    test("triVectorRotatedBasisQuaternion rotates each unit axis as triVectorRotateQuaternion does", () =>
    {
        const q = unitQ();
        const axes = [ v3(1, 0, 0), v3(0, 1, 0), v3(0, 0, 1) ];
        for (const axis of [ triMath.TRITRANSFORMAXIS.TRITA_X, triMath.TRITRANSFORMAXIS.TRITA_Y, triMath.TRITRANSFORMAXIS.TRITA_Z ])
        {
            closeToArray(triMath.triVectorRotatedBasisQuaternion(v3(0, 0, 0), axis, q),
                triMath.triVectorRotateQuaternion(v3(0, 0, 0), axes[axis], q));
        }
    });

    test("triVectorRotatedBasisMatrix returns the basis row", () =>
    {
        const m = someMatrix();
        assert.deepStrictEqual(Array.from(triMath.triVectorRotatedBasisMatrix(v3(0, 0, 0), 1, m)), Array.from(m.subarray(4, 7)));
    });

    test("projection lands on the plane; rotate-to-plane keeps the distance from p0", () =>
    {
        const p0 = v3(1, 2, 3), n = Vector3.normalize(v3(0, 0, 0), v3(1, 1, 0)), point = v3(4, -1, 6);
        const projected = triMath.triVectorProjectOnPlane(v3(0, 0, 0), point, p0, n);
        closeTo(Vector3.dot(Vector3.subtract(v3(0, 0, 0), projected, p0), n), 0, 1e-5);
        const rotated = triMath.triVectorRotateToPlane(v3(0, 0, 0), point, p0, n);
        closeTo(Vector3.dot(Vector3.subtract(v3(0, 0, 0), rotated, p0), n), 0, 1e-5);
        closeTo(Vector3.length(Vector3.subtract(v3(0, 0, 0), rotated, p0)), Vector3.length(Vector3.subtract(v3(0, 0, 0), point, p0)));
    });

    test("exponential decay: the __Time variants equal the __Pow variants given e^(-k t / m)", () =>
    {
        const x = v3(1, 2, 3), v = v3(-4, 5, 0.5), a = v3(0, -9.8, 1), m = 2, k = 0.7, t = 1.3;
        const pow = Math.fround(Math.pow(triMath.TRI_E, -k * t / m));
        assert.deepStrictEqual(
            triMath.triVectorExponentialDecayInteger__Time(v3(0, 0, 0), x, v, a, m, k, t),
            triMath.triVectorExponentialDecayInteger__Pow(v3(0, 0, 0), x, v, a, m, k, t, pow));
        assert.deepStrictEqual(
            triMath.triVectorExponentialDecay__Time(v3(0, 0, 0), v, a, m, k, t),
            triMath.triVectorExponentialDecay__Pow(v3(0, 0, 0), v, a, k, pow));
        // at t = 0 position and velocity are the initial ones
        closeToArray(triMath.triVectorExponentialDecayInteger__Time(v3(0, 0, 0), x, v, a, m, k, 0), x);
        closeToArray(triMath.triVectorExponentialDecay__Time(v3(0, 0, 0), v, a, m, k, 0), v);
    });
});

describe("triMath quaternions", () =>
{
    test("triQuaternionSqrt squared is the input", () =>
    {
        const q = unitQ();
        const root = triMath.triQuaternionSqrt(new Float32Array(4), q);
        closeToArray(Quaternion.multiply(new Float32Array(4), root, root), q);
    });

    test("triQuaternionRotationArc rotates v1's direction onto v2's", () =>
    {
        const v1 = v3(1, 2, -0.5), v2 = v3(-3, 0.25, 2);
        const q = triMath.triQuaternionRotationArc(new Float32Array(4), v1, v2);
        const rotated = triMath.triVectorRotateQuaternion(v3(0, 0, 0), Vector3.normalize(v3(0, 0, 0), v1), q);
        closeToArray(rotated, Vector3.normalize(v3(0, 0, 0), v2), 1e-4);
    });

    test("arc-from-forward quaternion and matrix both take -Z to v", () =>
    {
        for (const v of [ v3(0.3, -0.2, 0.9), v3(-1, 0.5, -2), v3(0, 0, 1) ])
        {
            const target = Vector3.normalize(v3(0, 0, 0), v);
            const q = triMath.triQuaternionArcFromForward(new Float32Array(4), v);
            closeToArray(triMath.triVectorRotateQuaternion(v3(0, 0, 0), v3(0, 0, -1), q), target, 1e-4);
            const m = triMath.triMatrixArcFromForward(new Float32Array(16), v);
            closeToArray(Matrix.transformNormal(v3(0, 0, 0), v3(0, 0, -1), m), target, 1e-4);
        }
    });

    test("triQuaternionToYawPitchRoll keeps its documented ranges", () =>
    {
        const out = new Float32Array(3);
        for (const q of [ unitQ(), Quaternion.normalize(new Float32Array(4), new Float32Array([-0.7, 0.1, 0.2, 0.3])) ])
        {
            triMath.triQuaternionToYawPitchRoll(out, q);
            assert.ok(out[0] >= 0 && out[0] < 2 * Math.PI + 1e-5, `yaw ${out[0]}`);
            assert.ok(Math.abs(out[1]) <= Math.PI / 2 + 1e-5, `pitch ${out[1]}`);
            assert.ok(Math.abs(out[2]) <= Math.PI + 1e-5, `roll ${out[2]}`);
        }
        triMath.triQuaternionToYawPitchRoll(out, new Float32Array([0, 0, 0, 1]));
        assert.deepStrictEqual(Array.from(out), [ 0, 0, 0 ]);
    });

    test("triQuaternionScale copies when length is exactly 1", () =>
    {
        const q = unitQ();
        assert.deepStrictEqual(triMath.triQuaternionScale(new Float32Array(4), q, 1), q);
        closeToArray(triMath.triQuaternionScale(new Float32Array(4), q, 2), Array.from(q, x => x * 2));
    });
});

describe("triMath matrices", () =>
{
    test("triMatrixTranslate variants equal multiplying by a translation matrix", () =>
    {
        const m = someMatrix(), v = v3(1, -2, 0.5);
        const t = Matrix.translationMatrix__Vector3(new Float32Array(16), v);
        closeToArray(triMath.triMatrixTranslate__MatrixVector3(new Float32Array(16), m, v), Matrix.multiply(new Float32Array(16), m, t));
        closeToArray(triMath.triMatrixTranslate__Vector3Matrix(new Float32Array(16), v, m), Matrix.multiply(new Float32Array(16), t, m));
    });

    test("triMatrixRotate variants multiply in their named order", () =>
    {
        const m = someMatrix(), q = unitQ();
        const r = Matrix.rotationMatrix__Quaternion(new Float32Array(16), q);
        assert.deepStrictEqual(triMath.triMatrixRotate__MatrixQuaternion(new Float32Array(16), m, q), Matrix.multiply(new Float32Array(16), m, r));
        assert.deepStrictEqual(triMath.triMatrixRotate__QuaternionMatrix(new Float32Array(16), q, m), Matrix.multiply(new Float32Array(16), r, m));
    });

    test("triMatrixTranspose at 64 bytes is the transpose; at 48 it leaves row 4 alone", () =>
    {
        const m = someMatrix();
        assert.deepStrictEqual(triMath.triMatrixTranspose(new Float32Array(16), m, 64), Matrix.transpose(new Float32Array(16), m));
        const out = new Float32Array(16).fill(9);
        triMath.triMatrixTranspose(out, m, 48);
        assert.deepStrictEqual(Array.from(out.subarray(12)), [ 9, 9, 9, 9 ]);
        assert.strictEqual(out[3], m[12]);
    });

    test("remove scaling, remove and overwrite translation", () =>
    {
        const m = someMatrix();
        const unscaled = triMath.triMatrixRemoveScaling(new Float32Array(16), m);
        for (const row of [ 0, 4, 8 ])
        {
            closeTo(Vector3.length(unscaled.subarray(row, row + 3)), 1);
        }
        assert.deepStrictEqual(Array.from(triMath.triMatrixRemoveTranslation(new Float32Array(16), m).subarray(12, 15)), [ 0, 0, 0 ]);
        assert.deepStrictEqual(Array.from(triMath.triMatrixOverwriteTranslation(m, m, v3(1, 2, 3)).subarray(12, 15)), [ 1, 2, 3 ]);
    });

    test("matrix4dInvert inverts; matrix4dMultiply matches Matrix.multiply on float data", () =>
    {
        const m = Float64Array.from(someMatrix());
        const inverse = triMath.matrix4dInvert(new Float64Array(16), m);
        const product = triMath.matrix4dMultiply(new Float64Array(16), m, inverse);
        closeToArray(product, Matrix.identityMatrix(new Float32Array(16)), 1e-9);
        const a = someMatrix(), b = Matrix.rotationMatrix__Quaternion(new Float32Array(16), unitQ());
        closeToArray(triMath.matrix4dMultiply(new Float64Array(16), Float64Array.from(a), Float64Array.from(b)),
            Matrix.multiply(new Float32Array(16), a, b));
    });

    test("convertProjectionCoordToWorldPickRay through identities and a singular matrix", () =>
    {
        const identity = Matrix.identityMatrix(new Float32Array(16));
        const start = v3(0, 0, 0), dir = v3(0, 0, 0);
        assert.strictEqual(triMath.convertProjectionCoordToWorldPickRay(0.25, -0.5, identity, identity, start, dir), true);
        assert.deepStrictEqual(Array.from(start), [ 0.25, -0.5, 0 ]);
        assert.deepStrictEqual(Array.from(dir), [ 0, 0, 1 ]);
        const untouched = v3(7, 7, 7);
        assert.strictEqual(triMath.convertProjectionCoordToWorldPickRay(0, 0, new Float32Array(16), identity, untouched, dir), false);
        assert.deepStrictEqual(Array.from(untouched), [ 7, 7, 7 ]);
    });
});

describe("triMath scalars and random", () =>
{
    test("clamps convert as their C++ parameter types", () =>
    {
        assert.strictEqual(triMath.triClamp(5, 0, 1), 1);
        assert.strictEqual(triMath.clampInt(2.9, 0, 10), 2);
        // -1 as uint32_t is 0xFFFFFFFF, above any max
        assert.strictEqual(triMath.clampUInt(-1, 0, 10), 10);
        assert.strictEqual(triMath.triLinearize(2, 4, 3), 0.5);
        assert.strictEqual(triMath.lerp(2, 4, 0.25), 2.5);
    });

    test("hermite hits its end values; sinSmooth and cubicInterpolate their knots", () =>
    {
        closeTo(triMath.hermite(1, 0.3, 5, -0.2, 0, 2), 1);
        closeTo(triMath.hermite(1, 0.3, 5, -0.2, 2, 2), 5);
        closeTo(triMath.sinSmooth(0), 0);
        closeTo(triMath.sinSmooth(1), 1);
        assert.strictEqual(triMath.cubicInterpolate(9, 2, 3, -4, 0), 2);
        assert.strictEqual(triMath.cubicInterpolate(9, 2, 3, -4, 1), 3);
    });

    test("isFinite routes a number and a Vector3", () =>
    {
        assert.strictEqual(triMath.isFinite(1), true);
        assert.strictEqual(triMath.isFinite(NaN), false);
        assert.strictEqual(triMath.isFinite(v3(0, Infinity, 0)), false);
        assert.strictEqual(triMath.isFinite(v3(1, 2, 3)), true);
    });

    test("the TriRand LCG matches a BigInt reference, including unsigned TriRandInt wrap", () =>
    {
        let ref = 0n;
        const step = () => { ref = ((ref << 12n) + 150889n) % 714025n; return ref; };
        triMath.triSrand__UInt32(4294967295);
        ref = 4294967295n % 714025n;
        assert.strictEqual(triMath.triRandGetSeed(), Number(ref));
        closeTo(triMath.triRand(), Number(step()) / 714025, 1e-7);
        const toInt = x => Number(BigInt.asIntN(32, x));
        assert.strictEqual(triMath.triRandInt__Hi(-1), toInt((0xFFFFFFFFn * step() & 0xFFFFFFFFn) / 714025n));
        assert.strictEqual(triMath.triRandInt__LoHi(3, 10), toInt(7n * step() / 714025n + 3n));
        assert.strictEqual(triMath.triRandInt(100), toInt(100n * step() / 714025n));
        triMath.triSrand__Time(2 ** 40 + 5);
        assert.strictEqual(triMath.triRandGetSeed(), 5);
    });

    test("triFloatRandom01 follows the MSVC CRT rand(): 41 first after srand(1)", () =>
    {
        triMath.triRandomSeed(1);
        assert.strictEqual(triMath.triFloatRandom01(), Math.fround(41 / 32767));
        assert.strictEqual(triMath.triFloatRandom01(), Math.fround(18467 / 32767));
    });

    test("TriPerlinNoise agrees with the production port for the same seed", () =>
    {
        const ours = triMath.TriPerlinNoise.create__Seed(0);
        const production = noise.createPerlinNoise1D(0);
        for (const x of [ 0, 0.3, 1.7, -2.25, 100.5 ])
        {
            assert.strictEqual(ours.Sample(x), production.sample(x));
            assert.strictEqual(ours.FractalSum(x, 4), production.fractalSum(x, 4));
        }
        assert.strictEqual(triMath.perlinNoise1D(1.7, 2, 2, 4), production.fractalSum(1.7, 4, 0.5, 2));
    });
});

describe("triMath overload routers (rule 11)", () =>
{
    test("each router returns exactly what its specific variant returns", () =>
    {
        const m = someMatrix(), q = unitQ(), v = v3(1, -2, 0.5);
        assert.deepStrictEqual(triMath.triMatrixTranslate(new Float32Array(16), m, v), triMath.triMatrixTranslate__MatrixVector3(new Float32Array(16), m, v));
        assert.deepStrictEqual(triMath.triMatrixTranslate(new Float32Array(16), v, m), triMath.triMatrixTranslate__Vector3Matrix(new Float32Array(16), v, m));
        assert.deepStrictEqual(triMath.triMatrixRotate(new Float32Array(16), m, q), triMath.triMatrixRotate__MatrixQuaternion(new Float32Array(16), m, q));
        assert.deepStrictEqual(triMath.triMatrixRotate(new Float32Array(16), q, m), triMath.triMatrixRotate__QuaternionMatrix(new Float32Array(16), q, m));
        const a = v3(0, -9.8, 1);
        assert.deepStrictEqual(triMath.triVectorExponentialDecay(v3(0, 0, 0), v, a, 2, 0.7, 1.3), triMath.triVectorExponentialDecay__Time(v3(0, 0, 0), v, a, 2, 0.7, 1.3));
        assert.deepStrictEqual(triMath.triVectorExponentialDecay(v3(0, 0, 0), v, a, 0.7, 0.4), triMath.triVectorExponentialDecay__Pow(v3(0, 0, 0), v, a, 0.7, 0.4));
        assert.deepStrictEqual(triMath.triVectorExponentialDecayInteger(v3(0, 0, 0), v, v, a, 2, 0.7, 1.3), triMath.triVectorExponentialDecayInteger__Time(v3(0, 0, 0), v, v, a, 2, 0.7, 1.3));
        assert.deepStrictEqual(triMath.triVectorExponentialDecayInteger(v3(0, 0, 0), v, v, a, 2, 0.7, 1.3, 0.4), triMath.triVectorExponentialDecayInteger__Pow(v3(0, 0, 0), v, v, a, 2, 0.7, 1.3, 0.4));
    });

    test("routers throw where no Carbon overload matches", () =>
    {
        assert.throws(() => triMath.triMatrixTranslate(new Float32Array(16), new Float32Array(4), new Float32Array(16)), TypeError);
        assert.throws(() => triMath.triMatrixRotate(new Float32Array(16), new Float32Array(3), new Float32Array(16)), TypeError);
        assert.throws(() => triMath.triRandInt(), TypeError);
    });
});
