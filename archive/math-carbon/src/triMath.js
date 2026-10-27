// Carbon TriMath, ported literally from trinity
// (trinity/trinity/Include/TriMath.h, trinity/trinity/TriMath.cpp).
// TriMath.h is a home for free functions, not a class, so this module is a camelCase
// namespace (`triMath.triClamp` for TriClamp; operator, 2026-10-27). Names are Carbon's
// with the first letter lowercased; argument order is Carbon's.
// Storage is plain Float32Array (Float64Array for the Matrix4d/Vector4d doubles); Carbon
// float locals take Math.fround where a threshold or a returned float depends on them,
// other intermediates use doubles.
// Overloads are split per rule 11 (`carbonName__Discriminator`); the bare name routes by
// an exact argument count or length, and engine code calls the specific names.
// A C++ value return becomes a leading `out`, as everywhere in this archive.

import { Vector3 } from "./vector3.js";
import { Quaternion } from "./quaternion.js";
import { Matrix } from "./matrix.js";
import { random } from "../../../src/global/math/random.js";

const f32 = Math.fround;

/**
 * Carbon: TRITRANSFORMAXIS (blue/include/ITriConstants.h:74-78)
 * Declared here only while the archive stays self-contained; adoption moves it to
 * global/consts with the other ITriConstants enums.
 * @enum {number}
 */
export const TRITRANSFORMAXIS = Object.freeze({
    TRITA_X: 0,
    TRITA_Y: 1,
    TRITA_Z: 2
});

/** Carbon: TRI_PI (Include/TriMath.h:243) */
export const TRI_PI = f32(3.141592654);
/** Carbon: TRI_1BYPI (Include/TriMath.h:244) */
export const TRI_1BYPI = f32(0.318309886);
/** Carbon: TRI_2PI (Include/TriMath.h:245) */
export const TRI_2PI = f32(6.283185307);
/** Carbon: TRI_PIBY2 (Include/TriMath.h:246) */
export const TRI_PIBY2 = f32(1.570796327);
/** Carbon: TRI_E (Include/TriMath.h:247) */
export const TRI_E = f32(2.718281828);
/** Carbon: TRI_SQRT2 (Include/TriMath.h:248) */
export const TRI_SQRT2 = f32(1.414213562);
/** Carbon: TRI_SQRT3 (Include/TriMath.h:249) */
export const TRI_SQRT3 = f32(1.732050807);

/** DirectXMath's XM_PI, which TriMath.cpp uses directly: 3.141592654f */
const XM_PI = f32(3.141592654);

// ------------------------------------------------------------------------------------
// Vector extensions
// ------------------------------------------------------------------------------------

/**
 * Carbon: TriVectorIsIdentical (TriMath.cpp:24-27)
 * @param {Float32Array} v1
 * @param {Float32Array} v2
 * @param {number} [epsilon=1e-5] Carbon's default argument (TriMath.h:42)
 * @returns {boolean}
 */
export function triVectorIsIdentical(v1, v2, epsilon = f32(1e-5))
{
    const dx = f32(v1[0] - v2[0]), dy = f32(v1[1] - v2[1]), dz = f32(v1[2] - v2[2]);
    return f32(dx * dx + dy * dy + dz * dz) < f32(epsilon * epsilon);
} // TriMath.cpp:24

/**
 * Carbon: TriVectorRotateQuaternion (TriMath.cpp:29-56)
 * q * v * conjugate(q), treating v as a pure quaternion.
 * @param {Float32Array} out - may alias v
 * @param {Float32Array} v
 * @param {Float32Array} q
 * @returns {Float32Array} out
 */
export function triVectorRotateQuaternion(out, v, q)
{
    const ww = q[3] * q[3], wx = q[3] * q[0], wy = q[3] * q[1], wz = q[3] * q[2];
    const xx = q[0] * q[0], xy = q[0] * q[1], xz = q[0] * q[2];
    const yy = q[1] * q[1], yz = q[1] * q[2];
    const zz = q[2] * q[2];
    const x = v[0], y = v[1], z = v[2];
    out[0] = x * (ww + xx - yy - zz) + 2.0 * (y * (xy - wz) + z * (xz + wy));
    out[1] = y * (ww - xx + yy - zz) + 2.0 * (x * (xy + wz) + z * (yz - wx));
    out[2] = z * (ww - xx - yy + zz) + 2.0 * (x * (xz - wy) + y * (yz + wx));
    return out;
} // TriMath.cpp:29

/**
 * Carbon: TriVectorProjectOnPlane (TriMath.cpp:60-66)
 * Projects a point onto the plane through p0 with normal n.
 * @param {Float32Array} out - may alias any input
 * @param {Float32Array} point
 * @param {Float32Array} p0
 * @param {Float32Array} n
 * @returns {Float32Array} out
 */
export function triVectorProjectOnPlane(out, point, p0, n)
{
    const px = point[0], py = point[1], pz = point[2];
    const d = f32((px - p0[0]) * n[0] + (py - p0[1]) * n[1] + (pz - p0[2]) * n[2]);
    out[0] = px - n[0] * d;
    out[1] = py - n[1] * d;
    out[2] = pz - n[2] * d;
    return out;
} // TriMath.cpp:60

/**
 * Carbon: TriVectorRotateToPlane (TriMath.cpp:69-79)
 * Projects onto the plane, then restores the point's original distance from p0.
 * @param {Float32Array} out - may alias any input
 * @param {Float32Array} point
 * @param {Float32Array} p0
 * @param {Float32Array} n
 * @returns {Float32Array} out
 */
export function triVectorRotateToPlane(out, point, p0, n)
{
    const { vec3_0 } = scratch;
    const p0x = p0[0], p0y = p0[1], p0z = p0[2];
    Vector3.subtract(vec3_0, point, p0);
    const length = f32(Vector3.length(vec3_0));
    triVectorProjectOnPlane(vec3_0, point, p0, n);
    vec3_0[0] -= p0x;
    vec3_0[1] -= p0y;
    vec3_0[2] -= p0z;
    Vector3.normalize(vec3_0, vec3_0);
    out[0] = vec3_0[0] * length + p0x;
    out[1] = vec3_0[1] * length + p0y;
    out[2] = vec3_0[2] * length + p0z;
    return out;
} // TriMath.cpp:69

/**
 * Carbon: TriVectorRotateMatrix (TriMath.cpp:81-94)
 * Rotates by the matrix's upper 3x3, ignoring translation.
 * @param {Float32Array} out - may alias v
 * @param {Float32Array} v
 * @param {Float32Array} m
 * @returns {Float32Array} out
 */
export function triVectorRotateMatrix(out, v, m)
{
    const x = v[0], y = v[1], z = v[2];
    out[0] = x * m[0] + y * m[4] + z * m[8];
    out[1] = x * m[1] + y * m[5] + z * m[9];
    out[2] = x * m[2] + y * m[6] + z * m[10];
    return out;
} // TriMath.cpp:81

/**
 * Carbon: TriVectorRotatedBasisQuaternion (TriMath.cpp:101-127)
 * Rotates the unit basis vector `xyz` by q, using Carbon's extended-array indexing.
 * @param {Float32Array} out
 * @param {number} xyz - TRITRANSFORMAXIS
 * @param {Float32Array} q
 * @returns {Float32Array} out
 */
export function triVectorRotatedBasisQuaternion(out, xyz, q)
{
    const { sq, quat, ret } = scratch;
    const ww = f32(q[3] * q[3]);
    sq[0] = -q[0] * q[0];
    sq[1] = -q[1] * q[1];
    sq[2] = -q[2] * q[2];
    quat[0] = q[0];
    quat[1] = q[1];
    quat[2] = q[2];
    quat[3] = q[0];
    quat[4] = q[1];
    sq[xyz] = -sq[xyz];
    const basis0 = ww + sq[0] + sq[1] + sq[2];
    const basis1 = 2.0 * (quat[xyz] * quat[xyz + 1] + q[3] * quat[xyz + 2]);
    const basis2 = 2.0 * (quat[xyz] * quat[xyz + 2] - q[3] * quat[xyz + 1]);
    ret[0] = basis2;
    ret[1] = basis1;
    ret[2] = basis0;
    ret[3] = basis2;
    ret[4] = basis1;
    out[0] = ret[xyz + 2];
    out[1] = ret[xyz + 1];
    out[2] = ret[xyz];
    return out;
} // TriMath.cpp:101

/**
 * Carbon: TriVectorRotatedBasisMatrix (TriMath.cpp:131-138)
 * @param {Float32Array} out
 * @param {number} xyz - TRITRANSFORMAXIS
 * @param {Float32Array} m
 * @returns {Float32Array} out
 */
export function triVectorRotatedBasisMatrix(out, xyz, m)
{
    out[0] = m[xyz * 4];
    out[1] = m[xyz * 4 + 1];
    out[2] = m[xyz * 4 + 2];
    return out;
} // TriMath.cpp:131

/**
 * Carbon: TriVectorSpherical (TriMath.cpp:140-151)
 * @param {Float32Array} v - receives the vector
 * @param {number} phi
 * @param {number} theta
 * @param {number} rad
 * @returns {Float32Array} v
 */
export function triVectorSpherical(v, phi, theta, rad)
{
    v[0] = rad * Math.sin(phi);
    v[2] = v[0] * Math.sin(theta);
    v[0] *= Math.cos(theta);
    v[1] = rad * Math.cos(phi);
    return v;
} // TriMath.cpp:140

/**
 * Carbon: TriVectorExponentialDecayInteger (TriMath.h:63-69, 82-89)
 * Routes Carbon's two overloads by argument count, which JS sees exactly: 7 to
 * triVectorExponentialDecayInteger__Time, 8 to triVectorExponentialDecayInteger__Pow.
 * @returns {Float32Array} pos
 */
export function triVectorExponentialDecayInteger(pos, pos0, vel0, acc0, mass, drag, time, pow)
{
    switch (arguments.length)
    {
        case 7: return triVectorExponentialDecayInteger__Time(pos, pos0, vel0, acc0, mass, drag, time);
        case 8: return triVectorExponentialDecayInteger__Pow(pos, pos0, vel0, acc0, mass, drag, time, pow);
    }
    throw new TypeError(`triVectorExponentialDecayInteger: no Carbon overload takes ${arguments.length} arguments.`);
}

/**
 * Carbon: TriVectorExponentialDecayInteger( pos, x, v, a, m, k, t ) (TriMath.cpp:153-164)
 * Position under exponential drag; computes the decay factor e^(-k t / m) itself.
 * @param {Float32Array} pos - receives the position; may alias any vector input
 * @param {Float32Array} pos0
 * @param {Float32Array} vel0
 * @param {Float32Array} acc0
 * @param {number} mass
 * @param {number} drag
 * @param {number} time
 * @returns {Float32Array} pos
 */
export function triVectorExponentialDecayInteger__Time(pos, pos0, vel0, acc0, mass, drag, time)
{
    const pow = f32(Math.pow(TRI_E, -drag * time / mass));
    for (let i = 0; i < 3; ++i)
    {
        pos[i] = pos0[i] + acc0[i] * time / drag + mass * (vel0[i] * drag - acc0[i]) / (drag * drag) * (1.0 - pow);
    }
    return pos;
} // TriMath.cpp:153

/**
 * Carbon: TriVectorExponentialDecayInteger( pos, x, v, a, m, k, t, pow ) (TriMath.cpp:178-190)
 * As triVectorExponentialDecayInteger__Time with the caller's precomputed decay factor.
 * @param {Float32Array} pos - receives the position; may alias any vector input
 * @param {Float32Array} x
 * @param {Float32Array} v
 * @param {Float32Array} a
 * @param {number} m
 * @param {number} k
 * @param {number} t
 * @param {number} pow
 * @returns {Float32Array} pos
 */
export function triVectorExponentialDecayInteger__Pow(pos, x, v, a, m, k, t, pow)
{
    for (let i = 0; i < 3; ++i)
    {
        pos[i] = x[i] + a[i] * t / k + m * (v[i] * k - a[i]) / (k * k) * (1.0 - pow);
    }
    return pos;
} // TriMath.cpp:178

/**
 * Carbon: TriVectorExponentialDecay (TriMath.h:71-76, 91)
 * Routes Carbon's two overloads by argument count, which JS sees exactly: 6 to
 * triVectorExponentialDecay__Time, 5 to triVectorExponentialDecay__Pow.
 * @returns {Float32Array} vel
 */
export function triVectorExponentialDecay(vel, v, a, b, c, d)
{
    switch (arguments.length)
    {
        case 6: return triVectorExponentialDecay__Time(vel, v, a, b, c, d);
        case 5: return triVectorExponentialDecay__Pow(vel, v, a, b, c);
    }
    throw new TypeError(`triVectorExponentialDecay: no Carbon overload takes ${arguments.length} arguments.`);
}

/**
 * Carbon: TriVectorExponentialDecay( vel, v, a, m, k, t ) (TriMath.cpp:166-176)
 * Velocity under exponential drag; computes the decay factor e^(-k t / m) itself.
 * @param {Float32Array} vel - receives the velocity; may alias any vector input
 * @param {Float32Array} vel0
 * @param {Float32Array} acc0
 * @param {number} mass
 * @param {number} drag
 * @param {number} time
 * @returns {Float32Array} vel
 */
export function triVectorExponentialDecay__Time(vel, vel0, acc0, mass, drag, time)
{
    const pow = f32(Math.pow(TRI_E, -drag * time / mass));
    for (let i = 0; i < 3; ++i)
    {
        const terminal = f32(acc0[i] / drag);
        vel[i] = terminal + (vel0[i] - terminal) * pow;
    }
    return vel;
} // TriMath.cpp:166

/**
 * Carbon: TriVectorExponentialDecay( vel, v, a, k, pow ) (TriMath.cpp:192-201)
 * As triVectorExponentialDecay__Time with the caller's precomputed decay factor.
 * @param {Float32Array} vel - receives the velocity; may alias any vector input
 * @param {Float32Array} v
 * @param {Float32Array} a
 * @param {number} k
 * @param {number} pow
 * @returns {Float32Array} vel
 */
export function triVectorExponentialDecay__Pow(vel, v, a, k, pow)
{
    for (let i = 0; i < 3; ++i)
    {
        const terminal = f32(a[i] / k);
        vel[i] = terminal + (v[i] - terminal) * pow;
    }
    return vel;
} // TriMath.cpp:192

// ------------------------------------------------------------------------------------
// Float extensions
// ------------------------------------------------------------------------------------

// TriRandomSeed/TriFloatRandom01 call the C runtime's srand/rand. This is the MSVC CRT
// generator the Windows client links (state * 214013 + 2531011, bits 16-30, RAND_MAX
// 32767, initial state 1); other platforms' CRTs produce other sequences. Carbon's state
// is per thread; JS has one thread per realm, so it is one module state.
let crtRandState = 1;
const RAND_MAX = 32767;

/**
 * Carbon: TriRandomSeed (TriMath.cpp:209-212)
 * @param {number} seed - unsigned int
 */
export function triRandomSeed(seed)
{
    crtRandState = seed >>> 0;
} // TriMath.cpp:209

/**
 * Carbon: TriFloatRandom01 (TriMath.cpp:214-217)
 * @returns {number} rand() / RAND_MAX, in [0, 1]
 */
export function triFloatRandom01()
{
    crtRandState = (Math.imul(crtRandState, 214013) + 2531011) >>> 0;
    return f32(f32((crtRandState >>> 16) & 0x7fff) / f32(RAND_MAX));
} // TriMath.cpp:214

/**
 * Carbon: TriFloatSign (TriMath.cpp:219-226)
 * @param {number} f
 * @returns {number} -1 when f < 0, otherwise 1 (including -0 and NaN)
 */
export function triFloatSign(f)
{
    if (f < 0.0)
    {
        return -1.0;
    }
    return 1.0;
} // TriMath.cpp:219

/**
 * Carbon: TriFloatRandomGauss (TriMath.cpp:228-239)
 * Carbon quirk, reproduced: the guard `rand1 < 1e-100` stores the double 1e-100 into a
 * float, which rounds to 0, so a zero draw still reaches log(0) and returns an infinite
 * (or NaN) sample. The radius uses pow(r, 0.75), not Box-Muller's sqrt (pow 0.5), so the
 * spread is not the requested deviation.
 * @param {number} mu
 * @param {number} deviation
 * @returns {number}
 */
export function triFloatRandomGauss(mu, deviation)
{
    let rand1 = triFloatRandom01();
    if (rand1 < 1e-100)
    {
        rand1 = f32(1e-100);
    }
    rand1 = f32(-2.0 * Math.log(rand1));
    const rand2 = f32(triFloatRandom01() * TRI_2PI);
    return f32(mu + deviation * Math.pow(rand1, 0.75) * Math.cos(rand2));
} // TriMath.cpp:228

// ------------------------------------------------------------------------------------
// Color extensions
// ------------------------------------------------------------------------------------

/**
 * Carbon: TriColorFromVector (TriMath.cpp:245-255)
 * Maps a normalized direction to a colour: rgb = 0.5 * v + 0.5, a = height.
 * @param {Float32Array} c - receives the colour
 * @param {Float32Array} v
 * @param {number} [height=0] Carbon's default argument (TriMath.h:118)
 * @returns {Float32Array} c
 */
export function triColorFromVector(c, v, height = 0.0)
{
    c[0] = 0.5 * v[0] + 0.5;
    c[1] = 0.5 * v[1] + 0.5;
    c[2] = 0.5 * v[2] + 0.5;
    c[3] = height;
    return c;
} // TriMath.cpp:245

// ------------------------------------------------------------------------------------
// Quaternion extensions
// ------------------------------------------------------------------------------------

/**
 * Carbon: TriQuaternionDirVector (TriMath.cpp:262-269)
 * The pure unit quaternion along v's direction.
 * @param {Float32Array} out
 * @param {Float32Array} v
 * @returns {Float32Array} out
 */
export function triQuaternionDirVector(out, v)
{
    const { vec3_0 } = scratch;
    Vector3.normalize(vec3_0, v);
    out[0] = vec3_0[0];
    out[1] = vec3_0[1];
    out[2] = vec3_0[2];
    out[3] = 0.0;
    return out;
} // TriMath.cpp:262

/**
 * Carbon: TriQuaternionScale (TriMath.cpp:271-286)
 * @param {Float32Array} out - may alias input
 * @param {Float32Array} input - Carbon's `in`
 * @param {number} length
 * @returns {Float32Array} out
 */
export function triQuaternionScale(out, input, length)
{
    if (f32(length) === 1.0)
    {
        return Quaternion.copy(out, input);
    }
    out[0] = input[0] * length;
    out[1] = input[1] * length;
    out[2] = input[2] * length;
    out[3] = input[3] * length;
    return out;
} // TriMath.cpp:271

/**
 * Carbon: TriQuaternionSqrt (TriMath.cpp:288-326)
 * Half the rotation of a unit quaternion about the same axis. Near a full turn
 * (w + 0.99999 < 0) it returns the pure quaternion along the axis, or (1, 0, 0, 0)
 * when the axis cannot be normalized.
 * @param {Float32Array} out - may alias q1
 * @param {Float32Array} q1
 * @returns {Float32Array} out
 */
export function triQuaternionSqrt(out, q1)
{
    Quaternion.copy(out, q1);
    const magic2 = f32(out[3] + f32(0.99999));
    if (0.0 > magic2)
    {
        const { vec3_0 } = scratch;
        vec3_0[0] = out[0] * 1000000.0;
        vec3_0[1] = out[1] * 1000000.0;
        vec3_0[2] = out[2] * 1000000.0;
        Vector3.normalize(vec3_0, vec3_0);
        if (Vector3.lengthSq(vec3_0) < 0.5)
        {
            out[0] = 1.0;
            out[1] = 0.0;
            out[2] = 0.0;
            out[3] = 0.0;
        }
        else
        {
            out[0] = vec3_0[0];
            out[1] = vec3_0[1];
            out[2] = vec3_0[2];
            out[3] = 0.0;
        }
        return out;
    }
    out[3]++;
    return Quaternion.normalize(out, out);
} // TriMath.cpp:288

/**
 * Carbon: TriQuaternionRotationArc (TriMath.cpp:328-339)
 * The rotation taking direction v1 to direction v2 about the origin.
 * @param {Float32Array} out
 * @param {Float32Array} v1
 * @param {Float32Array} v2
 * @returns {Float32Array} out
 */
export function triQuaternionRotationArc(out, v1, v2)
{
    const { quat_0 } = scratch;
    triQuaternionDirVector(out, v1);
    triQuaternionDirVector(quat_0, v2);
    Quaternion.conjugate(quat_0, quat_0);
    Quaternion.multiply(out, out, quat_0);
    return triQuaternionSqrt(out, out);
} // TriMath.cpp:328

/**
 * Carbon: TriQuaternionArcFromForward (TriMath.cpp:341-356)
 * @param {Float32Array} out
 * @param {Float32Array} v
 * @returns {Float32Array} out
 */
export function triQuaternionArcFromForward(out, v)
{
    const { vec3_0 } = scratch;
    Vector3.normalize(vec3_0, v);
    if (vec3_0[2] < f32(0.99999))
    {
        vec3_0[2] = 1.0 - vec3_0[2];
        vec3_0[2] = Math.sqrt(vec3_0[2]);
        const div = f32(f32(0.707106781187) / vec3_0[2]);
        out[0] = vec3_0[1] * div;
        out[1] = -vec3_0[0] * div;
        out[2] = 0.0;
        out[3] = f32(0.707106781187) * vec3_0[2];
        return out;
    }
    out[0] = 1.0;
    out[1] = 0.0;
    out[2] = 0.0;
    out[3] = 0.0;
    return out;
} // TriMath.cpp:341

/**
 * Carbon: TriQuaternionToYawPitchRoll (TriMath.cpp:358-519)
 * Yaw in [0, 2pi[, pitch in [-pi/2, pi/2], roll in [-pi, pi]; yaw then pitch then roll
 * reproduces q.
 * Adapted: Carbon writes three `float*` outputs; JS has no float references, so they
 * land in one caller-owned array, out = [yaw, pitch, roll].
 * @param {Float32Array} out - receives [yaw, pitch, roll]
 * @param {Float32Array} q - a unit quaternion
 * @returns {Float32Array} out
 */
export function triQuaternionToYawPitchRoll(out, q)
{
    const qx = q[0], qy = q[1], qz = q[2], qw = q[3];
    const invSqrtOf2 = f32(0.70710678118654752440084436210485);
    // equivalent to q * (0,0,-1,0) * q^-1
    let y = f32(2.0 * (qx * qw - qz * qy));
    let temp = f32(1.0 - y * y);
    if (temp < 0.0)
    {
        temp = 0.0;
    }
    const w = f32(Math.sqrt(temp));
    const gamma = f32(invSqrtOf2 / f32(Math.sqrt(w + 1.0)));

    if (Math.abs(y) < 1.0)
    {
        // in range
    }
    else if (y - 1.0 > 0.0)
    {
        y = 1.0;
    }
    else if (y + 1.0 < 0.0)
    {
        y = -1.0;
    }
    const phi = f32(Math.asin(y));
    const pitchX = f32(y * gamma);
    const pitchW = f32((w + 1.0) * gamma);

    // y == +-1 makes the denominator below degenerate; Carbon takes a short cut
    if (Math.abs(Math.abs(y) - 1.0) < f32(0.00001))
    {
        // combinedRoll = q * conjugate(qPitch), qPitch = (pitchX, 0, 0, pitchW)
        const { quat_0, quat_1 } = scratch;
        quat_1[0] = -pitchX;
        quat_1[1] = 0.0;
        quat_1[2] = 0.0;
        quat_1[3] = pitchW;
        Quaternion.multiply(quat_0, q, quat_1);
        let combinedW = quat_0[3];
        if (Math.abs(combinedW) < 1.0)
        {
            // in range
        }
        else if (combinedW - 1.0 > 0.0)
        {
            combinedW = 1.0;
        }
        else if (combinedW + 1.0 < 0.0)
        {
            combinedW = -1.0;
        }
        let psi = f32(2.0 * f32(Math.acos(combinedW)));
        if (psi > XM_PI)
        {
            psi = f32(psi - XM_PI * 2.0);
        }
        if (quat_0[2] > 0.0)
        {
            psi = -psi;
        }
        out[0] = 0.0;
        out[1] = phi;
        out[2] = -psi;
        return out;
    }

    const denominator = f32(1.0 / f32(pitchX * pitchX - pitchW * pitchW));
    const yawRollX = f32((qw * pitchX - qx * pitchW) * denominator);
    let yawRollY = f32(-(qz * pitchX + qy * pitchW) * denominator);
    const yawRollZ = f32(-(qz * pitchW + qy * pitchX) * denominator);
    let yawRollW = f32((qx * pitchX - qw * pitchW) * denominator);

    // Carbon's divide-by-zero handler: a zero norm uses 0.0
    const divByZero = f32(Math.sqrt(yawRollW * yawRollW + yawRollZ * yawRollZ));
    const rollGamma = divByZero === 0.0 ? 0.0 : f32(1.0 / divByZero);
    let rollConW = f32(yawRollW * rollGamma);

    if (Math.abs(rollConW) < 1.0)
    {
        // in range
    }
    else if (rollConW - 1.0 > 0.0)
    {
        rollConW = 1.0;
    }
    else if (rollConW + 1.0 < 0.0)
    {
        rollConW = -1.0;
    }
    let psi = f32(2.0 * f32(Math.acos(rollConW)));
    if (psi > XM_PI)
    {
        psi = f32(psi - XM_PI * 2.0);
    }
    if (yawRollZ < 0.0)
    {
        psi = -psi;
    }

    // yawRoll.y must be calculated before yawRoll.w, which reads the original w
    yawRollY = f32((yawRollX * yawRollZ + yawRollY * yawRollW) * rollGamma);
    yawRollW = f32((yawRollZ * yawRollZ + yawRollW * yawRollW) * rollGamma);

    if (Math.abs(yawRollY) < 1.0)
    {
        // in range
    }
    else if (yawRollY - 1.0 > 0.0)
    {
        yawRollY = 1.0;
    }
    else if (yawRollY + 1.0 < 0.0)
    {
        yawRollY = -1.0;
    }
    let theta = f32(Math.asin(yawRollY));
    if (yawRollW < 0.0)
    {
        theta = f32(XM_PI - theta);
    }
    if (theta < 0.0)
    {
        theta = f32(theta + XM_PI);
    }

    out[0] = theta * 2.0;
    out[1] = phi;
    out[2] = psi;
    return out;
} // TriMath.cpp:358

// ------------------------------------------------------------------------------------
// Matrix extensions
// ------------------------------------------------------------------------------------

/**
 * Carbon: TriMatrixTranspose (TriMath.cpp:526-567)
 * Transposes, storing only the elements that fit in sizeInBytes (32: 4x2, 48: 4x3, 64: 4x4);
 * the unstored elements of out keep their values.
 * @param {Float32Array} out - may alias input
 * @param {Float32Array} input - Carbon's `in`
 * @param {number} sizeInBytes
 * @returns {Float32Array} out
 */
export function triMatrixTranspose(out, input, sizeInBytes)
{
    let f;
    out[0] = input[0];
    out[5] = input[5];
    f = input[1];
    out[1] = input[4];
    out[4] = f;
    f = input[2];
    out[2] = input[8];
    if (sizeInBytes > 32)
    {
        out[8] = f;
    }
    f = input[6];
    out[6] = input[9];
    if (sizeInBytes > 32)
    {
        out[9] = f;
    }
    f = input[3];
    out[3] = input[12];
    if (sizeInBytes > 48)
    {
        out[12] = f;
    }
    f = input[7];
    out[7] = input[13];
    if (sizeInBytes > 48)
    {
        out[13] = f;
    }
    if (sizeInBytes > 32)
    {
        out[10] = input[10];
        f = input[11];
        out[11] = input[14];
        if (sizeInBytes > 48)
        {
            out[14] = f;
        }
        if (sizeInBytes > 48)
        {
            out[15] = input[15];
        }
    }
    return out;
} // TriMath.cpp:526

/**
 * Carbon: TriMatrixRotationArc (TriMath.cpp:570-577)
 * @param {Float32Array} out
 * @param {Float32Array} v1
 * @param {Float32Array} v2
 * @returns {Float32Array} out
 */
export function triMatrixRotationArc(out, v1, v2)
{
    const { quat_1 } = scratch;
    triQuaternionRotationArc(quat_1, v1, v2);
    return Matrix.rotationMatrix__Quaternion(out, quat_1);
} // TriMath.cpp:570

/**
 * Carbon: TriMatrixArcFromForward (TriMath.cpp:580-611)
 * @param {Float32Array} out
 * @param {Float32Array} v
 * @returns {Float32Array} out
 */
export function triMatrixArcFromForward(out, v)
{
    const { vec3_0 } = scratch;
    Vector3.normalize(vec3_0, v);
    const x = vec3_0[0], y = vec3_0[1], z = vec3_0[2];
    Matrix.identityMatrix(out);
    if (z < f32(-0.99999))
    {
        return out;
    }
    if (z > f32(0.99999))
    {
        out[5] = -1.0;
        out[10] = -1.0;
        return out;
    }
    const h = f32((1.0 + z) / f32(x * x + y * y));
    out[0] = h * y * y - z;
    out[1] = -h * x * y;
    out[2] = x;

    out[4] = out[1];
    out[5] = h * x * x - z;
    out[6] = y;

    out[8] = -x;
    out[9] = -y;
    out[10] = -z;
    return out;
} // TriMath.cpp:580

/**
 * Carbon: TriMatrixTranslate (TriMath.h:152-155)
 * Routes Carbon's two same-count overloads by the second argument's exact length:
 * 16 to triMatrixTranslate__MatrixVector3, 3 to triMatrixTranslate__Vector3Matrix;
 * any other length throws.
 * @param {Float32Array} out
 * @param {Float32Array} a - Matrix, or Vector3
 * @param {Float32Array} b - Vector3, or Matrix
 * @returns {Float32Array} out
 */
export function triMatrixTranslate(out, a, b)
{
    switch (a.length)
    {
        case 16: return triMatrixTranslate__MatrixVector3(out, a, b);
        case 3: return triMatrixTranslate__Vector3Matrix(out, a, b);
    }
    throw new TypeError(`triMatrixTranslate: no Carbon overload takes a ${a.length}-component second argument.`);
}

/**
 * Carbon: TriMatrixTranslate( Matrix* out, const Matrix* m, const Vector3* v ) (TriMath.cpp:613-620)
 * Transforms by m, then translates by v: m * TranslationMatrix(v) without the multiply.
 * @param {Float32Array} out - may alias m
 * @param {Float32Array} m
 * @param {Float32Array} v
 * @returns {Float32Array} out
 */
export function triMatrixTranslate__MatrixVector3(out, m, v)
{
    Matrix.copy(out, m);
    out[12] += v[0];
    out[13] += v[1];
    out[14] += v[2];
    return out;
} // TriMath.cpp:613

/**
 * Carbon: TriMatrixTranslate( Matrix* out, const Vector3* v, const Matrix* m ) (TriMath.cpp:622-629)
 * Translates by v, then transforms by m: TranslationMatrix(v) * m without the multiply.
 * @param {Float32Array} out - may alias m
 * @param {Float32Array} v
 * @param {Float32Array} m
 * @returns {Float32Array} out
 */
export function triMatrixTranslate__Vector3Matrix(out, v, m)
{
    const x = v[0], y = v[1], z = v[2];
    Matrix.copy(out, m);
    out[12] += x * out[0] + y * out[4] + z * out[8];
    out[13] += x * out[1] + y * out[5] + z * out[9];
    out[14] += x * out[2] + y * out[6] + z * out[10];
    return out;
} // TriMath.cpp:622

/**
 * Carbon: TriMatrixRotate (TriMath.h:161-163)
 * Routes Carbon's two same-count overloads by the second argument's exact length:
 * 16 to triMatrixRotate__MatrixQuaternion, 4 to triMatrixRotate__QuaternionMatrix;
 * any other length throws.
 * @param {Float32Array} out
 * @param {Float32Array} a - Matrix, or Quaternion
 * @param {Float32Array} b - Quaternion, or Matrix
 * @returns {Float32Array} out
 */
export function triMatrixRotate(out, a, b)
{
    switch (a.length)
    {
        case 16: return triMatrixRotate__MatrixQuaternion(out, a, b);
        case 4: return triMatrixRotate__QuaternionMatrix(out, a, b);
    }
    throw new TypeError(`triMatrixRotate: no Carbon overload takes a ${a.length}-component second argument.`);
}

/**
 * Carbon: TriMatrixRotate( Matrix* out, const Matrix* m, const Quaternion* q ) (TriMath.cpp:631-637)
 * out = m * RotationMatrix(q): transforms by m, then rotates by q.
 * @param {Float32Array} out - may alias m
 * @param {Float32Array} m
 * @param {Float32Array} q
 * @returns {Float32Array} out
 */
export function triMatrixRotate__MatrixQuaternion(out, m, q)
{
    const { mat4_0 } = scratch;
    Matrix.rotationMatrix__Quaternion(mat4_0, q);
    return Matrix.multiply(out, m, mat4_0);
} // TriMath.cpp:631

/**
 * Carbon: TriMatrixRotate( Matrix* out, const Quaternion* q, const Matrix* m ) (TriMath.cpp:639-645)
 * out = RotationMatrix(q) * m: rotates by q, then transforms by m.
 * @param {Float32Array} out - may alias m
 * @param {Float32Array} q
 * @param {Float32Array} m
 * @returns {Float32Array} out
 */
export function triMatrixRotate__QuaternionMatrix(out, q, m)
{
    const { mat4_0 } = scratch;
    Matrix.rotationMatrix__Quaternion(mat4_0, q);
    return Matrix.multiply(out, mat4_0, m);
} // TriMath.cpp:639

/**
 * Carbon: TriMatrixChangeBase (TriMath.cpp:647-671)
 * Rows X = Cross(up, fwd), Y = up, Z = fwd; no translation.
 * @param {Float32Array} out
 * @param {Float32Array} fwd
 * @param {Float32Array} up
 * @returns {Float32Array} out
 */
export function triMatrixChangeBase(out, fwd, up)
{
    const { vec3_0 } = scratch;
    Vector3.cross(vec3_0, up, fwd);
    out[0] = vec3_0[0];
    out[1] = vec3_0[1];
    out[2] = vec3_0[2];
    out[3] = 0.0;

    out[4] = up[0];
    out[5] = up[1];
    out[6] = up[2];
    out[7] = 0.0;

    out[8] = fwd[0];
    out[9] = fwd[1];
    out[10] = fwd[2];
    out[11] = 0.0;

    out[12] = 0.0;
    out[13] = 0.0;
    out[14] = 0.0;
    out[15] = 1.0;
    return out;
} // TriMath.cpp:647

/**
 * Carbon: TriMatrixRemoveScaling (TriMath.cpp:683-693)
 * Normalizes the X, Y and Z basis rows.
 * @param {Float32Array} out - may alias input
 * @param {Float32Array} input - Carbon's `in`
 * @returns {Float32Array} out
 */
export function triMatrixRemoveScaling(out, input)
{
    if (out !== input)
    {
        Matrix.copy(out, input);
    }
    Vector3.normalize(Matrix.viewX(out), Matrix.viewX(out));
    Vector3.normalize(Matrix.viewY(out), Matrix.viewY(out));
    Vector3.normalize(Matrix.viewZ(out), Matrix.viewZ(out));
    return out;
} // TriMath.cpp:683

/**
 * Carbon: TriMatrixRemoveTranslation (TriMath.cpp:704-712)
 * @param {Float32Array} out - may alias input
 * @param {Float32Array} input - Carbon's `in`
 * @returns {Float32Array} out
 */
export function triMatrixRemoveTranslation(out, input)
{
    if (out !== input)
    {
        Matrix.copy(out, input);
    }
    out[12] = out[13] = out[14] = 0.0;
    return out;
} // TriMath.cpp:704

/**
 * Carbon: TriMatrixOverwriteTranslation (TriMath.cpp:724-734)
 * @param {Float32Array} out - may alias input
 * @param {Float32Array} input - Carbon's `in`
 * @param {Float32Array} t
 * @returns {Float32Array} out
 */
export function triMatrixOverwriteTranslation(out, input, t)
{
    if (out !== input)
    {
        Matrix.copy(out, input);
    }
    out[12] = t[0];
    out[13] = t[1];
    out[14] = t[2];
    return out;
} // TriMath.cpp:724

// ------------------------------------------------------------------------------------
// Double precision matrix functions (row-major double[16], as Carbon's)
// ------------------------------------------------------------------------------------

/**
 * Carbon: Matrix4dInvert (TriMath.cpp:740-822)
 * Cofactor inverse; no singular check, so a zero determinant yields non-finite values.
 * @param {Float64Array} result - may alias mat
 * @param {Float64Array} mat
 * @returns {Float64Array} result
 */
export function matrix4dInvert(result, mat)
{
    const { tmp, src } = scratch;
    // transpose matrix
    for (let i = 0; i < 4; i++)
    {
        src[i] = mat[i * 4];
        src[i + 4] = mat[i * 4 + 1];
        src[i + 8] = mat[i * 4 + 2];
        src[i + 12] = mat[i * 4 + 3];
    }
    // pairs for the first 8 elements (cofactors)
    tmp[0] = src[10] * src[15];
    tmp[1] = src[11] * src[14];
    tmp[2] = src[9] * src[15];
    tmp[3] = src[11] * src[13];
    tmp[4] = src[9] * src[14];
    tmp[5] = src[10] * src[13];
    tmp[6] = src[8] * src[15];
    tmp[7] = src[11] * src[12];
    tmp[8] = src[8] * src[14];
    tmp[9] = src[10] * src[12];
    tmp[10] = src[8] * src[13];
    tmp[11] = src[9] * src[12];
    // first 8 elements (cofactors)
    result[0] = tmp[0] * src[5] + tmp[3] * src[6] + tmp[4] * src[7];
    result[0] -= tmp[1] * src[5] + tmp[2] * src[6] + tmp[5] * src[7];
    result[1] = tmp[1] * src[4] + tmp[6] * src[6] + tmp[9] * src[7];
    result[1] -= tmp[0] * src[4] + tmp[7] * src[6] + tmp[8] * src[7];
    result[2] = tmp[2] * src[4] + tmp[7] * src[5] + tmp[10] * src[7];
    result[2] -= tmp[3] * src[4] + tmp[6] * src[5] + tmp[11] * src[7];
    result[3] = tmp[5] * src[4] + tmp[8] * src[5] + tmp[11] * src[6];
    result[3] -= tmp[4] * src[4] + tmp[9] * src[5] + tmp[10] * src[6];
    result[4] = tmp[1] * src[1] + tmp[2] * src[2] + tmp[5] * src[3];
    result[4] -= tmp[0] * src[1] + tmp[3] * src[2] + tmp[4] * src[3];
    result[5] = tmp[0] * src[0] + tmp[7] * src[2] + tmp[8] * src[3];
    result[5] -= tmp[1] * src[0] + tmp[6] * src[2] + tmp[9] * src[3];
    result[6] = tmp[3] * src[0] + tmp[6] * src[1] + tmp[11] * src[3];
    result[6] -= tmp[2] * src[0] + tmp[7] * src[1] + tmp[10] * src[3];
    result[7] = tmp[4] * src[0] + tmp[9] * src[1] + tmp[10] * src[2];
    result[7] -= tmp[5] * src[0] + tmp[8] * src[1] + tmp[11] * src[2];
    // pairs for the second 8 elements (cofactors)
    tmp[0] = src[2] * src[7];
    tmp[1] = src[3] * src[6];
    tmp[2] = src[1] * src[7];
    tmp[3] = src[3] * src[5];
    tmp[4] = src[1] * src[6];
    tmp[5] = src[2] * src[5];
    tmp[6] = src[0] * src[7];
    tmp[7] = src[3] * src[4];
    tmp[8] = src[0] * src[6];
    tmp[9] = src[2] * src[4];
    tmp[10] = src[0] * src[5];
    tmp[11] = src[1] * src[4];
    // second 8 elements (cofactors)
    result[8] = tmp[0] * src[13] + tmp[3] * src[14] + tmp[4] * src[15];
    result[8] -= tmp[1] * src[13] + tmp[2] * src[14] + tmp[5] * src[15];
    result[9] = tmp[1] * src[12] + tmp[6] * src[14] + tmp[9] * src[15];
    result[9] -= tmp[0] * src[12] + tmp[7] * src[14] + tmp[8] * src[15];
    result[10] = tmp[2] * src[12] + tmp[7] * src[13] + tmp[10] * src[15];
    result[10] -= tmp[3] * src[12] + tmp[6] * src[13] + tmp[11] * src[15];
    result[11] = tmp[5] * src[12] + tmp[8] * src[13] + tmp[11] * src[14];
    result[11] -= tmp[4] * src[12] + tmp[9] * src[13] + tmp[10] * src[14];
    result[12] = tmp[2] * src[10] + tmp[5] * src[11] + tmp[1] * src[9];
    result[12] -= tmp[4] * src[11] + tmp[0] * src[9] + tmp[3] * src[10];
    result[13] = tmp[8] * src[11] + tmp[0] * src[8] + tmp[7] * src[10];
    result[13] -= tmp[6] * src[10] + tmp[9] * src[11] + tmp[1] * src[8];
    result[14] = tmp[6] * src[9] + tmp[11] * src[11] + tmp[3] * src[8];
    result[14] -= tmp[10] * src[11] + tmp[2] * src[8] + tmp[7] * src[9];
    result[15] = tmp[10] * src[10] + tmp[4] * src[8] + tmp[9] * src[9];
    result[15] -= tmp[8] * src[9] + tmp[11] * src[10] + tmp[5] * src[8];
    // determinant
    let det = src[0] * result[0] + src[1] * result[1] + src[2] * result[2] + src[3] * result[3];
    det = 1.0 / det;
    for (let j = 0; j < 16; j++)
    {
        result[j] *= det;
    }
    return result;
} // TriMath.cpp:740

/**
 * Carbon: Matrix4dMultiply (TriMath.cpp:825-835)
 * result = m0 * m1 (row-vector order, as Matrix.multiply).
 * Carbon quirk, reproduced: it writes result while still reading m0 and m1, so result
 * must not alias either input.
 * @param {Float64Array} result
 * @param {Float64Array} m0
 * @param {Float64Array} m1
 * @returns {Float64Array} result
 */
export function matrix4dMultiply(result, m0, m1)
{
    for (let r = 0; r < 4; r++)
    {
        for (let c = 0; c < 4; c++)
        {
            result[r * 4 + c] = m0[r * 4] * m1[c] + m0[r * 4 + 1] * m1[c + 4] + m0[r * 4 + 2] * m1[c + 8] + m0[r * 4 + 3] * m1[c + 12];
        }
    }
    return result;
} // TriMath.cpp:825

/**
 * Carbon: Matrix4dCopy (TriMath.cpp:837-841)
 * @param {Float64Array} result
 * @param {Float64Array} mat
 * @returns {Float64Array} result
 */
export function matrix4dCopy(result, mat)
{
    result.set(mat.subarray(0, 16));
    return result;
} // TriMath.cpp:837

/**
 * Carbon: Matrix4dTransform (TriMath.cpp:843-850)
 * Row-vector point * mat in double precision.
 * @param {Float64Array} out - receives the Vector4d; may alias point
 * @param {Float64Array} point - Vector4d
 * @param {Float64Array} mat
 * @returns {Float64Array} out
 */
export function matrix4dTransform(out, point, mat)
{
    const x = point[0], y = point[1], z = point[2], w = point[3];
    out[0] = x * mat[0] + y * mat[4] + z * mat[8] + w * mat[12];
    out[1] = x * mat[1] + y * mat[5] + z * mat[9] + w * mat[13];
    out[2] = x * mat[2] + y * mat[6] + z * mat[10] + w * mat[14];
    out[3] = x * mat[3] + y * mat[7] + z * mat[11] + w * mat[15];
    return out;
} // TriMath.cpp:843

/**
 * Carbon: Matrix4dToMatrix (TriMath.cpp:853-864)
 * @param {Float32Array} out - receives the float Matrix
 * @param {Float64Array} mat
 * @returns {Float32Array} out
 */
export function matrix4dToMatrix(out, mat)
{
    for (let i = 0; i < 16; i++)
    {
        out[i] = mat[i];
    }
    return out;
} // TriMath.cpp:853

/**
 * Carbon: Matrix4dFromMatrix (TriMath.cpp:867-877)
 * @param {Float64Array} result
 * @param {Float32Array} mat
 * @returns {Float64Array} result
 */
export function matrix4dFromMatrix(result, mat)
{
    for (let i = 0; i < 16; i++)
    {
        result[i] = mat[i];
    }
    return result;
} // TriMath.cpp:867

// ------------------------------------------------------------------------------------
// Misc extensions
// ------------------------------------------------------------------------------------

/**
 * Carbon: IsFinite (TriMath.h:195-196)
 * Routes Carbon's two overloads by an exact check: a number goes to isFinite__Float,
 * anything else to isFinite__Vector3.
 * @param {number|Float32Array} value
 * @returns {boolean}
 */
export function isFinite(value)
{
    return typeof value === "number" ? isFinite__Float(value) : isFinite__Vector3(value);
}

/**
 * Carbon: IsFinite( float value ) (TriMath.cpp:884-889)
 * @param {number} value
 * @returns {boolean} false for NaN and either infinity
 */
export function isFinite__Float(value)
{
    return value === value && value !== Infinity && value !== -Infinity;
} // TriMath.cpp:884

/**
 * Carbon: IsFinite( const Vector3& vec ) (TriMath.cpp:891-894)
 * @param {Float32Array} vec
 * @returns {boolean}
 */
export function isFinite__Vector3(vec)
{
    return isFinite__Float(vec[0]) && isFinite__Float(vec[1]) && isFinite__Float(vec[2]);
} // TriMath.cpp:891

/**
 * Carbon: TriClamp (TriMath.cpp:896-902)
 * @param {number} f
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function triClamp(f, min, max)
{
    return (f < min) ? min : ((f > max) ? max : f);
} // TriMath.cpp:896

/**
 * Carbon: ClampInt (TriMath.cpp:904-910)
 * Arguments convert to int32_t, as the C++ parameters do.
 * @param {number} f
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clampInt(f, min, max)
{
    f |= 0;
    min |= 0;
    max |= 0;
    return (f < min) ? min : ((f > max) ? max : f);
} // TriMath.cpp:904

/**
 * Carbon: ClampUInt (TriMath.cpp:912-918)
 * Arguments convert to uint32_t, as the C++ parameters do.
 * @param {number} f
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clampUInt(f, min, max)
{
    f >>>= 0;
    min >>>= 0;
    max >>>= 0;
    return (f < min) ? min : ((f > max) ? max : f);
} // TriMath.cpp:912

/**
 * Carbon: Lerp (TriMath.cpp:920-926)
 * @param {number} min
 * @param {number} max
 * @param {number} s
 * @returns {number} min + s * (max - min)
 */
export function lerp(min, max, s)
{
    return f32(min + s * (max - min));
} // TriMath.cpp:920

/**
 * Carbon: Hermite (TriMath.cpp:928-949)
 * Hermite segment from v1 (out-tangent r) to v2 (in-tangent l) over dt, evaluated at t.
 * @param {number} v1
 * @param {number} r
 * @param {number} v2
 * @param {number} l
 * @param {number} t
 * @param {number} dt
 * @returns {number}
 */
export function hermite(v1, r, v2, l, t, dt)
{
    const _1_T = f32(1.0 / dt);
    const _1_T2 = f32(_1_T * _1_T);
    const t2 = f32(t * t);
    const t2_T = f32(t2 * _1_T);
    const t3_T2 = f32(t2 * t * _1_T2);
    const _2t3_T3 = f32(2.0 * t3_T2 * _1_T);
    const _3t2_T2 = f32(3.0 * t2 * _1_T2);
    return f32(v1 * (_2t3_T3 - _3t2_T2 + 1.0) +
        v2 * (-_2t3_T3 + _3t2_T2) +
        r * (t3_T2 - t2_T - t2_T + t) +
        l * (t3_T2 - t2_T));
} // TriMath.cpp:928

/**
 * Carbon: TriLinearize (TriMath.cpp:951-954)
 * @param {number} min
 * @param {number} max
 * @param {number} v
 * @returns {number} (v - min) / (max - min), clamped to [0, 1]
 */
export function triLinearize(min, max, v)
{
    return triClamp(f32((v - min) / (max - min)), 0.0, 1.0);
} // TriMath.cpp:951

/**
 * Carbon: SinSmooth (TriMath.cpp:956-961)
 * @param {number} f - in [0, 1]
 * @returns {number} in [0, 1]
 */
export function sinSmooth(f)
{
    const ret = f32(f * XM_PI - XM_PI / 2.0);
    return f32(Math.sin(ret) / 2.0 + 0.5);
} // TriMath.cpp:956

/**
 * Carbon: CubicInterpolate (TriMath.cpp:963-966)
 * Catmull-Rom through p0..p1 at s, with neighbours pm1 and p2.
 * @param {number} pm1
 * @param {number} p0
 * @param {number} p1
 * @param {number} p2
 * @param {number} s
 * @returns {number}
 */
export function cubicInterpolate(pm1, p0, p1, p2, s)
{
    return f32(p0 + 0.5 * s * (p1 - pm1 + s * (2.0 * pm1 - 5.0 * p0 + 4.0 * p1 - p2 + s * (3.0 * (p0 - p1) + p2 - pm1))));
} // TriMath.cpp:963

// ------------------------------------------------------------------------------------
// Random functions: a small LCG, state jran
// ------------------------------------------------------------------------------------

let jran = 1234;

/**
 * Carbon: TriSrand (TriMath.h:225-226)
 * Both Carbon overloads are the same in JS (Be::Time ticks and uint32_t are both
 * Numbers, and both truncate to 32 bits), so the bare name is triSrand__UInt32.
 * @param {number} seed
 */
export function triSrand(seed)
{
    triSrand__UInt32(seed);
}

/**
 * Carbon: TriSrand( Be::Time seed ) (TriMath.cpp:972-975)
 * uint32_t(seed) keeps the tick count's low 32 bits; for integer ticks below 2^53 that
 * is exactly `>>> 0`, so this returns triSrand__UInt32's call.
 * @param {number} seed - Blue ticks
 */
export function triSrand__Time(seed)
{
    triSrand__UInt32(seed);
} // TriMath.cpp:972

/**
 * Carbon: TriSrand( uint32_t seed ) (TriMath.cpp:977-980)
 * @param {number} seed
 */
export function triSrand__UInt32(seed)
{
    jran = (seed >>> 0) % 714025;
} // TriMath.cpp:977

/** Advances jran: jran = (jran << 12 + 150889) % 714025; jran < 2^20, so no 32-bit wrap */
function advanceJran()
{
    jran = (jran * 4096 + 150889) % 714025;
}

/**
 * Carbon: TriRand (TriMath.cpp:982-988)
 * @returns {number} in [0, 1)
 */
export function triRand()
{
    advanceJran();
    return f32(jran / 714025.0);
} // TriMath.cpp:982

/**
 * Carbon: TriRandInt (TriMath.h:228-229)
 * Routes Carbon's two overloads by argument count, which JS sees exactly: 1 to
 * triRandInt__Hi, 2 to triRandInt__LoHi.
 * @returns {number}
 */
export function triRandInt(a, b)
{
    switch (arguments.length)
    {
        case 1: return triRandInt__Hi(a);
        case 2: return triRandInt__LoHi(a, b);
    }
    throw new TypeError(`triRandInt: no Carbon overload takes ${arguments.length} arguments.`);
}

/**
 * Carbon: TriRandInt( int hi ) (TriMath.cpp:990-996)
 * `hi * jran` mixes int and uint32_t, so C++ multiplies and divides unsigned and
 * converts back to int; reproduced with 32-bit wrap.
 * @param {number} hi
 * @returns {number} in [0, hi) for 0 <= hi
 */
export function triRandInt__Hi(hi)
{
    advanceJran();
    return Math.floor((Math.imul(hi | 0, jran) >>> 0) / 714025) | 0;
} // TriMath.cpp:990

/**
 * Carbon: TriRandInt( int lo, int hi ) (TriMath.cpp:998-1004)
 * Unsigned arithmetic as triRandInt__Hi, then + lo with 32-bit wrap.
 * @param {number} lo
 * @param {number} hi
 * @returns {number} in [lo, hi) for lo <= hi
 */
export function triRandInt__LoHi(lo, hi)
{
    advanceJran();
    return (Math.floor((Math.imul((hi - lo) | 0, jran) >>> 0) / 714025) + (lo | 0)) | 0;
} // TriMath.cpp:998

/**
 * Carbon: TriRandGetSeed (TriMath.cpp:1006-1009)
 * @returns {number} the current jran
 */
export function triRandGetSeed()
{
    return jran;
} // TriMath.cpp:1006

// ------------------------------------------------------------------------------------
// Noise
// ------------------------------------------------------------------------------------

/**
 * Carbon: TriPerlinNoise (Include/TriMath.h:259-295, TriMath.cpp:1012-1061)
 * One-dimensional Perlin noise over a 256-entry gradient table filled from std::mt19937.
 * A Carbon class, so a class here: the constructor is Carbon's no-argument constructor
 * (seeded from std::random_device, represented by host entropy) and
 * TriPerlinNoise.create__Seed is the seeded one.
 */
export class TriPerlinNoise
{
    static TABLE_SIZE = 256;
    static TABLE_MASK = TriPerlinNoise.TABLE_SIZE - 1;

    /** Carbon: TriPerlinNoise::TriPerlinNoise() (TriMath.cpp:1029-1032) */
    constructor()
    {
        /** Carbon: m_gradients (private) */
        this._m_gradients = new Float64Array(TriPerlinNoise.TABLE_SIZE);
        this._Seed(random.randomDevice());
    }

    /**
     * Carbon: TriPerlinNoise::TriPerlinNoise( uint32_t seed ) (TriMath.cpp:1021-1027)
     * @param {number} seed
     * @returns {TriPerlinNoise}
     */
    static create__Seed(seed)
    {
        const noise = new TriPerlinNoise();
        noise._Seed(seed);
        return noise;
    }

    /**
     * Fills m_gradients from std::mt19937( seed ), as Carbon's seeded constructor body.
     * Ours: the constructor bodies' shared step, since a JS class has one constructor.
     * @param {number} seed
     */
    _Seed(seed)
    {
        const { TABLE_SIZE } = TriPerlinNoise;
        const randGen = random.mt19937(seed);
        for (let i = 0; i < TABLE_SIZE; ++i)
        {
            this._m_gradients[i] = ((randGen() % (TABLE_SIZE + TABLE_SIZE)) - TABLE_SIZE) / TABLE_SIZE;
        }
    }

    /**
     * Carbon: TriPerlinNoise::operator()( double x ) const (TriMath.cpp:1034-1046)
     * Renamed: a JS object cannot be called, so Carbon's call operator is a method.
     * @param {number} x
     * @returns {number} in [-1, 1]
     */
    Sample(x)
    {
        const { TABLE_MASK } = TriPerlinNoise;
        const b0 = Math.floor(x) & TABLE_MASK;
        const b1 = (b0 + 1) & TABLE_MASK;
        const rx0 = x - Math.floor(x);
        const rx1 = rx0 - 1.0;
        const v0 = rx0 * this._m_gradients[b0];
        const v1 = rx1 * this._m_gradients[b1];
        return v0 + sCurve(rx0) * (v1 - v0);
    } // TriMath.cpp:1034

    /**
     * Carbon: TriPerlinNoise::FractalSum (TriMath.cpp:1048-1061)
     * @param {number} x
     * @param {number} octaves - size_t
     * @param {number} [amplitudeScale=0.5]
     * @param {number} [frequencyScale=2]
     * @returns {number}
     */
    FractalSum(x, octaves, amplitudeScale = 0.5, frequencyScale = 2)
    {
        let sum = 0.0;
        let scale = 1.0;
        for (let i = 0; i < octaves; ++i)
        {
            const val = this.Sample(x);
            sum += val * scale;
            scale *= amplitudeScale;
            x *= frequencyScale;
        }
        return sum;
    } // TriMath.cpp:1048
}

/**
 * Carbon: SCurve (TriMath.cpp:1014-1017, anonymous namespace)
 * @param {number} t
 * @returns {number}
 */
function sCurve(t)
{
    return t * t * (3.0 - 2.0 * t);
}

/** Carbon's function-static `TriPerlinNoise noise{ 0 }`, built on first use */
let perlinNoise1DNoise = null;

/**
 * Carbon: PerlinNoise1D (TriMath.cpp:1063-1067)
 * Fractal sum over a fixed-seed (0) TriPerlinNoise, reproducible across runs.
 * @param {number} x
 * @param {number} invAmplitude
 * @param {number} frequency
 * @param {number} octaves - int; negative counts as 0
 * @returns {number}
 */
export function perlinNoise1D(x, invAmplitude, frequency, octaves)
{
    if (perlinNoise1DNoise === null)
    {
        perlinNoise1DNoise = TriPerlinNoise.create__Seed(0);
    }
    return perlinNoise1DNoise.FractalSum(x, Math.max(0, octaves | 0), 1.0 / invAmplitude, frequency);
} // TriMath.cpp:1063

// ------------------------------------------------------------------------------------
// Coordinate system conversion
// ------------------------------------------------------------------------------------

/**
 * Carbon: ConvertProjectionCoordToWorldPickRay (TriMath.cpp:1070-1102)
 * Unprojects projection-space (x, y) at z 0 and z 0.5 through the inverse projection and
 * view, giving a world ray start and unit direction.
 * @param {number} x
 * @param {number} y
 * @param {Float32Array} projMat
 * @param {Float32Array} viewMat
 * @param {Float32Array} rayStart - receives the ray start
 * @param {Float32Array} rayDir - receives the ray direction
 * @returns {boolean} false when either matrix is singular (outputs untouched)
 */
export function convertProjectionCoordToWorldPickRay(x, y, projMat, viewMat, rayStart, rayDir)
{
    const { mat4_0, mat4_1, vec3_0 } = scratch;
    if (!Matrix.inverse__Out(mat4_0, projMat))
    {
        return false;
    }
    if (!Matrix.inverse__Out(mat4_1, viewMat))
    {
        return false;
    }

    rayStart[0] = x;
    rayStart[1] = y;
    rayStart[2] = 0.0;
    // TransformCoord divides by w: this unprojects
    Matrix.transformCoord(rayStart, rayStart, mat4_0);
    Matrix.transformCoord(rayStart, rayStart, mat4_1);

    vec3_0[0] = x;
    vec3_0[1] = y;
    vec3_0[2] = 0.5;
    Matrix.transformCoord(vec3_0, vec3_0, mat4_0);
    Matrix.transformCoord(vec3_0, vec3_0, mat4_1);

    Vector3.subtract(vec3_0, vec3_0, rayStart);
    Vector3.normalize(rayDir, vec3_0);
    return true;
} // TriMath.cpp:1070

const scratch = {
    vec3_0: new Float32Array(3),
    quat_0: new Float32Array(4),
    quat_1: new Float32Array(4),
    mat4_0: new Float32Array(16),
    mat4_1: new Float32Array(16),
    sq: new Float32Array(3),
    quat: new Float32Array(5),
    ret: new Float32Array(5),
    tmp: new Float64Array(12),
    src: new Float64Array(16)
};
