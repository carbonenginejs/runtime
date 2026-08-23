import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");
const FSD_ROOT = path.join(PACKAGE_ROOT, "npm", "dist", "resource", "formats", "fsd");
const FORMAT_BASE = path.join(PACKAGE_ROOT, "npm", "dist", "resource", "format", "CjsFormat.js");

test("the built FSD entry imports directly and identifies synthetic modern bytes", async () =>
{
    const entry = path.join(FSD_ROOT, "index.js");
    const { CjsFsdFormat } = await import(pathToFileURL(entry).href);
    const bytes = new Uint8Array(40);

    new DataView(bytes.buffer).setBigUint64(24, 8n, true);

    assert.equal(CjsFsdFormat.inspect(bytes).variant, "cfsd64");
});

test("built FSD entry graphs stay inside the FSD subtree", async () =>
{
    for (const relative of [ "index.js", "64/readers/index.js" ])
    {
        const entry = path.join(FSD_ROOT, relative);
        const graph = await ReadRelativeModuleGraph(entry);

        assert.ok(graph.has(entry));
        for (const modulePath of graph)
        {
            assert.equal(
                IsWithin(FSD_ROOT, modulePath) || modulePath === FORMAT_BASE,
                true,
                `${relative} reached unrelated built module ${modulePath}`,
            );
        }
    }
});

async function ReadRelativeModuleGraph(entry)
{
    const visited = new Set();
    const pending = [ entry ];

    while (pending.length)
    {
        const modulePath = pending.pop();
        if (visited.has(modulePath)) continue;

        visited.add(modulePath);
        const source = await readFile(modulePath, "utf8");

        for (const specifier of ModuleSpecifiers(source))
        {
            if (!specifier.startsWith(".")) continue;
            const resolved = path.resolve(path.dirname(modulePath), specifier);

            assert.equal(
                IsWithin(FSD_ROOT, resolved) || resolved === FORMAT_BASE,
                true,
                `${modulePath} imports outside the FSD subtree: ${specifier}`,
            );
            pending.push(resolved);
        }
    }

    return visited;
}

function ModuleSpecifiers(source)
{
    const values = [];
    const staticPattern = /(?:import|export)\s+(?:[^"'()]*?\s+from\s*)?["']([^"']+)["']/g;
    const dynamicPattern = /import\(\s*["']([^"']+)["']\s*\)/g;

    for (const pattern of [ staticPattern, dynamicPattern ])
    {
        let match;
        while ((match = pattern.exec(source))) values.push(match[1]);
    }

    return values;
}

function IsWithin(root, candidate)
{
    const relative = path.relative(root, candidate);
    return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
