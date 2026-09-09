// Does each abstraction-layer class still have the methods its Carbon donor
// declares, and no invented ones it never declared?
//
// WHY THIS SCRIPT EXISTS. The AL is the only Carbon-derived tree in this
// package that no automated check has ever covered, and on 2026-09-08/09 that
// showed: the WebGPU backend had grown a second binding model beside the
// ported `Tr2ResourceSetAL`, and the stub was missing twenty render-context
// methods, an entire `Tr2BindlessResourcesAL` class, and the `const char*`
// parameter on every `SetName`. All of it was found by hand, with agents, one
// class at a time.
//
// WHY A SEPARATE CHECKER, CORRECTED 2026-09-09. The first version of this
// comment said the AL is outside the schema pipeline entirely - "no class
// records, zero ending in AL, no trinityal family". That was read off the
// ARCHIVED 2026-07-16 scan. The LIVE scan has 48 classes ending in `AL`, and
// the staged schema tree has a `trinityal` family of 198 class docs.
//
// The real reason is narrower and still holds: an AL schema doc carries
// `fields` and `nativeMethods` but ZERO Blue `methods`, because the AL is not
// Blue-exposed. So `carbon-class --check`, which compares Blue methods, has
// nothing to compare on an AL class - it would compare C++ member fields
// against our private JS fields and report noise.
//
// THIS SCRIPT IS THEREFORE A STOPGAP, and should say so. `nativeMethods`
// carries the same method surface this parses out of headers by hand, already
// resolved, with `declaredOn` for base classes, return types and virtual
// flags. Driving AL parity from that is strictly better than a hand-rolled C++
// parser, and the schema-pipeline lane has already built a native dictionary
// over it. Prefer that route when it lands; keep this until it does.
//
// THE DONOR IS DECLARED BY THE FILE ITSELF. Every maintained AL file opens
// with `// Source:` lines naming its Carbon header. This reads those rather
// than carrying a mapping table, so provenance headers become load-bearing:
// a file with no donor is reported, and a citation that no longer resolves is
// reported. A table would drift from the tree; a header cannot drift from the
// file it sits in.
//
// WHAT IT DELIBERATELY DOES NOT DO. It compares NAMES, not behaviour. A method
// present on both sides may still be wrong - only a donor read settles that.
// The point is that a method Carbon declares and we never wrote, or one we
// invented and never marked, stops being invisible.

import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const alRoot = path.join(packageRoot, "src", "trinityal");
const carbonRoot = process.env.CARBON_ROOT ?? "E:\\carbonengine";

/**
 * Backend suffixes our class names carry and Carbon's do not.
 *
 * Carbon names every backend class identically - `TrinityALImpl::Tr2BufferAL`
 * in metal, dx12, dx11 and the stub alike - and carries the backend in the
 * FILE name, because only one backend compiles at a time. JavaScript has no
 * namespaces and ships every backend together, so the suffix moves onto the
 * class. Stripping it is how a JS class finds its donor.
 */
const BACKEND_SUFFIXES = [ "Stub", "Webgpu", "WebGPU" ];

/**
 * Divergences already argued at their own site, with the reason recorded.
 *
 * Nothing may be added here without that reason existing in the source. This
 * is not a list of things to get round to; it is a list of decisions.
 */
const ACCEPTED = new Map([
    [ "Tr2ShaderProgramALStub.GetRegisterMap",
        "Deliberately omitted so a caller fails loudly; recorded in the file head comment." ],
    [ "Tr2ResourceSetDescriptionAL.SetSrvHeapView",
        "Heap-view setters are not ported; recorded in Tr2ResourceSetAL.js." ],
    [ "Tr2ResourceSetDescriptionAL.SetUavHeapView",
        "Heap-view setters are not ported; recorded in Tr2ResourceSetAL.js." ],
    [ "Tr2ResourceSetDescriptionAL.SetSamplerHeapView",
        "Heap-view setters are not ported; recorded in Tr2ResourceSetAL.js." ],

    // The WebGPU backend, 2026-09-09. Each reason is argued in the head comment
    // of the file named beside it; these are the entries that were sitting in
    // the frozen baseline looking like debt when they are decisions.
    [ "CjsWebgpuBufferAL.GetGpuResource",
        "The DX name for the native buffer accessor; ours is GetDeviceBuffer. Recorded in CjsWebgpuBufferAL.js." ],
    [ "CjsWebgpuBufferAL.GetMetalBuffer",
        "The Metal name for the native buffer accessor; ours is GetDeviceBuffer. Recorded in CjsWebgpuBufferAL.js." ],
    [ "CjsWebgpuBufferAL.CreateStagingBuffer",
        "DX11-only and private there; not on the contract. Recorded in CjsWebgpuBufferAL.js." ],
    [ "CjsWebgpuRenderContextAL.GetMetalContext",
        "Metal's native escape hatch; ours is GetWebgpu. Recorded in CjsWebgpuRenderContextAL.js." ],
    [ "CjsWebgpuRenderContextAL.GetMetalWorkQueue",
        "Metal's native escape hatch; ours is GetWorkQueue. Recorded in CjsWebgpuRenderContextAL.js." ],
    [ "CjsWebgpuRenderContextAL.BeginParallelEncoding",
        "Multi-threaded encoding; there is one thread. Recorded in CjsWebgpuRenderContextAL.js." ],
    [ "CjsWebgpuRenderContextAL.EndParallelEncoding",
        "Multi-threaded encoding; there is one thread. Recorded in CjsWebgpuRenderContextAL.js." ],
    [ "CjsWebgpuRenderContextAL.ForkContext",
        "Multi-threaded encoding; there is one thread. Recorded in CjsWebgpuRenderContextAL.js." ],
    [ "CjsWebgpuRenderContextAL.BufferRewritten",
        "WebGPU cannot rename an allocation; queue ordering gives the same guarantee. Recorded in CjsWebgpuRenderContextAL.js." ],
    [ "CjsWebgpuRenderContextAL.CheckDrawResources",
        "WebGPU validates every draw itself. Recorded in CjsWebgpuRenderContextAL.js." ],
    [ "CjsWebgpuRenderContextAL.ReleaseLater",
        "A GPUBuffer outlives any submission referencing it, so there is nothing to defer. Recorded in CjsWebgpuRenderContextAL.js." ],
    [ "CjsWebgpuRenderContextAL.UseConstantBuffer",
        "Constants reach the device through the bind group; there is no constant arena. Recorded in CjsWebgpuRenderContextAL.js." ],
    [ "CjsWebgpuRenderContextAL.UploadConstants",
        "Constants reach the device through the bind group; there is no arena offset to return. Recorded in CjsWebgpuRenderContextAL.js." ],
    [ "CjsWebgpuShaderProgramAL.CreateCommandSignatures",
        "D3D12 indirect-command signatures, DX12-only. Recorded in CjsWebgpuShaderAL.js." ],
    [ "CjsWebgpuShaderProgramAL.GetRegisterMap",
        "The register map is on the effect package's bind-group declarations, not the program; our stub omits it too. Recorded in CjsWebgpuShaderAL.js." ]
]);

/** C++ names that are never ported as methods. */
const CPP_NON_METHODS = new Set([ "if", "for", "while", "switch", "return", "sizeof", "static_cast",
    "reinterpret_cast", "const_cast", "dynamic_cast", "operator", "enum", "struct", "class", "union",
    "namespace", "template", "typedef", "using", "friend", "public", "private", "protected",
    // `throw()` is an exception specifier, and a bare type name before `(` is
    // a cast or a declaration, not a call.
    "throw", "void", "bool", "char", "int", "unsigned", "size_t", "float", "double",
    "uint8_t", "uint16_t", "uint32_t", "uint64_t", "int8_t", "int16_t", "int32_t", "int64_t",
    // Carbon's PIMPL accessor. Every AL facade declares it to reach its impl
    // object; JavaScript has no such split, so there is nothing to port.
    "TrinityALImpl_GetObject",
    // Carbon's CRTP bridge: `Tr2DeviceResourceAL` declares these pure virtual
    // and the template implements them by forwarding to the derived class's
    // `IsValid`/`GetMemoryClass`. JavaScript dispatches to the derived class
    // directly, so the bridge has no counterpart - the methods it forwards TO
    // are the ones this check should be looking for, and it does.
    "IsResourceValid", "GetResourceMemoryClass" ]);

/** JS names that are never a ported Carbon method. */
const JS_NON_METHODS = new Set([ "constructor", "if", "for", "while", "switch", "catch", "return",
    "function", "get", "set" ]);

const problems = [];
const notes = [];

/** Our `extends` graph, so an inherited method is not reported as missing. */
const baseOf = new Map();

/** Every class we saw, to its own declared methods. */
const methodsOf = new Map();


/**
 * A class's methods including everything it inherits.
 *
 * Carbon declares `Describe` and `SetName` on nearly every AL resource; ours
 * satisfies them once on `Tr2BaseDeviceResourceAL`. Without walking `extends`
 * the checker reports a missing method on thirteen classes that all have it.
 *
 * @param {string} className Class to resolve.
 * @returns {Set<string>} Own and inherited method names.
 */
function withInherited(className)
{
    const all = new Set();
    let current = className;

    while (current && methodsOf.has(current))
    {
        for (const method of methodsOf.get(current)) all.add(method);
        current = baseOf.get(current);
    }

    return all;
}


/** Every `.js` file under a directory, recursively. */
async function sourceFiles(directory)
{
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];

    for (const entry of entries)
    {
        const full = path.join(directory, entry.name);

        if (entry.isDirectory()) files.push(...await sourceFiles(full));
        else if (entry.name.endsWith(".js")) files.push(full);
    }

    return files;
}


/**
 * The Carbon paths a file cites, from its `// Source:` header.
 *
 * Both shapes in the tree are accepted: a repeated `// Source:` line, and one
 * `// Source:` followed by indented continuation lines.
 *
 * @param {string} code File contents.
 * @returns {string[]} Carbon-relative paths, in citation order.
 */
function citedSources(code)
{
    const cited = [];

    for (const line of code.split("\n"))
    {
        if (!line.startsWith("//")) break;

        const direct = line.match(/^\/\/\s*Source:\s*(\S+)/);
        if (direct) { cited.push(direct[1]); continue; }

        // A continuation must look like a PATH, not prose that happens to name
        // a file: `(\`Tr2BufferALStub.cpp\` ...)` is commentary, not a citation.
        const continued = line.match(/^\/\/\s{2,}([A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)+\.(?:h|cpp|mm))\b/);
        if (continued) cited.push(continued[1]);
    }

    return cited;
}


/**
 * Resolves a cited path to the Carbon file that declares the contract.
 *
 * A `.cpp`/`.mm` citation prefers its sibling header, because the declaration
 * states the contract and the implementation repeats it. Three fallbacks
 * follow, because the AL does not keep headers beside implementations: the
 * cited file itself, then `include/`, then the backend directory's own header.
 *
 * @param {string} cited Carbon-relative path.
 * @returns {string|null} Absolute path, or null when nothing resolves.
 */
function resolveHeader(cited)
{
    const clean = cited.replace(/[(),;]+$/, "").replace(/:[\d-]+$/, "");
    const base = path.basename(clean).replace(/\.(cpp|mm)$/, ".h");

    const candidates = [
        clean.replace(/\.(cpp|mm)$/, ".h"),
        clean,
        path.posix.join(path.posix.dirname(clean), "..", "include", base),
        path.posix.join("trinity", "trinityal", "include", base)
    ];

    for (const candidate of candidates)
    {
        const full = path.join(carbonRoot, candidate.replaceAll("/", path.sep));
        if (existsSync(full)) return full;
    }

    return null;
}


/**
 * Method names declared by each class in a C++ header.
 *
 * Brace-depth tracked so a nested struct's members are attributed to the
 * nested type rather than its owner - `Tr2ResourceSetDescriptionAL` has two
 * nested structs, and a flat scan silently merges them into the parent.
 *
 * @param {string} code Header contents.
 * @returns {Map<string, Set<string>>} Class name to declared method names.
 */
function carbonMethods(code)
{
    const byClass = new Map();
    const stack = [];
    let depth = 0;
    let continuesInitialiser = false;

    for (const raw of code.split("\n"))
    {
        const line = raw.trim();
        if (!line || line.startsWith("//") || line.startsWith("*") || line.startsWith("#")) continue;

        // A constructor's member-initialiser list reads exactly like a call:
        // `: m_isValid( false ), m_frameNumber( 0 )` would otherwise register
        // two methods named after data members. The list also WRAPS - Carbon
        // ends the signature line with `:` and continues on the next - so the
        // previous line's ending decides whether we are still inside one.
        const inInitialiser = continuesInitialiser || line.startsWith(":") || line.startsWith(",");

        // A list also OPENS at the end of the signature line - Carbon writes
        // `Tr2MsaaDesc( uint32_t samples_ = 1 ) :` and continues below - so the
        // opening has to be detected on a line that is not itself part of it.
        // Without this, `samples( ... )` on the next line reads as a method and
        // the data member is reported as an unported one.
        //
        // The `)` is required, and is not decoration: `private:` also ends in a
        // colon, and treating THAT as an opener swallowed the next declaration.
        // It hid two nested structs and attributed their members to the parent.
        const opensInitialiser = line.endsWith(":") && line.includes(")");
        continuesInitialiser = (inInitialiser || opensInitialiser) && !line.includes("{");
        if (inInitialiser) continue;

        // A forward declaration ends in `;` and opens no body.
        const declared = line.match(/^(?:class|struct)\s+([A-Za-z_][A-Za-z0-9_]*)/);
        if (declared && !line.endsWith(";"))
        {
            // `opened` matters: Carbon puts the brace on the NEXT line, so a
            // class pushed here still sits at its parent's depth. Popping on
            // depth alone would discard it before a single method is read -
            // which silently turned this whole check into a no-op once.
            stack.push({ name: declared[1], depth, opened: false });
            if (!byClass.has(declared[1])) byClass.set(declared[1], new Set());
        }

        const owner = stack.length > 0 ? stack[stack.length - 1] : null;

        if (owner)
        {
            const method = line.match(/(?:^|[\s*&>])([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
            if (method)
            {
                const name = method[1];
                const isConstructor = name === owner.name || name === `~${owner.name}`;

                if (!isConstructor && !CPP_NON_METHODS.has(name) && !line.startsWith("return"))
                {
                    byClass.get(owner.name).add(name);
                }
            }
        }

        depth += (line.match(/\{/g) ?? []).length;
        depth -= (line.match(/\}/g) ?? []).length;

        for (const entry of stack)
        {
            if (!entry.opened && depth > entry.depth) entry.opened = true;
        }

        while (stack.length > 0
            && stack[stack.length - 1].opened
            && depth <= stack[stack.length - 1].depth)
        {
            stack.pop();
        }
    }

    return byClass;
}


/**
 * Method names defined by each exported class in a JS file.
 *
 * @param {string} code File contents.
 * @returns {Map<string, Set<string>>} Class name to method names.
 */
function jsMethods(code)
{
    const byClass = new Map();
    let current = null;

    for (const line of code.split("\n"))
    {
        const declared = line.match(/^export class ([A-Za-z0-9_]+)(?:\s+extends\s+([A-Za-z0-9_]+))?/);
        if (declared)
        {
            current = declared[1];
            byClass.set(current, new Set());
            if (declared[2]) baseOf.set(current, declared[2]);
            continue;
        }

        if (!current) continue;

        const method = line.match(/^\s{2}(?:static\s+|async\s+|get\s+|set\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
        if (method && !JS_NON_METHODS.has(method[1])) byClass.get(current).add(method[1]);
    }

    return byClass;
}


/**
 * The Carbon class names a JS class might be porting, best first.
 *
 * Two shapes exist in the tree. The correct one is Carbon's class name plus a
 * backend suffix (`Tr2BufferALStub`). The WebGPU backend instead uses a `Cjs`
 * prefix with the backend inside the name (`CjsWebgpuBufferAL`), which matches
 * no donor - so that form is translated here too. Without it the checker would
 * silently skip the most drifted files in the tree, which is the opposite of
 * what it is for. Translating is not endorsing: the rename is still owed.
 *
 * @param {string} jsClass Our class name.
 * @returns {string[]} Candidate donor names.
 */
function donorNames(jsClass)
{
    const candidates = [];

    for (const suffix of BACKEND_SUFFIXES)
    {
        if (jsClass.endsWith(suffix)) candidates.push(jsClass.slice(0, -suffix.length));
    }

    const prefixed = jsClass.match(/^Cjs(?:Webgpu|WebGPU)(.+)$/);
    if (prefixed)
    {
        candidates.push(`Tr2${prefixed[1]}`);
        if (!prefixed[1].endsWith("AL")) candidates.push(`Tr2${prefixed[1]}AL`);
    }

    candidates.push(jsClass);
    return candidates;
}


if (!existsSync(carbonRoot))
{
    console.log(`AL parity SKIPPED: no Carbon source at ${carbonRoot}.`);
    console.log("Set CARBON_ROOT to the donor checkout to run this check.");
    process.exit(0);
}

const files = await sourceFiles(alRoot);
let comparedClasses = 0;

// Pass one builds the whole `extends` graph before anything is compared. A
// base class usually lives in another file, so a single pass would resolve
// inheritance only when the files happened to be read in the right order.
const parsed = [];

for (const file of files)
{
    const relative = path.relative(packageRoot, file).replaceAll("\\", "/");
    if (relative.endsWith("/index.js") || relative.endsWith("/internal.js")) continue;

    const code = await readFile(file, "utf8");
    const ours = jsMethods(code);

    for (const [ name, methods ] of ours) methodsOf.set(name, methods);
    if (ours.size > 0) parsed.push({ relative, code, ours });
}

for (const { relative, code, ours } of parsed)
{

    const cited = citedSources(code);

    if (cited.length === 0)
    {
        notes.push(`${relative} cites no Carbon donor, so nothing can be compared.`);
        continue;
    }

    const theirs = new Map();
    for (const source of cited)
    {
        const header = resolveHeader(source);
        if (header === null)
        {
            problems.push(`${relative} cites ${source}, which no longer resolves under ${carbonRoot}.`);
            continue;
        }

        for (const [ name, methods ] of carbonMethods(await readFile(header, "utf8")))
        {
            if (!theirs.has(name)) theirs.set(name, new Set());
            for (const method of methods) theirs.get(name).add(method);
        }
    }

    for (const [ jsClass ] of ours)
    {
        const candidates = donorNames(jsClass);
        const donor = candidates.find(name => theirs.has(name));

        if (donor === undefined)
        {
            notes.push(`${relative} ${jsClass} matches no class in its cited donors `
                + `(tried ${candidates.join(", ")}).`);
            continue;
        }

        const donorSet = theirs.get(donor);
        const available = withInherited(jsClass);

        comparedClasses += 1;

        for (const method of donorSet)
        {
            if (available.has(method)) continue;
            if (ACCEPTED.has(`${jsClass}.${method}`)) continue;

            problems.push(`${relative} ${jsClass} does not port ${donor}::${method}.`);
        }
    }
}

// The ratchet. 98 gaps existed the day this check was written, and a red gate
// nobody can turn green gets disabled rather than fixed - so they are frozen
// here and only NEW ones fail. `--update` rewrites the file, which is how a
// fix is banked; it must never be run to silence a fresh finding.
const baselineFile = path.join(packageRoot, "scripts", "al-parity-baseline.json");
const baseline = existsSync(baselineFile)
    ? new Set(JSON.parse(await readFile(baselineFile, "utf8")).problems)
    : new Set();

if (process.argv.includes("--update"))
{
    const sorted = [ ...problems ].sort();
    await (await import("node:fs/promises")).writeFile(baselineFile,
        `${JSON.stringify({ recorded: new Date().toISOString().slice(0, 10), problems: sorted }, null, 2)}\n`);
    console.log(`Recorded ${sorted.length} baselined AL parity gap(s).`);
    process.exit(0);
}

const fresh = problems.filter(problem => !baseline.has(problem));
const fixed = [ ...baseline ].filter(problem => !problems.includes(problem));

for (const note of notes) console.log(`  note: ${note}`);

if (fresh.length > 0)
{
    console.error("");
    for (const problem of fresh) console.error(`  ${problem}`);
    console.error(`\n${fresh.length} NEW AL parity problem(s). Port the method, or record the`);
    console.error("divergence in ACCEPTED with the reason that already exists in the source.");
    process.exitCode = 1;
}
else
{
    console.log(`AL parity OK: ${comparedClasses} classes compared, `
        + `${problems.length} known gap(s) held at the baseline.`);

    if (fixed.length > 0)
    {
        console.log(`\n${fixed.length} baselined gap(s) are now closed. Bank them:`);
        console.log("  node scripts/lint-al-parity.js --update");
    }
}
