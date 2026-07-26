// Reviews a JSDoc manifest BEFORE it is applied, so a bad batch is caught as
// data rather than as 400 committed comments.
//
// Rejects the failure modes a bulk documentation pass actually produces:
// docs that restate the symbol name, near-duplicate sentences repeated across
// unrelated classes, empty or one-word docs, stray comment delimiters, and
// entries that do not match any symbol in the source.
//
//   node scripts/check_jsdoc_manifest.js <manifest.json> [...]
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";


const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifests = process.argv.slice(2).filter(argument => !argument.startsWith("--"));

if (!manifests.length)
{
  console.error("usage: node scripts/check_jsdoc_manifest.js <manifest.json> [...]");
  process.exit(1);
}

const entries = [];

for (const manifest of manifests)
{
  const parsed = JSON.parse(await fs.readFile(path.resolve(manifest), "utf8"));
  const list = Array.isArray(parsed) ? parsed : parsed.entries ?? [];
  for (const entry of list) entries.push({ ...entry, manifest: path.basename(manifest) });
}

const problems = [];
const seen = new Map();

for (const entry of entries)
{
  const label = `${entry.manifest} :: ${entry.name}`;
  const text = (Array.isArray(entry.doc) ? entry.doc.join(" ") : String(entry.doc ?? "")).trim();

  if (!entry.file || !entry.kind || !entry.name)
  {
    problems.push([label, "missing file/kind/name"]);
    continue;
  }

  if (!text)
  {
    problems.push([label, "empty doc"]);
    continue;
  }

  if (text.includes("/**") || text.includes("*/"))
  {
    problems.push([label, "doc contains comment delimiters"]);
  }

  if (text.split(/\s+/).length < 4)
  {
    problems.push([label, `too short: "${text}"`]);
  }

  const symbol = entry.name.split(".").pop().replace(/^#/, "");
  if (RestatesName(symbol, text))
  {
    problems.push([label, `restates the name: "${text}"`]);
  }

  const normalized = text.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ");
  if (seen.has(normalized))
  {
    problems.push([label, `duplicate of ${seen.get(normalized)}`]);
  }
  else
  {
    seen.set(normalized, entry.name);
  }
}

// Every entry must name a symbol that actually exists in its file.
const byFile = new Map();
for (const entry of entries)
{
  const file = entry.file.replaceAll("\\", "/");
  if (!byFile.has(file)) byFile.set(file, []);
  byFile.get(file).push(entry);
}

for (const [file, fileEntries] of byFile)
{
  let source;

  try
  {
    source = await fs.readFile(path.join(root, file), "utf8");
  }
  catch
  {
    for (const entry of fileEntries) problems.push([`${entry.manifest} :: ${entry.name}`, `no such file ${file}`]);
    continue;
  }

  for (const entry of fileEntries)
  {
    const symbol = entry.name.split(".").pop();
    const pattern = entry.kind === "class"
      ? new RegExp(`class\\s+${EscapeRegExp(entry.name)}\\b`)
      : new RegExp(`(^|\\s)${EscapeRegExp(symbol)}\\s*\\(`, "m");

    if (!pattern.test(source))
    {
      problems.push([`${entry.manifest} :: ${entry.name}`, `symbol not found in ${file}`]);
    }
  }
}

console.log(`checked ${entries.length} entries across ${manifests.length} manifest(s)`);

if (!problems.length)
{
  console.log("no problems found");
}
else
{
  console.log(`\n${problems.length} problem(s):\n`);
  for (const [label, problem] of problems.slice(0, 200)) console.log(`  ${label}\n    ${problem}`);
  if (problems.length > 200) console.log(`  ... and ${problems.length - 200} more`);
  process.exitCode = 1;
}

/**
 * Whether a doc says nothing the symbol name does not already say, e.g.
 * "Gets the name." on GetName. Words the name itself contains are stripped; a
 * doc with almost nothing left is padding.
 */
function RestatesName(symbol, text)
{
  const nameWords = new Set(symbol.split(/(?=[A-Z])/).map(word => word.toLowerCase()).filter(Boolean));
  const filler = new Set([
    "a", "an", "and", "as", "at", "by", "for", "from", "get", "gets", "in", "into",
    "is", "it", "its", "of", "on", "or", "returns", "set", "sets", "the", "this",
    "to", "value", "with"
  ]);

  const remaining = text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter(word => !nameWords.has(word) && !filler.has(word));

  return remaining.length <= 2;
}

function EscapeRegExp(value)
{
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
