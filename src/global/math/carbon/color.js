// Carbon Color, ported literally from e:\carbonengine\math (Color.h / Color_inline.h;
// src\Color.cpp holds no definitions). Storage is a plain Float32Array [r, g, b, a].
// The uint32 pack order is ARGB: (a << 24) | (r << 16) | (g << 8) | b.
// Scalar locals that Carbon holds in a `float` are rounded with Math.fround;
// component stores round via the Float32Array itself.
// Deliberate drops: compound assignment operators are covered by passing `out === a`;
// operator!= (:143) is !exactEquals; the free `float * Color` (:149) is `scale`;
// operator Vector4 (:54) / Color(const Vector4&) (:25) are `copy` between the two
// identically-shaped Float32Array(4) layouts, so no dedicated converters are needed.

const f32 = Math.fround;

/**
 * Carbon Color
 * @typedef {Float32Array} color
 */
export const color = {};

/** Creates a zeroed color */
color.create = function ()
{
    return new Float32Array(4);
}; // Color_inline.h:6

/** Creates a color from values */
color.fromValues = function (r, g, b, a)
{
    const out = new Float32Array(4);
    out[0] = r;
    out[1] = g;
    out[2] = b;
    out[3] = a;
    return out;
}; // Color_inline.h:34

/** Sets a color from a packed ARGB uint32 */
color.fromUint32 = function (out, dw)
{
    const f = f32(1 / 255);
    out[0] = f * ((dw >>> 16) & 0xff);
    out[1] = f * ((dw >>> 8) & 0xff);
    out[2] = f * (dw & 0xff);
    out[3] = f * ((dw >>> 24) & 0xff);
    return out;
}; // Color_inline.h:15

/** Packs a color into an ARGB uint32 with Carbon's clamp and +0.5 rounding */
color.toUint32 = function (a)
{
    const r = a[0], g = a[1], b = a[2], al = a[3];
    const dwR = r >= 1 ? 0xff : r <= 0 ? 0x00 : f32(f32(r * 255) + 0.5) | 0;
    const dwG = g >= 1 ? 0xff : g <= 0 ? 0x00 : f32(f32(g * 255) + 0.5) | 0;
    const dwB = b >= 1 ? 0xff : b <= 0 ? 0x00 : f32(f32(b * 255) + 0.5) | 0;
    const dwA = al >= 1 ? 0xff : al <= 0 ? 0x00 : f32(f32(al * 255) + 0.5) | 0;
    return ((dwA << 24) | (dwR << 16) | (dwG << 8) | dwB) >>> 0;
}; // Color_inline.h:43

/** Copies a color (also serves Color<->Vector4 conversion, both are Float32Array(4)) */
color.copy = function (out, a)
{
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    return out;
}; // Color_inline.h:101 (and :25, :54)

/** Adds two colors component-wise */
color.add = function (out, a, b)
{
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    out[3] = a[3] + b[3];
    return out;
}; // Color_inline.h:113

/** Subtracts color b from color a component-wise */
color.subtract = function (out, a, b)
{
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    out[3] = a[3] - b[3];
    return out;
}; // Color_inline.h:119

/** Scales a color by a scalar */
color.scale = function (out, a, f)
{
    const s = f32(f);
    out[0] = a[0] * s;
    out[1] = a[1] * s;
    out[2] = a[2] * s;
    out[3] = a[3] * s;
    return out;
}; // Color_inline.h:125

/** Divides a color by a scalar (Carbon multiplies by the float reciprocal) */
color.divideScalar = function (out, a, f)
{
    const scale = f32(1 / f32(f));
    out[0] = a[0] * scale;
    out[1] = a[1] * scale;
    out[2] = a[2] * scale;
    out[3] = a[3] * scale;
    return out;
}; // Color_inline.h:131 (reciprocal per :90)

/** Negates a color */
color.negate = function (out, a)
{
    out[0] = -a[0];
    out[1] = -a[1];
    out[2] = -a[2];
    out[3] = -a[3];
    return out;
}; // Color_inline.h:107

/** Compares two colors for exact equality */
color.exactEquals = function (a, b)
{
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}; // Color_inline.h:137

/** Linearly interpolates between two colors: v1 + (v2 - v1) * s */
color.lerp = function (out, a, b, s)
{
    const t = f32(s);
    const r = a[0], g = a[1], bl = a[2], al = a[3];
    out[0] = r + f32(f32(b[0] - r) * t);
    out[1] = g + f32(f32(b[1] - g) * t);
    out[2] = bl + f32(f32(b[2] - bl) * t);
    out[3] = al + f32(f32(b[3] - al) * t);
    return out;
}; // Color_inline.h:155

/** Saturates a color: lerp from perceived-intensity grey toward the color by max(0, saturation) */
color.saturate = function (out, a, saturation)
{
    const s = f32(saturation);
    if (s === 1)
    {
        return color.copy(out, a);
    }

    const r = a[0], g = a[1], b = a[2], al = a[3];
    // intensity (the magic numbers are values based on how strongly our eyes perceive each color)
    const i = f32(f32(f32(r * f32(0.299)) + f32(g * f32(0.587))) + f32(b * f32(0.114)));

    const t = Math.max(0, s);
    out[0] = i + f32(f32(r - i) * t);
    out[1] = i + f32(f32(g - i) * t);
    out[2] = i + f32(f32(b - i) * t);
    out[3] = al;
    return out;
}; // Color_inline.h:161
