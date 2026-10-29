// Persistent BlueAsyncRes subscriptions must have an explicit owner teardown.
// This is a structural guard, not a proof that every runtime branch detaches.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse } from "@babel/parser";

/** Visit syntax nodes without traversing Babel's location/comment metadata. */
function walk(node, visit)
{
  if (!node || typeof node !== "object") return;
  if (typeof node.type === "string") visit(node);
  for (const [key, value] of Object.entries(node))
  {
    if (["loc", "leadingComments", "trailingComments", "innerComments", "comments", "tokens"].includes(key)) continue;
    if (Array.isArray(value)) value.forEach(child => walk(child, visit));
    else if (value && typeof value === "object") walk(value, visit);
  }
}

/** Resolve ordinary and private member names for the local method call graph. */
function memberName(node)
{
  if (node?.type === "PrivateName") return "#" + node.id.name;
  return node?.name ?? node?.value ?? null;
}

/**
 * Check every class that calls AddNotifyTarget(this). Destruct must reach a
 * RemoveNotifyTarget(this) call, directly or through its own helper methods.
 * The destroyed-owner marker supplies the next-notify runtime backstop.
 * @param {string} source JavaScript module source.
 * @returns {Array<{className: string, line: number, message: string}>} Violations.
 */
export function auditNotifyTargets(source)
{
  const tree = parse(source, {sourceType: "module", plugins: ["decorators-legacy", "classProperties", "classPrivateProperties", "classPrivateMethods"]});
  const failures = [];
  walk(tree.program, node =>
  {
    if (node.type !== "ClassDeclaration" && node.type !== "ClassExpression") return;
    const methods = new Map();
    let registers = false;
    for (const method of node.body.body)
    {
      if (!method.body) continue;
      const record = { calls: [], removes: false, marks: false };
      walk(method.body, call =>
      {
        if (call.type !== "CallExpression" && call.type !== "OptionalCallExpression") return;
        const callee = call.callee;
        if (callee.type !== "MemberExpression" && callee.type !== "OptionalMemberExpression") return;
        const name = memberName(callee.property);
        if (callee.object.type === "ThisExpression") record.calls.push(name);
        if (call.arguments[0]?.type !== "ThisExpression") return;
        if (name === "AddNotifyTarget") registers = true;
        if (name === "RemoveNotifyTarget") record.removes = true;
        if (name === "markNotifyTargetDestructed") record.marks = true;
      });
      methods.set(memberName(method.key), record);
    }
    if (!registers) return;

    const visited = new Set(), pending = ["Destruct"];
    let removes = false, marks = false;
    while (pending.length)
    {
      const name = pending.pop();
      if (visited.has(name)) continue;
      visited.add(name);
      const method = methods.get(name);
      if (!method) continue;
      removes ||= method.removes;
      marks ||= method.marks;
      pending.push(...method.calls);
    }
    if (!removes || !marks) failures.push({
      className: node.id?.name || "<anonymous>",
      line: node.loc.start.line,
      message: !removes ? "Destruct does not reach RemoveNotifyTarget(this)." : "Destruct does not mark the notify owner as destructed."
    });
  });
  return failures;
}

/** Scan maintained source files; generated bundles and tests are not owners. */
async function sourceFiles(directory)
{
  const files = [];
  for (const entry of await fs.readdir(directory, {withFileTypes: true}))
  {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await sourceFiles(file));
    else if (entry.name.endsWith(".js")) files.push(file);
  }
  return files;
}

/** Run the repository gate and print only actionable failures. */
async function main()
{
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  let count = 0;
  for (const file of await sourceFiles(path.join(root, "src")))
  {
    const source = await fs.readFile(file, "utf8");
    if (!source.includes("AddNotifyTarget")) continue;
    for (const failure of auditNotifyTargets(source))
    {
      count++;
      console.error(`${path.relative(root, file)}:${failure.line} ${failure.className}: ${failure.message}`);
    }
  }
  if (count) process.exitCode = 1;
  else console.log("Resource notify owner teardown: OK");
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
