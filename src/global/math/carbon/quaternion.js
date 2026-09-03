/**
 * Carbon Quaternion, ported literally from e:\carbonengine\math
 * (Quaternion.h, Quaternion_inline.h, src\Quaternion.cpp).
 *
 * Storage is a plain Float32Array [x, y, z, w] - byte-identical to the
 * gl-matrix quat layout (comment only; nothing here calls gl-matrix).
 * Carbon composes row-vector style: `a * b` applies a first - see multiply.
 * `out` may alias inputs; locals are used wherever the C++ relied on
 * temporaries.
 *
 * C++ overloads folded by arity: rotationQuaternion(out, m) from a Matrix,
 * (out, axis, angle) from axis+angle, (out, yaw, pitch, roll) from Euler.
 *
 * @typedef {Float32Array} quaternion
 */

export const quaternion = {};

/**
 * Creates an identity quaternion (Carbon's default constructor)
 * @returns {quaternion}
 */
quaternion.create = function ()
{
    const out = new Float32Array(4);
    out[3] = 1;
    return out;
}; // Quaternion_inline.h:7

/**
 * Sets a quaternion from values
 * @param {quaternion} out
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {number} w
 * @returns {quaternion} out
 */
quaternion.set = function (out, x, y, z, w)
{
    out[0] = x;
    out[1] = y;
    out[2] = z;
    out[3] = w;
    return out;
}; // Quaternion_inline.h:16

/**
 * Copies a quaternion
 * @param {quaternion} out
 * @param {quaternion} a
 * @returns {quaternion} out
 */
quaternion.copy = function (out, a)
{
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    return out;
}; // Quaternion.h:11 (implicit copy)

/**
 * Clones a quaternion
 * @param {quaternion} a
 * @returns {quaternion}
 */
quaternion.clone = function (a)
{
    return new Float32Array(a);
}; // Quaternion.h:11 (implicit copy)

/**
 * Adds two quaternions (Carbon operator+ / operator+=)
 * @param {quaternion} out
 * @param {quaternion} a
 * @param {quaternion} b
 * @returns {quaternion} out
 */
quaternion.add = function (out, a, b)
{
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    out[3] = a[3] + b[3];
    return out;
}; // Quaternion_inline.h:46

/**
 * Subtracts b from a (Carbon operator- / operator-=)
 * @param {quaternion} out
 * @param {quaternion} a
 * @param {quaternion} b
 * @returns {quaternion} out
 */
quaternion.subtract = function (out, a, b)
{
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    out[3] = a[3] - b[3];
    return out;
}; // Quaternion_inline.h:56

/**
 * Multiplies quaternions: Carbon `a * b` (a applied first), ported literally - do not swap
 * @param {quaternion} out - may alias a or b
 * @param {quaternion} a
 * @param {quaternion} b
 * @returns {quaternion} out
 */
quaternion.multiply = function (out, a, b)
{
    const ax = a[0], ay = a[1], az = a[2], aw = a[3];
    const bx = b[0], by = b[1], bz = b[2], bw = b[3];
    out[0] = bw * ax + bx * aw + by * az - bz * ay;
    out[1] = bw * ay - bx * az + by * aw + bz * ax;
    out[2] = bw * az + bx * ay - by * ax + bz * aw;
    out[3] = bw * aw - bx * ax - by * ay - bz * az;
    return out;
}; // Quaternion_inline.h:118

/**
 * Scales a quaternion by a scalar (Carbon operator* float; also covers float * q)
 * @param {quaternion} out
 * @param {quaternion} a
 * @param {number} f
 * @returns {quaternion} out
 */
quaternion.scale = function (out, a, f)
{
    out[0] = a[0] * f;
    out[1] = a[1] * f;
    out[2] = a[2] * f;
    out[3] = a[3] * f;
    return out;
}; // Quaternion_inline.h:73 (and :153)

/**
 * Divides a quaternion by a scalar (Carbon operator/ float: multiplies by 1/f)
 * @param {quaternion} out
 * @param {quaternion} a
 * @param {number} f
 * @returns {quaternion} out
 */
quaternion.divide = function (out, a, f)
{
    const fDiv = 1.0 / f;
    out[0] = a[0] * fDiv;
    out[1] = a[1] * fDiv;
    out[2] = a[2] * fDiv;
    out[3] = a[3] * fDiv;
    return out;
}; // Quaternion_inline.h:83

/**
 * Negates a quaternion (Carbon unary operator-)
 * @param {quaternion} out
 * @param {quaternion} a
 * @returns {quaternion} out
 */
quaternion.negate = function (out, a)
{
    out[0] = -a[0];
    out[1] = -a[1];
    out[2] = -a[2];
    out[3] = -a[3];
    return out;
}; // Quaternion_inline.h:100

/**
 * Compares two quaternions exactly (Carbon operator==; != is the negation)
 * @param {quaternion} a
 * @param {quaternion} b
 * @returns {boolean}
 */
quaternion.exactEquals = function (a, b)
{
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}; // Quaternion_inline.h:141

/**
 * Sets the identity quaternion
 * @param {quaternion} out
 * @returns {quaternion} out
 */
quaternion.identityQuaternion = function (out)
{
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    return out;
}; // Quaternion_inline.h:159

/**
 * Returns the squared length of a quaternion
 * @param {quaternion} q
 * @returns {number}
 */
quaternion.lengthSq = function (q)
{
    return q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3];
}; // Quaternion_inline.h:165

/**
 * Returns the length of a quaternion
 * @param {quaternion} q
 * @returns {number}
 */
quaternion.length = function (q)
{
    return Math.sqrt(quaternion.lengthSq(q));
}; // Quaternion_inline.h:171

/**
 * Normalizes a quaternion (Carbon scales by 1/Length; zero length yields Infinity, as C++)
 * @param {quaternion} out
 * @param {quaternion} q
 * @returns {quaternion} out
 */
quaternion.normalize = function (out, q)
{
    const l = 1.0 / quaternion.length(q);
    return quaternion.scale(out, q, l);
}; // Quaternion_inline.h:177

/**
 * Inverts a quaternion (conjugate over squared length)
 * @param {quaternion} out
 * @param {quaternion} q
 * @returns {quaternion} out
 */
quaternion.inverse = function (out, q)
{
    const l = 1.0 / quaternion.lengthSq(q);
    out[0] = -q[0] * l;
    out[1] = -q[1] * l;
    out[2] = -q[2] * l;
    out[3] = q[3] * l;
    return out;
}; // Quaternion_inline.h:184

/**
 * Conjugates a quaternion
 * @param {quaternion} out
 * @param {quaternion} q
 * @returns {quaternion} out
 */
quaternion.conjugate = function (out, q)
{
    out[0] = -q[0];
    out[1] = -q[1];
    out[2] = -q[2];
    out[3] = q[3];
    return out;
}; // Quaternion_inline.h:191

/**
 * Quaternion exponential (of a pure/vector quaternion; w input is ignored, as C++)
 * @param {quaternion} out
 * @param {quaternion} q
 * @returns {quaternion} out
 */
quaternion.exp = function (out, q)
{
    const norm = Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2]);
    if (norm)
    {
        const s = Math.sin(norm);
        out[0] = s * q[0] / norm;
        out[1] = s * q[1] / norm;
        out[2] = s * q[2] / norm;
        out[3] = Math.cos(norm);
    }
    else
    {
        out[0] = 0;
        out[1] = 0;
        out[2] = 0;
        out[3] = 1;
    }
    return out;
}; // Quaternion_inline.h:202

/**
 * Dot product of two quaternions
 * @param {quaternion} q1
 * @param {quaternion} q2
 * @returns {number}
 */
quaternion.dot = function (q1, q2)
{
    return q1[0] * q2[0] + q1[1] * q2[1] + q1[2] * q2[2] + q1[3] * q2[3];
}; // Quaternion_inline.h:226

/**
 * Rotation quaternion, dispatched by arity like Carbon's overloads:
 * (out, m) from a Matrix [Quaternion.cpp:7], (out, axis, angle) from
 * axis+angle [Quaternion_inline.h:232], (out, yaw, pitch, roll) from Euler
 * angles [Quaternion.cpp:60].
 * @param {quaternion} out
 * @returns {quaternion} out
 */
quaternion.rotationQuaternion = function (out, a, b, c)
{
    if (c !== undefined) return rotationQuaternionYawPitchRoll(out, a, b, c);
    if (b !== undefined) return rotationQuaternionAxisAngle(out, a, b);
    return rotationQuaternionMatrix(out, a);
};

/**
 * Rotation quaternion from a Matrix (Carbon's 53-line branch version, ported exactly)
 * @param {quaternion} out
 * @param {Float32Array} m - matrix (16 floats, Carbon m[r][c] at [r*4+c])
 * @returns {quaternion} out
 */
function rotationQuaternionMatrix(out, m)
{
    let i, maxi;
    let maxdiag, S;

    const trace = m[0] + m[5] + m[10] + 1.0;
    if (trace > 1.0)
    {
        out[0] = (m[6] - m[9]) / (2.0 * Math.sqrt(trace));
        out[1] = (m[8] - m[2]) / (2.0 * Math.sqrt(trace));
        out[2] = (m[1] - m[4]) / (2.0 * Math.sqrt(trace));
        out[3] = Math.sqrt(trace) / 2.0;
        return out;
    }
    maxi = 0;
    maxdiag = m[0];
    for (i = 1; i < 3; i++)
    {
        if (m[i * 4 + i] > maxdiag)
        {
            maxi = i;
            maxdiag = m[i * 4 + i];
        }
    }
    switch (maxi)
    {
        case 0:
            S = 2.0 * Math.sqrt(1.0 + m[0] - m[5] - m[10]);
            out[0] = 0.25 * S;
            out[1] = (m[1] + m[4]) / S;
            out[2] = (m[2] + m[8]) / S;
            out[3] = (m[6] - m[9]) / S;
            break;
        case 1:
            S = 2.0 * Math.sqrt(1.0 + m[5] - m[0] - m[10]);
            out[0] = (m[1] + m[4]) / S;
            out[1] = 0.25 * S;
            out[2] = (m[6] + m[9]) / S;
            out[3] = (m[8] - m[2]) / S;
            break;
        case 2:
            S = 2.0 * Math.sqrt(1.0 + m[10] - m[0] - m[5]);
            out[0] = (m[2] + m[8]) / S;
            out[1] = (m[6] + m[9]) / S;
            out[2] = 0.25 * S;
            out[3] = (m[1] - m[4]) / S;
            break;
    }
    return out;
} // Quaternion.cpp:7

/**
 * Rotation quaternion from yaw/pitch/roll. Carbon calls
 * XMQuaternionRotationRollPitchYaw(pitch, yaw, roll); DirectXMath's documented
 * formula (half-angle products, x = cr*sp*cy + sr*cp*sy etc.) is identical to
 * Carbon's own scalar __APPLE__ branch, which is what is ported here.
 * @param {quaternion} out
 * @param {number} yaw
 * @param {number} pitch
 * @param {number} roll
 * @returns {quaternion} out
 */
function rotationQuaternionYawPitchRoll(out, yaw, pitch, roll)
{
    const sinYaw = Math.sin(yaw / 2.0);
    const cosYaw = Math.cos(yaw / 2.0);
    const sinPitch = Math.sin(pitch / 2.0);
    const cosPitch = Math.cos(pitch / 2.0);
    const sinRoll = Math.sin(roll / 2.0);
    const cosRoll = Math.cos(roll / 2.0);

    out[0] = sinYaw * cosPitch * sinRoll + cosYaw * sinPitch * cosRoll;
    out[1] = sinYaw * cosPitch * cosRoll - cosYaw * sinPitch * sinRoll;
    out[2] = cosYaw * cosPitch * sinRoll - sinYaw * sinPitch * cosRoll;
    out[3] = cosYaw * cosPitch * cosRoll + sinYaw * sinPitch * sinRoll;
    return out;
} // Quaternion.cpp:60 (scalar branch :65-77)

/**
 * Rotation quaternion from a (normalized-internally) axis and an angle
 * @param {quaternion} out
 * @param {Float32Array} axis - 3 floats
 * @param {number} angle
 * @returns {quaternion} out
 */
function rotationQuaternionAxisAngle(out, axis, angle)
{
    // Vector3 Normalize, ported from Vector3_inline.h:181 (overflow-guarded)
    const ax = axis[0], ay = axis[1], az = axis[2];
    const max = Math.max(Math.max(Math.abs(ax), Math.abs(ay)), Math.abs(az));
    const d = max ? max : 1;
    const mx = ax / d, my = ay / d, mz = az / d;
    let len = Math.sqrt(mx * mx + my * my + mz * mz);
    if (len) len = 1 / len;
    const tx = mx * len, ty = my * len, tz = mz * len;

    const s = Math.sin(angle / 2.0);
    out[0] = s * tx;
    out[1] = s * ty;
    out[2] = s * tz;
    out[3] = Math.cos(angle / 2.0);
    return out;
} // Quaternion_inline.h:232

/**
 * Spherical linear interpolation with Carbon's exact 0.001 threshold branch
 * @param {quaternion} out
 * @param {quaternion} q1
 * @param {quaternion} q2
 * @param {number} t
 * @returns {quaternion} out
 */
quaternion.slerp = function (out, q1, q2, t)
{
    let epsilon = 1.0;
    let temp = 1.0 - t;
    let u = t;
    let dot = quaternion.dot(q1, q2);
    if (dot < 0.0)
    {
        epsilon = -1.0;
        dot = -dot;
    }
    if (1.0 - dot > 0.001)
    {
        const theta = Math.acos(dot);
        temp = Math.sin(theta * temp) / Math.sin(theta);
        u = Math.sin(theta * u) / Math.sin(theta);
    }
    const x1 = q1[0], y1 = q1[1], z1 = q1[2], w1 = q1[3];
    out[0] = temp * x1 + epsilon * u * q2[0];
    out[1] = temp * y1 + epsilon * u * q2[1];
    out[2] = temp * z1 + epsilon * u * q2[2];
    out[3] = temp * w1 + epsilon * u * q2[3];
    return out;
}; // Quaternion_inline.h:244

/**
 * Extracts axis and angle: writes the raw (x, y, z) to outAxis and returns acos(w) * 2
 * @param {Float32Array} outAxis - receiving vec3
 * @param {quaternion} q
 * @returns {number} angle
 */
quaternion.getAxisAngle = function (outAxis, q)
{
    outAxis[0] = q[0];
    outAxis[1] = q[1];
    outAxis[2] = q[2];
    return Math.acos(q[3]) * 2;
}; // Quaternion_inline.h:270
