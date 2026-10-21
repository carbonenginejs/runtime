import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "@babel/parser";
import { headerTypes, jsClasses, jsProvenance } from "./carbon-header-shape.js";

/** Enumerate source files, keeping generated classes but excluding dropped code. */
export async function filesUnder(directory, extensions)
{
    const files = [];
    for (const entry of await readdir(directory, { withFileTypes: true }))
    {
        if ([ ".git", "node_modules", "dropped", "npm", "dist" ].includes(entry.name)) continue;
        const target = path.join(directory, entry.name);
        if (entry.isDirectory()) for (const file of await filesUnder(target, extensions)) files.push(file);
        else if (entry.isFile() && extensions.includes(path.extname(entry.name))) files.push(target);
    }
    return files.sort();
}


/**
 * The Carbon donors a file's class definitions declare as ported.
 *
 * `meta.carbon(...)` declares literal native names independently of registration.
 * The older `donors: [ "X" ]` in a `blue.define` names the one
 * Carbon class a renamed port replicates (ruling 2026-10-15, which replaced
 * `carbon:`); CjsSchema folds it into the definition's `carbon`. A bare
 * `carbon: "X"` still declares a `meta` class that replicates a Carbon type
 * Carbon does not expose, and every dropped/ record.
 *
 * `donors` in a `meta.define` (the old `modelledOn:`) deliberately does NOT
 * count. It declares that a class declines to replicate the donor's surface,
 * so it cannot answer whether the donor is ported - and counting it hid a real
 * gap: a WebGPU encode state "modelled on" Tr2RenderContextBase satisfied
 * coverage for a Trinity base that was never written. A modelled donor is
 * written into a dropped/ tree like any other, with the reason.
 *
 * @param {string} source File contents.
 * @returns {string[]} Declared donor class names.
 */
function declaredDonors(source)
{
    const donors = [];
    for (const [ , donor ] of source.matchAll(/\bcarbon:\s*"(\w+)"/g)) donors.push(donor);

    const blocks = [
        ...source.matchAll(/@blue\.define\(\s*\{([\s\S]*?)\}\s*\)/g),
        ...source.matchAll(/CjsSchema\.blue\.define\(\s*\w+\s*,\s*\{([\s\S]*?)\}\s*\)/g)
    ];
    for (const [ , body ] of blocks)
    {
        const donor = body.match(/\bdonors:\s*\[\s*"(\w+)"\s*\]/);
        if (donor) donors.push(donor[1]);
    }
    // Read annotations as syntax, so comments, strings and unrelated calls cannot
    // claim a port. Only class decorators and top-level applications to a class
    // declared in this module are declarations.
    let ast;
    try { ast = parse(source, { sourceType: "module", plugins: ["decorators"] }); }
    catch { return donors; }
    const classes = ast.program.body.map(node => node.declaration ?? node)
        .filter(node => node.type === "ClassDeclaration" && node.id);
    const classNames = new Set(classes.map(node => node.id.name));
    const namespaces = new Set(["meta"]);
    for (const node of ast.program.body)
    {
        if (node.type !== "ImportDeclaration"
            || !/^(?:#schema|@carbonenginejs\/runtime\/schema)$|\/schema(?:\/index)?\.js$/.test(node.source.value)) continue;
        for (const specifier of node.specifiers)
            if (specifier.type === "ImportSpecifier" && specifier.imported.name === "meta")
                namespaces.add(specifier.local.name);
    }
    const expressions = [];
    for (const node of classes)
        for (const decorator of node.decorators ?? []) expressions.push(decorator.expression);
    for (const node of ast.program.body)
    {
        const call = node.type === "ExpressionStatement" ? node.expression : null;
        if (call?.type === "CallExpression" && call.arguments.length === 1
            && call.arguments[0].type === "Identifier" && classNames.has(call.arguments[0].name))
            expressions.push(call.callee);
    }
    for (const expression of expressions)
    {
        if (expression?.type !== "CallExpression" || expression.arguments.length !== 1) continue;
        const callee = expression.callee, owner = callee.object;
        if (callee.type !== "MemberExpression" || callee.computed || callee.property.name !== "carbon") continue;
        const direct = owner.type === "Identifier" && namespaces.has(owner.name);
        const facade = owner.type === "MemberExpression" && !owner.computed
            && owner.object.type === "Identifier" && owner.object.name === "CjsSchema"
            && owner.property.name === "meta";
        if (!direct && !facade) continue;
        const argument = expression.arguments[0];
        const names = argument.type === "ArrayExpression" ? argument.elements : [argument];
        if (names.every(node => node?.type === "StringLiteral" && node.value.trim()))
            for (const node of names) donors.push(node.value.trim());
    }
    return donors;
}

/** Enumerate the dropped trees, which filesUnder deliberately skips. */
async function droppedFiles(root)
{
    const found = [];
    const walk = async (directory) =>
    {
        for (const entry of await readdir(directory, { withFileTypes: true }))
        {
            if ([ ".git", "node_modules", "npm", "dist" ].includes(entry.name)) continue;
            const target = path.join(directory, entry.name);
            if (!entry.isDirectory()) continue;
            if (entry.name === "dropped") for (const file of await filesUnder(target, [ ".js" ])) found.push(file);
            else await walk(target);
        }
    };
    await walk(root);
    return found.sort();
}

/** Index cited headers against the live donor; ambiguous paths remain findings. */
export async function sourceIndex(packageRoot, carbonRoot)
{
    const headers = await filesUnder(carbonRoot, [ ".h", ".hpp" ]);
    const relativeHeaders = new Map(headers.map(file => [ path.relative(carbonRoot, file).replaceAll("\\", "/"), file ]));
    const byBase = new Map();
    for (const [ relative, file ] of relativeHeaders)
    {
        const base = path.posix.basename(relative);
        if (!byBase.has(base)) byBase.set(base, []);
        byBase.get(base).push([ relative, file ]);
    }
    const classes = new Map();
    const cited = new Set();
    const problems = new Map();
    const sources = new Map();
    for (const file of await filesUnder(path.join(packageRoot, "src"), [ ".js" ]))
    {
        const relative = path.relative(packageRoot, file).replaceAll("\\", "/");
        const source = await readFile(file, "utf8");
        for (const node of jsClasses(source))
        {
            if (!classes.has(node.id.name)) classes.set(node.id.name, []);
            classes.get(node.id.name).push({ file: relative, node });
        }
        // A class may declare the donor it ports under a different name. That
        // declaration is the author's, and it is the only thing tying a
        // deliberately renamed port back to its donor - CjsScriptCallback to
        // BlueScriptCallback, or every Tr2*ALStub to the one Tr2*AL name Carbon
        // gives all backends. Without it a renamed port reads here as a missing one.
        for (const donor of declaredDonors(source))
        {
            if (!classes.has(donor)) classes.set(donor, []);
            classes.get(donor).push({ file: relative, node: null, declared: true });
        }
        if (relative.split("/").includes("generated")) continue;
        const head = jsProvenance(source);
        if (!head.includes("Source:")) continue;
        for (const match of head.matchAll(/(?:Source:\s*|^\/\/\s+)([\w./\\-]+\.h(?:pp)?)(?=[\s:+(),]|$)/gm))
        {
            const citation = match[1].replaceAll("\\", "/");
            let target = relativeHeaders.has(citation) ? citation : null;
            if (!target)
            {
                const candidates = byBase.get(path.posix.basename(citation)) ?? [];
                // Historical shortened provenance is accepted only if unambiguous.
                if (candidates.length === 1) target = candidates[0][0];
                else problems.set(`citation:${citation}`, `${relative}: ${candidates.length ? "ambiguous" : "unresolved"} donor header ${citation}`);
            }
            if (target) cited.add(target);
        }
    }
    // Dropped classes are WRITTEN, deliberately not live: each carries its
    // `// Source:` line and the reason it was dropped. filesUnder skips the
    // dropped trees, so without this pass a recorded decision is
    // indistinguishable from a missing port. They are registered separately so
    // a caller can tell the two apart.
    for (const file of await droppedFiles(path.join(packageRoot, "src")))
    {
        const relative = path.relative(packageRoot, file).replaceAll("\\", "/");
        const source = await readFile(file, "utf8");
        for (const node of jsClasses(source))
        {
            if (!classes.has(node.id.name)) classes.set(node.id.name, []);
            classes.get(node.id.name).push({ file: relative, node, dropped: true });
        }
        for (const donor of declaredDonors(source))
        {
            if (!classes.has(donor)) classes.set(donor, []);
            classes.get(donor).push({ file: relative, node: null, declared: true, dropped: true });
        }
    }
    for (const relative of cited)
    {
        const source = await readFile(relativeHeaders.get(relative), "utf8");
        sources.set(relative, { source, types: headerTypes(source) });
    }
    return { classes, sources, problems };
}

/** Ratchet known findings: new and stale entries both fail. */
export async function baselineProblems(findings, baselinePath, write)
{
    const { writeFile } = await import("node:fs/promises");
    if (write)
    {
        await writeFile(baselinePath, JSON.stringify(Object.fromEntries([ ...findings ].sort()), null, 2) + "\n");
        console.log(`Recorded ${findings.size} existing findings in ${path.basename(baselinePath)}.`);
        return true;
    }
    const baseline = JSON.parse(await readFile(baselinePath, "utf8"));
    const fresh = [ ...findings ].filter(([ key ]) => !Object.hasOwn(baseline, key));
    const stale = Object.keys(baseline).filter(key => !findings.has(key));
    for (const [ key, detail ] of fresh) console.error(`${key}: ${detail}`);
    for (const key of stale) console.error(`Stale baseline entry: ${key}`);
    if (fresh.length || stale.length) console.error("Review new findings; remove resolved entries with --write.");
    return !fresh.length && !stale.length;
}
