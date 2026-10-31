#!/usr/bin/env node
// Writes the schema record (`CjsSchema.getSchema`) of every registered class as JSON, for a before/after comparison of a
// decorator change: build npm/dist (the full `npm run build:npm`, under the organization's BUILD.lock), dump, change,
// build, dump again, and compare the two files. Decorator-upgrade.md § 5 records each comparison it was used for.
//
// Usage: node scripts/dump-decorator-metadata.js <out.json>
// Every module of npm/dist is imported, so every class that registers itself is in the dump; classes are sorted by name,
// functions are written as `<fn Name>`, Maps and Sets as `{ "<Map>": [...] }` and `{ "<Set>": [...] }`.
import { writeFileSync } from "node:fs";
import { ImportAllDistModules, ImportDist } from "../test/support/allDistClasses.js";

const out = process.argv[2];
if (!out)
{
  console.error("Usage: node scripts/dump-decorator-metadata.js <out.json>");
  process.exit(2);
}

const modules = await ImportAllDistModules();
const { CjsSchema } = await ImportDist("global/schema/CjsSchema.js");
const { getClassRegistrations } = await ImportDist("global/blue/classes/registry.js");

/** A class's registered name, or null. */
function nameOf(fn)
{
  try { return CjsSchema.getClassName(fn) ?? null; }
  catch { return null; }
}

/** A plain JSON copy: functions by name, cycles marked, key order kept. */
function serialize(value, seen = new Set())
{
  if (value === null || typeof value !== "object" && typeof value !== "function")
    return typeof value === "bigint" ? value + "n" : typeof value === "symbol" ? String(value) : value;
  if (typeof value === "function") return "<fn " + (nameOf(value) ?? value.name ?? "?") + ">";
  if (seen.has(value)) return "<cycle>";
  seen.add(value);
  let result;
  if (Array.isArray(value) || ArrayBuffer.isView(value)) result = Array.from(value, item => serialize(item, seen));
  else if (value instanceof Map) result = { "<Map>": Array.from(value, ([ k, v ]) => [ serialize(k, seen), serialize(v, seen) ]) };
  else if (value instanceof Set) result = { "<Set>": Array.from(value, item => serialize(item, seen)) };
  else
  {
    result = {};
    for (const key of Reflect.ownKeys(value)) result[String(key)] = serialize(value[key], seen);
  }
  seen.delete(value);
  return result;
}

const classes = {};
for (const registration of getClassRegistrations().sort((a, b) => a.name < b.name ? -1 : 1))
{
  try { classes[registration.name] = serialize(CjsSchema.getSchema(registration.type)); }
  catch (error) { classes[registration.name] = "<error " + String(error?.message ?? error).split("\n")[0] + ">"; }
}
writeFileSync(out, JSON.stringify({ modules, classes }, null, 1));
console.log("modules", modules, "classes", Object.keys(classes).length);
