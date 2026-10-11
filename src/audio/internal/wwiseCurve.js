/**
 * Evaluates one Wwise AkCurveInterpolation over normalized progress.
 *
 * Curve identifiers follow the public AkCurveInterpolation enum, and each
 * shape is the one its public name describes, written as plain mathematics:
 * the sine curves are quarter-period sine and cosine (constant-power fades),
 * the S-curves are half-period cosine and sine. These are CarbonEngineJS
 * definitions, not Wwise's implementation. Constant retains the left value
 * until the segment endpoint.
 *
 * @param {number} curve AkCurveInterpolation value.
 * @param {number} progress Normalized progress, clamped to [0, 1].
 * @returns {number} Interpolated weight in [0, 1].
 */
export function evaluateWwiseInterpolation(curve, progress)
{
    const value = Math.max(0, Math.min(1, Number(progress) || 0));

    if (value === 0 || value === 1)
    {
        return value;
    }

    switch (Number(curve))
    {
        case 0: return 1 - (1 - value) ** 3; // Log3
        case 1: return Math.sin(Math.PI / 2 * value); // Sine: constant-power fade-in
        case 2: return value * (3 - value) / 2; // Log1
        case 3: return InvertedSCurve(value);
        case 5: return (1 - Math.cos(Math.PI * value)) / 2; // SCurve
        case 6: return value * (value + 1) / 2; // Exp1
        case 7: return 1 - Math.cos(Math.PI / 2 * value); // SineRecip: constant-power fade-out
        case 8: return value ** 3; // Exp3
        case 9: return value < 1 ? 0 : 1; // Constant
        default: return value; // Linear
    }
}

/**
 * Inverted S-curve: steep at both ends, flat through the middle.
 *
 * @param {number} value Normalized progress in (0, 1).
 * @returns {number} Interpolated weight.
 */
function InvertedSCurve(value)
{
    const half = Math.sin(Math.PI * value) / 2;

    return value > 0.5 ? 1 - half : half;
}
