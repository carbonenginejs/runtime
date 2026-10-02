import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { blue, CjsBlueResMan, Copier, DictReader, IInitialize, INotify } from "../../npm/dist/global/blue/index.js";
import { Tr2MaterialParameterStore, Tr2VariableStore, TriVariable } from "../../npm/dist/trinity/core/index.js";
import { TriVariableParameter } from "../../npm/dist/trinity/shader/parameter/TriVariableParameter.js";
import { Tr2Effect } from "../../npm/dist/trinity/shader/Tr2Effect.js";
import { Tr2MaterialArea } from "../../npm/dist/resource/shader/Tr2MaterialArea.js";

const settle = () => new Promise(resolve => setImmediate(resolve));

test("store classes retain exact native nominal and query contracts", () =>
{
  const material = new Tr2MaterialParameterStore(), variable = new Tr2VariableStore();
  assert.equal(Object.getPrototypeOf(Tr2MaterialParameterStore.prototype), IInitialize.prototype);
  assert.equal(CjsSchema.cast(material, INotify), material);
  assert.deepEqual([...mappedInterfaces(Tr2MaterialParameterStore)], [INotify, IInitialize, Tr2MaterialParameterStore]);
  assert.equal(Object.getPrototypeOf(Tr2VariableStore.prototype), Object.prototype);
  assert.deepEqual([...mappedInterfaces(Tr2VariableStore)], [Tr2VariableStore]);
  assert.equal(CjsSchema.cast(variable, IInitialize), null);
  assert.equal(CjsSchema.cast(variable, INotify), null);
  for (const store of [material, variable])
    for (const name of ["SetValues", "UpdateValues", "GetResources", "Traverse", "OnEvent"])
      assert.equal(name in store, false, name);
});

test("material declarations retain native member order and persistence flags", () =>
{
  const members = CjsSchema.getSchema(Tr2MaterialParameterStore).members;
  assert.deepEqual(members.map(field => field.name), ["name", "parentPath", "parent", "parameters"]);
  assert.deepEqual(members.map(field => field.type.kind), ["string", "path", "objectRef", "map"]);
  assert.deepEqual(members.map(field => field.edit.persist === true), [true, true, false, true]);
  assert.equal(members[1].edit.notify, true);
  assert.equal(members[2].edit.read, true);
  assert.notEqual(members[2].edit.write, true);
  assert.notEqual(members[3].edit.write, true);
});

test("declared material initialization loads once instead of per-member notification", async t =>
{
  const original = Tr2MaterialParameterStore.prototype.Initialize;
  let initialized = 0, notified = 0;
  t.mock.method(Tr2MaterialParameterStore.prototype, "Initialize", function() { initialized++; return original.call(this); });
  t.mock.method(Tr2MaterialParameterStore.prototype, "OnModified", function() { notified++; return true; });
  const previous = blue.resMan, paths = [];
  const parent = new Tr2MaterialParameterStore();
  blue.resMan = { LoadObject(path) { paths.push(path); return Promise.resolve(parent); } };
  t.after(() => { blue.resMan = previous; });
  const store = new DictReader({ declarations: true }).CreateObject({ _type: "Tr2MaterialParameterStore", name: "child", parentPath: "res:/parent.red" });
  await settle();
  assert.equal(initialized, 1);
  assert.equal(notified, 0);
  assert.deepEqual(paths, ["res:/parent.red"]);
  assert.equal(store.parent, parent);
});

test("material parent replacement rejects stale completion and clears immediately", async t =>
{
  const previous = blue.resMan, pending = [];
  blue.resMan = { LoadObject(path) { return new Promise(resolve => pending.push({ path, resolve })); } };
  t.after(() => { blue.resMan = previous; });
  const store = new Tr2MaterialParameterStore(), old = new Tr2MaterialParameterStore(), current = new Tr2MaterialParameterStore();
  store.parent = old;
  store.parentPath = "res:/same.red";
  const first = store._LoadParentResource();
  assert.equal(store.parent, null);
  const second = store._LoadParentResource();
  pending[1].resolve(current); await second;
  pending[0].resolve(old); await first;
  assert.equal(store.parent, current, "generation protects repeated requests for the same path");
  const third = store._LoadParentResource();
  store.parentPath = "";
  assert.equal(store.OnModified("parentPath"), true);
  assert.equal(store.parent, null);
  pending[2].resolve(old); await third;
  assert.equal(store.parent, null);
  const count = pending.length;
  assert.equal(store.OnModified("name"), true);
  assert.equal(pending.length, count);
});

test("material parent accepts exposed store identity and survives load errors", async t =>
{
  const previous = blue.resMan;
  t.after(() => { blue.resMan = previous; });
  const store = new Tr2MaterialParameterStore();
  store.parentPath = "res:/wrong.red";
  blue.resMan = { LoadObject() { return Promise.resolve({ FindParameter() {}, parameters: new Map() }); } };
  assert.equal(await store._LoadParentResource(), null);
  assert.equal(store.parent, null);
  blue.resMan = { LoadObject() { throw new Error("fixture rejection"); } };
  assert.equal(await store._LoadParentResource(), null);
  assert.equal(store.parent, null);
  blue.resMan = { LoadObject() { return Promise.reject(new Error("async fixture rejection")); } };
  assert.equal(await store._LoadParentResource(), null);
});

test("real manager builder hydrates independent material parents through shared Blue reader", async t =>
{
  const previous = blue.resMan;
  t.after(() => { blue.resMan = previous; });
  let reads = 0, builds = 0;
  const payload = new TextEncoder().encode(JSON.stringify({ _type: "Tr2MaterialParameterStore", name: "loaded", parameters: { Glow: { _type: "Tr2FloatParameter", name: "Glow", value: 2 } } }));
  const manager = new CjsBlueResMan({ source: { Read() { reads++; return payload; } } });
  manager.RegisterObjectBuilder("storefixture", bytes =>
  {
    const dictionary = JSON.parse(new TextDecoder().decode(bytes));
    return { CreateObject() { builds++; return new DictReader({ declarations: true }).CreateObject(dictionary); } };
  });
  blue.resMan = manager;
  const first = new Tr2MaterialParameterStore(), second = new Tr2MaterialParameterStore();
  first.parentPath = second.parentPath = "res:/parent.storefixture";
  await first._LoadParentResource(); await second._LoadParentResource();
  assert.equal(reads, 1); assert.equal(builds, 2);
  assert.notEqual(first.parent, second.parent);
  assert.equal(first.FindParameter("Glow").value, 2);
  first.parameters.set("Glow", null);
  assert.equal(first.FindParameter("Glow"), null, "local null shadows inherited value");
  first.parameters.set("Glow", new DictReader({ declarations: true }).CreateObject({ _type: "Tr2FloatParameter", name: "Glow", value: 3 }));
  const area = new Tr2MaterialArea();
  area.material = first;
  const copy = new Copier().CopyTo(area);
  for (let turn = 0; turn < 20 && !copy.material.parent; turn++)
  {
    manager.PumpMainThreadQueue();
    await settle();
  }
  assert.notEqual(copy.material, first);
  assert.equal(copy.material.parentPath, first.parentPath);
  assert.equal(copy.material.parent.name, "loaded");
  assert.equal(copy.material.FindParameter("Glow").value, 3);
  assert.notEqual(copy.material.FindParameter("Glow"), first.FindParameter("Glow"));
  assert.equal(first.parent.name, "loaded");
});

test("variable store exposes native parent property without persisting runtime backing", () =>
{
  const schema = CjsSchema.getSchema(Tr2VariableStore);
  assert.deepEqual(schema.members, []);
  assert.deepEqual(schema.properties.map(field => field.name), ["parentStore"]);
  assert.equal(schema.properties[0].edit.read, true);
  assert.equal(schema.properties[0].edit.write, true);
  assert.notEqual(schema.properties[0].edit.persist, true);
  const root = Tr2VariableStore.globalStore(), store = new Tr2VariableStore(), parent = new Tr2VariableStore();
  assert.equal(store.parentStore, root);
  store.parentStore = parent;
  assert.equal(store.GetParentVariableStore(), parent);
  root.parentStore = store;
  assert.equal(root.parentStore, null);
  store.RegisterVariable("local", 1);
  const copy = new Copier().CopyTo(store);
  assert.equal(copy.parentStore, root);
  assert.deepEqual(copy.GetLocalNames(), []);
  assert.equal(Tr2VariableStore.GlobalStore, undefined);
  assert.equal(Tr2VariableStore.SetGlobalStore, undefined);
});

test("variable reservations preserve identity conflicts lookup and invalidation", () =>
{
  const parent = new Tr2VariableStore(), store = new Tr2VariableStore();
  parent.parentStore = null; store.parentStore = parent;
  const inherited = parent.RegisterVariable("shared", 2.5);
  assert.equal(store.FindVariable("shared"), inherited);
  const reserved = store.GetLocalVariable("shared");
  assert.equal(store.FindVariable("shared"), reserved);
  assert.equal(store.RegisterVariable("shared", [1, 2]), reserved);
  assert.equal(store.RegisterVariable("shared", 3), null);
  assert.deepEqual(Array.from(reserved.GetValue()), [1, 2]);
  assert.equal(store.UnregisterLocalVariable("shared"), true);
  assert.equal(reserved.GetType(), TriVariable.ContentType.TRIVARIABLE_INVALID);
  assert.equal(store.FindVariable("shared"), inherited);
  store.UnregisterVariable("shared");
  assert.equal(inherited.GetType(), TriVariable.ContentType.TRIVARIABLE_INVALID);
  assert.equal(parent.FindVariable("shared"), null);
});

test("real variable parameter and effect retain selected store lookup and value identity", () =>
{
  const store = new Tr2VariableStore(), variable = store.RegisterVariable("speed", 1.5);
  const parameter = new TriVariableParameter();
  parameter.variableName = "speed";
  assert.equal(parameter.Initialize(store), true);
  assert.equal(parameter.variable, variable);
  const output = new Float32Array(1);
  parameter.CopyValueToEffect(0, output, 4, null);
  assert.equal(output[0], 1.5);
  assert.equal(store.RegisterVariable("speed", 2.5), variable);
  parameter.CopyValueToEffect(0, output, 4, null);
  assert.equal(output[0], 2.5);
  const effect = new Tr2Effect();
  assert.equal(effect.GetVariableStore(), Tr2VariableStore.globalStore());
  effect.variableStore = store;
  assert.equal(effect.GetVariableStore(), store);
  effect.Destroy();
});
