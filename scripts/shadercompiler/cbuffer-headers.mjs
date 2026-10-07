// Writes the shader library's constant-buffer headers from the runtime's
// layout catalogs, so the HLSL and the engine's uploads come from one
// declaration.
//
//   node scripts/cbuffer-headers.mjs [runtime checkout]
//
// The runtime checkout defaults to CARBON_RUNTIME_ROOT, then to `runtime`
// beside this package in the organization checkout. The headers are committed;
// test/cbuffer-headers.test.js fails when they no longer match the catalog.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { CjsFxCBufferHeader } from "../../src/shadercompiler/library/CjsFxCBufferHeader.js";

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Where the headers go, and the include path shaders use for them. */
export const LIBRARY_ROOT = join(PACKAGE_ROOT, "src", "shadercompiler", "library");

/**
 * The runtime catalogs, each with Carbon's variable name per stage key (the
 * name selects the constant buffer slot) and the headers to write, one per
 * catalog group.
 *
 * Per-frame: a shader includes the family its scene binds. The families share
 * the variable names, and so the slots, but not their layouts
 * (CjsPerFrameLayouts.js:27-36).
 *
 * Per-object: a shader includes the group of the renderable that draws it.
 * Carbon moves PerObjectVS into b3, or b5 when it also carries a legacy
 * `register(vs, c180)` binding, and PerObjectPS into b4 (ParserUtils.cpp:523-561).
 */
const CATALOGS = [
    {
        file: "CjsPerFrameLayouts.js",
        exportName: "CjsPerFrameLayouts",
        variables: { vs: "PerFrameVS", ps: "PerFramePS" },
        slots: "Carbon's compiler moves a global named PerFrameVS into constant buffer b1\nand one named PerFramePS into b2 (shadercompiler ParserUtils.cpp:523-547).",
        filled: "each frame",
        headers: [
            { group: "Tr2PerFrame", path: "cbuffers/Tr2PerFrame.fxh" },
            { group: "Tr2PerFrameDebug", path: "cbuffers/Tr2PerFrameDebug.fxh" },
            { group: "Tr2PerFrameShadow", path: "cbuffers/Tr2PerFrameShadow.fxh" },
            { group: "EveSpaceScenePerFrame", path: "cbuffers/EveSpaceScenePerFrame.fxh" }
        ]
    },
    {
        file: "CjsPerObjectLayouts.js",
        exportName: "CjsPerObjectLayouts",
        variables: { vs: "PerObjectVS", ps: "PerObjectPS" },
        slots: "Carbon's compiler moves a global named PerObjectVS into constant buffer b3\nand one named PerObjectPS into b4 (shadercompiler ParserUtils.cpp:523-561).",
        filled: "for each draw",
        headers: [
            { group: "EveSpaceObject", path: "cbuffers/EveSpaceObject.fxh" }
        ]
    }
];

/**
 * HLSL struct types of the catalogs' nested members. The catalog writes the
 * member as `Sun.DirWorld`; Carbon declares it `SunData Sun`
 * (EveSpaceScene.h:218-223, :246, :314).
 */
const NESTED_TYPES = { Sun: "SunData" };

/**
 * The runtime checkout to read the catalogs from.
 *
 * @param {string} [root] An explicit checkout path.
 * @returns {string} The checkout path.
 */
export function runtimeRoot(root)
{
    return resolve(root ?? process.env.CARBON_RUNTIME_ROOT ?? PACKAGE_ROOT);
}

/**
 * Builds every header from the runtime checkout's catalogs.
 *
 * @param {string} root The runtime checkout.
 * @returns {Promise<Map<string, string>>} Header text by library path.
 */
export async function buildHeaders(root)
{
    const headers = new Map();
    for (const catalog of CATALOGS)
    {
        const catalogFile = join(root, "src", "trinity", "core", "rawData", catalog.file);
        const layouts = (await import(pathToFileURL(catalogFile).href))[catalog.exportName];
        for (const { group, path } of catalog.headers)
        {
            const buffers = layouts.Groups[group];
            if (!buffers)
            {
                throw new Error(`cbuffer-headers: ${catalog.exportName} has no group ${group}`);
            }
            const blocks = Object.entries(buffers).map(([key, buffer]) =>
            {
                const variable = catalog.variables[key];
                if (!variable)
                {
                    throw new Error(`cbuffer-headers: ${group} has a "${key}" buffer, which no ${catalog.exportName} variable takes`);
                }
                const resolved = layouts.Get(buffer.struct);
                return {
                    variable,
                    layout: {
                        struct: resolved.struct,
                        stride: resolved.stride,
                        fields: [...resolved.fields.values()].map(({ name, type, offset, count }) => ({ name, type, offset, count }))
                    }
                };
            });
            const stages = blocks.map(({ variable, layout }) => `${variable} (${layout.struct})`).join(" and ");
            headers.set(path, CjsFxCBufferHeader.write({
                guard: `${group.toUpperCase()}_FXH`,
                comment: [
                    "Generated by scripts/shadercompiler/cbuffer-headers.mjs from",
                    `@carbonenginejs/runtime ${catalog.exportName}.Groups.${group}. Do not edit;`,
                    "change the catalog and regenerate.",
                    "",
                    `Declares ${stages}.`,
                    ...catalog.slots.split("\n"),
                    `The engine fills them ${catalog.filled} by copying Carbon's C++ structs, whose`,
                    "layout the comments give: the register and component each member starts at.",
                    "Matrices are column_major; the engine stores each one transposed."
                ],
                blocks,
                nestedTypes: NESTED_TYPES
            }));
        }
    }
    return headers;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
{
    const headers = await buildHeaders(runtimeRoot(process.argv[2]));
    for (const [path, text] of headers)
    {
        const file = join(LIBRARY_ROOT, path);
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, text);
        console.log(`wrote library/${path}`);
    }
}
