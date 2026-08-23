const textEncoder = new TextEncoder();

/**
 * Compares two strings by their UTF-8 bytes, unsigned.
 *
 * This is `strcmp` order, and it is the only string comparison allowed to decide
 * emitted bytes anywhere in this package.
 *
 * `String.prototype.localeCompare` cannot be used for that job. Without an
 * explicit locale it is implementation- and ICU-dependent, so the same input can
 * order differently across Node builds; it treats case as a minor difference, so
 * `"Z"` sorts *after* `"a"` where bytes put it before; and it gives punctuation
 * variable weight, so `-`, `:` and `@` — which appear in every binding identity we
 * sort — are not ordered by code point. Any of those is enough to make a build
 * unreproducible.
 *
 * Carbon compares the same way, both in its string table (`Blob::operator<`,
 * `StringTable.h:109-122`) and when it sorts annotation keys before writing them
 * (`strcmp`, `EffectData.h:613-616`).
 *
 * @param {string} left First string.
 * @param {string} right Second string.
 * @returns {number} Negative, zero, or positive ordering result.
 */
export function compareUtf8(left, right)
{
    const a = textEncoder.encode(String(left));
    const b = textEncoder.encode(String(right));
    const shared = Math.min(a.length, b.length);
    for (let index = 0; index < shared; index += 1)
    {
        if (a[index] !== b[index]) return a[index] - b[index];
    }
    return a.length - b.length;
}

export default compareUtf8;
