import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";


const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const allSourceRoot = path.join(root, "src");
const sourceRoots = [
    path.join(root, "src", "generated"),
    path.join(root, "src", "postProcess")
];
const FIELD_TYPES = new Set([
    "ClassAccessorProperty",
    "ClassPrivateProperty",
    "ClassProperty",
    "PropertyDefinition"
]);
const METHOD_TYPES = new Set([
    "ClassMethod",
    "ClassPrivateMethod"
]);

/**
 * Collects JavaScript files beneath a directory in deterministic order.
 *
 * @param {string} directory
 * @returns {Promise<string[]>}
 */
async function GetJavaScriptFiles(directory)
{
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const files = [];

    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name)))
    {
        const entryPath = path.join(directory, entry.name);

        if (entry.isDirectory())
        {
            files.push(...await GetJavaScriptFiles(entryPath));
        }
        else if (entry.isFile() && entry.name.endsWith(".js"))
        {
            files.push(entryPath);
        }
    }

    return files;
}

/**
 * Visits every syntax node without requiring Babel's traversal package.
 *
 * @param {unknown} value
 * @param {(node: object) => void} visitor
 */
function Visit(value, visitor)
{
    if (!value || typeof value !== "object")
    {
        return;
    }

    if (Array.isArray(value))
    {
        for (const item of value)
        {
            Visit(item, visitor);
        }

        return;
    }

    if (typeof value.type === "string")
    {
        visitor(value);
    }

    for (const [key, child] of Object.entries(value))
    {
        if (key === "loc" || key === "leadingComments" || key === "innerComments" || key === "trailingComments")
        {
            continue;
        }

        Visit(child, visitor);
    }
}

/**
 * Returns the declaration line rather than the first decorator line.
 *
 * @param {object} member
 * @returns {number}
 */
function GetDeclarationLine(member)
{
    if (member.id?.loc)
    {
        return member.id.loc.start.line;
    }

    if (member.key?.loc)
    {
        return member.key.loc.start.line;
    }

    return member.loc.start.line;
}

/**
 * Checks the house rules that ordinary formatters cannot safely enforce.
 *
 * @param {string} file
 * @param {string} source
 * @returns {string[]}
 */
function LintFile(file, source)
{
    const relativeFile = path.relative(root, file).replaceAll(path.sep, "/");
    const lines = source.split(/\r?\n/u);
    const errors = [];
    let ast;

    try
    {
        ast = parse(source, {
            sourceType: "module",
            plugins: [
                "classProperties",
                "classStaticBlock",
                "decoratorAutoAccessors",
                "decorators",
                "importAttributes"
            ]
        });
    }
    catch (error)
    {
        errors.push(`${relativeFile}:${error.loc?.line ?? 1}: could not parse source: ${error.message}`);
        return errors;
    }

    Visit(ast.program, node =>
    {
        const decorators = node.decorators ?? [];
        const declarationLine = GetDeclarationLine(node);

        for (let index = 0; index < decorators.length; index++)
        {
            const decorator = decorators[index];
            const nextLine = decorators[index + 1]?.loc.start.line ?? declarationLine;

            if (decorator.loc.start.line !== decorator.loc.end.line)
            {
                errors.push(`${relativeFile}:${decorator.loc.start.line}: decorator must occupy one line`);
            }

            if (decorator.loc.end.line >= nextLine)
            {
                errors.push(`${relativeFile}:${decorator.loc.start.line}: decorators and declarations require separate lines`);
            }
        }

        if (node.type !== "ClassBody")
        {
            return;
        }

        let foundStatic = false;

        for (const member of node.body)
        {
            const declarationLine = GetDeclarationLine(member);

            if (FIELD_TYPES.has(member.type))
            {
                const followingLine = lines[member.loc.end.line] ?? "";

                if (followingLine.trim() !== "")
                {
                    errors.push(`${relativeFile}:${member.loc.end.line}: class field declaration must be followed by an empty line`);
                }
            }

            if (member.static)
            {
                foundStatic = true;
            }
            else if (foundStatic)
            {
                errors.push(`${relativeFile}:${declarationLine}: instance member appears after a static member`);
            }
        }
    });

    return errors;
}

/**
 * Rejects compact class methods independently from the legacy field-layout
 * scope. Constructors, getters, setters, and static/private methods all follow
 * the same multi-line Allman layout.
 *
 * @param {string} file
 * @param {string} source
 * @returns {string[]}
 */
function LintClassMethods(file, source)
{
    const relativeFile = path.relative(root, file).replaceAll(path.sep, "/");
    const lines = source.split(/\r?\n/u);
    const errors = [];
    let ast;

    try
    {
        ast = parse(source, {
            sourceType: "module",
            plugins: [
                "classProperties",
                "classStaticBlock",
                "decoratorAutoAccessors",
                "decorators",
                "importAttributes"
            ]
        });
    }
    catch (error)
    {
        errors.push(`${relativeFile}:${error.loc?.line ?? 1}: could not parse source: ${error.message}`);
        return errors;
    }

    Visit(ast.program, node =>
    {
        if (!METHOD_TYPES.has(node.type) || !node.body?.loc)
        {
            return;
        }

        const declarationLine = GetDeclarationLine(node);
        const headerEndLine = Math.max(
            node.key?.loc?.end?.line ?? declarationLine,
            node.typeParameters?.loc?.end?.line ?? declarationLine,
            node.returnType?.loc?.end?.line ?? declarationLine,
            ...node.params.map(parameter => parameter.loc?.end?.line ?? declarationLine)
        );
        const openingLine = lines[node.body.loc.start.line - 1] ?? "";
        const closingLine = lines[node.body.loc.end.line - 1] ?? "";
        const contentAfterOpeningBrace = openingLine.slice(node.body.loc.start.column + 1).trim();
        const contentBeforeClosingBrace = closingLine.slice(0, Math.max(0, node.body.loc.end.column - 1)).trim();

        if (
            node.body.loc.start.line <= headerEndLine ||
            node.body.loc.start.line === node.body.loc.end.line ||
            contentAfterOpeningBrace ||
            contentBeforeClosingBrace
        )
        {
            errors.push(`${relativeFile}:${declarationLine}: class method braces and body must each occupy separate lines`);
        }
    });

    return errors;
}

const CONTEXT_FIRST_NAME = /^_?(context|updateContext)$/u;

/**
 * Returns true when a decorator node is a `@carbon.contextual([...])` call.
 *
 * @param {object} decorator
 * @returns {boolean}
 */
function IsContextualDecorator(decorator)
{
    const expression = decorator?.expression;
    return expression?.type === "CallExpression" &&
        expression.callee?.type === "MemberExpression" &&
        expression.callee.object?.name === "carbon" &&
        expression.callee.property?.name === "contextual";
}

/**
 * Enforces the frame-context convention: methods marked `@carbon.contextual`
 * are context CONSUMERS and must be context-first — their first parameter is
 * the frame context, named `context` or `updateContext` (optionally
 * underscore-prefixed). Context OWNERS (e.g. EveSpaceScene.Update) must not
 * carry the marker.
 *
 * @param {string} file
 * @param {string} source
 * @returns {string[]}
 */
function LintContextualMethods(file, source)
{
    const relativeFile = path.relative(root, file).replaceAll(path.sep, "/");
    const errors = [];
    let ast;

    try
    {
        ast = parse(source, {
            sourceType: "module",
            plugins: [
                "classProperties",
                "classStaticBlock",
                "decoratorAutoAccessors",
                "decorators",
                "importAttributes"
            ]
        });
    }
    catch
    {
        // Parse failures are already reported by the other passes.
        return errors;
    }

    Visit(ast.program, node =>
    {
        if (!METHOD_TYPES.has(node.type) || !(node.decorators ?? []).some(IsContextualDecorator))
        {
            return;
        }

        const declarationLine = GetDeclarationLine(node);
        const first = node.params[0];
        const identifier = first?.type === "Identifier"
            ? first
            : first?.type === "AssignmentPattern" && first.left?.type === "Identifier"
                ? first.left
                : null;

        if (!identifier || !CONTEXT_FIRST_NAME.test(identifier.name))
        {
            errors.push(`${relativeFile}:${declarationLine}: @carbon.contextual method must be context-first (first parameter named context or updateContext)`);
        }
    });

    return errors;
}

/**
 * Self-check: the contextual rule must accept conforming methods and reject
 * violations, or the lint itself is broken.
 */
function VerifyContextualMethodPolicy()
{
    const good = `
        class Good
        {
            @carbon.method
            @carbon.contextual(["camera"])
            ApplyTransform(context, transform, out)
            {
                return out;
            }

            @carbon.contextual(["camera"])
            UpdateAsyncronous(updateContext = null, params)
            {
                return params;
            }

            @carbon.method
            Unmarked(transform)
            {
                return transform;
            }
        }
    `;
    const bad = `
        class Bad
        {
            @carbon.contextual(["camera"])
            ApplyTransform(transform, out)
            {
                return out;
            }

            @carbon.contextual(["camera"])
            Tick()
            {
            }
        }
    `;

    if (LintContextualMethods(path.join(root, "fixture.js"), good).length !== 0 ||
        LintContextualMethods(path.join(root, "fixture.js"), bad).length !== 2)
    {
        throw new Error("Contextual context-first lint policy failed its self-check");
    }
}

VerifyContextualMethodPolicy();

const files = [];

for (const sourceRoot of sourceRoots)
{
    files.push(...await GetJavaScriptFiles(sourceRoot));
}

const errors = [];

for (const file of files)
{
    errors.push(...LintFile(file, await fs.readFile(file, "utf8")));
}

const allSourceFiles = await GetJavaScriptFiles(allSourceRoot);

for (const file of allSourceFiles)
{
    const source = await fs.readFile(file, "utf8");
    errors.push(...LintClassMethods(file, source));
    errors.push(...LintContextualMethods(file, source));
}

if (errors.length)
{
    console.error(errors.join("\n"));
    console.error(`\n${errors.length} source style error(s)`);
    process.exitCode = 1;
}
else
{
    console.log(`runtime-trinity source style: ${files.length} generated/post-process files and ${allSourceFiles.length} class-method files passed`);
}
