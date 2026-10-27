import { Quaternion } from "./quaternion.js";

/**
 * Carbon Matrix algorithms with no explicit per-call temporary construction from math
 * (Matrix.h, Matrix_inline.h, src\Matrix.cpp).
 *
 * Storage is a plain Float32Array of 16 floats in Carbon's row-major order:
 * element _rc / m.m[r-1][c-1] sits at flat [(r-1)*4 + (c-1)], so the basis
 * rows X/Y/Z are [0..2]/[4..6]/[8..10] and translation _41 _42 _43 is
 * [12..14]. This is byte-identical to the gl-matrix column-major mat4 layout
 * (comment only; nothing here calls gl-matrix). Carbon composes row-vector
 * style: `a * b` applies a first - multiply unrolls the C++ loop with
 * no operand swap.
 *
 * `out` may alias inputs; locals are used wherever the C++ relied on
 * temporaries.
 *
 * Overload folding (documented deviations from 1:1 names):
 * - Inverse(m) / Inverse(out, m) / Inverse(out, det, m) fold to
 *   inverse(out, m) (singular copies m to out, as Matrix.cpp:7) and
 *   inverseDet(out, m) which returns the determinant and leaves out
 *   untouched when singular (compare the determinant with zero, including for NaN).
 * - TransformationMatrix's 6-pointer overload is transformationMatrixCentered.
 * - Transform's Vector4/Vector3/Vector2 overloads dispatch on input length.
 * - The four TransformCoords batch overloads fold to one explicit
 *   offset/stride form (strides in floats).
 * - operator!= is the negation of exactEquals; unary + is copy/clone;
 *   operator(row, col) is plain [row * 4 + col] indexing;
 *   float*Matrix and Matrix*float are both scale; the XMMATRIX conversions
 *   have no JS counterpart.
 *
 * @typedef {Float32Array} matrix
 */

export class Matrix
{
    /**
     * Creates an identity matrix (Carbon's default constructor)
     * @returns {matrix}
     */
    static create()
    {
        const out = new Float32Array(16);
        out[0] = out[5] = out[10] = out[15] = 1;
        return out;
    } // Matrix_inline.h:7

    /**
     * Sets a matrix from 16 values in Carbon row order (_11.._44)
     * @param {matrix} out
     * @returns {matrix} out
     */
    static set(
        out,
        f11, f12, f13, f14,
        f21, f22, f23, f24,
        f31, f32, f33, f34,
        f41, f42, f43, f44)
    {
        out[0] = f11; out[1] = f12; out[2] = f13; out[3] = f14;
        out[4] = f21; out[5] = f22; out[6] = f23; out[7] = f24;
        out[8] = f31; out[9] = f32; out[10] = f33; out[11] = f34;
        out[12] = f41; out[13] = f42; out[14] = f43; out[15] = f44;
        return out;
    } // Matrix_inline.h:16

    /**
     * Copies a matrix (Carbon's copy construction / unary operator+)
     * @param {matrix} out
     * @param {matrix} a
     * @returns {matrix} out
     */
    static copy(out, a)
    {
        for (let i = 0; i < 16; ++i) out[i] = a[i];
        return out;
    } // Matrix_inline.h:166

    /**
     * Clones a matrix
     * @param {matrix} a
     * @returns {matrix}
     */
    static clone(a)
    {
        return new Float32Array(a);
    } // Matrix_inline.h:166

    /**
     * Adds two matrices (Carbon operator+ / operator+=)
     * @param {matrix} out
     * @param {matrix} a
     * @param {matrix} b
     * @returns {matrix} out
     */
    static add(out, a, b)
    {
        for (let i = 0; i < 16; ++i) out[i] = a[i] + b[i];
        return out;
    } // Matrix_inline.h:53

    /**
     * Subtracts b from a (Carbon operator- / operator-=)
     * @param {matrix} out
     * @param {matrix} a
     * @param {matrix} b
     * @returns {matrix} out
     */
    static subtract(out, a, b)
    {
        for (let i = 0; i < 16; ++i) out[i] = a[i] - b[i];
        return out;
    } // Matrix_inline.h:79

    /**
     * Carbon: Matrix::operator* (math/include/Matrix_inline.h:193-204)
     * Multiplies matrices in Carbon order: a applied first, then b.
     * Adapted: Unrolled double arithmetic with cached operands and caller-owned output.
     * @param {matrix} out - may alias a or b
     * @param {matrix} a
     * @param {matrix} b
     * @returns {matrix} out
     */
    static multiply(out, a, b)
    {
        const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
            a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
            a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
            a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
        const b00 = b[0], b01 = b[1], b02 = b[2], b03 = b[3],
            b10 = b[4], b11 = b[5], b12 = b[6], b13 = b[7],
            b20 = b[8], b21 = b[9], b22 = b[10], b23 = b[11],
            b30 = b[12], b31 = b[13], b32 = b[14], b33 = b[15];

        // out.m[i][j] = m[i][0]*other.m[0][j] + m[i][1]*other.m[1][j] + m[i][2]*other.m[2][j] + m[i][3]*other.m[3][j]
        out[0] = a00 * b00 + a01 * b10 + a02 * b20 + a03 * b30;
        out[1] = a00 * b01 + a01 * b11 + a02 * b21 + a03 * b31;
        out[2] = a00 * b02 + a01 * b12 + a02 * b22 + a03 * b32;
        out[3] = a00 * b03 + a01 * b13 + a02 * b23 + a03 * b33;
        out[4] = a10 * b00 + a11 * b10 + a12 * b20 + a13 * b30;
        out[5] = a10 * b01 + a11 * b11 + a12 * b21 + a13 * b31;
        out[6] = a10 * b02 + a11 * b12 + a12 * b22 + a13 * b32;
        out[7] = a10 * b03 + a11 * b13 + a12 * b23 + a13 * b33;
        out[8] = a20 * b00 + a21 * b10 + a22 * b20 + a23 * b30;
        out[9] = a20 * b01 + a21 * b11 + a22 * b21 + a23 * b31;
        out[10] = a20 * b02 + a21 * b12 + a22 * b22 + a23 * b32;
        out[11] = a20 * b03 + a21 * b13 + a22 * b23 + a23 * b33;
        out[12] = a30 * b00 + a31 * b10 + a32 * b20 + a33 * b30;
        out[13] = a30 * b01 + a31 * b11 + a32 * b21 + a33 * b31;
        out[14] = a30 * b02 + a31 * b12 + a32 * b22 + a33 * b32;
        out[15] = a30 * b03 + a31 * b13 + a32 * b23 + a33 * b33;
        return out;
    } // Matrix_inline.h:193

    /**
     * Scales a matrix by a scalar (Carbon operator* float; also covers float * Matrix)
     * @param {matrix} out
     * @param {matrix} a
     * @param {number} f
     * @returns {matrix} out
     */
    static scale(out, a, f)
    {
        for (let i = 0; i < 16; ++i) out[i] = a[i] * f;
        return out;
    } // Matrix_inline.h:112 (and :287)

    /**
     * Divides a matrix by a scalar (Carbon operator/ float: multiplies by 1/f)
     * @param {matrix} out
     * @param {matrix} a
     * @param {number} f
     * @returns {matrix} out
     */
    static divide(out, a, f)
    {
        const fDiv = 1.0 / f;
        for (let i = 0; i < 16; ++i) out[i] = a[i] * fDiv;
        return out;
    } // Matrix_inline.h:138

    /**
     * Negates a matrix (Carbon unary operator-)
     * @param {matrix} out
     * @param {matrix} a
     * @returns {matrix} out
     */
    static negate(out, a)
    {
        for (let i = 0; i < 16; ++i) out[i] = -a[i];
        return out;
    } // Matrix_inline.h:172

    /**
     * Compares two matrices exactly (Carbon operator==; != is the negation)
     * @param {matrix} a
     * @param {matrix} b
     * @returns {boolean}
     */
    static exactEquals(a, b)
    {
        for (let i = 0; i < 16; ++i)
        {
            if (a[i] !== b[i]) return false;
        }
        return true;
    } // Matrix_inline.h:219

    /**
     * Copies the X basis row (_11 _12 _13) into out
     * @param {Float32Array} out - receiving vec3
     * @param {matrix} m
     * @returns {Float32Array} out
     */
    static getX(out, m)
    {
        out[0] = m[0];
        out[1] = m[1];
        out[2] = m[2];
        return out;
    } // Matrix_inline.h:251

    /**
     * Copies the Y basis row (_21 _22 _23) into out
     * @param {Float32Array} out - receiving vec3
     * @param {matrix} m
     * @returns {Float32Array} out
     */
    static getY(out, m)
    {
        out[0] = m[4];
        out[1] = m[5];
        out[2] = m[6];
        return out;
    } // Matrix_inline.h:263

    /**
     * Copies the Z basis row (_31 _32 _33) into out
     * @param {Float32Array} out - receiving vec3
     * @param {matrix} m
     * @returns {Float32Array} out
     */
    static getZ(out, m)
    {
        out[0] = m[8];
        out[1] = m[9];
        out[2] = m[10];
        return out;
    } // Matrix_inline.h:275

    /**
     * Copies the translation row (_41 _42 _43) into out
     * @param {Float32Array} out - receiving vec3
     * @param {matrix} m
     * @returns {Float32Array} out
     */
    static getTranslation(out, m)
    {
        out[0] = m[12];
        out[1] = m[13];
        out[2] = m[14];
        return out;
    } // Matrix_inline.h:239

    /**
     * Mutable zero-copy view of the X basis row (aliases m)
     * @param {matrix} m
     * @returns {Float32Array}
     */
    static viewX(m)
    {
        return m.subarray(0, 3);
    } // Matrix_inline.h:257

    /**
     * Mutable zero-copy view of the Y basis row (aliases m)
     * @param {matrix} m
     * @returns {Float32Array}
     */
    static viewY(m)
    {
        return m.subarray(4, 7);
    } // Matrix_inline.h:269

    /**
     * Mutable zero-copy view of the Z basis row (aliases m)
     * @param {matrix} m
     * @returns {Float32Array}
     */
    static viewZ(m)
    {
        return m.subarray(8, 11);
    } // Matrix_inline.h:281

    /**
     * Mutable zero-copy view of the translation row (aliases m)
     * @param {matrix} m
     * @returns {Float32Array}
     */
    static viewTranslation(m)
    {
        return m.subarray(12, 15);
    } // Matrix_inline.h:245

    /**
     * Sets the identity matrix
     * @param {matrix} out
     * @returns {matrix} out
     */
    static identityMatrix(out)
    {
        return Matrix.set(out,
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1);
    } // Matrix_inline.h:315

    /**
     * Carbon: TranslationMatrix (math/include/Matrix.h:76-77)
     * Routes Carbon's two overloads by arity, which JS sees exactly; engine code calls
     * translationMatrix__XYZ or translationMatrix__Vector3.
     * @param {matrix} out
     * @param {number|Float32Array} x X, or the translation vector
     * @param {number} [y]
     * @param {number} [z]
     * @returns {matrix} out
     */
    static translationMatrix(out, x, y, z)
    {
        if (y === undefined) return Matrix.translationMatrix__Vector3(out, x);
        return Matrix.translationMatrix__XYZ(out, x, y, z);
    }

    /**
     * Carbon: TranslationMatrix( float x, float y, float z ) (math/include/Matrix_inline.h:325)
     * @param {matrix} out
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {matrix} out
     */
    static translationMatrix__XYZ(out, x, y, z)
    {
        return Matrix.set(out,
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            x, y, z, 1);
    } // Matrix_inline.h:325

    /**
     * Carbon: TranslationMatrix( const Vector3& translation ) (math/include/Matrix_inline.h:335)
     * @param {matrix} out
     * @param {Float32Array} translation
     * @returns {matrix} out
     */
    static translationMatrix__Vector3(out, translation)
    {
        return Matrix.set(out,
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            translation[0], translation[1], translation[2], 1);
    } // Matrix_inline.h:335

    /**
     * Carbon: ScalingMatrix (math/include/Matrix.h:78-79)
     * Routes Carbon's two overloads by arity, which JS sees exactly; engine code calls
     * scalingMatrix__XYZ or scalingMatrix__Vector3.
     * @param {matrix} out
     * @param {number|Float32Array} sx X scale, or the scaling vector
     * @param {number} [sy]
     * @param {number} [sz]
     * @returns {matrix} out
     */
    static scalingMatrix(out, sx, sy, sz)
    {
        if (sy === undefined) return Matrix.scalingMatrix__Vector3(out, sx);
        return Matrix.scalingMatrix__XYZ(out, sx, sy, sz);
    }

    /**
     * Carbon: ScalingMatrix( float sx, float sy, float sz ) (math/include/Matrix_inline.h:345)
     * @param {matrix} out
     * @param {number} sx
     * @param {number} sy
     * @param {number} sz
     * @returns {matrix} out
     */
    static scalingMatrix__XYZ(out, sx, sy, sz)
    {
        return Matrix.set(out,
            sx, 0, 0, 0,
            0, sy, 0, 0,
            0, 0, sz, 0,
            0, 0, 0, 1);
    } // Matrix_inline.h:345

    /**
     * Carbon: ScalingMatrix( const Vector3& scaling ) (math/include/Matrix_inline.h:355)
     * @param {matrix} out
     * @param {Float32Array} scaling
     * @returns {matrix} out
     */
    static scalingMatrix__Vector3(out, scaling)
    {
        return Matrix.set(out,
            scaling[0], 0, 0, 0,
            0, scaling[1], 0, 0,
            0, 0, scaling[2], 0,
            0, 0, 0, 1);
    } // Matrix_inline.h:355

    /**
     * Carbon: RotationMatrix (math/include/Matrix.h:80-81)
     * Routes Carbon's two overloads by arity, which JS sees exactly; engine code calls
     * rotationMatrix__Quaternion or rotationMatrix__AxisAngle.
     * @param {matrix} out
     * @param {Float32Array} a Quaternion, or the rotation axis
     * @param {number} [angle]
     * @returns {matrix} out
     */
    static rotationMatrix(out, a, angle)
    {
        if (angle !== undefined) return Matrix.rotationMatrix__AxisAngle(out, a, angle);
        return Matrix.rotationMatrix__Quaternion(out, a);
    }

    /**
     * Rotation matrix from a quaternion (not normalized first, as C++)
     * @param {matrix} out
     * @param {Float32Array} q - quaternion [x, y, z, w]
     * @returns {matrix} out
     */
    static rotationMatrix__Quaternion(out, q)
    {
        const x = q[0], y = q[1], z = q[2], w = q[3];
        out[0] = 1.0 - 2.0 * (y * y + z * z);
        out[1] = 2.0 * (x * y + z * w);
        out[2] = 2.0 * (x * z - y * w);
        out[3] = 0.0;
        out[4] = 2.0 * (x * y - z * w);
        out[5] = 1.0 - 2.0 * (x * x + z * z);
        out[6] = 2.0 * (y * z + x * w);
        out[7] = 0.0;
        out[8] = 2.0 * (x * z + y * w);
        out[9] = 2.0 * (y * z - x * w);
        out[10] = 1.0 - 2.0 * (x * x + y * y);
        out[11] = 0.0;
        out[12] = 0.0;
        out[13] = 0.0;
        out[14] = 0.0;
        out[15] = 1.0;
        return out;
    } // Matrix_inline.h:365

    /**
     * Carbon: RotationMatrix (math/include/Matrix_inline.h:388-413)
     * Rotation matrix from an axis (normalized internally) and an angle
     * @param {matrix} out
     * @param {Float32Array} axis - 3 floats
     * @param {number} angle
     * @returns {matrix} out
     */
    static rotationMatrix__AxisAngle(out, axis, angle)
    {
        const vec3_0 = v3Normalize(scratch.vec3_0, axis[0], axis[1], axis[2]);
        const nx = vec3_0[0], ny = vec3_0[1], nz = vec3_0[2];

        const sinAngle = Math.sin(angle);
        const cosAngle = Math.cos(angle);

        out[0] = (1.0 - cosAngle) * nx * nx + cosAngle;
        out[4] = (1.0 - cosAngle) * nx * ny - sinAngle * nz;
        out[8] = (1.0 - cosAngle) * nx * nz + sinAngle * ny;
        out[12] = 0;
        out[1] = (1.0 - cosAngle) * ny * nx + sinAngle * nz;
        out[5] = (1.0 - cosAngle) * ny * ny + cosAngle;
        out[9] = (1.0 - cosAngle) * ny * nz - sinAngle * nx;
        out[13] = 0;
        out[2] = (1.0 - cosAngle) * nz * nx - sinAngle * ny;
        out[6] = (1.0 - cosAngle) * nz * ny + sinAngle * nx;
        out[10] = (1.0 - cosAngle) * nz * nz + cosAngle;
        out[14] = 0;
        out[3] = 0;
        out[7] = 0;
        out[11] = 0;
        out[15] = 1;
        return out;
    } // Matrix_inline.h:388

    /**
     * Rotation matrix about the X axis
     * @param {matrix} out
     * @param {number} angle
     * @returns {matrix} out
     */
    static rotationXMatrix(out, angle)
    {
        const sinAngle = Math.sin(angle);
        const cosAngle = Math.cos(angle);
        return Matrix.set(out,
            1, 0, 0, 0,
            0, cosAngle, sinAngle, 0,
            0, -sinAngle, cosAngle, 0,
            0, 0, 0, 1);
    } // Matrix_inline.h:416

    /**
     * Rotation matrix about the Y axis
     * @param {matrix} out
     * @param {number} angle
     * @returns {matrix} out
     */
    static rotationYMatrix(out, angle)
    {
        const sinAngle = Math.sin(angle);
        const cosAngle = Math.cos(angle);
        return Matrix.set(out,
            cosAngle, 0, -sinAngle, 0,
            0, 1, 0, 0,
            sinAngle, 0, cosAngle, 0,
            0, 0, 0, 1);
    } // Matrix_inline.h:442

    /**
     * Rotation matrix about the Z axis
     * @param {matrix} out
     * @param {number} angle
     * @returns {matrix} out
     */
    static rotationZMatrix(out, angle)
    {
        const sinAngle = Math.sin(angle);
        const cosAngle = Math.cos(angle);
        return Matrix.set(out,
            cosAngle, sinAngle, 0, 0,
            -sinAngle, cosAngle, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1);
    } // Matrix_inline.h:468

    /**
     * Carbon: OrthoNormalBasisZ (math/include/Matrix_inline.h:531-546)
     * Ortho-normal basis whose Z row is the (normalized) given direction
     * @param {matrix} out
     * @param {Float32Array} z - 3 floats (may alias out)
     * @returns {matrix} out
     */
    static orthoNormalBasisZ(out, z)
    {
        const vec3_0 = v3Normalize(scratch.vec3_0, z[0], z[1], z[2]);
        Matrix.identityMatrix(out);
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
    } // Matrix_inline.h:531

    /**
     * Orthographic projection from width/height and near/far
     * @param {matrix} out
     * @param {number} width
     * @param {number} height
     * @param {number} zNear
     * @param {number} zFar
     * @returns {matrix} out
     */
    static orthographicProjection(out, width, height, zNear, zFar)
    {
        Matrix.identityMatrix(out);
        out[0] = 2.0 / width;
        out[5] = 2.0 / height;
        out[10] = 1.0 / (zNear - zFar);
        out[14] = zNear / (zNear - zFar);
        return out;
    } // Matrix_inline.h:549

    /**
     * Carbon: TransformationMatrix (math/include/Matrix_inline.h:662-668)
     * Transformation matrix from scaling, rotation quaternion and translation:
     * ScalingMatrix(s) * RotationMatrix(r) * TranslationMatrix(t) (row-vector: scale first).
     * Adapted: Cached scalar intermediates replace temporary matrices; float32 matrix
     * storage boundaries and all zero terms are retained. No temporary allocation.
     * @param {matrix} out
     * @param {Float32Array} scaling - 3 floats
     * @param {Float32Array} rotation - quaternion
     * @param {Float32Array} translation - 3 floats
     * @returns {matrix} out
     */
    static transformationMatrix(out, scaling, rotation, translation)
    {
        const f = Math.fround;
        const sx = f(scaling[0]), sy = f(scaling[1]), sz = f(scaling[2]);
        const x = rotation[0], y = rotation[1], z = rotation[2], w = rotation[3];
        const tx = f(translation[0]), ty = f(translation[1]), tz = f(translation[2]);

        // RotationMatrix stores each component as float before S * R.
        const r0 = f(1 - 2 * (y * y + z * z));
        const r1 = f(2 * (x * y + z * w));
        const r2 = f(2 * (x * z - y * w));
        const r4 = f(2 * (x * y - z * w));
        const r5 = f(1 - 2 * (x * x + z * z));
        const r6 = f(2 * (y * z + x * w));
        const r8 = f(2 * (x * z + y * w));
        const r9 = f(2 * (y * z - x * w));
        const r10 = f(1 - 2 * (x * x + y * y));

        // Keep zero terms: removing them changes non-finite and signed-zero behavior.
        const sr0 = f(sx * r0 + 0 * r4 + 0 * r8 + 0 * 0);
        const sr1 = f(sx * r1 + 0 * r5 + 0 * r9 + 0 * 0);
        const sr2 = f(sx * r2 + 0 * r6 + 0 * r10 + 0 * 0);
        const sr3 = f(sx * 0 + 0 * 0 + 0 * 0 + 0 * 1);
        const sr4 = f(0 * r0 + sy * r4 + 0 * r8 + 0 * 0);
        const sr5 = f(0 * r1 + sy * r5 + 0 * r9 + 0 * 0);
        const sr6 = f(0 * r2 + sy * r6 + 0 * r10 + 0 * 0);
        const sr7 = f(0 * 0 + sy * 0 + 0 * 0 + 0 * 1);
        const sr8 = f(0 * r0 + 0 * r4 + sz * r8 + 0 * 0);
        const sr9 = f(0 * r1 + 0 * r5 + sz * r9 + 0 * 0);
        const sr10 = f(0 * r2 + 0 * r6 + sz * r10 + 0 * 0);
        const sr11 = f(0 * 0 + 0 * 0 + sz * 0 + 0 * 1);
        const sr12 = f(0 * r0 + 0 * r4 + 0 * r8 + 1 * 0);
        const sr13 = f(0 * r1 + 0 * r5 + 0 * r9 + 1 * 0);
        const sr14 = f(0 * r2 + 0 * r6 + 0 * r10 + 1 * 0);
        const sr15 = f(0 * 0 + 0 * 0 + 0 * 0 + 1 * 1);

        // All inputs are captured before output writes, including aliased TRS views.
        out[0] = sr0 * 1 + sr1 * 0 + sr2 * 0 + sr3 * tx;
        out[1] = sr0 * 0 + sr1 * 1 + sr2 * 0 + sr3 * ty;
        out[2] = sr0 * 0 + sr1 * 0 + sr2 * 1 + sr3 * tz;
        out[3] = sr0 * 0 + sr1 * 0 + sr2 * 0 + sr3 * 1;
        out[4] = sr4 * 1 + sr5 * 0 + sr6 * 0 + sr7 * tx;
        out[5] = sr4 * 0 + sr5 * 1 + sr6 * 0 + sr7 * ty;
        out[6] = sr4 * 0 + sr5 * 0 + sr6 * 1 + sr7 * tz;
        out[7] = sr4 * 0 + sr5 * 0 + sr6 * 0 + sr7 * 1;
        out[8] = sr8 * 1 + sr9 * 0 + sr10 * 0 + sr11 * tx;
        out[9] = sr8 * 0 + sr9 * 1 + sr10 * 0 + sr11 * ty;
        out[10] = sr8 * 0 + sr9 * 0 + sr10 * 1 + sr11 * tz;
        out[11] = sr8 * 0 + sr9 * 0 + sr10 * 0 + sr11 * 1;
        out[12] = sr12 * 1 + sr13 * 0 + sr14 * 0 + sr15 * tx;
        out[13] = sr12 * 0 + sr13 * 1 + sr14 * 0 + sr15 * ty;
        out[14] = sr12 * 0 + sr13 * 0 + sr14 * 1 + sr15 * tz;
        out[15] = sr12 * 0 + sr13 * 0 + sr14 * 0 + sr15 * 1;
        return out;
    } // Matrix_inline.h:662

    /**
     * Carbon: TransformationMatrix (math/src/Matrix.cpp:66-143)
     * Transformation matrix with centers (Carbon's 6-pointer overload; any argument may be null):
     * T(-sc) * SR^-1 * S * SR * T(sc - rc) * R * T(rc + t)
     * @param {matrix} out
     * @param {?Float32Array} scalingCenter - 3 floats or null
     * @param {?Float32Array} scalingRotation - quaternion or null
     * @param {?Float32Array} scaling - 3 floats or null
     * @param {?Float32Array} rotationCenter - 3 floats or null
     * @param {?Float32Array} rotation - quaternion or null
     * @param {?Float32Array} translation - 3 floats or null
     * @returns {matrix} out
     */
    static transformationMatrixCentered(out, scalingCenter, scalingRotation, scaling, rotationCenter, rotation, translation)
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
        Matrix.identityMatrix(mat4_0);
        mat4_0[12] = -pscx;
        mat4_0[13] = -pscy;
        mat4_0[14] = -pscz;
        if (!scalingRotation)
        {
            Matrix.identityMatrix(mat4_1);
            Matrix.identityMatrix(mat4_3);
        }
        else
        {
            Matrix.rotationMatrix__Quaternion(mat4_3, scalingRotation);
            Matrix.inverse(mat4_1, mat4_3);
        }
        if (!scaling)
        {
            Matrix.identityMatrix(mat4_2);
        }
        else
        {
            Matrix.scalingMatrix__Vector3(mat4_2, scaling);
        }
        if (!rotation)
        {
            Matrix.identityMatrix(mat4_5);
        }
        else
        {
            Matrix.rotationMatrix__Quaternion(mat4_5, rotation);
        }
        Matrix.identityMatrix(mat4_4);
        mat4_4[12] = pscx - prcx;
        mat4_4[13] = pscy - prcy;
        mat4_4[14] = pscz - prcz;
        Matrix.identityMatrix(mat4_6);
        mat4_6[12] = prcx + ptx;
        mat4_6[13] = prcy + pty;
        mat4_6[14] = prcz + ptz;
        Matrix.multiply(out, mat4_0, mat4_1);
        Matrix.multiply(out, out, mat4_2);
        Matrix.multiply(out, out, mat4_3);
        Matrix.multiply(out, out, mat4_4);
        Matrix.multiply(out, out, mat4_5);
        return Matrix.multiply(out, out, mat4_6);
    } // Matrix.cpp:66

    /**
     * Carbon: Transformation2DMatrix (math/src/Matrix.cpp:147-222)
     * 2D transformation matrix (Carbon's Vector2 overload; vector arguments may be null, rotations are scalars)
     * @param {matrix} out
     * @param {?Float32Array} scalingCenter - 2 floats or null
     * @param {number} scalingRotation
     * @param {?Float32Array} scaling - 2 floats or null
     * @param {?Float32Array} rotationCenter - 2 floats or null
     * @param {number} rotation
     * @param {?Float32Array} translation - 2 floats or null
     * @returns {matrix} out
     */
    static transformation2DMatrix(out, scalingCenter, scalingRotation, scaling, rotationCenter, rotation, translation)
    {
        const { mat4_0, mat4_1, mat4_2, mat4_3, mat4_4, mat4_5, mat4_6 } = scratch;

        let pscx = 0, pscy = 0;
        if (scalingCenter)
        {
            pscx = scalingCenter[0];
            pscy = scalingCenter[1];
        }
        const pscz = 0;
        let prcx = 0, prcy = 0;
        if (rotationCenter)
        {
            prcx = rotationCenter[0];
            prcy = rotationCenter[1];
        }
        const prcz = 0;
        let ptx = 0, pty = 0;
        if (translation)
        {
            ptx = translation[0];
            pty = translation[1];
        }
        const ptz = 0;
        Matrix.identityMatrix(mat4_0);
        mat4_0[12] = -pscx;
        mat4_0[13] = -pscy;
        mat4_0[14] = -pscz;
        if (scalingRotation === 0)
        {
            Matrix.identityMatrix(mat4_1);
            Matrix.identityMatrix(mat4_3);
        }
        else
        {
            Matrix.rotationZMatrix(mat4_3, scalingRotation);
            Matrix.inverse(mat4_1, mat4_3);
        }
        if (!scaling)
        {
            Matrix.identityMatrix(mat4_2);
        }
        else
        {
            Matrix.scalingMatrix__XYZ(mat4_2, scaling[0], scaling[1], 1.0);
        }
        if (rotation === 0)
        {
            Matrix.identityMatrix(mat4_5);
        }
        else
        {
            Matrix.rotationZMatrix(mat4_5, rotation);
        }
        Matrix.identityMatrix(mat4_4);
        mat4_4[12] = pscx - prcx;
        mat4_4[13] = pscy - prcy;
        mat4_4[14] = pscz - prcz;
        Matrix.identityMatrix(mat4_6);
        mat4_6[12] = prcx + ptx;
        mat4_6[13] = prcy + pty;
        mat4_6[14] = prcz + ptz;
        Matrix.multiply(out, mat4_0, mat4_1);
        Matrix.multiply(out, out, mat4_2);
        Matrix.multiply(out, out, mat4_3);
        Matrix.multiply(out, out, mat4_4);
        Matrix.multiply(out, out, mat4_5);
        return Matrix.multiply(out, out, mat4_6);
    } // Matrix.cpp:147

    /**
     * Carbon: LookAtMatrix (math/include/Matrix_inline.h:671-701)
     * Look-at view matrix (eye, target, up)
     * @param {matrix} out
     * @param {Float32Array} peye - 3 floats
     * @param {Float32Array} pat - 3 floats
     * @param {Float32Array} pup - 3 floats
     * @returns {matrix} out
     */
    static lookAtMatrix(out, peye, pat, pup)
    {
        const ex = peye[0], ey = peye[1], ez = peye[2];
        const vec2x = pat[0] - ex, vec2y = pat[1] - ey, vec2z = pat[2] - ez;
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
    } // Matrix_inline.h:671

    /**
     * Perspective projection from vertical field of view and aspect ratio
     * @param {matrix} out
     * @param {number} fovy
     * @param {number} aspect
     * @param {number} zn
     * @param {number} zf
     * @returns {matrix} out
     */
    static perspectiveFovMatrix(out, fovy, aspect, zn, zf)
    {
        Matrix.identityMatrix(out);
        out[0] = 1.0 / (aspect * Math.tan(fovy / 2.0));
        out[5] = 1.0 / Math.tan(fovy / 2.0);
        out[10] = zf / (zn - zf);
        out[11] = -1.0;
        out[14] = (zf * zn) / (zn - zf);
        out[15] = 0.0;
        return out;
    } // Matrix_inline.h:704

    /**
     * Off-center perspective projection
     * @param {matrix} out
     * @param {number} l
     * @param {number} r
     * @param {number} b
     * @param {number} t
     * @param {number} zn
     * @param {number} zf
     * @returns {matrix} out
     */
    static perspectiveOffCenterMatrix(out, l, r, b, t, zn, zf)
    {
        Matrix.identityMatrix(out);
        out[0] = 2.0 * zn / (r - l);
        out[5] = -2.0 * zn / (b - t);
        out[8] = 1.0 + 2.0 * l / (r - l);
        out[9] = -1.0 - 2.0 * t / (b - t);
        out[10] = zf / (zn - zf);
        out[14] = (zn * zf) / (zn - zf);
        out[11] = -1.0;
        out[15] = 0.0;
        return out;
    } // Matrix_inline.h:717

    /**
     * Orthographic projection from width/height
     * @param {matrix} out
     * @param {number} w
     * @param {number} h
     * @param {number} zn
     * @param {number} zf
     * @returns {matrix} out
     */
    static orthoMatrix(out, w, h, zn, zf)
    {
        Matrix.identityMatrix(out);
        out[0] = 2.0 / w;
        out[5] = 2.0 / h;
        out[10] = 1.0 / (zn - zf);
        out[14] = zn / (zn - zf);
        return out;
    } // Matrix_inline.h:738

    /**
     * Off-center orthographic projection
     * @param {matrix} out
     * @param {number} l
     * @param {number} r
     * @param {number} b
     * @param {number} t
     * @param {number} zn
     * @param {number} zf
     * @returns {matrix} out
     */
    static orthoOffCenterMatrix(out, l, r, b, t, zn, zf)
    {
        Matrix.identityMatrix(out);
        out[0] = 2.0 / (r - l);
        out[5] = 2.0 / (t - b);
        out[10] = 1.0 / (zn - zf);
        out[12] = -1.0 - 2.0 * l / (r - l);
        out[13] = 1.0 + 2.0 * t / (b - t);
        out[14] = zn / (zn - zf);
        return out;
    } // Matrix_inline.h:749

    /**
     * Transposes a matrix
     * @param {matrix} out - may alias m
     * @param {matrix} m
     * @returns {matrix} out
     */
    static transpose(out, m)
    {
        const m01 = m[1], m02 = m[2], m03 = m[3],
            m10 = m[4], m12 = m[6], m13 = m[7],
            m20 = m[8], m21 = m[9], m23 = m[11],
            m30 = m[12], m31 = m[13], m32 = m[14];
        out[0] = m[0]; out[1] = m10; out[2] = m20; out[3] = m30;
        out[4] = m01; out[5] = m[5]; out[6] = m21; out[7] = m31;
        out[8] = m02; out[9] = m12; out[10] = m[10]; out[11] = m32;
        out[12] = m03; out[13] = m13; out[14] = m23; out[15] = m[15];
        return out;
    } // Matrix_inline.h:494

    /**
     * Determinant of a matrix
     * @param {matrix} m
     * @returns {number}
     */
    static determinant(m)
    {
        const a0 = m[0] * m[5] - m[1] * m[4];
        const a1 = m[0] * m[6] - m[2] * m[4];
        const a2 = m[0] * m[7] - m[3] * m[4];
        const a3 = m[1] * m[6] - m[2] * m[5];
        const a4 = m[1] * m[7] - m[3] * m[5];
        const a5 = m[2] * m[7] - m[3] * m[6];
        const b0 = m[8] * m[13] - m[9] * m[12];
        const b1 = m[8] * m[14] - m[10] * m[12];
        const b2 = m[8] * m[15] - m[11] * m[12];
        const b3 = m[9] * m[14] - m[10] * m[13];
        const b4 = m[9] * m[15] - m[11] * m[13];
        const b5 = m[10] * m[15] - m[11] * m[14];
        return a0 * b5 - a1 * b4 + a2 * b3 + a3 * b2 - a4 * b1 + a5 * b0;
    } // Matrix_inline.h:505

    /**
     * Carbon: Inverse (math/src/Matrix.cpp:7-46)
     * Inverts a matrix; a singular matrix is copied through unchanged.
     * Adapted: Caller-owned output, double scalar intermediates, float32 result storage.
     * @param {matrix} out - may alias m
     * @param {matrix} m
     * @returns {matrix} out
     */
    static inverse(out, m)
    {
        return inverseInto(out, m);
    } // Matrix.cpp:7

    /**
     * Carbon: Inverse (math/src/Matrix.cpp:49-62)
     * Inverts a matrix and returns the determinant; when singular (0) out is left
     * untouched. Adapted: Returns the determinant in place of the C++ output reference;
     * test it against zero, not JS truthiness (NaN still takes the inversion path).
     * @param {matrix} out - may alias m
     * @param {matrix} m
     * @returns {number} determinant
     */
    static inverseDet(out, m)
    {
        const det = Matrix.determinant(m);
        if (det === 0)
        {
            return det;
        }
        inverseInto(out, m, det);
        return det;
    } // Matrix.cpp:49 (bool Inverse(out, det, m); Matrix_inline.h:524 folds here)

    /**
     * Carbon: TransformCoord (math/include/Matrix_inline.h:560-577)
     * Transforms a coordinate (row-vector v * M with perspective divide; zero norm yields the origin)
     * @param {Float32Array} out - receiving vec3 (may alias coord or the matrix)
     * @param {Float32Array} coord - 3 floats
     * @param {matrix} transform
     * @returns {Float32Array} out
     */
    static transformCoord(out, coord, transform)
    {
        const x = coord[0], y = coord[1], z = coord[2];
        const norm = transform[3] * x + transform[7] * y + transform[11] * z + transform[15];
        if (norm !== 0)
        {
            const result0 = (x * transform[0] + y * transform[4] + z * transform[8] + transform[12]) / norm;
            const result1 = (x * transform[1] + y * transform[5] + z * transform[9] + transform[13]) / norm;
            const result2 = (x * transform[2] + y * transform[6] + z * transform[10] + transform[14]) / norm;
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
    } // Matrix_inline.h:560

    /**
     * Carbon: TransformNormal (math/include/Matrix_inline.h:580-586)
     * Transforms a normal (row-vector v * M, rotation part only)
     * @param {Float32Array} out - receiving vec3 (may alias normal or the matrix)
     * @param {Float32Array} normal - 3 floats
     * @param {matrix} transform
     * @returns {Float32Array} out
     */
    static transformNormal(out, normal, transform)
    {
        const x = normal[0], y = normal[1], z = normal[2];
        const result0 = x * transform[0] + y * transform[4] + z * transform[8];
        const result1 = x * transform[1] + y * transform[5] + z * transform[9];
        const result2 = x * transform[2] + y * transform[6] + z * transform[10];
        out[0] = result0;
        out[1] = result1;
        out[2] = result2;
        return out;
    } // Matrix_inline.h:580

    /**
     * Carbon: Transform (math/include/Matrix.h, three overloads)
     * Routes by point.length, exactly 4, 3 or 2, and throws otherwise: a length is all JS
     * can see of the C++ point type, so engine code calls transform__Vector4,
     * transform__Vector3 or transform__Vector2.
     * @param {Float32Array} out - receiving vec4 (may alias point or the matrix)
     * @param {Float32Array} point - 4, 3 or 2 floats
     * @param {matrix} m
     * @returns {Float32Array} out
     */
    static transform(out, point, m)
    {
        switch (point.length)
        {
            case 4: return Matrix.transform__Vector4(out, point, m);
            case 3: return Matrix.transform__Vector3(out, point, m);
            case 2: return Matrix.transform__Vector2(out, point, m);
        }
        throw new TypeError(`Matrix.transform: no Carbon overload takes a ${point.length}-component point.`);
    }

    /**
     * Carbon: Transform( const Vector4& point, const Matrix& transform ) (math/include/Matrix_inline.h:589)
     * Row-vector transform p * m; also Carbon's operator*( Vector4, Matrix ) (:293, identical arithmetic).
     * @param {Float32Array} out - receiving vec4 (may alias point or the matrix)
     * @param {Float32Array} point - 4 floats
     * @param {matrix} m
     * @returns {Float32Array} out
     */
    static transform__Vector4(out, point, m)
    {
        const x = point[0], y = point[1], z = point[2], w = point[3];
        const result0 = x * m[0] + y * m[4] + z * m[8] + w * m[12];
        const result1 = x * m[1] + y * m[5] + z * m[9] + w * m[13];
        const result2 = x * m[2] + y * m[6] + z * m[10] + w * m[14];
        const result3 = x * m[3] + y * m[7] + z * m[11] + w * m[15];
        out[0] = result0;
        out[1] = result1;
        out[2] = result2;
        out[3] = result3;
        return out;
    } // Matrix_inline.h:589

    /**
     * Carbon: Transform( const Vector3& point, const Matrix& transform ) (math/include/Matrix_inline.h:599)
     * Point transform with an implicit w of 1; Carbon's w is the plain column sum, ported as is.
     * @param {Float32Array} out - receiving vec4 (may alias point or the matrix)
     * @param {Float32Array} point - 3 floats
     * @param {matrix} m
     * @returns {Float32Array} out
     */
    static transform__Vector3(out, point, m)
    {
        const x = point[0], y = point[1], z = point[2];
        const result0 = x * m[0] + y * m[4] + z * m[8] + m[12];
        const result1 = x * m[1] + y * m[5] + z * m[9] + m[13];
        const result2 = x * m[2] + y * m[6] + z * m[10] + m[14];
        const result3 = m[3] + m[7] + m[11] + m[15];
        out[0] = result0;
        out[1] = result1;
        out[2] = result2;
        out[3] = result3;
        return out;
    } // Matrix_inline.h:599

    /**
     * Carbon: Transform( const Vector2& v, const Matrix& m ) (math/include/Matrix_inline.h:609)
     * @param {Float32Array} out - receiving vec4 (may alias v or the matrix)
     * @param {Float32Array} v - 2 floats
     * @param {matrix} m
     * @returns {Float32Array} out
     */
    static transform__Vector2(out, v, m)
    {
        const x = v[0], y = v[1];
        const result0 = x * m[0] + y * m[4] + m[12];
        const result1 = x * m[1] + y * m[5] + m[13];
        const result2 = x * m[2] + y * m[6] + m[14];
        const result3 = x * m[3] + y * m[7] + m[15];
        out[0] = result0;
        out[1] = result1;
        out[2] = result2;
        out[3] = result3;
        return out;
    } // Matrix_inline.h:609

    /**
     * Carbon: Matrix::operator* (math/include/Matrix_inline.h:304-311)
     * Carbon operator*(Matrix, Vector4): dots the matrix ROWS with p - the
     * transpose of Matrix.transform, deliberately a different function
     * @param {Float32Array} out - receiving vec4 (may alias p or the matrix)
     * @param {Float32Array} p - 4 floats
     * @param {matrix} m
     * @returns {Float32Array} out
     */
    static transformByTranspose(out, p, m)
    {
        const x = p[0], y = p[1], z = p[2], w = p[3];
        const result0 = m[0] * x + m[1] * y + m[2] * z + m[3] * w;
        const result1 = m[4] * x + m[5] * y + m[6] * z + m[7] * w;
        const result2 = m[8] * x + m[9] * y + m[10] * z + m[11] * w;
        const result3 = m[12] * x + m[13] * y + m[14] * z + m[15] * w;
        out[0] = result0;
        out[1] = result1;
        out[2] = result2;
        out[3] = result3;
        return out;
    } // Matrix_inline.h:304

    /**
     * Carbon: TransformCoords (math/include/Matrix_inline.h:620-660)
     * Batch TransformCoord over strided arrays (folds Carbon's four TransformCoords
     * overloads; offsets/strides are in floats, out may be the same array as in)
     * @param {Float32Array} outArray
     * @param {number} outOffset
     * @param {number} outStride
     * @param {Float32Array} inArray
     * @param {number} inOffset
     * @param {number} inStride
     * @param {number} count
     * @param {matrix} m
     * @returns {Float32Array} outArray
     */
    static transformCoords(outArray, outOffset, outStride, inArray, inOffset, inStride, count, m)
    {
        const { vec3_0 } = scratch;
        for (let i = 0; i < count; ++i)
        {
            const src = inOffset + i * inStride;
            const dst = outOffset + i * outStride;
            vec3_0[0] = inArray[src];
            vec3_0[1] = inArray[src + 1];
            vec3_0[2] = inArray[src + 2];
            Matrix.transformCoord(vec3_0, vec3_0, m);
            outArray[dst] = vec3_0[0];
            outArray[dst + 1] = vec3_0[1];
            outArray[dst + 2] = vec3_0[2];
        }
        return outArray;
    } // Matrix_inline.h:620 (also :631, :640, :650)

    /**
     * Carbon: Decompose (math/src/Matrix.cpp:225-269)
     * Decomposes a matrix into scaling, rotation quaternion and translation (Carbon's argument order)
     * @param {Float32Array} scaling - receiving vec3
     * @param {Float32Array} rotation - receiving quaternion
     * @param {Float32Array} translation - receiving vec3
     * @param {matrix} m
     */
    static decompose(scaling, rotation, translation, m)
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
            const mat4_7 = Matrix.identityMatrix(scratch.mat4_7);
            mat4_7[0] = m[0] / scaling[0];
            mat4_7[1] = m[1] / scaling[0];
            mat4_7[2] = m[2] / scaling[0];
            mat4_7[4] = m[4] / scaling[1];
            mat4_7[5] = m[5] / scaling[1];
            mat4_7[6] = m[6] / scaling[1];
            mat4_7[8] = m[8] / scaling[2];
            mat4_7[9] = m[9] / scaling[2];
            mat4_7[10] = m[10] / scaling[2];
            Quaternion.rotationQuaternion__Matrix(rotation, mat4_7);
        }
    } // Matrix.cpp:225
}

// ---------------------------------------------------------------------------
// Inlined Carbon vector arithmetic (Vector3/Vector4 modules are not a
// dependency of this file; these are literal ports used internally).
// ---------------------------------------------------------------------------

/** Vector3 dot product */
function v3Dot(ax, ay, az, bx, by, bz)
{
    return ax * bx + ay * by + az * bz;
} // Vector3_inline.h:163

/** Vector3 length */
function v3Length(x, y, z)
{
    return Math.sqrt(v3Dot(x, y, z, x, y, z));
} // Vector3_inline.h:175

/** Vector3 normalize (overflow-guarded, writes [x, y, z] into out3) */
function v3Normalize(out3, x, y, z)
{
    const max = Math.max(Math.max(Math.abs(x), Math.abs(y)), Math.abs(z));
    const d = max ? max : 1;
    const mx = x / d, my = y / d, mz = z / d;
    let length = v3Length(mx, my, mz);
    if (length) length = 1 / length;
    out3[0] = mx * length;
    out3[1] = my * length;
    out3[2] = mz * length;
    return out3;
} // Vector3_inline.h:181

/** Vector3 cross product (writes [x, y, z] into out3) */
function v3Cross(out3, ax, ay, az, bx, by, bz)
{
    out3[0] = ay * bz - az * by;
    out3[1] = az * bx - ax * bz;
    out3[2] = ax * by - ay * bx;
    return out3;
} // Vector3_inline.h:195

// ---------------------------------------------------------------------------
// Construction / element access
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Compound operators
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Basis accessors. Carbon returns mutable Vector3 references into the matrix;
// the view* forms are the equivalent zero-copy aliases (subarrays SHARE the
// matrix storage - writes through them write the matrix), the get* forms copy.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Transpose / determinant / inverse
// ---------------------------------------------------------------------------

/**
 * Carbon: Inverse (math/src/Matrix.cpp:7-46)
 * Unrolls the donor row gathers and Vector4 Cross expressions into caller-owned storage.
 * Adapted: Double scalar intermediates; preserve the returned Matrix's float32 storage.
 * Cache all input elements before writing so out may overlap the input.
 * @param {matrix} out Receiving matrix.
 * @param {matrix} m Input matrix.
 * @param {number} [det] Optional precomputed determinant; zero copies m, NaN follows the donor arithmetic path.
 * @returns {matrix} out
 */
function inverseInto(out, m, det)
{
    // Inline the donor determinant when no scalar return is needed.
    if (det === undefined)
    {
        const a0 = m[0] * m[5] - m[1] * m[4];
        const a1 = m[0] * m[6] - m[2] * m[4];
        const a2 = m[0] * m[7] - m[3] * m[4];
        const a3 = m[1] * m[6] - m[2] * m[5];
        const a4 = m[1] * m[7] - m[3] * m[5];
        const a5 = m[2] * m[7] - m[3] * m[6];
        const b0 = m[8] * m[13] - m[9] * m[12];
        const b1 = m[8] * m[14] - m[10] * m[12];
        const b2 = m[8] * m[15] - m[11] * m[12];
        const b3 = m[9] * m[14] - m[10] * m[13];
        const b4 = m[9] * m[15] - m[11] * m[13];
        const b5 = m[10] * m[15] - m[11] * m[14];
        det = a0 * b5 - a1 * b4 + a2 * b3 + a3 * b2 - a4 * b1 + a5 * b0;
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

    const signedDet0 = 1 / det;
    out[0] = f(signedDet0 * (m5 * (m10 * m15 - m14 * m11) - m6 * (m9 * m15 - m13 * m11) + m7 * (m9 * m14 - m10 * m13)));
    out[4] = f(signedDet0 * (-(m4 * (m10 * m15 - m14 * m11) - m6 * (m8 * m15 - m12 * m11) + m7 * (m8 * m14 - m12 * m10))));
    out[8] = f(signedDet0 * (m4 * (m9 * m15 - m13 * m11) - m5 * (m8 * m15 - m12 * m11) + m7 * (m8 * m13 - m12 * m9)));
    out[12] = f(signedDet0 * (-(m4 * (m9 * m14 - m13 * m10) - m5 * (m8 * m14 - m12 * m10) + m6 * (m8 * m13 - m12 * m9))));

    const signedDet1 = -1 / det;
    out[1] = f(signedDet1 * (m1 * (m10 * m15 - m14 * m11) - m2 * (m9 * m15 - m13 * m11) + m3 * (m9 * m14 - m10 * m13)));
    out[5] = f(signedDet1 * (-(m0 * (m10 * m15 - m14 * m11) - m2 * (m8 * m15 - m12 * m11) + m3 * (m8 * m14 - m12 * m10))));
    out[9] = f(signedDet1 * (m0 * (m9 * m15 - m13 * m11) - m1 * (m8 * m15 - m12 * m11) + m3 * (m8 * m13 - m12 * m9)));
    out[13] = f(signedDet1 * (-(m0 * (m9 * m14 - m13 * m10) - m1 * (m8 * m14 - m12 * m10) + m2 * (m8 * m13 - m12 * m9))));

    const signedDet2 = 1 / det;
    out[2] = f(signedDet2 * (m1 * (m6 * m15 - m14 * m7) - m2 * (m5 * m15 - m13 * m7) + m3 * (m5 * m14 - m6 * m13)));
    out[6] = f(signedDet2 * (-(m0 * (m6 * m15 - m14 * m7) - m2 * (m4 * m15 - m12 * m7) + m3 * (m4 * m14 - m12 * m6))));
    out[10] = f(signedDet2 * (m0 * (m5 * m15 - m13 * m7) - m1 * (m4 * m15 - m12 * m7) + m3 * (m4 * m13 - m12 * m5)));
    out[14] = f(signedDet2 * (-(m0 * (m5 * m14 - m13 * m6) - m1 * (m4 * m14 - m12 * m6) + m2 * (m4 * m13 - m12 * m5))));

    const signedDet3 = -1 / det;
    out[3] = f(signedDet3 * (m1 * (m6 * m11 - m10 * m7) - m2 * (m5 * m11 - m9 * m7) + m3 * (m5 * m10 - m6 * m9)));
    out[7] = f(signedDet3 * (-(m0 * (m6 * m11 - m10 * m7) - m2 * (m4 * m11 - m8 * m7) + m3 * (m4 * m10 - m8 * m6))));
    out[11] = f(signedDet3 * (m0 * (m5 * m11 - m9 * m7) - m1 * (m4 * m11 - m8 * m7) + m3 * (m4 * m9 - m8 * m5)));
    out[15] = f(signedDet3 * (-(m0 * (m5 * m10 - m9 * m6) - m1 * (m4 * m10 - m8 * m6) + m2 * (m4 * m9 - m8 * m5))));
    return out;
}

// ---------------------------------------------------------------------------
// Transforms
// ---------------------------------------------------------------------------

// Private, dirty scratch: every used component is written before it is read.
// These algorithms do not call one another or pass callbacks while holding slots.
// Float64 vectors preserve the fast implementation's double intermediates; matrices
// preserve Carbon's float32 storage boundaries. Scratch never escapes this module.
const scratch = {
    vec3_0: new Float64Array(3),
    vec3_1: new Float64Array(3),
    vec3_2: new Float64Array(3),
    vec3_3: new Float64Array(3),
    vec3_4: new Float64Array(3),
    mat4_0: Matrix.create(),
    mat4_1: Matrix.create(),
    mat4_2: Matrix.create(),
    mat4_3: Matrix.create(),
    mat4_4: Matrix.create(),
    mat4_5: Matrix.create(),
    mat4_6: Matrix.create(),
    mat4_7: Matrix.create()
};
