// Class identity must survive minification. Unlike debt-baseline lints, this
// gate permits zero identity reads from Function.name. Parse code, not comments
// or strings; follow local aliases and diagnostic-only local variables.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";

const traverse = traverseModule.default ?? traverseModule;
const PLATFORM = new Set([
    "Object", "Function", "AsyncFunction", "GeneratorFunction", "AsyncGeneratorFunction",
    "Array", "ArrayBuffer", "SharedArrayBuffer", "DataView", "Promise", "Map", "Set",
    "WeakMap", "WeakSet", "WeakRef", "FinalizationRegistry", "Date", "RegExp",
    "String", "Number", "Boolean", "BigInt", "Symbol", "Error", "TypeError",
    "RangeError", "SyntaxError", "ReferenceError", "EvalError", "URIError",
    "AggregateError", "Uint8Array", "Uint8ClampedArray", "Int8Array", "Uint16Array",
    "Int16Array", "Uint32Array", "Int32Array", "Float16Array", "Float32Array",
    "Float64Array", "BigInt64Array", "BigUint64Array", "Buffer", "URL", "Blob",
    "File", "Image", "ImageData", "ImageBitmap", "HTMLCanvasElement", "OffscreenCanvas"
]);
const member = node => node?.type === "MemberExpression" || node?.type === "OptionalMemberExpression";
const key = node => node.computed ? node.property?.value : node.property?.name;
function memberKey(p)
{
    if (!p.node.computed || p.node.property.type !== "Identifier") return key(p.node);
    const binding = p.scope.getBinding(p.node.property.name);
    return binding?.constant && binding.path.isVariableDeclarator()
        ? binding.path.node.init?.value : undefined;
}

function isConstructor(p, seen = new Set())
{
    if (!p?.node || seen.has(p.node)) return false;
    seen.add(p.node);
    if (member(p.node))
    {
        if (memberKey(p) === "constructor") return true;
        const base = p.get("object");
        return base.isIdentifier() && base.scope.getBinding(base.node.name)?.path.isImportNamespaceSpecifier()
            && /^[A-Z]/u.test(key(p.node) ?? "");
    }
    if (p.isMetaProperty() && p.node.meta.name === "new" && p.node.property.name === "target") return true;
    if (p.isClass() || p.isFunction()) return true;
    if (p.isThisExpression()) return Boolean(p.findParent(parent => parent.isClassMethod() && parent.node.static));
    if (!p.isIdentifier()) return false;
    const binding = p.scope.getBinding(p.node.name);
    if (!binding) return /^[A-Z]/u.test(p.node.name) || /^(ctor|constructor|klass)$/iu.test(p.node.name);
    const lastAssignment = binding.constantViolations.filter(ref => ref.isAssignmentExpression() && ref.node.start < p.node.start).at(-1);
    if (lastAssignment?.get("right").isObjectExpression()) return false;
    if (lastAssignment && isConstructor(lastAssignment.get("right"), seen)) return true;
    if (binding.path.isVariableDeclarator() && binding.path.node.id.type === "ObjectPattern"
        && binding.path.node.id.properties.some(property => property.type === "ObjectProperty"
            && (property.computed ? property.key.value : property.key.name) === "constructor"
            && property.value.type === "Identifier" && property.value.name === p.node.name)) return true;
    if (binding.path.isImportDefaultSpecifier()
        && /(?:^|\/)[A-Z][^/]*\.js$/u.test(binding.path.parent.source.value)) return true;
    if (binding.path.isClassDeclaration() || binding.path.isFunctionDeclaration()) return true;
    if (binding.path.isVariableDeclarator() && isConstructor(binding.path.get("init"), seen)) return true;
    if (binding.path.isImportSpecifier())
    {
        const imported = binding.path.node.imported;
        if (/^[A-Z]/u.test(imported.name ?? imported.value)) return true;
    }
    // Generic constructor parameters and local aliases used in `new` or a
    // function-type guard remain constructors even when their spelling is lower case.
    if (binding.referencePaths.some(ref => (ref.parentPath.isNewExpression() && ref.key === "callee")
        || (ref.parentPath.isUnaryExpression({ operator: "typeof" })
            && ref.parentPath.parentPath.isBinaryExpression()
            && [ref.parentPath.parent.left, ref.parentPath.parent.right].some(node => node?.value === "function")))) return true;
    return /^[A-Z]/u.test(p.node.name) || /^(ctor|constructor|klass)$/iu.test(p.node.name);
}

function onlyErrorText(p, seen = new Set())
{
    if (!p?.parentPath || seen.has(p.node)) return false;
    seen.add(p.node);
    const parent = p.parentPath;
    if (parent.isNewExpression() && p.listKey === "arguments" && p.key === 0
        && parent.node.callee.type === "Identifier" && /Error$/u.test(parent.node.callee.name)) return true;
    if (parent.isTemplateLiteral() || parent.isConditionalExpression() && p.key !== "test"
        || parent.isLogicalExpression() || parent.isBinaryExpression({ operator: "+" })) return onlyErrorText(parent, seen);
    if (parent.isVariableDeclarator() && p.key === "init" && parent.node.id.type === "Identifier")
    {
        const binding = parent.scope.getBinding(parent.node.id.name);
        return Boolean(binding?.constant && binding.referencePaths.length
            && binding.referencePaths.every(ref => onlyErrorText(ref, new Set(seen))));
    }
    return false;
}

/** Return forbidden identity reads in one JavaScript source. */
export function findConstructorNameHits(source, filename = "input.js")
{
    const hits = [];
    const ast = parse(source, { sourceType: "module", plugins: ["decorators"], sourceFilename: filename });
    traverse(ast, {
        "MemberExpression|OptionalMemberExpression"(p)
        {
            if (memberKey(p) !== "name") return;
            const object = p.get("object");
            if (!isConstructor(object)) return;
            // Intrinsics may be named, but an imported/local shadow is ours.
            if (object.isIdentifier() && object.node.name !== "Function" && PLATFORM.has(object.node.name)
                && !object.scope.getBinding(object.node.name)) return;
            const parent = p.parentPath;
            // The established AsyncFunction platform test, not a class lookup.
            if (member(object.node) && key(object.node) === "constructor" && parent.isBinaryExpression()
                && ["===", "!=="].includes(parent.node.operator)
                && [parent.node.left, parent.node.right].some(node => ["AsyncFunction", "GeneratorFunction", "AsyncGeneratorFunction"].includes(node?.value))) return;
            if (onlyErrorText(p)) return;
            hits.push({ file: filename, line: p.node.loc.start.line, column: p.node.loc.start.column + 1,
                expression: source.slice(p.node.start, p.node.end) });
        },
        "VariableDeclarator|AssignmentExpression"(p)
        {
            const pattern = p.get(p.isVariableDeclarator() ? "id" : "left");
            const value = p.get(p.isVariableDeclarator() ? "init" : "right");
            if (!pattern.isObjectPattern()) return;
            const patterns = [{pattern, constructor: isConstructor(value)}];
            for (const entry of patterns) for (const property of entry.pattern.get("properties"))
            {
                if (!property.isObjectProperty()) continue;
                const name = property.node.computed ? property.node.key.value : property.node.key.name;
                if (name === "constructor" && property.get("value").isObjectPattern())
                    patterns.push({pattern: property.get("value"), constructor: true});
                if (name !== "name" || !entry.constructor) continue;
                const target = property.get("value");
                const binding = target.isIdentifier() && target.scope.getBinding(target.node.name);
                if (binding?.constant && binding.referencePaths.length && binding.referencePaths.every(ref => onlyErrorText(ref))) continue;
                hits.push({ file: filename, line: property.node.loc.start.line, column: property.node.loc.start.column + 1,
                    expression: source.slice(p.node.start, p.node.end) });
            }
        }
    });
    return hits;
}

function scan(directory)
{
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
    {
        const file = path.join(directory, entry.name);
        return entry.isDirectory() ? scan(file) : file.endsWith(".js")
            ? findConstructorNameHits(fs.readFileSync(file, "utf8"), file) : [];
    });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
{
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const hits = scan(path.join(root, "src"));
    for (const hit of hits) console.error(`${path.relative(root, hit.file)}:${hit.line}:${hit.column} ${hit.expression}`);
    console.log(`constructor-name lint hits: ${hits.length}`);
    if (hits.length) process.exitCode = 1;
}
