// Reads a class's or member's implementation-marker tag from runtime source (decorator-upgrade.md § 00: markers are
// JSDoc tags, not runtime metadata). Tests that assert a method's state ask here instead of CjsSchema.getMethod().impl.
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "../../src");

/** The state tags, as the status strings `impl.status` used to hold. `@cjs` and `@renamed` are not states. */
const STATES = [ "implemented", "adapted", "notImplemented", "notSupported", "abstract", "notUsed", "noop" ];
const STATE_TAG = new RegExp(`^\\s*(?:/\\*\\*|\\*)?\\s*@(${STATES.join("|")})\\b`, "m");

/** @type {Map<string, string[]>|null} Class name to the source files declaring it. */
let s_index = null;
/** @type {Map<string, object>} Parsed source by file. */
const s_parsed = new Map();

/** Every `.js` file under `dir`. */
function Walk(dir, out = [])
{
  for (const entry of readdirSync(dir, { withFileTypes: true }))
  {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) Walk(full, out);
    else if (entry.name.endsWith(".js")) out.push(full);
  }
  return out;
}

/** Files declaring `class Name`, those outside `dropped/` first. */
function FilesOf(name)
{
  if (!s_index)
  {
    s_index = new Map();
    for (const file of Walk(SRC))
    {
      for (const match of readFileSync(file, "utf8").matchAll(/\bclass\s+([A-Za-z_$][\w$]*)/g))
      {
        const list = s_index.get(match[1]) ?? [];
        if (!list.includes(file)) list.push(file);
        s_index.set(match[1], list);
      }
    }
    for (const list of s_index.values()) list.sort((a, b) => Number(/[\\/]dropped[\\/]/.test(a)) - Number(/[\\/]dropped[\\/]/.test(b)));
  }
  return s_index.get(name) ?? [];
}

/** The parsed file, with its source text. */
function Parsed(file)
{
  let parsed = s_parsed.get(file);
  if (!parsed)
  {
    const text = readFileSync(file, "utf8");
    parsed = { text, ast: parse(text, { sourceType: "module", plugins: [ [ "decorators", { version: "2023-11" } ] ] }) };
    s_parsed.set(file, parsed);
  }
  return parsed;
}

/** The JSDoc block directly above `anchor` (whitespace between only), or null. */
function JsDocAbove({ text, ast }, anchor)
{
  let best = null;
  for (const comment of ast.comments)
  {
    if (comment.type === "CommentBlock" && comment.value.startsWith("*") && comment.end <= anchor && (!best || comment.end > best.end)) best = comment;
  }
  return best && /^\s*$/.test(text.slice(best.end, anchor)) ? best : null;
}

/** The class declaration named `name` in a parsed file, with the node it is exported through. */
function FindClass(parsed, name)
{
  for (const statement of parsed.ast.program.body)
  {
    const declaration = statement.type === "ExportNamedDeclaration" || statement.type === "ExportDefaultDeclaration" ? statement.declaration : statement;
    if (declaration?.type === "ClassDeclaration" && declaration.id?.name === name) return { node: declaration, outer: statement };
  }
  return null;
}

/** The state tag in one JSDoc block, or null. */
function StateOf(comment)
{
  const match = comment ? STATE_TAG.exec(comment.value) : null;
  return match ? match[1] : null;
}

/**
 * The implementation state a member's (or, with no member, a class's) JSDoc tag declares, following `extends` to the
 * class that declares an inherited member: "implemented", "adapted", "notImplemented", "notSupported", "abstract",
 * "notUsed" or "noop"; undefined when there is no state tag.
 *
 * @param {string} className The class's name in runtime source.
 * @param {string} [memberName] The method, accessor or field; omit for the class itself.
 * @returns {string|undefined} The state.
 */
export function MarkerTag(className, memberName)
{
  for (const file of FilesOf(className))
  {
    const parsed = Parsed(file);
    const found = FindClass(parsed, className);
    if (!found) continue;
    if (memberName === undefined)
    {
      const anchor = Math.min(found.outer.start, found.node.start, ...(found.node.decorators ?? []).map(d => d.start));
      return StateOf(JsDocAbove(parsed, anchor)) ?? undefined;
    }
    const members = found.node.body.body.filter(member => (member.key?.name ?? member.key?.value) === memberName);
    // A getter, then a method or field, then a setter: the record getMethod and getField used to answer for.
    members.sort((a, b) => (a.kind === "set") - (b.kind === "set"));
    for (const member of members)
    {
      const anchor = Math.min(member.start, ...(member.decorators ?? []).map(d => d.start));
      const state = StateOf(JsDocAbove(parsed, anchor));
      if (state) return state;
    }
    if (members.length) return undefined;
    const base = found.node.superClass?.type === "Identifier" ? found.node.superClass.name : null;
    return base ? MarkerTag(base, memberName) : undefined;
  }
  throw new Error(`MarkerTag: no runtime source declares class ${className}.`);
}
