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

function polynomialValue(coefficients, value)
{
    let result = 0;
    for (let index = coefficients.length - 1; index >= 0; index--)
    {
        result = result * value + coefficients[index];
    }
    return result;
}

function normalizedPolynomial(coefficients)
{
    let scale = 0;
    for (const coefficient of coefficients) scale = Math.max(scale, Math.abs(coefficient));
    if (!(scale > 0)) return [ 0 ];
    const result = coefficients.map(value => value / scale);
    while (result.length > 1 && Math.abs(result.at(-1)) <= 1e-12) result.pop();
    return result;
}

function multiplyPolynomials(left, right)
{
    const result = new Array(left.length + right.length - 1).fill(0);
    for (let l = 0; l < left.length; l++)
    {
        for (let r = 0; r < right.length; r++) result[l + r] += left[l] * right[r];
    }
    return result;
}

function addPolynomials(left, right, rightScale = 1)
{
    const result = new Array(Math.max(left.length, right.length)).fill(0);
    for (let index = 0; index < result.length; index++)
    {
        result[index] = (left[index] ?? 0) + (right[index] ?? 0) * rightScale;
    }
    return result;
}

function derivativePolynomial(coefficients)
{
    return coefficients.slice(1).map((value, index) => value * (index + 1));
}

function polynomialRootsInUnitInterval(coefficients)
{
    const polynomial = normalizedPolynomial(coefficients);
    const degree = polynomial.length - 1;
    if (degree <= 0) return [];
    if (degree === 1)
    {
        const root = -polynomial[0] / polynomial[1];
        return root >= 0 && root <= 1 ? [ root ] : [];
    }

    const critical = polynomialRootsInUnitInterval(derivativePolynomial(polynomial));
    const boundaries = [ 0, ...critical.filter(value => value > 0 && value < 1), 1 ]
        .sort((a, b) => a - b);
    const roots = [];
    const append = (value) =>
    {
        if (!roots.some(existing => Math.abs(existing - value) <= 1e-9)) roots.push(value);
    };
    for (const boundary of boundaries)
    {
        if (Math.abs(polynomialValue(polynomial, boundary)) <= 1e-9) append(boundary);
    }
    for (let index = 1; index < boundaries.length; index++)
    {
        let left = boundaries[index - 1];
        let right = boundaries[index];
        let leftValue = polynomialValue(polynomial, left);
        const rightValue = polynomialValue(polynomial, right);
        if (leftValue === 0 || rightValue === 0 || Math.sign(leftValue) === Math.sign(rightValue)) continue;
        for (let iteration = 0; iteration < 64; iteration++)
        {
            const middle = (left + right) * 0.5;
            const middleValue = polynomialValue(polynomial, middle);
            if (Math.sign(leftValue) === Math.sign(middleValue))
            {
                left = middle;
                leftValue = middleValue;
            }
            else
            {
                right = middle;
            }
        }
        append((left + right) * 0.5);
    }
    return roots;
}

function dotPolynomial(startA, deltaA, startB, deltaB)
{
    let constant = 0;
    let linear = 0;
    let quadratic = 0;
    for (let index = 0; index < 4; index++)
    {
        constant += startA[index] * startB[index];
        linear += deltaA[index] * startB[index] + startA[index] * deltaB[index];
        quadratic += deltaA[index] * deltaB[index];
    }
    return [ constant, linear, quadratic ];
}

function scaledQuaternionSegment(start, end)
{
    let scale = 0;
    for (const value of start) scale = Math.max(scale, Math.abs(value));
    for (const value of end) scale = Math.max(scale, Math.abs(value));
    if (!(scale > 0)) throw new Error("quaternion segment contains only zero quaternions");
    const scaledStart = start.map(value => value / scale);
    return {
        start: scaledStart,
        delta: end.map((value, index) => value / scale - scaledStart[index])
    };
}

/**
 * Find the maximum angular error between two normalized-linear quaternion segments.
 *
 * The stationary points come from the exact derivative polynomial of the
 * squared normalized dot product, avoiding fixed-grid tolerance gaps.
 *
 * @param {number[]} startA First segment start quaternion.
 * @param {number[]} endA First segment end quaternion.
 * @param {number[]} startB Second segment start quaternion.
 * @param {number[]} endB Second segment end quaternion.
 * @returns {number} Maximum shortest angular difference in radians.
 */
export function maximumQuaternionLerpAngularDifference(startA, endA, startB, endB)
{
    const a = scaledQuaternionSegment(startA, endA);
    const b = scaledQuaternionSegment(startB, endB);
    const n = dotPolynomial(a.start, a.delta, b.start, b.delta);
    const aa = dotPolynomial(a.start, a.delta, a.start, a.delta);
    const bb = dotPolynomial(b.start, b.delta, b.start, b.delta);
    const aabb = multiplyPolynomials(aa, bb);
    const derivativeNumerator = addPolynomials(
        multiplyPolynomials(derivativePolynomial(n), aabb).map(value => value * 2),
        multiplyPolynomials(n, addPolynomials(
            multiplyPolynomials(derivativePolynomial(aa), bb),
            multiplyPolynomials(aa, derivativePolynomial(bb))
        )),
        -1
    );
    const candidates = [
        0,
        1,
        ...polynomialRootsInUnitInterval(n),
        ...polynomialRootsInUnitInterval(derivativeNumerator)
    ];
    let maximum = 0;
    for (const time of candidates)
    {
        const qa = a.start.map((value, index) => value + a.delta[index] * time);
        const qb = b.start.map((value, index) => value + b.delta[index] * time);
        maximum = Math.max(maximum, quaternionAngularDifference(
            normalizeQuaternion(qa, "first quaternion segment"),
            normalizeQuaternion(qb, "second quaternion segment")
        ));
    }
    return maximum;
}

/** Representative interior fractions used to validate quaternion segments. */
export const QUATERNION_SEGMENT_SAMPLE_FRACTIONS = Object.freeze([ 0.25, 0.5, 0.75 ]);

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
    for (const fraction of QUATERNION_SEGMENT_SAMPLE_FRACTIONS)
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
