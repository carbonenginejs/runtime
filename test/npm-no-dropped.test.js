// Dropped folders (src/**/dropped/) are quarantine: never built, shipped or exported (port-carbon-to-js, Dropped).
// This fails when a dropped path reaches the built package, its exports or files, or an import in dist.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const npmRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "npm");
const dist = path.join(npmRoot, "dist");
const isDropped = value => value.split(/[\\/]/u).includes("dropped");

/**
 * Every path under a directory, relative to it.
 *
 * @param {string} directory Directory to walk.
 * @param {string} [prefix=""] Relative prefix.
 * @returns {Promise<string[]>} Relative paths of files and directories.
 */
async function walk(directory, prefix = "")
{
    const found = [];
    for (const entry of await fs.readdir(directory, { withFileTypes: true }))
    {
        const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
        found.push(relative);
        if (entry.isDirectory()) found.push(...await walk(path.join(directory, entry.name), relative));
    }
    return found;
}

/**
 * Every string inside a JSON value.
 *
 * @param {*} value Parsed JSON.
 * @returns {string[]} Its keys and string leaves.
 */
function strings(value)
{
    if (typeof value === "string") return [ value ];
    if (Array.isArray(value)) return value.flatMap(strings);
    if (value !== null && typeof value === "object") return Object.entries(value).flatMap(([ key, item ]) => [ key, ...strings(item) ]);
    return [];
}

test("npm/dist holds no dropped path", async () =>
{
    const paths = await walk(dist);
    assert.deepEqual(paths.filter(isDropped), []);
});

test("the package's exports and files name no dropped path", async () =>
{
    const manifest = JSON.parse(await fs.readFile(path.join(npmRoot, "package.json"), "utf8"));
    assert.deepEqual(strings(manifest.exports ?? {}).filter(isDropped), []);
    assert.deepEqual(strings(manifest.files ?? []).filter(isDropped), []);
});

test("no module in npm/dist imports from a dropped folder", async () =>
{
    const specifier = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)["']([^"']+)["']/gu;
    const offenders = [];
    for (const relative of await walk(dist))
    {
        if (!relative.endsWith(".js")) continue;
        const source = await fs.readFile(path.join(dist, relative), "utf8");
        for (const match of source.matchAll(specifier)) if (isDropped(match[1])) offenders.push(`${relative}: ${match[1]}`);
    }
    assert.deepEqual(offenders, []);
});
