import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { Copier, DictReader, IInitialize, INotify } from "../../npm/dist/global/blue/index.js";
import { Traverse } from "../../npm/dist/global/blue/find.js";
import { GetResources } from "../../npm/dist/global/blue/getResources.js";
import { Tr2BindingVector3, Tr2PyValueBinding, Tr2ExternalParameter } from "../../npm/dist/trinity/index.js";
import { TriCurveSet, ITr2ValueBinding } from "../../npm/dist/trinity/curves/index.js";

test("binding records expose exact native nominal bases and query order", () =>
{
  assert.equal(Object.getPrototypeOf(Tr2BindingVector3.prototype), Object.prototype);
  assert.equal(Object.getPrototypeOf(Tr2PyValueBinding.prototype), INotify.prototype);
  assert.equal(Object.getPrototypeOf(Tr2ExternalParameter.prototype), IInitialize.prototype);
  assert.deepEqual([...mappedInterfaces(Tr2BindingVector3)], [Tr2BindingVector3]);
  assert.deepEqual([...mappedInterfaces(Tr2PyValueBinding)], [Tr2PyValueBinding, ITr2ValueBinding, INotify]);
  assert.deepEqual([...mappedInterfaces(Tr2ExternalParameter)], [Tr2ExternalParameter, IInitialize, INotify]);
  assert.equal(CjsSchema.cast(new Tr2PyValueBinding(), IInitialize), null);
  for (const Type of [Tr2BindingVector3, Tr2PyValueBinding, Tr2ExternalParameter])
    for (const method of ["SetValues", "UpdateValues", "OnEvent", "Traverse", "GetResources"])
      assert.equal(method in new Type(), false, Type.name + "." + method);
});

test("binding declarations preserve native order and Python endpoints do not persist", () =>
{
  const members = CjsSchema.getSchema(Tr2PyValueBinding).members;
  assert.deepEqual(members.map(field => field.name), ["name", "isValid", "sourceObject", "sourceAttribute", "destinationObject", "destinationAttribute"]);
  for (const field of members)
  {
    assert.equal(field.edit.read, true, field.name);
    assert.equal(field.edit.write === true, field.name !== "isValid", field.name);
    assert.equal(field.edit.persist === true, ["name", "sourceAttribute", "destinationAttribute"].includes(field.name), field.name);
    assert.equal(field.edit.notify === true, ["sourceObject", "sourceAttribute", "destinationObject", "destinationAttribute"].includes(field.name), field.name);
  }
  const external = CjsSchema.getSchema(Tr2ExternalParameter).members;
  assert.deepEqual(external.map(field => field.name), ["name", "destinationObject", "destinationAttribute", "valid"]);
  assert.equal(external[1].type.kind, "objectRef");
  assert.equal(external[1].edit.persist, true);
  assert.equal(external[1].edit.notify, true);
  const vector = CjsSchema.getSchema(Tr2BindingVector3).members;
  assert.deepEqual(vector.map(field => field.name), ["value"]);
  assert.equal(vector[0].type.kind, "vec3");
  assert.equal(vector[0].edit.persist, true);
});

test("declared reader and Copier preserve independent vector storage", () =>
{
  const vector = new DictReader({ declarations: true }).CreateObject({ _type: "Tr2BindingVector3", value: [2, 4, 6] });
  const copy = new Copier().CopyTo(vector);
  assert.deepEqual(Array.from(copy.value), [2, 4, 6]);
  assert.notEqual(copy.value, vector.value);
  copy.value[0] = 9;
  assert.equal(vector.value[0], 2);
  assert.deepEqual(GetResources(copy), []);
});

test("Python binding notification and real curve-set admission preserve attribute copying", () =>
{
  const binding = new Tr2PyValueBinding(), source = { value: 7 }, destination = { value: 0 };
  binding.sourceObject = source;
  binding.destinationObject = destination;
  binding.sourceAttribute = binding.destinationAttribute = "value";
  assert.equal(binding.OnModified("sourceAttribute"), true);
  assert.equal(binding.isValid, true);
  const set = new TriCurveSet();
  set.AddBinding(binding);
  assert.equal(set.bindings[0], binding);
  set.Play();
  set.UpdateAt(0);
  assert.equal(destination.value, 7);
  source.value = 11;
  set.UpdateAt(1);
  assert.equal(destination.value, 11);
  binding.sourceAttribute = "missing";
  binding.OnModified("sourceAttribute");
  assert.equal(binding.isValid, true, "native validation only checks the attribute name is nonempty");
  binding.CopyValue();
  assert.equal(destination.value, 11);
});

test("Python binding copy retains authored names while omitting live object endpoints", () =>
{
  const binding = new Tr2PyValueBinding();
  binding.name = "live";
  binding.sourceAttribute = "a";
  binding.destinationAttribute = "b";
  binding.sourceObject = { a: 3 };
  binding.destinationObject = { b: 0 };
  binding.Initialize();
  const copy = new Copier().CopyTo(binding);
  assert.equal(copy.name, "live");
  assert.equal(copy.sourceAttribute, "a");
  assert.equal(copy.destinationAttribute, "b");
  assert.equal(copy.sourceObject, null);
  assert.equal(copy.destinationObject, null);
  assert.equal(copy.isValid, false);
});

test("external declared reader and Copier resolve each copied destination graph", () =>
{
  const external = new DictReader({ declarations: true }).CreateObject({
    _type: "Tr2ExternalParameter", name: "position", destinationAttribute: "value.y",
    destinationObject: { _type: "Tr2BindingVector3", value: [1, 2, 3] }
  });
  assert.equal(external.IsValid(), true);
  assert.equal(external.GetValue(), 2);
  const copy = new Copier().CopyTo(external);
  assert.equal(copy.IsValid(), true);
  assert.notEqual(copy.destinationObject, external.destinationObject);
  assert.equal(copy.SetValue(8), true);
  assert.equal(copy.GetValue(), 8);
  assert.equal(external.GetValue(), 2);
  const seen = [];
  Traverse(copy, value => seen.push(value));
  assert.equal(seen.includes(copy.destinationObject), true);
  assert.deepEqual(GetResources(copy), []);
});

test("external setters retain eager invalidation and portable normalization", () =>
{
  const external = new Tr2ExternalParameter(), vector = new Tr2BindingVector3();
  vector.value.set([3, 4, 5]);
  external.SetName(null);
  assert.equal(external.GetName(), "");
  external.SetName(7);
  assert.equal(external.GetName(), "7");
  assert.equal(CjsSchema.getMethod(Tr2ExternalParameter, "SetName").impl.status, "adapted");
  external.SetDestinationObject(vector);
  external.SetDestinationAttribute("value");
  const snapshot = external.GetValue();
  snapshot[0] = 99;
  assert.equal(vector.value[0], 3);
  external.SetDestinationAttribute("missing");
  assert.equal(external.IsValid(), false);
  assert.equal(external.GetDestinationEntry(), null);
  assert.throws(() => external.GetValue(), /invalid binding/);
  external.SetDestinationAttribute("value.z");
  assert.equal(external.GetValue(), 5);
  assert.throws(() => external.SetValue("bad"), /float value expected/);
  external.SetDestinationObject(undefined);
  assert.equal(external.destinationObject, null);
  assert.equal(external.IsValid(), false);
});

test("external notifications preserve the existing portable destination adapter", () =>
{
  for (const method of ["UpdateValues", "OnValueChanged", "OnModified"])
  {
    const calls = [], target = { value: 1, [method]: (...args) => calls.push(args) };
    const external = new Tr2ExternalParameter();
    external.SetDestinationObject(target);
    external.SetDestinationAttribute("value");
    external.SetValue(1);
    external.SetValue(6);
    assert.equal(target.value, 6);
    assert.equal(calls.length, 2);
    if (method === "UpdateValues") assert.deepEqual(calls[1], [{ property: "value", source: external }]);
    else if (method === "OnValueChanged") assert.deepEqual(calls[1], ["value", 6, external]);
    else assert.deepEqual(calls[1], ["value"]);
  }
});
