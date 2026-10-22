import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const IMPORTS = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).imports || {};
const STATIC_IMPORT = /\b(?:import|export)\b[^"';]*?\bfrom\s*["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']\s*\)|^\s*import\s*["']([^"']+)["']/gm;

/**
 * Resolves an import specifier of a source file to a file under src/, or null.
 *
 * @param {string} specifier The import specifier.
 * @param {string} from The importing file.
 * @returns {string|null} The resolved file.
 */
function resolve(specifier, from)
{
    let target = null;
    if (specifier.startsWith("."))
    {
        target = path.resolve(path.dirname(from), specifier);
    }
    else if (specifier.startsWith("#"))
    {
        const exact = IMPORTS[specifier];
        if (typeof exact === "string") target = path.resolve(ROOT, exact);
        else
        {
            for (const [pattern, value] of Object.entries(IMPORTS))
            {
                if (!pattern.endsWith("/*") || typeof value !== "string") continue;
                const prefix = pattern.slice(0, -1);
                if (specifier.startsWith(prefix)) target = path.resolve(ROOT, value.replace("*", specifier.slice(prefix.length)));
            }
        }
    }
    if (!target) return null;
    for (const candidate of [target, target + ".js", path.join(target, "index.js")])
    {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
    }
    return null;
}

/**
 * Collects the files under test/ that Node runs, without the demo bundles.
 *
 * @param {string} directory The directory to walk.
 * @returns {string[]} Test and helper files.
 */
function listTestFiles(directory)
{
    const files = [];
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }))
    {
        const full = path.join(directory, entry.name);
        if (entry.isDirectory()) { if (entry.name !== "demo" && entry.name !== "node_modules") files.push(...listTestFiles(full)); }
        else if (/\.(?:m?js)$/.test(entry.name) && !/bundle/.test(entry.name)) files.push(full);
    }
    return files;
}

test("every src file a test imports as raw source parses without decorator syntax", () =>
{
    const srcRoot = path.join(ROOT, "src") + path.sep;
    const entries = new Set();
    for (const file of listTestFiles(path.join(ROOT, "test")))
    {
        const source = fs.readFileSync(file, "utf8");
        for (const match of source.matchAll(STATIC_IMPORT))
        {
            const specifier = match[1] || match[2] || match[3];
            if (!specifier || !specifier.startsWith(".")) continue;
            const resolved = resolve(specifier, file);
            if (resolved && resolved.startsWith(srcRoot)) entries.add(resolved);
        }
    }
    assert.ok(entries.size > 100, "the scan must find the tests' raw src imports");

    const seen = new Set();
    const failures = [];
    const queue = [...entries];
    while (queue.length)
    {
        const file = queue.pop();
        if (seen.has(file)) continue;
        seen.add(file);
        const source = fs.readFileSync(file, "utf8");
        try { parse(source, { sourceType: "module" }); }
        catch (error) { failures.push(`${path.relative(ROOT, file)}: ${error.message}`); continue; }
        for (const match of source.matchAll(STATIC_IMPORT))
        {
            const specifier = match[1] || match[2] || match[3];
            const resolved = specifier && resolve(specifier, file);
            if (resolved && resolved.startsWith(srcRoot) && /.m?js$/.test(resolved)) queue.push(resolved);
        }
    }
    assert.deepEqual(failures, [], "raw-imported source must stay plain JavaScript; use decorateField/decorateMethod and be.define(\"X\")(X)");
});
