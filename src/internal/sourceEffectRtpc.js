// CarbonEngineJS original (no Carbon counterpart). Per-voice Web Audio
// realization of already-qualified Wwise source-effect RTPC curves.
import { wwiseDbRtpcValueToDb } from "./wwiseRtpc.js";

const AUTOMATION_SAMPLES = 33;
const MIN_EQ_GAIN_DB = -24;
const MAX_EQ_GAIN_DB = 24;
const MIN_EQ_FREQUENCY_HZ = 20;
const MAX_EQ_FREQUENCY_HZ = 20000;

/** Owns live AudioParam bindings for one realized source-effect chain. */
export class CjsWwiseSourceEffectRtpcLane
{
    #bindings;

    #context;

    #readCurve;

    /** Creates a lane over qualified bindings and one authored RTPC reader. */
    constructor(context, bindings, readCurve)
    {
        this.#context = context;
        this.#bindings = [ ...(bindings ?? []) ];
        this.#readCurve = readCurve;
    }

    /** Schedules every bound effect parameter over known control transitions. */
    Apply(boundaries = [])
    {
        if (typeof this.#readCurve !== "function") return;
        const now = Number(this.#context?.currentTime) || 0;
        const ends = [ ...new Set(boundaries
            .map(Number)
            .filter(value => Number.isFinite(value) && value > now)) ]
            .sort((left, right) => left - right);

        for (const binding of this.#bindings)
        {
            ScheduleBinding(
                binding,
                at => this.#ValueAt(binding, at),
                now,
                ends,
            );
        }
    }

    /** Releases references after the owning voice disconnects its nodes. */
    Dispose()
    {
        this.#bindings = [];
        this.#readCurve = null;
    }

    #ValueAt(binding, at)
    {
        const output = Number(this.#readCurve(binding.curve, at));
        const value = ScaleCurveOutput(output, binding.curve.scaling);
        const combined = binding.curve.accumulation === "additive"
            ? binding.baseValue + value
            : value;

        if (binding.curve.property === "gainDb")
        {
            return Clamp(combined, MIN_EQ_GAIN_DB, MAX_EQ_GAIN_DB);
        }
        const nyquist = Number(this.#context?.sampleRate) / 2;
        const maximum = Number.isFinite(nyquist) && nyquist > 0
            ? Math.min(MAX_EQ_FREQUENCY_HZ, nyquist)
            : MAX_EQ_FREQUENCY_HZ;

        return Clamp(combined, MIN_EQ_FREQUENCY_HZ, maximum);
    }
}

/** Creates a lane only when the chain retained live source-effect controls. */
export function createWwiseSourceEffectRtpcLane(
    context,
    bindings,
    readCurve,
)
{
    return bindings?.length && typeof readCurve === "function"
        ? new CjsWwiseSourceEffectRtpcLane(context, bindings, readCurve)
        : null;
}

function ScaleCurveOutput(value, scaling)
{
    if (!Number.isFinite(value)) return 0;
    if (scaling === 2) return wwiseDbRtpcValueToDb(value);
    if (scaling === 3) return 10 ** value;
    return value;
}

function ScheduleBinding(binding, evaluate, now, boundaries)
{
    const param = binding.param;
    const startValue = evaluate(now);

    if (typeof param?.cancelAndHoldAtTime === "function")
    {
        param.cancelAndHoldAtTime(now);
    }
    else
    {
        param?.cancelScheduledValues?.(0);
    }
    param?.setValueAtTime?.(startValue, now);
    if (param && "value" in param) param.value = startValue;
    let segmentStart = now;

    for (const segmentEnd of boundaries)
    {
        if (typeof param?.setValueCurveAtTime === "function")
        {
            const values = new Float32Array(AUTOMATION_SAMPLES);

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
            param?.linearRampToValueAtTime?.(
                evaluate(segmentEnd),
                segmentEnd,
            );
        }
        segmentStart = segmentEnd;
    }
}

function Clamp(value, minimum, maximum)
{
    return Math.min(maximum, Math.max(minimum, value));
}
