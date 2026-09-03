// Carbon Vector3, ported literally from e:\carbonengine\math
// (Vector3.h / Vector3_inline.h / src\Vector3.cpp).
// Storage is a plain Float32Array [x, y, z]. Scalar locals that Carbon holds in a
// `float` are rounded with Math.fround so numerics match Carbon's float32 arithmetic;
// component stores round via the Float32Array itself.
// Deliberate drops: XMVECTOR interop (Vector3_inline.h:21,:27) has no JS analogue;
// operator[] (:33,:39) is native indexing; compound assignment operators are covered
// by passing `out === a`; operator!= (:139) is !exactEquals; the free
// `float * Vector3` (:157) is `scale`.

const f32 = Math.fround;

/**
 * Carbon Vector3
 * @typedef {Float32Array} vector3
 */
export const vector3 = {};

/** Creates a zeroed vector3 */
vector3.create = function ()
{
    return new Float32Array(3);
}; // Vector3_inline.h:5

/** Creates a vector3 from values */
vector3.fromValues = function (x, y, z)
{
    const out = new Float32Array(3);
    out[0] = x;
    out[1] = y;
    out[2] = z;
    return out;
}; // Vector3_inline.h:13

/** Copies a vector3 */
vector3.copy = function (out, a)
{
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    return out;
}; // Vector3_inline.h:91

/** Adds two vector3s component-wise */
vector3.add = function (out, a, b)
{
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    return out;
}; // Vector3_inline.h:103

/** Subtracts vector3 b from vector3 a component-wise */
vector3.subtract = function (out, a, b)
{
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    return out;
}; // Vector3_inline.h:109

/** Multiplies two vector3s component-wise */
vector3.multiply = function (out, a, b)
{
    out[0] = a[0] * b[0];
    out[1] = a[1] * b[1];
    out[2] = a[2] * b[2];
    return out;
}; // Vector3_inline.h:115

/** Scales a vector3 by a scalar */
vector3.scale = function (out, a, f)
{
    const s = f32(f);
    out[0] = a[0] * s;
    out[1] = a[1] * s;
    out[2] = a[2] * s;
    return out;
}; // Vector3_inline.h:121

/** Divides a vector3 by a scalar (Carbon multiplies by the float reciprocal) */
vector3.divideScalar = function (out, a, f)
{
    const fDiv = f32(1 / f32(f));
    out[0] = a[0] * fDiv;
    out[1] = a[1] * fDiv;
    out[2] = a[2] * fDiv;
    return out;
}; // Vector3_inline.h:127 (reciprocal per :81)

/** Negates a vector3 */
vector3.negate = function (out, a)
{
    out[0] = -a[0];
    out[1] = -a[1];
    out[2] = -a[2];
    return out;
}; // Vector3_inline.h:97

/** Compares two vector3s for exact equality */
vector3.exactEquals = function (a, b)
{
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}; // Vector3_inline.h:133

/** Returns a live xy subarray view of a vector3 (GetXY) */
vector3.$xy = function (a)
{
    return a.subarray(0, 2);
}; // Vector3_inline.h:145

/** Returns the dot product of two vector3s */
vector3.dot = function (a, b)
{
    return f32(a[0] * b[0] + a[1] * b[1] + a[2] * b[2]);
}; // Vector3_inline.h:163

/** Returns the squared length of a vector3 */
vector3.lengthSq = function (a)
{
    return f32(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
}; // Vector3_inline.h:169

/** Returns the length of a vector3 */
vector3.length = function (a)
{
    return f32(Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]));
}; // Vector3_inline.h:175

/** Normalizes a vector3 with Carbon's overflow guard (divide by the largest component first) */
vector3.normalize = function (out, a)
{
    const x = a[0], y = a[1], z = a[2];
    // Prevent overflow to +inf for large vectors (due to the required squaring)
    const max = Math.max(Math.max(Math.abs(x), Math.abs(y)), Math.abs(z));
    const fDiv = f32(1 / (max ? max : 1));
    const mx = f32(x * fDiv), my = f32(y * fDiv), mz = f32(z * fDiv);
    let length = f32(Math.sqrt(mx * mx + my * my + mz * mz));
    if (length)
    {
        length = f32(1 / length);
    }
    out[0] = mx * length;
    out[1] = my * length;
    out[2] = mz * length;
    return out;
}; // Vector3_inline.h:181

/** Sets out to the cross product of two vector3s */
vector3.cross = function (out, a, b)
{
    const ax = a[0], ay = a[1], az = a[2];
    const bx = b[0], by = b[1], bz = b[2];
    out[0] = f32(ay * bz) - f32(az * by);
    out[1] = f32(az * bx) - f32(ax * bz);
    out[2] = f32(ax * by) - f32(ay * bx);
    return out;
}; // Vector3_inline.h:195

/** Clamps a vector3 to a maximum length */
vector3.clampLength = function (out, a, maxLength)
{
    if (vector3.length(a) <= f32(maxLength))
    {
        return vector3.copy(out, a);
    }
    vector3.normalize(out, a);
    return vector3.scale(out, out, maxLength);
}; // Vector3_inline.h:201

/** Linearly interpolates between two vector3s: v1 + (v2 - v1) * s */
vector3.lerp = function (out, a, b, s)
{
    const t = f32(s);
    const ax = a[0], ay = a[1], az = a[2];
    out[0] = ax + f32(f32(b[0] - ax) * t);
    out[1] = ay + f32(f32(b[1] - ay) * t);
    out[2] = az + f32(f32(b[2] - az) * t);
    return out;
}; // Vector3_inline.h:211

/** Component-wise maximum of two vector3s */
vector3.maximize = function (out, a, b)
{
    out[0] = Math.max(a[0], b[0]);
    out[1] = Math.max(a[1], b[1]);
    out[2] = Math.max(a[2], b[2]);
    return out;
}; // Vector3_inline.h:217

/** Component-wise minimum of two vector3s */
vector3.minimize = function (out, a, b)
{
    out[0] = Math.min(a[0], b[0]);
    out[1] = Math.min(a[1], b[1]);
    out[2] = Math.min(a[2], b[2]);
    return out;
}; // Vector3_inline.h:223

/** Component-wise absolute value of a vector3 */
vector3.abs = function (out, a)
{
    out[0] = Math.abs(a[0]);
    out[1] = Math.abs(a[1]);
    out[2] = Math.abs(a[2]);
    return out;
}; // Vector3_inline.h:229

/** Hermite interpolation between v1 and v2 with tangents t1 and t2 (Carbon's argument order) */
vector3.hermite = function (out, v1, t1, v2, t2, s)
{
    const k3 = f32(2 * s * s * s - 3 * s * s + 1);
    const k2 = f32(-2 * s * s * s + 3 * s * s);
    const k1 = f32(s * s * s - 2 * s * s + s);
    const k0 = f32(s * s * s - s * s);
    const x = k3 * v1[0] + k2 * v2[0] + k1 * t1[0] + k0 * t2[0];
    const y = k3 * v1[1] + k2 * v2[1] + k1 * t1[1] + k0 * t2[1];
    const z = k3 * v1[2] + k2 * v2[2] + k1 * t1[2] + k0 * t2[2];
    out[0] = x;
    out[1] = y;
    out[2] = z;
    return out;
}; // Vector3_inline.h:235

/** Ray/sphere probe: true if the ray from rayPosition along rayDirection can hit the sphere */
vector3.sphereBoundProbe = function (center, radius, rayPosition, rayDirection)
{
    const dx = f32(rayPosition[0] - center[0]);
    const dy = f32(rayPosition[1] - center[1]);
    const dz = f32(rayPosition[2] - center[2]);
    const a = f32(rayDirection[0] * rayDirection[0] + rayDirection[1] * rayDirection[1] + rayDirection[2] * rayDirection[2]);
    const b = f32(dx * rayDirection[0] + dy * rayDirection[1] + dz * rayDirection[2]);
    const c = f32(f32(dx * dx + dy * dy + dz * dz) - f32(radius) * f32(radius));
    const d = f32(b * b - a * c);
    return !((d <= 0) || (f32(2 * Math.sqrt(d)) <= b));
}; // Vector3_inline.h:249

/** Angle in radians between two vectors that are not necessarily normalized */
vector3.angleFromNonNormalized = function (a, b)
{
    const dot = vector3.dot(a, b);
    let lenTimesLen = f32(vector3.length(a) * vector3.length(b));
    if (lenTimesLen === 0)
    {
        lenTimesLen = 1;
    }
    return f32(Math.acos(dot / lenTimesLen));
}; // Vector3_inline.h:263

/** Angle in radians between two normalized vectors */
vector3.angleFromNormalized = function (a, b)
{
    return f32(Math.acos(vector3.dot(a, b)));
}; // Vector3_inline.h:274

/** Computes a bounding sphere over count positions in a Float32Array (stride in floats); sets outCenter, returns radius */
vector3.computeBoundingSphere = function (outCenter, array, offset, stride, count)
{
    let tx = 0, ty = 0, tz = 0;
    let radius = 0;
    if (!count)
    {
        outCenter[0] = tx;
        outCenter[1] = ty;
        outCenter[2] = tz;
        return radius;
    }

    let o = offset;
    for (let i = 0; i < count; i++)
    {
        tx = f32(tx + array[o]);
        ty = f32(ty + array[o + 1]);
        tz = f32(tz + array[o + 2]);
        o += stride;
    }

    const fDiv = f32(1 / f32(count));
    outCenter[0] = tx * fDiv;
    outCenter[1] = ty * fDiv;
    outCenter[2] = tz * fDiv;

    o = offset;
    for (let i = 0; i < count; i++)
    {
        const dx = f32(outCenter[0] - array[o]);
        const dy = f32(outCenter[1] - array[o + 1]);
        const dz = f32(outCenter[2] - array[o + 2]);
        const d = f32(dx * dx + dy * dy + dz * dz);
        o += stride;
        if (d > radius)
        {
            radius = d;
        }
    }
    return f32(Math.sqrt(radius));
}; // Vector3.cpp:7
