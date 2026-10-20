import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { YamlWriter, BeObjectMetadata, be } from "../../npm/dist/global/blue/index.js";
import { getDictionaryDeclarations, readDictionaryValue } from "../../npm/dist/global/blue/dictionaryDeclarations.js";
import { CjsBlackFormat } from "../../npm/dist/resource/formats/black/index.js";
import { YamlReader } from "../../npm/dist/global/blue/YamlReader.js";
import { CjsYamlFormat } from "../../npm/dist/resource/formats/yaml/index.js";
import "../../npm/dist/trinity/index.js";
import { StubResMan } from "../support/stubResMan.js";

/** Compares persisted values, declared/runtime types, and both directions of sharing. */
function compareGraphs(before, after)
{
  const forward = new Map(), reverse = new Map();
  const result = { objects: 0, scalars: 0, numericChanges: 0, maxNumericDifference: 0, mismatches: [], members: {} };
  const changed = (path, category) => {
    result.members[path + ":" + category] = (result.members[path + ":" + category] ?? 0) + 1;
    if (category !== "numeric") result.mismatches.push(path + ":" + category);
  };
  function visit(left, right, path)
  {
    if (typeof left === "number" && typeof right === "number")
    {
      ++result.scalars;
      if (!Object.is(left, right))
      {
        ++result.numericChanges;
        result.maxNumericDifference = Math.max(result.maxNumericDifference, Math.abs(left - right));
        changed(path, "numeric");
        if (Math.abs(left - right) > 1e-6 + Math.abs(left) * 1e-7) changed(path, "excess-numeric-loss");
      }
      return;
    }
    if (left === null || right === null || typeof left !== "object" || typeof right !== "object")
    {
      ++result.scalars;
      if (left !== right) changed(path, "value");
      return;
    }
    if (forward.has(left))
    {
      if (forward.get(left) !== right) changed(path, "sharing");
      return;
    }
    if (reverse.has(right) && reverse.get(right) !== left) changed(path, "merged-identity");
    forward.set(left, right); reverse.set(right, left);
    if (ArrayBuffer.isView(left) || Array.isArray(left))
    {
      if (Object.prototype.toString.call(left) !== Object.prototype.toString.call(right)) changed(path, "storage-type");
      if (left.length !== right.length) changed(path, "length");
      for (let i = 0; i < left.length; ++i) visit(left[i], right[i], path + "[]");
      return;
    }
    const className = CjsSchema.getClassName(left.constructor);
    if (className)
    {
      ++result.objects;
      if (className !== CjsSchema.getClassName(right.constructor)) changed(path, "class");
      for (const field of getDictionaryDeclarations(left.constructor).fields)
      {
        if (!CjsSchema.isFieldExported(field, { persistOnly: true })) continue;
        visit(readDictionaryValue(left, field), readDictionaryValue(right, field), className + "." + field.name);
      }
      return;
    }
    if (left instanceof Map)
    {
      if (!(right instanceof Map) || left.size !== right.size) { changed(path, "map"); return; }
      for (const [key, value] of left) visit(value, right.get(key), path + "[]");
      return;
    }
    for (const key of Object.keys(left)) visit(left[key], right[key], path + "." + key);
  }
  visit(before, after, "root");
  return result;
}

const service = process.env.YAML_WRITER_RESOURCE_SERVICE;
const build = process.env.YAML_WRITER_RESOURCE_BUILD;
test("real ship and effect Black objects survive Red emission with measured precision loss", {
  skip: !service || !build ? "set YAML_WRITER_RESOURCE_SERVICE and YAML_WRITER_RESOURCE_BUILD" : false
}, async t => {
  const previous = be.resMan;
  be.resMan = new StubResMan();
  t.after(() => { be.resMan = previous; });
  const resources = [
    "dx9/model/ship/iconpreview/previewturretship.black",
    "dx9/model/ship/angel/battlecruiser/angbc1/effects/angbc1_t1_fx_01a.black",
    "dx9/model/controller/shipstandard_fxstandalone.black"
  ];
  for (const path of resources)
  {
    const response = await fetch(new URL(`eve/${build}/resources/${path}`, service));
    assert.ok(response.ok, "resource fetch");
    const payload = CjsBlackFormat.readPayload(new Uint8Array(await response.arrayBuffer())).object;
    const original = CjsSchema.from(payload._type, payload);
    // Exercise the writer allow-list independently of the reader metadata side table.
    BeObjectMetadata.Set(original, "typeID", "42");
    BeObjectMetadata.Set(original, "privatePath", "private-authoring-location");
    const text = new YamlWriter().WriteObjectToString(original);
    // This text was just produced from a bounded, trusted runtime graph.
    const raw = parse(text, { maxAliasCount: -1 });
    assert.equal(raw.__bluemetadata__.typeID, "42");
    assert.equal(raw.__bluemetadata__.privatePath, undefined);
    const restored = new YamlReader().CreateObjectFromString(text);
    const result = compareGraphs(original, restored);
    t.diagnostic(JSON.stringify({ resource: path, ...result }));
    assert.deepEqual(result.mismatches, []);
    assert.ok(result.objects > 0);
    assert.equal(BeObjectMetadata.Get(restored, "typeID"), "42");
    assert.equal(result.numericChanges, 0);
  }
});

const referenceDirectory = process.env.YAML_WRITER_REFERENCE_DIR;
test("optional private Red reference corpus is compared only in memory and reported in aggregate", {
  skip: !referenceDirectory ? "set YAML_WRITER_REFERENCE_DIR" : false
}, async t => {
  let entries;
  try { entries = await readdir(referenceDirectory, { withFileTypes: true }); }
  catch (error) { if (error.code === "ENOENT") { t.skip("reference directory unavailable"); return; } throw new Error("Reference directory could not be read."); }
  const summary = { files: 0, parsed: 0, written: 0, exactMatches: 0, formattingOrPolicyDifference: 0,
    parseFailures: 0, constructionFailures: 0, writeFailures: 0,
    syntaxFailures: 0, tagFailures: 0, otherParseFailures: 0,
    numberChangedFiles: 0, metadataChangedFiles: 0, memberSetChangedFiles: 0,
    nonNumericChangedFiles: 0, aliasTopologyChangedFiles: 0, formatOnlyFiles: 0 };
  const previous = be.resMan;
  be.resMan = new StubResMan();
  // Runtime diagnostics may include authored strings. Never forward them.
  const saved = { log: console.log, warn: console.warn, error: console.error, info: console.info, debug: console.debug };
  for (const key of Object.keys(saved)) console[key] = () => {};
  try
  {
    for (const entry of entries)
    {
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".red")) continue;
      ++summary.files;
      let source;
      try { source = await readFile(join(referenceDirectory, entry.name), "utf8"); }
      catch { ++summary.parseFailures; continue; }
      let object;
      try { object = new YamlReader().CreateObjectFromString(source); ++summary.parsed; }
      catch { ++summary.constructionFailures; continue; }
      try
      {
        const output = new YamlWriter().WriteObjectToString(object);
        ++summary.written;
        if (output === source) ++summary.exactMatches;
        else
        {
          ++summary.formattingOrPolicyDifference;
          const before = CjsYamlFormat.readRaw(source, { maxAliasCount: 100000, tagPolicy: "reject" });
          const after = CjsYamlFormat.readRaw(output, { maxAliasCount: 100000, tagPolicy: "reject" });
          const categories = referenceDifferenceCategories(before, after);
          for (const category of categories) ++summary[category];
          if (categories.size === 0) ++summary.formatOnlyFiles;
        }
      }
      catch { ++summary.writeFailures; }
    }
  }
  finally
  {
    be.resMan = previous;
    Object.assign(console, saved);
  }
  if (summary.files === 0) { t.skip("no reference inputs available"); return; }
  t.diagnostic(JSON.stringify(summary));
  assert.equal(summary.parseFailures + summary.constructionFailures + summary.writeFailures, 0,
    "reference comparison failed; only aggregate counts may be reported");
});

/** Classifies differences without returning authored values, keys or paths. */
function referenceDifferenceCategories(before, after)
{
  const categories = new Set(), seen = new Map(), reverse = new Map();
  function visit(left, right)
  {
    if (typeof left === "number" && typeof right === "number")
    {
      if (!Object.is(left, right)) categories.add("numberChangedFiles");
      return;
    }
    if (left === null || right === null || typeof left !== "object" || typeof right !== "object")
    {
      if (left !== right) categories.add("nonNumericChangedFiles");
      return;
    }
    if (seen.has(left))
    {
      if (seen.get(left) !== right) categories.add("aliasTopologyChangedFiles");
      return;
    }
    if (reverse.has(right) && reverse.get(right) !== left) categories.add("aliasTopologyChangedFiles");
    seen.set(left, right); reverse.set(right, left);
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    for (const key of keys)
    {
      if (key === "__bluemetadata__")
      {
        if (JSON.stringify(left[key]) !== JSON.stringify(right[key])) categories.add("metadataChangedFiles");
      }
      else if (!Object.hasOwn(left, key) || !Object.hasOwn(right, key)) categories.add("memberSetChangedFiles");
      else visit(left[key], right[key]);
    }
  }
  visit(before, after);
  return categories;
}
