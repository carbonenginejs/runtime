// meta.type.path: what a path field may name, for tools such as the editor.
//
// Ours (CjsSchema pathDecorator): Carbon's Blue types have no path kind. An
// entry is a registered class name (a path the resource manager turns into
// that class), "object" (a graph LoadObject builds), or a ".ext" file type
// (a raw stream). Bare use still means any file.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import "../../npm/dist/index.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";


const { path, wpath } = CjsSchema.meta.type;


/** The type descriptor a decorator records on a fresh class. */
function typeOf(...decorators)
{
  class Probe { field = ""; }
  CjsSchema.decorateField(Probe, "field", ...decorators);
  return CjsSchema.getField(Probe, "field").type;
}


test("path() and bare path both accept any file", () =>
{
  assert.deepEqual(typeOf(path()).accepts, []);
  assert.deepEqual(typeOf(path).accepts, [], "bare use, applied as the decorator itself");
  assert.equal(typeOf(path).kind, "path");
});


test("wpath is a path held in a wide string, with the same entries", () =>
{
  assert.deepEqual(typeOf(wpath), { kind: "wpath", accepts: [] });
  assert.deepEqual(typeOf(wpath("TriTextureRes")), { kind: "wpath", accepts: [ "TriTextureRes" ] });
  assert.throws(() => wpath("texture"), TypeError);
});


test("entries narrow what a path may name, in one entry or a list", () =>
{
  assert.deepEqual(typeOf(path("TriTextureRes")).accepts, [ "TriTextureRes" ]);
  assert.deepEqual(typeOf(path([ "TriGeometryRes", "object", ".vta" ])).accepts, [ "TriGeometryRes", "object", ".vta" ]);
  assert.deepEqual(typeOf(path([ "object", "object" ])).accepts, [ "object" ], "duplicates collapse");
});


test("a malformed entry fails when the class is defined, not silently", () =>
{
  for (const bad of [ "texture", "vta", ".VTA", "", 7, [ "TriTextureRes", null ] ])
  {
    assert.throws(() => path(bad), TypeError, JSON.stringify(bad));
  }
});


test("every class name used in a path label names a registered class", () =>
{
  const used = new Map();
  (function walk(dir)
  {
    for (const entry of readdirSync(dir, { withFileTypes: true }))
    {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".js"))
      {
        for (const match of readFileSync(full, "utf8").matchAll(/@meta\.type\.w?path\(([^)]*)\)/g))
        {
          for (const name of match[1].match(/"([A-Z][A-Za-z0-9_]*)"/g) ?? [])
          {
            used.set(name.slice(1, -1), full);
          }
        }
      }
    }
  })(new URL("../../src", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));

  assert.ok(used.size > 0, "labels exist");
  for (const [ name, file ] of used)
  {
    assert.ok(CjsSchema.GetConstructor(name), `${name} (used in ${file}) is not a registered class`);
  }
});
