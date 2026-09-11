// Structural faults in a class body that no other checker sees, and that a
// reader does not see either because the file still looks correct.
//
// WHY THIS SCRIPT EXISTS. On 2026-09-08 three donor audits found 32 places
// where a port diverged from Carbon with nothing forcing it. The rules had
// been written down twice before any of that code was authored, so the missing
// piece was never identification - it was that nothing FIRES at the moment a
// line is written. Every rule in this repository that holds has a checker;
// every rule that only lives in a document keeps coming back. This is the
// checker for the two faults from that audit which are decidable mechanically.
//
// 1. A DUPLICATE MEMBER IN ONE CLASS BODY. `Tr2RenderContextALStub` declared
//    `SetRenderStates` twice - Carbon's packed-pair verb at :627 and an
//    unrelated Trinity-level method at :759. The later definition silently
//    wins, so Carbon's verb was dead code, and a test asserted the survivor's
//    behaviour and passed. JavaScript reports nothing. There is no legitimate
//    case: if two things need the name, one of them has the wrong name.
//
// 2. A `Destroy()` THAT NEVER UNREGISTERS. Five AL resources reset their
//    fields without calling `super.Destroy()`, so they stayed in the device
//    registry forever and every device-lost sweep walked them. Carbon
//    unregisters in the destructor; JS has none, which is exactly why
//    `Tr2BaseDeviceResourceAL`'s own head comment names `Destroy()` as the
//    deterministic unregister point. Eight sibling stubs do it correctly, so
//    the convention was established and simply missed.
//
// Both are structural, so this parses rather than greps: a regex cannot tell a
// method from a string containing one, and getters, setters, statics and
// computed keys all have to be distinguished to avoid false positives.
//
// ONE BASELINED SITE, AND ONLY ONE. Unlike `lint-optional-calls`, which froze
// 1699 pre-existing sites, both faults here are small and unambiguous, so this
// fails outright - except for the single entry below, which is a real defect
// whose FIX is a design decision rather than an edit. Nothing may be added to
// that list without the same justification.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(packageRoot, "src");

/** Bases whose `Destroy()` carries the device-registry unregister. */
const UNREGISTERING_BASES = new Set([ "Tr2BaseDeviceResourceAL", "Tr2DeviceResourceAL" ]);

/**
 * Known faults whose fix is a design decision, not an edit.
 *
 * `Tr2RenderContextALStub` declares `SetRenderStates` twice. The first is
 * Carbon's AL verb, `SetRenderStates(pairs, count)`
 * (`Tr2RenderContextStub.h:186-187`); the second takes `(setup, overrides)` and
 * does work Carbon does in the STATE MANAGER - `DoApplyRenderStates` resolves
 * the pair list against the overrides and only then calls
 * `m_renderContext.SetRenderStates( &kv[0], kv.size() / 2 )`
 * (`Tr2EffectStateManager.cpp:722-752`). Our own comment above the method
 * quotes that exact Carbon line while the code does something else.
 *
 * Removing the duplicate therefore means moving the resolve up into
 * `Tr2EffectStateManager` - the fifth piece of the immediate-draw route named
 * in `docs/projects/sof-ship-on-screen.md` - and touching four call sites plus
 * a test. Recorded rather than rushed. See
 * `docs/research/gpu-pipeline-divergence-2026-09-08.md` finding 3.
 */
/**
 * Accepted duplicates, keyed by `file#Class.member`.
 *
 * IT WAS KEYED BY LINE NUMBER, AND THAT HID A REAL DEFECT. The single entry
 * here was `Tr2RenderContextALStub.js:857`, and the note beside it argued that
 * re-pinning was cheaper than inventing a stabler key. That judgement was
 * wrong, and the way it failed is the argument against it: on 2026-09-09
 * inserting a method above the entry moved the finding out from under its pin,
 * the check reported it, and the duplicate turned out to be Carbon's packed
 * `(pairs, count)` `SetRenderStates` sitting dead beneath the interpreted-setup
 * one. It had been shadowed and unreachable the whole time.
 *
 * So a line number does not merely make a baseline annoying to maintain - it
 * silences the finding while the code is stable and reveals it by accident, and
 * "re-pin it" is the cheap repair that puts the silence back. Keyed by identity
 * now: it moves with the member, and only a genuinely new duplicate is new.
 *
 * The set is EMPTY because that duplicate was removed rather than re-pinned.
 */
const BASELINE = new Set([]);

const problems = [];


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
 * A member's name, or null when it cannot be known statically.
 *
 * A computed key is skipped rather than guessed at: `[SYMBOL]() {}` is a real
 * pattern here (the brand accessors) and two computed keys cannot be compared
 * without evaluating them.
 */
function memberName(node)
{
    if (node.computed) return null;
    if (node.key?.type === "Identifier") return node.key.name;
    if (node.key?.type === "StringLiteral") return node.key.value;
    if (node.key?.type === "PrivateName") return `#${node.key.id.name}`;
    return null;
}


/** Whether a method body calls `super.Destroy()`. */
function callsSuperDestroy(node)
{
    let found = false;

    const walk = (value) =>
    {
        if (found || !value || typeof value !== "object") return;

        if (Array.isArray(value))
        {
            for (const item of value) walk(item);
            return;
        }

        if (value.type === "CallExpression"
            && value.callee?.type === "MemberExpression"
            && value.callee.object?.type === "Super"
            && value.callee.property?.name === "Destroy")
        {
            found = true;
            return;
        }

        for (const key of Object.keys(value))
        {
            if (key === "loc" || key === "leadingComments" || key === "trailingComments") continue;
            walk(value[key]);
        }
    };

    walk(node.body);
    return found;
}


/** Collects both faults from one class declaration. */
function checkClass(node, relativeFile)
{
    const className = node.id?.name ?? "(anonymous)";
    const superName = node.superClass?.type === "Identifier" ? node.superClass.name : null;
    const seen = new Map();

    for (const member of node.body.body)
    {
        if (member.type !== "ClassMethod" && member.type !== "ClassProperty"
            && member.type !== "ClassPrivateMethod" && member.type !== "ClassPrivateProperty")
        {
            continue;
        }

        const name = memberName(member);
        if (name === null) continue;

        // A getter and a setter of one name are one member, not two, and a
        // static and an instance member of one name never collide.
        const kind = member.kind === "get" || member.kind === "set" ? member.kind : "value";
        const slot = `${member.static ? "static " : ""}${name}:${kind}`;

        const site = `${relativeFile}#${className}.${slot}`;

        if (seen.has(slot) && !BASELINE.has(site))
        {
            problems.push(
                `${relativeFile}:${member.loc.start.line} ${className} declares ${name} again `
                + `(first at :${seen.get(slot)}). The later declaration silently wins.`);
        }
        else
        {
            seen.set(slot, member.loc.start.line);
        }

        if (name === "Destroy" && member.type === "ClassMethod" && !member.static
            && superName && UNREGISTERING_BASES.has(superName) && !callsSuperDestroy(member))
        {
            problems.push(
                `${relativeFile}:${member.loc.start.line} ${className}.Destroy does not call `
                + `super.Destroy(), so it never leaves the device registry.`);
        }
    }
}


/** Walks a parsed file for class declarations and expressions. */
function checkFile(ast, relativeFile)
{
    const walk = (value) =>
    {
        if (!value || typeof value !== "object") return;

        if (Array.isArray(value))
        {
            for (const item of value) walk(item);
            return;
        }

        if (value.type === "ClassDeclaration" || value.type === "ClassExpression")
        {
            checkClass(value, relativeFile);
        }

        for (const key of Object.keys(value))
        {
            if (key === "loc" || key === "leadingComments" || key === "trailingComments") continue;
            walk(value[key]);
        }
    };

    walk(ast.program);
}


const files = await sourceFiles(sourceRoot);

for (const file of files)
{
    const relativeFile = path.relative(packageRoot, file).replaceAll("\\", "/");
    const code = await readFile(file, "utf8");

    let ast;
    try
    {
        ast = parse(code, {
            sourceType: "module",
            plugins: [ [ "decorators", { version: "2023-11" } ], "classProperties", "classPrivateMethods" ]
        });
    }
    catch (error)
    {
        problems.push(`${relativeFile} could not be parsed: ${error.message}`);
        continue;
    }

    checkFile(ast, relativeFile);
}

if (problems.length)
{
    for (const problem of problems) console.error(`  ${problem}`);
    console.error(`\n${problems.length} class-shape problem(s).`);
    process.exitCode = 1;
}
else
{
    console.log(`Class shape OK: ${files.length} files, no duplicate members or unregistering Destroy.`);
}
