
/**
 * Convert a nullable, scalar, or array-like value into an array.
 *
 * Kept local so geometry helpers do not depend on the old ccpwgl `utils`
 * webpack alias.
 *
 * @param {any} value Value to normalize.
 * @returns {Array} Normalized array.
 */
export function toArray(value)
{
    if (value === undefined || value === null) return [];
    return Array.isArray(value) ? value : [ value ];
}

/**
 * Copies array-like values into a writable indexed target.
 *
 * @template T
 * @param {T} target Writable indexed target.
 * @param {ArrayLike<any>} value Source values.
 * @returns {T} The target.
 */
export function copyArrayLike(target, value)
{
    const
        length = Math.min(target.length, value.length),
        source = new Array(length);

    for (let i = 0; i < length; i++)
    {
        source[i] = value[i];
    }

    for (let i = 0; i < length; i++)
    {
        target[i] = source[i];
    }
    return target;
}

/**
 * Fills a writable indexed target with a scalar value.
 *
 * @template T
 * @param {T} target Writable indexed target.
 * @param {number} value Fill value.
 * @returns {T} The target.
 */
export function fillArrayLike(target, value)
{
    for (let i = 0; i < target.length; i++)
    {
        target[i] = value;
    }
    return target;
}
