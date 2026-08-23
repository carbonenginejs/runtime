/**
 * Executable dependency boundary for the combined runtime.
 *
 * Package boundaries enforced this graph before consolidation. This module
 * validates the declared DAG, package maps, every static module edge, and the
 * deliberately narrower aggregate surfaces.
 */
import { parse } from "@babel/parser";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { builtinModules } from "node:module";
import { dirname, isAbsolute, join, normalize, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_ROOT = fileURLToPath(new URL("..", import.meta.url));
const NODE_BUILTINS = new Set(builtinModules.map(name => name.replace(/^node:/u, "")));

function slash(value)
{
    return value.split(sep).join("/");
}

function inside(root, target)
{
    const path = relative(root, target);
    return path === "" || (!path.startsWith(`..${sep}`) && path !== ".." && !isAbsolute(path));
}

async function sourceFiles(directory)
{
    if (!existsSync(directory)) return [];

    const found = [];
    for (const entry of await readdir(directory, { withFileTypes: true }))
    {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) found.push(...await sourceFiles(path));
        else if (entry.name.endsWith(".js")) found.push(path);
    }
    return found;
}

function configuredLayer(file, sourceRoot, layerNames)
{
    const path = slash(relative(sourceRoot, file));
    return layerNames.find(layer => path === layer || path.startsWith(`${layer}/`)) ?? null;
}

function collectTargetStrings(value, label, problems, out = [])
{
    if (value === null) return out;
    if (typeof value === "string")
    {
        out.push(value);
        return out;
    }
    if (Array.isArray(value))
    {
        for (const entry of value) collectTargetStrings(entry, label, problems, out);
        return out;
    }
    if (value && typeof value === "object")
    {
        for (const entry of Object.values(value)) collectTargetStrings(entry, label, problems, out);
        return out;
    }

    problems.push(`${label} has unsupported target type ${typeof value}`);
    return out;
}

function validatePackageMap(field, map, root, problems)
{
    if (map === undefined) return;
    if (!map || typeof map !== "object" || Array.isArray(map))
    {
        problems.push(`package.json ${field} must be an object`);
        return;
    }

    for (const [ key, value ] of Object.entries(map))
    {
        const valid = field === "exports"
            ? key === "." || key.startsWith("./")
            : key.startsWith("#") && key !== "#" && !key.startsWith("#/");

        if (!valid || key.startsWith("//"))
        {
            problems.push(`package.json ${field} has invalid key "${key}"`);
        }

        const targets = collectTargetStrings(value, `package.json ${field} "${key}"`, problems);
        for (const target of targets)
        {
            if (!target.startsWith("./"))
            {
                problems.push(`package.json ${field}: "${key}" target "${target}" must be package-relative`);
                continue;
            }

            const wildcard = target.indexOf("*");
            const prefix = wildcard === -1 ? target : target.slice(0, wildcard);
            const check = wildcard === -1
                ? resolve(root, target)
                : resolve(root, prefix.endsWith("/") ? prefix : dirname(prefix));

            if (!inside(root, check))
            {
                problems.push(`package.json ${field}: "${key}" target "${target}" escapes the package`);
            }
            else if (!existsSync(check))
            {
                problems.push(`package.json ${field}: "${key}" -> ${target} does not exist`);
            }
        }
    }
}

function validateGraph(layers, sourceRoot, problems)
{
    const names = Object.keys(layers);
    for (const name of names)
    {
        if (name !== slash(normalize(name)) || name.startsWith("../") || name.startsWith("/"))
        {
            problems.push(`layers.json has invalid layer path "${name}"`);
        }
        if (!existsSync(join(sourceRoot, name)))
        {
            problems.push(`layers.json layer "${name}" has no source directory`);
        }

        const imports = layers[name]?.mayImport;
        if (!Array.isArray(imports))
        {
            problems.push(`layers.json layer "${name}" requires a mayImport array`);
            continue;
        }

        const seen = new Set();
        for (const target of imports)
        {
            if (target === name) problems.push(`layers.json layer "${name}" imports itself`);
            if (!Object.hasOwn(layers, target)) problems.push(`layers.json layer "${name}" names unknown layer "${target}"`);
            if (seen.has(target)) problems.push(`layers.json layer "${name}" repeats "${target}"`);
            seen.add(target);
        }
    }

    const visiting = new Set();
    const visited = new Set();
    const stack = [];

    function visit(name)
    {
        if (visited.has(name)) return;
        if (visiting.has(name))
        {
            const start = stack.indexOf(name);
            problems.push(`layers.json cycle: ${[ ...stack.slice(start), name ].join(" -> ")}`);
            return;
        }

        visiting.add(name);
        stack.push(name);
        for (const target of layers[name]?.mayImport ?? [])
        {
            if (Object.hasOwn(layers, target)) visit(target);
        }
        stack.pop();
        visiting.delete(name);
        visited.add(name);
    }

    for (const name of names) visit(name);
    return names.sort((a, b) => b.length - a.length);
}

function parseSpecifiers(source, shown, problems, allowExternalDynamicImport = false)
{
    let ast;
    try
    {
        ast = parse(source, {
            sourceType: "module",
            createImportExpressions: true,
            plugins: [
                "decorators",
                "decoratorAutoAccessors",
                "classProperties",
                "classPrivateProperties",
                "classPrivateMethods",
                "importAttributes",
                "topLevelAwait"
            ]
        });
    }
    catch (error)
    {
        problems.push(`${shown}: cannot parse module: ${error.message}`);
        return [];
    }

    const found = [];
    function literal(node, kind, allowNonliteral = false)
    {
        if (node?.type === "StringLiteral") return node.value;
        if (node?.type === "Literal" && typeof node.value === "string") return node.value;
        if (node?.type === "TemplateLiteral" && node.expressions.length === 0)
        {
            return node.quasis[0]?.value?.cooked ?? node.quasis[0]?.value?.raw ?? "";
        }
        if (!allowNonliteral) problems.push(`${shown}: ${kind} must use a literal module specifier`);
        return null;
    }

    function walk(node)
    {
        if (!node || typeof node !== "object") return;

        if (node.type === "ImportDeclaration"
            || node.type === "ExportNamedDeclaration"
            || node.type === "ExportAllDeclaration")
        {
            if (node.source)
            {
                const value = literal(node.source, "module edge");
                if (value !== null) found.push(value);
            }
        }
        else if (node.type === "ImportExpression")
        {
            const value = literal(node.source, "dynamic import", allowExternalDynamicImport);
            if (value !== null) found.push(value);
        }
        else if (node.type === "CallExpression" && node.callee?.type === "Import")
        {
            const value = literal(node.arguments[0], "dynamic import", allowExternalDynamicImport);
            if (value !== null) found.push(value);
        }

        for (const value of Object.values(node))
        {
            if (Array.isArray(value)) for (const child of value) walk(child);
            else if (value && typeof value === "object" && typeof value.type === "string") walk(value);
        }
    }

    walk(ast.program);
    return found;
}

function matchingImportEntry(specifier, imports)
{
    if (Object.hasOwn(imports, specifier)) return [ specifier, imports[specifier], "" ];

    const matches = [];
    for (const [ key, value ] of Object.entries(imports))
    {
        const star = key.indexOf("*");
        if (star === -1) continue;
        const prefix = key.slice(0, star);
        const suffix = key.slice(star + 1);
        if (specifier.startsWith(prefix) && specifier.endsWith(suffix))
        {
            matches.push([ key, value, specifier.slice(prefix.length, specifier.length - suffix.length), prefix.length ]);
        }
    }
    matches.sort((a, b) => b[3] - a[3]);
    return matches[0] ?? null;
}

function externalPackageName(specifier)
{
    const parts = specifier.split("/");
    return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

function resolveSpecifierLayers(specifier, file, context)
{
    const { root, sourceRoot, layerNames, surfaces, imports, externalImports, problems, shown } = context;

    if (specifier.startsWith("@carbonenginejs/"))
    {
        problems.push(`${shown}: imports "${specifier}" — use a "#" specifier inside the combined runtime`);
        return [];
    }

    let targets = [];
    if (specifier.startsWith("#"))
    {
        const match = matchingImportEntry(specifier, imports);
        if (!match)
        {
            problems.push(`${shown}: "${specifier}" is not declared in package.json imports`);
            return [];
        }
        const [ key, value, replacement ] = match;
        targets = collectTargetStrings(value, `package.json imports "${key}"`, problems)
            .map(target => target.replace("*", replacement));
    }
    else if (specifier.startsWith("."))
    {
        const clean = specifier.split(/[?#]/u, 1)[0];
        const target = resolve(dirname(file), clean);
        if (!inside(sourceRoot, target))
        {
            problems.push(`${shown}: relative import "${specifier}" escapes src`);
            return [];
        }
        if (!existsSync(target))
        {
            problems.push(`${shown}: relative import "${specifier}" does not resolve exactly`);
            return [];
        }
        targets = [ `./${slash(relative(root, target))}` ];
    }
    else
    {
        const unprefixed = specifier.replace(/^node:/u, "");
        if (specifier.startsWith("node:") || NODE_BUILTINS.has(unprefixed))
        {
            problems.push(`${shown}: browser runtime source may not import Node built-in "${specifier}"`);
        }
        else
        {
            const packageName = externalPackageName(specifier);
            if (!externalImports.has(packageName))
            {
                problems.push(`${shown}: external package "${packageName}" is not allowed by layers.json externalImports`);
            }
        }
        return [];
    }

    const result = [];
    for (const target of targets)
    {
        if (!target.startsWith("./")) continue;
        const path = resolve(root, target);
        const surfacePath = slash(relative(sourceRoot, path));
        if (surfaces[surfacePath])
        {
            result.push(...surfaces[surfacePath].mayImport);
            continue;
        }
        const layer = configuredLayer(path, sourceRoot, layerNames);
        if (!layer) problems.push(`${shown}: "${specifier}" resolves outside every configured layer`);
        else result.push(layer);
    }
    return result;
}

/**
 * Validates one combined-runtime tree without exiting the process.
 *
 * @param {object} [options]
 * @param {string} [options.root]
 * @returns {Promise<{problems: string[], layerCount: number}>}
 */
export async function validateLayering(options = {})
{
    const root = resolve(options.root ?? DEFAULT_ROOT);
    const sourceRoot = join(root, "src");
    const problems = [];
    const config = JSON.parse(await readFile(join(root, "layers.json"), "utf8"));
    const manifest = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
    const layers = config.layers ?? {};
    const surfaces = config.surfaces ?? {};
    const imports = manifest.imports ?? {};
    const externalImportValues = config.externalImports ?? [];
    const externalImports = new Set(Array.isArray(externalImportValues) ? externalImportValues : []);
    const externalDynamicImportValues = config.externalDynamicImports ?? [];
    const externalDynamicImports = new Set(Array.isArray(externalDynamicImportValues)
        ? externalDynamicImportValues
        : []);

    if (!Array.isArray(externalImportValues))
    {
        problems.push("layers.json externalImports must be an array");
    }
    for (const packageName of externalImports)
    {
        if (typeof packageName !== "string" || !packageName)
        {
            problems.push("layers.json externalImports entries must be non-empty package names");
        }
        else if (!Object.hasOwn(manifest.dependencies ?? {}, packageName))
        {
            problems.push(`layers.json externalImports names undeclared dependency "${packageName}"`);
        }
    }
    if (!Array.isArray(externalDynamicImportValues))
    {
        problems.push("layers.json externalDynamicImports must be an array");
    }
    for (const sourcePath of externalDynamicImports)
    {
        if (typeof sourcePath !== "string" || !sourcePath)
        {
            problems.push("layers.json externalDynamicImports entries must be source-relative paths");
            continue;
        }
        const target = join(sourceRoot, sourcePath);
        if (sourcePath !== slash(normalize(sourcePath)) || sourcePath.startsWith("../")
            || sourcePath.startsWith("/") || !inside(sourceRoot, target))
        {
            problems.push("layers.json externalDynamicImports entries must be source-relative paths");
        }
        else if (!existsSync(target))
        {
            problems.push(`layers.json externalDynamicImports path does not exist: "${sourcePath}"`);
        }
    }

    validatePackageMap("exports", manifest.exports, root, problems);
    validatePackageMap("imports", imports, root, problems);
    const layerNames = validateGraph(layers, sourceRoot, problems);

    for (const [ path, rule ] of Object.entries(surfaces))
    {
        if (!existsSync(join(sourceRoot, path))) problems.push(`layers.json surface "${path}" does not exist`);
        if (!Array.isArray(rule?.mayImport)) problems.push(`layers.json surface "${path}" requires a mayImport array`);
        for (const target of rule?.mayImport ?? [])
        {
            if (!Object.hasOwn(layers, target)) problems.push(`layers.json surface "${path}" names unknown layer "${target}"`);
        }
    }

    for (const file of await sourceFiles(sourceRoot))
    {
        const shown = slash(relative(root, file));
        const sourcePath = slash(relative(sourceRoot, file));
        const surface = surfaces[sourcePath] ?? null;
        const from = configuredLayer(file, sourceRoot, layerNames);
        const rule = surface ?? (from ? layers[from] : null);

        if (!rule)
        {
            problems.push(`${shown}: file belongs to no configured layer or surface`);
            continue;
        }

        const allowed = new Set(rule.mayImport ?? []);
        for (const specifier of parseSpecifiers(
            await readFile(file, "utf8"),
            shown,
            problems,
            externalDynamicImports.has(sourcePath)
        ))
        {
            const targets = resolveSpecifierLayers(specifier, file, {
                root,
                sourceRoot,
                layerNames,
                surfaces,
                imports,
                externalImports,
                problems,
                shown
            });
            for (const to of targets)
            {
                if (!surface && to === from) continue;
                if (!allowed.has(to))
                {
                    const owner = surface ? `surface "${sourcePath}"` : `"${from}"`;
                    problems.push(`${shown}: ${owner} may not import "${to}"`);
                }
            }
        }
    }

    return { problems, layerCount: Object.keys(layers).length };
}
