// Carbon Float_16 and packed half vectors, ported literally from e:\carbonengine\math
// (Float16.h / Float16_inline.h / src\Float16.cpp). Carbon's conversion is a branch
// conversion (no bit tables). Carbon quirks preserved deliberately:
// only 0x7fff/0xffff decode as NaN (0x7c00 decodes to 65536, not Infinity), and
// values in [65520, 131072) encode with exponent 31 rather than clamping to INF.
// Halves are JS numbers holding uint16 bit patterns; packed vectors are Uint16Arrays.
// One divergence forced by JS: the sign bit of a NaN input is not observable, so a
// negative NaN encodes as 0x7fff instead of 0xffff (Carbon reads the sign via copysign).

const f32 = Math.fround;

/**
 * Carbon Float_16
 * @typedef {number} float16
 */
export const float16 = {};

/** Converts a float32 to Carbon's 16-bit half representation (uint16) */
float16.float32To16 = function (value)
{
    const inF = f32(value);
    const sign = (inF < 0 || Object.is(inF, -0)) ? 1 : 0;
    let tmp = Math.abs(inF);
    let exp = 0;

    /* Deal with special numbers */
    if (inF === Infinity || inF === -Infinity)
    {
        return sign ? 0xffff : 0x7fff;
    }
    if (Number.isNaN(inF))
    {
        return sign ? 0xffff : 0x7fff;
    }
    if (inF === 0)
    {
        return sign ? 0x8000 : 0x0000;
    }

    if (tmp < 1024)
    {
        do
        {
            tmp *= 2;
            exp--;
        } while (tmp < 1024);
    }
    else if (tmp >= 2048)
    {
        do
        {
            tmp /= 2;
            exp++;
        } while (tmp >= 2048);
    }

    exp += 10; /* Normalize the mantissa */
    exp += 15; /* Exponent is encoded with excess 15 */

    const origexp = exp;

    let mantissa = Math.floor(tmp);
    if ((tmp - mantissa === 0.5 && mantissa % 2 === 1) || /* round half to even */
        (tmp - mantissa > 0.5))
    {
        mantissa++; /* round to nearest, away from zero */
    }
    if (mantissa === 2048)
    {
        mantissa = 1024;
        exp++;
    }

    let ret;
    if (exp > 31)
    {
        /* too big */
        ret = 0x7fff; /* INF */
    }
    else if (exp <= 0)
    {
        /* Denormalized half float */

        /* return 0x0000 (=0.0) for numbers too small to represent in half floats */
        if (exp < -11)
        {
            return sign ? 0x8000 : 0x0000;
        }
        exp = origexp;

        /* the 13 extra bits from single precision are used for rounding */
        mantissa = Math.floor(tmp * 8192);
        mantissa = mantissa >>> (1 - exp); /* denormalize */

        mantissa -= ~(mantissa >>> 13) & 1; /* round half to even */
        /* remove 13 least significant bits to get half float precision */
        mantissa = mantissa >>> 12;
        const rounding = mantissa & 1;
        mantissa = mantissa >>> 1;

        ret = mantissa + rounding;
    }
    else
    {
        ret = (exp << 10) | (mantissa & 0x3ff);
    }

    ret |= sign << 15; /* Add the sign */
    return ret >>> 0;
}; // Float16.cpp:83

/** Converts Carbon's 16-bit half representation (uint16) to a float32 number */
float16.float16To32 = function (value)
{
    const u = value & 0xffff;
    const s = u & 0x8000;
    const e = (u & 0x7c00) >>> 10;
    const m = u & 0x3ff;
    const sgn = s ? -1 : 1;

    if ((u & ~0x8000 & 0xffff) === 0x7fff)
    {
        return NaN;
    }

    if (e === 0)
    {
        if (m === 0)
        {
            return sgn * 0; /* +0.0 or -0.0 */
        }
        return f32(sgn * Math.pow(2, -14) * (m / 1024));
    }
    return f32(sgn * Math.pow(2, e - 15) * (1 + m / 1024));
}; // Float16.cpp:179

/** Compares two halves for exact bit equality */
float16.exactEquals = function (a, b)
{
    return (a & 0xffff) === (b & 0xffff);
}; // Float16_inline.h:38

/**
 * Carbon Vector2_16, two packed halves
 * @typedef {Uint16Array} vector2_16
 */
export const vector2_16 = {};

/** Creates a zeroed vector2_16 */
vector2_16.create = function ()
{
    return new Uint16Array(2);
}; // Float16_inline.h:50

/** Sets a vector2_16 from float values */
vector2_16.set = function (out, x, y)
{
    out[0] = float16.float32To16(x);
    out[1] = float16.float32To16(y);
    return out;
}; // Float16_inline.h:55

/** Sets a vector2_16 from a vector2 */
vector2_16.fromVector2 = function (out, v)
{
    return vector2_16.set(out, v[0], v[1]);
}; // Float16_inline.h:69

/** Decodes a vector2_16 into a vector2 (Float32Array(2)) */
vector2_16.toVector2 = function (out, a)
{
    out[0] = float16.float16To32(a[0]);
    out[1] = float16.float16To32(a[1]);
    return out;
}; // Float16_inline.h:76

/**
 * Carbon Vector3_16, three packed halves
 * @typedef {Uint16Array} vector3_16
 */
export const vector3_16 = {};

/** Creates a zeroed vector3_16 */
vector3_16.create = function ()
{
    return new Uint16Array(3);
}; // Float16_inline.h:82

/** Sets a vector3_16 from float values */
vector3_16.set = function (out, x, y, z)
{
    out[0] = float16.float32To16(x);
    out[1] = float16.float32To16(y);
    out[2] = float16.float32To16(z);
    return out;
}; // Float16_inline.h:95

/** Sets a vector3_16 from a vector3 */
vector3_16.fromVector3 = function (out, v)
{
    return vector3_16.set(out, v[0], v[1], v[2]);
}; // Float16_inline.h:103

/** Decodes a vector3_16 into a vector3 (Float32Array(3)) */
vector3_16.toVector3 = function (out, a)
{
    out[0] = float16.float16To32(a[0]);
    out[1] = float16.float16To32(a[1]);
    out[2] = float16.float16To32(a[2]);
    return out;
}; // Float16_inline.h:111

/**
 * Carbon Vector4_16, four packed halves
 * @typedef {Uint16Array} vector4_16
 */
export const vector4_16 = {};

/** Creates a zeroed vector4_16 */
vector4_16.create = function ()
{
    return new Uint16Array(4);
}; // Float16_inline.h:117

/** Sets a vector4_16 from float values */
vector4_16.set = function (out, x, y, z, w)
{
    out[0] = float16.float32To16(x);
    out[1] = float16.float32To16(y);
    out[2] = float16.float32To16(z);
    out[3] = float16.float32To16(w);
    return out;
}; // Float16_inline.h:131

/** Sets a vector4_16 from a vector4 */
vector4_16.fromVector4 = function (out, v)
{
    return vector4_16.set(out, v[0], v[1], v[2], v[3]);
}; // Float16_inline.h:140

/** Decodes a vector4_16 into a vector4 (Float32Array(4)) */
vector4_16.toVector4 = function (out, a)
{
    out[0] = float16.float16To32(a[0]);
    out[1] = float16.float16To32(a[1]);
    out[2] = float16.float16To32(a[2]);
    out[3] = float16.float16To32(a[3]);
    return out;
}; // Float16_inline.h:149
