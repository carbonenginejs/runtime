// Guards the class-shape rule that every property an object will ever have is
// a declared class field above the constructor - private, runtime-only and
// constructor-set ones included - and that nothing adds a property after
// construction (class-ownership.md § Class-shape rules, operator 2026-10-19).
//
// WHY THIS SCRIPT EXISTS. A property that appears only because a constructor
// or a method happened to assign it is invisible to the class's own
// declaration. Decorators can only describe a declared field, so it can carry
// no metadata; the default-value rules cannot apply to it; and every object
// that grows one later changes shape, which the engine pays for on every hot
// read. The rule is easy to state and impossible to hold by eye: a measurement
// on 2026-10-19 found more than a thousand such writes.
//
// WHAT IT CATCHES. Four kinds, each counted separately:
//
//   undeclared      `this.name = ...` where no declaration of `name` exists on
//                   the class or any base it resolves to.
//   unresolvedBase  the same write in a class whose base chain leaves this
//                   runtime before `name` is found, so the check cannot say.
//   defineProperty  `Object.defineProperty(target, ...)` or
//                   `Object.defineProperties(target, ...)` on an instance.
//   assignThis      `Object.assign(this, ...)`, which adds whatever the source
//                   object happens to hold.
//
// HOW A WRITE IS FOUND. Inside a class body - methods, accessors, the
// constructor, field initializers and static blocks - a write is a plain or
// compound assignment, `++`/`--`, a destructuring target, or a `for...in/of`
// target whose object is `this` and whose key is an identifier or a string
// literal. Arrow functions inherit `this` and are searched; nested regular
// functions and nested classes have their own `this` and are not (a nested
// class is checked as itself). A computed key such as `this[field]` names no
// property this check can see and is left alone. `this.#name` is not counted:
// an undeclared private name is already a syntax error.
//
// HOW `name` IS DECLARED. A non-computed field, accessor (get, set or
// `accessor`) or method of the class, or of a base found by following
// `extends`. Instance writes are checked against instance members and writes
// from static members against static members. Bases are resolved through the
// module graph, not by bare name: a local class, a variable holding a class,
// an `import`, a re-export, `export *` and a namespace member are all
// followed to the file that declares the class. Relative specifiers resolve
// against the importing file; `#alias` specifiers resolve through
// package.json `imports`, exact key first, then the wildcard key with the
// longest prefix, as Node does. A base that ends anywhere else - a platform
// class (Array, Error, Map, EventTarget), an external package, a mixin call or
// any other expression - is unresolved. A write the resolved part of the chain
// does not declare is then counted as unresolvedBase rather than dropped.
//
// `CjsSchema.*.define(X, { fields })` IS NOT A DECLARATION. It records
// metadata in the class's schema table and installs nothing on the instance;
// `CjsSchema.getDefaults` constructs an object and reads `instance[name]`,
// falling back to the schema default only when the property is absent. The
// property itself still comes from the constructor's assignment, which is the
// shape change the rule forbids. Folders that cannot use decorators can still
// write a plain class field; the schema entry describes it.
//
// HOW defineProperty DECIDES "INSTANCE". The target is an instance unless it
// is provably a class, a prototype, a global or decorator metadata:
//   - `this` counts in an instance method, constructor, instance field
//     initializer or plain function; in a static member it is the class, and
//     at module level it is undefined, so neither counts;
//   - `X.prototype`, a variable initialized from one or from
//     `Object.getPrototypeOf(...)`, and `Object.getPrototypeOf(...)` itself are
//     prototypes;
//   - an identifier bound to a class (a declaration, a class expression, or an
//     import that resolves to one) is a static target, and so is any
//     PascalCase identifier, which is this runtime's spelling for a class:
//     that is what keeps a `Constructor` parameter out;
//   - an identifier bound to a function (a declaration, or a variable holding
//     a function or arrow expression) is a function object, not an instance;
//   - `globalThis`, `window`, `self`, `global` and any unbound global name
//     (a platform constructor such as `Error`) are globals;
//   - `context.metadata` (or `context?.metadata`), `X[Symbol.metadata]`, and
//     variables initialized from either, are decorator metadata;
//   - a variable initialized from `Object.create(null)` in the same function
//     as the call is a null-prototype dictionary, not an instance. Keys that
//     come from data belong in a Map (Ruru, 2026-10-20); where a dictionary
//     object is kept instead, it is built this way, and that is the only
//     dictionary this check exempts. A `{}` literal, or a dictionary that
//     arrives as a parameter or member, still counts.
// Everything else - a parameter, a local object, a member such as `this.map`,
// a call or `new` result - counts. A parameter that in practice receives a
// prototype or a function is still counted: nothing at the site says so.
//
// HOW THE BASELINE WORKS. The existing sites are frozen per file and per kind,
// the same ratchet as lint-optional-calls, and the check fails only when a
// file's count for a kind goes UP. Burn a file down and re-record the lower
// number with `--write`. A kind with no sites left is written OUT of the
// baseline, and from then on any site of that kind fails. A file waiting on a
// named later pass carries its reason in the baseline's `held` table, kept by
// `--write` for as long as the file still has sites. `--list` prints every
// site with its kind, line and name.

import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import { fileURLToPath } from "node:url";

const traverse = traverseModule.default ?? traverseModule;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(root, "src");
const baselineFile = path.join(root, "scripts", "undeclared-field-baseline.json");
const packageImports = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8")).imports ?? {};

const RULES = {
    undeclared: "writes to undeclared properties",
    unresolvedBase: "writes to properties not declared above an unresolved base",
    defineProperty: "Object.defineProperty calls on instances",
    assignThis: "Object.assign(this, ...) calls"
};

const GLOBAL_OBJECTS = new Set([ "globalThis", "window", "self", "global" ]);
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

/** The name a non-computed (or string-keyed) key spells, or null. */
function keyName(key, computed)
{
    if (key.type === "StringLiteral") return key.value;
    if (!computed && key.type === "Identifier") return key.name;
    return null;
}

// ---------------------------------------------------------------------------
// Modules and specifiers.

/** @type {Map<string, { ast: object, program: object }>} */
const modules = new Map();

/** Every class node's declared members, its file and its scope. */
const records = new WeakMap();

const FILE_CANDIDATES = [ "", ".js", "/index.js" ];

function existingModule(absolute)
{
    for (const suffix of FILE_CANDIDATES)
    {
        const candidate = path.normalize(absolute + suffix);
        if (modules.has(candidate)) return candidate;
    }
    return null;
}

/** package.json `imports`: exact key, then the wildcard with the longest prefix. */
function resolveAlias(specifier)
{
    if (Object.hasOwn(packageImports, specifier)) return packageImports[specifier];

    let best = null;
    for (const key of Object.keys(packageImports))
    {
        const star = key.indexOf("*");
        if (star < 0) continue;
        const prefix = key.slice(0, star);
        const suffix = key.slice(star + 1);
        if (!specifier.startsWith(prefix) || !specifier.endsWith(suffix)) continue;
        if (specifier.length < prefix.length + suffix.length) continue;
        if (best && best.prefix.length >= prefix.length) continue;
        best = { prefix, target: packageImports[key].replace("*", specifier.slice(prefix.length, specifier.length - suffix.length)) };
    }
    return best ? best.target : null;
}

/** The absolute file a specifier names inside src, or null for anything outside. */
function resolveSpecifier(fromFile, specifier)
{
    if (specifier.startsWith(".")) return existingModule(path.resolve(path.dirname(fromFile), specifier));
    if (specifier.startsWith("#"))
    {
        const target = resolveAlias(specifier);
        return target === null ? null : existingModule(path.resolve(root, target));
    }
    return null;
}

// ---------------------------------------------------------------------------
// Resolving a name to a class record.

/** Follows an exported name to its class record, or null. */
function resolveExport(file, name, seen)
{
    const key = `${file}\0${name}`;
    if (seen.has(key)) return null;
    seen.add(key);

    const module = modules.get(file);
    if (!module) return null;

    for (const statement of module.ast.program.body)
    {
        if (statement.type === "ExportDefaultDeclaration" && name === "default")
        {
            const declaration = statement.declaration;
            if (declaration.type === "ClassDeclaration" || declaration.type === "ClassExpression") return records.get(declaration) ?? null;
            if (declaration.type === "Identifier") return resolveIdentifier(module.program.scope, declaration.name, file, seen);
            return null;
        }
        if (statement.type !== "ExportNamedDeclaration") continue;

        const declaration = statement.declaration;
        if (declaration?.type === "ClassDeclaration" && declaration.id.name === name) return records.get(declaration) ?? null;
        if (declaration?.type === "VariableDeclaration")
        {
            for (const declarator of declaration.declarations)
            {
                if (declarator.id.type === "Identifier" && declarator.id.name === name)
                {
                    return resolveIdentifier(module.program.scope, name, file, seen);
                }
            }
        }

        for (const specifier of statement.specifiers)
        {
            const exported = keyName(specifier.exported, false);
            if (exported !== name || specifier.type !== "ExportSpecifier") continue;
            if (!statement.source) return resolveIdentifier(module.program.scope, specifier.local.name, file, seen);
            const target = resolveSpecifier(file, statement.source.value);
            return target === null ? null : resolveExport(target, specifier.local.name, seen);
        }
    }

    for (const statement of module.ast.program.body)
    {
        if (statement.type !== "ExportAllDeclaration" || statement.exported) continue;
        const target = resolveSpecifier(file, statement.source.value);
        const found = target === null ? null : resolveExport(target, name, seen);
        if (found) return found;
    }

    return null;
}

/** Follows a scope binding to a class record, or null. */
function resolveIdentifier(scope, name, file, seen)
{
    const binding = scope.getBinding(name);
    if (!binding) return null;
    const node = binding.path.node;

    if (binding.kind === "module")
    {
        const declaration = binding.path.parent;
        const target = resolveSpecifier(file, declaration.source.value);
        if (target === null || node.type === "ImportNamespaceSpecifier") return null;
        const imported = node.type === "ImportDefaultSpecifier" ? "default" : keyName(node.imported, false);
        return resolveExport(target, imported, seen);
    }
    if (node.type === "ClassDeclaration") return records.get(node) ?? null;
    if (node.type === "VariableDeclarator" && node.id.type === "Identifier")
    {
        const init = node.init;
        if (init?.type === "ClassExpression") return records.get(init) ?? null;
        if (init?.type === "Identifier") return resolveIdentifier(binding.path.scope, init.name, file, seen);
        if (init?.type === "MemberExpression") return resolveMember(binding.path.scope, init, file, seen);
    }
    return null;
}

/** `ns.X` through a namespace import, or null. */
function resolveMember(scope, member, file, seen)
{
    if (member.object.type !== "Identifier") return null;
    const name = keyName(member.property, member.computed);
    if (name === null) return null;
    const binding = scope.getBinding(member.object.name);
    if (binding?.kind !== "module" || binding.path.node.type !== "ImportNamespaceSpecifier") return null;
    const target = resolveSpecifier(file, binding.path.parent.source.value);
    return target === null ? null : resolveExport(target, name, seen);
}

/** The record a class's `extends` resolves to, null when there is none, or "unresolved". */
function baseOf(record)
{
    if (record.base !== undefined) return record.base;
    const superClass = record.superClass;
    let base = null;
    if (superClass)
    {
        const seen = new Set();
        if (superClass.type === "Identifier") base = resolveIdentifier(record.scope, superClass.name, record.file, seen);
        else if (superClass.type === "MemberExpression") base = resolveMember(record.scope, superClass, record.file, seen);
        if (base === null) base = "unresolved";
    }
    record.base = base;
    return base;
}

/**
 * Whether a class's chain ends at the global Array. Array declares its own
 * `length` on every instance, so a write to it adds nothing (ruling,
 * 2026-10-19); BlueList truncates through it.
 */
function extendsGlobalArray(record)
{
    const superClass = record.superClass;
    return superClass?.type === "Identifier" && superClass.name === "Array" && !record.scope.getBinding("Array");
}

/** "yes", "no" or "unresolved": whether a class or its bases declare a name. */
function declared(record, name, isStatic, seen = new Set())
{
    for (let current = record; ; )
    {
        if ((isStatic ? current.statics : current.instance).has(name)) return "yes";
        if (seen.has(current)) return "no";
        seen.add(current);
        const base = baseOf(current);
        if (base === null) return "no";
        if (base === "unresolved") return extendsGlobalArray(current) && !isStatic && name === "length" ? "yes" : "unresolved";
        current = base;
    }
}

// ---------------------------------------------------------------------------
// Pass 1: parse everything and record every class's own members.

for (const file of await sourceFiles(sourceRoot))
{
    const relativeFile = slash(path.relative(root, file));
    const ast = parseModule(await fs.readFile(file, "utf8"), relativeFile);
    const module = { ast, program: null, relativeFile };
    modules.set(path.normalize(file), module);

    traverse(ast, {
        Program(p)
        {
            module.program = p;
        },
        Class(p)
        {
            const record = { file: path.normalize(file), scope: p.scope, superClass: p.node.superClass, base: undefined, instance: new Set(), statics: new Set() };
            for (const member of p.node.body.body)
            {
                if (!member.key || member.type === "ClassPrivateProperty" || member.type === "ClassPrivateMethod") continue;
                const name = keyName(member.key, member.computed);
                if (name !== null) (member.static ? record.statics : record.instance).add(name);
            }
            records.set(p.node, record);
        }
    });
}

// ---------------------------------------------------------------------------
// Pass 2: the four kinds.

const MEMBER_TYPES = new Set([ "ClassMethod", "ClassPrivateMethod", "ClassProperty", "ClassPrivateProperty", "ClassAccessorProperty", "StaticBlock" ]);

function isObjectCall(node, ...names)
{
    const callee = node.callee;
    return callee.type === "MemberExpression" && !callee.computed
        && callee.object.type === "Identifier" && callee.object.name === "Object"
        && callee.property.type === "Identifier" && names.includes(callee.property.name);
}

/** The `this.<name>` members a write target (pattern or expression) assigns. */
function thisTargets(target, out = [])
{
    switch (target?.type)
    {
        case "MemberExpression":
        {
            const name = target.object.type === "ThisExpression" ? keyName(target.property, target.computed) : null;
            if (name !== null) out.push({ name, line: target.loc.start.line });
            break;
        }
        case "ObjectPattern":
            for (const property of target.properties) thisTargets(property.type === "RestElement" ? property.argument : property.value, out);
            break;
        case "ArrayPattern":
            for (const element of target.elements) thisTargets(element, out);
            break;
        case "AssignmentPattern":
            thisTargets(target.left, out);
            break;
        case "RestElement":
            thisTargets(target.argument, out);
            break;
    }
    return out;
}

/** Whether `this` at a path is an instance: false in static members and at module level. */
function thisIsInstance(p)
{
    for (let current = p.parentPath; current; current = current.parentPath)
    {
        const node = current.node;
        if (node.type === "ArrowFunctionExpression") continue;
        if (MEMBER_TYPES.has(node.type) || node.type === "ClassMethod") return !node.static;
        if (current.isFunction()) return true;
        if (node.type === "Program") return false;
    }
    return false;
}

function isMetadata(node)
{
    if (node?.type !== "MemberExpression" && node?.type !== "OptionalMemberExpression") return false;
    if (!node.computed && node.property.type === "Identifier" && node.property.name === "metadata") return true;
    return node.computed && node.property.type === "MemberExpression"
        && node.property.object.type === "Identifier" && node.property.object.name === "Symbol"
        && keyName(node.property.property, node.property.computed) === "metadata";
}

/** Whether a node is `Object.create(null)`. */
function isNullPrototypeCreate(node)
{
    return node?.type === "CallExpression" && isObjectCall(node, "create")
        && node.arguments.length === 1 && node.arguments[0].type === "NullLiteral";
}

function isPrototype(node)
{
    if (node?.type === "MemberExpression" && keyName(node.property, node.computed) === "prototype") return true;
    return node?.type === "CallExpression" && isObjectCall(node, "getPrototypeOf");
}

/** Whether an Object.defineProperty target is an instance (see the header). */
function isInstanceTarget(targetPath, file)
{
    const node = targetPath.node;
    if (node.type === "ThisExpression") return thisIsInstance(targetPath);
    if (isPrototype(node) || isMetadata(node)) return false;
    if (node.type !== "Identifier") return true;
    if (GLOBAL_OBJECTS.has(node.name) || PASCAL.test(node.name)) return false;

    const binding = targetPath.scope.getBinding(node.name);
    if (!binding) return false;
    const bound = binding.path.node;
    if (bound.type === "ClassDeclaration" || bound.type === "FunctionDeclaration") return false;
    if (binding.kind === "module") return resolveIdentifier(targetPath.scope, node.name, file, new Set()) === null;
    if (bound.type === "VariableDeclarator")
    {
        const init = bound.init;
        if (/^(Class|Function|ArrowFunction)Expression$/u.test(init?.type ?? "") || isPrototype(init) || isMetadata(init)) return false;
        if (init?.type === "Identifier" && resolveIdentifier(binding.path.scope, init.name, file, new Set()) !== null) return false;
        if (isNullPrototypeCreate(init) && binding.path.getFunctionParent()?.node === targetPath.getFunctionParent()?.node) return false;
    }
    return true;
}

function findSites(module)
{
    const sites = { undeclared: [], unresolvedBase: [], defineProperty: [], assignThis: [] };
    const file = path.normalize(path.join(root, module.relativeFile));

    const write = (record, isStatic, target) =>
    {
        for (const { name, line } of thisTargets(target))
        {
            const answer = declared(record, name, isStatic);
            if (answer === "no") sites.undeclared.push({ line, name });
            else if (answer === "unresolved") sites.unresolvedBase.push({ line, name });
        }
    };

    traverse(module.ast, {
        Class(p)
        {
            const record = records.get(p.node);
            for (const memberPath of p.get("body").get("body"))
            {
                const member = memberPath.node;
                if (!MEMBER_TYPES.has(member.type)) continue;
                const isStatic = !!member.static;

                memberPath.traverse({
                    Function(inner)
                    {
                        if (inner.node.type !== "ArrowFunctionExpression") inner.skip();
                    },
                    Class(inner)
                    {
                        inner.skip();
                    },
                    AssignmentExpression(a)
                    {
                        write(record, isStatic, a.node.left);
                    },
                    UpdateExpression(u)
                    {
                        write(record, isStatic, u.node.argument);
                    },
                    "ForInStatement|ForOfStatement"(f)
                    {
                        write(record, isStatic, f.node.left);
                    }
                });
            }
        },
        CallExpression(c)
        {
            const first = c.get("arguments")[0];
            if (!first) return;
            if (isObjectCall(c.node, "assign"))
            {
                if (first.node.type === "ThisExpression" && thisIsInstance(first)) sites.assignThis.push({ line: c.node.loc.start.line, name: "" });
                return;
            }
            if (isObjectCall(c.node, "defineProperty", "defineProperties") && isInstanceTarget(first, file))
            {
                const property = c.node.arguments[1];
                const name = c.node.callee.property.name === "defineProperty" && property?.type === "StringLiteral" ? property.value : "";
                sites.defineProperty.push({ line: c.node.loc.start.line, name });
            }
        }
    });

    return sites;
}

// ---------------------------------------------------------------------------

const counts = Object.fromEntries(Object.keys(RULES).map(rule => [ rule, {} ]));
const lines = Object.fromEntries(Object.keys(RULES).map(rule => [ rule, {} ]));

for (const module of modules.values())
{
    const sites = findSites(module);

    for (const rule of Object.keys(RULES))
    {
        if (!sites[rule].length) continue;
        sites[rule].sort((a, b) => a.line - b.line);
        counts[rule][module.relativeFile] = sites[rule].length;
        lines[rule][module.relativeFile] = sites[rule];
    }
}

if (process.argv.includes("--list"))
{
    for (const rule of Object.keys(RULES))
    {
        for (const [ file, at ] of Object.entries(lines[rule]))
        {
            for (const { line, name } of at) console.log(`${rule}\t${file}:${line}\t${name}`);
        }
    }
    process.exit(0);
}

if (process.argv.includes("--write"))
{
    const written = {};

    for (const rule of Object.keys(RULES))
    {
        if (Object.keys(counts[rule]).length)
        {
            written[rule] = Object.fromEntries(Object.entries(counts[rule]).sort(([ a ], [ b ]) => (a < b ? -1 : 1)));
        }
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
    console.log(`undeclared-field baseline written, files per kind: ${summary}`);
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
            const at = lines[rule][file].map(({ line, name }) => (name ? `${line} ${name}` : `${line}`)).join(", ");
            problems.push(
                `${file}: ${found} ${RULES[rule]} (lines ${at}), baseline ${allowed}. `
                + "Declare the property as a class field above the constructor."
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

console.log(`Undeclared fields: ${summary}. None above baseline.`);

// A file that improved and was not re-recorded is not an error, but it is how
// the baseline rots back upwards, so it is said out loud.
if (improved.length)
{
    console.log(`${improved.length} file(s) are below baseline - re-record with --write to lock the gain in.`);
}
