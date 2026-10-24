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
    transformCoord, transformNormal, transform, transformByTranspose };

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
 * @param {number} det Float32 determinant.
 * @returns {Float32Array} out
 */
function inverseInto(out, m, det)
{
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
    return inverseInto(out, m, determinant(m));
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
