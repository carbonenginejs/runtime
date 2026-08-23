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
