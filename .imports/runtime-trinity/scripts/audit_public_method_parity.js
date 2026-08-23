import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";


const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(root, "src");
const summaryPath = path.join(sourceRoot, "generated", "summary.json");
const options = ParseOptions(process.argv.slice(2));
const defaultSchemaRoot = path.resolve(root, "..", "tools-core", ".scratch", "schema-build");
const schemaRoot = path.resolve(options.schemaRoot ?? process.env.CARBON_SCHEMA_ROOT ?? defaultSchemaRoot);

const summary = JSON.parse(await fs.readFile(summaryPath, "utf8"));
const skipped = summary.skipped
  .filter(entry => entry.reason === "hand-maintained source exists")
  .sort((a, b) => a.className.localeCompare(b.className));
const droppedClasses = await ReadJavaScriptClasses(path.join(sourceRoot, "dropped"), true);
const quarantined = skipped.filter(entry => droppedClasses.has(entry.className));
const promoted = skipped.filter(entry => !droppedClasses.has(entry.className));
const classes = await ReadJavaScriptClasses(sourceRoot);
const schema = await ReadSchemaClasses(schemaRoot);
const omissions = [];
const unexposed = [];
const missingClasses = [];
const missingSchemas = [];
const ambiguousSchemas = [];
const unresolvedBases = new Map();

for (const entry of promoted)
{
  const actualClass = classes.get(entry.className);
  if (!actualClass)
  {
    missingClasses.push(entry);
    continue;
  }

  const candidates = schema.get(entry.className) ?? [];
  const schemaClass = SelectSchemaClass(candidates, entry.family);
  if (!schemaClass)
  {
    if (candidates.length > 1) ambiguousSchemas.push({ ...entry, candidates: candidates.map(item => item.file) });
    else missingSchemas.push(entry);
    continue;
  }

  const actualMethods = CollectMethods(actualClass, classes, unresolvedBases);
  const seen = new Set();
  for (const method of schemaClass.methods)
  {
    const methodName = method.blueName ?? method.target;
    if (!methodName || seen.has(methodName)) continue;
    seen.add(methodName);
    const actualMethod = actualMethods.get(methodName);
    if (actualMethod?.hasCarbon) continue;

    const record = {
      family: entry.family,
      className: entry.className,
      method: methodName,
      target: method.target ?? null,
      declaredOn: method.declaredOn ?? null,
      macro: method.macro ?? null,
      source: ResolveMethodSource(schemaClass, method),
      schemaFile: schemaClass.file,
      classFile: actualClass.file
    };
    if (actualMethod)
    {
      unexposed.push(record);
      continue;
    }

    omissions.push(record);
  }
}

const parityGapClasses = new Set([...omissions, ...unexposed].map(item => item.className));
const result = {
  generatedAt: new Date().toISOString(),
  schemaRoot,
  summary: {
    skippedClasses: skipped.length,
    promotedClasses: promoted.length,
    quarantinedClasses: quarantined.length,
    classesWithParityGaps: parityGapClasses.size,
    omittedMethods: omissions.length,
    unexposedMethods: unexposed.length,
    missingClasses: missingClasses.length,
    missingSchemas: missingSchemas.length,
    ambiguousSchemas: ambiguousSchemas.length,
    unresolvedBases: unresolvedBases.size
  },
  quarantined,
  omissions,
  unexposed,
  missingClasses,
  missingSchemas,
  ambiguousSchemas,
  unresolvedBases: [...unresolvedBases.values()].sort((a, b) => a.className.localeCompare(b.className))
};

if (options.json)
{
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
else
{
  PrintReport(result);
}

if (
  omissions.length ||
  unexposed.length ||
  missingClasses.length ||
  missingSchemas.length ||
  ambiguousSchemas.length ||
  unresolvedBases.size
)
{
  process.exitCode = 1;
}

/** @param {string[]} args */
function ParseOptions(args)
{
  const parsed = { json: false, schemaRoot: null };
  for (let i = 0; i < args.length; i++)
  {
    const arg = args[i];
    if (arg === "--json") parsed.json = true;
    else if (arg === "--schema-root")
    {
      const value = args[++i];
      if (!value || value.startsWith("--")) throw new Error("--schema-root requires a directory");
      parsed.schemaRoot = value;
    }
    else throw new Error(`Unknown option ${arg}`);
  }
  return parsed;
}

/** @param {string} directory */
async function ReadJavaScriptClasses(directory, includeDropped = false)
{
  const records = new Map();
  for (const file of await GetFiles(directory, ".js"))
  {
    const relativeFile = RelativePath(file);
    if (!includeDropped && relativeFile.startsWith("src/dropped/")) continue;
    const source = await fs.readFile(file, "utf8");
    const ast = parse(source, {
      sourceType: "module",
      plugins: [
        "classProperties",
        "classStaticBlock",
        "decoratorAutoAccessors",
        "decorators",
        "importAttributes"
      ]
    });
    const imports = ReadImports(ast);

    for (const statement of ast.program.body)
    {
      const declaration = statement.type === "ExportNamedDeclaration" ? statement.declaration : statement;
      if (declaration?.type !== "ClassDeclaration" || !declaration.id?.name) continue;
      const className = declaration.id.name;
      const methods = new Map();
      for (const member of declaration.body.body)
      {
        if (member.type !== "ClassMethod" || member.static || member.kind === "constructor") continue;
        const name = GetMemberName(member);
        if (name) methods.set(name, { hasCarbon: HasDecorator(member, "carbon", "method") });
      }
      const localBase = declaration.superClass?.type === "Identifier"
        ? declaration.superClass.name
        : declaration.superClass?.type === "MemberExpression" && !declaration.superClass.computed
          ? declaration.superClass.property?.name ?? null
          : null;
      const baseClass = localBase ? imports.get(localBase) ?? localBase : null;
      const record = { className, baseClass, methods, file: relativeFile };
      const existing = records.get(className);
      if (!existing || existing.file.startsWith("src/generated/")) records.set(className, record);
    }
  }
  return records;
}

/** @param {object} ast */
function ReadImports(ast)
{
  const imports = new Map();
  for (const statement of ast.program.body)
  {
    if (statement.type !== "ImportDeclaration") continue;
    for (const specifier of statement.specifiers)
    {
      if (specifier.type === "ImportSpecifier")
      {
        imports.set(specifier.local.name, specifier.imported.name ?? specifier.imported.value);
      }
      else if (specifier.type === "ImportDefaultSpecifier")
      {
        imports.set(specifier.local.name, specifier.local.name);
      }
    }
  }
  return imports;
}

/** @param {string} directory */
async function ReadSchemaClasses(directory)
{
  const records = new Map();
  for (const file of await GetFiles(directory, ".json"))
  {
    const name = path.basename(file);
    if (name === "index.json" || name === "enums.json") continue;
    const doc = JSON.parse(await fs.readFile(file, "utf8"));
    if (!doc.blueClass || !Array.isArray(doc.methods)) continue;
    const record = {
      family: doc.family ?? null,
      file: path.relative(directory, file).replaceAll(path.sep, "/"),
      methods: doc.methods,
      sourceRefs: doc.sourceRefs ?? {}
    };
    const entries = records.get(doc.blueClass) ?? [];
    entries.push(record);
    records.set(doc.blueClass, entries);
  }
  return records;
}

/** @param {object[]} candidates @param {string} runtimeFamily */
function SelectSchemaClass(candidates, runtimeFamily)
{
  if (candidates.length === 1) return candidates[0];
  const schemaFamily = runtimeFamily.split("/")[0];
  const matching = candidates.filter(item => item.family === schemaFamily);
  return matching.length === 1 ? matching[0] : null;
}

/** @param {object} record @param {Map} classes @param {Map} unresolvedBases */
function CollectMethods(record, classes, unresolvedBases)
{
  const methods = new Map(record.methods);
  const visited = new Set([record.className]);
  let current = record;
  while (current.baseClass && !visited.has(current.baseClass))
  {
    visited.add(current.baseClass);
    const base = classes.get(current.baseClass);
    if (!base)
    {
      if (current.baseClass !== "CjsModel")
      {
        unresolvedBases.set(`${record.className}:${current.baseClass}`, {
          className: record.className,
          baseClass: current.baseClass,
          classFile: record.file
        });
      }
      break;
    }
    for (const [method, metadata] of base.methods)
    {
      if (!methods.has(method)) methods.set(method, metadata);
    }
    current = base;
  }
  return methods;
}

/** @param {object} schemaClass @param {object} method */
function ResolveMethodSource(schemaClass, method)
{
  const source = method.source;
  if (!source?.file) return null;
  return {
    file: schemaClass.sourceRefs[source.file] ?? source.file,
    line: source.line ?? null
  };
}

/** @param {object} member */
function GetMemberName(member)
{
  if (member.key?.type === "Identifier") return member.key.name;
  if (member.key?.type === "StringLiteral" || member.key?.type === "NumericLiteral") return String(member.key.value);
  return null;
}

/** @param {object} member @param {string} namespace @param {string} name */
function HasDecorator(member, namespace, name)
{
  return (member.decorators ?? []).some(decorator =>
  {
    let expression = decorator.expression;
    if (expression?.type === "CallExpression") expression = expression.callee;
    return expression?.type === "MemberExpression"
      && expression.computed === false
      && expression.object?.type === "Identifier"
      && expression.object.name === namespace
      && expression.property?.type === "Identifier"
      && expression.property.name === name;
  });
}

/** @param {string} directory @param {string} extension */
async function GetFiles(directory, extension)
{
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name)))
  {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await GetFiles(entryPath, extension));
    else if (entry.isFile() && entry.name.endsWith(extension)) files.push(entryPath);
  }
  return files;
}

/** @param {string} file */
function RelativePath(file)
{
  return path.relative(root, file).replaceAll(path.sep, "/");
}

/** @param {object} audit */
function PrintReport(audit)
{
  const summary = audit.summary;
  console.log("# runtime-trinity public-method parity audit");
  console.log();
  console.log(`- Generated classes skipped by ownership: ${summary.skippedClasses}.`);
  console.log(`- Promoted classes checked: ${summary.promotedClasses}.`);
  console.log(`- Deliberately quarantined classes excluded: ${summary.quarantinedClasses}.`);
  console.log(`- Classes with parity gaps: ${summary.classesWithParityGaps}.`);
  console.log(`- Omitted Carbon methods: ${summary.omittedMethods}.`);
  console.log(`- Present but unexposed Carbon methods: ${summary.unexposedMethods}.`);
  console.log(`- Missing JavaScript classes: ${summary.missingClasses}.`);
  console.log(`- Missing or ambiguous schemas: ${summary.missingSchemas + summary.ambiguousSchemas}.`);
  console.log(`- Unresolved non-CjsModel base classes: ${summary.unresolvedBases}.`);
  if (audit.omissions.length)
  {
    console.log();
    console.log("## Omissions");
    for (const item of audit.omissions)
    {
      const declaration = item.declaredOn ? ` declared on ${item.declaredOn}` : "";
      const source = item.source ? ` (${item.source.file}:${item.source.line ?? "?"})` : "";
      console.log(`- ${item.className}.${item.method}${declaration}${source}`);
    }
  }
  if (audit.unexposed.length)
  {
    console.log();
    console.log("## Present but unexposed methods");
    for (const item of audit.unexposed)
    {
      const declaration = item.declaredOn ? ` declared on ${item.declaredOn}` : "";
      const source = item.source ? ` (${item.source.file}:${item.source.line ?? "?"})` : "";
      console.log(`- ${item.className}.${item.method}${declaration}${source}`);
    }
  }
  for (const [heading, records] of [
    ["Missing JavaScript classes", audit.missingClasses],
    ["Missing schemas", audit.missingSchemas],
    ["Ambiguous schemas", audit.ambiguousSchemas],
    ["Unresolved bases", audit.unresolvedBases]
  ])
  {
    if (!records.length) continue;
    console.log();
    console.log(`## ${heading}`);
    for (const item of records) console.log(`- ${item.className}`);
  }
}
