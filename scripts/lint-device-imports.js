// Nothing reaches the device by importing it, and nothing keeps it.
//
// Trinity holds the device as `trinity.device` (Carbon's gTriDev,
// TriDevice.h:347). The host's composition builds it for the backend it chose
// (`CjsLibrary.AttachTrinity`) and hands it to `trinity.Initialize`, and
// `trinity.SetDevice` can replace it; every class reads `trinity.device` when it
// uses it (docs internal/decisions/device-resource-registration.md). So:
//
// 1. Importing TriDevice.js elsewhere is refused. It brings back the import
//    cycles the holder removes and a second way to the device. Allowed:
//    CjsLibrary.js, which builds the device, and the Trinity barrels that
//    re-export the class. CjsTrinity.js imports no Trinity class at all.
// 2. Storing `trinity.device` in a field or on an object is refused: a swapped
//    device would leave the stored one behind. A local variable inside one call
//    is fine.
//
// No baseline and no exception. Tests are out of scope: a test may import the
// class it tests. Checked on parsed source, so comments do not count.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(root, "src");
const IMPORT_ALLOWED = new Set([
  "core/CjsLibrary.js",
  "trinity/index.js",
  "trinity/core/index.js",
  "trinity/core/device/index.js"
]);

/**
 * Every .js file under a directory.
 *
 * @param {string} directory The directory.
 * @param {string[]} [found=[]] Receives the paths.
 * @returns {string[]} The paths.
 */
function files(directory, found = [])
{
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }))
  {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files(file, found);
    else if (entry.name.endsWith(".js")) found.push(file);
  }
  return found;
}

/**
 * Whether a node is the expression `trinity.device`.
 *
 * @param {object} node An AST node.
 * @returns {boolean} Whether it is.
 */
function isTrinityDevice(node)
{
  return node?.type === "MemberExpression" && !node.computed
    && node.object.type === "Identifier" && node.object.name === "trinity"
    && node.property.type === "Identifier" && node.property.name === "device";
}

/**
 * Visits every node under one.
 *
 * @param {object} node The root.
 * @param {function(object): void} visit Called with each node.
 */
function walk(node, visit)
{
  if (!node || typeof node.type !== "string") return;
  visit(node);
  for (const key of Object.keys(node))
  {
    if (key === "loc" || key === "leadingComments" || key === "trailingComments") continue;
    const value = node[key];
    if (Array.isArray(value)) for (const child of value) walk(child, visit);
    else if (value && typeof value.type === "string") walk(value, visit);
  }
}

const problems = [];
for (const file of files(sourceRoot))
{
  const relative = path.relative(sourceRoot, file).split(path.sep).join("/");
  const source = fs.readFileSync(file, "utf8");
  const checkImports = !IMPORT_ALLOWED.has(relative) && source.includes("TriDevice");
  const checkStores = relative !== "trinity/CjsTrinity.js" && source.includes("trinity.device");
  if (!checkImports && !checkStores) continue;
  let ast;
  try
  {
    ast = parse(source, { sourceType: "module", plugins: [ [ "decorators", { version: "2023-11" } ], "importAttributes" ] });
  }
  catch (error)
  {
    problems.push(`${relative}: does not parse (${error.message})`);
    continue;
  }
  if (checkImports)
  {
    for (const node of ast.program.body)
    {
      if (![ "ImportDeclaration", "ExportNamedDeclaration", "ExportAllDeclaration" ].includes(node.type) || !node.source) continue;
      const from = node.source.value;
      if (/(^|\/)TriDevice(\.js)?$/u.test(from))
      {
        problems.push(`${relative}:${node.loc.start.line}: imports ${from}; reach the device as trinity.device`);
        continue;
      }
      for (const specifier of node.specifiers ?? [])
      {
        const name = specifier.imported?.name ?? specifier.local?.name;
        if (name === "TriDevice") problems.push(`${relative}:${node.loc.start.line}: imports TriDevice from ${from}; reach the device as trinity.device`);
      }
    }
  }
  if (checkStores)
  {
    walk(ast.program, node =>
    {
      const stored = (node.type === "AssignmentExpression" && node.left.type === "MemberExpression" && isTrinityDevice(node.right))
        || ((node.type === "ClassProperty" || node.type === "ObjectProperty") && isTrinityDevice(node.value));
      if (stored) problems.push(`${relative}:${node.loc.start.line}: stores trinity.device; read it where it is used`);
    });
  }
}

if (problems.length)
{
  console.error(problems.join("\n"));
  console.error(`\n${problems.length} device import(s) or store(s) outside CjsTrinity, CjsLibrary and the Trinity barrels.`);
  process.exit(1);
}
console.log("Device imports OK: only CjsLibrary and the Trinity barrels import TriDevice, and nothing stores trinity.device.");
