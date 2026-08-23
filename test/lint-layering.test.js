import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { validateLayering } from "../scripts/layering.js";

const BASE_LAYERS = {
    "global/contracts": { mayImport: [] },
    "global/utils": { mayImport: [] },
    resource: { mayImport: [ "global/contracts", "global/utils" ] },
    trinity: { mayImport: [ "global/contracts", "global/utils", "resource" ] },
    "engine/webgpu": { mayImport: [ "global/contracts", "global/utils", "resource", "trinity" ] },
    "engine/webgl": { mayImport: [ "global/contracts", "global/utils", "resource", "trinity" ] },
    core: { mayImport: [ "global/contracts", "global/utils", "resource", "trinity", "engine/webgpu", "engine/webgl" ] },
    tools: { mayImport: [ "global/contracts", "global/utils", "resource", "trinity", "engine/webgpu", "engine/webgl", "core" ] }
};

const BASE_IMPORTS = {
    "#contracts": "./src/global/contracts/index.js",
    "#contracts/*": "./src/global/contracts/*.js",
    "#trinity": "./src/trinity/index.js",
    "#engine/webgpu/*": "./src/engine/webgpu/*.js",
    "#engine/webgl/*": "./src/engine/webgl/*.js",
    "#engine/*": "./src/engine/*/index.js"
};

async function put(root, path, contents = "")
{
    const target = join(root, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, contents, "utf8");
}

async function fixture(t, options = {})
{
    const root = await mkdtemp(join(tmpdir(), "cjs-runtime-layering-"));
    t.after(() => rm(root, { recursive: true, force: true }));

    const layers = structuredClone(options.layers ?? BASE_LAYERS);
    const surfaces = options.surfaces ?? { "index.js": { mayImport: [] } };
    const manifest = {
        name: "@carbonenginejs/runtime-test",
        type: "module",
        exports: { ".": "./src/index.js", ...(options.exports ?? {}) },
        imports: { ...BASE_IMPORTS, ...(options.imports ?? {}) }
    };

    await put(root, "package.json", JSON.stringify(manifest));
    await put(root, "layers.json", JSON.stringify({ surfaces, layers }));
    await put(root, "src/index.js");
    for (const layer of Object.keys(layers)) await put(root, `src/${layer}/index.js`);
    for (const [ path, source ] of Object.entries(options.files ?? {})) await put(root, `src/${path}`, source);
    return root;
}

test("the checked-in runtime graph is valid", async () =>
{
    const result = await validateLayering();
    assert.deepEqual(result.problems, []);
});

test("nested engine layers use the longest configured prefix and alias", async t =>
{
    const root = await fixture(t, {
        files: {
            "engine/webgpu/helper.js": "export const helper = true;",
            "engine/webgpu/index.js": `
                import "../../trinity/index.js";
                export * from "#contracts";
                export { helper } from "#engine/webgpu/helper";
                await import("#trinity");
            `
        }
    });

    assert.deepEqual((await validateLayering({ root })).problems, []);
});

test("sibling engines, core, and tools remain forbidden engine dependencies", async t =>
{
    const root = await fixture(t, {
        files: {
            "engine/webgpu/index.js": `
                import "#engine/webgl/index";
                export * from "../../core/index.js";
                import "../../tools/index.js";
            `
        }
    });
    const problems = (await validateLayering({ root })).problems.join("\n");

    assert.match(problems, /"engine\/webgpu" may not import "engine\/webgl"/u);
    assert.match(problems, /"engine\/webgpu" may not import "core"/u);
    assert.match(problems, /"engine\/webgpu" may not import "tools"/u);
});

test("relative imports must resolve exactly inside src", async t =>
{
    const root = await fixture(t, {
        files: {
            "trinity/index.js": `
                import "../missing.js";
                export * from "../../outside.js";
            `
        }
    });
    const problems = (await validateLayering({ root })).problems.join("\n");

    assert.match(problems, /does not resolve exactly/u);
    assert.match(problems, /escapes src/u);
});

test("all static module forms are scanned and nonliteral dynamic imports fail", async t =>
{
    const root = await fixture(t, {
        files: {
            "engine/webgpu/index.js": `
                import {
                    value
                } from "../../core/index.js";
                import "../../tools/index.js";
                export {
                    value as other
                } from "../../core/index.js";
                export * from "../../tools/index.js";
                const literal = import("../../core/index.js");
                const target = "../../core/index.js";
                const dynamic = import(target);
            `
        }
    });
    const problems = (await validateLayering({ root })).problems.join("\n");

    assert.match(problems, /may not import "core"/u);
    assert.match(problems, /may not import "tools"/u);
    assert.match(problems, /dynamic import must use a literal module specifier/u);
});

test("every conditional import-map branch is enforced", async t =>
{
    const root = await fixture(t, {
        imports: {
            "#conditional": {
                browser: "./src/trinity/index.js",
                default: "./src/core/index.js"
            }
        },
        files: {
            "engine/webgpu/index.js": "import '#conditional';"
        }
    });
    const problems = (await validateLayering({ root })).problems.join("\n");

    assert.match(problems, /may not import "core"/u);
});

test("layer configuration rejects unknown edges, self edges, and cycles", async t =>
{
    const layers = structuredClone(BASE_LAYERS);
    layers.resource.mayImport.push("resource", "missing", "trinity");
    const root = await fixture(t, { layers });
    const problems = (await validateLayering({ root })).problems.join("\n");

    assert.match(problems, /imports itself/u);
    assert.match(problems, /unknown layer "missing"/u);
    assert.match(problems, /cycle:/u);
});

test("package maps reject pseudo-comment keys and dangling wildcard roots", async t =>
{
    const root = await fixture(t, {
        exports: {
            "//comment": [],
            "./missing/*": "./src/not-there/*.js"
        },
        imports: {
            "//comment": []
        }
    });
    const problems = (await validateLayering({ root })).problems.join("\n");

    assert.match(problems, /exports has invalid key "\/\/comment"/u);
    assert.match(problems, /imports has invalid key "\/\/comment"/u);
    assert.match(problems, /\.\/missing\/\*.*does not exist/u);
});

test("aggregate surfaces use an exhaustive layer allow-list", async t =>
{
    const root = await fixture(t, {
        surfaces: { "index.js": { mayImport: [ "core" ] } },
        files: {
            "index.js": `
                export * from "./core/index.js";
                await import("./tools/index.js");
            `
        }
    });
    const problems = (await validateLayering({ root })).problems.join("\n");

    assert.match(problems, /surface "index\.js" may not import "tools"/u);
    assert.doesNotMatch(problems, /may not import "core"/u);
});
