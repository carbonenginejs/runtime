// Rebuilds tools-core's one overlay of our own shaders from the library:
//
//   node scripts/shadercompiler/update-overlay.mjs [--tools-core <dir>]
//
// All of our own shaders live in ONE overlay, `cjs-shader-compiled`, rebuilt
// whole from the library and never imported effect by effect (operator,
// 2026-10-25; /docs/architecture/effect-read-path.md). Only the library files
// git tracks are compiled, so local experiments left in the library folder are
// never published.
//
// The overlay is replaced through tools-core's own importer, which addresses
// each file by content (fnv1 of the path, md5 of the bytes). tools-core reads
// overlays when it starts, so restart the service afterwards; that is left to
// the caller because running sessions are told before a restart.

import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compileLibrary } from "./compile-library.mjs";

const OVERLAY = "cjs-shader-compiled";
const RUNTIME_ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const LIBRARY = "src/shadercompiler/library";

const toolsCoreFlag = process.argv.indexOf("--tools-core");
const toolsCore = resolve(toolsCoreFlag >= 0 ? process.argv[toolsCoreFlag + 1] : join(RUNTIME_ROOT, "..", "tools-core"));

const git = (...args) => execFileSync("git", args, { cwd: RUNTIME_ROOT, encoding: "utf8" }).trim();
const effects = git("ls-files", "--", `${LIBRARY}/*.fx`, `${LIBRARY}/**/*.fx`)
    .split("\n").filter(Boolean).map(path => path.slice(LIBRARY.length + 1)).sort();
const commit = git("rev-parse", "--short", "HEAD");
const dirty = git("status", "--porcelain", "--", LIBRARY).split("\n").some(line => line && !line.startsWith("??"));

const out = mkdtempSync(join(tmpdir(), "cjs-shader-compiled-"));
try
{
    const written = compileLibrary(out, effects);
    console.log(`compiled ${effects.length} effects, ${written.length} files, at runtime ${commit}${dirty ? " with uncommitted library changes" : ""}`);

    const result = spawnSync(process.execPath, [
        join(toolsCore, "bin", "cjs-overlay-import.js"),
        "--name", OVERLAY,
        "--mode", "fallback",
        "--dir", out,
        "--replace",
        "--data", join(toolsCore, "data.local"),
        "--purpose", `Automatic: every tracked effect in runtime src/shadercompiler/library, compiled for WebGPU by `
            + `runtime scripts/shadercompiler/update-overlay.mjs (runtime ${commit}${dirty ? "+uncommitted" : ""}). `
            + "All of our own shaders live here; rebuild the whole library rather than importing single effects.",
        "--source-url", "https://github.com/carbonenginejs/runtime/tree/main/src/shadercompiler/library"
    ], { cwd: toolsCore, stdio: "inherit" });

    if (result.status !== 0) throw new Error(`cjs-overlay-import exited with ${result.status}`);
    console.log(`${OVERLAY} replaced; restart tools-core (5510) to serve it.`);
}
finally
{
    rmSync(out, { recursive: true, force: true });
}
