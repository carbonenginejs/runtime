import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import { isCarbonDecorator, findCarbonMethod } from "./carbon-decorators.js";
import { headerTypes, memberDeclarations } from "../lib/carbon-header-shape.js";


const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const sourceRoot = path.join(root, "src", "trinity");
const summaryPath = path.join(sourceRoot, "generated", "summary.json");
const options = ParseOptions(process.argv.slice(2));
const defaultSchemaRoot = path.resolve(root, "..", "tools-core", ".scratch", "schema-build");
const schemaRoot = path.resolve(options.schemaRoot ?? process.env.CARBON_SCHEMA_ROOT ?? defaultSchemaRoot);
// The donor checkout. Access specifiers, nested types and definitions are read
// from Carbon's own source, never inferred from our spelling.
const carbonRoot = path.resolve(process.env.CARBON_ROOT ?? path.resolve(root, "..", "..", "carbonengine"));

// Names the schema reports as methods that are C++ type keywords (IsPortableMember).
const CPP_TYPE_KEYWORDS = new Set([ "void", "bool", "char", "short", "int", "long", "float", "double", "signed", "unsigned", "auto", "const" ]);

const summary = JSON.parse(await fs.readFile(summaryPath, "utf8"));
// Preserve the historical full audit cohort; ownership is the wider install guard.
const skipped = (options.allOwned ? summary.skipped : summary.paritySubjects ?? summary.skipped)
  .filter(entry => entry.reason === "hand-maintained source exists")
  .sort((a, b) => a.className.localeCompare(b.className));
const droppedClasses = await ReadJavaScriptClasses(path.join(sourceRoot, "dropped"), true);
const quarantined = skipped.filter(entry => droppedClasses.has(entry.className));
const promoted = skipped.filter(entry => !droppedClasses.has(entry.className));
const classes = await ReadJavaScriptClasses(sourceRoot);
// Trinity classes promoted to global/interfaces on purpose (runtime fbef98b36:
// Tr2DebugColor, Tr2DebugObjectReference) stay Trinity parity subjects. Only a
// parity subject is taken from there, and a Trinity file of the same name wins:
// the shared interfaces' placeholder bodies must not credit Trinity classes
// that inherit them.
const interfaceClasses = await ReadJavaScriptClasses(path.join(root, "src", "global", "interfaces"));
for (const entry of promoted)
{
  if (!classes.has(entry.className) && interfaceClasses.has(entry.className)) classes.set(entry.className, interfaceClasses.get(entry.className));
}
// Promoted classes remain Trinity-owned; their native bases may live in Blue.
// Use the real shared declarations for both primary and composed-base lookup.
const baseClasses = new Map([
  ...await ReadJavaScriptClasses(path.join(root, "src", "global", "blue")),
  ...await ReadJavaScriptClasses(path.join(root, "src", "trinityal")),
  ...classes
]);
const schemaDeclarations = new Map();
const schema = await ReadSchemaClasses(schemaRoot, schemaDeclarations);
const headerCache = new Map();
let carbonMentions = null;
const omissions = [];
const unexposed = [];
const underscoredPublic = [];
const declarationOnly = [];
const nestedResolved = [];
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

  const actualMethods = CollectMethods(actualClass, baseClasses, unresolvedBases);
  const seen = new Set();
  for (const method of schemaClass.methods)
  {
    const methodName = method.blueName ?? method.target;
    if (!methodName || seen.has(methodName)) continue;
    if (!IsPortableMember(entry.className, methodName)) continue;
    seen.add(methodName);
    let actualMethod = findCarbonMethod(actualMethods, methodName, method.static === true);
    const declaredOn = method.declaredOn ?? schemaClass.cppClass;
    const cppName = method.target ?? methodName;
    const declarations = !actualMethod || actualMethod.privateSpelling ? await CarbonDeclarations(declaredOn, cppName) : null;

    // Carbon declares the method inside a nested type that the schema flattens
    // into the owner's list (Tr2Sprite2dDisplayList::Entry::SubmitGeometry,
    // Tr2Sprite2dDisplayList.h:42). Under the nested-type rule the owner carries
    // `static Entry = <our class>`, so the method is looked up on that class.
    let nestedOwner = null;
    if (!actualMethod && declarations?.length)
    {
      const nested = new Set(declarations.map(item => item.nested));
      const nestedName = nested.size === 1 ? [ ...nested ][0] : null;
      const nestedClass = nestedName ? ResolveNestedClass(actualClass, nestedName, baseClasses) : null;
      if (nestedClass)
      {
        actualMethod = findCarbonMethod(CollectMethods(nestedClass, baseClasses, unresolvedBases), methodName, method.static === true);
        if (actualMethod) nestedOwner = `${nestedName} = ${nestedClass.className}`;
      }
    }

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

    // `_Name` is the spelling of a Carbon private or protected `Name` (rule 8),
    // so it credits Name only where Carbon's header declares every overload so.
    if (actualMethod?.privateSpelling
      && (!declarations?.length || declarations.some(item => item.access === "public")))
    {
      underscoredPublic.push({ ...record, access: declarations?.map(item => item.access) ?? null });
      continue;
    }

    // Native obligations require a body; only Blue-mapped methods require exposure.
    // A Carbon method the class lists in define({ unused }) is deliberately absent.
    if (actualMethod && (method.native === true || actualMethod.hasCarbon || actualMethod.unused))
    {
      if (nestedOwner) nestedResolved.push({ ...record, nestedOwner });
      continue;
    }

    // Carbon declares it and defines it nowhere (Tr2SpriteObject::
    // ValidateAndSetTextures, Tr2SpriteObject.h:100): there is no body to port,
    // and a call would not link. Owed only when a body exists.
    if (!actualMethod && method.native === true && declarations?.length
      && declarations.every(item => item.nested === null && !item.inline && !item.pure)
      && !await IsMentionedInCarbon(declaredOn, cppName))
    {
      declarationOnly.push(record);
      continue;
    }

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
    underscoredPublicMethods: underscoredPublic.length,
    declarationOnlyMethods: declarationOnly.length,
    nestedResolvedMethods: nestedResolved.length,
    missingClasses: missingClasses.length,
    missingSchemas: missingSchemas.length,
    ambiguousSchemas: ambiguousSchemas.length,
    unresolvedBases: unresolvedBases.size
  },
  quarantined,
  omissions,
  unexposed,
  underscoredPublic,
  declarationOnly,
  nestedResolved,
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
  PrintReport(result, options.list === true);
}

// The ratchet. 790 omissions existed the day the audit was corrected, and a red
// gate nobody can turn green gets disabled rather than fixed - so they are
// frozen here and only NEW ones fail.
//
// `--update` is the ONLY path that writes anything, it writes ONLY this one
// JSON file, and it deletes nothing. It exists to bank a fix, and must never be
// run to silence a fresh finding.
const baselineFile = path.join(root, "scripts", "trinity-parity-baseline.json");
const findings = [
  ...omissions.map(item => `omitted ${item.className}.${item.method}`),
  ...unexposed.map(item => `unexposed ${item.className}.${item.method}`),
  ...underscoredPublic.map(item => `underscored-public ${item.className}.${item.method}`),
  ...missingClasses.map(item => `missing-class ${item.className}`),
  ...missingSchemas.map(item => `missing-schema ${item.className}`),
  ...ambiguousSchemas.map(item => `ambiguous-schema ${item.className}`),
  ...[ ...unresolvedBases.values() ].map(item => `unresolved-base ${item.className}`)
].sort();

if (process.argv.includes("--update"))
{
  await fs.writeFile(
    baselineFile,
    `${JSON.stringify({ recorded: new Date().toISOString().slice(0, 10), findings }, null, 2)}
`
  );
  console.log(`
Recorded ${findings.length} baselined parity finding(s).`);
  process.exit(0);
}

let baseline = new Set();
try { baseline = new Set(JSON.parse(await fs.readFile(baselineFile, "utf8")).findings); }
catch { baseline = new Set(); }

const fresh = findings.filter(finding => !baseline.has(finding));
const closed = [ ...baseline ].filter(finding => !findings.includes(finding));

if (fresh.length > 0)
{
  console.error("");
  for (const finding of fresh) console.error(`  ${finding}`);
  console.error(`
${fresh.length} NEW Trinity parity finding(s). Port the member, or record the`);
  console.error("divergence at its own site with the reason it must differ.");
  process.exitCode = 1;
}
else
{
  console.log(`
Parity ratchet OK: ${findings.length} known finding(s) held at the baseline.`);
  if (closed.length > 0)
  {
    console.log(`${closed.length} baselined finding(s) are now closed. Bank them:`);
    console.log("  node scripts/trinity/audit_public_method_parity.js --update");
  }
}

/** @param {string[]} args */
function ParseOptions(args)
{
  const parsed = { json: false, schemaRoot: null };
  for (let i = 0; i < args.length; i++)
  {
    const arg = args[i];
    if (arg === "--json") parsed.json = true;
    else if (arg === "--all-owned") parsed.allOwned = true;
    else if (arg === "--update") parsed.update = true;
    else if (arg === "--list") parsed.list = true;
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
    if (!includeDropped && relativeFile.startsWith("src/trinity/dropped/")) continue;
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
      // `static Entry = Tr2Sprite2dDisplayListEntry`: the nested-type rule's
      // alias from Carbon's nested name to our class.
      const nested = new Map();
      for (const member of declaration.body.body)
      {
        if (member.type === "ClassProperty" && member.static && member.value?.type === "Identifier")
        {
          const key = GetMemberName(member);
          if (key) nested.set(key, imports.get(member.value.name) ?? member.value.name);
          continue;
        }
        if (member.type !== "ClassMethod" || member.kind === "constructor") continue;
        const name = GetMemberName(member);
        if (!name) continue;
        // `blue.abstract` stamps a Carbon pure virtual as Carbon's, as `blue.method` does.
        const metadata = { hasCarbon: HasCarbonDecorator(member, "method") || HasCarbonDecorator(member, "abstract"), isStatic: member.static === true };
        methods.set(name, metadata);
        // An overload variant `Name__Variant` credits Carbon's `Name`: C++
        // reserves `__`, so everything before it is the donor's name. Like a
        // renamed twin, it must not erase the exposure of the exact-name method.
        // `_Name` is the library's private spelling of Carbon's private or
        // protected `Name`, as the native-method lint already credits it.
        // The main loop checks Carbon's access specifier before it accepts that credit.
        const privateOf = name.startsWith("_") && !name.startsWith("__") ? name.slice(1) : null;
        for (const original of [ OverloadDonor(name), privateOf ])
        {
          if (!original) continue;
          const credit = name.startsWith("_") ? { ...metadata, privateSpelling: true } : metadata;
          const existing = methods.get(original);
          methods.set(original, existing
            ? { ...existing, hasCarbon: existing.hasCarbon || metadata.hasCarbon, privateSpelling: existing.privateSpelling === true && credit.privateSpelling === true }
            : credit);
        }
        // A browser wrapper can keep its Blue name while declaring its C++
        // original, just as the native-method audit already resolves aliases.
        for (const decorator of member.decorators ?? [])
        {
          const call = decorator.expression;
          if (call?.type !== "CallExpression" || !isCarbonDecorator(call, "renamed")) continue;
          const original = call.arguments[0];
          if (original?.type !== "StringLiteral") continue;
          // A twin JS splits off by name (a Be::Time ...Ticks overload) must not erase the exposure of the
          // exact-name method it sits beside.
          const existing = methods.get(original.value);
          methods.set(original.value, existing ? { ...existing, hasCarbon: existing.hasCarbon || metadata.hasCarbon } : metadata);
        }
      }
      const localBase = GetSuperClassName(declaration.superClass);
      const baseClass = localBase ? imports.get(localBase) ?? localBase : null;
      // Carbon declares several bases; JavaScript spends its one `extends` slot
      // on the model, so the rest arrive through `@carbon.inherit`. They are
      // bases, so they carry members, and an audit that reads only `extends`
      // reports every one of those members missing.
      const inherits = ReadInheritedBases(declaration, imports);
      const record = { className, baseClass, inherits, methods, nested, file: relativeFile };
      const existing = records.get(className);
      if (!existing || existing.file.startsWith("src/trinity/generated/")) records.set(className, record);
    }
    for (const statement of ast.program.body)
    {
      const call = statement.type === "ExpressionStatement" ? statement.expression : null;
      if (call?.type !== "CallExpression" || call.callee?.type !== "MemberExpression"
        || call.callee.object?.name !== "CjsSchema" || call.callee.property?.name !== "define") continue;
      const record = records.get(call.arguments[0]?.name);
      const definition = call.arguments[1];
      if (record?.file !== relativeFile || definition?.type !== "ObjectExpression") continue;
      const unused = definition.properties.find(property => property.key?.name === "unused");
      for (const element of unused?.value?.type === "ArrayExpression" ? unused.value.elements : [])
      {
        if (element?.type === "StringLiteral" && !record.methods.has(element.value))
          record.methods.set(element.value, { hasCarbon: false, isStatic: false, unused: true });
      }
    }
  }
  return records;
}

/**
 * Resolves the inherited class through ordinary and contract-mixin forms.
 * A mixin such as withITr2BoundingBox(Tr2Transform) adds obligations without
 * replacing the concrete method owner represented by its first argument.
 *
 * @param {object|null} expression
 * @returns {string|null}
 */
function GetSuperClassName(expression)
{
  if (expression?.type === "Identifier") return expression.name;
  if (expression?.type === "MemberExpression" && !expression.computed)
  {
    return expression.property?.name ?? null;
  }
  if (expression?.type === "CallExpression")
  {
    return GetSuperClassName(expression.arguments?.[0] ?? null);
  }
  return null;
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

/**
 * @param {string} directory
 * @param {Map<string,{source:string,line:number}>} declarations Filled with each
 *   C++ class's header declaration, including classes with no methods.
 */
async function ReadSchemaClasses(directory, declarations)
{
  const records = new Map();
  for (const file of await GetFiles(directory, ".json"))
  {
    const name = path.basename(file);
    if (name === "index.json" || name === "enums.json") continue;
    const doc = JSON.parse(await fs.readFile(file, "utf8"));
    if (!doc.blueClass) continue;
    const declared = Array.isArray(doc.declarations) ? doc.declarations.find(item => /\.h(?:pp)?$/u.test(item.source ?? "")) : null;
    if (doc.cppClass && declared && !declarations.has(doc.cppClass)) declarations.set(doc.cppClass, declared);
    // Carbon's `methods` is the BLUE-EXPOSED surface, and for a class Blue never
    // exposed it is empty - Tr2Renderer has 90 members and `methods: []`.
    // Comparing against that reports parity for anything native, which is how
    // six frame statics went missing unnoticed. `nativeMethods` is the C++
    // surface and is what a port is judged against.
    const native = Array.isArray(doc.nativeMethods)
      ? doc.nativeMethods.map(entry => ({ target: entry.cppName, blueName: null, declaredOn: entry.declaredOn, static: entry.static === true, native: true }))
      : [];
    const merged = [ ...(Array.isArray(doc.methods) ? doc.methods : []), ...native ];
    if (!merged.length) continue;
    const record = {
      family: doc.family ?? null,
      cppClass: doc.cppClass ?? doc.blueClass,
      file: path.relative(directory, file).replaceAll(path.sep, "/"),
      methods: merged,
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
/**
 * The additional bases declared with `@carbon.inherit` or `@meta.carbon.inherit`.
 *
 * @param {object} declaration The class declaration node.
 * @param {Map<string,string>} imports Local name to imported name.
 * @returns {string[]} Base names, resolved through the import map.
 */
function ReadInheritedBases(declaration, imports)
{
  const names = [];
  for (const decorator of declaration.decorators ?? [])
  {
    const call = decorator.expression;
    if (call?.type !== "CallExpression") continue;
    if (!isCarbonDecorator(call, "inherit")) continue;
    for (const argument of call.arguments)
    {
      if (argument?.type !== "Identifier") continue;
      names.push(imports.get(argument.name) ?? argument.name);
    }
  }
  return names;
}

/**
 * Our class for Carbon's nested type `nestedName` under `record`: the owner's
 * `static <nestedName> = <class>` alias, searched up the JS base chain.
 *
 * @param {object} record The owner's class record.
 * @param {string} nestedName Carbon's nested type name.
 * @param {Map} classes All class records.
 * @returns {object|null}
 */
function ResolveNestedClass(record, nestedName, classes)
{
  const visited = new Set();
  for (let current = record; current && !visited.has(current.className); current = classes.get(current.baseClass))
  {
    visited.add(current.className);
    const target = current.nested?.get(nestedName);
    if (target) return classes.get(target) ?? null;
  }
  return null;
}

/**
 * Carbon's declarations of `name` in `cppClass`, read from the header the
 * schema cites for the class, or null when that header cannot be read.
 *
 * @param {string} cppClass The declaring C++ class.
 * @param {string} name The C++ member function name.
 * @returns {Promise<object[]|null>} memberDeclarations records.
 */
async function CarbonDeclarations(cppClass, name)
{
  const declared = cppClass ? schemaDeclarations.get(cppClass) : null;
  if (!declared) return null;
  if (!headerCache.has(declared.source))
  {
    let types = null;
    try { types = headerTypes(await fs.readFile(path.join(carbonRoot, declared.source), "utf8")); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
    headerCache.set(declared.source, types);
  }
  const types = headerCache.get(declared.source);
  const bare = cppClass.split("::").pop();
  const type = types?.find(item => item.name === bare && item.line === declared.line)
    ?? types?.find(item => item.name === bare);
  return type ? memberDeclarations(type, name) : null;
}

/**
 * Whether any Carbon source mentions `Class::name`: an out-of-line definition,
 * a qualified call, or a member pointer. Deliberately broad, so a method is
 * judged declaration-only only when nothing in Carbon names it qualified.
 *
 * @param {string} cppClass The declaring C++ class.
 * @param {string} name The C++ member function name.
 * @returns {Promise<boolean>}
 */
async function IsMentionedInCarbon(cppClass, name)
{
  if (!carbonMentions)
  {
    carbonMentions = new Set();
    for (const file of await GetCarbonSources(carbonRoot))
    {
      // Unmasked: a mention inside a comment or string only makes this more conservative.
      const source = await fs.readFile(file, "utf8");
      for (const match of source.matchAll(/\b(\w+)\s*(?:<[^<>;{}()]*>)?\s*::\s*~?(\w+)\b/gu)) carbonMentions.add(`${match[1]}::${match[2]}`);
    }
  }
  return carbonMentions.has(`${cppClass.split("::").pop()}::${name}`);
}

/** @param {string} directory */
async function GetCarbonSources(directory)
{
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true }))
  {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await GetCarbonSources(entryPath));
    else if (entry.isFile() && /\.(?:c|cc|cpp|cxx|h|hpp|inl)$/iu.test(entry.name)) files.push(entryPath);
  }
  return files;
}

function CollectMethods(record, classes, unresolvedBases)
{
  const methods = new Map(record.methods);
  const visited = new Set([record.className]);

  // Declared bases first: their members are installed if-absent, so the class's
  // own always win, exactly as `carbon.inherit` resolves them.
  for (const name of record.inherits ?? [])
  {
    if (visited.has(name)) continue;
    visited.add(name);
    const declared = classes.get(name);
    if (!declared) continue;
    for (const [ method, metadata ] of CollectMethods(declared, classes, unresolvedBases))
    {
      if (!methods.has(method)) methods.set(method, metadata);
    }
  }

  let current = record;
  while (current.baseClass && !visited.has(current.baseClass))
  {
    visited.add(current.baseClass);
    const base = classes.get(current.baseClass);
    if (!base)
    {
      unresolvedBases.set(`${record.className}:${current.baseClass}`, {
        className: record.className,
        baseClass: current.baseClass,
        classFile: record.file
      });
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

/**
 * The Carbon name an overload variant `Name__Variant` (or private
 * `_Name__Variant`) splits, or null. C++ reserves `__`, so a double underscore
 * can never be part of a Carbon name.
 *
 * @param {string} name
 * @returns {string|null}
 */
function OverloadDonor(name)
{
  if (name.startsWith("__")) return null;
  const split = name.indexOf("__", 1);
  if (split < 0) return null;
  return name.slice(name.startsWith("_") ? 1 : 0, split);
}

/** @param {object} member @param {string} name */
function HasCarbonDecorator(member, name)
{
  return (member.decorators ?? []).some(decorator => isCarbonDecorator(decorator.expression, name));
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


// A C++ declaration list carries members that are not methods anyone ports:
// the constructor and destructor, the EXPOSE_TO_BLUE macro, and operators.
// They are excluded so the ratchet counts work rather than noise.
function IsPortableMember(className, methodName)
{
  if (!methodName) return false;
  if (methodName === className) return false;
  if (methodName.startsWith("~")) return false;
  if (methodName.startsWith("operator")) return false;
  // A type keyword is the schema misreading a declaration, not a method:
  // `operator bool()` arrives as "bool" (ITr2DebugRenderer2.h:121) and
  // `std::function<void()>` as "void" (EveBoxVolume.h:31).
  if (CPP_TYPE_KEYWORDS.has(methodName)) return false;
  if (methodName === methodName.toUpperCase() && /[A-Z]/u.test(methodName)) return false;
  return true;
}

/** @param {object} audit @param {boolean} listItems */
function PrintReport(audit, listItems)
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
  console.log(`- Carbon-public methods spelled private (_Name): ${summary.underscoredPublicMethods}.`);
  console.log(`- Declared but never defined in Carbon (nothing to port): ${summary.declarationOnlyMethods}.`);
  console.log(`- Resolved through a nested-type alias: ${summary.nestedResolvedMethods}.`);
  console.log(`- Missing JavaScript classes: ${summary.missingClasses}.`);
  console.log(`- Missing or ambiguous schemas: ${summary.missingSchemas + summary.ambiguousSchemas}.`);
  console.log(`- Unresolved base classes: ${summary.unresolvedBases}.`);
  if (!listItems) return;
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
  for (const [ heading, records ] of [
    [ "Carbon-public methods spelled private", audit.underscoredPublic ],
    [ "Declared but never defined in Carbon", audit.declarationOnly ],
    [ "Resolved through a nested-type alias", audit.nestedResolved ]
  ])
  {
    if (!records.length) continue;
    console.log();
    console.log(`## ${heading}`);
    for (const item of records) console.log(`- ${item.className}.${item.method}${item.nestedOwner ? ` (${item.nestedOwner})` : ""}`);
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
