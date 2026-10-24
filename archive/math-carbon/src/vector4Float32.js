// Source: math/include/Vector4_inline.h
/** Internal float32 Vector4 kernels, pending complete precision-table selection. */
export const vector4Float32 = { dot, cross };

/**
 * Carbon: Dot (math/include/Vector4_inline.h:180-183)
 * Returns the dot product with float32 products and sums.
 * @param {Float32Array} a First vector.
 * @param {Float32Array} b Second vector.
 * @returns {number} Dot product.
 */
function dot(a, b)
{
    const f = Math.fround;
    return f(f(f(f(a[0] * b[0]) + f(a[1] * b[1])) + f(a[2] * b[2])) + f(a[3] * b[3]));
}

/**
 * Carbon: Cross (math/include/Vector4_inline.h:186-193)
 * Computes the triple cross product with donor expression association.
 * @param {Float32Array} out Receiving vector; may overlap any input.
 * @param {Float32Array} a First vector.
 * @param {Float32Array} b Second vector.
 * @param {Float32Array} c Third vector.
 * @returns {Float32Array} out
 */
function cross(out, a, b, c)
{
    const f = Math.fround;
    const ax = a[0], ay = a[1], az = a[2], aw = a[3];
    const bx = b[0], by = b[1], bz = b[2], bw = b[3];
    const cx = c[0], cy = c[1], cz = c[2], cw = c[3];
    out[0] = f(f(f(ay * f(f(bz * cw) - f(cz * bw))) - f(az * f(f(by * cw) - f(cy * bw)))) + f(aw * f(f(by * cz) - f(bz * cy))));
    out[1] = -(f(f(f(ax * f(f(bz * cw) - f(cz * bw))) - f(az * f(f(bx * cw) - f(cx * bw)))) + f(aw * f(f(bx * cz) - f(cx * bz)))));
    out[2] = f(f(f(ax * f(f(by * cw) - f(cy * bw))) - f(ay * f(f(bx * cw) - f(cx * bw)))) + f(aw * f(f(bx * cy) - f(cx * by))));
    out[3] = -(f(f(f(ax * f(f(by * cz) - f(cy * bz))) - f(ay * f(f(bx * cz) - f(cx * bz)))) + f(az * f(f(bx * cy) - f(cx * by)))));
    return out;
}

// Operation tables are immutable; numeric results and caller-owned outputs stay writable.
Object.freeze(vector4Float32);
