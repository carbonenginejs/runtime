import { CjsSchema } from "#schema";

// CarbonEngineJS original (no Carbon counterpart).
import { evaluateWwiseInterpolation } from "./wwiseCurve.js";

export const LINEAR_FADE_CURVE = 4;
export const FADE_CURVE_SAMPLES = 65;

/** Shared fade scheduling for the music engine and its scheduled segments. */
export class CjsMusicEngineFade
{
    /** Wwise AkCurveInterpolation sampled over normalized time. */
    static fadeCurveValue(curve, progress)
    {
        return evaluateWwiseInterpolation(curve, progress);
    }

    /** Schedules one linear or sampled Wwise interpolation on an AudioParam. */
    static scheduleFade(
        param,
        from,
        to,
        when,
        duration,
        curve,
        progress = 0,
    )
    {
        const startProgress = Math.max(0, Math.min(1, progress));
        const curveId = Number(curve);
        const startValue = from
            + (to - from) * CjsMusicEngineFade.fadeCurveValue(curveId, startProgress);

        if ("value" in param) param.value = startValue;
        if (!(duration > 0))
        {
            param.setValueAtTime(to, when);
            if ("value" in param) param.value = to;
            return to;
        }
        if (!Number.isInteger(curveId)
            || curveId === LINEAR_FADE_CURVE
            || typeof param.setValueCurveAtTime !== "function")
        {
            param.setValueAtTime(startValue, when);
            param.linearRampToValueAtTime(to, when + duration);
            return startValue;
        }

        const values = new Float32Array(FADE_CURVE_SAMPLES);

        for (let index = 0; index < values.length; index++)
        {
            const ratio = index / (values.length - 1);
            const sampleProgress = startProgress
                + (1 - startProgress) * ratio;

            values[index] = from
                + (to - from) * CjsMusicEngineFade.fadeCurveValue(curveId, sampleProgress);
        }
        param.setValueCurveAtTime(values, when, duration);
        return startValue;
    }

    /** Holds the current AudioParam value with the existing browser fallback. */
    static holdAudioParam(param, at, value)
    {
        if (typeof param?.cancelAndHoldAtTime === "function")
        {
            param.cancelAndHoldAtTime(at);
        }
        else
        {
            param?.cancelScheduledValues(0);
        }
        param?.setValueAtTime(value, at);
        if (param && "value" in param) param.value = value;
    }
}

CjsSchema.meta.define(CjsMusicEngineFade, { className: "CjsMusicEngineFade" });
