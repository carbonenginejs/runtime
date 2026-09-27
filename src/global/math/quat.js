import * as glQuat from "gl-matrix/esm/quat.js";
import { EPSILON } from "./num.js";
import { pool } from "./pool.js";

const quat = { ...glQuat };

export { quat };

/**
 * Allocates a pooled vec4
 * @returns {Float32Array|quat}
 */
quat.alloc = function()
{
    return pool.allocF32(4);
};

/**
 * Unallocates a pooled vec4
 * @param {Float32Array|quat} a
 */
quat.unalloc = function(a)
{
    pool.freeType(a);
};

/**
 * Creates a quat from unit vectors
 *
 * @param {quat} out
 * @param {vec3} from
 * @param {vec3} to
 * @returns {quat}
 */
quat.fromUnitVectors = function(out, from, to)
{
    const
        fromX = from[0],
        fromY = from[1],
        fromZ = from[2],
        toX = to[0],
        toY = to[1],
        toZ = to[2];

    let r = fromX * toX + fromY * toY + fromZ * toZ + 1;
    if (r < EPSILON)
    {
        r = 0;
        if (Math.abs(fromX) > Math.abs(fromZ))
        {
            out[0] = -fromY;
            out[1] = fromX;
            out[2] = 0;
            out[3] = r;
        }
        else
        {
            out[0] = 0;
            out[1] = -fromZ;
            out[2] = fromY;
            out[3] = r;
        }
    }
    else
    {
        out[0] = fromY * toZ - fromZ * toY;
        out[1] = fromZ * toX - fromX * toZ;
        out[2] = fromX * toY - fromY * toX;
        out[3] = r;
    }
    return quat.normalize(out, out);
};

/**
 * Creates a Carbon yaw/pitch/roll quaternion.
 *
 * Source: math/include/Quaternion.h:57
 * Source: math/src/Quaternion.cpp:60-81
 * Carbon: RotationQuaternion(float yaw, float pitch, float roll)
 * Adapted: Uses the native Apple scalar formula with JS intermediates and a
 * gl-matrix output quaternion; native other-platform builds use DirectXMath.
 *
 * @param {quat} out
 * @param {number} yaw
 * @param {number} pitch
 * @param {number} roll
 * @returns {quat}
 */
quat.fromYawPitchRoll = function(out, yaw, pitch, roll)
{
    const
        sinYaw = Math.sin(yaw / 2),
        cosYaw = Math.cos(yaw / 2),
        sinPitch = Math.sin(pitch / 2),
        cosPitch = Math.cos(pitch / 2),
        sinRoll = Math.sin(roll / 2),
        cosRoll = Math.cos(roll / 2);

    out[0] = sinYaw * cosPitch * sinRoll + cosYaw * sinPitch * cosRoll;
    out[1] = sinYaw * cosPitch * cosRoll - cosYaw * sinPitch * sinRoll;
    out[2] = cosYaw * cosPitch * sinRoll - sinYaw * sinPitch * cosRoll;
    out[3] = cosYaw * cosPitch * cosRoll + sinYaw * sinPitch * sinRoll;
    return out;
};

/**
 * Ports TriQuaternionRotationArc and TriQuaternionSqrt (Trinity TriMath.cpp:263-338).
 * Normalizes both directions, then takes the native quaternion square root.
 * The antiparallel fallback is always a half-turn about X, even for an X input
 * axis; this native quirk differs from gl-matrix rotationTo.
 *
 * Source: trinity/trinity/TriMath.cpp:263-339
 * Carbon: TriQuaternionRotationArc; TriQuaternionDirVector; TriQuaternionSqrt
 * Adapted: Combines the native helpers using gl-matrix storage and reversed
 * quaternion composition order. JS intermediates are not float-bit equivalent.
 *
 * @param {Float32Array} out Destination quaternion.
 * @param {ArrayLike<number>} from Starting direction.
 * @param {ArrayLike<number>} to Target direction.
 * @returns {Float32Array} The destination quaternion.
 */
quat.rotationArc = function(out, from, to)
{
    const fromLength = Math.hypot(from[0], from[1], from[2]);
    const toLength = Math.hypot(to[0], to[1], to[2]);
    const fx = fromLength ? from[0] / fromLength : 0;
    const fy = fromLength ? from[1] / fromLength : 0;
    const fz = fromLength ? from[2] / fromLength : 0;
    const tx = toLength ? to[0] / toLength : 0;
    const ty = toLength ? to[1] / toLength : 0;
    const tz = toLength ? to[2] / toLength : 0;
    // Carbon (row-vector): pure(from) * conjugate(pure(to)). Reversing the
    // quaternion operands for gl-matrix gives cross(from,to) and dot(from,to).
    quat.set(out, fy * tz - fz * ty, fz * tx - fx * tz, fx * ty - fy * tx, fx * tx + fy * ty + fz * tz);
    if (out[3] + Math.fround(0.99999) < 0)
    {
        const x = out[0] * 1000000;
        const y = out[1] * 1000000;
        const z = out[2] * 1000000;
        const length = Math.hypot(x, y, z);
        return length ? quat.set(out, x / length, y / length, z / length, 0) : quat.set(out, 1, 0, 0, 0);
    }
    out[3] += 1;
    return quat.normalize(out, out);
};

export const {
    add,
    calculateW,
    clone,
    conjugate,
    copy,
    create,
    dot,
    equals,
    exactEquals,
    exp,
    fromEuler,
    fromMat3,
    fromValues,
    getAngle,
    getAxisAngle,
    identity,
    invert,
    len,
    length,
    lerp,
    ln,
    mul,
    multiply,
    normalize,
    pow,
    random,
    rotateX,
    rotateY,
    rotateZ,
    rotationTo,
    rotationArc,
    scale,
    set,
    setAxes,
    setAxisAngle,
    slerp,
    sqlerp,
    sqrLen,
    squaredLength,
    str,
    alloc,
    unalloc,
    fromUnitVectors,
    fromYawPitchRoll
} = quat;
