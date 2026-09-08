// Carbon Vector2, ported literally from e:\carbonengine\math (Vector2.h / Vector2_inline.h).
// Storage is a plain Float32Array [x, y]. Scalar locals that Carbon holds in a
// `float` are rounded with Math.fround so numerics match Carbon's float32 arithmetic;
// component stores round via the Float32Array itself.
// Deliberate drops: XMVECTOR interop (Vector2_inline.h:19,:25) has no JS analogue;
// operator[] (:31,:37) is native indexing; compound assignment operators are covered
// by passing `out === a`; operator!= (:146) is !exactEquals; the free
// `float * Vector2` (:152) is `scale`.

const f32 = Math.fround;

/**
 * Carbon Vector2
 * @typedef {Float32Array} vector2
 */
export const vector2 = {};

/** Creates a zeroed vector2 */
vector2.create = function ()
{
    return new Float32Array(2);
}; // Vector2_inline.h:5

/** Creates a vector2 from values */
vector2.fromValues = function (x, y)
{
    const out = new Float32Array(2);
    out[0] = x;
    out[1] = y;
    return out;
}; // Vector2_inline.h:12

/** Copies a vector2 */
vector2.copy = function (out, a)
{
    out[0] = a[0];
    out[1] = a[1];
    return out;
}; // Vector2_inline.h:92

/** Adds two vector2s component-wise */
vector2.add = function (out, a, b)
{
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    return out;
}; // Vector2_inline.h:104

/** Subtracts vector2 b from vector2 a component-wise */
vector2.subtract = function (out, a, b)
{
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    return out;
}; // Vector2_inline.h:110

/** Multiplies two vector2s component-wise */
vector2.multiply = function (out, a, b)
{
    out[0] = a[0] * b[0];
    out[1] = a[1] * b[1];
    return out;
}; // Vector2_inline.h:116

/** Divides vector2 a by vector2 b component-wise */
vector2.divide = function (out, a, b)
{
    out[0] = a[0] / b[0];
    out[1] = a[1] / b[1];
    return out;
}; // Vector2_inline.h:122

/** Scales a vector2 by a scalar */
vector2.scale = function (out, a, f)
{
    const s = f32(f);
    out[0] = a[0] * s;
    out[1] = a[1] * s;
    return out;
}; // Vector2_inline.h:128

/** Divides a vector2 by a scalar (Carbon multiplies by the float reciprocal) */
vector2.divideScalar = function (out, a, f)
{
    const fDiv = f32(1 / f32(f));
    out[0] = a[0] * fDiv;
    out[1] = a[1] * fDiv;
    return out;
}; // Vector2_inline.h:134 (reciprocal per :83)

/** Negates a vector2 */
vector2.negate = function (out, a)
{
    out[0] = -a[0];
    out[1] = -a[1];
    return out;
}; // Vector2_inline.h:98

/** Compares two vector2s for exact equality */
vector2.exactEquals = function (a, b)
{
    return a[0] === b[0] && a[1] === b[1];
}; // Vector2_inline.h:140

/** Returns the length of a vector2 */
vector2.length = function (a)
{
    return f32(Math.sqrt(a[0] * a[0] + a[1] * a[1]));
}; // Vector2_inline.h:158

/** Normalizes a vector2 (zero-length input yields zero) */
vector2.normalize = function (out, a)
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
}; // Vector2_inline.h:164
