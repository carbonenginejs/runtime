// Directories under src that are never built, shipped or linted.
//
// src/character/carbon-donor holds Carbon classes ported side by side with ours, for comparison. It is
// git-ignored, nothing imports it, and it follows Carbon's source rather than this package's rules, so the
// lints and the build skip any directory of that name.
//
// A `dropped` directory is quarantine: a class kept with the reason it was dropped, never imported, exported or
// registered (port-carbon-to-js, Dropped). It is not shipped, so the ratchet lints that count source sites skip it
// (QUARANTINE_SOURCE_DIRS). The indexes and the generator still read it: a dropped identity is a recorded
// decision they must see.

/** Directory names the source walkers do not enter. */
export const UNSHIPPED_SOURCE_DIRS = new Set([ "carbon-donor" ]);

/** Directory names the site-counting ratchet lints also do not enter. */
export const QUARANTINE_SOURCE_DIRS = new Set([ ...UNSHIPPED_SOURCE_DIRS, "dropped" ]);

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
