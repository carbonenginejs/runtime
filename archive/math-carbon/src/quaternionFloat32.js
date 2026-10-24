// Source: math/include/Quaternion_inline.h
/**
 * Internal float32 arithmetic kernels for the prepared Carbon Quaternion port.
 * This partial table is absent from the runtime and archive barrel; initialization
 * selection is not wired yet. Native agreement is bounded to the verified build.
 */
export const quaternionFloat32 = { multiply, dot, lengthSq, length, normalize, inverse, scale, divide };

/**
 * Carbon: Quaternion::operator* (math/include/Quaternion_inline.h:118-126)
 * Composes a then b with float32 arithmetic in Carbon order.
 * @param {Float32Array} out Receiving quaternion; may overlap either input.
 * @param {Float32Array} a First quaternion.
 * @param {Float32Array} b Second quaternion.
 * @returns {Float32Array} out
 */
function multiply(out, a, b)
{
    const f = Math.fround;
    const ax = a[0], ay = a[1], az = a[2], aw = a[3];
    const bx = b[0], by = b[1], bz = b[2], bw = b[3];
    out[0] = f(f(f(f(bw * ax) + f(bx * aw)) + f(by * az)) - f(bz * ay));
    out[1] = f(f(f(f(bw * ay) - f(bx * az)) + f(by * aw)) + f(bz * ax));
    out[2] = f(f(f(f(bw * az) + f(bx * ay)) - f(by * ax)) + f(bz * aw));
    out[3] = f(f(f(f(bw * aw) - f(bx * ax)) - f(by * ay)) - f(bz * az));
    return out;
}

/**
 * Carbon: Dot (math/include/Quaternion_inline.h:226-229)
 * Returns the quaternion dot product with float32 arithmetic.
 * @param {Float32Array} a First quaternion.
 * @param {Float32Array} b Second quaternion.
 * @returns {number} Dot product.
 */
function dot(a, b)
{
    const f = Math.fround;
    return f(f(f(f(a[0] * b[0]) + f(a[1] * b[1])) + f(a[2] * b[2])) + f(a[3] * b[3]));
}

/**
 * Carbon: LengthSq (math/include/Quaternion_inline.h:165-168)
 * Returns the squared quaternion length with float32 arithmetic.
 * @param {Float32Array} q Quaternion.
 * @returns {number} Squared length.
 */
function lengthSq(q)
{
    return dot(q, q);
}

/**
 * Carbon: Length (math/include/Quaternion_inline.h:171-174)
 * Returns the float32 square root of the float32 squared length.
 * @param {Float32Array} q Quaternion.
 * @returns {number} Length.
 */
function length(q)
{
    return Math.fround(Math.sqrt(lengthSq(q)));
}

/**
 * Carbon: Normalize (math/include/Quaternion_inline.h:177-181)
 * Scales by the float32 reciprocal length; a zero quaternion yields NaNs.
 * @param {Float32Array} out Receiving quaternion; may overlap q.
 * @param {Float32Array} q Quaternion.
 * @returns {Float32Array} out
 */
function normalize(out, q)
{
    const f = Math.fround;
    const x = q[0], y = q[1], z = q[2], w = q[3];
    const l = f(1 / length(q));
    out[0] = f(x * l);
    out[1] = f(y * l);
    out[2] = f(z * l);
    out[3] = f(w * l);
    return out;
}

/**
 * Carbon: Inverse (math/include/Quaternion_inline.h:184-188)
 * Scales the conjugate by the float32 reciprocal squared length.
 * @param {Float32Array} out Receiving quaternion; may overlap q.
 * @param {Float32Array} q Quaternion.
 * @returns {Float32Array} out
 */
function inverse(out, q)
{
    const f = Math.fround;
    const x = q[0], y = q[1], z = q[2], w = q[3];
    const l = f(1 / lengthSq(q));
    out[0] = f(-x * l);
    out[1] = f(-y * l);
    out[2] = f(-z * l);
    out[3] = f(w * l);
    return out;
}

/**
 * Carbon: Quaternion::operator*= (math/include/Quaternion_inline.h:73-80)
 * Converts the scalar to float and scales cached components.
 * @param {Float32Array} out Receiving value; may overlap a.
 * @param {Float32Array} a Input value.
 * @param {number} scalar Native float scalar.
 * @returns {Float32Array} out
 */
function scale(out, a, scalar)
{
    const f = Math.fround;
    const factor = f(scalar);
    const a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3];
    out[0] = f(a0 * factor);
    out[1] = f(a1 * factor);
    out[2] = f(a2 * factor);
    out[3] = f(a3 * factor);
    return out;
}

/**
 * Carbon: Quaternion::operator/= (math/include/Quaternion_inline.h:83-91)
 * Rounds the native float reciprocal before scaling components.
 * @param {Float32Array} out Receiving value; may overlap a.
 * @param {Float32Array} a Input value.
 * @param {number} divisor Native float divisor.
 * @returns {Float32Array} out
 */
function divide(out, a, divisor)
{
    const f = Math.fround;
    return scale(out, a, f(1 / f(divisor)));
}
