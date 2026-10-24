// Source: math/include/Vector3_inline.h
/** Internal float32 Vector3 kernels, pending complete precision-table selection. */
export const vector3Float32 = { dot, lengthSq, length, normalize, clampLength };

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
