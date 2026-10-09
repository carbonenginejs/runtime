import assert from "node:assert/strict";
import test from "node:test";
import { IRoot, CjsBlueClasses } from "../../src/global/blue/index.js";
import { CjsSchema, meta } from "../../src/global/schema/index.js";

class RootTestObject extends IRoot
{
  value = 7;
}
CjsSchema.define(RootTestObject, {
  className: "IRootTestObject", fields: { value: { type: "float" } }
});
meta.blue.interface()(RootTestObject);
meta.blue.chainTo(IRoot)(RootTestObject);

class RootTestChild extends RootTestObject {}
meta.blue.interface()(RootTestChild);
meta.blue.chainTo(RootTestObject)(RootTestChild);

const classes = new CjsBlueClasses();

test("IRoot exposes root identity and the actual derived class type", () =>
{
  for (const Type of [IRoot, RootTestObject, RootTestChild])
  {
    const value = new Type();
    assert.equal(value.ClassType(), Type);
    assert.equal(value.GetRootObject(), value);
    assert.equal(CjsSchema.cast(value, IRoot), value);
    assert.equal(value.QueryInterface(IRoot), value);
    assert.equal(classes.QueryThisInterface(value, IRoot), value);
    assert.equal(value.QueryInterface(Type), value);
  }
});

test("instance and service queries honor explicit exposure instead of method inheritance", () =>
{
  class Hidden {}
  class Child extends RootTestObject {}
  meta.blue.interface(IRoot)(Child);
  const value = new Child();
  assert.equal(value.QueryInterface(Child), value);
  assert.equal(value.QueryInterface(IRoot), value);
  assert.equal(value.QueryInterface(RootTestObject, 1), null);
  assert.equal(classes.QueryThisInterface(value, RootTestObject, 1), null);
  assert.equal(value.QueryInterface(Hidden, 1), null);
  assert.equal(classes.QueryThisInterface(value, Hidden, 1), null);
  // Existing classes have not yet migrated to extends IRoot.
  class Legacy {}
  meta.blue.interface()(Legacy);
  const legacy = new Legacy();
  assert.equal(classes.QueryThisInterface(legacy, Legacy), legacy);
  assert.equal(classes.QueryThisInterface(legacy, IRoot, 1), null);
});

test("GC lifetime adaptation adds no state and does not alter values", () =>
{
  const value = new RootTestObject();
  const before = CjsSchema.getValues(value);
  value.Lock();
  value.Unlock();
  assert.equal(value.GetRefCount(), 0);
  assert.equal(value.GetFlags(), 0);
  assert.deepEqual(Object.keys(value), ["value"]);
  assert.deepEqual(CjsSchema.getValues(value), before);
  CjsSchema.setValues(value, { value: 12 });
  assert.equal(value.value, 12);
  assert.equal(CjsSchema.getField(RootTestObject, "value").name, "value");
});
