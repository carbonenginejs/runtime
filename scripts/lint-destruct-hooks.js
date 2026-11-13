import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import { UNSHIPPED_SOURCE_DIRS } from "./lib/unshipped-source.js";

const traverse = traverseModule.default ?? traverseModule;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Returns a statically named property, including a computed string key. */
function propertyName(node)
{
  return node?.type === "Identifier" ? node.name : node?.type === "StringLiteral" ? node.value : null;
}

/** The two teardown functions the graph calls per level: OnDestruct, and _Destructor, the C++ destructor body. */
const HOOKS = new Set([ "OnDestruct", "_Destructor" ]);

/** Finds teardown hooks that manually call another ancestry level. */
export function checkSource(code, file = "source.js")
{
  const errors = [];
  const ast = parse(code, {
    sourceType: "module",
    plugins: [ [ "decorators", { version: "2023-11" } ], "classProperties", "classPrivateMethods" ]
  });
  const check = method =>
  {
    const hook = propertyName(method.node.key);
    if (!HOOKS.has(hook)) return;
    method.traverse({
      Class(nested) { nested.skip(); },
      Super(location)
      {
        // An OnDestruct is one method found by ordinary dispatch, so it calls its parent's; nothing else.
        const parent = location.parent;
        if (hook === "OnDestruct" && parent.type === "MemberExpression" && propertyName(parent.property) === "OnDestruct") return;
        errors.push(`${file}:${location.node.loc.start.line}: ${hook} must not call super${hook === "OnDestruct" ? " except super.OnDestruct" : ""}; the graph visits each level's _Destructor.`);
      },
      MemberExpression(location)
      {
        const node = location.node, name = propertyName(node.property);
        if ((HOOKS.has(name) || name === "Destruct") &&
          node.object.type === "MemberExpression" && propertyName(node.object.property) === "prototype")
          errors.push(`${file}:${node.loc.start.line}: ${hook} must not invoke a prototype teardown; the graph visits each level.`);
      }
    });
  };
  traverse(ast, { ClassMethod: check, ClassProperty: check, ObjectMethod: check, ObjectProperty: check });
  return errors;
}

/** Lists maintained JavaScript sources; generated and quarantined code are not runtime hooks. */
async function sourceFiles(directory)
{
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true }))
  {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory())
    {
      if (!UNSHIPPED_SOURCE_DIRS.has(entry.name) && entry.name !== "generated" && entry.name !== "dropped")
        files.push(...await sourceFiles(file));
    }
    else if (entry.name.endsWith(".js")) files.push(file);
  }
  return files;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
{
  const errors = [];
  for (const file of await sourceFiles(path.join(root, "src")))
    errors.push(...checkSource(await fs.readFile(file, "utf8"), path.relative(root, file).replaceAll("\\", "/")));
  for (const error of errors) console.error(error);
  console.log(`Destruct hooks: ${errors.length} violation(s).`);
  process.exitCode = errors.length ? 1 : 0;
}
