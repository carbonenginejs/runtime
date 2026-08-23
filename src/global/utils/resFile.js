/**
 * EVE resource file addressing.
 *
 * A resource's stored name IS its identity: a hash of its logical path, then
 * the md5 of its contents. Two builds either carry the same address for a path
 * or they do not, which makes address comparison - not file hashing - the way
 * to tell whether anything changed.
 *
 * Deliberately no md5 here. Computing it is I/O, and the shape of that I/O
 * differs per environment: a file stream in Node, an ArrayBuffer in a browser.
 * The digest is passed in, so this module stays environment-neutral and every
 * consumer shares one derivation instead of keeping its own.
 */

const ADDRESS = /^([a-f0-9]{2})\/([a-f0-9]{16})_([a-f0-9]{32})$/u;

/** Lazily built byte-to-hex table. */
let hex = null;

/**
 * FNV-1 (64-bit) over a resource's logical path.
 *
 * FNV-**1**, not 1a: the multiply happens before the XOR. Offset basis
 * 0xcbf29ce484222325, prime 0x100000001b3, emitted as 16 lowercase hex digits.
 *
 * Verified against 1718 content-addressed entries from a real resfileindex.
 *
 * ONLY DEFINED FOR ASCII PATHS. Two implementations exist in the wild - one
 * hashing UTF-8 bytes, one hashing UTF-16 code units - and they agree on every
 * ASCII string and disagree beyond it. No real resource path has ever been
 * non-ASCII, so no evidence exists for which is correct, and guessing would
 * turn a dormant difference into a live wrong answer. A non-ASCII path
 * therefore throws rather than returning something plausible.
 *
 * @param {String} logicalPath - the prefixed path, e.g. "res:/graphics/x.dds"
 * @returns {String} 16 lowercase hex digits
 */
export function fnv164(logicalPath)
{
    const value = String(logicalPath);

    if (!hex)
    {
        hex = [];
        for (let i = 0; i < 256; i++) hex[i] = ((i >> 4) & 15).toString(16) + (i & 15).toString(16);
    }

    // 16-bit limbs, so the 64-bit multiply stays inside the safe integer range.
    let v0 = 0x2325;
    let v1 = 0x8422;
    let v2 = 0x9ce4;
    let v3 = 0xcbf2;

    for (let i = 0; i < value.length; i++)
    {
        const code = value.charCodeAt(i);

        if (code > 0x7f)
        {
            throw new RangeError(
                `Resource path hashing is only defined for ASCII: ${JSON.stringify(value)}`,
            );
        }

        // Multiply by 0x100000001b3: the low limb contributes 0x1b3 (435) to
        // every limb, and the 0x100000000 term shifts two limbs left.
        let t0 = v0 * 435;
        let t1 = v1 * 435;
        let t2 = v2 * 435 + (v0 << 8);
        const t3 = v3 * 435 + (v1 << 8);

        t1 += t0 >>> 16;
        v0 = t0 & 0xffff;
        t2 += t1 >>> 16;
        v1 = t1 & 0xffff;
        v3 = (t3 + (t2 >>> 16)) & 0xffff;
        v2 = t2 & 0xffff;

        v0 ^= code;
    }

    return hex[v3 >> 8] + hex[v3 & 255]
        + hex[v2 >> 8] + hex[v2 & 255]
        + hex[v1 >> 8] + hex[v1 & 255]
        + hex[v0 >> 8] + hex[v0 & 255];
}

/**
 * Builds a resource's stored address from its path and its content digest.
 *
 * The shard directory is the first two characters of the path hash itself, not
 * a separate value - a detail that is easy to reimplement wrongly.
 *
 * @param {String} logicalPath
 * @param {String} md5 - 32 hex digits, the md5 of the file's contents
 * @returns {String} "<shard>/<pathHash>_<md5>"
 */
export function resFileAddress(logicalPath, md5)
{
    const digest = String(md5).toLowerCase();

    if (!/^[a-f0-9]{32}$/u.test(digest))
    {
        throw new TypeError(`Resource content digest must be 32 hex digits: ${md5}`);
    }

    const pathHash = fnv164(logicalPath);

    return `${pathHash.slice(0, 2)}/${pathHash}_${digest}`;
}

/**
 * Splits a stored address into its parts, or null when it is not one.
 *
 * Null rather than throwing: an index legitimately carries plain paths for
 * overlay entries alongside content-addressed ones, so "not an address" is an
 * ordinary answer rather than an error.
 *
 * @param {String} address
 * @returns {{shard: String, pathHash: String, checksum: String}|null}
 */
export function parseResFileAddress(address)
{
    const match = String(address ?? "").toLowerCase().match(ADDRESS);

    return match ? { shard: match[1], pathHash: match[2], checksum: match[3] } : null;
}

/**
 * Checks a stored address against the path it claims to be for.
 *
 * Only the path half can be checked without reading the file; the content half
 * is verifiable only against the bytes. Returns false rather than throwing so a
 * caller can survey an index without exception handling - except for a
 * non-ASCII path, where the answer is genuinely unknown.
 *
 * @param {String} address
 * @param {String} logicalPath
 * @returns {Boolean}
 */
export function isResFileAddressFor(address, logicalPath)
{
    const parts = parseResFileAddress(address);

    if (!parts) return false;

    return parts.pathHash === fnv164(logicalPath)
        && parts.shard === parts.pathHash.slice(0, 2);
}
