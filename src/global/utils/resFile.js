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

import { fnv164 } from "./hash.js";

// RE-EXPORTED, NOT MOVED AWAY. `fnv164` lived here until 2026-09-06 and this
// module is a published subpath, so dropping the name would be a breaking
// change for anyone addressing resources. The implementation belongs beside
// the other FNV variants in `hash.js`; the name stays reachable from both.
export { fnv164 };

const ADDRESS = /^([a-f0-9]{2})\/([a-f0-9]{16})_([a-f0-9]{32})$/u;

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
