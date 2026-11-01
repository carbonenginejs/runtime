import assert from "node:assert/strict";
import test from "node:test";
import { IRoot, BlueClasses, ClassInfo } from "../../src/blue/blue/index.js";
import { CjsSchema, blue } from "../../src/blue/schema/index.js";

class RootTestObject extends IRoot
{
  value = 7;
}
CjsSchema.define(RootTestObject, {
  className: "IRootTestObject", fields: { value: { type: "float" } }
});
blue.interface()(RootTestObject);
blue.chainTo(IRoot)(RootTestObject);

class RootTestChild extends RootTestObject {}
blue.interface()(RootTestChild);
blue.chainTo(RootTestObject)(RootTestChild);

const classes = new BlueClasses();

test("IRoot exposes root identity and shared concrete class metadata", () =>
{
  for (const Type of [IRoot, RootTestObject, RootTestChild])
  {
    const value = new Type();
    const info = ClassInfo.exposeToBlue(Type);
    assert.equal(value.ClassType(), info);
    assert.equal(new Type().ClassType(), info);
    assert.notEqual(info, Type);
    assert.equal(value.GetRootObject(), value);
    assert.equal(CjsSchema.cast(value, IRoot), value);
    assert.equal(value.QueryInterface(IRoot), value);
    assert.equal(classes.QueryThisInterface(value, IRoot, value.constructor), value);
    assert.equal(value.QueryInterface(Type), value);
  }
  assert.notEqual(new RootTestObject().ClassType(), new RootTestChild().ClassType());
  assert.equal(new RootTestObject().ClassType().classId, "IRootTestObject");
});

test("instance and service queries honor explicit exposure instead of method inheritance", () =>
{
  class Hidden {}
  class Child extends RootTestObject {}
  blue.interface(IRoot)(Child);
  const value = new Child();
  assert.equal(value.QueryInterface(Child), value);
  assert.equal(value.QueryInterface(IRoot), value);
  assert.equal(value.QueryInterface(RootTestObject, 1), null);
  assert.equal(classes.QueryThisInterface(value, RootTestObject, value.constructor, 1), null);
  assert.equal(value.QueryInterface(Hidden, 1), null);
  assert.equal(classes.QueryThisInterface(value, Hidden, value.constructor, 1), null);
  // Existing classes have not yet migrated to extends IRoot.
  class Legacy {}
  blue.interface()(Legacy);
  const legacy = new Legacy();
  assert.equal(classes.QueryThisInterface(legacy, Legacy, legacy.constructor), legacy);
  assert.equal(classes.QueryThisInterface(legacy, IRoot, legacy.constructor, 1), legacy,
    "EXPOSURE_BEGIN_IMP adds IRoot even when the JS class has no IRoot method inheritance");
});

test("IRoot's reference-counting half is present and refused, and adds no serialized state", () =>
{
  // Carbon's IRoot declares Lock, Unlock, GetFlags, GetRefCount and FinalDelete (BlueTypes.h:483-510); garbage
  // collection replaces the count, so each is not supported and throws rather than pretending (decorator-upgrade § 000).
  const value = new RootTestObject();
  const before = CjsSchema.getValues(value);
  for (const name of ["Lock", "Unlock", "GetRefCount", "GetFlags", "_FinalDelete"])
  {
    assert.equal(typeof value[name], "function", name);
    assert.throws(() => value[name](), /garbage collection/, name);
  }
  assert.deepEqual(Object.keys(value), ["value"]);
  assert.deepEqual(CjsSchema.getValues(value), before);
  CjsSchema.setValues(value, { value: 12 });
  assert.equal(value.value, 12);
  assert.equal(CjsSchema.getField(RootTestObject, "value").name, "value");
});
