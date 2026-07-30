/**
 * Evaluates one Wwise AkCurveInterpolation over normalized progress.
 *
 * Curve identifiers follow the public AkCurveInterpolation enum. Constant
 * retains the left value until the segment endpoint.
 */
export function evaluateWwiseInterpolation(curve, progress)
{
    const value = Math.max(0, Math.min(1, Number(progress) || 0));

    switch (Number(curve))
    {
        case 0: return 1 - (1 - value) ** 3; // Log3
        case 1: return Math.sin(value * Math.PI / 2); // Sine
        case 2: return Math.sqrt(value); // Log1
        case 3: // Inverted S: fast at both ends, shallow through the middle.
            return value < 0.5
                ? Math.sqrt(value / 2)
                : 1 - Math.sqrt((1 - value) / 2);
        case 5: return value * value * (3 - 2 * value); // S curve
        case 6: return value * value; // Exp1
        case 7: return 1 - Math.cos(value * Math.PI / 2); // Sine reciprocal
        case 8: return value ** 3; // Exp3
        case 9: return value < 1 ? 0 : 1; // Constant
        default: return value; // Linear
    }
}
