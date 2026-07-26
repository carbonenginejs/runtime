// Inserts JSDoc blocks from a manifest, so a documentation pass can be reviewed
// as data and applied mechanically.
//
// A manifest is JSON: either an array of entries or { entries: [...] }.
//
//   { "file": "src/eve/EveThing.js", "kind": "method",
//     "name": "EveThing.Update", "doc": "Advances the thing by deltaTime." }
//
// `kind` is class | method | constructor | function. `name` is the audit name:
// "ClassName" for a class, "ClassName.Method" for a method, the plain name for
// an exported function. The doc is ONE purpose sentence unless it carries
// @param/@returns lines, which may be supplied as an array of lines.
//
// The block is inserted above any decorators, at the declaration's indentation,
// and the file's existing line endings are preserved. An entry whose target
// already has a doc comment is skipped, so re-running is safe.
//
//   node scripts/apply_jsdoc.js <manifest.json> [...]   apply
//   node scripts/apply_jsdoc.js --dry-run <manifest>    report only
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";


const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dryRun = process.argv.includes("--dry-run");
const manifests = process.argv.slice(2).filter(argument => !argument.startsWith("--"));

if (!manifests.length)
{
  console.error("usage: node scripts/apply_jsdoc.js [--dry-run] <manifest.json> [...]");
  process.exit(1);
}

const entries = [];

for (const manifest of manifests)
{
  const parsed = JSON.parse(await fs.readFile(path.resolve(manifest), "utf8"));
  entries.push(...(Array.isArray(parsed) ? parsed : parsed.entries ?? []));
}

const byFile = new Map();

for (const entry of entries)
{
  const file = entry.file.replaceAll("\\", "/");
  if (!byFile.has(file)) byFile.set(file, []);
  byFile.get(file).push(entry);
}

let applied = 0;
let skipped = 0;
const failures = [];

for (const [file, fileEntries] of byFile)
{
  const absolute = path.join(root, file);
  let source = await fs.readFile(absolute, "utf8");
  const crlf = source.includes("\r\n");
  if (crlf) source = source.split("\r\n").join("\n");

  // Insert from the bottom up so earlier offsets stay valid.
  const targets = [];

  // A getter and a setter share one name, so repeated entries for the same
  // (kind, name) are consumed positionally: first entry to the first
  // occurrence in source order, second to the second.
  const consumed = new Map();

  for (const entry of fileEntries)
  {
    const key = `${entry.kind}:${entry.name}`;
    // An entry may pin its occurrence explicitly, which is how a setter is
    // documented when its getter already carries a doc and would otherwise
    // absorb the entry.
    const occurrence = Number.isInteger(entry.occurrence)
      ? entry.occurrence
      : consumed.get(key) ?? 0;
    consumed.set(key, occurrence + 1);

    const target = FindTarget(source, entry, occurrence);
    if (!target)
    {
      failures.push(`${file} :: ${entry.kind} ${entry.name} not found`);
      continue;
    }
    if (target.documented)
    {
      skipped++;
      continue;
    }
    targets.push({ entry, target });
  }

  targets.sort((a, b) => b.target.offset - a.target.offset);

  for (const { entry, target } of targets)
  {
    const block = FormatBlock(entry.doc, target.indent);
    source = source.slice(0, target.offset) + block + source.slice(target.offset);
    applied++;
  }

  if (!dryRun && targets.length)
  {
    await fs.writeFile(absolute, crlf ? source.split("\n").join("\r\n") : source);
  }
}

console.log(`${dryRun ? "would apply" : "applied"} ${applied}, skipped ${skipped} already documented`);

if (failures.length)
{
  console.log(`\n${failures.length} not found:`);
  for (const failure of failures) console.log(`  ${failure}`);
  process.exitCode = 1;
}

/**
 * Locates the declaration an entry names, and whether it is already documented.
 * `occurrence` selects between same-named declarations - a getter/setter pair -
 * in source order.
 */
function FindTarget(source, entry, occurrence = 0)
{
  let seen = 0;

  const ast = parse(source, {
    sourceType: "module",
    plugins: ["classProperties", "classStaticBlock", "decoratorAutoAccessors", "decorators", "importAttributes"]
  });

  for (const node of ast.program.body)
  {
    const declaration = node.type === "ExportNamedDeclaration" || node.type === "ExportDefaultDeclaration"
      ? node.declaration
      : node;
    if (!declaration) continue;

    if (declaration.type === "ClassDeclaration")
    {
      const className = declaration.id?.name;

      if (entry.kind === "class" && className === entry.name)
      {
        if (seen++ === occurrence) return Describe(source, node, declaration);
      }

      for (const member of declaration.body.body)
      {
        if (member.type !== "ClassMethod" && member.type !== "ClassPrivateMethod") continue;
        const memberName = MemberName(member);
        const kind = member.kind === "constructor" ? "constructor" : "method";
        if (entry.kind !== kind) continue;
        if (`${className}.${memberName}` !== entry.name) continue;
        if (seen++ === occurrence) return Describe(source, member, member);
      }
      continue;
    }

    if (entry.kind === "function" && declaration.type === "FunctionDeclaration" && declaration.id?.name === entry.name)
    {
      if (seen++ === occurrence) return Describe(source, node, declaration);
    }
  }

  return null;
}

function Describe(source, outerNode, declaration)
{
  const decorator = declaration.decorators?.[0] ?? outerNode.decorators?.[0];
  const start = decorator?.start ?? outerNode.start;
  const lineStart = source.lastIndexOf("\n", start - 1) + 1;
  const indent = source.slice(lineStart, start).match(/^\s*/)[0];
  const before = source.slice(0, lineStart).trimEnd();
  const documented = before.endsWith("*/") &&
    before.lastIndexOf("/**") > before.lastIndexOf("*/", before.length - 3);

  return { offset: lineStart, indent, documented };
}

function MemberName(member)
{
  if (member.key?.name) return member.type === "ClassPrivateMethod" ? `#${member.key.name}` : member.key.name;
  if (member.key?.id?.name) return `#${member.key.id.name}`;
  return "(computed)";
}

/** One line stays inline; anything longer wraps into a starred block. */
function FormatBlock(doc, indent)
{
  const lines = Array.isArray(doc) ? doc : Wrap(String(doc).trim(), 78 - indent.length);

  if (lines.length === 1 && indent.length + lines[0].length + 7 <= 100)
  {
    return `${indent}/** ${lines[0]} */\n`;
  }

  return `${indent}/**\n` + lines.map(line => `${indent} * ${line}`.trimEnd() + "\n").join("") + `${indent} */\n`;
}

function Wrap(text, width)
{
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";

  for (const word of words)
  {
    if (line && line.length + 1 + word.length > width)
    {
      lines.push(line);
      line = word;
    }
    else
    {
      line = line ? `${line} ${word}` : word;
    }
  }

  if (line) lines.push(line);
  return lines;
}
