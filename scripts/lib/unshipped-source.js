// Directories under src that are never built, shipped or linted.
//
// src/character/carbon-donor holds Carbon classes ported side by side with ours, for comparison. It is
// git-ignored, nothing imports it, and it follows Carbon's source rather than this package's rules, so the
// lints and the build skip any directory of that name.
//
// A `dropped` directory is quarantine: a class kept with the reason it was dropped, never imported, exported or
// registered (port-carbon-to-js, Dropped). Every lint, audit, proof and build skips it. The one exception is the
// generator guard (carbon-source-index.js, trinity/generated-ownership.js), which reads dropped identities so a
// generator never recreates a class that was dropped on purpose; it walks with DONOR_SOURCE_DIRS.

/** Directory names the generator guard does not enter: it must still see dropped identities. */
export const DONOR_SOURCE_DIRS = new Set([ "carbon-donor" ]);

/** Directory names the source walkers do not enter. */
export const UNSHIPPED_SOURCE_DIRS = new Set([ ...DONOR_SOURCE_DIRS, "dropped" ]);

/**
 * Whether a source path lies inside an unshipped directory.
 *
 * @param {string} file A path, with either separator.
 * @returns {boolean} True when any directory on the path is unshipped.
 */
export function isUnshippedSource(file)
{
    return file.split(/[\\/]/u).some(part => UNSHIPPED_SOURCE_DIRS.has(part));
}
