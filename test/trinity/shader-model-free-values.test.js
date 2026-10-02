import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { DictReader, IInitialize, INotify, IListNotify, ICopierCustomAssignment } from "../../npm/dist/global/blue/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { Tr2Effect, Tr2Material, TriTextureParameter, Tr2Matrix4Parameter, Tr2Vector4Parameter, Tr2TextureReference } from "../../npm/dist/trinity/index.js";

const host = JSON.parse(readFileSync(new URL("../support/crisisParticleHost.json", import.meta.url), "utf8"));
const records = [];
const effects = [];
function collect(value)
{
  if (!value || typeof value !== "object") return;
  if (value._type === "Tr2Effect") effects.push(value);
  if (value._type === "TriTextureParameter" || value._type === "Tr2Vector4Parameter") records.push(value);
  for (const child of Object.values(value)) collect(child);
}
collect(host);

test("real Crisis shader records hydrate and retain detached storage without the parameter model base", () =>
{
  assert.equal(records.length, 4);
  for (const values of records)
  {
    const parameter = CjsSchema.from(values._type, structuredClone(values));
    assert.equal(CjsSchema.getClassName(parameter.constructor), values._type);
    assert.equal(parameter.GetParameterName(), values.name);
    assert.equal("SetValues" in parameter, false);
    if (values.value)
    {
      assert.deepEqual(Array.from(parameter.value), values.value);
      assert.notEqual(parameter.value, values.value);
    }
    else assert.equal(parameter.resourcePath, values.resourcePath);
  }
  assert.equal(mappedInterfaces(Tr2Vector4Parameter).has(IInitialize), true);
  assert.equal(mappedInterfaces(Tr2Matrix4Parameter).has(IInitialize), false,
    "Negative control: a same-named method does not grant a native initialization interface");
  assert.equal(mappedInterfaces(TriTextureParameter).has(INotify), true);
  assert.equal(mappedInterfaces(TriTextureParameter).has(ICopierCustomAssignment), true);
});

test("real authored texture assignment only forwards providers for dynamic resources", () =>
{
  const values = records.find(value => value._type === "TriTextureParameter");
  const parameter = new DictReader({ declarations: true, initialize: false }).CreateObject(values);
  const provider = new Tr2TextureReference();
  parameter.SetResource(provider);
  const authored = new TriTextureParameter();
  CjsSchema.cast(parameter, ICopierCustomAssignment).AssignTo(authored, null);
  assert.notEqual(authored.resource, provider,
    "Negative control: a persisted resource path must not copy a runtime provider");
  parameter.resourcePath = "";
  const dynamic = new TriTextureParameter();
  CjsSchema.cast(parameter, ICopierCustomAssignment).AssignTo(dynamic, null);
  assert.equal(dynamic.resource, provider);
  assert.equal(parameter.name, values.name);
});


test("real Crisis material hydration retains subscribed lists and native resource notifications", () =>
{
  assert.equal(effects.length, 1);
  const effect = CjsSchema.from("Tr2Effect", structuredClone(effects[0]));
  assert.equal(effect.parameters.length, 1);
  assert.equal(effect.resources.length, 3);
  assert.equal("GetValues" in effect, false);
  assert.deepEqual(mappedInterfaces(Tr2Material), new Set([Tr2Material]));
  assert.deepEqual(mappedInterfaces(Tr2Effect), new Set([Tr2Effect, Tr2Material, IInitialize, INotify, IListNotify]));
  const parameters = effect.parameters, resources = effect.resources;
  for (const list of [parameters, resources])
  {
    const info = {};
    list.GetInfo(info);
    assert.equal(info.notify, effect);
  }
  const resource = new TriTextureParameter();
  const calls = [];
  const added = resource.OnAddedToMaterial.bind(resource);
  const removed = resource.OnRemovedFromMaterial.bind(resource);
  resource.OnAddedToMaterial = owner => { calls.push("added"); added(owner); };
  resource.OnRemovedFromMaterial = owner => { calls.push("removed"); removed(owner); };
  assert.equal(resources.Insert(-1, resource), true);
  assert.equal(resources.Remove(resources.FindKey(resource)), true);
  assert.deepEqual(calls, ["added", "removed"]);
  resources.push(resource);
  assert.deepEqual(calls, ["added", "removed"], "Negative control: raw array mutation emits no native list event");
  resources.pop();
  CjsSchema.setValues(effect, { parameters: effects[0].parameters, resources: effects[0].resources });
  assert.equal(effect.parameters, parameters);
  assert.equal(effect.resources, resources);
  effect.ClearAllParameters();
  effect.ClearAllResources();
  assert.equal(effect.parameters, parameters);
  assert.equal(effect.resources, resources);
  assert.equal(parameters.length, 0);
  assert.equal(resources.length, 0);
});
