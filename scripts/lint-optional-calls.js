// Guards the organization rule that required organization-owned methods are
// called DIRECTLY, never hidden behind `?.`.
//
// WHY THIS SCRIPT EXISTS. The rule was written down and kept coming back anyway.
// Every other hard rule in this repository has a checker - layering, source
// style, docs, retired vocabulary - and every one of those stays fixed. This one
// only held while somebody remembered it, and by 2026-09-05 there were 1699
// sites across 209 files.
//
// WHAT IT CATCHES, AND THE DISTINCTION THAT MATTERS. Only the METHOD hedge:
// `thing.DoWork?.( ... )`, which says "call this if the method happens to
// exist". PascalCase is this runtime's instance-method convention, so a
// PascalCase name is a method on a class we own, and a class we own either has
// the method or is the thing to fix. camelCase is left alone: those are
// caller-supplied callbacks and host-object probes, which the rule permits.
//
// `thing?.DoWork()` IS NOT COUNTED, and the first version of this script got
// that wrong. A nullable OBJECT is an ordinary fact - a list can hold a null, a
// reference can be unresolved - and guarding it says nothing about whether the
// method exists. The rule is about hiding a missing IMPLEMENTATION. Counting the
// receiver guard also made the checker useless for measuring progress: turning
// `thing?.DoWork?.()` into `thing?.DoWork()` is exactly the fix, and the count
// did not move.
//
// `thing?.property` is untouched for the same reason.
//
// THREE SHAPES, ONE RULE (2026-10-18). The method hedge has two other
// spellings, and each stood in for the first once that one was counted:
//
//   optionalCall  `thing.DoWork?.()` - the original shape.
//   typeofMethod  `typeof thing.DoWork === "function"` (or `!==`): the same
//                 question asked by hand, usually to pick a branch.
//   callNullish   `thing.GetY() ?? fallback`: a default after a call to one of
//                 our methods that never returns null or undefined, so the
//                 fallback guards an absence the method rules out.
//
// callNullish is decided against this tree's own declarations. A PascalCase
// name counts only when EVERY declaration of it returns a value, either by its
// body or by its contract. By body: it ends in a return or throw, and every
// return yields a literal, `this`, an array, object or `new`, arithmetic, or
// another such form. By contract: its JSDoc `@returns` type admits no null,
// undefined, void or wildcard, and no return in the body says otherwise. One
// declaration that can return null, or that proves neither, clears the name.
// That keeps the legitimate case - a method that, like Carbon's pointer
// getters, may answer null - out of the count. `thing?.GetY() ?? z` is not
// counted either: that default covers a null receiver.
//
// A host object's callables - a scripted action instance, a platform object -
// are not ours, and Carbon tests those too (Tr2ActionPython's ExtractMethod
// checks PyCallable_Check). Such a probe is written as Carbon's is, against a
// string-keyed lookup, and this check does not see it.
//
// HOW THE BASELINE WORKS. Rewriting 1699 sites at once would be sixteen hundred
// judgement calls made in a hurry, and removing a `?.` that was load-bearing
// turns a silent skip into a crash. So the existing sites are frozen per file
// and per shape, and the check fails only when a file goes UP. Burn a file down
// and re-record the lower number: the baseline is a ratchet, not a permission
// slip. A shape with no sites left is written OUT of the baseline, and from then
// on any site of that shape fails.
//
// HELD SITES. A file whose sites wait on a named later pass carries the reason
// in the baseline's `held` table, keyed by file, rather than as a comment at
// every site. `--write` keeps a held reason for as long as its file still has
// sites, and drops it once the file is clean.

import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import { fileURLToPath } from "node:url";

const traverse = traverseModule.default ?? traverseModule;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(root, "src");
const baselineFile = path.join(root, "scripts", "optional-call-baseline.json");

const RULES = {
    optionalCall: "optional calls to owned methods",
    typeofMethod: "typeof checks of owned methods",
    callNullish: "nullish defaults after owned calls that always return a value"
};

const PASCAL = /^[A-Z][A-Za-z0-9_]*$/u;

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

// Parsing, rather than matching text, is what keeps comments out of the count:
// they describe the mistake as often as they commit it, and this file does.
function parseModule(source, filename)
{
    try
    {
        return parse(source, { sourceType: "module", plugins: [ "decorators" ], sourceFilename: filename });
    }
    catch (error)
    {
        error.message = `${filename}: ${error.message}`;
        throw error;
    }
}

/** The PascalCase name a non-computed member access reads, or null. */
function pascalProperty(member)
{
    if (!member || (member.type !== "MemberExpression" && member.type !== "OptionalMemberExpression")) return null;
    if (member.computed || member.property.type !== "Identifier") return null;
    return PASCAL.test(member.property.name) ? member.property.name : null;
}

// ---------------------------------------------------------------------------
// Which method names provably return a value.

const VALUE_GLOBALS = new Set([ "Number", "String", "Boolean", "BigInt", "Symbol" ]);
const VALUE_NAMESPACES = new Set([ "Math", "Number", "Array", "Object", "String" ]);
const MAYBE_NULLISH_STATICS = new Set([ "find", "findLast", "getPrototypeOf", "parse" ]);

/** Whether an expression can never evaluate to null or undefined. */
function nonNullish(node)
{
    switch (node?.type)
    {
        case "NumericLiteral": case "StringLiteral": case "BooleanLiteral": case "BigIntLiteral":
        case "TemplateLiteral": case "ArrayExpression": case "ObjectExpression": case "NewExpression":
        case "ThisExpression": case "BinaryExpression": case "UpdateExpression": case "RegExpLiteral":
        case "ArrowFunctionExpression": case "FunctionExpression": case "ClassExpression":
            return true;
        case "UnaryExpression":
            return node.operator !== "void";
        case "ConditionalExpression":
            return nonNullish(node.consequent) && nonNullish(node.alternate);
        case "LogicalExpression":
            return node.operator !== "&&" && nonNullish(node.right);
        case "AssignmentExpression":
            return node.operator !== "=" || nonNullish(node.right);
        case "SequenceExpression":
            return nonNullish(node.expressions.at(-1));
        case "CallExpression":
        {
            const callee = node.callee;
            if (callee.type === "Identifier") return VALUE_GLOBALS.has(callee.name);
            return callee.type === "MemberExpression" && !callee.computed
                && callee.object.type === "Identifier" && VALUE_NAMESPACES.has(callee.object.name)
                && !MAYBE_NULLISH_STATICS.has(callee.property.name);
        }
        default:
            return false;
    }
}

/** Whether control can fall off the end of a statement list. */
function fallsThrough(statements)
{
    const last = statements.at(-1);
    if (!last) return true;
    if (last.type === "ReturnStatement" || last.type === "ThrowStatement") return false;
    if (last.type === "BlockStatement") return fallsThrough(last.body);
    if (last.type === "IfStatement" && last.alternate)
    {
        const branch = node => (node.type === "BlockStatement" ? node.body : [ node ]);
        return fallsThrough(branch(last.consequent)) || fallsThrough(branch(last.alternate));
    }
    return true;
}

/** A JSDoc `@returns` type that admits no nullish value, or null when there is none. */
function contractReturnsValue(method)
{
    const doc = (method.leadingComments ?? []).filter(comment => comment.type === "CommentBlock").at(-1);
    const match = doc?.value.match(/@returns?\s*\{([^}]*)\}/u);
    if (!match) return null;
    return !/null|undefined|void|\*|\?|\bany\b|\bunknown\b/u.test(match[1]);
}

/** Whether a return statement plainly answers nullish. */
function returnsNullish(statement)
{
    const argument = statement.argument;
    return !argument || argument.type === "NullLiteral"
        || (argument.type === "Identifier" && argument.name === "undefined")
        || (argument.type === "UnaryExpression" && argument.operator === "void");
}

/**
 * One declaration's verdict: "stub" for an empty or throw-only body (an
 * interface member or abstract throw, which says nothing about implementers),
 * true when its body or its contract shows it always returns a value, false
 * otherwise.
 */
function returnsValue(method)
{
    const body = method.body?.body;
    if (!body || body.length === 0) return "stub";
    if (body.every(statement => statement.type === "ThrowStatement")) return "stub";
    if (method.async || method.generator || method.kind !== "method") return false;

    let proven = true;
    let contradicted = false;
    const visit = node =>
    {
        if (!node || typeof node.type !== "string") return;
        if (node.type === "ReturnStatement")
        {
            if (!nonNullish(node.argument)) proven = false;
            if (returnsNullish(node)) contradicted = true;
            return;
        }
        // A nested function's returns are its own.
        if (/Function|ClassMethod|ObjectMethod|ClassDeclaration|ClassExpression/u.test(node.type)) return;
        for (const key of Object.keys(node))
        {
            if (key === "loc" || key.endsWith("Comments")) continue;
            const child = node[key];
            if (Array.isArray(child)) child.forEach(visit);
            else if (child && typeof child.type === "string") visit(child);
        }
    };
    body.forEach(visit);
    if (contradicted || fallsThrough(body)) return false;
    return proven || contractReturnsValue(method) === true;
}

/** PascalCase method names whose every non-stub declaration returns a value. */
function nonNullMethods(asts)
{
    const verdicts = new Map();

    for (const ast of asts)
    {
        traverse(ast, {
            "ClassMethod|ObjectMethod"(p)
            {
                const key = p.node.key;
                if (p.node.computed || key.type !== "Identifier" || !PASCAL.test(key.name)) return;
                const verdict = returnsValue(p.node);
                if (verdict === "stub") return;
                verdicts.set(key.name, (verdicts.get(key.name) ?? true) && verdict);
            }
        });
    }

    return new Set([ ...verdicts ].filter(([ , proven ]) => proven).map(([ name ]) => name));
}

// ---------------------------------------------------------------------------
// The three shapes.

function isTypeofMethod(node)
{
    if (![ "===", "!==", "==", "!=" ].includes(node.operator)) return false;
    return [ [ node.left, node.right ], [ node.right, node.left ] ].some(([ probe, literal ]) =>
        probe.type === "UnaryExpression" && probe.operator === "typeof"
        && pascalProperty(probe.argument) !== null
        && literal.type === "StringLiteral" && literal.value === "function");
}

function findSites(ast, nonNull)
{
    const sites = { optionalCall: [], typeofMethod: [], callNullish: [] };

    traverse(ast, {
        OptionalCallExpression(p)
        {
            if (p.node.optional && pascalProperty(p.node.callee) !== null) sites.optionalCall.push(p.node.loc.start.line);
        },
        BinaryExpression(p)
        {
            if (isTypeofMethod(p.node)) sites.typeofMethod.push(p.node.loc.start.line);
        },
        LogicalExpression(p)
        {
            // A chain holding any `?.` parses as Optional*, so a plain
            // CallExpression on the left has no null receiver to cover.
            const left = p.node.left;
            if (p.node.operator !== "??" || left.type !== "CallExpression") return;
            const name = pascalProperty(left.callee);
            if (name !== null && nonNull.has(name)) sites.callNullish.push(p.node.loc.start.line);
        }
    });

    return sites;
}

// ---------------------------------------------------------------------------

const files = [];

for (const file of await sourceFiles(sourceRoot))
{
    const relativeFile = slash(path.relative(root, file));
    files.push({ relativeFile, ast: parseModule(await fs.readFile(file, "utf8"), relativeFile) });
}

const nonNull = nonNullMethods(files.map(entry => entry.ast));
const counts = Object.fromEntries(Object.keys(RULES).map(rule => [ rule, {} ]));
const lines = Object.fromEntries(Object.keys(RULES).map(rule => [ rule, {} ]));

for (const { relativeFile, ast } of files)
{
    const sites = findSites(ast, nonNull);

    for (const rule of Object.keys(RULES))
    {
        if (!sites[rule].length) continue;
        counts[rule][relativeFile] = sites[rule].length;
        lines[rule][relativeFile] = sites[rule];
    }
}

if (process.argv.includes("--list"))
{
    for (const rule of Object.keys(RULES))
    {
        for (const [ file, at ] of Object.entries(lines[rule]))
        {
            for (const line of at) console.log(`${rule}\t${file}:${line}`);
        }
    }
    process.exit(0);
}

if (process.argv.includes("--write"))
{
    const written = {};

    for (const rule of Object.keys(RULES))
    {
        if (Object.keys(counts[rule]).length) written[rule] = counts[rule];
    }

    let previous = {};
    try
    {
        previous = JSON.parse(await fs.readFile(baselineFile, "utf8"));
    }
    catch (error)
    {
        if (error.code !== "ENOENT") throw error;
    }
    const held = Object.fromEntries(Object.entries(previous.held ?? {})
        .filter(([ file ]) => Object.keys(RULES).some(rule => counts[rule][file])));
    if (Object.keys(held).length) written.held = held;

    await fs.writeFile(baselineFile, `${JSON.stringify(written, null, 2)}\n`);
    const summary = Object.keys(RULES).map(rule => `${rule} ${Object.keys(counts[rule]).length}`).join(", ");
    console.log(`optional-call baseline written, files per shape: ${summary}`);
    process.exit(0);
}

const baseline = JSON.parse(await fs.readFile(baselineFile, "utf8"));
const problems = [];
const improved = [];

for (const rule of Object.keys(RULES))
{
    const allowedByFile = baseline[rule] ?? {};

    for (const [ file, found ] of Object.entries(counts[rule]))
    {
        const allowed = allowedByFile[file] ?? 0;

        if (found > allowed)
        {
            problems.push(
                `${file}: ${found} ${RULES[rule]} (lines ${lines[rule][file].join(", ")}), baseline ${allowed}. `
                + "Call the method directly; if it can be missing, fix the class."
            );
        }
    }

    for (const [ file, allowed ] of Object.entries(allowedByFile))
    {
        if ((counts[rule][file] ?? 0) < allowed) improved.push(`${rule} ${file}`);
    }
}

if (problems.length)
{
    console.error(problems.join("\n"));
    console.error(`\n${problems.length} file(s) went up. Nothing here is a new exception to grant.`);
    process.exit(1);
}

const summary = Object.keys(RULES).map(rule =>
{
    const total = Object.values(counts[rule]).reduce((sum, found) => sum + found, 0);
    const frozen = rule in baseline ? "" : ", no baseline";
    return `${rule} ${total} in ${Object.keys(counts[rule]).length} files${frozen}`;
}).join("; ");

console.log(`Owned-method hedges: ${summary}. None above baseline.`);

// A file that improved and was not re-recorded is not an error, but it is how
// the baseline rots back upwards, so it is said out loud.
if (improved.length)
{
    console.log(`${improved.length} file(s) are below baseline - re-record with --write to lock the gain in.`);
}
