import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { DictReader } from "../../npm/dist/global/blue/DictReader.js";
import { CjsBlackFormat } from "../../npm/dist/resource/formats/black/index.js";
import { EveSOFData, EveSOFDataGeneric, EveSOFDataHullDecalSetItem } from "../../npm/dist/sof/index.js";
import "../../npm/dist/trinity/index.js";

const host = JSON.parse(readFileSync(new URL("../support/crisisParticleHost.json", import.meta.url), "utf8"));

test("shared schema loader resolves the real Crisis particle graph before initialization", () =>
{
  const built = CjsSchema.from(host._type, structuredClone(host));
  const emitter = built.particleEmitters[0];
  assert.equal(emitter.particleSystem, built.particleSystems[0]);
  assert.equal(emitter.particleSystem.isValid, true);
  assert.equal(emitter.isValid, true);

  // Negative control: the original failure bound the emitter before its system.
  const control = new DictReader({ declarations: true, initialize: false }).CreateObject(structuredClone(host));
  const early = control.particleEmitters[0];
  early.Initialize();
  assert.equal(early.isValid, false, "binding before system initialization must fail");
  early.particleSystem.Initialize();
  early.Initialize();
  assert.equal(early.isValid, true, "dependency-first initialization restores binding");
});

test("dictionary editing retains equal-write notifications, deferred settles and suppression", () =>
{
  class Record
  {
    value = 0;
    calls = [];
    OnModified(member) { this.calls.push(member); return true; }
  }
  CjsSchema.define(Record, { className: "SharedLoaderEditRecord", fields: [
    { name: "value", key: "value", type: { kind: "int32" }, edit: { notify: true } }
  ] });
  const record = new Record();
  CjsSchema.setValues(record, { value: 1 });
  CjsSchema.setValues(record, { value: 1 });
  assert.deepEqual(record.calls, ["value", "value"]);
  CjsSchema.setValues(record, { value: 2 }, { notify: false });
  CjsSchema.setValues(record, { value: 3 }, { markDirty: false });
  assert.equal(record.calls.length, 2);
  CjsSchema.setValues(record, { value: 4 }, { skipUpdate: true });
  assert.equal(record.calls.length, 2);
  assert.equal(record.__state.dirty, true);
  CjsSchema.setValues(record, { value: 5 });
  assert.deepEqual(record.calls, ["value", "value", "value"]);
  assert.equal(record.__state.dirty, false);
  assert.throws(() => CjsSchema.setValues(record, { value: 6, unknown: 1 }), /Invalid attribute/);
  assert.equal(record.value, 6);
  assert.equal(record.__state.dirty, true);
});

test("a failed dictionary operation cannot leak anchors or completion into reader reuse", () =>
{
  const calls = [];
  class Record { name = ""; child = null; Initialize() { calls.push(this.name); } }
  CjsSchema.define(Record, { className: "SharedLoaderReuseRecord", fields: [
    { name: "name", key: "name", type: { kind: "string" } },
    { name: "child", key: "child", type: { kind: "objectRef", className: Record } }
  ] });
  const reader = new DictReader();
  assert.throws(() => reader.CreateObject({ _type: "SharedLoaderReuseRecord", _id: "root", name: "failed", child: { _ref: "missing" } }), /Unresolved _ref/);
  assert.deepEqual(calls, []);
  const result = reader.CreateObject({ _type: "SharedLoaderReuseRecord", _id: "root", name: "success" });
  assert.equal(result.name, "success");
  assert.deepEqual(calls, ["success"]);
});

test("real SOF generic and decal data retain concrete nested records through the shared loader", {
  skip: !process.env.SOF_BLACK_CORPUS_FILE && "Set SOF_BLACK_CORPUS_FILE to the indexed data.black copy."
}, t =>
{
  const bytes = readFileSync(process.env.SOF_BLACK_CORPUS_FILE);
  assert.equal(createHash("md5").update(bytes).digest("hex"), "a800b64240ea16a7efba1d1b96df3365");
  const raw = CjsBlackFormat.readPayload(bytes).object;
  const catalog = CjsSchema.from("EveSOFData", { generic: raw.generic });
  assert.equal(catalog.constructor, EveSOFData);
  assert.equal(catalog.generic.constructor, EveSOFDataGeneric);
  assert.ok(catalog.generic.areaShaders.length > 0);
  assert.equal(CjsSchema.getClassName(catalog.generic.areaShaders[0].constructor), "EveSOFDataGenericShader");
  let count = 0;
  hulls: for (const hull of raw.hull)
  {
    for (const set of hull.decalSets ?? []) for (const values of set.items ?? [])
    {
      if (!values.indexBuffers?.length) continue;
      const decal = CjsSchema.from("EveSOFDataHullDecalSetItem", values);
      assert.equal(decal.constructor, EveSOFDataHullDecalSetItem);
      assert.equal(CjsSchema.getClassName(decal.indexBuffers[0].constructor), "EveSOFDataDecalIndexBuffer");
      assert.notEqual(decal.indexBuffers[0], values.indexBuffers[0]);
      assert.deepEqual(Array.from(decal.indexBuffers[0].indexBuffer), Array.from(values.indexBuffers[0].indexBuffer));
      const control = new EveSOFDataHullDecalSetItem();
      CjsSchema.setValuesFromSchema(control, values);
      assert.notEqual(control.indexBuffers[0].constructor, decal.indexBuffers[0].constructor,
        "Negative control: the scalar transport loses concrete typed children");
      count++;
      if (count >= 3) break hulls;
    }

  }
  assert.equal(count, 3, "exercise three actual decals with typed index records");
  t.diagnostic("real SOF catalog/generic plus three authored decal records hydrated");
});


test("schema construction batches notifications and honors values options before initialization", () =>
{
  class Record
  {
    first = 0;
    second = 0;
    calls = [];
    OnModified(member) { this.calls.push([member, this.second]); return true; }
    Initialize() { this.calls.push(["initialize", this.second]); }
  }
  CjsSchema.define(Record, { className: "SharedLoaderConstructionRecord", fields: [
    { name: "first", key: "first", type: { kind: "int32" }, edit: { notify: true } },
    { name: "second", key: "second", type: { kind: "int32" }, edit: { notify: true } }
  ] });
  const values = { first: 1, second: 2 };
  const built = CjsSchema.from("SharedLoaderConstructionRecord", values);
  assert.deepEqual(built.calls, [["first", 2], ["second", 2], ["initialize", 2]]);
  for (const options of [{ notify: false }, { markDirty: false }, { skipUpdate: true }])
  {
    const record = CjsSchema.from("SharedLoaderConstructionRecord", values, options);
    assert.deepEqual(record.calls, [["initialize", 2]]);
    if (options.skipUpdate) assert.equal(record.__state.dirty, true);
  }
});
