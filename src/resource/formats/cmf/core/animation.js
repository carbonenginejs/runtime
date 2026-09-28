// CMF animation curve evaluation.
//
// Source: mesh/src/cmf/animation.cpp (FindKnotInterval :30-58, SampleCurve
// :140-158, SampleQuaternionCurve :203-226) and math/include/Quaternion_inline.h
// (Slerp :244-266).
//
// Carbon reads knots and values through typed element streams on every sample
// (GetKnotStream/GetValueStream, :120-137). Here a curve is decoded once to
// Float32 arrays, since the payload holds them as tagged byte arrays and a
// per-frame decode would dominate the cost; sampling then reads plain arrays.
import { decodeElementArray } from "./utils/vertex.js";

/**
 * Decodes a CMF animation curve's tagged byte arrays into plain Float32 knots
 * and values.
 *
 * @param {object} curve A CMF AnimationCurve: valueDimension, interpolation,
 *   knotType, valueType, knots, values.
 * @returns {{ dimension: number, interpolation: string, knots: Float32Array, values: Float32Array }}
 */
export function decodeAnimationCurve(curve)
{
    return {
        dimension: curve.valueDimension,
        interpolation: curve.interpolation,
        knots: Float32Array.from(decodeElementArray(curve.knots, curve.knotType)),
        values: Float32Array.from(decodeElementArray(curve.values, curve.valueType))
    };
}

/**
 * Carbon FindKnotInterval (animation.cpp:30-58): the two knots bracketing
 * `time` and how far between them it lies. Before the first knot it answers
 * knot 0 at 0; past the last, the last knot at 1.
 *
 * @param {Float32Array} knots The knot times.
 * @param {number} time The sample time.
 * @returns {{ knotIndex0: number, knotIndex1: number, time: number }}
 */
function findKnotInterval(knots, time)
{
    const interval = { knotIndex0: 0, knotIndex1: 0, time: 0 };
    if (knots.length === 0 || time < knots[0])
    {
        return interval;
    }
    let knot0 = knots[0];
    interval.knotIndex1 = 1;
    interval.time = 1;
    while (interval.knotIndex1 < knots.length)
    {
        const knot1 = knots[interval.knotIndex1];
        if (time < knot1)
        {
            interval.time = (time - knot0) / (knot1 - knot0);
            return interval;
        }
        interval.knotIndex0++;
        interval.knotIndex1++;
        knot0 = knot1;
    }
    interval.knotIndex1 = interval.knotIndex0;
    return interval;
}

/**
 * Carbon SampleCurve (animation.cpp:140-158): Step holds the left knot's
 * value, Linear lerps componentwise. Any other interpolation answers zeros,
 * as Carbon's `default: return {}` does.
 *
 * @param {ArrayLike<number>} out Receives `dimension` components.
 * @param {object} curve A decoded curve (decodeAnimationCurve).
 * @param {number} time The sample time.
 * @returns {ArrayLike<number>} out.
 */
export function sampleAnimationCurve(out, curve, time)
{
    const { dimension, values } = curve;
    const interval = findKnotInterval(curve.knots, time);
    const a = interval.knotIndex0 * dimension;
    const b = interval.knotIndex1 * dimension;
    switch (curve.interpolation)
    {
        case "Step":
            for (let i = 0; i < dimension; i++) out[i] = values[a + i];
            return out;
        case "Linear":
            for (let i = 0; i < dimension; i++) out[i] = values[a + i] + (values[b + i] - values[a + i]) * interval.time;
            return out;
        default:
            for (let i = 0; i < dimension; i++) out[i] = 0;
            return out;
    }
}

/**
 * Carbon SampleQuaternionCurve (animation.cpp:203-226): as sampleAnimationCurve
 * for Step, but Linear interpolates with Carbon's Slerp
 * (Quaternion_inline.h:244-266) - shortest arc, falling back to a plain lerp
 * when the two are within 0.001 of parallel. Components are x, y, z, w.
 *
 * @param {ArrayLike<number>} out Receives the quaternion.
 * @param {object} curve A decoded 4-component curve.
 * @param {number} time The sample time.
 * @returns {ArrayLike<number>} out.
 */
export function sampleQuaternionCurve(out, curve, time)
{
    if (curve.interpolation !== "Linear")
    {
        return sampleAnimationCurve(out, curve, time);
    }
    const { values } = curve;
    const interval = findKnotInterval(curve.knots, time);
    const a = interval.knotIndex0 * 4;
    const b = interval.knotIndex1 * 4;
    const t = interval.time;

    let epsilon = 1;
    let temp = 1 - t;
    let u = t;
    let dot = values[a] * values[b] + values[a + 1] * values[b + 1] + values[a + 2] * values[b + 2] + values[a + 3] * values[b + 3];
    if (dot < 0)
    {
        epsilon = -1;
        dot = -dot;
    }
    if (1 - dot > 0.001)
    {
        const theta = Math.acos(dot);
        temp = Math.sin(theta * temp) / Math.sin(theta);
        u = Math.sin(theta * u) / Math.sin(theta);
    }
    for (let i = 0; i < 4; i++) out[i] = temp * values[a + i] + epsilon * u * values[b + i];
    return out;
}
