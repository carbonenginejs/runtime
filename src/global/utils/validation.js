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
