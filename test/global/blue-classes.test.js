import assert from "node:assert/strict";
import test from "node:test";

import { blue, BlueClasses } from "../../npm/dist/global/blue/index.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";


class Unschemed
{
  value = 1;
}

test("blue.classes is a BlueClasses registry", () =>
{
  assert.equal(blue.classes.constructor, BlueClasses);
});

test("an unregistered class is not found, and creating it yields null", () =>
{
  assert.equal(blue.classes.FindClsid("NoSuchClass"), null);
  assert.equal(blue.classes.GetClassRegistration("NoSuchClass"), null);
  assert.equal(blue.classes.CreateInstanceFromName("NoSuchClass"), null);
});

test("RegisterClasses registers under the explicit name, not type.name", () =>
{
  blue.classes.RegisterClasses([ { name: "TestUnschemed", type: Unschemed } ]);

  const registration = blue.classes.GetClassRegistration("TestUnschemed");
  assert.equal(registration.type, Unschemed);
  assert.equal(registration.name, "TestUnschemed");
  assert.equal(registration.flags, 0);
  assert.equal(blue.classes.FindClsid("TestUnschemed"), "TestUnschemed");
  assert.equal(blue.classes.GetClassRegistration("Unschemed"), null);

  const instance = blue.classes.CreateInstanceFromName("TestUnschemed");
  assert.ok(instance instanceof Unschemed);

  blue.classes.UnregisterClasses([ { name: "TestUnschemed" } ]);
  assert.equal(blue.classes.GetClassRegistration("TestUnschemed"), null);
});

test("the table is CjsSchema's: a schema-defined class is found, and a registration is visible to CjsSchema", () =>
{
  class Schemed {}
  CjsSchema.define(Schemed, { className: "TestSchemed", fields: {} });
  assert.equal(blue.classes.GetClassRegistration("TestSchemed").type, Schemed);

  blue.classes.RegisterClasses([ { name: "TestUnschemed2", type: Unschemed } ]);
  assert.equal(CjsSchema.GetConstructor("TestUnschemed2"), Unschemed);
  blue.classes.UnregisterClasses([ { name: "TestUnschemed2" } ]);
});

test("a second registration under a taken name keeps the first (BlueClasses.cpp:272-276)", () =>
{
  class Other {}
  blue.classes.RegisterClasses([ { name: "TestFirst", type: Unschemed } ]);
  blue.classes.RegisterClasses([ { name: "TestFirst", type: Other } ]);
  assert.equal(blue.classes.GetClassRegistration("TestFirst").type, Unschemed);
  blue.classes.UnregisterClasses([ { name: "TestFirst" } ]);
});

test("a custom createFn and flags are kept", () =>
{
  const made = { made: true };
  blue.classes.RegisterClasses([ { name: "TestCustom", type: Unschemed, createFn: () => made, flags: BlueClasses.flags.DISABLE_PYTHON_CONSTRUCTION } ]);
  assert.equal(blue.classes.CreateInstanceFromName("TestCustom"), made);
  assert.equal(blue.classes.GetClassRegistration("TestCustom").flags, 1);
  blue.classes.UnregisterClasses([ { name: "TestCustom" } ]);
});
