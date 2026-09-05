import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema } from "../../../npm/dist/global/schema/index.js";
import "../../../npm/dist/global/model/index.js";
import { Tr2ControllerFloatVariable } from "../../../npm/dist/trinity/index.js";

test("CjsSchema.setValues and getValues are the model transport, called through the schema", () =>
{
  const variable = new Tr2ControllerFloatVariable();
  const changed = CjsSchema.setValues(variable, { name: "throttle" });
  assert.equal(variable.name, "throttle");
  assert.ok(changed instanceof Set && changed.has("name"));

  const values = CjsSchema.getValues(variable);
  assert.equal(values.name, "throttle");

  // Parity with the instance shortcuts - same implementation, one home.
  const twin = new Tr2ControllerFloatVariable();
  twin.SetValues({ name: "throttle" });
  assert.deepEqual(CjsSchema.getValues(twin), values);
});

test("CjsSchema.From resolves the class, applies values, and calls a class-owned Initialize", () =>
{
  const built = CjsSchema.From("Tr2ControllerFloatVariable", { name: "built" });
  assert.ok(built instanceof Tr2ControllerFloatVariable);
  assert.equal(built.name, "built");

  const order = [];
  class ProbeFromTarget
  {
    name = "";
    SetValues(values)
    {
      order.push("SetValues");
      Object.assign(this, values);
      return true;
    }
    Initialize()
    {
      order.push("Initialize");
    }
  }
  CjsSchema.SetConstructor("ProbeFromTarget", ProbeFromTarget);
  const probe = CjsSchema.From("ProbeFromTarget", { name: "p" });
  assert.equal(probe.name, "p");
  assert.deepEqual(order, [ "SetValues", "Initialize" ], "populate first, Initialize once at the end");

  assert.throws(() => CjsSchema.From("NoSuchRegisteredClass", {}), /no class registered/);
});

test("a plain decorated class without a setter says what it is waiting for", () =>
{
  assert.throws(() => CjsSchema.setValues({}, { a: 1 }), /facade migration/);
  assert.throws(() => CjsSchema.getValues({}), /facade migration/);
});
