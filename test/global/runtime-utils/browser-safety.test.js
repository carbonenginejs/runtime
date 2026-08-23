import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

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
        const code = source
            .replace(/\/\*[\s\S]*?\*\//gu, "")
            .replace(/^[ \t]*\/\/.*$/gmu, "");

        assert.doesNotMatch(code, /from\s+["']@carbonenginejs\//u, file);
        assert.doesNotMatch(code, /import\s*\(\s*["']@carbonenginejs\//u, file);
        assert.doesNotMatch(code, /from\s+["']node:/u, file);
        assert.doesNotMatch(code, /import\s*\(\s*["'`]node:/u, file);
        assert.doesNotMatch(code, /\bprocess\.(?:env|argv|platform|cwd|exit|versions)\b/u, file);
        assert.doesNotMatch(code, /new\s+Function\s*\([^)]*import\s*\(/u, file);

        for (const line of code.split("\n"))
        {
            const callsBuffer = /\bnew\s+Buffer\b|\bBuffer\s*\.\s*(?:from|alloc|allocUnsafe|concat|isBuffer)\b/u.test(line);
            assert.equal(callsBuffer && !/typeof\s+Buffer/u.test(line), false, file);
        }
    }
});

test("every built advertised subpath imports independently", async () =>
{
    const npmRoot = path.join(packageRoot, "npm");
    const manifest = JSON.parse(await fs.readFile(path.join(npmRoot, "package.json"), "utf8"));

    for (const [ name, target ] of Object.entries(manifest.exports))
    {
        if (name.includes("*") || typeof target !== "string") continue;
        const module = await import(pathToFileURL(path.resolve(npmRoot, target)).href);

        assert.equal(typeof module, "object", name);
    }
});

test("directory-backed internal aliases resolve to concrete foundation fronts", async () =>
{
    const aliases = [
        "#math/geometry",
        "#utils/errors",
        "#utils/resfile",
        "#consts/media",
        "#consts/graphics",
        "#consts/render-context",
        "#consts/audio",
        "#consts/shader",
        "#consts/d3d",
        "#consts/webgpu",
        "#schema/types",
        "#model/document",
        "#model/hydration",
        "#model/lifecycle"
    ];

    for (const name of aliases)
    {
        const module = await import(name);

        assert.ok(Object.keys(module).length > 0, name);
    }

    const types = await import("#schema/types");
    assert.equal("CjsSchema" in types, false, "#schema/types remains descriptor-only");
});
