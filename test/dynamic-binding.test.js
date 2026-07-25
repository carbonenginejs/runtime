import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { CjsSchema } from "@carbonenginejs/runtime-utils/schema";
import {
  BELIST_INSERTED,
  BELIST_REMOVED,
  BELIST_UNLOADSTART,
  EveMultiEffect,
  EveStretch3,
  Tr2ControllerExpression,
  Tr2DynamicBinding,
  Tr2ExternalParameter,
  Tr2FloatParameter,
  Tr2PyValueBinding,
  Tr2Vector3Parameter,
  TriValueBinding
} from "../npm/dist/index.js";


function closeArray(actual, expected, epsilon = 1e-6)
{
  assert.equal(actual.length, expected.length);
  for (let index = 0; index < expected.length; index++)
  {
    assert.ok(Math.abs(actual[index] - expected[index]) <= epsilon, `index ${index}`);
  }
}


test("Tr2DynamicBinding resolves Carbon path forms and delay boundaries", () =>
{
  const source = {
    children: [
      { name: "first", value: 2 },
      { name: "flare", value: 3 }
    ]
  };
  const destination = { value: 0 };
  const owner = {
    GetParameterMap()
    {
      return { Source: source, Destination: destination };
    }
  };
  const binding = new Tr2DynamicBinding();
  binding.sourceObjectPath = "Source.children[\"flare\"]";
  binding.sourceObjectAttribute = "value";
  binding.destinationObjectPath = "Destination";
  binding.destinationObjectAttribute = "value";
  binding.scale = 4;
  binding.bindingDelay = 100;
  binding.SetOwner(owner);

  assert.equal(binding.Link(10), true);
  assert.equal(binding.IsSourceValid(), true);
  assert.equal(binding.IsDestinationValid(), true);
  assert.equal(binding.Update(10.099), false);
  assert.equal(destination.value, 0);
  assert.equal(binding.Update(10.1), true);
  assert.equal(destination.value, 12);

  binding.bindingDelay = 0;
  binding.sourceObjectPath = "Source.children[-2]";
  binding.OnModified();
  binding.Update(10.1);
  assert.equal(destination.value, 8);

  binding.sourceObjectPath = "Source.children[wat]";
  binding.OnModified();
  assert.equal(binding.IsSourceValid(), false);
  assert.equal(binding.binding, null);
});


test("Tr2DynamicBinding only relinks for Carbon NOTIFY fields", () =>
{
  const source = { value: 2 };
  const destination = { value: 0 };
  const binding = new Tr2DynamicBinding();
  binding.sourceObjectPath = "Source";
  binding.sourceObjectAttribute = "value";
  binding.destinationObjectPath = "Destination";
  binding.destinationObjectAttribute = "value";
  binding.SetOwner({ GetParameterMap: () => ({ Source: source, Destination: destination }) });
  binding.Link();
  const first = binding.binding;

  binding.SetValues({ name: "renamed", bindingDelay: 500 });
  assert.equal(binding.binding, first);
  binding.SetValues({ scale: 2 });
  assert.notEqual(binding.binding, first);
});


test("Tr2DynamicBinding preserves the current frame clock across delayed relinks", () =>
{
  const source = { value: 2 };
  const destination = { value: 0 };
  const binding = new Tr2DynamicBinding();
  binding.sourceObjectPath = "Source";
  binding.sourceObjectAttribute = "value";
  binding.destinationObjectPath = "Destination";
  binding.destinationObjectAttribute = "value";
  binding.bindingDelay = 100;
  binding.SetOwner({ GetParameterMap: () => ({ Source: source, Destination: destination }) });
  binding.Link(20);
  binding.Update(20.1);
  assert.equal(destination.value, 2);

  destination.value = 0;
  binding.scale = 2;
  binding.OnModified();
  assert.equal(binding.Update(20.199), false);
  assert.equal(destination.value, 0);
  assert.equal(binding.Update(20.201), true);
  assert.equal(destination.value, 4);
});


test("Tr2DynamicBinding rejects primitive path endpoints", () =>
{
  const binding = new Tr2DynamicBinding();
  binding.sourceObjectPath = "Primitive";
  binding.sourceObjectAttribute = "value";
  binding.destinationObjectPath = "Destination";
  binding.destinationObjectAttribute = "value";
  binding.SetOwner({ GetParameterMap: () => ({ Primitive: 3, Destination: { value: 0 } }) });
  assert.doesNotThrow(() => binding.Link());
  assert.equal(binding.IsSourceValid(), false);
  assert.equal(binding.binding, null);
});


test("TriValueBinding enforces Carbon copy plans", () =>
{
  const invalid = new TriValueBinding();
  invalid.SetSource("value", { value: "source" });
  invalid.SetDestination("value", { value: "destination" });
  assert.equal(invalid.IsValid(), false);

  const matrix = mat4.create();
  matrix[12] = 4;
  matrix[13] = 5;
  matrix[14] = 6;
  const translated = { value: new Float32Array(3) };
  const matrixBinding = new TriValueBinding();
  matrixBinding.SetSource("value", { value: matrix });
  matrixBinding.SetDestination("value", translated);
  matrixBinding.scale = 2;
  matrixBinding.offset.set([1, 2, 3, 4]);
  matrixBinding.Initialize();
  assert.equal(matrixBinding.CopyValue(), true);
  closeArray(translated.value, [9, 12, 15]);

  const source2 = { value: new Float32Array([2, 3]) };
  const destination4 = { value: new Float32Array([9, 9, 9, 9]) };
  const vectorBinding = new TriValueBinding();
  vectorBinding.SetSource("value", source2);
  vectorBinding.SetDestination("value", destination4);
  vectorBinding.Initialize();
  vectorBinding.CopyValue();
  closeArray(destination4.value, [2, 3, 9, 9]);

  const broadcast = { value: new Float32Array(3) };
  const broadcastBinding = new TriValueBinding();
  broadcastBinding.SetSource("value", { value: 2 });
  broadcastBinding.SetDestination("value", broadcast);
  broadcastBinding.scale = 3;
  broadcastBinding.offset.set([1, 2, 3, 0]);
  broadcastBinding.Initialize();
  broadcastBinding.CopyValue();
  closeArray(broadcast.value, [7, 8, 9]);

  const matrixDestination = { value: mat4.create() };
  const matrixCopy = new TriValueBinding();
  matrixCopy.SetSource("value", { value: matrix });
  matrixCopy.SetDestination("value", matrixDestination);
  matrixCopy.scale = 99;
  matrixCopy.offset.set([99, 99, 99, 99]);
  matrixCopy.Initialize();
  matrixCopy.CopyValue();
  closeArray(matrixDestination.value, matrix);

  const booleanDestination = { value: false };
  const booleanCopy = new TriValueBinding();
  booleanCopy.SetSource("value", { value: -2 });
  booleanCopy.SetDestination("value", booleanDestination);
  booleanCopy.scale = 0;
  booleanCopy.offset[0] = 0;
  booleanCopy.Initialize();
  booleanCopy.CopyValue();
  assert.equal(booleanDestination.value, true);

  const int64Source = new Tr2ControllerExpression();
  const int64Destination = new Tr2ControllerExpression();
  int64Source.variableMask = 5n;
  int64Destination.variableMask = 1n;
  const int64Binding = new TriValueBinding();
  int64Binding.SetSource("variableMask", int64Source);
  int64Binding.SetDestination("variableMask", int64Destination);
  int64Binding.scale = 2;
  int64Binding.offset[0] = 1;
  assert.equal(int64Binding.CopyValue(), true);
  assert.equal(int64Destination.variableMask, 5n);
});


test("TriValueBinding callable copies remain publicly invalid like Carbon", () =>
{
  const source = { value: 3 };
  const destination = { value: 0 };
  const binding = new TriValueBinding();
  binding.SetSource("value", source);
  binding.SetDestination("value", destination);
  binding.copyValueCallable = (from, to) => { to.value = from.value; };
  binding.Initialize();
  assert.equal(binding.IsValid(), false);
  assert.equal(binding.CopyValue(), true);
  assert.equal(destination.value, 3);
});


test("Tr2PyValueBinding copies named portable object attributes", () =>
{
  const source = { sourceValue: 9 };
  const destination = { destinationValue: 0 };
  const binding = new Tr2PyValueBinding();
  binding.sourceObject = source;
  binding.destinationObject = destination;
  binding.sourceAttribute = "sourceValue";
  binding.destinationAttribute = "destinationValue";
  binding.OnModified();
  assert.equal(binding.isValid, true);
  binding.CopyValue();
  assert.equal(destination.destinationValue, 9);

  binding.sourceAttribute = "missing";
  binding.OnModified();
  binding.CopyValue();
  assert.equal(destination.destinationValue, 9);
});


test("TriValueBinding follows real vector and scalar shader reroutes", () =>
{
  const vectorSource = { value: new Float32Array([1, 2, 3]) };
  const vectorParameter = new Tr2Vector3Parameter();
  const vectorBinding = new TriValueBinding();
  vectorBinding.SetSource("value", vectorSource);
  vectorBinding.SetDestination("value", vectorParameter);
  vectorBinding.CopyValue();
  closeArray(vectorParameter.GetValue(), [1, 2, 3]);

  const vectorStorage = new Float32Array(3);
  vectorParameter.SetDestination(vectorStorage, 12);
  vectorSource.value.set([4, 5, 6]);
  vectorBinding.CopyValue();
  closeArray(vectorStorage, [4, 5, 6]);
  closeArray(vectorParameter.GetValue(), [4, 5, 6]);

  const scalarSource = { value: 7 };
  const scalarParameter = new Tr2FloatParameter();
  const scalarBinding = new TriValueBinding();
  scalarBinding.SetSource("value", scalarSource);
  scalarBinding.SetDestination("value", scalarParameter);
  scalarBinding.CopyValue();
  assert.equal(scalarParameter.GetDestination().dest.value, 7);
  assert.equal(scalarParameter.GetValue(), 7);

  const scalarStorage = new Float32Array(1);
  scalarParameter.SetDestination(scalarStorage, 4);
  scalarSource.value = 11;
  scalarBinding.CopyValue();
  assert.equal(scalarStorage[0], 11);
  assert.equal(scalarParameter.GetValue(), 11);
});


test("Tr2ExternalParameter validates types and exposes schema entries", () =>
{
  const target = new Tr2Vector3Parameter();
  const external = new Tr2ExternalParameter();
  external.SetDestinationObject(target);
  external.SetDestinationAttribute("value");
  assert.equal(external.IsValid(), true);
  assert.equal(external.GetDestinationEntry()?.type?.kind, "vec3");
  external.SetValue([1, 2, 3]);
  closeArray(target.value, [1, 2, 3]);
  assert.throws(() => external.SetValue([4, 5]), /incompatible type/);
  closeArray(target.value, [1, 2, 3]);

  external.SetDestinationAttribute("value.g");
  external.SetValue(9);
  assert.equal(target.value[1], 9);

  const invalid = new Tr2ExternalParameter();
  invalid.SetDestinationObject({ label: "value" });
  invalid.SetDestinationAttribute("label.x");
  assert.equal(invalid.IsValid(), false);
});


test("EveMultiEffect owns dynamic graphs, preserves map precedence, and updates in Carbon order", () =>
{
  const calls = [];
  const ownerParameter = {
    name: "Owner",
    object: { id: "parameter-owner" },
    GetName() { return this.name; },
    GetParameterObject() { return this.object; },
    SetOwner(owner) { calls.push(["parameter-owner", owner]); }
  };
  const duplicateParameter = {
    name: "Duplicate",
    object: { id: "parameter" },
    GetName() { return this.name; },
    GetParameterObject() { return this.object; },
    SetParameterObject(object) { this.object = object; }
  };
  const curveSet = {
    name: "Duplicate",
    GetName() { return this.name; },
    GetRawRoot() { return { id: "curve" }; },
    Update(realTime, simTime) { calls.push(["curve", realTime, simTime]); },
    GetMaxCurveDuration() { return 2; },
    GetRangeDuration() { return 3; }
  };
  const binding = {
    SetOwner(owner) { calls.push(["binding-owner", owner]); },
    Link() { calls.push(["link"]); },
    Update(time) { calls.push(["binding-update", time]); }
  };
  const controller = {
    Link(owner) { calls.push(["controller-link", owner]); },
    Unlink() { calls.push(["controller-unlink"]); },
    Update(delta) { calls.push(["controller-update", delta]); }
  };
  const effect = new EveMultiEffect();
  effect.parameters.push(ownerParameter, duplicateParameter);
  effect.curveSets.push(curveSet);
  effect.bindings.push(binding);
  effect.controllers.push(controller);
  assert.equal(effect.Initialize(), true);

  const parameterMap = effect.GetParameterMap();
  assert.equal(parameterMap.Owner, effect);
  assert.equal(parameterMap.Duplicate.id, "curve");
  const bindingRoots = effect.GetBindingRoots({});
  assert.equal(bindingRoots.Owner.id, "parameter-owner");
  assert.equal(bindingRoots.Duplicate.id, "parameter");

  calls.length = 0;
  effect.UpdateSyncronous({ currentTime: 7 });
  assert.deepEqual(calls, [
    ["curve", 7, 7],
    ["controller-update", 0.5],
    ["binding-update", 7]
  ]);
  assert.equal(effect.GetCurveSetDuration("Duplicate"), 2);
  assert.equal(effect.GetRangeDuration("Duplicate", "range"), 3);

  effect.OnListModified(BELIST_REMOVED, 0, 0, binding, effect.bindings);
  effect.OnListModified(BELIST_INSERTED, 0, 0, binding, effect.bindings);
  effect.OnListModified(BELIST_UNLOADSTART, 0, 0, null, effect.controllers);
  assert.ok(calls.some(entry => entry[0] === "controller-unlink"));
  assert.equal(effect.GetBoundingSphere(new Float32Array(4)), false);
  assert.equal(effect.GetLocalBoundingBox(new Float32Array(3), new Float32Array(3)), false);
});


test("EveStretch3 supplies dynamic parameter roots and binding ownership", () =>
{
  const sourceObject = { value: 5 };
  const stretchObject = { value: 0 };
  const binding = new Tr2DynamicBinding();
  binding.sourceObjectPath = "SourceObject";
  binding.sourceObjectAttribute = "value";
  binding.destinationObjectPath = "StretchObject";
  binding.destinationObjectAttribute = "value";
  const stretch = new EveStretch3();
  stretch.sourceObject = sourceObject;
  stretch.stretchObject = stretchObject;
  stretch.dynamicBindings.push(binding);
  stretch.Initialize();
  stretch.UpdateSynchronous({ currentTime: 0 });
  assert.equal(stretchObject.value, 5);
  assert.equal(stretch.GetParameterMap().SourceObject, sourceObject);
});


test("dynamic graph classes live only in maintained human-readable trees", () =>
{
  for (const path of [
    "../src/trinityCore/binding/Tr2DynamicBinding.js",
    "../src/trinityCore/binding/Tr2ExternalParameter.js",
    "../src/trinityCore/binding/TriValueBinding.js",
    "../src/eve/effect/multiEffect/EveMultiEffect.js"
  ])
  {
    assert.equal(existsSync(new URL(path, import.meta.url)), true, path);
  }
  for (const path of [
    "../src/generated/trinityCore/Tr2DynamicBinding.js",
    "../src/generated/trinityCore/Tr2ExternalParameter.js",
    "../src/generated/trinityCore/TriValueBinding.js",
    "../src/generated/eve/effect/EveMultiEffect.js"
  ])
  {
    assert.equal(existsSync(new URL(path, import.meta.url)), false, path);
  }
  assert.equal(CjsSchema.getMethod(Tr2DynamicBinding, "Link")?.impl?.status, "adapted");
  assert.equal(CjsSchema.getMethod(EveMultiEffect, "UpdateAsyncronous")?.impl?.status, "noop");
  assert.equal(CjsSchema.getField(TriValueBinding, "sourceObject")?.io?.persistOnly, true);
  assert.equal(CjsSchema.getField(TriValueBinding, "sourceObject")?.type?.kind, "model");
});
