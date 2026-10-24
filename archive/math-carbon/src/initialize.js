// JavaScript addition: the approved initialization-time precision selection.
// Carbon supplies the operations; the host owns this once-per-module-instance choice.
import { matrix } from "./matrix.js";
import { quaternion } from "./quaternion.js";
import { vector2 } from "./vector2.js";
import { vector3 } from "./vector3.js";
import { vector4 } from "./vector4.js";
import { plane } from "./plane.js";
import { sphere } from "./sphere.js";
import { axisAlignedBox } from "./axisAlignedBox.js";
import { axisAlignedEllipsoid } from "./axisAlignedEllipsoid.js";
import { ray } from "./ray.js";
import { color } from "./color.js";
import { float16, vector2_16, vector3_16, vector4_16 } from "./float16.js";

let initialized;

/**
 * Selects the archived math API once per module instance, before consumer arithmetic.
 * JavaScript addition: repeated identical selection returns the same frozen API.
 * Float32 selection is unavailable until the complete native-math backend is verified;
 * failure leaves initialization untouched and never substitutes double arithmetic.
 * All value APIs retain their documented Float32Array/Uint16Array storage contracts.
 * @param {{precision?: "double"|"float32"}} [options={}] Initialization options.
 * @returns {Readonly<object>} Frozen API with direct, unwrapped function tables.
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
    initialized = Object.freeze({
        precision, matrix, quaternion, vector2, vector3, vector4, plane, sphere,
        axisAlignedBox, axisAlignedEllipsoid, ray, color, float16, vector2_16, vector3_16, vector4_16
    });
    return initialized;
}
