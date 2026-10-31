// Imports every module of the built runtime (npm/dist), so every class that registers itself is registered.
// Used where a check must cover every registered class: the decorator metadata dump and the class-info store test.
import { readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** The built runtime's root. */
export const DIST = join(dirname(fileURLToPath(import.meta.url)), "../../npm/dist");

/**
 * Every importable module under `dir`: workers and bundled or minified files are left out, as they start threads or
 * duplicate classes.
 *
 * @param {string} dir Directory to walk.
 * @param {string[]} [files=[]] Accumulator.
 * @returns {string[]} Absolute paths, unsorted.
 */
function walk(dir, files = [])
{
  for (const entry of readdirSync(dir, { withFileTypes: true }))
  {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) { if (entry.name !== "workers") walk(full, files); }
    else if (entry.name.endsWith(".js") && !/worker|\.min\.|bundle/i.test(entry.name)) files.push(full);
  }
  return files;
}

/**
 * Imports every module of the built runtime, in path order, and returns how many there were.
 *
 * @returns {Promise<number>} Module count.
 */
export async function ImportAllDistModules()
{
  const files = walk(DIST).sort();
  for (let i = 0; i < files.length; i++) await import(pathToFileURL(files[i]).href);
  return files.length;
}

/**
 * Imports one module of the built runtime by its path under npm/dist.
 *
 * @param {string} path Path under npm/dist, e.g. "global/schema/CjsSchema.js".
 * @returns {Promise<object>} The module.
 */
export function ImportDist(path)
{
  return import(pathToFileURL(join(DIST, path)).href);
}
