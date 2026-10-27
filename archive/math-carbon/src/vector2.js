// Carbon Vector2, ported literally from math (Vector2.h / Vector2_inline.h).
// Storage is a plain Float32Array [x, y]. Scalar locals that Carbon holds in a
// `float` retain selected Math.fround boundaries; other intermediates use doubles.
// Float32Array stores alone do not establish native float arithmetic parity.
// Deliberate drops: XMVECTOR interop (Vector2_inline.h:19,:25) has no JS analogue;
// operator[] (:31,:37) is native indexing; compound assignment operators are covered
// by passing `out === a`; operator!= (:146) is !exactEquals; the free
// `float * Vector2` (:152) is `scale`.

const f32 = Math.fround;

/**
 * Carbon Vector2
 * @typedef {Float32Array} vector2
 */
export class Vector2
{
    /** Creates a zeroed vector2 */
    static create()
    {
        return new Float32Array(2);
    } // Vector2_inline.h:5

    /** Creates a vector2 from values */
    static fromValues(x, y)
    {
        const out = new Float32Array(2);
        out[0] = x;
        out[1] = y;
        return out;
    } // Vector2_inline.h:12

    /** Copies a vector2 */
    static copy(out, a)
    {
        out[0] = a[0];
        out[1] = a[1];
        return out;
    } // Vector2_inline.h:92

    /** Adds two vector2s component-wise */
    static add(out, a, b)
    {
        out[0] = a[0] + b[0];
        out[1] = a[1] + b[1];
        return out;
    } // Vector2_inline.h:104

    /** Subtracts vector2 b from vector2 a component-wise */
    static subtract(out, a, b)
    {
        out[0] = a[0] - b[0];
        out[1] = a[1] - b[1];
        return out;
    } // Vector2_inline.h:110

    /** Multiplies two vector2s component-wise */
    static multiply(out, a, b)
    {
        out[0] = a[0] * b[0];
        out[1] = a[1] * b[1];
        return out;
    } // Vector2_inline.h:116

    /** Divides vector2 a by vector2 b component-wise */
    static divide(out, a, b)
    {
        out[0] = a[0] / b[0];
        out[1] = a[1] / b[1];
        return out;
    } // Vector2_inline.h:122

    /** Scales a vector2 by a scalar */
    static scale(out, a, f)
    {
        const s = f32(f);
        out[0] = a[0] * s;
        out[1] = a[1] * s;
        return out;
    } // Vector2_inline.h:128

    /** Divides a vector2 by a scalar (Carbon multiplies by the float reciprocal) */
    static divideScalar(out, a, f)
    {
        const fDiv = f32(1 / f32(f));
        out[0] = a[0] * fDiv;
        out[1] = a[1] * fDiv;
        return out;
    } // Vector2_inline.h:134 (reciprocal per :83)

    /** Negates a vector2 */
    static negate(out, a)
    {
        out[0] = -a[0];
        out[1] = -a[1];
        return out;
    } // Vector2_inline.h:98

    /** Compares two vector2s for exact equality */
    static exactEquals(a, b)
    {
        return a[0] === b[0] && a[1] === b[1];
    } // Vector2_inline.h:140

    /** Returns the length of a vector2 */
    static length(a)
    {
        return f32(Math.sqrt(a[0] * a[0] + a[1] * a[1]));
    } // Vector2_inline.h:158

    /** Normalizes a vector2 (zero-length input yields zero) */
    static normalize(out, a)
    {
        const x = a[0], y = a[1];
        let length = f32(Math.sqrt(x * x + y * y));
        if (length)
        {
            length = f32(1 / length);
        }
        out[0] = x * length;
        out[1] = y * length;
        return out;
    } // Vector2_inline.h:164
}
