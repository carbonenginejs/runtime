// Directories under src that are never built, shipped or linted.
//
// src/character/carbon-donor holds Carbon classes ported side by side with ours, for comparison. It is
// git-ignored, nothing imports it, and it follows Carbon's source rather than this package's rules, so the
// lints and the build skip any directory of that name.
//
// A `dropped` directory is quarantine: a class kept with the reason it was dropped, never imported, exported or
// registered (port-carbon-to-js, Dropped). It is not shipped either, so the source lints skip it the way
// carbon-source-index.js already did.

/** Directory names the source walkers do not enter. */
export const UNSHIPPED_SOURCE_DIRS = new Set([ "carbon-donor", "dropped" ]);

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
