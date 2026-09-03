import { quaternion } from "./quaternion.js";

/**
 * Carbon Matrix, ported literally from e:\carbonengine\math
 * (Matrix.h, Matrix_inline.h, src\Matrix.cpp).
 *
 * Storage is a plain Float32Array of 16 floats in Carbon's row-major order:
 * element _rc / m.m[r-1][c-1] sits at flat [(r-1)*4 + (c-1)], so the basis
 * rows X/Y/Z are [0..2]/[4..6]/[8..10] and translation _41 _42 _43 is
 * [12..14]. This is byte-identical to the gl-matrix column-major mat4 layout
 * (comment only; nothing here calls gl-matrix). Carbon composes row-vector
 * style: `a * b` applies a first - multiply ports the C++ loop literally with
 * no operand swap.
 *
 * `out` may alias inputs; locals are used wherever the C++ relied on
 * temporaries.
 *
 * Overload folding (documented deviations from 1:1 names):
 * - Inverse(m) / Inverse(out, m) / Inverse(out, det, m) fold to
 *   inverse(out, m) (singular copies m to out, as Matrix.cpp:7) and
 *   inverseDet(out, m) which returns the determinant and leaves out
 *   untouched when singular (truthiness of the return is Carbon's bool).
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

export const matrix = {};

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

/** Vector4 triple cross product (writes [x, y, z, w] into out4) */
function v4Cross(out4, v1, v2, v3)
{
    out4[0] = v1[1] * (v2[2] * v3[3] - v3[2] * v2[3]) - v1[2] * (v2[1] * v3[3] - v3[1] * v2[3]) + v1[3] * (v2[1] * v3[2] - v2[2] * v3[1]);
    out4[1] = -(v1[0] * (v2[2] * v3[3] - v3[2] * v2[3]) - v1[2] * (v2[0] * v3[3] - v3[0] * v2[3]) + v1[3] * (v2[0] * v3[2] - v3[0] * v2[2]));
    out4[2] = v1[0] * (v2[1] * v3[3] - v3[1] * v2[3]) - v1[1] * (v2[0] * v3[3] - v3[0] * v2[3]) + v1[3] * (v2[0] * v3[1] - v3[0] * v2[1]);
    out4[3] = -(v1[0] * (v2[1] * v3[2] - v3[1] * v2[2]) - v1[1] * (v2[0] * v3[2] - v3[0] * v2[2]) + v1[2] * (v2[0] * v3[1] - v3[0] * v2[1]));
    return out4;
} // Vector4_inline.h:186

// ---------------------------------------------------------------------------
// Construction / element access
// ---------------------------------------------------------------------------

/**
 * Creates an identity matrix (Carbon's default constructor)
 * @returns {matrix}
 */
matrix.create = function ()
{
    const out = new Float32Array(16);
    out[0] = out[5] = out[10] = out[15] = 1;
    return out;
}; // Matrix_inline.h:7

/**
 * Sets a matrix from 16 values in Carbon row order (_11.._44)
 * @param {matrix} out
 * @returns {matrix} out
 */
matrix.set = function (
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
}; // Matrix_inline.h:16

/**
 * Copies a matrix (Carbon's copy construction / unary operator+)
 * @param {matrix} out
 * @param {matrix} a
 * @returns {matrix} out
 */
matrix.copy = function (out, a)
{
    for (let i = 0; i < 16; ++i) out[i] = a[i];
    return out;
}; // Matrix_inline.h:166

/**
 * Clones a matrix
 * @param {matrix} a
 * @returns {matrix}
 */
matrix.clone = function (a)
{
    return new Float32Array(a);
}; // Matrix_inline.h:166

// ---------------------------------------------------------------------------
// Compound operators
// ---------------------------------------------------------------------------

/**
 * Adds two matrices (Carbon operator+ / operator+=)
 * @param {matrix} out
 * @param {matrix} a
 * @param {matrix} b
 * @returns {matrix} out
 */
matrix.add = function (out, a, b)
{
    for (let i = 0; i < 16; ++i) out[i] = a[i] + b[i];
    return out;
}; // Matrix_inline.h:53

/**
 * Subtracts b from a (Carbon operator- / operator-=)
 * @param {matrix} out
 * @param {matrix} a
 * @param {matrix} b
 * @returns {matrix} out
 */
matrix.subtract = function (out, a, b)
{
    for (let i = 0; i < 16; ++i) out[i] = a[i] - b[i];
    return out;
}; // Matrix_inline.h:79

/**
 * Multiplies matrices: Carbon `a * b` (row-vector: a applied first), ported literally - do not swap
 * @param {matrix} out - may alias a or b
 * @param {matrix} a
 * @param {matrix} b
 * @returns {matrix} out
 */
matrix.multiply = function (out, a, b)
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
}; // Matrix_inline.h:193

/**
 * Scales a matrix by a scalar (Carbon operator* float; also covers float * Matrix)
 * @param {matrix} out
 * @param {matrix} a
 * @param {number} f
 * @returns {matrix} out
 */
matrix.scale = function (out, a, f)
{
    for (let i = 0; i < 16; ++i) out[i] = a[i] * f;
    return out;
}; // Matrix_inline.h:112 (and :287)

/**
 * Divides a matrix by a scalar (Carbon operator/ float: multiplies by 1/f)
 * @param {matrix} out
 * @param {matrix} a
 * @param {number} f
 * @returns {matrix} out
 */
matrix.divide = function (out, a, f)
{
    const fDiv = 1.0 / f;
    for (let i = 0; i < 16; ++i) out[i] = a[i] * fDiv;
    return out;
}; // Matrix_inline.h:138

/**
 * Negates a matrix (Carbon unary operator-)
 * @param {matrix} out
 * @param {matrix} a
 * @returns {matrix} out
 */
matrix.negate = function (out, a)
{
    for (let i = 0; i < 16; ++i) out[i] = -a[i];
    return out;
}; // Matrix_inline.h:172

/**
 * Compares two matrices exactly (Carbon operator==; != is the negation)
 * @param {matrix} a
 * @param {matrix} b
 * @returns {boolean}
 */
matrix.exactEquals = function (a, b)
{
    for (let i = 0; i < 16; ++i)
    {
        if (a[i] !== b[i]) return false;
    }
    return true;
}; // Matrix_inline.h:219

// ---------------------------------------------------------------------------
// Basis accessors. Carbon returns mutable Vector3 references into the matrix;
// the view* forms are the equivalent zero-copy aliases (subarrays SHARE the
// matrix storage - writes through them write the matrix), the get* forms copy.
// ---------------------------------------------------------------------------

/**
 * Copies the X basis row (_11 _12 _13) into out
 * @param {Float32Array} out - receiving vec3
 * @param {matrix} m
 * @returns {Float32Array} out
 */
matrix.getX = function (out, m)
{
    out[0] = m[0];
    out[1] = m[1];
    out[2] = m[2];
    return out;
}; // Matrix_inline.h:251

/**
 * Copies the Y basis row (_21 _22 _23) into out
 * @param {Float32Array} out - receiving vec3
 * @param {matrix} m
 * @returns {Float32Array} out
 */
matrix.getY = function (out, m)
{
    out[0] = m[4];
    out[1] = m[5];
    out[2] = m[6];
    return out;
}; // Matrix_inline.h:263

/**
 * Copies the Z basis row (_31 _32 _33) into out
 * @param {Float32Array} out - receiving vec3
 * @param {matrix} m
 * @returns {Float32Array} out
 */
matrix.getZ = function (out, m)
{
    out[0] = m[8];
    out[1] = m[9];
    out[2] = m[10];
    return out;
}; // Matrix_inline.h:275

/**
 * Copies the translation row (_41 _42 _43) into out
 * @param {Float32Array} out - receiving vec3
 * @param {matrix} m
 * @returns {Float32Array} out
 */
matrix.getTranslation = function (out, m)
{
    out[0] = m[12];
    out[1] = m[13];
    out[2] = m[14];
    return out;
}; // Matrix_inline.h:239

/**
 * Mutable zero-copy view of the X basis row (aliases m)
 * @param {matrix} m
 * @returns {Float32Array}
 */
matrix.viewX = function (m)
{
    return m.subarray(0, 3);
}; // Matrix_inline.h:257

/**
 * Mutable zero-copy view of the Y basis row (aliases m)
 * @param {matrix} m
 * @returns {Float32Array}
 */
matrix.viewY = function (m)
{
    return m.subarray(4, 7);
}; // Matrix_inline.h:269

/**
 * Mutable zero-copy view of the Z basis row (aliases m)
 * @param {matrix} m
 * @returns {Float32Array}
 */
matrix.viewZ = function (m)
{
    return m.subarray(8, 11);
}; // Matrix_inline.h:281

/**
 * Mutable zero-copy view of the translation row (aliases m)
 * @param {matrix} m
 * @returns {Float32Array}
 */
matrix.viewTranslation = function (m)
{
    return m.subarray(12, 15);
}; // Matrix_inline.h:245

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

/**
 * Sets the identity matrix
 * @param {matrix} out
 * @returns {matrix} out
 */
matrix.identityMatrix = function (out)
{
    return matrix.set(out,
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1);
}; // Matrix_inline.h:315

/**
 * Translation matrix: (out, x, y, z) or (out, v) by arity, like Carbon's two overloads
 * @param {matrix} out
 * @returns {matrix} out
 */
matrix.translationMatrix = function (out, x, y, z)
{
    if (y === undefined)
    {
        const v = x;
        x = v[0];
        y = v[1];
        z = v[2];
    }
    return matrix.set(out,
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        x, y, z, 1);
}; // Matrix_inline.h:325 (values) / :335 (Vector3)

/**
 * Scaling matrix: (out, sx, sy, sz) or (out, v) by arity, like Carbon's two overloads
 * @param {matrix} out
 * @returns {matrix} out
 */
matrix.scalingMatrix = function (out, sx, sy, sz)
{
    if (sy === undefined)
    {
        const v = sx;
        sx = v[0];
        sy = v[1];
        sz = v[2];
    }
    return matrix.set(out,
        sx, 0, 0, 0,
        0, sy, 0, 0,
        0, 0, sz, 0,
        0, 0, 0, 1);
}; // Matrix_inline.h:345 (values) / :355 (Vector3)

/**
 * Rotation matrix: (out, q) from a quaternion or (out, axis, angle) by arity
 * @param {matrix} out
 * @returns {matrix} out
 */
matrix.rotationMatrix = function (out, a, angle)
{
    if (angle !== undefined) return rotationMatrixAxisAngle(out, a, angle);
    return rotationMatrixQuaternion(out, a);
};

/**
 * Rotation matrix from a quaternion (not normalized first, as C++)
 * @param {matrix} out
 * @param {Float32Array} q - quaternion [x, y, z, w]
 * @returns {matrix} out
 */
function rotationMatrixQuaternion(out, q)
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
 * Rotation matrix from an axis (normalized internally) and an angle
 * @param {matrix} out
 * @param {Float32Array} axis - 3 floats
 * @param {number} angle
 * @returns {matrix} out
 */
function rotationMatrixAxisAngle(out, axis, angle)
{
    const n = v3Normalize([0, 0, 0], axis[0], axis[1], axis[2]);
    const nx = n[0], ny = n[1], nz = n[2];

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
matrix.rotationXMatrix = function (out, angle)
{
    const sinAngle = Math.sin(angle);
    const cosAngle = Math.cos(angle);
    return matrix.set(out,
        1, 0, 0, 0,
        0, cosAngle, sinAngle, 0,
        0, -sinAngle, cosAngle, 0,
        0, 0, 0, 1);
}; // Matrix_inline.h:416

/**
 * Rotation matrix about the Y axis
 * @param {matrix} out
 * @param {number} angle
 * @returns {matrix} out
 */
matrix.rotationYMatrix = function (out, angle)
{
    const sinAngle = Math.sin(angle);
    const cosAngle = Math.cos(angle);
    return matrix.set(out,
        cosAngle, 0, -sinAngle, 0,
        0, 1, 0, 0,
        sinAngle, 0, cosAngle, 0,
        0, 0, 0, 1);
}; // Matrix_inline.h:442

/**
 * Rotation matrix about the Z axis
 * @param {matrix} out
 * @param {number} angle
 * @returns {matrix} out
 */
matrix.rotationZMatrix = function (out, angle)
{
    const sinAngle = Math.sin(angle);
    const cosAngle = Math.cos(angle);
    return matrix.set(out,
        cosAngle, sinAngle, 0, 0,
        -sinAngle, cosAngle, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1);
}; // Matrix_inline.h:468

/**
 * Ortho-normal basis whose Z row is the (normalized) given direction
 * @param {matrix} out
 * @param {Float32Array} z - 3 floats (may alias out)
 * @returns {matrix} out
 */
matrix.orthoNormalBasisZ = function (out, z)
{
    const zn = v3Normalize([0, 0, 0], z[0], z[1], z[2]);
    matrix.identityMatrix(out);
    out[8] = zn[0];
    out[9] = zn[1];
    out[10] = zn[2];
    let xx, xy, xz;
    if (Math.abs(out[8]) > 0.99)
    {
        xx = 0; xy = 1; xz = 0;
    }
    else
    {
        xx = 1; xy = 0; xz = 0;
    }
    const cy = v3Cross([0, 0, 0], xx, xy, xz, out[8], out[9], out[10]);
    const yn = v3Normalize([0, 0, 0], cy[0], cy[1], cy[2]);
    out[4] = yn[0];
    out[5] = yn[1];
    out[6] = yn[2];
    const cx = v3Cross([0, 0, 0], out[4], out[5], out[6], out[8], out[9], out[10]);
    out[0] = cx[0];
    out[1] = cx[1];
    out[2] = cx[2];
    return out;
}; // Matrix_inline.h:531

/**
 * Orthographic projection from width/height and near/far
 * @param {matrix} out
 * @param {number} width
 * @param {number} height
 * @param {number} zNear
 * @param {number} zFar
 * @returns {matrix} out
 */
matrix.orthographicProjection = function (out, width, height, zNear, zFar)
{
    matrix.identityMatrix(out);
    out[0] = 2.0 / width;
    out[5] = 2.0 / height;
    out[10] = 1.0 / (zNear - zFar);
    out[14] = zNear / (zNear - zFar);
    return out;
}; // Matrix_inline.h:549

/**
 * Transformation matrix from scaling, rotation quaternion and translation:
 * ScalingMatrix(s) * RotationMatrix(r) * TranslationMatrix(t) (row-vector: scale first)
 * @param {matrix} out
 * @param {Float32Array} scaling - 3 floats
 * @param {Float32Array} rotation - quaternion
 * @param {Float32Array} translation - 3 floats
 * @returns {matrix} out
 */
matrix.transformationMatrix = function (out, scaling, rotation, translation)
{
    const s = matrix.scalingMatrix(new Float32Array(16), scaling);
    const r = matrix.rotationMatrix(new Float32Array(16), rotation);
    const t = matrix.translationMatrix(new Float32Array(16), translation);
    matrix.multiply(out, s, r);
    return matrix.multiply(out, out, t);
}; // Matrix_inline.h:662

/**
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
matrix.transformationMatrixCentered = function (out, scalingCenter, scalingRotation, scaling, rotationCenter, rotation, translation)
{
    const m1 = new Float32Array(16), m2 = new Float32Array(16), m3 = new Float32Array(16),
        m4 = new Float32Array(16), m5 = new Float32Array(16), m6 = new Float32Array(16),
        m7 = new Float32Array(16);

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
    matrix.translationMatrix(m1, -pscx, -pscy, -pscz);
    if (!scalingRotation)
    {
        matrix.identityMatrix(m2);
        matrix.identityMatrix(m4);
    }
    else
    {
        matrix.rotationMatrix(m4, scalingRotation);
        matrix.inverse(m2, m4);
    }
    if (!scaling)
    {
        matrix.identityMatrix(m3);
    }
    else
    {
        matrix.scalingMatrix(m3, scaling);
    }
    if (!rotation)
    {
        matrix.identityMatrix(m6);
    }
    else
    {
        matrix.rotationMatrix(m6, rotation);
    }
    matrix.translationMatrix(m5, pscx - prcx, pscy - prcy, pscz - prcz);
    matrix.translationMatrix(m7, prcx + ptx, prcy + pty, prcz + ptz);
    matrix.multiply(out, m1, m2);
    matrix.multiply(out, out, m3);
    matrix.multiply(out, out, m4);
    matrix.multiply(out, out, m5);
    matrix.multiply(out, out, m6);
    return matrix.multiply(out, out, m7);
}; // Matrix.cpp:66

/**
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
matrix.transformation2DMatrix = function (out, scalingCenter, scalingRotation, scaling, rotationCenter, rotation, translation)
{
    const m1 = new Float32Array(16), m2 = new Float32Array(16), m3 = new Float32Array(16),
        m4 = new Float32Array(16), m5 = new Float32Array(16), m6 = new Float32Array(16),
        m7 = new Float32Array(16);

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
    matrix.translationMatrix(m1, -pscx, -pscy, -pscz);
    if (!scalingRotation)
    {
        matrix.identityMatrix(m2);
        matrix.identityMatrix(m4);
    }
    else
    {
        matrix.rotationZMatrix(m4, scalingRotation);
        matrix.inverse(m2, m4);
    }
    if (!scaling)
    {
        matrix.identityMatrix(m3);
    }
    else
    {
        matrix.scalingMatrix(m3, scaling[0], scaling[1], 1.0);
    }
    if (!rotation)
    {
        matrix.identityMatrix(m6);
    }
    else
    {
        matrix.rotationZMatrix(m6, rotation);
    }
    matrix.translationMatrix(m5, pscx - prcx, pscy - prcy, pscz - prcz);
    matrix.translationMatrix(m7, prcx + ptx, prcy + pty, prcz + ptz);
    matrix.multiply(out, m1, m2);
    matrix.multiply(out, out, m3);
    matrix.multiply(out, out, m4);
    matrix.multiply(out, out, m5);
    matrix.multiply(out, out, m6);
    return matrix.multiply(out, out, m7);
}; // Matrix.cpp:147

/**
 * Look-at view matrix (eye, target, up)
 * @param {matrix} out
 * @param {Float32Array} peye - 3 floats
 * @param {Float32Array} pat - 3 floats
 * @param {Float32Array} pup - 3 floats
 * @returns {matrix} out
 */
matrix.lookAtMatrix = function (out, peye, pat, pup)
{
    const ex = peye[0], ey = peye[1], ez = peye[2];
    const vec2x = pat[0] - ex, vec2y = pat[1] - ey, vec2z = pat[2] - ez;
    const vec = v3Normalize([0, 0, 0], vec2x, vec2y, vec2z);
    const right = v3Cross([0, 0, 0], pup[0], pup[1], pup[2], vec[0], vec[1], vec[2]);
    const up = v3Cross([0, 0, 0], vec[0], vec[1], vec[2], right[0], right[1], right[2]);
    const rightn = v3Normalize([0, 0, 0], right[0], right[1], right[2]);
    const upn = v3Normalize([0, 0, 0], up[0], up[1], up[2]);
    out[0] = -rightn[0];
    out[4] = -rightn[1];
    out[8] = -rightn[2];
    out[12] = v3Dot(rightn[0], rightn[1], rightn[2], ex, ey, ez);
    out[1] = upn[0];
    out[5] = upn[1];
    out[9] = upn[2];
    out[13] = -v3Dot(upn[0], upn[1], upn[2], ex, ey, ez);
    out[2] = -vec[0];
    out[6] = -vec[1];
    out[10] = -vec[2];
    out[14] = v3Dot(vec[0], vec[1], vec[2], ex, ey, ez);
    out[3] = 0.0;
    out[7] = 0.0;
    out[11] = 0.0;
    out[15] = 1.0;
    return out;
}; // Matrix_inline.h:671

/**
 * Perspective projection from vertical field of view and aspect ratio
 * @param {matrix} out
 * @param {number} fovy
 * @param {number} aspect
 * @param {number} zn
 * @param {number} zf
 * @returns {matrix} out
 */
matrix.perspectiveFovMatrix = function (out, fovy, aspect, zn, zf)
{
    matrix.identityMatrix(out);
    out[0] = 1.0 / (aspect * Math.tan(fovy / 2.0));
    out[5] = 1.0 / Math.tan(fovy / 2.0);
    out[10] = zf / (zn - zf);
    out[11] = -1.0;
    out[14] = (zf * zn) / (zn - zf);
    out[15] = 0.0;
    return out;
}; // Matrix_inline.h:704

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
matrix.perspectiveOffCenterMatrix = function (out, l, r, b, t, zn, zf)
{
    matrix.identityMatrix(out);
    out[0] = 2.0 * zn / (r - l);
    out[5] = -2.0 * zn / (b - t);
    out[8] = 1.0 + 2.0 * l / (r - l);
    out[9] = -1.0 - 2.0 * t / (b - t);
    out[10] = zf / (zn - zf);
    out[14] = (zn * zf) / (zn - zf);
    out[11] = -1.0;
    out[15] = 0.0;
    return out;
}; // Matrix_inline.h:717

/**
 * Orthographic projection from width/height
 * @param {matrix} out
 * @param {number} w
 * @param {number} h
 * @param {number} zn
 * @param {number} zf
 * @returns {matrix} out
 */
matrix.orthoMatrix = function (out, w, h, zn, zf)
{
    matrix.identityMatrix(out);
    out[0] = 2.0 / w;
    out[5] = 2.0 / h;
    out[10] = 1.0 / (zn - zf);
    out[14] = zn / (zn - zf);
    return out;
}; // Matrix_inline.h:738

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
matrix.orthoOffCenterMatrix = function (out, l, r, b, t, zn, zf)
{
    matrix.identityMatrix(out);
    out[0] = 2.0 / (r - l);
    out[5] = 2.0 / (t - b);
    out[10] = 1.0 / (zn - zf);
    out[12] = -1.0 - 2.0 * l / (r - l);
    out[13] = 1.0 + 2.0 * t / (b - t);
    out[14] = zn / (zn - zf);
    return out;
}; // Matrix_inline.h:749

// ---------------------------------------------------------------------------
// Transpose / determinant / inverse
// ---------------------------------------------------------------------------

/**
 * Transposes a matrix
 * @param {matrix} out - may alias m
 * @param {matrix} m
 * @returns {matrix} out
 */
matrix.transpose = function (out, m)
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
}; // Matrix_inline.h:494

/**
 * Determinant of a matrix
 * @param {matrix} m
 * @returns {number}
 */
matrix.determinant = function (m)
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
}; // Matrix_inline.h:505

/**
 * Inverts a matrix into a scratch (shared by inverse/inverseDet); assumes det != 0
 * @param {matrix} out - must not alias m
 * @param {matrix} m
 * @param {number} det
 */
function inverseInto(out, m, det)
{
    const v = [0, 0, 0, 0];
    const vec = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    for (let i = 0; i < 4; i++)
    {
        let signedDet = (i & 1) ? -1 : 1;
        signedDet /= det;
        for (let j = 0; j < 4; j++)
        {
            if (j !== i)
            {
                let a = j;
                if (j > i)
                {
                    a = a - 1;
                }
                vec[a][0] = m[j * 4];
                vec[a][1] = m[j * 4 + 1];
                vec[a][2] = m[j * 4 + 2];
                vec[a][3] = m[j * 4 + 3];
            }
        }
        v4Cross(v, vec[0], vec[1], vec[2]);
        out[i] = signedDet * v[0];
        out[4 + i] = signedDet * v[1];
        out[8 + i] = signedDet * v[2];
        out[12 + i] = signedDet * v[3];
    }
} // Matrix.cpp:7 (loop body)

/**
 * Inverts a matrix; a singular matrix is copied through unchanged (Carbon Matrix Inverse(m))
 * @param {matrix} out - may alias m
 * @param {matrix} m
 * @returns {matrix} out
 */
matrix.inverse = function (out, m)
{
    const det = matrix.determinant(m);
    if (!det)
    {
        return matrix.copy(out, m);
    }
    const tmp = new Float32Array(16);
    inverseInto(tmp, m, det);
    return matrix.copy(out, tmp);
}; // Matrix.cpp:7

/**
 * Inverts a matrix and returns the determinant; when singular (0) out is left
 * untouched - the return's truthiness is Carbon's bool Inverse(out, det, m)
 * @param {matrix} out - may alias m
 * @param {matrix} m
 * @returns {number} determinant
 */
matrix.inverseDet = function (out, m)
{
    const det = matrix.determinant(m);
    if (!det)
    {
        return det;
    }
    const tmp = new Float32Array(16);
    inverseInto(tmp, m, det);
    matrix.copy(out, tmp);
    return det;
}; // Matrix.cpp:49 (bool Inverse(out, det, m); Matrix_inline.h:524 folds here)

// ---------------------------------------------------------------------------
// Transforms
// ---------------------------------------------------------------------------

/**
 * Transforms a coordinate (row-vector v * M with perspective divide; zero norm yields the origin)
 * @param {Float32Array} out - receiving vec3 (may alias coord)
 * @param {Float32Array} coord - 3 floats
 * @param {matrix} transform
 * @returns {Float32Array} out
 */
matrix.transformCoord = function (out, coord, transform)
{
    const x = coord[0], y = coord[1], z = coord[2];
    const norm = transform[3] * x + transform[7] * y + transform[11] * z + transform[15];
    if (norm !== 0)
    {
        out[0] = (x * transform[0] + y * transform[4] + z * transform[8] + transform[12]) / norm;
        out[1] = (x * transform[1] + y * transform[5] + z * transform[9] + transform[13]) / norm;
        out[2] = (x * transform[2] + y * transform[6] + z * transform[10] + transform[14]) / norm;
    }
    else
    {
        out[0] = 0.0;
        out[1] = 0.0;
        out[2] = 0.0;
    }
    return out;
}; // Matrix_inline.h:560

/**
 * Transforms a normal (row-vector v * M, rotation part only)
 * @param {Float32Array} out - receiving vec3 (may alias normal)
 * @param {Float32Array} normal - 3 floats
 * @param {matrix} transform
 * @returns {Float32Array} out
 */
matrix.transformNormal = function (out, normal, transform)
{
    const x = normal[0], y = normal[1], z = normal[2];
    out[0] = x * transform[0] + y * transform[4] + z * transform[8];
    out[1] = x * transform[1] + y * transform[5] + z * transform[9];
    out[2] = x * transform[2] + y * transform[6] + z * transform[10];
    return out;
}; // Matrix_inline.h:580

/**
 * Row-vector transform p * m (Carbon operator*(Vector4, Matrix) and the free
 * Transform overloads; dispatches on point.length: 4, 3 or 2 - each branch
 * ported literally, including the Vector3 overload's w term)
 * @param {Float32Array} out - receiving vec4 (may alias point)
 * @param {Float32Array} point - 4, 3 or 2 floats
 * @param {matrix} m
 * @returns {Float32Array} out
 */
matrix.transform = function (out, point, m)
{
    const x = point[0], y = point[1];
    if (point.length >= 4)
    {
        const z = point[2], w = point[3];
        out[0] = x * m[0] + y * m[4] + z * m[8] + w * m[12];
        out[1] = x * m[1] + y * m[5] + z * m[9] + w * m[13];
        out[2] = x * m[2] + y * m[6] + z * m[10] + w * m[14];
        out[3] = x * m[3] + y * m[7] + z * m[11] + w * m[15];
    } // Matrix_inline.h:589 (and :293, identical arithmetic)
    else if (point.length === 3)
    {
        const z = point[2];
        out[0] = x * m[0] + y * m[4] + z * m[8] + m[12];
        out[1] = x * m[1] + y * m[5] + z * m[9] + m[13];
        out[2] = x * m[2] + y * m[6] + z * m[10] + m[14];
        out[3] = m[3] + m[7] + m[11] + m[15];
    } // Matrix_inline.h:599 (w is the plain column sum, as C++)
    else
    {
        out[0] = x * m[0] + y * m[4] + m[12];
        out[1] = x * m[1] + y * m[5] + m[13];
        out[2] = x * m[2] + y * m[6] + m[14];
        out[3] = x * m[3] + y * m[7] + m[15];
    } // Matrix_inline.h:609
    return out;
};

/**
 * Carbon operator*(Matrix, Vector4): dots the matrix ROWS with p - the
 * transpose of matrix.transform, deliberately a different function
 * @param {Float32Array} out - receiving vec4 (may alias p)
 * @param {Float32Array} p - 4 floats
 * @param {matrix} m
 * @returns {Float32Array} out
 */
matrix.transformByTranspose = function (out, p, m)
{
    const x = p[0], y = p[1], z = p[2], w = p[3];
    out[0] = m[0] * x + m[1] * y + m[2] * z + m[3] * w;
    out[1] = m[4] * x + m[5] * y + m[6] * z + m[7] * w;
    out[2] = m[8] * x + m[9] * y + m[10] * z + m[11] * w;
    out[3] = m[12] * x + m[13] * y + m[14] * z + m[15] * w;
    return out;
}; // Matrix_inline.h:304

/**
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
matrix.transformCoords = function (outArray, outOffset, outStride, inArray, inOffset, inStride, count, m)
{
    const tmp = [0, 0, 0];
    for (let i = 0; i < count; ++i)
    {
        const src = inOffset + i * inStride;
        const dst = outOffset + i * outStride;
        tmp[0] = inArray[src];
        tmp[1] = inArray[src + 1];
        tmp[2] = inArray[src + 2];
        matrix.transformCoord(tmp, tmp, m);
        outArray[dst] = tmp[0];
        outArray[dst + 1] = tmp[1];
        outArray[dst + 2] = tmp[2];
    }
    return outArray;
}; // Matrix_inline.h:620 (also :631, :640, :650)

/**
 * Decomposes a matrix into scaling, rotation quaternion and translation (Carbon's argument order)
 * @param {Float32Array} scaling - receiving vec3
 * @param {Float32Array} rotation - receiving quaternion
 * @param {Float32Array} translation - receiving vec3
 * @param {matrix} m
 */
matrix.decompose = function (scaling, rotation, translation, m)
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
        const normalized = matrix.identityMatrix(new Float32Array(16));
        normalized[0] = m[0] / scaling[0];
        normalized[1] = m[1] / scaling[0];
        normalized[2] = m[2] / scaling[0];
        normalized[4] = m[4] / scaling[1];
        normalized[5] = m[5] / scaling[1];
        normalized[6] = m[6] / scaling[1];
        normalized[8] = m[8] / scaling[2];
        normalized[9] = m[9] / scaling[2];
        normalized[10] = m[10] / scaling[2];
        quaternion.rotationQuaternion(rotation, normalized);
    }
}; // Matrix.cpp:225
