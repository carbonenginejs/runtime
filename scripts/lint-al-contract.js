#!/usr/bin/env node
// The abstraction layer's contract, enforced in the one direction that matters.
//
// WHY THIS EXISTS. Carbon's abstraction layer knows nothing above it: grep
// `trinity/trinityal/` for `ITriRenderBatchAccumulator`, `Tr2Material` or
// `Tr2RenderBatch` and there are no hits. The AL's verbs speak in buffers,
// textures, samplers, shader programs, topologies and draw counts. Trinity
// pushes into it and it answers.
//
// Ours drifted the other way. `RenderBatches` - which Carbon declares on
// `Tr2RenderContext.h`, the TRINITY side, and which appears nowhere under
// `trinityal/` - was implemented on the abstraction layer, taking an
// accumulator. Once a backend can see materials and batches it starts doing
// Trinity's job with them, and it did: the material apply, the resource set,
// its hash and its caching were all bypassed, and a resolver and a dispatcher
// were invented to replace them. None of that was declared.
//
// The async divergence beside it WAS argued, at length, in the extensions
// register. The small thing got a paragraph; the change that reshaped the layer
// got nothing. So this exists to make that shape unrepresentable rather than
// merely discouraged.
//
// TWO RULES.
//
// 1. No Trinity type may appear in an abstraction-layer file. That one rule
//    catches `RenderBatches(accumulator)`.
// 2. A backend class answers everything its stub counterpart answers, so the
//    two cannot drift apart. The stub is the reference because it is the
//    complete, donor-faithful port; a backend answering less is one Trinity
//    cannot swap in.
//
// `npm run lint:al-contract`, and `--write` re-records the baseline.

import { readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const alRoot = path.join(packageRoot, "src", "trinityal");

/**
 * Type names that belong to Trinity and must never appear in an AL file.
 *
 * Carbon's own headers are what make this list possible: none of these appears
 * anywhere under `trinity/trinityal/`.
 */
const TRINITY_TYPES = [
    "ITriRenderBatchAccumulator",
    "TriRenderBatchAccumulator",
    "TriRenderBatchMap",
    "Tr2RenderBatch",
    "Tr2Material",
    "Tr2Effect",
    "CjsBatchManager",
    "CjsTrinityBatchResolver",
    "CjsTrinityBatchDispatcher"
];

/** Names that look like a method declaration but are control flow. */
const NOT_METHODS = new Set([ "if", "for", "while", "switch", "catch", "return", "function", "constructor" ]);

/** Every `.js` under a directory, recursively. */
async function jsFiles(root)
{
    const out = [];

    for (const entry of await readdir(root, { withFileTypes: true }))
    {
        const full = path.join(root, entry.name);

        if (entry.isDirectory()) out.push(...await jsFiles(full));
        else if (entry.name.endsWith(".js")) out.push(full);
    }

    return out;
}

const relative = file => path.relative(packageRoot, file).replaceAll("\\", "/");

/** Method names declared at one indent level in a source file. */
function declaredMethods(source)
{
    const names = new Set();

    for (const line of source.split(/\r?\n/u))
    {
        // Allman layout: a declaration never ends its line with a semicolon,
        // which is what separates it from a call statement.
        if (/;\s*$/u.test(line)) continue;

        const match = line.match(/^ {2}(?:static\s+)?(?:async\s+)?(#?[A-Za-z_$][A-Za-z0-9_$]*)\s*\(/u);

        if (match && !NOT_METHODS.has(match[1])) names.add(match[1]);
    }

    return names;
}

/**
 * Strips the backend marker, so `Tr2BufferALStub` and `CjsWebgpuBufferAL` meet
 * at one contract name.
 */
function contractName(className)
{
    return className
        .replace(/^Cjs(?:Webgpu|Webgl2|Webgl)/u, "")
        .replace(/(?:Stub|Webgpu|WebGPU)$/u, "")
        .replace(/^Tr2/u, "")
        .replace(/AL$/u, "");
}

/**
 * Exported class name to its declared methods, across a set of files.
 *
 * PER CLASS, NOT PER FILE. A file often holds several - `Tr2ResourceSetAL.js`
 * holds three - and attributing every method in the file to each of them made
 * `Tr2BufferDescriptionAL`'s statics look like part of the buffer's contract.
 */
async function surfaceOf(fileList)
{
    const surface = new Map();

    for (const file of fileList)
    {
        const source = await readFile(file, "utf8");
        const starts = [ ...source.matchAll(/^export class ([A-Za-z0-9_$]+)/gmu) ];

        for (const [ index, match ] of starts.entries())
        {
            const end = starts[index + 1]?.index ?? source.length;

            surface.set(match[1], declaredMethods(source.slice(match.index, end)));
        }
    }

    return surface;
}


const problems = [];
const files = await jsFiles(alRoot);

// RULE 1: a Trinity type named in an AL file, outside a comment.
for (const file of files)
{
    const source = await readFile(file, "utf8");

    for (const [ index, line ] of source.split(/\r?\n/u).entries())
    {
        if (/^\s*(?:\/\/|\*|\/\*)/u.test(line)) continue;

        const code = line.replace(/\/\/.*$/u, "");

        for (const type of TRINITY_TYPES)
        {
            if (!new RegExp(`\\b${type}\\b`, "u").test(code)) continue;

            problems.push(
                `${relative(file)}:${index + 1} names the Trinity type ${type}. `
                + "The abstraction layer knows nothing above it: it takes verbs, not graph objects."
            );
        }
    }
}

// RULE 2: a backend class answers what its stub counterpart answers.
const stubFiles = files.filter(file => file.includes(`${path.sep}stub${path.sep}`));
const backends = [ ...new Set(
    files
        .map(file => path.relative(alRoot, file).split(path.sep))
        .filter(parts => parts.length > 1 && parts[0] !== "stub")
        .map(parts => parts[0])
) ];

const stubSurface = await surfaceOf(stubFiles);

for (const backend of backends)
{
    const backendFiles = files.filter(file => path.relative(alRoot, file).split(path.sep)[0] === backend);
    const surface = await surfaceOf(backendFiles);
    const byContract = new Map([ ...surface ].map(([ name, methods ]) => [ contractName(name), { name, methods } ]));

    for (const [ stubClass, stubMethods ] of stubSurface)
    {
        const theirs = byContract.get(contractName(stubClass));

        // ONLY AL CLASSES PAIR. A backend also carries descriptor classes -
        // `CjsWebgpuTexture` is a frozen descriptor, not `Tr2TextureAL` - and
        // stripping the prefix collapses both onto the same contract name.
        // Requiring the `AL` suffix is what keeps a descriptor from being asked
        // to answer a device object's surface.
        if (theirs && !theirs.name.endsWith("AL")) continue;

        // A backend need not implement every AL class - WebGPU has no fence or
        // query yet - and an absent class is a gap the parity check already
        // reports. This rule is about a class that EXISTS answering less.
        if (!theirs) continue;

        for (const method of stubMethods)
        {
            if (method.startsWith("#") || theirs.methods.has(method)) continue;

            problems.push(
                `${backend}: ${theirs.name} does not answer ${method}, which ${stubClass} does. `
                + "Backends must be interchangeable; Trinity cannot know which one it holds."
            );
        }
    }
}

const baselineFile = path.join(packageRoot, "scripts", "al-contract-baseline.json");
const baseline = existsSync(baselineFile)
    ? new Set(JSON.parse(await readFile(baselineFile, "utf8")).problems)
    : new Set();

if (process.argv.includes("--write"))
{
    const sorted = [ ...problems ].sort();

    await writeFile(baselineFile,
        `${JSON.stringify({ recorded: new Date().toISOString().slice(0, 10), problems: sorted }, null, 2)}\n`);
    console.log(`Recorded ${sorted.length} baselined AL contract problem(s).`);
    process.exit(0);
}

const fresh = problems.filter(problem => !baseline.has(problem));
const fixed = [ ...baseline ].filter(problem => !problems.includes(problem));

if (fresh.length > 0)
{
    console.error("");
    for (const problem of fresh) console.error(`  ${problem}`);
    console.error(`\n${fresh.length} NEW AL contract problem(s). The abstraction layer is Carbon's shape,`);
    console.error("not a place to put Trinity's work.");
    process.exitCode = 1;
}
else
{
    console.log(`AL contract OK: ${files.length} files, ${stubSurface.size} contract classes, `
        + `${problems.length} known problem(s) held at the baseline.`);

    if (fixed.length > 0)
    {
        console.log(`\n${fixed.length} baselined problem(s) are now closed. Bank them:`);
        console.log("  node scripts/lint-al-contract.js --write");
    }
}
