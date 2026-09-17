// Guards the second clause of the contract rule: no `instanceof` against a class
// WE OWN.
//
// WHY THIS SCRIPT EXISTS. The rule has three clauses in one paragraph - no
// `?.()` on an owned method, no `instanceof` on our own classes, no freezing
// returned data - and only the first had a checker. On 2026-09-18 that gap let
// ten fresh `instanceof EveEntity` and `instanceof Tr2MeshArea` sites land in
// one sitting, in code written BY someone who had read the rule that morning.
// The `?.` half caught the same mistake in the same commit within minutes.
// A rule with no checker is a preference.
//
// WHAT THE RULE ACTUALLY SAYS, because the exception is narrow and real:
// brands exist ONLY where Carbon itself casts - the `BlueCastPtr` ports - and
// even there `CjsSchema.cast` is the one door, so how the question is answered
// can change without touching a call site. `instanceof` against a PLATFORM type
// is an ordinary fact and is not this rule.
//
// So this counts `instanceof X` where X is not a platform global. It cannot tell
// a legitimate Carbon cast from capability discovery - that is a judgement about
// the donor - but a legitimate cast should be spelled `CjsSchema.cast` anyway,
// so both answers lead to the same edit.
//
// HOW THE BASELINE WORKS. Same ratchet as lint-optional-calls: 210 sites across
// 78 files are frozen per file, and the check fails only when a file goes UP.
// Removing one that was load-bearing turns a silent skip into a crash, so they
// come out deliberately, a file at a time, re-recording the lower number.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(root, "src");
const baselineFile = path.join(root, "scripts", "instanceof-baseline.json");

const INSTANCE_OF = /\binstanceof\s+([A-Za-z_$][\w$]*)/gu;

const BLOCK_COMMENT = /\/\*[\s\S]*?\*\//gu;
const LINE_COMMENT = /^[ \t]*\/\/.*$/gmu;

// Platform types. `instanceof Map` is a fact about a JavaScript value, not a
// question about one of our contracts, and the rule says so explicitly.
const PLATFORM = new Set([
    "Array", "ArrayBuffer", "SharedArrayBuffer", "DataView", "Date", "Map", "Set",
    "WeakMap", "WeakSet", "WeakRef", "Promise", "RegExp", "Function", "Object",
    "Number", "String", "Boolean", "Symbol", "BigInt", "Proxy",
    "Error", "TypeError", "RangeError", "SyntaxError", "ReferenceError", "EvalError", "URIError", "AggregateError",
    "Int8Array", "Uint8Array", "Uint8ClampedArray", "Int16Array", "Uint16Array",
    "Int32Array", "Uint32Array", "Float16Array", "Float32Array", "Float64Array",
    "BigInt64Array", "BigUint64Array",
    // Host objects: also facts about the environment, not about our contracts.
    "Blob", "File", "FileList", "FormData", "Headers", "Request", "Response", "URL", "URLSearchParams",
    "AbortSignal", "AbortController", "Event", "EventTarget", "MessagePort", "MessageChannel", "Worker",
    "Element", "Node", "Document", "HTMLElement", "HTMLCanvasElement", "HTMLImageElement",
    "HTMLVideoElement", "OffscreenCanvas", "ImageBitmap", "ImageData", "VideoFrame",
    "AudioBuffer", "AudioContext", "AudioNode", "MediaStream",
    "ReadableStream", "WritableStream", "TransformStream",
    "GPUDevice", "GPUAdapter", "GPUBuffer", "GPUTexture", "WebGL2RenderingContext", "WebGLRenderingContext"
]);

async function sourceFiles(directory)
{
    const files = [];

    for (const entry of await fs.readdir(directory, { withFileTypes: true }))
    {
        const target = path.join(directory, entry.name);

        if (entry.isDirectory()) files.push(...await sourceFiles(target));
        else if (entry.isFile() && entry.name.endsWith(".js")) files.push(target);
    }

    return files;
}

function slash(value)
{
    return value.replaceAll(path.sep, "/");
}

// Comments discuss the rule as often as they break it - this file does - so they
// are blanked before counting, exactly as the optional-call checker does.
function withoutComments(source)
{
    return source.replace(BLOCK_COMMENT, "").replace(LINE_COMMENT, "");
}

const counts = {};
const sites = {};

for (const file of await sourceFiles(sourceRoot))
{
    const relativeFile = slash(path.relative(root, file));
    const code = withoutComments(await fs.readFile(file, "utf8"));
    const owned = [];

    for (const match of code.matchAll(INSTANCE_OF))
    {
        if (!PLATFORM.has(match[1])) owned.push(match[1]);
    }

    if (owned.length)
    {
        counts[relativeFile] = owned.length;
        sites[relativeFile] = owned;
    }
}

if (process.argv.includes("--list"))
{
    for (const [ file, types ] of Object.entries(sites))
    {
        console.log(`${file}: ${types.join(", ")}`);
    }
    process.exit(0);
}

if (process.argv.includes("--write"))
{
    await fs.writeFile(baselineFile, `${JSON.stringify(counts, null, 2)}\n`);
    console.log(`instanceof baseline written: ${Object.keys(counts).length} files`);
    process.exit(0);
}

const baseline = JSON.parse(await fs.readFile(baselineFile, "utf8"));
const problems = [];

for (const [ file, found ] of Object.entries(counts))
{
    const allowed = baseline[file] ?? 0;

    if (found > allowed)
    {
        problems.push(
            `${file}: ${found} instanceof against our own classes, baseline ${allowed}. `
            + "We know what we passed. Where Carbon itself casts, use CjsSchema.cast."
        );
    }
}

if (problems.length)
{
    console.error(problems.join("\n"));
    console.error(`\n${problems.length} file(s) went up. Nothing here is a new exception to grant.`);
    process.exit(1);
}

const total = Object.values(counts).reduce((sum, found) => sum + found, 0);
const gains = Object.entries(baseline).filter(([ file, allowed ]) => (counts[file] ?? 0) < allowed);

console.log(`instanceof against our own classes: ${total} in ${Object.keys(counts).length} files, none above baseline.`);

if (gains.length)
{
    console.log(`${gains.length} file(s) are below baseline - re-record with --write to lock the gain in.`);
}
