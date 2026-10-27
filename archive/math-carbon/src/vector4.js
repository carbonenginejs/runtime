// Carbon Vector4, ported literally from math (Vector4.h / Vector4_inline.h).
// Storage is a plain Float32Array [x, y, z, w]. Scalar locals that Carbon holds in a
// `float` retain selected Math.fround boundaries; other intermediates use doubles.
// Float32Array stores alone do not establish native float arithmetic parity.
// Deliberate drops: XMVECTOR interop (Vector4_inline.h:33,:39) has no JS analogue;
// operator[] (:45,:51) is native indexing; compound assignment operators are covered
// by passing `out === a`; operator!= (:156) is !exactEquals; the free
// `float * Vector4` (:174) is `scale`.

const f32 = Math.fround;

/**
 * Carbon Vector4
 * @typedef {Float32Array} vector4
 */
export class Vector4
{
    /** Creates a zeroed vector4 */
    static create()
    {
        return new Float32Array(4);
    } // Vector4_inline.h:6

    /** Creates a vector4 from values */
    static fromValues(x, y, z, w)
    {
        const out = new Float32Array(4);
        out[0] = x;
        out[1] = y;
        out[2] = z;
        out[3] = w;
        return out;
    } // Vector4_inline.h:15

    /** Sets a vector4 from a vector3 and a w value */
    static fromVector3(out, xyz, w)
    {
        out[0] = xyz[0];
        out[1] = xyz[1];
        out[2] = xyz[2];
        out[3] = w;
        return out;
    } // Vector4_inline.h:24

    /** Copies a vector4 */
    static copy(out, a)
    {
        out[0] = a[0];
        out[1] = a[1];
        out[2] = a[2];
        out[3] = a[3];
        return out;
    } // Vector4_inline.h:108

    /** Adds two vector4s component-wise */
    static add(out, a, b)
    {
        out[0] = a[0] + b[0];
        out[1] = a[1] + b[1];
        out[2] = a[2] + b[2];
        out[3] = a[3] + b[3];
        return out;
    } // Vector4_inline.h:120

    /** Subtracts vector4 b from vector4 a component-wise */
    static subtract(out, a, b)
    {
        out[0] = a[0] - b[0];
        out[1] = a[1] - b[1];
        out[2] = a[2] - b[2];
        out[3] = a[3] - b[3];
        return out;
    } // Vector4_inline.h:126

    /** Multiplies two vector4s component-wise */
    static multiply(out, a, b)
    {
        out[0] = a[0] * b[0];
        out[1] = a[1] * b[1];
        out[2] = a[2] * b[2];
        out[3] = a[3] * b[3];
        return out;
    } // Vector4_inline.h:132

    /** Scales a vector4 by a scalar */
    static scale(out, a, f)
    {
        const s = f32(f);
        out[0] = a[0] * s;
        out[1] = a[1] * s;
        out[2] = a[2] * s;
        out[3] = a[3] * s;
        return out;
    } // Vector4_inline.h:138

    /** Divides a vector4 by a scalar (Carbon multiplies by the float reciprocal) */
    static divideScalar(out, a, f)
    {
        const fDiv = f32(1 / f32(f));
        out[0] = a[0] * fDiv;
        out[1] = a[1] * fDiv;
        out[2] = a[2] * fDiv;
        out[3] = a[3] * fDiv;
        return out;
    } // Vector4_inline.h:144 (reciprocal per :97)

    /** Negates a vector4 */
    static negate(out, a)
    {
        out[0] = -a[0];
        out[1] = -a[1];
        out[2] = -a[2];
        out[3] = -a[3];
        return out;
    } // Vector4_inline.h:114

    /** Compares two vector4s for exact equality */
    static exactEquals(a, b)
    {
        return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
    } // Vector4_inline.h:150

    /** Returns a live xyz subarray view of a vector4 (GetXYZ) */
    static $xyz(a)
    {
        return a.subarray(0, 3);
    } // Vector4_inline.h:162

    /** Returns the dot product of two vector4s */
    static dot(a, b)
    {
        return f32(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]);
    } // Vector4_inline.h:180

    /** Sets out to the 4D cross product of three vector4s */
    static cross(out, a, b, c)
    {
        const ax = a[0], ay = a[1], az = a[2], aw = a[3];
        const bx = b[0], by = b[1], bz = b[2], bw = b[3];
        const cx = c[0], cy = c[1], cz = c[2], cw = c[3];
        out[0] = ay * (bz * cw - cz * bw) - az * (by * cw - cy * bw) + aw * (by * cz - bz * cy);
        out[1] = -(ax * (bz * cw - cz * bw) - az * (bx * cw - cx * bw) + aw * (bx * cz - cx * bz));
        out[2] = ax * (by * cw - cy * bw) - ay * (bx * cw - cx * bw) + aw * (bx * cy - cx * by);
        out[3] = -(ax * (by * cz - cy * bz) - ay * (bx * cz - cx * bz) + az * (bx * cy - cx * by));
        return out;
    } // Vector4_inline.h:186
}
