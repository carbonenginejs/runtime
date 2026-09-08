// Source: math/include/Color.h + Color_inline.h (e:\carbonengine)
//
// Carbon's Color - the ONE color type it has: four floats r, g, b, a. There
// is no Color3 anywhere in Carbon's math; rgb data converts at the edges.
// A color here IS a vec4-shaped array (Float32Array(4) by default), so vec4
// functions interoperate freely - Carbon's operator Vector4 is an identity
// in this representation and is not ported as a function.
//
// Everything in this namespace is componentwise, so none of the row-vector /
// column-vector operand-order hazards of matrix work apply; bodies port from
// the donor in source order.
import * as glVec4 from "gl-matrix/esm/vec4.js";
import { num } from "./num.js";

const f32 = Math.fround;

export const color = {};

/**
 * Creates a color, zeroed INCLUDING alpha - Carbon's default constructor is
 * transparent black (Color_inline.h:6-12), not the opaque black that
 * `color.createLinear` gives.
 * @returns {color}
 */
color.create = function()
{
    return new Float32Array(4);
};

/**
 * Creates a color from components (Color_inline.h:33-40).
 * @param {Number} r
 * @param {Number} g
 * @param {Number} b
 * @param {Number} a
 * @returns {color}
 */
color.fromValues = glVec4.fromValues;

/**
 * Creates an opaque-black linear color (0, 0, 0, 1) - the schema default for
 * color-kind fields. Not a Carbon constructor (Carbon defaults transparent,
 * see `create`); this is the runtime's field-initializer helper, formerly
 * `vec4.createLinear`.
 * @returns {color}
 */
color.createLinear = function()
{
    const out = new Float32Array(4);
    out[3] = 1;
    return out;
};

/**
 * Copies a color.
 * @param {color} out
 * @param {color} a
 * @returns {color} out
 */
color.copy = glVec4.copy;

/**
 * Sets a color's components.
 * @param {color} out
 * @param {Number} r
 * @param {Number} g
 * @param {Number} b
 * @param {Number} a
 * @returns {color} out
 */
color.set = glVec4.set;

/**
 * Decodes a packed ARGB word - Carbon Color(uint32_t)
 * (Color_inline.h:15-22): a in bits 24-31, r in 16-23, g in 8-15, b in 0-7,
 * each byte scaled by 1/255.
 * @param {color} out
 * @param {Number} argb
 * @returns {color} out
 */
color.fromARGB = function(out, argb)
{
    const f = 1 / 255;
    out[0] = f * ((argb >>> 16) & 0xff);
    out[1] = f * ((argb >>> 8) & 0xff);
    out[2] = f * (argb & 0xff);
    out[3] = f * ((argb >>> 24) & 0xff);
    return out;
};

/**
 * Encodes to a packed ARGB word - Carbon operator uint32_t
 * (Color_inline.h:43-52): each channel clamped to [0,1] then scaled by 255
 * with +0.5 rounding.
 * @param {color} a
 * @returns {Number} The ARGB word, unsigned.
 */
color.toARGB = function(a)
{
    const byte = value => value >= 1 ? 0xff : value <= 0 ? 0x00 : (value * 255 + 0.5) | 0;
    return ((byte(a[3]) << 24) | (byte(a[0]) << 16) | (byte(a[1]) << 8) | byte(a[2])) >>> 0;
};

/**
 * Adds two colors, alpha included (Color_inline.h:110-113).
 * @param {color} out
 * @param {color} a
 * @param {color} b
 * @returns {color} out
 */
color.add = glVec4.add;

/**
 * Subtracts a color from another, alpha included (Color_inline.h:116-119).
 * @param {color} out
 * @param {color} a
 * @param {color} b
 * @returns {color} out
 */
color.subtract = glVec4.subtract;

/**
 * Scales a color by a scalar, alpha included (Color_inline.h:122-125).
 * @param {color} out
 * @param {color} a
 * @param {Number} s
 * @returns {color} out
 */
color.scale = glVec4.scale;

/**
 * Negates a color - Carbon's unary minus (Color_inline.h:104-107).
 * @param {color} out
 * @param {color} a
 * @returns {color} out
 */
color.negate = glVec4.negate;

/**
 * Whether two colors are bit-exactly equal - Carbon's operator== compares
 * exactly (Color_inline.h:133-136), so this is gl-matrix's exactEquals, not
 * its epsilon compare.
 * @param {color} a
 * @param {color} b
 * @returns {Boolean}
 */
color.exactEquals = glVec4.exactEquals;

/**
 * Lerps between two colors, alpha included - Carbon's free Lerp
 * (Color_inline.h:152-155): v1 + (v2 - v1) * s.
 * @param {color} out
 * @param {color} a
 * @param {color} b
 * @param {Number} s
 * @returns {color} out
 */
color.lerp = glVec4.lerp;

/**
 * Adjusts a color's saturation - Carbon's free Saturate
 * (Color_inline.h:158-169): lerp from perceived-intensity grey toward the
 * color by max(0, saturation), alpha untouched. A grey-to-color blend, NOT
 * the HLSL clamp; saturation 1 is a plain copy. The intensity weights are
 * Carbon's own eye-response constants and the arithmetic keeps float32
 * rounding.
 * @param {color} out
 * @param {color} a
 * @param {Number} saturation
 * @returns {color} out
 */
color.saturate = function(out, a, saturation)
{
    const s = f32(saturation);
    const r = a[0], g = a[1], b = a[2], alpha = a[3];

    if (s === 1)
    {
        out[0] = r; out[1] = g; out[2] = b; out[3] = alpha;
        return out;
    }

    const i = f32(f32(f32(r * f32(0.299)) + f32(g * f32(0.587))) + f32(b * f32(0.114)));
    const t = Math.max(0, s);
    out[0] = i + f32(f32(r - i) * t);
    out[1] = i + f32(f32(g - i) * t);
    out[2] = i + f32(f32(b - i) * t);
    out[3] = alpha;
    return out;
};

/**
 * Converts from linear color to rgba
 * @param {color} out
 * @param {color} linear
 * @param {boolean} [denormalizeAlpha]
 * @returns {color} out
 */
color.toRGBA = function(out, linear, denormalizeAlpha)
{
    out[0] = num.colorFromLinear(linear[0]);
    out[1] = num.colorFromLinear(linear[1]);
    out[2] = num.colorFromLinear(linear[2]);
    out[3] = denormalizeAlpha ? num.colorFromLinear(linear[3]) : linear[3];
    return out;
};

/**
 * Converts to linear color from rgba
 * @param {color} out
 * @param {color} rgba
 * @param {boolean} [denormalizedAlpha]
 * @returns {color} out
 */
color.fromRGBA = function(out, rgba, denormalizedAlpha)
{
    out[0] = num.linearFromColor(rgba[0]);
    out[1] = num.linearFromColor(rgba[1]);
    out[2] = num.linearFromColor(rgba[2]);
    out[3] = denormalizedAlpha ? num.linearFromColor(rgba[3]) : rgba[3];
    return out;
};

/**
 * Converts to linear color from rgb - the edge converter for 3-component
 * data; Carbon has no rgb color type, so rgb converts here and stays rgba.
 * @param {color} out
 * @param {vec3|Array} rgb
 * @param {Number} [linearAlpha=1]
 * @returns {color} out
 */
color.fromRGB = function(out, rgb, linearAlpha = 1)
{
    out[0] = num.linearFromColor(rgb[0]);
    out[1] = num.linearFromColor(rgb[1]);
    out[2] = num.linearFromColor(rgb[2]);
    out[3] = linearAlpha;
    return out;
};

/**
 * Gets hex value with alpha from linear color
 * @param {color} linear
 * @returns {String} hex value
 */
color.toHexA = function(linear)
{
    return "#" +
        num.hexFromLinear(linear[0]) +
        num.hexFromLinear(linear[1]) +
        num.hexFromLinear(linear[2]) +
        num.hexFromLinear(linear[3]);
};

/**
 * Gets hex value from linear color
 * @param {color} linear
 * @returns {String} hex value
 */
color.toHex = function(linear)
{
    return "#" +
        num.hexFromLinear(linear[0]) +
        num.hexFromLinear(linear[1]) +
        num.hexFromLinear(linear[2]);
};

/**
 * Gets linear color from hex or hex with alpha
 * @param {color} out
 * @param {String} hex
 * @param {Number} [defaultAlpha=1]
 * @returns {color} out
 */
color.fromHex = function(out, hex, defaultAlpha = 1)
{
    // Set empty color in case of error
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = defaultAlpha;

    if (typeof hex !== "string" || !/^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(hex))
    {
        throw new TypeError("Invalid hex");
    }

    // Short rgb/rgba hex
    if (hex.length === 4 || hex.length === 5)
    {
        out[0] = ("0x" + hex[1] + hex[1]) / 255;
        out[1] = ("0x" + hex[2] + hex[2]) / 255;
        out[2] = ("0x" + hex[3] + hex[3]) / 255;
        if (hex.length === 5) out[3] = ("0x" + hex[4] + hex[4]) / 255;
    }
    // Full rgb/rgba hex
    else if (hex.length === 7 || hex.length === 9)
    {
        out[0] = ("0x" + hex[1] + hex[2]) / 255;
        out[1] = ("0x" + hex[3] + hex[4]) / 255;
        out[2] = ("0x" + hex[5] + hex[6]) / 255;
        if (hex.length === 9) out[3] = ("0x" + hex[7] + hex[8]) / 255;
    }
    return out;
};

/**
 * Converts srgb rgb channels to linear - writes ONLY [0..2], leaving alpha
 * untouched, so it works in place on a color or on bare rgb data.
 * @param {color|vec3} out
 * @param {color|vec3} srgb
 * @returns {color|vec3} out
 */
color.linearFromSRGB = function(out, srgb)
{
    out[0] = num.linearFromSRGB(srgb[0]);
    out[1] = num.linearFromSRGB(srgb[1]);
    out[2] = num.linearFromSRGB(srgb[2]);
    return out;
};

/**
 * Converts linear rgb channels to srgb - writes ONLY [0..2], leaving alpha
 * untouched.
 * @param {color|vec3} out
 * @param {color|vec3} linear
 * @returns {color|vec3} out
 */
color.srgbFromLinear = function(out, linear)
{
    out[0] = num.srgbFromLinear(linear[0]);
    out[1] = num.srgbFromLinear(linear[1]);
    out[2] = num.srgbFromLinear(linear[2]);
    return out;
};

/**
 * Converts rgb channels from linear to Carbon gamma 2.2 - writes ONLY
 * [0..2], leaving alpha untouched.
 * @param {color|vec3} out
 * @param {color|vec3} linear
 * @returns {color|vec3} out
 */
color.linearToGamma = function(out, linear)
{
    out[0] = num.linearToGamma(linear[0]);
    out[1] = num.linearToGamma(linear[1]);
    out[2] = num.linearToGamma(linear[2]);
    return out;
};

/**
 * Converts rgb channels from Carbon gamma 2.2 to linear - writes ONLY
 * [0..2], leaving alpha untouched.
 * @param {color|vec3} out
 * @param {color|vec3} gamma
 * @returns {color|vec3} out
 */
color.gammaToLinear = function(out, gamma)
{
    out[0] = num.gammaToLinear(gamma[0]);
    out[1] = num.gammaToLinear(gamma[1]);
    out[2] = num.gammaToLinear(gamma[2]);
    return out;
};

/**
 * Converts linear rgb channels to HSV - out is 3-component: hue in degrees
 * (rounded), saturation and value as rounded percentages. UI helper, not a
 * Carbon function.
 * @param {vec3} out
 * @param {color|vec3} linear
 * @returns {vec3} out
 */
color.toHSV = function(out, linear)
{
    const rabs = linear[0], gabs = linear[1], babs = linear[2];

    const v = Math.max(rabs, gabs, babs);
    const diff = v - Math.min(rabs, gabs, babs);
    const diffc = c => (v - c) / 6 / diff + 1 / 2;
    const percentRound = value => Math.round(value * 100) / 100;

    let h, s;
    if (diff === 0)
    {
        h = s = 0;
    }
    else
    {
        s = diff / v;
        const rr = diffc(rabs);
        const gg = diffc(gabs);
        const bb = diffc(babs);

        if (rabs === v) h = bb - gg;
        else if (gabs === v) h = (1 / 3) + rr - bb;
        else h = (2 / 3) + gg - rr;

        if (h < 0) h += 1;
        else if (h > 1) h -= 1;
    }

    out[0] = Math.round(h * 360);
    out[1] = percentRound(s * 100);
    out[2] = percentRound(v * 100);
    return out;
};

export const {
    create,
    createLinear,
    fromValues,
    copy,
    set,
    fromARGB,
    toARGB,
    add,
    subtract,
    scale,
    negate,
    exactEquals,
    lerp,
    saturate,
    toRGBA,
    fromRGBA,
    fromRGB,
    toHexA,
    toHex,
    fromHex,
    linearFromSRGB,
    srgbFromLinear,
    linearToGamma,
    gammaToLinear,
    toHSV
} = color;
