import { createChild } from "../../npm/dist/global/blue/children.js";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { CjsResMan } from "../../npm/dist/global/blue/CjsResMan.js";
import { DictReader } from "../../npm/dist/global/blue/DictReader.js";
import { CjsBlackFormat } from "../../npm/dist/resource/formats/black/index.js";
import { EveSOFData, EveSOFDataGeneric, EveSOFDataHullDecalSetItem } from "../../npm/dist/sof/index.js";
import { Tr2DynamicEmitter, ITr2GenericEmitter, EveThrottleable, Tr2Effect, Tr2Controller, Tr2TimelineController } from "../../npm/dist/trinity/index.js";
import { IInitialize, INotify } from "../../npm/dist/global/blue/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";

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
  CjsSchema.meta.blue.mapInterface(IInitialize)(Record);
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


test("mapped initialization suppresses construction notifications while later edits still notify", () =>
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
  CjsSchema.meta.blue.mapInterface(IInitialize)(Record);
  const values = { first: 1, second: 2 };
  const built = CjsSchema.from("SharedLoaderConstructionRecord", values);
  assert.deepEqual(built.calls, [["initialize", 2]]);
  CjsSchema.setValues(built, { first: 3, second: 4 });
  assert.deepEqual(built.calls, [["initialize", 2], ["first", 4], ["second", 4]]);
  for (const options of [{ notify: false }, { markDirty: false }, { skipUpdate: true }])
  {
    const record = CjsSchema.from("SharedLoaderConstructionRecord", values, options);
    assert.deepEqual(record.calls, [["initialize", 2]]);
    if (options.skipUpdate) assert.equal(record.__state.dirty, true);
  }
});


test("dynamic emitters and throttle owners expose only their native lifecycle identities", () =>
{
  assert.deepEqual(mappedInterfaces(Tr2DynamicEmitter), new Set([Tr2DynamicEmitter, ITr2GenericEmitter, INotify, IInitialize]));
  assert.deepEqual(mappedInterfaces(EveThrottleable), new Set([EveThrottleable]));
  for (const Type of [Tr2Controller, Tr2TimelineController])
  {
    assert.equal(mappedInterfaces(Type).has(IInitialize), false);
    const value = CjsSchema.from(CjsSchema.getClassName(Type), {});
    assert.equal("SetValues" in value, false);
  }
  const values = structuredClone(host);
  const emitter = CjsSchema.from(values._type, values).particleEmitters[0];
  assert.equal("SetValues" in emitter, false);
  assert.equal(emitter.isValid, true);
});


test("resource target hydration builds a model-free emitter from the real Crisis record", () =>
{
  const values = structuredClone(host.particleEmitters[0]);
  values.particleSystem = structuredClone(host.mesh.instanceGeometryResource);
  const manager = new CjsResMan();
  const a = manager._HydrateTarget(null, Tr2DynamicEmitter, values, {});
  const b = manager._HydrateTarget(null, Tr2DynamicEmitter, values, {});
  assert.equal(a.isValid, true);
  assert.equal(b.isValid, true);
  assert.notEqual(a, b);
  assert.notEqual(a.particleSystem, b.particleSystem);
  class Unregistered {}
  assert.throws(() => manager._HydrateTarget(null, Unregistered, values, {}), /Target hydration failed/,
    "Negative control: an unregistered class cannot be constructed by schema name");
});

test("shared child creation hydrates the real Crisis graph before publishing it", () =>
{
  class Owner { children = []; }
  CjsSchema.define(Owner, { className: "RealAssetChildCollectionOwner", fields: [
    { name: "children", key: "children", type: { kind: "list", itemType: host._type }, edit: { persist: true } }
  ] });
  const owner = new Owner();
  let initializedAtPublication = false;
  const child = createChild(owner, "children", structuredClone(host), {
    onAdded({ child: value }) { initializedAtPublication = value.particleEmitters[0].isValid; }
  });
  assert.equal(initializedAtPublication, true);
  assert.equal(child.particleEmitters[0].particleSystem, child.particleSystems[0]);
  assert.equal(owner.children[0], child);
  const control = new Owner();
  control.children.push(structuredClone(host));
  assert.equal(control.children[0].particleEmitters[0].isValid, undefined,
    "negative control: appending the authored bag omits dependency construction and initialization");
  assert.throws(() => createChild(owner, "children", { _ref: "absent" }), /_ref/);
  assert.deepEqual(owner.children, [child], "failed hydration never publishes a partial child");
});

test("the real Crisis effect custom setter initializes once after population, and honors initialize:false", t =>
{
  const values = structuredClone(host.mesh.transparentAreas[0].effect);
  const observations = [];
  const initialize = Tr2Effect.prototype.Initialize;
  t.mock.method(Tr2Effect.prototype, "Initialize", function (...args)
  {
    observations.push({ instance: this, options: this.options.length, path: this.effectFilePath });
    return Reflect.apply(initialize, this, args);
  });
  const effect = CjsSchema.from("Tr2Effect", values);
  assert.equal(observations.length, 1);
  assert.equal(observations[0].instance, effect);
  assert.equal(observations[0].options, values.options.length);
  assert.equal(observations[0].path, values.effectFilePath);
  const disabled = CjsSchema.from("Tr2Effect", structuredClone(values), { initialize: false });
  assert.equal(disabled.effectFilePath, values.effectFilePath);
  assert.equal(observations.length, 1, "disabled initialization must not escape through OnModified");
  // Negative control: ordinary editor notifications reinitialize immediately.
  const control = new Tr2Effect();
  control.SetValues(structuredClone(values));
  assert.ok(observations.length > 1, "an unsuppressed setter reproduces early initialization");
});
