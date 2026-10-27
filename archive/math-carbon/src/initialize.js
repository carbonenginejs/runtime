// JavaScript addition: the approved initialization-time precision selection.
// Carbon supplies the operations; the host owns this once-per-module-instance choice.
import { Matrix } from "./matrix.js";
import { Quaternion } from "./quaternion.js";
import { Vector2 } from "./vector2.js";
import { Vector3 } from "./vector3.js";
import { Vector4 } from "./vector4.js";
import { Plane } from "./plane.js";
import { Sphere } from "./sphere.js";
import { AxisAlignedBox } from "./axisAlignedBox.js";
import { AxisAlignedEllipsoid } from "./axisAlignedEllipsoid.js";
import { Ray } from "./ray.js";
import { Color } from "./color.js";
import { Float_16, Vector2_16, Vector3_16, Vector4_16 } from "./float16.js";
import * as triMath from "./triMath.js";
import * as triUtil from "./triUtil.js";

let initialized;

/**
 * Selects the archived math API once per module instance, before consumer arithmetic.
 * JavaScript addition: repeated identical selection returns the same API.
 * Float32 selection is unavailable until the complete native-math backend is verified;
 * failure leaves initialization untouched and never substitutes double arithmetic.
 * All value APIs retain their documented Float32Array/Uint16Array storage contracts.
 * @param {{precision?: "double"|"float32"}} [options={}] Initialization options.
 * @returns {object} API holding the classes directly, unwrapped.
 * @throws {TypeError} For malformed options or an unknown precision.
 * @throws {Error} For conflicting initialization or an unavailable exact backend.
 */
export function initializeMath(options = {})
{
    if (options === null || typeof options !== "object" || Array.isArray(options))
    {
        throw new TypeError("Math initialization options must be an object.");
    }
    for (const key of Object.keys(options))
    {
        if (key !== "precision") throw new TypeError(`Unknown math initialization option: ${key}`);
    }
    const requestedPrecision = options.precision;
    const precision = requestedPrecision === undefined ? "double" : requestedPrecision;
    if (precision !== "double" && precision !== "float32")
    {
        throw new TypeError("Math precision must be 'double' or 'float32'.");
    }
    if (initialized)
    {
        if (precision !== initialized.precision)
        {
            throw new Error("Math precision is immutable after initialization.");
        }
        return initialized;
    }
    if (precision === "float32")
    {
        const error = new Error("Native-exact float32 math is unavailable: the complete CRT/DirectXMath backend has not been verified. No fallback was selected.");
        error.code = "CARBON_FLOAT32_UNAVAILABLE";
        throw error;
    }
    initialized = {
        precision, Matrix, Quaternion, Vector2, Vector3, Vector4, Plane, Sphere,
        AxisAlignedBox, AxisAlignedEllipsoid, Ray, Color, Float_16, Vector2_16, Vector3_16, Vector4_16,
        triMath, triUtil
    };
    return initialized;
}
