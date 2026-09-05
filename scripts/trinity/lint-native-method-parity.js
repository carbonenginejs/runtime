// The nativeMethods parity ratchet - the checker the burn-down page names as
// the next tooling job (docs/projects/port-fidelity-burn-down.md).
//
// audit_public_method_parity.js compares BLUE-EXPOSED methods only
// (schemaClass.methods); the plain C++ surface lives in nativeMethods and
// nothing read it, which is why entirely unimplemented classes reported
// clean. This lint reads nativeMethods, compares every Carbon class WE HAVE
// PORTED (a JS class with the same name exists under src/) against Carbon's
// declared surface, and enforces a per-class baseline ratchet exactly like
// lint-optional-calls: a class's missing-method set may shrink, never grow.
//
// IT REPORTS. It never generates (operator, 2026-09-05: "it can blitz hand
// crafted classes that haven't been maintained properly"). Carbon classes
// with no JS class at all are counted informationally and NOT gated - class
// existence is an ownership decision, not a lint's.
//
// JS method resolution credits the full chain: own methods, base classes,
// and contract mixins - `withITr2ControllerAction(CjsModel)` credits both
// CjsModel's chain AND ITr2ControllerAction's declared methods, because the
// mixin installs the contract's bodies. @carbon.renamed("X") counts as X.

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const sourceRoot = path.join(root, "src");
const baselinePath = path.join(root, "scripts", "native-method-baseline.json");
const defaultSchemaRoot = path.resolve(root, "..", "tools-core", ".scratch", "schema-build");
const schemaRoot = path.resolve(process.env.CARBON_SCHEMA_ROOT ?? defaultSchemaRoot);
const write = process.argv.includes("--write");
const verbose = process.argv.includes("--verbose");

// Schema entries that are not portable method obligations: constructors,
// destructors, exposure macros, operators, and the scanner's own artifacts.
const NON_METHOD = /^(~|operator\b|EXPOSE_TO_BLUE$|TYPEDEF_|BLUE_|Py__|PyNew$)/;

const classes = await ReadJavaScriptClasses(sourceRoot);
const schema = await ReadSchemaClasses(schemaRoot);

const report = new Map();
let portedClassCount = 0;
let unportedCarbonClasses = 0;
let totalMissing = 0;

for (const [ className, records ] of schema)
{
  const jsClass = classes.get(className);
  if (!jsClass)
  {
    unportedCarbonClasses += 1;
    continue;
  }
  portedClassCount += 1;

  const record = records[0];
  const declared = new Set();
  for (const method of record.nativeMethods ?? [])
  {
    const name = method?.cppName ?? method?.target;
    if (typeof name !== "string" || !name) continue;
    if (NON_METHOD.test(name) || name === className) continue;
    declared.add(name);
  }
  if (!declared.size) continue;

  const provided = ResolveProvidedMethods(className, classes);
  const missing = [ ...declared ].filter(name => !provided.has(name)).sort();
  if (missing.length)
  {
    report.set(className, missing);
    totalMissing += missing.length;
  }
}

const baseline = await ReadBaseline();
const regressions = [];
for (const [ className, missing ] of report)
{
  const allowed = new Set(baseline[className] ?? []);
  const grown = missing.filter(name => !allowed.has(name));
  if (grown.length) regressions.push({ className, grown });
}

if (write)
{
  const next = {};
  for (const className of [ ...report.keys() ].sort()) next[className] = report.get(className);
  await fs.writeFile(baselinePath, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`native-method baseline written: ${report.size} classes, ${totalMissing} missing methods.`);
  process.exit(0);
}

console.log(`Carbon native-method parity: ${portedClassCount} ported classes checked, ${report.size} with gaps, ${totalMissing} missing methods; ${unportedCarbonClasses} Carbon classes have no JS class (not gated).`);

if (verbose)
{
  for (const className of [ ...report.keys() ].sort())
  {
    console.log(`  ${className}: ${report.get(className).join(", ")}`);
  }
}

if (regressions.length)
{
  console.error("\nnative-method parity regressions (missing methods not in the baseline):");
  for (const { className, grown } of regressions)
  {
    console.error(`  ${className}: ${grown.join(", ")}`);
  }
  console.error("\nPort the method or, if the growth is a deliberate schema refresh, re-record with --write.");
  process.exit(1);
}

const shrunk = Object.keys(baseline).filter(className => (report.get(className)?.length ?? 0) < (baseline[className]?.length ?? 0));
if (shrunk.length)
{
  console.log(`${shrunk.length} class(es) are below baseline - re-record with --write to lock the gain in.`);
}

/** Resolves every method a class answers: own, base chain, contract mixins. */
function ResolveProvidedMethods(className, records, seen = new Set())
{
  const provided = new Set();
  let current = className;
  while (current && !seen.has(current))
  {
    seen.add(current);
    const record = records.get(current);
    if (!record) break;
    for (const name of record.methods) provided.add(name);
    for (const contract of record.contracts)
    {
      for (const name of ResolveProvidedMethods(contract, records, seen)) provided.add(name);
    }
    current = record.baseClass;
  }
  return provided;
}

async function ReadBaseline()
{
  try
  {
    return JSON.parse(await fs.readFile(baselinePath, "utf8"));
  }
  catch
  {
    return {};
  }
}

async function ReadJavaScriptClasses(directory)
{
  const records = new Map();
  for (const file of await GetFiles(directory, ".js"))
  {
    const relativeFile = path.relative(root, file).split(path.sep).join("/");
    if (relativeFile.startsWith("src/trinity/dropped/")) continue;
    if (relativeFile.startsWith("src/engine/")) continue;
    const source = await fs.readFile(file, "utf8");
    let ast;
    try
    {
      ast = parse(source, {
        sourceType: "module",
        plugins: [ "classProperties", "classStaticBlock", "decoratorAutoAccessors", "decorators", "importAttributes" ]
      });
    }
    catch
    {
      continue;
    }

    for (const statement of ast.program.body)
    {
      const declaration = statement.type === "ExportNamedDeclaration" ? statement.declaration : statement;
      if (declaration?.type !== "ClassDeclaration" || !declaration.id?.name) continue;
      const className = declaration.id.name;
      const methods = new Set();
      for (const member of declaration.body.body)
      {
        // A `#Method` credits its Carbon name: Carbon's counterparts are
        // `private:` in C++ too (Tr2ShadowMap.SetStaticShadowSplits and the
        // EveSmartLightAttributeModifierCameraDependency amplitudes were
        // ported as private and misreported as gaps).
        if (member.type === "ClassPrivateMethod" && member.kind !== "constructor")
        {
          const privateName = member.key?.id?.name;
          if (privateName) methods.add(privateName);
          continue;
        }
        if (member.type !== "ClassMethod" || member.kind === "constructor") continue;
        const name = MemberName(member);
        if (!name) continue;
        if (member.static)
        {
          // Statics are camelCase by the library casing rule; credit them
          // against Carbon's PascalCase static declaration.
          methods.add(name);
          methods.add(name.charAt(0).toUpperCase() + name.slice(1));
          continue;
        }
        methods.add(name);
        const renamed = RenamedOriginal(member);
        if (renamed) methods.add(renamed);
      }
      const { baseClass, contracts } = SuperInfo(declaration.superClass);
      const record = { className, baseClass, contracts, methods, file: relativeFile };
      const existing = records.get(className);
      if (!existing || existing.file.includes("/generated/")) records.set(className, record);
    }
  }
  return records;
}

/** Base name plus contract names from mixin wrappers: withX(withY(Base)). */
function SuperInfo(expression)
{
  const contracts = [];
  let current = expression;
  while (current?.type === "CallExpression")
  {
    const callee = current.callee;
    const name = callee?.type === "Identifier" ? callee.name : callee?.property?.name;
    if (typeof name === "string" && name.startsWith("with")) contracts.push(name.slice(4));
    current = current.arguments?.[0] ?? null;
  }
  if (current?.type === "Identifier") return { baseClass: current.name, contracts };
  if (current?.type === "MemberExpression" && !current.computed)
  {
    return { baseClass: current.property?.name ?? null, contracts };
  }
  return { baseClass: null, contracts };
}

function MemberName(member)
{
  if (member.key?.type === "Identifier") return member.key.name;
  if (member.key?.type === "StringLiteral") return member.key.value;
  return null;
}

function RenamedOriginal(member)
{
  for (const decorator of member.decorators ?? [])
  {
    const expression = decorator.expression;
    if (expression?.type !== "CallExpression") continue;
    const callee = expression.callee;
    if (callee?.type !== "MemberExpression" || callee.property?.name !== "renamed") continue;
    if (callee.object?.name !== "carbon") continue;
    const argument = expression.arguments?.[0];
    if (argument?.type === "StringLiteral") return argument.value;
  }
  return null;
}

async function ReadSchemaClasses(directory)
{
  const records = new Map();
  let files;
  try
  {
    files = await GetFiles(directory, ".json");
  }
  catch
  {
    console.log("native-method parity: schema root not found; skipping (set CARBON_SCHEMA_ROOT).");
    process.exit(0);
  }
  for (const file of files)
  {
    let record;
    try
    {
      record = JSON.parse(await fs.readFile(file, "utf8"));
    }
    catch
    {
      continue;
    }
    const className = record?.blueClass ?? record?.cppClass ?? path.basename(file, ".json");
    if (!className || !Array.isArray(record?.nativeMethods)) continue;
    const existing = records.get(className) ?? [];
    existing.push(record);
    records.set(className, existing);
  }
  return records;
}

async function GetFiles(directory, extension)
{
  const found = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true }))
  {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await GetFiles(file, extension));
    else if (entry.name.endsWith(extension)) found.push(file);
  }
  return found;
}
