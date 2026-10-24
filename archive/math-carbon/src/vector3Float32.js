// Source: math/include/Vector3_inline.h
/** Internal float32 Vector3 kernels, pending complete precision-table selection. */
export const vector3Float32 = { dot, lengthSq, length, normalize, clampLength, hermite, sphereBoundProbe, computeBoundingSphere };

/**
 * Carbon: Dot (math/include/Vector3_inline.h:163-166)
 * Returns the dot product with float32 products and sums.
 * @param {Float32Array} a First vector.
 * @param {Float32Array} b Second vector.
 * @returns {number} Dot product.
 */
function dot(a, b)
{
    const f = Math.fround;
    return f(f(f(a[0] * b[0]) + f(a[1] * b[1])) + f(a[2] * b[2]));
}

/**
 * Carbon: LengthSq (math/include/Vector3_inline.h:169-172)
 * Returns the float32 squared length.
 * @param {Float32Array} a Vector.
 * @returns {number} Squared length.
 */
function lengthSq(a)
{
    return dot(a, a);
}

/**
 * Carbon: Length (math/include/Vector3_inline.h:175-178)
 * Returns the float32 square root of the float32 squared length.
 * @param {Float32Array} a Vector.
 * @returns {number} Length.
 */
function length(a)
{
    return Math.fround(Math.sqrt(lengthSq(a)));
}

/**
 * Carbon: Normalize (math/include/Vector3_inline.h:181-192)
 * Preserves the native maximum-component guard, reciprocal and minified vector stores.
 * @param {Float32Array} out Receiving vector; may overlap a.
 * @param {Float32Array} a Vector.
 * @returns {Float32Array} out
 */
function normalize(out, a)
{
    const f = Math.fround;
    const x = a[0], y = a[1], z = a[2];
    const ax = Math.abs(x), ay = Math.abs(y), az = Math.abs(z);
    const maxXY = ax < ay ? ay : ax;
    const max = maxXY < az ? az : maxXY;
    const reciprocal = f(1 / (max !== 0 ? max : 1));
    const mx = f(x * reciprocal), my = f(y * reciprocal), mz = f(z * reciprocal);
    let magnitude = f(Math.sqrt(f(f(f(mx * mx) + f(my * my)) + f(mz * mz))));
    if (magnitude !== 0) magnitude = f(1 / magnitude);
    out[0] = f(mx * magnitude);
    out[1] = f(my * magnitude);
    out[2] = f(mz * magnitude);
    return out;
}

/**
 * Carbon: ClampLength (math/include/Vector3_inline.h:201-208)
 * Retains the native length branch and rounded normalization before scaling.
 * @param {Float32Array} out Receiving vector; may overlap a.
 * @param {Float32Array} a Vector.
 * @param {number} maxLength Maximum length, converted to native float.
 * @returns {Float32Array} out
 */
function clampLength(out, a, maxLength)
{
    const f = Math.fround;
    const limit = f(maxLength);
    if (length(a) <= limit)
    {
        const x = a[0], y = a[1], z = a[2];
        out[0] = x;
        out[1] = y;
        out[2] = z;
        return out;
    }
    normalize(out, a);
    out[0] = f(out[0] * limit);
    out[1] = f(out[1] * limit);
    out[2] = f(out[2] * limit);
    return out;
}

/**
 * Carbon: Hermite (math/include/Vector3_inline.h:235-246)
 * Preserves left-associated float coefficients and component sums.
 * @param {Float32Array} out Receiving vector; may overlap any input.
 * @param {Float32Array} v1 First position.
 * @param {Float32Array} t1 First tangent.
 * @param {Float32Array} v2 Second position.
 * @param {Float32Array} t2 Second tangent.
 * @param {number} s Interpolation parameter, converted to native float.
 * @returns {Float32Array} out
 */
function hermite(out, v1, t1, v2, t2, s)
{
    const f = Math.fround;
    s = f(s);
    const k3 = f(f(f(f(f(2 * s) * s) * s) - f(f(3 * s) * s)) + 1);
    const k2 = f(f(f(f(-2 * s) * s) * s) + f(f(3 * s) * s));
    const k1 = f(f(f(f(s * s) * s) - f(f(2 * s) * s)) + s);
    const k0 = f(f(f(s * s) * s) - f(s * s));
    const x = f(f(f(f(k3 * v1[0]) + f(k2 * v2[0])) + f(k1 * t1[0])) + f(k0 * t2[0]));
    const y = f(f(f(f(k3 * v1[1]) + f(k2 * v2[1])) + f(k1 * t1[1])) + f(k0 * t2[1]));
    const z = f(f(f(f(k3 * v1[2]) + f(k2 * v2[2])) + f(k1 * t1[2])) + f(k0 * t2[2]));
    out[0] = x;
    out[1] = y;
    out[2] = z;
    return out;
}

/**
 * Carbon: SphereBoundProbe (math/include/Vector3_inline.h:249-261)
 * Tests the rounded native discriminant and direction condition without an epsilon.
 * @param {Float32Array} center Sphere center.
 * @param {number} radius Radius, converted to native float.
 * @param {Float32Array} rayPosition Ray origin.
 * @param {Float32Array} rayDirection Ray direction.
 * @returns {boolean} Native probe result.
 */
function sphereBoundProbe(center, radius, rayPosition, rayDirection)
{
    const f = Math.fround;
    radius = f(radius);
    const dx = f(rayPosition[0] - center[0]);
    const dy = f(rayPosition[1] - center[1]);
    const dz = f(rayPosition[2] - center[2]);
    const a = lengthSq(rayDirection);
    const b = f(f(f(dx * rayDirection[0]) + f(dy * rayDirection[1])) + f(dz * rayDirection[2]));
    const c = f(f(f(f(dx * dx) + f(dy * dy)) + f(dz * dz)) - f(radius * radius));
    const d = f(f(b * b) - f(a * c));
    return !((d <= 0) || (f(2 * f(Math.sqrt(d))) <= b));
}

/**
 * Carbon: ComputeBoundingSphere (math/src/Vector3.cpp:7-43)
 * Preserves native sum stores, center writes and the subsequent radius pass.
 * @param {Float32Array} outCenter Receiving center; writes precede the radius pass.
 * @param {Float32Array} array Position storage.
 * @param {number} offset First component offset, in floats.
 * @param {number} stride Position stride, in floats.
 * @param {number} count Native uint32 vertex count.
 * @returns {number} Float32 radius.
 */
function computeBoundingSphere(outCenter, array, offset, stride, count)
{
    const f = Math.fround;
    let x = 0, y = 0, z = 0;
    let radius = 0;
    if (count === 0)
    {
        outCenter[0] = 0;
        outCenter[1] = 0;
        outCenter[2] = 0;
        return radius;
    }
    let o = offset;
    for (let i = 0; i < count; i++)
    {
        x = f(x + array[o]);
        y = f(y + array[o + 1]);
        z = f(z + array[o + 2]);
        o += stride;
    }
    const reciprocal = f(1 / f(count));
    outCenter[0] = f(x * reciprocal);
    outCenter[1] = f(y * reciprocal);
    outCenter[2] = f(z * reciprocal);
    o = offset;
    for (let i = 0; i < count; i++)
    {
        const dx = f(outCenter[0] - array[o]);
        const dy = f(outCenter[1] - array[o + 1]);
        const dz = f(outCenter[2] - array[o + 2]);
        const d = f(f(f(dx * dx) + f(dy * dy)) + f(dz * dz));
        if (d > radius) radius = d;
        o += stride;
    }
    return f(Math.sqrt(radius));
}
