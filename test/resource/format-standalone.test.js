import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// A single format is importable by anything, including external parties apart
// from the rest of the runtime (layers.json "standalone"). A format may bring
// the classes it needs. It may not reach the engine: trinity, SOF, audio,
// character, input, core, tools, the abstraction layer, the resource manager,
// or a library barrel. A caller that wants engine classes hydrated injects
// them, through Blue's class registry or a plain object.

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SOURCE = join(ROOT, "src");
const { imports: ALIASES } = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));

const FORBIDDEN_TREES = [ "trinity", "trinityal", "sof", "audio", "character", "input", "core", "tools" ];
const FORBIDDEN_FILES = [
  "index.js",
  "global/index.js",
  "resource/index.js",
  "global/blue/index.js",
  "global/blue/blue.js",
  "global/blue/CjsBlueResMan.js"
];

const IMPORT = /(?:^|\n)\s*(?:import|export)\s[^;]*?from\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)|(?:^|\n)\s*import\s*["']([^"']+)["']/gu;

function resolveAlias(specifier)
{
  if (ALIASES[specifier]) return ALIASES[specifier];
  for (const [ key, value ] of Object.entries(ALIASES))
  {
    if (key.endsWith("/*") && specifier.startsWith(key.slice(0, -1))) return value.replace("*", specifier.slice(key.length - 1));
  }
  return null;
}

function resolveImport(from, specifier)
{
  let file;
  if (specifier.startsWith("#"))
  {
    const aliased = resolveAlias(specifier);
    if (!aliased) return null;
    file = join(ROOT, aliased);
  }
  else if (specifier.startsWith(".")) file = resolve(dirname(from), specifier);
  else return null;
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.js");
  if (!existsSync(file) && !file.endsWith(".js")) file += ".js";
  return file;
}

/** Every source file a format's entry point reaches, with the file that first imported it. */
function closure(entry)
{
  const importedBy = new Map([ [ entry, null ] ]);
  const stack = [ entry ];
  while (stack.length)
  {
    const file = stack.pop();
    if (!existsSync(file)) continue;
    for (const match of readFileSync(file, "utf8").matchAll(IMPORT))
    {
      const target = resolveImport(file, match[1] || match[2] || match[3]);
      if (target === null || importedBy.has(target)) continue;
      importedBy.set(target, file);
      stack.push(target);
    }
  }
  return importedBy;
}

const shown = file => relative(SOURCE, file).split(sep).join("/");

const formats = readdirSync(join(SOURCE, "resource/formats"))
  .filter(name => existsSync(join(SOURCE, "resource/formats", name, "index.js")));

test("every format is importable without the engine or a library barrel", () =>
{
  assert.ok(formats.length > 30, `found only ${formats.length} formats`);
  const failures = [];
  for (const name of formats)
  {
    for (const [ file, parent ] of closure(join(SOURCE, "resource/formats", name, "index.js")))
    {
      const path = shown(file);
      const tree = path.split("/")[0];
      if (FORBIDDEN_TREES.includes(tree) || FORBIDDEN_FILES.includes(path))
      {
        failures.push(`${name}: ${path} (imported by ${parent ? shown(parent) : "entry"})`);
      }
    }
  }
  assert.deepEqual(failures, []);
});
