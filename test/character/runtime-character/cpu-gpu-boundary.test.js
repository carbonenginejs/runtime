import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const SOURCE_ROOT = path.join(PACKAGE_ROOT, "src", "character");

const PACKAGE_IMPORT = /(?:from\s+|import\s*\()\s*["'](#[^"']+)["']/gu;
const FORBIDDEN_RUNTIME_DEPENDENCY = /^#(?:engine|core|tools|audio|sof|input)(?:\/|$)/u;
const RESOURCE_DEPENDENCY = /^#resource(?:\/|$)/u;
const NODE_FILE_DEPENDENCY = /(?:from\s+|import\s*\()\s*["'](?:node:)?(?:fs|path|os|child_process)["']/u;
const LEGACY_TW2_GLOBAL_ACCESS = /(?:import\s*\{\s*tw2\s*\}\s*from\s*["']global["']|\btw2\s*(?:\?\.|\.))/u;
const BACKEND_DIRECTORIES = new Set([ "gles", "webgl2", "webgpu" ]);
const LIVE_GPU_OPERATIONS = [
    /\bWebGL2?RenderingContext\b/u,
    /\bGPU(?:Adapter|BindGroup|Buffer|CommandEncoder|Device|Pipeline|Queue|Texture)\b/u,
    /\.create(?:BindGroup|Buffer|CommandEncoder|ComputePipeline|RenderPipeline|Texture)\s*\(/u,
    /\.(?:bufferData|drawArrays|drawElements|texImage2D)\s*\(/u
];

test("the character CPU/data layer stays backend- and Node-loader-free", async () =>
{
    const files = await ListJavaScriptFiles(SOURCE_ROOT);
    const failures = [];

    for (const filePath of files)
    {
        const source = await readFile(filePath, "utf8");
        const backendRealizer = IsBackendRealizer(filePath);

        for (const match of source.matchAll(PACKAGE_IMPORT))
        {
            if (FORBIDDEN_RUNTIME_DEPENDENCY.test(match[1]))
            {
                failures.push(`${Relative(filePath)} imports ${match[1]}`);
            }
            if (RESOURCE_DEPENDENCY.test(match[1])
                && !Relative(filePath).startsWith("src/character/library-builder/"))
            {
                failures.push(
                    `${Relative(filePath)} imports ${match[1]} outside library-builder`,
                );
            }
        }
        if (NODE_FILE_DEPENDENCY.test(source))
        {
            failures.push(`${Relative(filePath)} imports a Node local-file dependency`);
        }
        if (backendRealizer && LEGACY_TW2_GLOBAL_ACCESS.test(source))
        {
            failures.push(`${Relative(filePath)} reaches for the legacy Tw2 global facade`);
        }

        if (!backendRealizer) for (const operation of LIVE_GPU_OPERATIONS)
        {
            if (operation.test(source))
            {
                failures.push(`${Relative(filePath)} matches ${operation}`);
            }
        }
    }

    assert.deepEqual(failures, []);
});

test("the character layer contract excludes upper and sibling runtime layers", async () =>
{
    const layers = JSON.parse(await readFile(
        path.join(PACKAGE_ROOT, "layers.json"),
        "utf8"
    ));

    const allowed = layers.layers.character.mayImport;
    const failures = allowed.filter(name => [
        "audio",
        "sof",
        "input",
        "engine/webgpu",
        "core",
        "tools"
    ].includes(name));

    assert.deepEqual(failures, []);
});

test("the root character entry point remains CPU/data-only", async () =>
{
    const source = await readFile(path.join(SOURCE_ROOT, "index.js"), "utf8");

    for (const directory of BACKEND_DIRECTORIES)
    {
        assert.equal(source.includes(`./${directory}/`), false);
    }
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

function IsBackendRealizer(filePath)
{
    const relative = path.relative(SOURCE_ROOT, filePath);
    return BACKEND_DIRECTORIES.has(relative.split(path.sep)[0]);
}
