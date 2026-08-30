/** Returns an immutable snapshot of readable primitive WebIDL properties. */
export function snapshotWebIdl(value)
{
    if (!value || (typeof value !== "object" && typeof value !== "function")) return {};

    const names = new Set(Object.keys(value));
    let prototype = Object.getPrototypeOf(value);
    while (prototype && prototype !== Object.prototype)
    {
        for (const name of Object.getOwnPropertyNames(prototype))
        {
            if (name !== "constructor") names.add(name);
        }
        prototype = Object.getPrototypeOf(prototype);
    }

    const result = {};
    for (const name of names)
    {
        try
        {
            const item = value[name];
            if (item === null || [ "boolean", "number", "string" ].includes(typeof item)) result[name] = item;
        }
        catch
        {
            // Privacy-gated WebIDL attributes may throw when read.
        }
    }
    return result;
}

/** Returns a sorted immutable snapshot of an iterable Web feature set. */
export function snapshotFeatures(features)
{
    if (!features || typeof features[Symbol.iterator] !== "function") return [];
    return Array.from(features, String).sort();
}

/** Normalizes a finite numeric value or returns the supplied fallback. */
export function finiteNumber(value, fallback = 0)
{
    return Number.isFinite(value) ? Number(value) : fallback;
}

/** Normalizes an optional browser string to a string or null. */
export function optionalString(value)
{
    return value === null || value === undefined || value === "" ? null : String(value);
}
