// Proposes class-catalog entries from class-level JSDoc, so the catalog stays a
// projection of the source rather than a second thing to hand-maintain.
//
// The organization documentation checker requires exactly one
// `<!-- class:ClassName -->` entry per maintained class, whose purpose sentence
// EQUALS the first sentence of that class's JSDoc. This reads the source, finds
// classes with a class-level doc and no catalog entry, and prints ready-to-paste
// sections grouped by the catalog page they belong to.
//
// It never writes the catalog: which page a class belongs on, and whether it is
// public, is an editorial decision.
//
//   node scripts/trinity/generate_class_catalog.js                         every missing class
//   node scripts/trinity/generate_class_catalog.js --path src/trinity/eve  one subtree
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";


const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const sourceRoot = path.join(root, "src", "trinity");
const catalogRoot = path.join(root, "docs", "trinity", "reference", "classes");
const pathIndex = process.argv.indexOf("--path");
const pathFilter = pathIndex === -1 ? null : process.argv[pathIndex + 1];

const cataloged = await ReadCatalogedNames();
const packageJson = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
const exportPaths = Object.keys(packageJson.exports ?? {});
const files = await GetJavaScriptFiles(sourceRoot);
const proposals = [];

for (const file of files)
{
  const relativeFile = path.relative(root, file).replaceAll(path.sep, "/");
  if (relativeFile.startsWith("src/trinity/dropped/") || relativeFile.startsWith("src/trinity/generated/")) continue;
  if (pathFilter && !relativeFile.startsWith(pathFilter.replaceAll("\\", "/"))) continue;

  const source = await fs.readFile(file, "utf8");
  let ast;

  try
  {
    ast = parse(source, {
      sourceType: "module",
      plugins: ["classProperties", "classStaticBlock", "decoratorAutoAccessors", "decorators", "importAttributes"]
    });
  }
  catch
  {
    continue;
  }

  for (const node of ast.program.body)
  {
    const exported = node.type === "ExportNamedDeclaration" || node.type === "ExportDefaultDeclaration";
    const declaration = exported ? node.declaration : node;
    if (declaration?.type !== "ClassDeclaration") continue;

    const className = declaration.id?.name;
    if (!className || cataloged.has(className)) continue;

    const sentence = FirstSentence(ClassDoc(source, node, declaration));
    if (!sentence) continue;

    proposals.push({
      className,
      file: relativeFile,
      sentence,
      visibility: exported ? "Public" : "Internal",
      subpath: SubpathFor(relativeFile, exportPaths)
    });
  }
}

if (!proposals.length)
{
  console.log("no classes with a class-level doc are missing a catalog entry");
}
else
{
  console.log(`${proposals.length} catalog entries to place. Review the export subpath and visibility before pasting.\n`);

  for (const proposal of proposals.sort((a, b) => a.file.localeCompare(b.file) || a.className.localeCompare(b.className)))
  {
    console.log(`<!-- class:${proposal.className} -->`);
    console.log(`## \`${proposal.className}\`\n`);
    console.log(`${proposal.sentence}\n`);
    console.log(`- Export: ${proposal.subpath}`);
    console.log(`- Source: ${proposal.file}`);
    console.log(`- Visibility: ${proposal.visibility}`);
    console.log("- Kind: CarbonEngineJS\n");
  }
}

/** The class-level JSDoc text, whether it sits above the class or its export. */
function ClassDoc(source, outerNode, declaration)
{
  const decorator = declaration.decorators?.[0];
  const start = decorator?.start ?? outerNode.start;
  const before = source.slice(0, start).trimEnd();
  if (!before.endsWith("*/")) return "";

  const open = before.lastIndexOf("/**");
  if (open === -1 || open < before.lastIndexOf("*/", before.length - 3)) return "";

  return before
    .slice(open + 3, before.length - 2)
    .split("\n")
    .map(line => line.trim().replace(/^\*\s?/, ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/** The first sentence, which the checker requires the catalog to match exactly. */
function FirstSentence(text)
{
  if (!text) return "";
  const match = text.match(/^.*?[.!?](?=\s|$)/);
  return (match ? match[0] : text).trim();
}

function SubpathFor(relativeFile, exportPaths)
{
  const parts = relativeFile.split("/");
  const family = parts[2];
  const candidate = `./trinity/${family}`;
  const name = "@carbonenginejs/runtime/trinity";
  return exportPaths.includes(candidate) ? `${name}/${family}` : name;
}

async function ReadCatalogedNames()
{
  const names = new Set();

  let entries;

  try
  {
    entries = await fs.readdir(catalogRoot, { withFileTypes: true });
  }
  catch
  {
    return names;
  }

  for (const entry of entries)
  {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const text = await fs.readFile(path.join(catalogRoot, entry.name), "utf8");
    for (const match of text.matchAll(/<!--\s*class:([A-Za-z0-9_]+)\s*-->/g)) names.add(match[1]);
  }

  return names;
}

async function GetJavaScriptFiles(directory)
{
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const found = [];

  for (const entry of entries)
  {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await GetJavaScriptFiles(full));
    else if (entry.isFile() && entry.name.endsWith(".js")) found.push(full);
  }

  return found.sort();
}
