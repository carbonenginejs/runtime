/**
 * Count all indices stored by shared geometry index groups.
 *
 * @param {Array<object>} groups Shared geometry index groups.
 * @returns {number} Total index count.
 */
export function totalIndexCount(groups = [])
{
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
 * @returns {number} Two or four bytes per index.
 */
export function bytesPerIndex(groups = [])
{
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
    let first = 0;
    for (let i = 0; i < groupIndex; i++)
    {
        first += Math.floor((groups[i].faces ?? []).length / 3);
    }
    return first;
}
