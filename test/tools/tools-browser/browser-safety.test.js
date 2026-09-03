import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const npmRoot = path.join(packageRoot, "npm");

test("published source has no Node-only imports or globals", async () =>
{
    const sourceRoot = path.join(packageRoot, "src", "tools");
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
        // Documentation is scanned out first: a sentence about buffered events
        // or a process is prose, not a Node global, and a comment cannot import
        // anything.
        const source = withoutComments(await fs.readFile(file, "utf8"));

        assert.doesNotMatch(source, /(?:from|import\s*\()\s*["']node:/u, file);
        assert.doesNotMatch(source, /\bBuffer\b|\bprocess\b|\brequire\s*\(/u, file);
        // Combined-runtime source uses checked internal aliases. Reintroducing
        // donor package imports would bypass the executable layer graph.
        assert.doesNotMatch(
            source,
            /(?:from|import\s*\()\s*["']@carbonenginejs\//u,
            `${file} imports outside the allowed browser runtime boundary.`
        );
    }
});

test("the comment scan still sees violations in code", () =>
{
    const source = [
        "/** Buffer ceiling during snapshot recovery, and a process of resync. */",
        "// require( something ) in a line comment",
        "import fs from \"node:fs\";",
        "const url = \"https://example.test/a//b\";",
    ].join("\n");

    const scanned = withoutComments(source);

    assert.doesNotMatch(scanned, /ceiling|resync|line comment/u, "comments are removed");
    assert.match(scanned, /(?:from|import\s*\()\s*["']node:/u, "a real import still matches");
    assert.match(scanned, /example\.test\/a\/\/b/u, "a URL inside a string survives");
});

/**
 * Removes block comments and whole-line comments, leaving code and string
 * literals intact. A trailing comment after code is left alone rather than
 * risking a `//` inside a string literal, which would swallow real code.
 *
 * @param {string} source Module source text.
 * @returns {string} Source with documentation removed.
 */
function withoutComments(source)
{
    return source
        .replace(/\/\*[\s\S]*?\*\//gu, " ")
        .split(/\r?\n/u)
        .filter(line => !line.trim().startsWith("//"))
        .join("\n");
}

test("the combined manifest exposes focused tools without a tools-core dependency", async () =>
{
    const manifest = JSON.parse(await fs.readFile(path.join(packageRoot, "package.json"), "utf8"));

    assert.equal(manifest.dependencies?.["@carbonenginejs/tools-core"], undefined);
    assert.equal(manifest.exports["./tools/fileindex"], "./src/tools/fileindex/index.js");
    assert.equal(Object.hasOwn(manifest, "sideEffects"), false);

    // The demo suite left for carbonenginejs/demos on 2026-08-30, and the
    // realtime client wire followed it there. These subpaths are asserted
    // absent rather than merely deleted, because a reintroduced one would be
    // a demo creeping back into the runtime.
    for (const gone of [
        "./tools/realtime",
        "./tools/realtime/wire",
        "./tools/chat",
        "./tools/demo-apps",
        "./tools/demos",
        "./tools/diagrams",
        "./tools/market",
        "./tools/market/ui",
        "./tools/market/ui.css",
        "./tools/perobject",
        "./tools/ship-show-info",
        "./tools/ship-show-info/ui",
        "./tools/ship-show-info/ui.css",
        "./tools/ship-tree",
        "./tools/ship-tree/ui",
        "./tools/ship-tree/ui.css",
        "./tools/theme/eve.css"
    ])
    {
        assert.equal(manifest.exports[gone], undefined, gone);
    }
});

test("every JavaScript public subpath imports independently", async () =>
{
    for (const name of [
        "fileindex"
    ])
    {
        const module = await import(`@carbonenginejs/runtime/tools/${name}`);

        assert.ok(Object.keys(module).length > 0, name);
    }

    const root = await import("../../../npm/dist/tools/index.js");
    const aggregate = await import("../../../npm/dist/index.js");

    assert.ok(Object.keys(root).length > 0, "root");

    // Tools stay off the aggregate surface, and realtime is gone entirely --
    // both halves of that protocol live in carbonenginejs/demos now.
    assert.equal(aggregate.CjsFileIndex, undefined);
    assert.equal(aggregate.CjsRealtimeProtocol, undefined);
    assert.equal(root.CjsRealtimeProtocol, undefined);
    assert.equal(root.CjsRealtimeClient, undefined);
    assert.equal(root.TnyMarketWindow, undefined);
    assert.equal(root.TnyShipTreeWindow, undefined);
});
