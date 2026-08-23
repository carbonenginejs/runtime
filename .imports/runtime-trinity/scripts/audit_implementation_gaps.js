import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";


const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(root, "src");
const includeDropped = process.argv.includes("--include-dropped");
const emitJson = process.argv.includes("--json");
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

const files = await GetJavaScriptFiles(sourceRoot);
const methods = [];
const properties = [];

for (const file of files)
{
  const relativeFile = path.relative(root, file).replaceAll(path.sep, "/");
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

  for (const node of ast.program.body)
  {
    if (node.type !== "ExportNamedDeclaration" || node.declaration?.type !== "ClassDeclaration") continue;
    const declaration = node.declaration;
    const className = declaration.id?.name ?? "<anonymous>";

    for (const member of declaration.body.body)
    {
      if (METHOD_TYPES.has(member.type) && HasDecorator(member, "impl", "notImplemented"))
      {
        methods.push(CreateRecord(relativeFile, className, GetMemberName(member), member.loc.start.line));
      }
      else if (FIELD_TYPES.has(member.type) && HasDecorator(member, "type", "unknown"))
      {
        properties.push(CreateRecord(relativeFile, className, GetMemberName(member), member.loc.start.line));
      }
    }
  }
}

const result = {
  generatedAt: new Date().toISOString(),
  includeDropped,
  summary: {
    methods: Summarize(methods),
    properties: Summarize(properties)
  },
  methods,
  properties
};

if (emitJson)
{
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
else
{
  PrintMarkdown(result);
}

/**
 * Collects JavaScript files beneath a directory in deterministic order.
 *
 * @param {string} directory
 * @returns {Promise<string[]>}
 */
async function GetJavaScriptFiles(directory)
{
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const found = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name)))
  {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await GetJavaScriptFiles(entryPath));
    else if (entry.isFile() && entry.name.endsWith(".js")) found.push(entryPath);
  }

  return found;
}

/**
 * Checks for an exact namespace/member decorator.
 *
 * @param {object} member
 * @param {string} namespace
 * @param {string} name
 * @returns {boolean}
 */
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

/**
 * Gets a printable class member name.
 *
 * @param {object} member
 * @returns {string}
 */
function GetMemberName(member)
{
  if (member.key?.type === "Identifier" || member.key?.type === "PrivateName")
  {
    return member.key.id?.name ?? member.key.name;
  }
  if (member.key?.type === "StringLiteral" || member.key?.type === "NumericLiteral")
  {
    return String(member.key.value);
  }
  return "<computed>";
}

/**
 * Creates one deterministic inventory record.
 *
 * @param {string} file
 * @param {string} className
 * @param {string} member
 * @param {number} line
 * @returns {object}
 */
function CreateRecord(file, className, member, line)
{
  const parts = file.split("/");
  const bucket = parts[1] === "generated" ? "generated" : parts[1] === "dropped" ? "dropped" : "maintained";
  const family = bucket === "generated" ? parts[2] : parts[1];
  return { bucket, family, className, member, file, line };
}

/**
 * Summarizes an inventory by bucket and family.
 *
 * @param {object[]} records
 * @returns {object}
 */
function Summarize(records)
{
  const bucketMap = new Map();
  const familyMap = new Map();

  for (const record of records)
  {
    AddSummaryRecord(bucketMap, record.bucket, record.className);
    AddSummaryRecord(familyMap, record.family, record.className);
  }

  return {
    count: records.length,
    classes: new Set(records.map(record => record.className)).size,
    buckets: ExportSummaryMap(bucketMap),
    families: ExportSummaryMap(familyMap)
  };
}

/** @param {Map} map @param {string} key @param {string} className */
function AddSummaryRecord(map, key, className)
{
  let value = map.get(key);
  if (!value)
  {
    value = { count: 0, classes: new Set() };
    map.set(key, value);
  }
  value.count++;
  value.classes.add(className);
}

/** @param {Map} map @returns {object} */
function ExportSummaryMap(map)
{
  return Object.fromEntries([...map]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => [key, { count: value.count, classes: value.classes.size }]));
}

/**
 * Prints a compact Markdown inventory.
 *
 * @param {object} audit
 */
function PrintMarkdown(audit)
{
  const methodSummary = audit.summary.methods;
  const propertySummary = audit.summary.properties;
  console.log("# runtime-trinity implementation-gap audit");
  console.log();
  console.log(`- Explicit \`@impl.notImplemented\` methods: ${methodSummary.count} across ${methodSummary.classes} classes.`);
  console.log(`- Explicit \`@type.unknown\` properties: ${propertySummary.count} across ${propertySummary.classes} classes.`);
  console.log(`- Includes \`src/dropped\`: ${audit.includeDropped ? "yes" : "no"}.`);
  console.log();
  PrintSection("Methods", audit.methods);
  PrintSection("Properties", audit.properties);
}

/** @param {string} title @param {object[]} records */
function PrintSection(title, records)
{
  console.log(`## ${title}`);
  console.log();
  const groups = new Map();

  for (const record of records)
  {
    const key = `${record.bucket}/${record.family}/${record.className}`;
    let group = groups.get(key);
    if (!group)
    {
      group = { ...record, members: [] };
      groups.set(key, group);
    }
    group.members.push(`${record.member} ([source](${record.file}#L${record.line}))`);
  }

  for (const group of [...groups.values()].sort((a, b) =>
    `${a.bucket}/${a.family}/${a.className}`.localeCompare(`${b.bucket}/${b.family}/${b.className}`)))
  {
    console.log(`- **${group.className}** (${group.bucket}/${group.family}): ${group.members.join(", ")}`);
  }
  console.log();
}
