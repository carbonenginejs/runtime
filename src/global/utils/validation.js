import { isPlainObject } from "./is.js";

export { isPlainObject } from "./is.js";

/** Returns a plain object or throws a labelled TypeError. */
export function assertPlainObject(value, label = "value")
{
    if (!isPlainObject(value))
    {
        throw new TypeError(`${label} must be a plain object.`);
    }

    return value;
}

/** Returns a trimmed non-empty string or throws a labelled TypeError. */
export function assertNonEmptyString(value, label = "value")
{
    if (typeof value !== "string" || value.trim() === "")
    {
        throw new TypeError(`${label} must be a non-empty string.`);
    }

    return value.trim();
}

/** Normalizes and validates a non-negative safe-integer version. */
export function assertSupportedVersion(value, supportedVersions, label = "version")
{
    const version = Number(value);
    const supported = Array.from(supportedVersions, Number);

    if (!Number.isSafeInteger(version) || version < 0)
    {
        throw new TypeError(`${label} must be a non-negative safe integer.`);
    }

    if (!supported.includes(version))
    {
        throw new RangeError(
            `Unsupported ${label} ${JSON.stringify(value)}; expected one of ${supported.join(", ")}.`
        );
    }

    return version;
}

// Numeric guards come in two axes, and every donor mixed them: whether a
// non-number is coerced with Number() or rejected, and whether a bad value
// throws or falls back. Four names existed spelling `finiteNumber`, one of
// which returned 0 where another threw, so merging them by name would have
// turned a thrown error into a silent zero. Each name below has exactly one
// contract; pick the pair you mean.

/** Returns a finite number or throws. Rejects non-numbers rather than coercing. */
export function assertFiniteNumber(value, label = "value")
{
    if (typeof value !== "number" || !Number.isFinite(value))
    {
        throw new TypeError(`${label} must be a finite number.`);
    }

    return value;
}

/** Coerces to a finite number or throws. For parsed documents, not API arguments. */
export function coerceFiniteNumber(value, label = "value")
{
    const number = Number(value);

    if (!Number.isFinite(number))
    {
        throw new TypeError(`${label} must be a finite number.`);
    }

    return number;
}

/** Coerces to a finite number, returning the fallback when it is not one. */
export function finiteNumberOr(value, fallback)
{
    const number = Number(value);

    return Number.isFinite(number) ? number : fallback;
}

/** Returns a non-negative finite number or throws. Rejects non-numbers. */
export function assertNonNegativeNumber(value, label = "value")
{
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0)
    {
        throw new TypeError(`${label} must be a non-negative finite number.`);
    }

    return value;
}

/** Returns a non-negative safe integer or throws. Rejects non-numbers. */
export function assertNonNegativeInteger(value, label = "value")
{
    if (!Number.isSafeInteger(value) || value < 0)
    {
        throw new TypeError(`${label} must be a non-negative integer.`);
    }

    return value;
}

/** Returns a positive safe integer or throws. Rejects non-numbers. */
export function assertPositiveInteger(value, label = "value")
{
    if (!Number.isSafeInteger(value) || value < 1)
    {
        throw new TypeError(`${label} must be a positive integer.`);
    }

    return value;
}

/** Coerces to a non-negative safe integer or throws. */
export function coerceNonNegativeInteger(value, label = "value")
{
    const number = Number(value);

    if (!Number.isSafeInteger(number) || number < 0)
    {
        throw new TypeError(`${label} must be a non-negative integer`);
    }

    return number;
}

/** Coerces to a positive safe integer or throws. */
export function coercePositiveInteger(value, label = "value")
{
    const number = Number(value);

    if (!Number.isSafeInteger(number) || number < 1)
    {
        throw new TypeError(`${label} must be a positive integer`);
    }

    return number;
}
