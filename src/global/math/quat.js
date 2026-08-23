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
