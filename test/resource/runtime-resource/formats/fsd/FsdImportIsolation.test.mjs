import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");
const FSD_ROOT = path.join(PACKAGE_ROOT, "npm", "dist", "resource", "formats", "fsd");
// Table headers reuse Carbon's existing type vocabulary and its pure helpers.
// FsdObject inherits Carbon's IRoot; admit its query/logging leaves, not Blue services or bootstrap.
const SHARED_FORMAT_MODULES = new Set([
    "global/blue/IRoot.js",
    "global/compose/interface.js",
    "global/consts/ccpLog.js",
    "global/logging/CcpLogChannel_t.js",
    "global/logging/ccpLog.js",
    "resource/format/CjsFormat.js",
    "resource/format/CjsTableData.js",
    "global/schema/types/carbonTypes.js",
    "global/utils/bytes.js",
    "global/utils/is.js",
    "global/math/num.js",
].map(name => path.join(PACKAGE_ROOT, "npm", "dist", name)));

test("the built FSD entry imports directly and identifies synthetic modern bytes", async () =>
{
    const entry = path.join(FSD_ROOT, "index.js");
    const { CjsFsdFormat } = await import(pathToFileURL(entry).href);
    const bytes = new Uint8Array(40);

    new DataView(bytes.buffer).setBigUint64(24, 8n, true);

    assert.equal(CjsFsdFormat.inspect(bytes).variant, "cfsd64");
});

test("built FSD entry graphs use only FSD and the admitted shared format helpers", async () =>
{
    for (const relative of [ "index.js" ])
    {
        const entry = path.join(FSD_ROOT, relative);
        const graph = await ReadRelativeModuleGraph(entry);

        assert.ok(graph.has(entry));
        for (const modulePath of graph)
        {
            assert.equal(
                IsWithin(FSD_ROOT, modulePath) || SHARED_FORMAT_MODULES.has(modulePath),
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
                IsWithin(FSD_ROOT, resolved) || SHARED_FORMAT_MODULES.has(resolved),
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
