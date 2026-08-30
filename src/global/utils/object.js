/**
 * Invokes handlers for keys explicitly owned by a source object.
 *
 * @param {object|Function} source Source values.
 * @param {object} handlers Property-keyed handler functions.
 * @param {*} [context=null] Optional `this` value for handlers.
 * @returns {number} Number of invoked handlers.
 */
export function hasOwnThen(source, handlers, context = null)
{
    if (!source || (typeof source !== "object" && typeof source !== "function"))
    {
        throw new TypeError("hasOwnThen source must be an object or function.");
    }

    if (!handlers || typeof handlers !== "object" || Array.isArray(handlers))
    {
        throw new TypeError("hasOwnThen handlers must be an object.");
    }

    let invoked = 0;

    for (const property of Reflect.ownKeys(handlers))
    {
        if (!Object.hasOwn(source, property)) continue;

        const handler = handlers[property];

        if (typeof handler !== "function")
        {
            throw new TypeError(`hasOwnThen handler must be a function: ${String(property)}.`);
        }

        handler.call(context, source[property], source, property);
        invoked++;
    }

    return invoked;
}

/**
 * Deep-copies a plain data tree of objects, arrays, and primitives.
 *
 * Typed arrays and other views become plain arrays, and `undefined` becomes
 * `null`, so the result is always safe to serialize. Class instances, maps,
 * and sets are not handled: this is for plain interchange data, not models.
 *
 * @param {*} value Value to copy.
 * @returns {*} An independent copy.
 */
export function clonePlain(value)
{
    if (value === null || value === undefined) return value ?? null;
    if (ArrayBuffer.isView(value)) return Array.from(value);
    if (Array.isArray(value)) return value.map(clonePlain);
    if (typeof value === "object")
    {
        const out = {};
        for (const [ key, entry ] of Object.entries(value)) out[key] = clonePlain(entry);
        return out;
    }
    return value;
}
