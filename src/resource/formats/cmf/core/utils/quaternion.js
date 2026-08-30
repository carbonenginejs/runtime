/** Normalize one xyzw quaternion and canonicalize signed zeroes. */
export function normalizeQuaternion(value, label = "quaternion")
{
    const length = Math.hypot(value[0], value[1], value[2], value[3]);
    if (!(length > 0)) throw new Error(`${label} contains a zero quaternion`);
    return value.slice(0, 4).map((component) =>
    {
        const normalized = component / length;
        return normalized === 0 ? 0 : normalized;
    });
}

/** Normalize flat xyzw controls and keep adjacent keys in one hemisphere. */
export function normalizeQuaternionSeries(values, label = "quaternion curve")
{
    let previous = null;
    for (let index = 0; index < values.length; index += 4)
    {
        const current = normalizeQuaternion(values.slice(index, index + 4), label);
        if (previous)
        {
            const dot = previous.reduce((sum, value, component) => sum + value * current[component], 0);
            if (dot < 0)
            {
                for (let component = 0; component < 4; component++) current[component] *= -1;
            }
        }
        for (let component = 0; component < 4; component++)
        {
            if (current[component] === 0) current[component] = 0;
        }
        for (let component = 0; component < 4; component++) values[index + component] = current[component];
        previous = current;
    }
    return values;
}

/** Linearly interpolate and normalize one xyzw quaternion. */
export function normalizedLerpQuaternion(start, end, alpha, label = "quaternion interpolation")
{
    const dot = start.reduce((sum, value, index) => sum + value * end[index], 0);
    const direction = dot < 0 ? -1 : 1;
    return normalizeQuaternion(start.map((value, index) =>
        value + (end[index] * direction - value) * alpha
    ), label);
}

/** Return the shortest angular distance between two normalized xyzw quaternions. */
export function quaternionAngularDifference(a, b)
{
    const dot = Math.min(1, Math.abs(a.reduce((sum, value, index) => sum + value * b[index], 0)));
    return 2 * Math.acos(dot);
}

const ADAPTIVE_SEGMENT_FRACTIONS = Object.freeze([ 0.25, 0.5, 0.75 ]);

/**
 * Test representative interior ticks before accepting a quaternion bake segment.
 * The evaluator receives the quantized tick and its actual fraction of the segment.
 */
export function quaternionSegmentNeedsSubdivision(startTick, endTick, evaluator, tolerance = 1e-4)
{
    const
        start = BigInt(startTick),
        span = BigInt(endTick) - start,
        sampledTicks = new Set();
    for (const fraction of ADAPTIVE_SEGMENT_FRACTIONS)
    {
        const denominator = 4n;
        const numerator = BigInt(Math.round(fraction * Number(denominator)));
        const tick = Number(start + (span * numerator + denominator / 2n) / denominator);
        if (tick <= startTick || tick >= endTick || sampledTicks.has(tick)) continue;
        sampledTicks.add(tick);
        const local = Number(BigInt(tick) - start) / Number(span);
        if (evaluator(tick, local) > tolerance) return true;
    }
    return false;
}

/** Return an overflow-safe integer midpoint for two safe integer ticks. */
export function quaternionSegmentMidpointTick(startTick, endTick)
{
    return Number((BigInt(startTick) + BigInt(endTick)) / 2n);
}
