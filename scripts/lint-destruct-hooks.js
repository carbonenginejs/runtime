import fs from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import { UNSHIPPED_SOURCE_DIRS } from "./lib/unshipped-source.js";

// The rules of the two teardown functions.
//
// OnDestruct is what graph Destruct must do for a class. It is one method, found by ordinary dispatch:
//   - it ends with `return super.OnDestruct(options)`, or `return true` where no parent has one;
//   - any earlier return answers the same way;
//   - a refusal is the whole body: `return false`;
//   - on super it calls OnDestruct and nothing else.
// _Destructor is a class's C++ destruction. The graph's runner calls each level's:
//   - it never calls super or another level's teardown;
//   - its JSDoc names the destructor: `Carbon: ~Class (file:lines)`, or
//     `Carbon: ~Class, implicit: members (file:lines)` where Carbon writes none.
// Neither is called from anywhere but the graph (global/model/graph/CjsGraph.js).
//
// With CARBON_ROOT set, each cite is opened: a written destructor's lines must hold ~Class, and an
// implicit one's must hold its first member. A cite into Carbon's history (a commit, then the path) is not opened.

const traverse = traverseModule.default ?? traverseModule;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** The two teardown functions: OnDestruct, and _Destructor, the C++ destructor body. */
const HOOKS = new Set([ "OnDestruct", "_Destructor" ]);

/** The file whose code calls the hooks. */
const GRAPH = "src/global/model/graph/CjsGraph.js";

/** A _Destructor's donor line: the class, the members of an implicit destructor, the cites. */
const CITE = /^\s*\* Carbon: ~(\w+)(?:, implicit: ([^(]+))? \(([^)]*:\d+[^)]*)\)/m;

/** A cite into Carbon's history names a commit. */
const HISTORY = /\b[0-9a-f]{7,}~\d\b/;

/** Returns a statically named property, including a computed string key. */
function propertyName(node)
{
  return node?.type === "Identifier" ? node.name : node?.type === "StringLiteral" ? node.value : null;
}

/** Whether a node is `super.OnDestruct(...)`. */
function isSuperOnDestruct(node)
{
  return node?.type === "CallExpression" && node.callee.type === "MemberExpression"
    && node.callee.object.type === "Super" && propertyName(node.callee.property) === "OnDestruct";
}

/** Whether a return answers as an OnDestruct that does not refuse: true, or its parent's answer. */
function isAccepting(statement)
{
  return statement?.type === "ReturnStatement" && statement.argument != null
    && ((statement.argument.type === "BooleanLiteral" && statement.argument.value === true) || isSuperOnDestruct(statement.argument));
}

/**
 * Why a donor line is wrong against Carbon, or null.
 * @param {RegExpExecArray} cite A CITE match.
 * @param {string} carbonRoot The Carbon source tree.
 * @returns {?string} The fault.
 */
function verifyCite(cite, carbonRoot)
{
  const [ , name, members, cites ] = cite;
  if (HISTORY.test(cites)) return null;
  const found = /((?:[\w.]+\/)*[\w.]+\.(?:cpp|h|inl|mm)):(\d+)(?:-(\d+))?/.exec(cites);
  if (!found) return "the cite names no file:lines";
  const file = path.join(carbonRoot, found[1]);
  if (!existsSync(file)) return `no such Carbon file: ${found[1]}`;
  const source = readFileSync(file, "latin1").split(/\r?\n/).slice(+found[2] - 1, +(found[3] ?? found[2])).join("\n");
  if (members === undefined) return new RegExp(`~${name}\\s*\\(`).test(source) ? null : `no ~${name} at ${found[0]}`;
  const member = /\w+/.exec(members)[0];
  return source.includes(member) ? null : `no ${member} at ${found[0]}`;
}

/**
 * Finds teardown hooks that break the rules above.
 * @param {string} code The source text.
 * @param {string} [file="source.js"] Its repository-relative path, for the findings.
 * @param {{carbonRoot?: string}} [options] carbonRoot opens each cite in Carbon.
 * @returns {string[]} One line per finding.
 */
export function checkSource(code, file = "source.js", { carbonRoot = null } = {})
{
  const errors = [];
  const ast = parse(code, {
    sourceType: "module",
    plugins: [ [ "decorators", { version: "2023-11" } ], "classProperties", "classPrivateMethods" ]
  });
  const at = node => `${file}:${node.loc.start.line}`;

  /** A _Destructor's JSDoc names Carbon's destructor. */
  const checkDestructor = method =>
  {
    const doc = (method.node.leadingComments ?? []).filter(comment => comment.type === "CommentBlock" && comment.value.startsWith("*")).pop();
    const cite = doc ? CITE.exec(doc.value) : null;
    if (!cite)
    {
      errors.push(`${at(method.node)}: _Destructor needs a JSDoc line "Carbon: ~Class (file:lines)", or "Carbon: ~Class, implicit: members (file:lines)" where Carbon writes no destructor.`);
      return;
    }
    const fault = carbonRoot ? verifyCite(cite, carbonRoot) : null;
    if (fault) errors.push(`${at(method.node)}: _Destructor's donor line is wrong against Carbon: ${fault}.`);
  };

  /** An OnDestruct refuses with its whole body, or accepts at every return and at its end. */
  const checkOnDestruct = method =>
  {
    const body = method.node.body.body;
    const last = body[body.length - 1];
    if (body.length === 1 && last.type === "ReturnStatement" && last.argument?.type === "BooleanLiteral" && last.argument.value === false) return;

    if (!isAccepting(last))
      errors.push(`${at(method.node)}: OnDestruct must end with "return super.OnDestruct(options)", or "return true" where no parent has one.`);
    method.traverse({
      Function(nested) { nested.skip(); },
      Class(nested) { nested.skip(); },
      ReturnStatement(location)
      {
        if (!isAccepting(location.node))
          errors.push(`${at(location.node)}: a return in OnDestruct answers true or super.OnDestruct(options); a refusal is the whole body, "return false".`);
      }
    });
  };

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
        errors.push(`${at(location.node)}: ${hook} must not call super${hook === "OnDestruct" ? " except super.OnDestruct" : ""}; the graph visits each level's _Destructor.`);
      },
      MemberExpression(location)
      {
        const node = location.node, name = propertyName(node.property);
        if ((HOOKS.has(name) || name === "Destruct") &&
          node.object.type === "MemberExpression" && propertyName(node.object.property) === "prototype")
          errors.push(`${at(node)}: ${hook} must not invoke a prototype teardown; the graph visits each level.`);
      }
    });

    if (method.node.type !== "ClassMethod") return;
    if (hook === "_Destructor") checkDestructor(method);
    else checkOnDestruct(method);
  };

  traverse(ast, {
    ClassMethod: check, ClassProperty: check, ObjectMethod: check, ObjectProperty: check,
    // Only the graph calls a hook. A hook reaching another level's is reported above.
    MemberExpression(location)
    {
      const node = location.node, name = propertyName(node.property);
      if (!HOOKS.has(name) || file === GRAPH || node.object.type === "Super") return;
      if (location.findParent(parent => (parent.isClassMethod() || parent.isClassProperty() || parent.isObjectMethod() || parent.isObjectProperty())
        && HOOKS.has(propertyName(parent.node.key)))) return;
      errors.push(`${at(node)}: only the graph calls ${name}; ${name === "_Destructor" ? "use CjsGraph.finalDelete(object)" : "use object.Destruct()"}.`);
    }
  });
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
  const errors = [], carbonRoot = process.env.CARBON_ROOT || null;
  for (const file of await sourceFiles(path.join(root, "src")))
    errors.push(...checkSource(await fs.readFile(file, "utf8"), path.relative(root, file).replaceAll("\\", "/"), { carbonRoot }));
  for (const error of errors) console.error(error);
  console.log(`Destruct hooks: ${errors.length} violation(s)${carbonRoot ? ", cites opened in Carbon" : "; set CARBON_ROOT to open each cite in Carbon"}.`);
  process.exitCode = errors.length ? 1 : 0;
}
