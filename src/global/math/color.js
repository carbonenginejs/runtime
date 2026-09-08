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

const f32 = Math.fround;

export const color = {};

/**
 * Creates a color, zeroed INCLUDING alpha - Carbon's default constructor is
 * transparent black (Color_inline.h:6-12), not the opaque black that
 * `vec4.createLinear` gives.
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

export const {
    create,
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
    saturate
} = color;
