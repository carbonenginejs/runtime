// Compiles every effect in the shader library for WebGPU and writes the
// containers as the engine asks for them:
//
//   node scripts/shadercompiler/compile-library.mjs <out directory>
//
// `library/<dir>/<name>.fx` becomes `<out>/graphics/effect.webgpu/cjs/<dir>/<name>.<sm>`
// for each of `.sm_hi`, `.sm_lo` and `.sm_depth`. Trinity picks the suffix from
// one renderer-wide shader model (Tr2Effect.cpp:353-363); the library's
// effects do not vary by it, so the three files hold the same container. An
// effect is referenced as `res:/graphics/effect/cjs/<dir>/<name>.fx`, which
// ResolveEffectPath (global/utils/effectPath.js) maps to these files. The
// output folder is what a tools-core overlay imports to serve them.

import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CompileEffectFile } from "../../src/shadercompiler/ShaderCompiler/shaderCompiler.js";
import { Platform } from "../../src/shadercompiler/platforms.js";
import { CjsFxEffectCompilerWebGPU } from "../../src/shadercompiler/EffectCompilerWebGPU/index.js";
import { LIBRARY_ROOT } from "./cbuffer-headers.mjs";

/** The containers each effect is written as. */
const SHADER_MODELS = ["sm_hi", "sm_lo", "sm_depth"];

/**
 * Every effect file under a directory, as paths relative to it.
 *
 * @param {string} directory The library directory.
 * @returns {string[]} The `.fx` paths, with forward slashes.
 */
function effectFiles(directory)
{
    const found = [];
    const walk = current =>
    {
        for (const name of readdirSync(current))
        {
            const path = join(current, name);
            if (statSync(path).isDirectory())
            {
                walk(path);
            }
            else if (name.endsWith(".fx"))
            {
                found.push(relative(directory, path).split("\\").join("/"));
            }
        }
    };
    walk(directory);
    return found.sort();
}

/**
 * Compiles the library into `outDirectory`.
 *
 * @param {string} outDirectory Where `graphics/effect.webgpu/...` is written.
 * @returns {{ path: string, bytes: number }[]} The files written, by logical path.
 */
export function compileLibrary(outDirectory)
{
    const read = path =>
    {
        const file = join(LIBRARY_ROOT, path.replace(/^\//u, ""));
        return existsSync(file) ? readFileSync(file, "utf8") : null;
    };
    const compilers = new Map([[Platform.PLATFORM_WEBGPU, session => new CjsFxEffectCompilerWebGPU(session)]]);
    const written = [];
    for (const effect of effectFiles(LIBRARY_ROOT))
    {
        const { bytes, messages } = CompileEffectFile(`/${effect}`, { read, compilers });
        if (!bytes)
        {
            throw new Error(`${effect} did not compile:\n${messages.join("\n")}`);
        }
        const base = effect.replace(/\.fx$/u, "");
        for (const model of SHADER_MODELS)
        {
            const path = `graphics/effect.webgpu/cjs/${base}.${model}`;
            const file = join(outDirectory, path);
            mkdirSync(dirname(file), { recursive: true });
            writeFileSync(file, bytes);
            written.push({ path, bytes: bytes.length });
        }
    }
    return written;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
{
    const out = process.argv[2];
    if (!out)
    {
        console.error("usage: node scripts/shadercompiler/compile-library.mjs <out directory>");
        process.exit(1);
    }
    for (const { path, bytes } of compileLibrary(resolve(out)))
    {
        console.log(`res:/${path} (${bytes} bytes)`);
    }
}
