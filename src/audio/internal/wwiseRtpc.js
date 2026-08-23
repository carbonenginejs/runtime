import { evaluateWwiseInterpolation } from "./wwiseCurve.js";

/** Evaluates one ordered Wwise RTPC point list at a control value. */
export function evaluateWwiseRtpcCurve(points, value, field = "value")
{
    if (!Array.isArray(points) || !points.length)
    {
        return 0;
    }
    const input = Number(value);

    if (input < points[0].x)
    {
        return Number(points[0][field]) || 0;
    }

    const last = points.at(-1);

    if (input >= last.x)
    {
        return Number(last[field]) || 0;
    }

    for (let index = 1; index < points.length; index++)
    {
        const right = points[index];

        if (input < right.x)
        {
            const left = points[index - 1];
            const span = right.x - left.x;
            const ratio = span > 0
                ? evaluateWwiseInterpolation(
                    left.interpolation ?? 4,
                    (input - left.x) / span,
                )
                : 1;

            return Number(left[field])
                + (Number(right[field]) - Number(left[field])) * ratio;
        }
    }

    return Number(last[field]) || 0;
}

/** Applies Wwise's dB curve scaling to one serialized RTPC output value. */
export function wwiseDbRtpcValueToDb(value)
{
    const raw = Math.min(1, Math.max(-1, Number(value) || 0));

    return raw === -1 ? -96.3 : 20 * Math.log10(raw + 1);
}
