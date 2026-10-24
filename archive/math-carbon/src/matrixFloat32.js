import { matrix } from "./matrix.js";
import { vector3Float32 } from "./vector3Float32.js";

// Source: math/include/Matrix_inline.h
// Source: math/include/Vector4_inline.h
// Source: math/src/Matrix.cpp
/**
 * Internal float32 kernels for the prepared Carbon Matrix port.
 * Our initialization-time precision option will select these implementations once.
 * This partial table is not exported by the runtime or the archive barrel.
 * Arithmetic rounds at each native float operation; native parity depends on
 * the verified compiler/FP environment and is not universal across native builds.
 */
export const matrixFloat32 = { multiply, determinant, inverse, inverseDet, transformationMatrix,
    transformCoord, transformNormal, transform, transformByTranspose, scale, divide,
    orthographicProjection, orthoMatrix, perspectiveOffCenterMatrix, orthoOffCenterMatrix, orthoNormalBasisZ, lookAtMatrix, transformationMatrixCentered, decompose, transformCoords };

/**
 * Carbon: Matrix::operator* (math/include/Matrix_inline.h:193-204)
 * Composes a then b in Carbon row-vector order with float32 operations.
 * Adapted: Caller-owned flat storage and cached operands allow overlapping views.
 * @param {Float32Array} out Receiving matrix.
 * @param {Float32Array} a First matrix.
 * @param {Float32Array} b Second matrix.
 * @returns {Float32Array} out
 */
function multiply(out, a, b)
{
    const f = Math.fround;
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    const b00 = b[0], b01 = b[1], b02 = b[2], b03 = b[3],
        b10 = b[4], b11 = b[5], b12 = b[6], b13 = b[7],
        b20 = b[8], b21 = b[9], b22 = b[10], b23 = b[11],
        b30 = b[12], b31 = b[13], b32 = b[14], b33 = b[15];

    // out.m[i][j] = m[i][0]*other.m[0][j] + m[i][1]*other.m[1][j] + m[i][2]*other.m[2][j] + m[i][3]*other.m[3][j]
    out[0] = f(f(f(f(a00 * b00) + f(a01 * b10)) + f(a02 * b20)) + f(a03 * b30));
    out[1] = f(f(f(f(a00 * b01) + f(a01 * b11)) + f(a02 * b21)) + f(a03 * b31));
    out[2] = f(f(f(f(a00 * b02) + f(a01 * b12)) + f(a02 * b22)) + f(a03 * b32));
    out[3] = f(f(f(f(a00 * b03) + f(a01 * b13)) + f(a02 * b23)) + f(a03 * b33));
    out[4] = f(f(f(f(a10 * b00) + f(a11 * b10)) + f(a12 * b20)) + f(a13 * b30));
    out[5] = f(f(f(f(a10 * b01) + f(a11 * b11)) + f(a12 * b21)) + f(a13 * b31));
    out[6] = f(f(f(f(a10 * b02) + f(a11 * b12)) + f(a12 * b22)) + f(a13 * b32));
    out[7] = f(f(f(f(a10 * b03) + f(a11 * b13)) + f(a12 * b23)) + f(a13 * b33));
    out[8] = f(f(f(f(a20 * b00) + f(a21 * b10)) + f(a22 * b20)) + f(a23 * b30));
    out[9] = f(f(f(f(a20 * b01) + f(a21 * b11)) + f(a22 * b21)) + f(a23 * b31));
    out[10] = f(f(f(f(a20 * b02) + f(a21 * b12)) + f(a22 * b22)) + f(a23 * b32));
    out[11] = f(f(f(f(a20 * b03) + f(a21 * b13)) + f(a22 * b23)) + f(a23 * b33));
    out[12] = f(f(f(f(a30 * b00) + f(a31 * b10)) + f(a32 * b20)) + f(a33 * b30));
    out[13] = f(f(f(f(a30 * b01) + f(a31 * b11)) + f(a32 * b21)) + f(a33 * b31));
    out[14] = f(f(f(f(a30 * b02) + f(a31 * b12)) + f(a32 * b22)) + f(a33 * b32));
    out[15] = f(f(f(f(a30 * b03) + f(a31 * b13)) + f(a32 * b23)) + f(a33 * b33));
    return out;
}

/**
 * Carbon: Determinant (math/include/Matrix_inline.h:505-520)
 * Evaluates the donor determinant, including float rounding before singular tests.
 * @param {Float32Array} m Matrix.
 * @returns {number} Float32 determinant.
 */
function determinant(m)
{
    const f = Math.fround;
    const a0 = f(f(m[0] * m[5]) - f(m[1] * m[4]));
    const a1 = f(f(m[0] * m[6]) - f(m[2] * m[4]));
    const a2 = f(f(m[0] * m[7]) - f(m[3] * m[4]));
    const a3 = f(f(m[1] * m[6]) - f(m[2] * m[5]));
    const a4 = f(f(m[1] * m[7]) - f(m[3] * m[5]));
    const a5 = f(f(m[2] * m[7]) - f(m[3] * m[6]));
    const b0 = f(f(m[8] * m[13]) - f(m[9] * m[12]));
    const b1 = f(f(m[8] * m[14]) - f(m[10] * m[12]));
    const b2 = f(f(m[8] * m[15]) - f(m[11] * m[12]));
    const b3 = f(f(m[9] * m[14]) - f(m[10] * m[13]));
    const b4 = f(f(m[9] * m[15]) - f(m[11] * m[13]));
    const b5 = f(f(m[10] * m[15]) - f(m[11] * m[14]));
    return f(f(f(f(f(f(a0 * b5) - f(a1 * b4)) + f(a2 * b3)) + f(a3 * b2)) - f(a4 * b1)) + f(a5 * b0));
}

/**
 * Carbon: Inverse (math/src/Matrix.cpp:7-46)
 * Unrolls row gathers and Cross (math/include/Vector4_inline.h:186-193).
 * Rounds the determinant reciprocal, cross expressions and returned matrix components.
 * All inputs are cached before output writes, including the singular-copy path.
 * @param {Float32Array} out Receiving matrix.
 * @param {Float32Array} m Input matrix.
 * @param {number} [det] Optional precomputed float32 determinant.
 * @returns {Float32Array} out
 */
function inverseInto(out, m, det)
{
    // Inline the donor determinant when no scalar return is needed.
    if (det === undefined)
    {
        const f = Math.fround;
        const a0 = f(f(m[0] * m[5]) - f(m[1] * m[4]));
        const a1 = f(f(m[0] * m[6]) - f(m[2] * m[4]));
        const a2 = f(f(m[0] * m[7]) - f(m[3] * m[4]));
        const a3 = f(f(m[1] * m[6]) - f(m[2] * m[5]));
        const a4 = f(f(m[1] * m[7]) - f(m[3] * m[5]));
        const a5 = f(f(m[2] * m[7]) - f(m[3] * m[6]));
        const b0 = f(f(m[8] * m[13]) - f(m[9] * m[12]));
        const b1 = f(f(m[8] * m[14]) - f(m[10] * m[12]));
        const b2 = f(f(m[8] * m[15]) - f(m[11] * m[12]));
        const b3 = f(f(m[9] * m[14]) - f(m[10] * m[13]));
        const b4 = f(f(m[9] * m[15]) - f(m[11] * m[13]));
        const b5 = f(f(m[10] * m[15]) - f(m[11] * m[14]));
        det = f(f(f(f(f(f(a0 * b5) - f(a1 * b4)) + f(a2 * b3)) + f(a3 * b2)) - f(a4 * b1)) + f(a5 * b0));
    }
    const f = Math.fround;
    const m0 = m[0], m1 = m[1], m2 = m[2], m3 = m[3];
    const m4 = m[4], m5 = m[5], m6 = m[6], m7 = m[7];
    const m8 = m[8], m9 = m[9], m10 = m[10], m11 = m[11];
    const m12 = m[12], m13 = m[13], m14 = m[14], m15 = m[15];

    if (det === 0)
    {
        out[0] = m0; out[1] = m1; out[2] = m2; out[3] = m3;
        out[4] = m4; out[5] = m5; out[6] = m6; out[7] = m7;
        out[8] = m8; out[9] = m9; out[10] = m10; out[11] = m11;
        out[12] = m12; out[13] = m13; out[14] = m14; out[15] = m15;
        return out;
    }

    const signedDet0 = f(1 / det);
    out[0] = f(signedDet0 * f(f(f(m5 * f(f(m10 * m15) - f(m14 * m11))) - f(m6 * f(f(m9 * m15) - f(m13 * m11)))) + f(m7 * f(f(m9 * m14) - f(m10 * m13)))));
    out[4] = f(signedDet0 * -f(f(f(m4 * f(f(m10 * m15) - f(m14 * m11))) - f(m6 * f(f(m8 * m15) - f(m12 * m11)))) + f(m7 * f(f(m8 * m14) - f(m12 * m10)))));
    out[8] = f(signedDet0 * f(f(f(m4 * f(f(m9 * m15) - f(m13 * m11))) - f(m5 * f(f(m8 * m15) - f(m12 * m11)))) + f(m7 * f(f(m8 * m13) - f(m12 * m9)))));
    out[12] = f(signedDet0 * -f(f(f(m4 * f(f(m9 * m14) - f(m13 * m10))) - f(m5 * f(f(m8 * m14) - f(m12 * m10)))) + f(m6 * f(f(m8 * m13) - f(m12 * m9)))));

    const signedDet1 = f(-1 / det);
    out[1] = f(signedDet1 * f(f(f(m1 * f(f(m10 * m15) - f(m14 * m11))) - f(m2 * f(f(m9 * m15) - f(m13 * m11)))) + f(m3 * f(f(m9 * m14) - f(m10 * m13)))));
    out[5] = f(signedDet1 * -f(f(f(m0 * f(f(m10 * m15) - f(m14 * m11))) - f(m2 * f(f(m8 * m15) - f(m12 * m11)))) + f(m3 * f(f(m8 * m14) - f(m12 * m10)))));
    out[9] = f(signedDet1 * f(f(f(m0 * f(f(m9 * m15) - f(m13 * m11))) - f(m1 * f(f(m8 * m15) - f(m12 * m11)))) + f(m3 * f(f(m8 * m13) - f(m12 * m9)))));
    out[13] = f(signedDet1 * -f(f(f(m0 * f(f(m9 * m14) - f(m13 * m10))) - f(m1 * f(f(m8 * m14) - f(m12 * m10)))) + f(m2 * f(f(m8 * m13) - f(m12 * m9)))));

    const signedDet2 = f(1 / det);
    out[2] = f(signedDet2 * f(f(f(m1 * f(f(m6 * m15) - f(m14 * m7))) - f(m2 * f(f(m5 * m15) - f(m13 * m7)))) + f(m3 * f(f(m5 * m14) - f(m6 * m13)))));
    out[6] = f(signedDet2 * -f(f(f(m0 * f(f(m6 * m15) - f(m14 * m7))) - f(m2 * f(f(m4 * m15) - f(m12 * m7)))) + f(m3 * f(f(m4 * m14) - f(m12 * m6)))));
    out[10] = f(signedDet2 * f(f(f(m0 * f(f(m5 * m15) - f(m13 * m7))) - f(m1 * f(f(m4 * m15) - f(m12 * m7)))) + f(m3 * f(f(m4 * m13) - f(m12 * m5)))));
    out[14] = f(signedDet2 * -f(f(f(m0 * f(f(m5 * m14) - f(m13 * m6))) - f(m1 * f(f(m4 * m14) - f(m12 * m6)))) + f(m2 * f(f(m4 * m13) - f(m12 * m5)))));

    const signedDet3 = f(-1 / det);
    out[3] = f(signedDet3 * f(f(f(m1 * f(f(m6 * m11) - f(m10 * m7))) - f(m2 * f(f(m5 * m11) - f(m9 * m7)))) + f(m3 * f(f(m5 * m10) - f(m6 * m9)))));
    out[7] = f(signedDet3 * -f(f(f(m0 * f(f(m6 * m11) - f(m10 * m7))) - f(m2 * f(f(m4 * m11) - f(m8 * m7)))) + f(m3 * f(f(m4 * m10) - f(m8 * m6)))));
    out[11] = f(signedDet3 * f(f(f(m0 * f(f(m5 * m11) - f(m9 * m7))) - f(m1 * f(f(m4 * m11) - f(m8 * m7)))) + f(m3 * f(f(m4 * m9) - f(m8 * m5)))));
    out[15] = f(signedDet3 * -f(f(f(m0 * f(f(m5 * m10) - f(m9 * m6))) - f(m1 * f(f(m4 * m10) - f(m8 * m6)))) + f(m2 * f(f(m4 * m9) - f(m8 * m5)))));
    return out;
}

/**
 * Carbon: Inverse (math/src/Matrix.cpp:7-46)
 * Returns the inverse in caller-owned storage; singular matrices copy through.
 * @param {Float32Array} out Receiving matrix; may overlap m.
 * @param {Float32Array} m Input matrix.
 * @returns {Float32Array} out
 */
function inverse(out, m)
{
    return inverseInto(out, m);
}

/**
 * Carbon: Inverse (math/src/Matrix.cpp:49-62)
 * Leaves out untouched when singular; NaN follows the donor arithmetic path.
 * Adapted: Returns the float determinant in place of the native output reference.
 * @param {Float32Array} out Receiving matrix; may overlap m.
 * @param {Float32Array} m Input matrix.
 * @returns {number} Float32 determinant; compare with zero, not JS truthiness.
 */
function inverseDet(out, m)
{
    const det = determinant(m);
    if (det !== 0)
    {
        inverseInto(out, m, det);
    }
    return det;
}

/**
 * Carbon: TransformationMatrix (math/include/Matrix_inline.h:662-668)
 * Composes ScalingMatrix * RotationMatrix * TranslationMatrix with float operations.
 * RotationMatrix: math/include/Matrix_inline.h:365-386. Keeps zero terms and
 * intermediate Matrix stores; cached scalars eliminate temporary allocation.
 * @param {Float32Array} out Receiving matrix; may overlap inputs.
 * @param {Float32Array} scaling Scale vector.
 * @param {Float32Array} rotation Quaternion, not normalized here.
 * @param {Float32Array} translation Translation vector.
 * @returns {Float32Array} out
 */
function transformationMatrix(out, scaling, rotation, translation)
{
    const f = Math.fround;
    const sx = f(scaling[0]), sy = f(scaling[1]), sz = f(scaling[2]);
    const x = rotation[0], y = rotation[1], z = rotation[2], w = rotation[3];
    const tx = f(translation[0]), ty = f(translation[1]), tz = f(translation[2]);

    // RotationMatrix stores each component as float before S * R.
    const r0 = f(1 - f(2 * f(f(y * y) + f(z * z))));
    const r1 = f(2 * f(f(x * y) + f(z * w)));
    const r2 = f(2 * f(f(x * z) - f(y * w)));
    const r4 = f(2 * f(f(x * y) - f(z * w)));
    const r5 = f(1 - f(2 * f(f(x * x) + f(z * z))));
    const r6 = f(2 * f(f(y * z) + f(x * w)));
    const r8 = f(2 * f(f(x * z) + f(y * w)));
    const r9 = f(2 * f(f(y * z) - f(x * w)));
    const r10 = f(1 - f(2 * f(f(x * x) + f(y * y))));

    // Keep zero terms: removing them changes non-finite and signed-zero behavior.
    const sr0 = f(f(f(f(sx * r0) + f(0 * r4)) + f(0 * r8)) + f(0 * 0));
    const sr1 = f(f(f(f(sx * r1) + f(0 * r5)) + f(0 * r9)) + f(0 * 0));
    const sr2 = f(f(f(f(sx * r2) + f(0 * r6)) + f(0 * r10)) + f(0 * 0));
    const sr3 = f(f(f(f(sx * 0) + f(0 * 0)) + f(0 * 0)) + f(0 * 1));
    const sr4 = f(f(f(f(0 * r0) + f(sy * r4)) + f(0 * r8)) + f(0 * 0));
    const sr5 = f(f(f(f(0 * r1) + f(sy * r5)) + f(0 * r9)) + f(0 * 0));
    const sr6 = f(f(f(f(0 * r2) + f(sy * r6)) + f(0 * r10)) + f(0 * 0));
    const sr7 = f(f(f(f(0 * 0) + f(sy * 0)) + f(0 * 0)) + f(0 * 1));
    const sr8 = f(f(f(f(0 * r0) + f(0 * r4)) + f(sz * r8)) + f(0 * 0));
    const sr9 = f(f(f(f(0 * r1) + f(0 * r5)) + f(sz * r9)) + f(0 * 0));
    const sr10 = f(f(f(f(0 * r2) + f(0 * r6)) + f(sz * r10)) + f(0 * 0));
    const sr11 = f(f(f(f(0 * 0) + f(0 * 0)) + f(sz * 0)) + f(0 * 1));
    const sr12 = f(f(f(f(0 * r0) + f(0 * r4)) + f(0 * r8)) + f(1 * 0));
    const sr13 = f(f(f(f(0 * r1) + f(0 * r5)) + f(0 * r9)) + f(1 * 0));
    const sr14 = f(f(f(f(0 * r2) + f(0 * r6)) + f(0 * r10)) + f(1 * 0));
    const sr15 = f(f(f(f(0 * 0) + f(0 * 0)) + f(0 * 0)) + f(1 * 1));

    // All inputs are captured before output writes, including aliased TRS views.
    out[0] = f(f(f(f(sr0 * 1) + f(sr1 * 0)) + f(sr2 * 0)) + f(sr3 * tx));
    out[1] = f(f(f(f(sr0 * 0) + f(sr1 * 1)) + f(sr2 * 0)) + f(sr3 * ty));
    out[2] = f(f(f(f(sr0 * 0) + f(sr1 * 0)) + f(sr2 * 1)) + f(sr3 * tz));
    out[3] = f(f(f(f(sr0 * 0) + f(sr1 * 0)) + f(sr2 * 0)) + f(sr3 * 1));
    out[4] = f(f(f(f(sr4 * 1) + f(sr5 * 0)) + f(sr6 * 0)) + f(sr7 * tx));
    out[5] = f(f(f(f(sr4 * 0) + f(sr5 * 1)) + f(sr6 * 0)) + f(sr7 * ty));
    out[6] = f(f(f(f(sr4 * 0) + f(sr5 * 0)) + f(sr6 * 1)) + f(sr7 * tz));
    out[7] = f(f(f(f(sr4 * 0) + f(sr5 * 0)) + f(sr6 * 0)) + f(sr7 * 1));
    out[8] = f(f(f(f(sr8 * 1) + f(sr9 * 0)) + f(sr10 * 0)) + f(sr11 * tx));
    out[9] = f(f(f(f(sr8 * 0) + f(sr9 * 1)) + f(sr10 * 0)) + f(sr11 * ty));
    out[10] = f(f(f(f(sr8 * 0) + f(sr9 * 0)) + f(sr10 * 1)) + f(sr11 * tz));
    out[11] = f(f(f(f(sr8 * 0) + f(sr9 * 0)) + f(sr10 * 0)) + f(sr11 * 1));
    out[12] = f(f(f(f(sr12 * 1) + f(sr13 * 0)) + f(sr14 * 0)) + f(sr15 * tx));
    out[13] = f(f(f(f(sr12 * 0) + f(sr13 * 1)) + f(sr14 * 0)) + f(sr15 * ty));
    out[14] = f(f(f(f(sr12 * 0) + f(sr13 * 0)) + f(sr14 * 1)) + f(sr15 * tz));
    out[15] = f(f(f(f(sr12 * 0) + f(sr13 * 0)) + f(sr14 * 0)) + f(sr15 * 1));
    return out;
}

/**
 * Carbon: TransformCoord (math/include/Matrix_inline.h:560-577)
 * Applies the donor transform with float32 arithmetic and cached output values.
 * @param {Float32Array} out Receiving vector; may overlap either input.
 * @param {Float32Array} coord Input vector.
 * @param {Float32Array} transform Carbon row-major matrix.
 * @returns {Float32Array} out
 */
function transformCoord(out, coord, transform)
{
    const f = Math.fround;
    const x = coord[0], y = coord[1], z = coord[2];
    const norm = f(f(f(f(transform[3] * x) + f(transform[7] * y)) + f(transform[11] * z)) + transform[15]);
    if (norm !== 0)
    {
        const result0 = f(f(f(f(f(x * transform[0]) + f(y * transform[4])) + f(z * transform[8])) + transform[12]) / norm);
        const result1 = f(f(f(f(f(x * transform[1]) + f(y * transform[5])) + f(z * transform[9])) + transform[13]) / norm);
        const result2 = f(f(f(f(f(x * transform[2]) + f(y * transform[6])) + f(z * transform[10])) + transform[14]) / norm);
        out[0] = result0;
        out[1] = result1;
        out[2] = result2;
    }
    else
    {
        out[0] = 0.0;
        out[1] = 0.0;
        out[2] = 0.0;
    }
    return out;
}

/**
 * Carbon: TransformNormal (math/include/Matrix_inline.h:580-586)
 * Applies the donor transform with float32 arithmetic and cached output values.
 * @param {Float32Array} out Receiving vector; may overlap either input.
 * @param {Float32Array} normal Input vector.
 * @param {Float32Array} transform Carbon row-major matrix.
 * @returns {Float32Array} out
 */
function transformNormal(out, normal, transform)
{
    const f = Math.fround;
    const x = normal[0], y = normal[1], z = normal[2];
    const result0 = f(f(f(x * transform[0]) + f(y * transform[4])) + f(z * transform[8]));
    const result1 = f(f(f(x * transform[1]) + f(y * transform[5])) + f(z * transform[9]));
    const result2 = f(f(f(x * transform[2]) + f(y * transform[6])) + f(z * transform[10]));
    out[0] = result0;
    out[1] = result1;
    out[2] = result2;
    return out;
}

/**
 * Carbon: Transform (math/include/Matrix_inline.h:589-617)
 * Applies the donor transform with float32 arithmetic and cached output values.
 * @param {Float32Array} out Receiving vector; may overlap either input.
 * @param {Float32Array} point Input vector.
 * @param {Float32Array} m Carbon row-major matrix.
 * @returns {Float32Array} out
 */
function transform(out, point, m)
{
    const f = Math.fround;
    const x = point[0], y = point[1];
    if (point.length >= 4)
    {
        const z = point[2], w = point[3];
        const result0 = f(f(f(f(x * m[0]) + f(y * m[4])) + f(z * m[8])) + f(w * m[12]));
        const result1 = f(f(f(f(x * m[1]) + f(y * m[5])) + f(z * m[9])) + f(w * m[13]));
        const result2 = f(f(f(f(x * m[2]) + f(y * m[6])) + f(z * m[10])) + f(w * m[14]));
        const result3 = f(f(f(f(x * m[3]) + f(y * m[7])) + f(z * m[11])) + f(w * m[15]));
        out[0] = result0;
        out[1] = result1;
        out[2] = result2;
        out[3] = result3;
    } // Matrix_inline.h:589 (and :293, identical arithmetic)
    else if (point.length === 3)
    {
        const z = point[2];
        const result0 = f(f(f(f(x * m[0]) + f(y * m[4])) + f(z * m[8])) + m[12]);
        const result1 = f(f(f(f(x * m[1]) + f(y * m[5])) + f(z * m[9])) + m[13]);
        const result2 = f(f(f(f(x * m[2]) + f(y * m[6])) + f(z * m[10])) + m[14]);
        const result3 = f(f(f(m[3] + m[7]) + m[11]) + m[15]);
        out[0] = result0;
        out[1] = result1;
        out[2] = result2;
        out[3] = result3;
    } // Matrix_inline.h:599 (w is the plain column sum, as C++)
    else
    {
        const result0 = f(f(f(x * m[0]) + f(y * m[4])) + m[12]);
        const result1 = f(f(f(x * m[1]) + f(y * m[5])) + m[13]);
        const result2 = f(f(f(x * m[2]) + f(y * m[6])) + m[14]);
        const result3 = f(f(f(x * m[3]) + f(y * m[7])) + m[15]);
        out[0] = result0;
        out[1] = result1;
        out[2] = result2;
        out[3] = result3;
    } // Matrix_inline.h:609
    return out;
}

/**
 * Carbon: Matrix::operator* (math/include/Matrix_inline.h:304-311)
 * Applies the donor transform with float32 arithmetic and cached output values.
 * @param {Float32Array} out Receiving vector; may overlap either input.
 * @param {Float32Array} p Input vector.
 * @param {Float32Array} m Carbon row-major matrix.
 * @returns {Float32Array} out
 */
function transformByTranspose(out, p, m)
{
    const f = Math.fround;
    const x = p[0], y = p[1], z = p[2], w = p[3];
    const result0 = f(f(f(f(m[0] * x) + f(m[1] * y)) + f(m[2] * z)) + f(m[3] * w));
    const result1 = f(f(f(f(m[4] * x) + f(m[5] * y)) + f(m[6] * z)) + f(m[7] * w));
    const result2 = f(f(f(f(m[8] * x) + f(m[9] * y)) + f(m[10] * z)) + f(m[11] * w));
    const result3 = f(f(f(f(m[12] * x) + f(m[13] * y)) + f(m[14] * z)) + f(m[15] * w));
    out[0] = result0;
    out[1] = result1;
    out[2] = result2;
    out[3] = result3;
    return out;
}

/**
 * Carbon: Matrix::operator*= (math/include/Matrix_inline.h:112-135)
 * Converts the scalar to float and scales cached components.
 * @param {Float32Array} out Receiving value; may overlap a.
 * @param {Float32Array} a Input value.
 * @param {number} scalar Native float scalar.
 * @returns {Float32Array} out
 */
function scale(out, a, scalar)
{
    const f = Math.fround;
    const factor = f(scalar);
    const a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],
        a4 = a[4], a5 = a[5], a6 = a[6], a7 = a[7],
        a8 = a[8], a9 = a[9], a10 = a[10], a11 = a[11],
        a12 = a[12], a13 = a[13], a14 = a[14], a15 = a[15];
    out[0] = f(a0 * factor);
    out[1] = f(a1 * factor);
    out[2] = f(a2 * factor);
    out[3] = f(a3 * factor);
    out[4] = f(a4 * factor);
    out[5] = f(a5 * factor);
    out[6] = f(a6 * factor);
    out[7] = f(a7 * factor);
    out[8] = f(a8 * factor);
    out[9] = f(a9 * factor);
    out[10] = f(a10 * factor);
    out[11] = f(a11 * factor);
    out[12] = f(a12 * factor);
    out[13] = f(a13 * factor);
    out[14] = f(a14 * factor);
    out[15] = f(a15 * factor);
    return out;
}

/**
 * Carbon: Matrix::operator/= (math/include/Matrix_inline.h:138-163)
 * Rounds the native float reciprocal before scaling components.
 * @param {Float32Array} out Receiving value; may overlap a.
 * @param {Float32Array} a Input value.
 * @param {number} divisor Native float divisor.
 * @returns {Float32Array} out
 */
function divide(out, a, divisor)
{
    const f = Math.fround;
    return scale(out, a, f(1 / f(divisor)));
}

/**
 * Carbon: OrthographicProjection (math/include/Matrix_inline.h:549-557)
 * Preserves the native float arguments and projection expression order.
 * @param {Float32Array} out Receiving matrix.
 * @param {number} width Native float projection parameter.
 * @param {number} height Native float projection parameter.
 * @param {number} zNear Native float projection parameter.
 * @param {number} zFar Native float projection parameter.
 * @returns {Float32Array} out
 */
function orthographicProjection(out, width, height, zNear, zFar)
{
    const f = Math.fround;
    width = f(width);
    height = f(height);
    zNear = f(zNear);
    zFar = f(zFar);
    matrix.identityMatrix(out);
    out[0] = f(2.0 / width);
    out[5] = f(2.0 / height);
    out[10] = f(1.0 / f(zNear - zFar));
    out[14] = f(zNear / f(zNear - zFar));
    return out;
}

/**
 * Carbon: OrthoMatrix (math/include/Matrix_inline.h:738-746)
 * Preserves the native float arguments and projection expression order.
 * @param {Float32Array} out Receiving matrix.
 * @param {number} w Native float projection parameter.
 * @param {number} h Native float projection parameter.
 * @param {number} zn Native float projection parameter.
 * @param {number} zf Native float projection parameter.
 * @returns {Float32Array} out
 */
function orthoMatrix(out, w, h, zn, zf)
{
    const f = Math.fround;
    w = f(w);
    h = f(h);
    zn = f(zn);
    zf = f(zf);
    matrix.identityMatrix(out);
    out[0] = f(2.0 / w);
    out[5] = f(2.0 / h);
    out[10] = f(1.0 / f(zn - zf));
    out[14] = f(zn / f(zn - zf));
    return out;
}

/**
 * Carbon: PerspectiveOffCenterMatrix (math/include/Matrix_inline.h:717-735)
 * Preserves the native float arguments and projection expression order.
 * @param {Float32Array} out Receiving matrix.
 * @param {number} l Native float projection parameter.
 * @param {number} r Native float projection parameter.
 * @param {number} b Native float projection parameter.
 * @param {number} t Native float projection parameter.
 * @param {number} zn Native float projection parameter.
 * @param {number} zf Native float projection parameter.
 * @returns {Float32Array} out
 */
function perspectiveOffCenterMatrix(out, l, r, b, t, zn, zf)
{
    const f = Math.fround;
    l = f(l);
    r = f(r);
    b = f(b);
    t = f(t);
    zn = f(zn);
    zf = f(zf);
    matrix.identityMatrix(out);
    out[0] = f(f(2.0 * zn) / f(r - l));
    out[5] = f(f(-2.0 * zn) / f(b - t));
    out[8] = f(1.0 + f(f(2.0 * l) / f(r - l)));
    out[9] = f(-1.0 - f(f(2.0 * t) / f(b - t)));
    out[10] = f(zf / f(zn - zf));
    out[14] = f(f(zn * zf) / f(zn - zf));
    out[11] = -1.0;
    out[15] = 0.0;
    return out;
}

/**
 * Carbon: OrthoOffCenterMatrix (math/include/Matrix_inline.h:749-765)
 * Preserves the native float arguments and projection expression order.
 * @param {Float32Array} out Receiving matrix.
 * @param {number} l Native float projection parameter.
 * @param {number} r Native float projection parameter.
 * @param {number} b Native float projection parameter.
 * @param {number} t Native float projection parameter.
 * @param {number} zn Native float projection parameter.
 * @param {number} zf Native float projection parameter.
 * @returns {Float32Array} out
 */
function orthoOffCenterMatrix(out, l, r, b, t, zn, zf)
{
    const f = Math.fround;
    l = f(l);
    r = f(r);
    b = f(b);
    t = f(t);
    zn = f(zn);
    zf = f(zf);
    matrix.identityMatrix(out);
    out[0] = f(2.0 / f(r - l));
    out[5] = f(2.0 / f(t - b));
    out[10] = f(1.0 / f(zn - zf));
    out[12] = f(-1.0 - f(f(2.0 * l) / f(r - l)));
    out[13] = f(1.0 + f(f(2.0 * t) / f(b - t)));
    out[14] = f(zn / f(zn - zf));
    return out;
}

/**
 * Carbon: OrthoNormalBasisZ (math/include/Matrix_inline.h:531-546)
 * Ortho-normal basis whose Z row is the (normalized) given direction
 * @param {Float32Array} out
 * @param {Float32Array} z - 3 floats (may alias out)
 * @returns {Float32Array} out
 */
function orthoNormalBasisZ(out, z)
{
    const vec3_0 = v3Normalize(scratch.vec3_0, z[0], z[1], z[2]);
    matrix.identityMatrix(out);
    out[8] = vec3_0[0];
    out[9] = vec3_0[1];
    out[10] = vec3_0[2];
    let xx, xy, xz;
    if (Math.abs(out[8]) > Math.fround(0.99))
    {
        xx = 0; xy = 1; xz = 0;
    }
    else
    {
        xx = 1; xy = 0; xz = 0;
    }
    const vec3_1 = v3Cross(scratch.vec3_1, xx, xy, xz, out[8], out[9], out[10]);
    const vec3_2 = v3Normalize(scratch.vec3_2, vec3_1[0], vec3_1[1], vec3_1[2]);
    out[4] = vec3_2[0];
    out[5] = vec3_2[1];
    out[6] = vec3_2[2];
    const vec3_3 = v3Cross(scratch.vec3_3, out[4], out[5], out[6], out[8], out[9], out[10]);
    out[0] = vec3_3[0];
    out[1] = vec3_3[1];
    out[2] = vec3_3[2];
    return out;
}

/**
 * Carbon: LookAtMatrix (math/include/Matrix_inline.h:671-701)
 * Look-at view matrix (eye, target, up)
 * @param {Float32Array} out
 * @param {Float32Array} peye - 3 floats
 * @param {Float32Array} pat - 3 floats
 * @param {Float32Array} pup - 3 floats
 * @returns {Float32Array} out
 */
function lookAtMatrix(out, peye, pat, pup)
{
    const ex = peye[0], ey = peye[1], ez = peye[2];
    const vec2x = Math.fround(pat[0] - ex), vec2y = Math.fround(pat[1] - ey), vec2z = Math.fround(pat[2] - ez);
    const vec3_0 = v3Normalize(scratch.vec3_0, vec2x, vec2y, vec2z);
    const vec3_1 = v3Cross(scratch.vec3_1, pup[0], pup[1], pup[2], vec3_0[0], vec3_0[1], vec3_0[2]);
    const vec3_2 = v3Cross(scratch.vec3_2, vec3_0[0], vec3_0[1], vec3_0[2], vec3_1[0], vec3_1[1], vec3_1[2]);
    const vec3_3 = v3Normalize(scratch.vec3_3, vec3_1[0], vec3_1[1], vec3_1[2]);
    const vec3_4 = v3Normalize(scratch.vec3_4, vec3_2[0], vec3_2[1], vec3_2[2]);
    out[0] = -vec3_3[0];
    out[4] = -vec3_3[1];
    out[8] = -vec3_3[2];
    out[12] = v3Dot(vec3_3[0], vec3_3[1], vec3_3[2], ex, ey, ez);
    out[1] = vec3_4[0];
    out[5] = vec3_4[1];
    out[9] = vec3_4[2];
    out[13] = -v3Dot(vec3_4[0], vec3_4[1], vec3_4[2], ex, ey, ez);
    out[2] = -vec3_0[0];
    out[6] = -vec3_0[1];
    out[10] = -vec3_0[2];
    out[14] = v3Dot(vec3_0[0], vec3_0[1], vec3_0[2], ex, ey, ez);
    out[3] = 0.0;
    out[7] = 0.0;
    out[11] = 0.0;
    out[15] = 1.0;
    return out;
}

/**
 * Carbon: TransformationMatrix (math/src/Matrix.cpp:66-144)
 * Transformation matrix with centers (Carbon's 6-pointer overload; any argument may be null):
 * T(-sc) * SR^-1 * S * SR * T(sc - rc) * R * T(rc + t)
 * @param {Float32Array} out
 * @param {?Float32Array} scalingCenter - 3 floats or null
 * @param {?Float32Array} scalingRotation - quaternion or null
 * @param {?Float32Array} scaling - 3 floats or null
 * @param {?Float32Array} rotationCenter - 3 floats or null
 * @param {?Float32Array} rotation - quaternion or null
 * @param {?Float32Array} translation - 3 floats or null
 * @returns {Float32Array} out
 */
function transformationMatrixCentered(out, scalingCenter, scalingRotation, scaling, rotationCenter, rotation, translation)
{
    const { mat4_0, mat4_1, mat4_2, mat4_3, mat4_4, mat4_5, mat4_6 } = scratch;

    let pscx = 0, pscy = 0, pscz = 0;
    if (scalingCenter)
    {
        pscx = scalingCenter[0];
        pscy = scalingCenter[1];
        pscz = scalingCenter[2];
    }
    let prcx = 0, prcy = 0, prcz = 0;
    if (rotationCenter)
    {
        prcx = rotationCenter[0];
        prcy = rotationCenter[1];
        prcz = rotationCenter[2];
    }
    let ptx = 0, pty = 0, ptz = 0;
    if (translation)
    {
        ptx = translation[0];
        pty = translation[1];
        ptz = translation[2];
    }
    matrix.identityMatrix(mat4_0);
    mat4_0[12] = -pscx;
    mat4_0[13] = -pscy;
    mat4_0[14] = -pscz;
    if (!scalingRotation)
    {
        matrix.identityMatrix(mat4_1);
        matrix.identityMatrix(mat4_3);
    }
    else
    {
        rotationMatrixQuaternion(mat4_3, scalingRotation);
        inverse(mat4_1, mat4_3);
    }
    if (!scaling)
    {
        matrix.identityMatrix(mat4_2);
    }
    else
    {
        matrix.scalingMatrix(mat4_2, scaling);
    }
    if (!rotation)
    {
        matrix.identityMatrix(mat4_5);
    }
    else
    {
        rotationMatrixQuaternion(mat4_5, rotation);
    }
    matrix.identityMatrix(mat4_4);
    mat4_4[12] = pscx - prcx;
    mat4_4[13] = pscy - prcy;
    mat4_4[14] = pscz - prcz;
    matrix.identityMatrix(mat4_6);
    mat4_6[12] = prcx + ptx;
    mat4_6[13] = prcy + pty;
    mat4_6[14] = prcz + ptz;
    multiply(out, mat4_0, mat4_1);
    multiply(out, out, mat4_2);
    multiply(out, out, mat4_3);
    multiply(out, out, mat4_4);
    multiply(out, out, mat4_5);
    return multiply(out, out, mat4_6);
}

/**
 * Carbon: Decompose (math/src/Matrix.cpp:225-270)
 * Decomposes a matrix into scaling, rotation quaternion and translation (Carbon's argument order)
 * @param {Float32Array} scaling - receiving vec3
 * @param {Float32Array} rotation - receiving quaternion
 * @param {Float32Array} translation - receiving vec3
 * @param {Float32Array} m
 */
function decompose(scaling, rotation, translation, m)
{
    scaling[0] = v3Length(m[0], m[1], m[2]);
    scaling[1] = v3Length(m[4], m[5], m[6]);
    scaling[2] = v3Length(m[8], m[9], m[10]);

    translation[0] = m[12];
    translation[1] = m[13];
    translation[2] = m[14];

    if (scaling[0] === 0.0 || scaling[1] === 0.0 || scaling[2] === 0.0)
    {
        rotation[0] = 0.0;
        rotation[1] = 0.0;
        rotation[2] = 0.0;
        rotation[3] = 1.0;
    }
    else
    {
        const mat4_7 = matrix.identityMatrix(scratch.mat4_7);
        mat4_7[0] = m[0] / scaling[0];
        mat4_7[1] = m[1] / scaling[0];
        mat4_7[2] = m[2] / scaling[0];
        mat4_7[4] = m[4] / scaling[1];
        mat4_7[5] = m[5] / scaling[1];
        mat4_7[6] = m[6] / scaling[1];
        mat4_7[8] = m[8] / scaling[2];
        mat4_7[9] = m[9] / scaling[2];
        mat4_7[10] = m[10] / scaling[2];
        rotationQuaternionMatrix(rotation, mat4_7);
    }
}

/**
 * Carbon: TransformCoords (math/include/Matrix_inline.h:620-660)
 * Batch TransformCoord over strided arrays (folds Carbon's four TransformCoords
 * overloads; offsets/strides are in floats, out may be the same array as in).
 * Overlapping batches retain native sequential mutations, not whole-batch snapshots.
 * @param {Float32Array} outArray
 * @param {number} outOffset
 * @param {number} outStride
 * @param {Float32Array} inArray
 * @param {number} inOffset
 * @param {number} inStride
 * @param {number} count
 * @param {Float32Array} m
 * @returns {Float32Array} outArray
 */
function transformCoords(outArray, outOffset, outStride, inArray, inOffset, inStride, count, m)
{
    const { vec3_0 } = scratch;
    for (let i = 0; i < count; ++i)
    {
        const src = inOffset + i * inStride;
        const dst = outOffset + i * outStride;
        vec3_0[0] = inArray[src];
        vec3_0[1] = inArray[src + 1];
        vec3_0[2] = inArray[src + 2];
        transformCoord(vec3_0, vec3_0, m);
        outArray[dst] = vec3_0[0];
        outArray[dst + 1] = vec3_0[1];
        outArray[dst + 2] = vec3_0[2];
    }
    return outArray;
}

/**
 * Carbon: Dot (math/include/Vector3_inline.h:163-166)
 * Uses scalar operands without creating vector views.
 * @param {number} ax First X.
 * @param {number} ay First Y.
 * @param {number} az First Z.
 * @param {number} bx Second X.
 * @param {number} by Second Y.
 * @param {number} bz Second Z.
 * @returns {number} Float32 dot product.
 */
function v3Dot(ax, ay, az, bx, by, bz)
{
    const f = Math.fround;
    return f(f(f(ax * bx) + f(ay * by)) + f(az * bz));
}

/**
 * Carbon: Length (math/include/Vector3_inline.h:175-178)
 * Rounds the sum and square root.
 * @param {number} x X component.
 * @param {number} y Y component.
 * @param {number} z Z component.
 * @returns {number} Float32 length.
 */
function v3Length(x, y, z)
{
    return Math.fround(Math.sqrt(v3Dot(x, y, z, x, y, z)));
}

/**
 * Carbon: Normalize (math/include/Vector3_inline.h:181-192)
 * Stores the input vector before invoking the native rounded normalization.
 * @param {Float32Array} out Receiving vector.
 * @param {number} x X component.
 * @param {number} y Y component.
 * @param {number} z Z component.
 * @returns {Float32Array} out
 */
function v3Normalize(out, x, y, z)
{
    out[0] = x; out[1] = y; out[2] = z;
    return vector3Float32.normalize(out, out);
}

/**
 * Carbon: Cross (math/include/Vector3_inline.h:195-199)
 * Rounds each product before subtraction.
 * @param {Float32Array} out Receiving vector.
 * @param {number} ax First X.
 * @param {number} ay First Y.
 * @param {number} az First Z.
 * @param {number} bx Second X.
 * @param {number} by Second Y.
 * @param {number} bz Second Z.
 * @returns {Float32Array} out
 */
function v3Cross(out, ax, ay, az, bx, by, bz)
{
    const f = Math.fround;
    out[0] = f(f(ay * bz) - f(az * by));
    out[1] = f(f(az * bx) - f(ax * bz));
    out[2] = f(f(ax * by) - f(ay * bx));
    return out;
}

/**
 * Carbon: RotationMatrix (math/include/Matrix_inline.h:365-385)
 * Private quaternion overload; the public axis/angle overload remains gated.
 * @param {Float32Array} out Receiving matrix; may overlap q.
 * @param {Float32Array} q Quaternion, not normalized first.
 * @returns {Float32Array} out
 */
function rotationMatrixQuaternion(out, q)
{
    const f = Math.fround;
    const x = q[0], y = q[1], z = q[2], w = q[3];
    out[0] = f(1 - f(2 * f(f(y * y) + f(z * z))));
    out[1] = f(2 * f(f(x * y) + f(z * w)));
    out[2] = f(2 * f(f(x * z) - f(y * w)));
    out[3] = 0;
    out[4] = f(2 * f(f(x * y) - f(z * w)));
    out[5] = f(1 - f(2 * f(f(x * x) + f(z * z))));
    out[6] = f(2 * f(f(y * z) + f(x * w)));
    out[7] = 0;
    out[8] = f(2 * f(f(x * z) + f(y * w)));
    out[9] = f(2 * f(f(y * z) - f(x * w)));
    out[10] = f(1 - f(2 * f(f(x * x) + f(y * y))));
    out[11] = 0; out[12] = 0; out[13] = 0; out[14] = 0; out[15] = 1;
    return out;
}

/**
 * Carbon: RotationQuaternion (math/src/Quaternion.cpp:7-57)
 * Private matrix overload with native trace and strict diagonal-tie branches.
 * @param {Float32Array} out Receiving quaternion; may overlap m.
 * @param {Float32Array} m Matrix.
 * @returns {Float32Array} out
 */
function rotationQuaternionMatrix(out, m)
{
    const f = Math.fround;
    const m00 = m[0], m01 = m[1], m02 = m[2], m10 = m[4], m11 = m[5], m12 = m[6], m20 = m[8], m21 = m[9], m22 = m[10];
    const trace = f(f(f(m00 + m11) + m22) + 1);
    let x, y, z, w;
    if (trace > 1)
    {
        const root = f(Math.sqrt(trace)), denominator = f(2 * root);
        x = f(f(m12 - m21) / denominator);
        y = f(f(m20 - m02) / denominator);
        z = f(f(m01 - m10) / denominator);
        w = f(root / 2);
    }
    else
    {
        let index = 0, diagonal = m00;
        if (m11 > diagonal) { index = 1; diagonal = m11; }
        if (m22 > diagonal) index = 2;
        if (index === 0)
        {
            const t = f(2 * f(Math.sqrt(f(f(f(1 + m00) - m11) - m22))));
            x = f(0.25 * t); y = f(f(m01 + m10) / t); z = f(f(m02 + m20) / t); w = f(f(m12 - m21) / t);
        }
        else if (index === 1)
        {
            const t = f(2 * f(Math.sqrt(f(f(f(1 + m11) - m00) - m22))));
            x = f(f(m01 + m10) / t); y = f(0.25 * t); z = f(f(m12 + m21) / t); w = f(f(m20 - m02) / t);
        }
        else
        {
            const t = f(2 * f(Math.sqrt(f(f(f(1 + m22) - m00) - m11))));
            x = f(f(m02 + m20) / t); y = f(f(m12 + m21) / t); z = f(0.25 * t); w = f(f(m01 - m10) / t);
        }
    }
    out[0] = x; out[1] = y; out[2] = z; out[3] = w;
    return out;
}

/**
 * Private dirty scratch, fully initialized before read and never returned.
 * Builder calls use disjoint slots; multiply/inverse/conversion helpers use scalar locals.
 * No callbacks or nested entry into a builder while its scratch is in use.
 */
const scratch = {
    vec3_0: new Float32Array(3), vec3_1: new Float32Array(3), vec3_2: new Float32Array(3),
    vec3_3: new Float32Array(3), vec3_4: new Float32Array(3),
    mat4_0: new Float32Array(16), mat4_1: new Float32Array(16), mat4_2: new Float32Array(16),
    mat4_3: new Float32Array(16), mat4_4: new Float32Array(16), mat4_5: new Float32Array(16),
    mat4_6: new Float32Array(16), mat4_7: new Float32Array(16)
};

// Operation tables are immutable; numeric results and caller-owned outputs stay writable.
Object.freeze(matrixFloat32);
