import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("published source is organization-independent and browser-safe", async () =>
{
    const sourceRoot = path.join(packageRoot, "src");
    const pending = [ sourceRoot ];
    const files = [];

    while (pending.length)
    {
        const directory = pending.pop();

        for (const entry of await fs.readdir(directory, { withFileTypes: true }))
        {
            const target = path.join(directory, entry.name);

            if (entry.isDirectory()) pending.push(target);
            if (entry.isFile() && entry.name.endsWith(".js")) files.push(target);
        }
    }

    for (const file of files)
    {
        const source = await fs.readFile(file, "utf8");

        assert.doesNotMatch(source, /["']@carbonenginejs\//u, file);
        assert.doesNotMatch(source, /(?:from|import\s*\()\s*["']node:/u, file);
        assert.doesNotMatch(source, /\bBuffer\b|\bprocess\b|\brequire\s*\(/u, file);
    }
});

test("every advertised subpath imports independently", async () =>
{
    const manifest = JSON.parse(await fs.readFile(path.join(packageRoot, "package.json"), "utf8"));
    const modules = Object.keys(manifest.exports)
        .filter(name => name !== ".")
        .map(name => name.slice(2));

    for (const name of modules)
    {
        const module = await import(`@carbonenginejs/runtime-utils/${name}`);

        assert.ok(Object.keys(module).length > 0, name);
    }

    const root = await import("@carbonenginejs/runtime-utils");

    assert.ok(Object.keys(root).length > 0, "root");
});
