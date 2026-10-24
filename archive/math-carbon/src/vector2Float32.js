// Source: math/include/Vector2_inline.h
/** Internal float32 Vector2 kernels, pending complete precision-table selection. */
export const vector2Float32 = { length, normalize };

/**
 * Carbon: Length (math/include/Vector2_inline.h:158-161)
 * Returns the float32 length, without an overflow guard.
 * @param {Float32Array} a Vector.
 * @returns {number} Length.
 */
function length(a)
{
    const f = Math.fround;
    return f(Math.sqrt(f(f(a[0] * a[0]) + f(a[1] * a[1]))));
}

/**
 * Carbon: Normalize (math/include/Vector2_inline.h:164-172)
 * Scales by reciprocal length; zero length retains zero components.
 * @param {Float32Array} out Receiving vector; may overlap a.
 * @param {Float32Array} a Vector.
 * @returns {Float32Array} out
 */
function normalize(out, a)
{
    const f = Math.fround;
    const x = a[0], y = a[1];
    let magnitude = length(a);
    if (magnitude !== 0) magnitude = f(1 / magnitude);
    out[0] = f(x * magnitude);
    out[1] = f(y * magnitude);
    return out;
}

// Operation tables are immutable; numeric results and caller-owned outputs stay writable.
Object.freeze(vector2Float32);
