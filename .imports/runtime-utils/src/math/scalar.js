export {
    EPSILON as defaultEpsilon,
    TWO_PI as tau,
    clamp,
    cubicHermite,
    cubicHermiteDerivative,
    smoothStep,
    smootherStep
} from "../num.js";

/** Restricts a value to the inclusive range from zero to one. */
export function saturate(value)
{
    return Math.max(0, Math.min(1, value));
}

/** Linearly interpolates without clamping the interpolation amount. */
export function lerp(start, end, amount)
{
    return start + (end - start) * amount;
}

/** Compares two numbers with an explicit relative tolerance. */
export function approximatelyEqual(a, b, epsilon = 1e-6)
{
    if (epsilon < 0)
    {
        throw new RangeError("epsilon must be non-negative.");
    }

    return Math.abs(a - b) <= epsilon * Math.max(1, Math.abs(a), Math.abs(b));
}

/** Converts degrees to radians. */
export function degreesToRadians(degrees)
{
    return degrees * Math.PI / 180;
}

/** Converts radians to degrees. */
export function radiansToDegrees(radians)
{
    return radians * 180 / Math.PI;
}

/** Wraps degrees into the inclusive range from -180 to 180. */
export function wrapDegrees(degrees)
{
    let wrapped = degrees % 360;
    if (wrapped > 180) wrapped -= 360;
    if (wrapped < -180) wrapped += 360;
    return wrapped;
}

/** Wraps radians into the inclusive range from -pi to pi. */
export function wrapRadians(radians)
{
    const tau = Math.PI * 2;
    let wrapped = radians % tau;
    if (wrapped > Math.PI) wrapped -= tau;
    if (wrapped < -Math.PI) wrapped += tau;
    return wrapped;
}
