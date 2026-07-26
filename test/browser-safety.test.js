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
        // Documentation is scanned out first: a sentence about buffered events
        // or a process is prose, not a Node global, and a comment cannot import
        // anything.
        const source = withoutComments(await fs.readFile(file, "utf8"));

        assert.doesNotMatch(source, /(?:from|import\s*\()\s*["']node:/u, file);
        assert.doesNotMatch(source, /\bBuffer\b|\bprocess\b|\brequire\s*\(/u, file);
        assert.doesNotMatch(
            source,
            /(?:from|import\s*\()\s*["']@carbonenginejs\/(?!runtime-(?:audio|resource|utils)(?:\/|["']))/u,
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

test("every public subpath imports independently", async () =>
{
    for (const name of [ "audio", "chat", "fileindex", "realtime" ])
    {
        const module = await import(`@carbonenginejs/tools-browser/${name}`);

        assert.ok(Object.keys(module).length > 0, name);
    }

    const root = await import("@carbonenginejs/tools-browser");

    assert.ok(Object.keys(root).length > 0, "root");
});
