import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { Copier, DictReader, IInitialize, INotify, ISimTimeRebaseNotify } from "../../npm/dist/global/blue/index.js";
import { Traverse } from "../../npm/dist/global/blue/find.js";
import { TriValueBinding, Tr2DynamicBinding, Tr2FloatParameter } from "../../npm/dist/trinity/index.js";
import { ITr2ValueBinding, TriCurveSet, Tr2CurveSetRange } from "../../npm/dist/trinity/curves/index.js";

test("value and dynamic bindings retain exact native bases and query policies", () =>
{
  for (const Type of [TriValueBinding, Tr2DynamicBinding])
  {
    assert.equal(Object.getPrototypeOf(Type.prototype), INotify.prototype);
    assert.equal(CjsSchema.cast(new Type(), IInitialize), null);
    for (const name of ["SetValues", "UpdateValues", "OnEvent", "Traverse", "GetResources"])
      assert.equal(name in new Type(), false, Type.name + "." + name);
  }
  assert.deepEqual([...mappedInterfaces(TriValueBinding)], [TriValueBinding, ITr2ValueBinding, INotify]);
  assert.deepEqual([...mappedInterfaces(Tr2DynamicBinding)], [Tr2DynamicBinding, INotify]);
  const dynamic = new Tr2DynamicBinding();
  assert.equal(CjsSchema.cast(dynamic, ISimTimeRebaseNotify), dynamic);
  assert.equal(mappedInterfaces(Tr2DynamicBinding).has(ISimTimeRebaseNotify), false);
});

test("value binding declarations distinguish persisted storage from live properties", () =>
{
  const info = CjsSchema.getSchema(TriValueBinding);
  assert.deepEqual(info.members.map(field => field.name), ["name", "isWeak", "isEnabled", "sourceObject", "sourceAttribute", "destinationObject", "destinationAttribute", "scale", "offset", "copyValueCallable"]);
  assert.deepEqual(info.properties.map(field => field.name), ["isValid", "sourceObject", "destinationObject"]);
  assert.equal(info.properties[0].edit.read, true);
  assert.notEqual(info.properties[0].edit.write, true);
  for (const name of ["sourceObject", "destinationObject"])
  {
    const stored = info.members.find(field => field.name === name), property = info.properties.find(field => field.name === name);
    assert.equal(stored.key, "_" + name);
    assert.equal(stored.edit.persistOnly, true);
    assert.notEqual(property.edit.persist, true);
    assert.equal(property.edit.write, true);
  }
});

test("dynamic declarations keep weak members and live validity properties in native order", () =>
{
  const info = CjsSchema.getSchema(Tr2DynamicBinding);
  assert.deepEqual(info.members.map(field => field.name), ["name", "destinationObjectPath", "destinationObjectAttribute", "destination", "sourceObjectPath", "sourceObjectAttribute", "source", "scale", "bindingDelay", "binding"]);
  assert.deepEqual(info.properties.map(field => field.name), ["isDestinationValid", "isSourceValid"]);
  for (const name of ["source", "destination"])
  {
    const field = info.members.find(field => field.name === name);
    assert.equal(field.type.kind, "weakRef");
    assert.notEqual(field.edit.persist, true);
  }
  const binding = new Tr2DynamicBinding();
  binding._sourceRef = { deref: () => ({}) };
  assert.equal(binding.isSourceValid, true);
  binding._sourceRef = { deref: () => null };
  assert.equal(binding.isSourceValid, false, "property recomputes lifetime instead of exposing stale cached validity");
  assert.throws(() => { binding.isSourceValid = true; }, TypeError);
});

test("declared value-binding graph copies shared endpoint identity and rebuilds its plan", () =>
{
  const binding = new DictReader({ declarations: true }).CreateObject({
    _type: "TriValueBinding", name: "shared",
    sourceObject: { _type: "Tr2CurveSetRange", _id: "endpoint", startTime: 4, endTime: 0 }, sourceAttribute: "startTime",
    destinationObject: { _ref: "endpoint" }, destinationAttribute: "endTime", scale: 3
  });
  assert.equal(binding.isValid, true);
  assert.throws(() => { binding.isValid = false; }, TypeError);
  const copy = new Copier().CopyTo(binding);
  assert.equal(copy.sourceObject, copy.destinationObject);
  assert.notEqual(copy.sourceObject, binding.sourceObject);
  assert.equal(copy.isValid, true);
  const set = new TriCurveSet();
  set.AddBinding(copy);
  set.ApplyTime(0);
  assert.equal(copy.destinationObject.endTime, 12);
  assert.equal(binding.destinationObject.endTime, 0);
});

test("callback-only value binding keeps native invalidity while copying through its adapter", () =>
{
  const binding = new TriValueBinding(), source = { value: 2 }, destination = { value: 0 };
  binding.SetSource("value", source);
  binding.SetDestination("value", destination);
  binding.copyValueCallable = (from, to) => { to.value = from.value + 1; };
  binding.Initialize();
  assert.equal(binding.isValid, false);
  assert.equal(binding.IsValid(), false);
  assert.equal(binding.CopyValue(), true);
  assert.equal(destination.value, 3);
});

test("dynamic copies retain authored paths but omit owner and weak runtime endpoints", () =>
{
  const dynamic = new Tr2DynamicBinding(), source = new Tr2CurveSetRange(), destination = new Tr2CurveSetRange();
  source.startTime = 5;
  dynamic.sourceObjectPath = "Source";
  dynamic.destinationObjectPath = "Destination";
  dynamic.sourceObjectAttribute = dynamic.destinationObjectAttribute = "startTime";
  dynamic.bindingDelay = 100;
  dynamic.SetOwner({ GetParameterMap: () => ({ Source: source, Destination: destination }) });
  assert.equal(dynamic.Link(10), true);
  assert.equal(dynamic.Update(10.099), false);
  dynamic.OnSimClockRebase(10, 20);
  assert.equal(dynamic.Update(20.099), false);
  assert.equal(dynamic.Update(20.1), true);
  assert.equal(destination.startTime, 5);
  const seen = [];
  Traverse(dynamic, value => seen.push(value));
  assert.equal(seen.includes(source), false, "weak runtime endpoint is not an owned graph edge");
  const copy = new Copier().CopyTo(dynamic);
  assert.equal(copy.sourceObjectPath, "Source");
  assert.equal(copy.bindingDelay, 100);
  assert.equal(copy.source, null);
  assert.equal(copy.destination, null);
  assert.equal(copy.binding, null);
  assert.equal(copy.Link(0), false, "owner is runtime state");
});

test("dynamic installed owner must implement its required parameter-map method", () =>
{
  const dynamic = new Tr2DynamicBinding();
  assert.equal(dynamic.Link(), false);
  dynamic.SetOwner({});
  assert.throws(() => dynamic.Link(), TypeError);
});

test("dynamic installed binding must implement required destination cleanup", () =>
{
  const dynamic = new Tr2DynamicBinding();
  assert.doesNotThrow(() => dynamic.Unlink());
  dynamic.binding = {};
  assert.throws(() => dynamic.Unlink(), TypeError);
});

test("retained reroutable destination must implement required unregister", () =>
{
  const binding = new TriValueBinding();
  binding.SetSource("value", { value: 3 });
  binding.SetDestination("value", { value: 0, RegisterBinding() {}, GetDestination() { return { dest: { value: 0 }, size: 4 }; } });
  binding.Initialize();
  assert.throws(() => binding.Initialize(), TypeError);
});

test("real reroutable parameter detaches when replacing a value-binding destination", () =>
{
  const binding = new TriValueBinding(), parameter = new Tr2FloatParameter();
  let registered = 0, unregistered = 0;
  const register = parameter.RegisterBinding, unregister = parameter.UnregisterBinding;
  parameter.RegisterBinding = function(value) { registered++; return register.call(this, value); };
  parameter.UnregisterBinding = function(value) { unregistered++; return unregister.call(this, value); };
  binding.SetSource("value", { value: 7 });
  binding.SetDestination("value", parameter);
  binding.Initialize();
  assert.equal(registered, 1);
  binding.CopyValue();
  assert.equal(parameter.value, 7);
  binding.SetDestinationObject(null);
  assert.equal(unregistered, 1);
  assert.equal(binding.IsValid(), false);
});
