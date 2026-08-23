import { evaluateBusRtpcGainDb } from "./busRtpc.js";
import { evaluateBusStateGainDb } from "./busState.js";

const CURVE_SAMPLES = 65;

/** Schedules one physical Audio Bus fader from its static, RTPC, and State gain. */
export function scheduleSharedBusFader({
    param,
    busId,
    staticGainDb = 0,
    context,
    busRtpcs,
    readGlobalRtpc,
    readGlobalRtpcTransitionBoundaries,
    busStates,
    readGlobalStateWeights,
    readGlobalStateTransitionBoundaries,
} = {})
{
    if (!param) return;
    const id = String(busId);
    const now = Number(context?.currentTime) || 0;
    const evaluate = at => 10 ** ((
        (Number(staticGainDb) || 0)
        + evaluateBusRtpcGainDb(
            busRtpcs,
            [ id ],
            readGlobalRtpc,
            at,
        )
        + evaluateBusStateGainDb(
            busStates,
            [ id ],
            readGlobalStateWeights,
            at,
        )
    ) / 20);
    const boundaries = [
        ...(readGlobalRtpcTransitionBoundaries?.(now) ?? []),
        ...(readGlobalStateTransitionBoundaries?.(now) ?? []),
    ].map(Number).filter(value => Number.isFinite(value) && value > now);
    const uniqueBoundaries = [ ...new Set(boundaries) ]
        .sort((left, right) => left - right);
    const startValue = evaluate(now);

    if (typeof param.cancelAndHoldAtTime === "function")
    {
        param.cancelAndHoldAtTime(now);
    }
    else
    {
        param.cancelScheduledValues?.(0);
    }
    param.setValueAtTime?.(startValue, now);
    if ("value" in param) param.value = startValue;
    let segmentStart = now;

    for (const segmentEnd of uniqueBoundaries)
    {
        if (typeof param.setValueCurveAtTime === "function")
        {
            const values = new Float32Array(CURVE_SAMPLES);

            for (let index = 0; index < values.length; index++)
            {
                const ratio = index / (values.length - 1);

                values[index] = evaluate(
                    segmentStart + (segmentEnd - segmentStart) * ratio,
                );
            }
            param.setValueCurveAtTime(
                values,
                segmentStart,
                segmentEnd - segmentStart,
            );
        }
        else
        {
            param.linearRampToValueAtTime?.(
                evaluate(segmentEnd),
                segmentEnd,
            );
        }
        segmentStart = segmentEnd;
    }
}
