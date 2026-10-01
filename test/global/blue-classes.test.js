import assert from "node:assert/strict";
import test from "node:test";

import { blue, BlueClasses } from "../../src/global/blue/index.js";
import { CjsSchema } from "../../src/global/schema/index.js";
import * as CcpLog from "../../src/global/logging/ccpLog.js";


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

test("Blue and CjsSchema share registrations in both directions", () =>
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
  blue.classes.RegisterClasses([ { name: "TestCustom", type: Unschemed, createFn: () => made, flags: BlueClasses.Flags.DISABLE_PYTHON_CONSTRUCTION } ]);
  assert.equal(blue.classes.CreateInstanceFromName("TestCustom"), made);
  assert.equal(blue.classes.GetClassRegistration("TestCustom").flags, 1);
  blue.classes.UnregisterClasses([ { name: "TestCustom" } ]);
});

test("all BlueClasses instances share complete factory records without exposing mutable entries", () =>
{
  const first = new BlueClasses();
  const second = new BlueClasses();
  const made = { custom: true };
  const factory = () => made;
  const input = { name: " SharedFactory ", type: Unschemed, createFn: factory, flags: BlueClasses.Flags.DISABLE_PYTHON_CONSTRUCTION };
  first.RegisterClasses([ input ]);
  try
  {
    input.createFn = () => null;
    input.flags = 0;
    const returned = second.GetClassRegistration(" SharedFactory ");
    assert.equal(returned.name, "SharedFactory");
    assert.equal(returned.createFn, factory);
    assert.equal(returned.flags, 1);
    returned.type = null;
    returned.createFn = () => null;
    returned.flags = 123;
    assert.equal(first.GetClassRegistration("SharedFactory").type, Unschemed);
    assert.equal(first.GetClassRegistration("SharedFactory").flags, 1);
    assert.equal(second.CreateInstance("SharedFactory"), made, "flags describe registration; the factory controls construction");
    assert.equal(CjsSchema.GetConstructor(" SharedFactory "), Unschemed);
    assert.equal(second.FindClsid(" SharedFactory "), "SharedFactory");
  }
  finally
  {
    second.UnregisterClasses([ { name: " SharedFactory " } ]);
  }
  assert.equal(first.GetClassRegistration("SharedFactory"), null);
});

test("duplicates through either facade keep the first whole registration and log the duplicate", () =>
{
  const first = new BlueClasses();
  const second = new BlueClasses();
  const messages = [];
  const echo = (channel, severity, userData, message) => { messages.push({ channel: channel.facility, severity, message }); };
  CcpLog.RegisterLogEcho(echo, CcpLog.LogType.LOGTYPE_ERR);
  class Other {}
  const made = {};
  const factory = () => made;
  try
  {
    first.RegisterClasses([ { name: "AtomicFirst", type: Unschemed, createFn: factory, flags: 1 } ]);
    CjsSchema.SetConstructor("AtomicFirst", Other);
    second.RegisterClasses([ { name: "AtomicFirst", type: Other, createFn: () => null, flags: 16 } ]);
    assert.equal(CjsSchema.GetConstructor("AtomicFirst"), Unschemed);
    assert.deepEqual(second.GetClassRegistration("AtomicFirst"), { name: "AtomicFirst", type: Unschemed, createFn: factory, flags: 1 });
    assert.equal(second.CreateInstance("AtomicFirst"), made);

    CjsSchema.SetConstructor("SchemaFirst", Unschemed);
    second.RegisterClasses([ { name: "SchemaFirst", type: Other, createFn: factory, flags: 1 } ]);
    assert.equal(first.GetClassRegistration("SchemaFirst").type, Unschemed);
    assert.equal(first.GetClassRegistration("SchemaFirst").flags, 0);
    assert.equal(Object.getPrototypeOf(first.CreateInstance("SchemaFirst")), Unschemed.prototype);
    assert.equal(messages.length, 3);
    assert.ok(messages.every(entry => entry.channel === "blue" && entry.severity === CcpLog.LogType.LOGTYPE_ERR && /already registered/.test(entry.message)));
  }
  finally
  {
    CcpLog.UnregisterLogEcho(echo);
    first.UnregisterClasses([ { name: "AtomicFirst" }, { name: "SchemaFirst" } ]);
  }
});

test("explicit deletion and schema re-registration discard former factory extras", () =>
{
  const first = new BlueClasses();
  const second = new BlueClasses();
  const oldValue = {};
  class Replacement { value = 7; }
  first.RegisterClasses([ { name: "ReplaceAfterDelete", type: Unschemed, createFn: () => oldValue, flags: 1 } ]);
  assert.equal(CjsSchema.DeleteConstructor(" ReplaceAfterDelete "), true);
  assert.equal(CjsSchema.SetConstructor("ReplaceAfterDelete", Replacement), CjsSchema);
  try
  {
    const registration = second.GetClassRegistration("ReplaceAfterDelete");
    assert.equal(registration.type, Replacement);
    assert.equal(registration.flags, 0);
    const fresh = first.CreateInstance("ReplaceAfterDelete");
    assert.equal(Object.getPrototypeOf(fresh), Replacement.prototype);
    assert.equal(fresh.value, 7);
    assert.notEqual(fresh, oldValue);
  }
  finally
  {
    second.UnregisterClasses([ { name: "ReplaceAfterDelete" } ]);
  }
  assert.equal(CjsSchema.DeleteConstructor("ReplaceAfterDelete"), false);
  assert.equal(CjsSchema.GetConstructor(null), null);
  assert.equal(CjsSchema.DeleteConstructor(" "), false);
});

test("registration revisions refresh schemas and defaults through both facades", () =>
{
  class Holder { reference = null; }
  CjsSchema.define(Holder, {
    className: "RegistrationRevisionHolder",
    fields: { reference: CjsSchema.type.model("LateRegisteredResource") }
  });
  let constructions = 0;
  class Defaults { constructor() { this.value = ++constructions; } }
  CjsSchema.define(Defaults, { className: "RegistrationRevisionDefaults", fields: { value: CjsSchema.type.uint32 } });
  class Resource { static isResource = true; }
  class Ordinary {}
  const registry = new BlueClasses();
  const before = CjsSchema.getSchema(Holder);
  assert.deepEqual(before.children.map(field => field.name), [ "reference" ]);
  assert.deepEqual(before.resources, []);
  assert.equal(CjsSchema.getDefaults(Defaults).value, 1);
  assert.equal(CjsSchema.getDefaults(Defaults).value, 1);
  try
  {
    registry.RegisterClasses([ { name: "LateRegisteredResource", type: Resource } ]);
    const registered = CjsSchema.getSchema(Holder);
    assert.notEqual(registered, before);
    assert.notEqual(registered.members, before.members, "canonical exports observe the shared revision too");
    assert.deepEqual(registered.resources.map(field => field.name), [ "reference" ]);
    assert.deepEqual(registered.children, []);
    assert.equal(CjsSchema.getDefaults(Defaults).value, 2);
    CjsSchema.SetConstructor("LateRegisteredResource", Ordinary);
    assert.equal(CjsSchema.getSchema(Holder), registered, "a rejected duplicate does not mutate the registry revision");
    assert.equal(CjsSchema.getDefaults(Defaults).value, 2);
    CjsSchema.DeleteConstructor("LateRegisteredResource");
    const removed = CjsSchema.getSchema(Holder);
    assert.deepEqual(removed.children.map(field => field.name), [ "reference" ]);
    assert.deepEqual(removed.resources, []);
    assert.equal(CjsSchema.getDefaults(Defaults).value, 3);
    CjsSchema.SetConstructor("LateRegisteredResource", Resource);
    assert.deepEqual(CjsSchema.getSchema(Holder).resources.map(field => field.name), [ "reference" ]);
    assert.equal(CjsSchema.getDefaults(Defaults).value, 4);
    registry.UnregisterClasses([ { name: "LateRegisteredResource" } ]);
    assert.deepEqual(CjsSchema.getSchema(Holder).resources, []);
    assert.equal(CjsSchema.getDefaults(Defaults).value, 5);
  }
  finally
  {
    CjsSchema.DeleteConstructor("LateRegisteredResource");
    CjsSchema.DeleteConstructor("RegistrationRevisionHolder");
    CjsSchema.DeleteConstructor("RegistrationRevisionDefaults");
  }
});

test("canonical and alias collisions resolve independently without erasing sealed metadata", () =>
{
  const registry = new BlueClasses();
  class Original {}
  class Other {}
  class Later { declared = 4; }
  CjsSchema.define(Original, { className: "CanonicalCollision", aliases: [ "OriginalAlias" ] });
  registry.RegisterClasses([ { name: "OccupiedAlias", type: Other } ]);
  CjsSchema.type.define({
    className: "CanonicalCollision", aliases: [ "OccupiedAlias", "AvailableAlias" ], fields: { declared: CjsSchema.type.uint32 }
  })(Later);
  try
  {
    assert.equal(CjsSchema.GetConstructor("CanonicalCollision"), Original);
    assert.equal(CjsSchema.GetConstructor("OriginalAlias"), Original);
    assert.equal(CjsSchema.GetConstructor("OccupiedAlias"), Other);
    assert.equal(CjsSchema.GetConstructor("AvailableAlias"), Later);
    assert.equal(CjsSchema.getSchema(Later).members[0].name, "declared");
    CjsSchema.DeleteConstructor("AvailableAlias");
    assert.equal(CjsSchema.GetConstructor("CanonicalCollision"), Original);
    assert.equal(CjsSchema.GetConstructor("OccupiedAlias"), Other);
    registry.UnregisterClasses([ { name: "CanonicalCollision" } ]);
    assert.equal(CjsSchema.GetConstructor("OriginalAlias"), Original);
    assert.throws(() => CjsSchema.define(Later, { className: "AnotherName" }), /already registered/);
    assert.equal(CjsSchema.getField(Later, "declared").type.kind, "uint32");
    CjsSchema.SetConstructor("CanonicalCollision", Later);
    assert.equal(registry.GetClassRegistration("CanonicalCollision").type, Later);
  }
  finally
  {
    registry.UnregisterClasses([ { name: "CanonicalCollision" }, { name: "OriginalAlias" }, { name: "OccupiedAlias" }, { name: "AvailableAlias" } ]);
  }
});

test("registration uses explicit names without inspecting Function.name and preserves validation", () =>
{
  class HiddenName {}
  Object.defineProperty(HiddenName, "name", { get() { throw new Error("Function.name was read"); } });
  const registry = new BlueClasses();
  assert.throws(() => CjsSchema.SetConstructor(" ", HiddenName), /non-empty name/);
  assert.throws(() => registry.RegisterClasses([ { name: "InvalidConstructor", type: {} } ]), /must be a function/);
  assert.equal(CjsSchema.GetConstructor("InvalidConstructor"), null);
  registry.RegisterClasses([ { name: " StableIdentity ", type: HiddenName } ]);
  try
  {
    assert.equal(CjsSchema.GetConstructor("StableIdentity"), HiddenName);
    assert.equal(Object.getPrototypeOf(registry.CreateInstanceFromName("StableIdentity")), HiddenName.prototype);
  }
  finally
  {
    registry.UnregisterClasses([ { name: "StableIdentity" } ]);
  }
});
