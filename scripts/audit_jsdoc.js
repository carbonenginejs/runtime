// Reports the JSDoc coverage gate the release skill requires: one class-level
// purpose sentence per maintained class, and a doc comment on every method and
// exported function.
//
// Properties are deliberately NOT required to carry their own doc - the
// class-level JSDoc covers them.
//
// Generated classes are generator-owned and reported separately; dropped
// classes are quarantined and excluded unless asked for.
//
//   node scripts/audit_jsdoc.js                 summary + worst files
//   node scripts/audit_jsdoc.js --list          every undocumented symbol
//   node scripts/audit_jsdoc.js --json          machine-readable
//   node scripts/audit_jsdoc.js --path src/eve  restrict to a subtree
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";


const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(root, "src");
const emitJson = process.argv.includes("--json");
const emitList = process.argv.includes("--list");
const includeGenerated = process.argv.includes("--include-generated");
const pathIndex = process.argv.indexOf("--path");
const pathFilter = pathIndex === -1 ? null : process.argv[pathIndex + 1];

const files = await GetJavaScriptFiles(sourceRoot);
const records = [];

for (const file of files)
{
  const relativeFile = path.relative(root, file).replaceAll(path.sep, "/");
  if (relativeFile.startsWith("src/dropped/")) continue;
  if (!includeGenerated && relativeFile.startsWith("src/generated/")) continue;
  if (pathFilter && !relativeFile.startsWith(pathFilter.replaceAll("\\", "/"))) continue;

  const source = await fs.readFile(file, "utf8");
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
    records.push({ file: relativeFile, kind: "parse-error", name: error.message, documented: false });
    continue;
  }

  for (const node of ast.program.body)
  {
    const declaration = node.type === "ExportNamedDeclaration" || node.type === "ExportDefaultDeclaration"
      ? node.declaration
      : node;
    if (!declaration) continue;

    if (declaration.type === "ClassDeclaration")
    {
      const className = declaration.id?.name ?? "(anonymous)";
      records.push({
        file: relativeFile,
        kind: "class",
        name: className,
        line: declaration.loc.start.line,
        documented: HasJsDoc(node, source) || HasJsDoc(declaration, source)
      });

      for (const member of declaration.body.body)
      {
        if (member.type !== "ClassMethod" && member.type !== "ClassPrivateMethod") continue;

        const memberName = MemberName(member);
        records.push({
          file: relativeFile,
          kind: member.kind === "constructor" ? "constructor" : "method",
          name: `${className}.${memberName}`,
          line: member.loc.start.line,
          documented: HasJsDoc(member, source)
        });
      }
      continue;
    }

    if (node.type === "ExportNamedDeclaration" && declaration.type === "FunctionDeclaration")
    {
      records.push({
        file: relativeFile,
        kind: "function",
        name: declaration.id?.name ?? "(anonymous)",
        line: declaration.loc.start.line,
        documented: HasJsDoc(node, source) || HasJsDoc(declaration, source)
      });
    }
  }
}

Report(records);

/**
 * Whether a node carries a JSDoc block comment. Babel attaches comments before
 * decorators to the decorator rather than the method, so a node whose own
 * leading comments are empty is re-checked against the raw source above its
 * first decorator.
 */
function HasJsDoc(node, source)
{
  const comments = node.leadingComments ?? [];
  if (comments.some(comment => comment.type === "CommentBlock" && comment.value.startsWith("*"))) return true;

  const decorator = node.decorators?.[0];
  const start = decorator?.start ?? node.start;
  const before = source.slice(0, start).trimEnd();
  return before.endsWith("*/") && before.lastIndexOf("/**") > before.lastIndexOf("*/", before.length - 3);
}

function MemberName(member)
{
  if (member.key?.name) return member.type === "ClassPrivateMethod" ? `#${member.key.name}` : member.key.name;
  if (member.key?.id?.name) return `#${member.key.id.name}`;
  return "(computed)";
}

function Report(entries)
{
  const undocumented = entries.filter(entry => !entry.documented);

  if (emitJson)
  {
    console.log(JSON.stringify({ total: entries.length, undocumented }, null, 2));
    return;
  }

  const byKind = new Map();
  for (const entry of entries)
  {
    const bucket = byKind.get(entry.kind) ?? { total: 0, undocumented: 0 };
    bucket.total++;
    if (!entry.documented) bucket.undocumented++;
    byKind.set(entry.kind, bucket);
  }

  console.log("# runtime-trinity JSDoc coverage\n");
  for (const [kind, bucket] of [...byKind.entries()].sort())
  {
    const covered = bucket.total - bucket.undocumented;
    const percent = bucket.total ? Math.round((covered / bucket.total) * 100) : 100;
    console.log(`- ${kind}: ${covered}/${bucket.total} documented (${percent}%), ${bucket.undocumented} missing`);
  }

  const byFile = new Map();
  for (const entry of undocumented)
  {
    byFile.set(entry.file, (byFile.get(entry.file) ?? 0) + 1);
  }

  console.log(`\nFiles with gaps: ${byFile.size}`);

  if (emitList)
  {
    console.log("");
    for (const [file, count] of [...byFile.entries()].sort((a, b) => b[1] - a[1]))
    {
      console.log(`\n## ${file} (${count})`);
      for (const entry of undocumented.filter(record => record.file === file))
      {
        console.log(`  ${entry.line}\t${entry.kind}\t${entry.name}`);
      }
    }
    return;
  }

  console.log("\nWorst 25 files:\n");
  for (const [file, count] of [...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25))
  {
    console.log(`  ${String(count).padStart(4)}  ${file}`);
  }
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
