import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("published source has no Node-only imports or globals", async () =>
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

        assert.doesNotMatch(source, /(?:from|import\s*\()\s*["']node:/u, file);
        assert.doesNotMatch(source, /\bBuffer\b|\bprocess\b|\brequire\s*\(/u, file);
        assert.doesNotMatch(
            source,
            /@carbonenginejs\/(?!runtime-utils(?:\/|["']))/u,
            `${file} imports outside the allowed runtime-utils boundary.`
        );
    }
});

test("every public subpath imports independently", async () =>
{
    for (const name of [ "chat", "fileindex", "realtime" ])
    {
        const module = await import(`@carbonenginejs/tools-browser/${name}`);

        assert.ok(Object.keys(module).length > 0, name);
    }

    const root = await import("@carbonenginejs/tools-browser");

    assert.ok(Object.keys(root).length > 0, "root");
});
