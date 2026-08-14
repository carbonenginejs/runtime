import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_ROOT = path.join(PACKAGE_ROOT, "src");

const PACKAGE_IMPORT = /(?:from\s+|import\s*\()\s*["'](@carbonenginejs\/[^"']+)["']/gu;
const FORBIDDEN_RUNTIME_DEPENDENCY = /^@carbonenginejs\/(?:engine-|runtime-resource(?:\/|$)|tools-(?:browser|core)(?:\/|$))/u;
const LIVE_GPU_OPERATIONS = [
    /\bWebGL2?RenderingContext\b/u,
    /\bGPU(?:Adapter|BindGroup|Buffer|CommandEncoder|Device|Pipeline|Queue|Texture)\b/u,
    /\.create(?:BindGroup|Buffer|CommandEncoder|ComputePipeline|RenderPipeline|Texture)\s*\(/u,
    /\.(?:bufferData|drawArrays|drawElements|texImage2D)\s*\(/u
];

test("runtime-character source has no engine or concrete GPU dependency", async () =>
{
    const files = await ListJavaScriptFiles(SOURCE_ROOT);
    const failures = [];

    for (const filePath of files)
    {
        const source = await readFile(filePath, "utf8");

        for (const match of source.matchAll(PACKAGE_IMPORT))
        {
            if (FORBIDDEN_RUNTIME_DEPENDENCY.test(match[1]))
            {
                failures.push(`${Relative(filePath)} imports ${match[1]}`);
            }
        }

        for (const operation of LIVE_GPU_OPERATIONS)
        {
            if (operation.test(source))
            {
                failures.push(`${Relative(filePath)} matches ${operation}`);
            }
        }
    }

    assert.deepEqual(failures, []);
});

test("runtime-character production dependencies exclude resource, tool, and engine owners", async () =>
{
    const packageJson = JSON.parse(await readFile(
        path.join(PACKAGE_ROOT, "package.json"),
        "utf8"
    ));

    const failures = Object.keys(packageJson.dependencies ?? {})
        .filter(name => FORBIDDEN_RUNTIME_DEPENDENCY.test(name));

    assert.deepEqual(failures, []);
});

async function ListJavaScriptFiles(directory)
{
    const result = [];

    for (const entry of await readdir(directory, { withFileTypes: true }))
    {
        const filePath = path.join(directory, entry.name);
        if (entry.isDirectory())
        {
            result.push(...await ListJavaScriptFiles(filePath));
        }
        else if (entry.isFile() && entry.name.endsWith(".js"))
        {
            result.push(filePath);
        }
    }

    return result;
}

function Relative(filePath)
{
    return path.relative(PACKAGE_ROOT, filePath).replaceAll("\\", "/");
}
