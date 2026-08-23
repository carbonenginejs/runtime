/** Compares string representations by stable Unicode code-unit order. */
export function compareCodeUnits(left, right)
{
    const a = String(left);
    const b = String(right);

    return a < b ? -1 : a > b ? 1 : 0;
}

/** Returns a new string array in stable Unicode code-unit order. */
export function sortStrings(values)
{
    return Array.from(values, String).sort(compareCodeUnits);
}

/** Builds a Map and rejects duplicate keys instead of silently overwriting. */
export function indexBy(values, keySelector, options = {})
{
    if (typeof keySelector !== "function")
    {
        throw new TypeError("indexBy keySelector must be a function.");
    }

    const result = new Map();
    const label = options.label ?? "value";
    let index = 0;

    for (const value of values)
    {
        const key = keySelector(value, index++);

        if (result.has(key))
        {
            throw new Error(`Duplicate ${label} key ${formatKey(key)}.`);
        }

        result.set(key, value);
    }

    return result;
}

function formatKey(value)
{
    const json = JSON.stringify(value);

    return json === undefined ? String(value) : json;
}
