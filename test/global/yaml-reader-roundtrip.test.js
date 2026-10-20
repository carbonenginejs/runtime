import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { YamlWriter, BeObjectMetadata, be } from "../../npm/dist/global/blue/index.js";
import { getDictionaryDeclarations, readDictionaryValue } from "../../npm/dist/global/blue/dictionaryDeclarations.js";
import { CjsBlackFormat } from "../../npm/dist/resource/formats/black/index.js";
import { YamlReader } from "../../npm/dist/global/blue/YamlReader.js";
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
test("native YamlReader round trip on the writer's real resources", {
  skip: !service || !build ? "set YAML_WRITER_RESOURCE_SERVICE and YAML_WRITER_RESOURCE_BUILD" : false
}, async t => {
  const previous = be.resMan;
  be.resMan = new StubResMan();
  t.after(() => { be.resMan = previous; });
  for (const path of [
    "dx9/model/ship/iconpreview/previewturretship.black",
    "dx9/model/ship/angel/battlecruiser/angbc1/effects/angbc1_t1_fx_01a.black",
    "dx9/model/controller/shipstandard_fxstandalone.black"
  ])
  {
    await t.test(path, async () => {
      const response = await fetch(new URL(`eve/${build}/resources/${path}`, service));
      assert.ok(response.ok);
      const payload = CjsBlackFormat.readPayload(new Uint8Array(await response.arrayBuffer())).object;
      const original = CjsSchema.from(payload._type, payload);
      BeObjectMetadata.Set(original, "typeID", "42");
      BeObjectMetadata.Set(original, "privatePath", "private-authoring-location");
      const text = new YamlWriter().WriteObjectToString(original);
      const restored = new YamlReader().CreateObjectFromString(text);
      const result = compareGraphs(original, restored);
      t.diagnostic(JSON.stringify({ resource: path, ...result }));
      assert.deepEqual(result.mismatches, []);
      assert.ok(result.objects > 0);
      assert.equal(BeObjectMetadata.Get(restored, "typeID"), "42");
      assert.equal(BeObjectMetadata.Get(restored, "privatePath"), null);
      const values = CjsSchema.getValues(restored, {}, { typeTags: true });
      assert.equal(values.__bluemetadata__.typeID, "42");
    });
  }
});

const referenceDirectory = process.env.YAML_WRITER_REFERENCE_DIR;
test("native reader private references are processed in place and reported only as aggregates", {
  skip: !referenceDirectory ? "set YAML_WRITER_REFERENCE_DIR" : false
}, async t => {
  const entries = await readdir(referenceDirectory, { withFileTypes: true });
  const summary = { files: 0, read: 0, written: 0, reread: 0, readFailures: 0, writeFailures: 0,
    rereadFailures: 0, memberMismatchFiles: 0, numericChangeFiles: 0,
    typedAssignmentFailures: 0, eventFailures: 0, unsupportedStorageFailures: 0, otherReadFailures: 0 };
  const previous = be.resMan;
  be.resMan = new StubResMan();
  const saved = { log: console.log, warn: console.warn, error: console.error, info: console.info, debug: console.debug };
  for (const key of Object.keys(saved)) console[key] = () => {};
  try
  {
    for (const entry of entries)
    {
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".red")) continue;
      ++summary.files;
      let object, output, restored;
      try {
        const source = await readFile(join(referenceDirectory, entry.name), "utf8");
        object = new YamlReader().CreateObjectFromString(source);
        ++summary.read;
      } catch (error) {
        ++summary.readFailures;
        if (/Incorrect type for member/.test(error.message)) ++summary.typedAssignmentFailures;
        else if (/Expected event|Expected description|Type of object is not specified/.test(error.message)) ++summary.eventFailures;
        else if (/Unsupported.*type|no storage|no declared/.test(error.message)) ++summary.unsupportedStorageFailures;
        else ++summary.otherReadFailures;
        continue;
      }
      try { output = new YamlWriter().WriteObjectToString(object); ++summary.written; }
      catch { ++summary.writeFailures; continue; }
      try { restored = new YamlReader().CreateObjectFromString(output); ++summary.reread; }
      catch { ++summary.rereadFailures; continue; }
      const result = compareGraphs(object, restored);
      if (result.mismatches.length) ++summary.memberMismatchFiles;
      if (result.numericChanges) ++summary.numericChangeFiles;
    }
  }
  finally { be.resMan = previous; Object.assign(console, saved); }
  t.diagnostic(JSON.stringify(summary));
  assert.ok(summary.files > 0, "private input inventory must not silently be empty");
  assert.equal(summary.readFailures + summary.writeFailures + summary.rereadFailures + summary.memberMismatchFiles, 0,
    "reference comparison failed; retain only aggregate categories");
});
