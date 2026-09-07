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

test("CjsSchema.from resolves the class, applies values, and calls a class-owned Initialize", () =>
{
  const built = CjsSchema.from("Tr2ControllerFloatVariable", { name: "built" });
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
  const probe = CjsSchema.from("ProbeFromTarget", { name: "p" });
  assert.equal(probe.name, "p");
  assert.deepEqual(order, [ "SetValues", "Initialize" ], "populate first, Initialize once at the end");

  assert.throws(() => CjsSchema.from("NoSuchRegisteredClass", {}), /no class registered/);
});

test("a plain decorated class without a setter goes through the state-free transport", () =>
{
  // This used to assert a placeholder throw naming the facade migration. The
  // transport landed 2026-09-08, so the third arm answers instead.
  class Plain { n = 0; }
  CjsSchema.define(Plain, { className: "PlainStateFreeProbe" });
  CjsSchema.defineField(Plain, "n", "type", { kind: "int32" });

  const plain = new Plain();
  assert.equal(typeof plain.SetValues, "undefined", "the class carries neither method");
  assert.deepEqual([ ...CjsSchema.setValues(plain, { n: 7 }) ], [ "n" ]);
  assert.equal(plain.n, 7);
  assert.deepEqual(CjsSchema.getValues(plain), { n: 7 });

  // An undeclared object has no fields, so it exports empty and changes nothing
  // rather than throwing - there is nothing to refuse.
  assert.deepEqual(CjsSchema.getValues({}), {});
});
