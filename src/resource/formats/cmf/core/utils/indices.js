/**
 * Count all indices stored by shared geometry index groups.
 *
 * @param {Array<object>} groups Shared geometry index groups.
 * @param {ArrayLike<number>|null} [indexBuffer] Complete authored index stream.
 * @returns {number} Total index count.
 */
export function totalIndexCount(groups = [], indexBuffer = null)
{
    if (indexBuffer) return indexBuffer.length;
    let total = 0;
    for (const group of groups)
    {
        total += group.faces?.length ?? 0;
    }
    return total;
}

/**
 * Select the encoded CMF index width needed by shared geometry groups.
 *
 * @param {Array<object>} groups Shared geometry index groups.
 * @param {ArrayLike<number>|null} [indexBuffer] Complete authored index stream.
 * @returns {number} Two or four bytes per index.
 */
export function bytesPerIndex(groups = [], indexBuffer = null)
{
    if (indexBuffer instanceof Uint32Array) return 4;
    if (indexBuffer?.some(index => index > 0xffff)) return 4;
    for (const group of groups)
    {
        if (group.bytesPerIndex === 4)
        {
            return 4;
        }

        for (const index of group.faces ?? [])
        {
            if (index > 0xffff)
            {
                return 4;
            }
        }
    }
    return 2;
}

/**
 * Find the first triangle occupied by one shared geometry index group.
 *
 * @param {Array<object>} groups Shared geometry index groups.
 * @param {number} groupIndex Target group index.
 * @returns {number} Triangle offset.
 */
export function firstTriangle(groups = [], groupIndex)
{
    if (groups[groupIndex]?.firstElement !== undefined) return groups[groupIndex].firstElement;
    let first = 0;
    for (let i = 0; i < groupIndex; i++)
    {
        first += Math.floor((groups[i].faces ?? []).length / 3);
    }
    return first;
}
