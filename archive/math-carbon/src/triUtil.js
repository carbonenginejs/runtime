// Carbon TriUtil gamma conversions, ported literally from trinity
// (trinity/trinity/TriUtil.h:49-201).
// TriUtil.h is a home for free functions, so this module is a camelCase namespace
// (`triUtil.triLinearToGamma`). Only its maths is here: NeverEndingSingleton, the
// D3DPERF macros, IsMatch and BlueGetNullValue are Blue/Trinity plumbing, not maths.
// Each conversion is a float pow per component (XMVectorPow); native transcendental
// parity is not certified (see the archive README).
// Carbon overloads both functions on float, Vector2, Vector3, Vector4 and Color, so they
// are split per rule 11. Vector4 and Color are both 4 floats and compute the same thing,
// so each __Color returns its __Vector4's call, and the bare names route without guessing.

const f32 = Math.fround;
const GAMMA_ENCODE = f32(0.454545);
const GAMMA_DECODE = f32(2.2);

/**
 * Carbon: TriLinearToGamma (TriUtil.h:58-125, five overloads)
 * Routes by an exact check: a number to triLinearToGamma__Float, otherwise by length
 * 2, 3 or 4 (Vector4 and Color are identical in JS); any other length throws.
 * @param {Float32Array} out - receives the result; ignored for a number
 * @param {number|Float32Array} value
 * @returns {number|Float32Array}
 */
export function triLinearToGamma(out, value)
{
    if (typeof value === "number")
    {
        return triLinearToGamma__Float(value);
    }
    switch (value.length)
    {
        case 2: return triLinearToGamma__Vector2(out, value);
        case 3: return triLinearToGamma__Vector3(out, value);
        case 4: return triLinearToGamma__Vector4(out, value);
    }
    throw new TypeError(`triLinearToGamma: no Carbon overload takes a ${value.length}-component value.`);
}

/**
 * Carbon: TriLinearToGamma( float value ) (TriUtil.h:58-61)
 * @param {number} value - linear
 * @returns {number} pow(value, 0.454545f), gamma 2.2
 */
export function triLinearToGamma__Float(value)
{
    return f32(Math.pow(f32(value), GAMMA_ENCODE));
} // TriUtil.h:58

/**
 * Carbon: TriLinearToGamma( const Vector2& value ) (TriUtil.h:72-75)
 * @param {Float32Array} out - may alias value
 * @param {Float32Array} value
 * @returns {Float32Array} out
 */
export function triLinearToGamma__Vector2(out, value)
{
    out[0] = Math.pow(value[0], GAMMA_ENCODE);
    out[1] = Math.pow(value[1], GAMMA_ENCODE);
    return out;
} // TriUtil.h:72

/**
 * Carbon: TriLinearToGamma( const Vector3& value ) (TriUtil.h:86-89)
 * @param {Float32Array} out - may alias value
 * @param {Float32Array} value
 * @returns {Float32Array} out
 */
export function triLinearToGamma__Vector3(out, value)
{
    out[0] = Math.pow(value[0], GAMMA_ENCODE);
    out[1] = Math.pow(value[1], GAMMA_ENCODE);
    out[2] = Math.pow(value[2], GAMMA_ENCODE);
    return out;
} // TriUtil.h:86

/**
 * Carbon: TriLinearToGamma( const Vector4& value ) (TriUtil.h:101-107)
 * Converts x, y and z; w is copied unchanged.
 * @param {Float32Array} out - may alias value
 * @param {Float32Array} value
 * @returns {Float32Array} out
 */
export function triLinearToGamma__Vector4(out, value)
{
    const w = value[3];
    out[0] = Math.pow(value[0], GAMMA_ENCODE);
    out[1] = Math.pow(value[1], GAMMA_ENCODE);
    out[2] = Math.pow(value[2], GAMMA_ENCODE);
    out[3] = w;
    return out;
} // TriUtil.h:101

/**
 * Carbon: TriLinearToGamma( const Color& value ) (TriUtil.h:119-125)
 * Converts r, g and b; alpha is copied unchanged. The same arithmetic as the Vector4
 * overload, so this returns triLinearToGamma__Vector4's call.
 * @param {Float32Array} out - may alias value
 * @param {Float32Array} value - Color [r, g, b, a]
 * @returns {Float32Array} out
 */
export function triLinearToGamma__Color(out, value)
{
    return triLinearToGamma__Vector4(out, value);
} // TriUtil.h:119

/**
 * Carbon: TriGammaToLinear (TriUtil.h:136-201, five overloads)
 * Routes as triLinearToGamma does.
 * @param {Float32Array} out - receives the result; ignored for a number
 * @param {number|Float32Array} value
 * @returns {number|Float32Array}
 */
export function triGammaToLinear(out, value)
{
    if (typeof value === "number")
    {
        return triGammaToLinear__Float(value);
    }
    switch (value.length)
    {
        case 2: return triGammaToLinear__Vector2(out, value);
        case 3: return triGammaToLinear__Vector3(out, value);
        case 4: return triGammaToLinear__Vector4(out, value);
    }
    throw new TypeError(`triGammaToLinear: no Carbon overload takes a ${value.length}-component value.`);
}

/**
 * Carbon: TriGammaToLinear( float value ) (TriUtil.h:136-139)
 * @param {number} value - gamma 2.2
 * @returns {number} pow(value, 2.2f), linear
 */
export function triGammaToLinear__Float(value)
{
    return f32(Math.pow(f32(value), GAMMA_DECODE));
} // TriUtil.h:136

/**
 * Carbon: TriGammaToLinear( const Vector2& value ) (TriUtil.h:150-153)
 * @param {Float32Array} out - may alias value
 * @param {Float32Array} value
 * @returns {Float32Array} out
 */
export function triGammaToLinear__Vector2(out, value)
{
    out[0] = Math.pow(value[0], GAMMA_DECODE);
    out[1] = Math.pow(value[1], GAMMA_DECODE);
    return out;
} // TriUtil.h:150

/**
 * Carbon: TriGammaToLinear( const Vector3& value ) (TriUtil.h:164-167)
 * @param {Float32Array} out - may alias value
 * @param {Float32Array} value
 * @returns {Float32Array} out
 */
export function triGammaToLinear__Vector3(out, value)
{
    out[0] = Math.pow(value[0], GAMMA_DECODE);
    out[1] = Math.pow(value[1], GAMMA_DECODE);
    out[2] = Math.pow(value[2], GAMMA_DECODE);
    return out;
} // TriUtil.h:164

/**
 * Carbon: TriGammaToLinear( const Vector4& value ) (TriUtil.h:179-184)
 * Converts x, y and z; w is copied unchanged.
 * @param {Float32Array} out - may alias value
 * @param {Float32Array} value
 * @returns {Float32Array} out
 */
export function triGammaToLinear__Vector4(out, value)
{
    const w = value[3];
    out[0] = Math.pow(value[0], GAMMA_DECODE);
    out[1] = Math.pow(value[1], GAMMA_DECODE);
    out[2] = Math.pow(value[2], GAMMA_DECODE);
    out[3] = w;
    return out;
} // TriUtil.h:179

/**
 * Carbon: TriGammaToLinear( const Color& value ) (TriUtil.h:196-201)
 * Converts r, g and b; alpha is copied unchanged. The same arithmetic as the Vector4
 * overload, so this returns triGammaToLinear__Vector4's call.
 * @param {Float32Array} out - may alias value
 * @param {Float32Array} value - Color [r, g, b, a]
 * @returns {Float32Array} out
 */
export function triGammaToLinear__Color(out, value)
{
    return triGammaToLinear__Vector4(out, value);
} // TriUtil.h:196
