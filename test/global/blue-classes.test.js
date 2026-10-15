import assert from "node:assert/strict";
import test from "node:test";

import { be, CjsBlueClasses } from "../../src/global/blue/index.js";
import { CjsSchema, type } from "../../src/global/schema/index.js";
import * as CcpLog from "../../src/global/logging/ccpLog.js";
import * as classRegistry from "../../src/global/blue/classes/registry.js";

const { ClassRegistrarNullFactory, getClassRegistrationRevision } = classRegistry;


class Unschemed
{
  value = 1;
}

test("flag-only and nullish factory registrations preserve ordinary construction", () =>
{
  let constructions = 0;
  class FlagOnly { constructor() { constructions++; } }
  const names = ["FlagOnlyOmittedFactory", "FlagOnlyNullFactory", "FlagOnlyUndefinedFactory"];
  be.classes.RegisterClasses([
    {name: names[0], type: FlagOnly, flags: 1},
    {name: names[1], type: FlagOnly, createFn: null, flags: 1},
    {name: names[2], type: FlagOnly, createFn: undefined, flags: 1},
  ]);
  try
  {
    for (const name of names)
    {
      assert.equal(be.classes.GetClassRegistration(name).flags, 1);
      assert.notStrictEqual(be.classes.GetClassRegistration(name).createFn, ClassRegistrarNullFactory);
      assert.strictEqual(Object.getPrototypeOf(be.classes.CreateInstance(name)), FlagOnly.prototype);
    }
    assert.equal(constructions, 3);
  }
  finally { be.classes.UnregisterClasses(names.map(name => ({name}))); }
});

test("abstract definitions preserve distinct existing canonical and alias factories atomically", () =>
{
  class ExistingCanonical {}
  class ExistingAlias {}
  let abstractConstructions = 0;
  class Abstract { constructor() { abstractConstructions++; } }
  const canonicalResult = {canonical: true};
  const aliasResult = {alias: true};
  const canonical = {name: "AbstractOccupiedCanonical", type: ExistingCanonical, createFn: () => canonicalResult, flags: 8};
  const alias = {name: "AbstractOccupiedAlias", type: ExistingAlias, createFn: () => aliasResult, flags: 16};
  be.classes.RegisterClasses([canonical, alias]);
  const before = getClassRegistrationRevision();
  CjsSchema.define(Abstract, {
    className: canonical.name, abstract: true, aliases: [alias.name, "AbstractFreeAlias"],
  });
  try
  {
    assert.equal(getClassRegistrationRevision(), before + 1, "only the free alias changes revision");
    assert.deepEqual(be.classes.GetClassRegistration(canonical.name), canonical);
    assert.deepEqual(be.classes.GetClassRegistration(alias.name), alias);
    assert.strictEqual(be.classes.CreateInstance(canonical.name), canonicalResult);
    assert.strictEqual(be.classes.CreateInstance(alias.name), aliasResult);
    assert.equal(be.classes.CreateInstance("AbstractFreeAlias"), null);
    assert.equal(abstractConstructions, 0);
    assert.equal(CjsSchema.getSchema(Abstract).abstract, true, "own declaration does not overwrite a pre-existing name's policy");
    assert.strictEqual(CjsSchema.getConstructor(canonical.name), ExistingCanonical);
    assert.strictEqual(CjsSchema.getConstructor(alias.name), ExistingAlias);
    assert.deepEqual(be.classes.GetClassRegistration("AbstractFreeAlias"), {
      name: "AbstractFreeAlias", type: Abstract, createFn: ClassRegistrarNullFactory, flags: 1,
    });
    be.classes.RegisterClasses([{name: "AbstractFreeAlias", type: ExistingAlias, createFn: alias.createFn, flags: 16}]);
    assert.equal(getClassRegistrationRevision(), before + 1);
    assert.equal(be.classes.CreateInstance("AbstractFreeAlias"), null);
    CjsSchema.deleteConstructor(canonical.name);
    assert.strictEqual(CjsSchema.getConstructor(alias.name), ExistingAlias);
    assert.equal(be.classes.CreateInstance("AbstractFreeAlias"), null);
  }
  finally
  {
    be.classes.UnregisterClasses([canonical, alias, {name: "AbstractFreeAlias"}]);
  }
});

test("independent aliases of an abstract type keep their explicitly selected factories", () =>
{
  let constructions = 0;
  class Abstract { constructor() { constructions++; } }
  CjsSchema.define(Abstract, {className: "AbstractFactoryIdentity", aliases: ["AbstractDefinitionAlias"], abstract: true});
  const made = {};
  const factory = () => made;
  be.classes.RegisterClasses([{name: "AbstractCustomAlias", type: Abstract, createFn: factory, flags: 1}]);
  CjsSchema.setConstructor("AbstractPlainAlias", Abstract);
  try
  {
    assert.equal(be.classes.CreateInstance("AbstractFactoryIdentity"), null);
    assert.equal(be.classes.CreateInstance("AbstractDefinitionAlias"), null);
    assert.strictEqual(be.classes.GetClassRegistration("AbstractCustomAlias").createFn, factory);
    assert.strictEqual(be.classes.CreateInstance("AbstractCustomAlias"), made);
    assert.equal(constructions, 0);
    assert.strictEqual(Object.getPrototypeOf(be.classes.CreateInstance("AbstractPlainAlias")), Abstract.prototype);
    assert.equal(constructions, 1);
    assert.equal(CjsSchema.getSchema(Abstract).abstract, true);
    CjsSchema.deleteConstructor("AbstractDefinitionAlias");
    assert.equal(be.classes.CreateInstance("AbstractFactoryIdentity"), null);
    assert.strictEqual(be.classes.CreateInstance("AbstractCustomAlias"), made);
  }
  finally
  {
    be.classes.UnregisterClasses(["AbstractFactoryIdentity", "AbstractDefinitionAlias", "AbstractCustomAlias", "AbstractPlainAlias"].map(name => ({name})));
  }
});

test("blue.classes is a CjsBlueClasses registry", () =>
{
  assert.equal(be.classes.constructor, CjsBlueClasses);
});

test("an unregistered class is not found, and creating it yields null", () =>
{
  assert.equal(be.classes.FindClsid("NoSuchClass"), null);
  assert.equal(be.classes.GetClassRegistration("NoSuchClass"), null);
  assert.equal(be.classes.CreateInstanceFromName("NoSuchClass"), null);
});

test("RegisterClasses registers under the explicit name, not type.name", () =>
{
  be.classes.RegisterClasses([ { name: "TestUnschemed", type: Unschemed } ]);

  const registration = be.classes.GetClassRegistration("TestUnschemed");
  assert.equal(registration.type, Unschemed);
  assert.equal(registration.name, "TestUnschemed");
  assert.equal(registration.flags, 0);
  assert.equal(be.classes.FindClsid("TestUnschemed"), "TestUnschemed");
  assert.equal(be.classes.GetClassRegistration("Unschemed"), null);

  const instance = be.classes.CreateInstanceFromName("TestUnschemed");
  assert.ok(instance instanceof Unschemed);

  be.classes.UnregisterClasses([ { name: "TestUnschemed" } ]);
  assert.equal(be.classes.GetClassRegistration("TestUnschemed"), null);
});

test("Blue and CjsSchema share registrations in both directions", () =>
{
  class Schemed {}
  CjsSchema.define(Schemed, { className: "TestSchemed", fields: {} });
  assert.equal(be.classes.GetClassRegistration("TestSchemed").type, Schemed);

  be.classes.RegisterClasses([ { name: "TestUnschemed2", type: Unschemed } ]);
  assert.equal(CjsSchema.getConstructor("TestUnschemed2"), Unschemed);
  be.classes.UnregisterClasses([ { name: "TestUnschemed2" } ]);
});

test("a second registration under a taken name keeps the first (BlueClasses.cpp:272-276)", () =>
{
  class Other {}
  be.classes.RegisterClasses([ { name: "TestFirst", type: Unschemed } ]);
  be.classes.RegisterClasses([ { name: "TestFirst", type: Other } ]);
  assert.equal(be.classes.GetClassRegistration("TestFirst").type, Unschemed);
  be.classes.UnregisterClasses([ { name: "TestFirst" } ]);
});

test("a custom createFn and flags are kept", () =>
{
  const made = { made: true };
  be.classes.RegisterClasses([ { name: "TestCustom", type: Unschemed, createFn: () => made, flags: CjsBlueClasses.Flags.DISABLE_PYTHON_CONSTRUCTION } ]);
  assert.equal(be.classes.CreateInstanceFromName("TestCustom"), made);
  assert.equal(be.classes.GetClassRegistration("TestCustom").flags, 1);
  be.classes.UnregisterClasses([ { name: "TestCustom" } ]);
});

test("all CjsBlueClasses instances share complete factory records without exposing mutable entries", () =>
{
  const first = new CjsBlueClasses();
  const second = new CjsBlueClasses();
  const made = { custom: true };
  const factory = () => made;
  const input = { name: " SharedFactory ", type: Unschemed, createFn: factory, flags: CjsBlueClasses.Flags.DISABLE_PYTHON_CONSTRUCTION };
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
    assert.equal(CjsSchema.getConstructor(" SharedFactory "), Unschemed);
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
  const first = new CjsBlueClasses();
  const second = new CjsBlueClasses();
  const messages = [];
  const echo = (channel, severity, userData, message) => { messages.push({ channel: channel.facility, severity, message }); };
  CcpLog.RegisterLogEcho(echo, CcpLog.LogType.LOGTYPE_ERR);
  class Other {}
  const made = {};
  const factory = () => made;
  try
  {
    first.RegisterClasses([ { name: "AtomicFirst", type: Unschemed, createFn: factory, flags: 1 } ]);
    CjsSchema.setConstructor("AtomicFirst", Other);
    second.RegisterClasses([ { name: "AtomicFirst", type: Other, createFn: () => null, flags: 16 } ]);
    assert.equal(CjsSchema.getConstructor("AtomicFirst"), Unschemed);
    assert.deepEqual(second.GetClassRegistration("AtomicFirst"), { name: "AtomicFirst", type: Unschemed, createFn: factory, flags: 1 });
    assert.equal(second.CreateInstance("AtomicFirst"), made);

    CjsSchema.setConstructor("SchemaFirst", Unschemed);
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
  const first = new CjsBlueClasses();
  const second = new CjsBlueClasses();
  const oldValue = {};
  class Replacement { value = 7; }
  first.RegisterClasses([ { name: "ReplaceAfterDelete", type: Unschemed, createFn: () => oldValue, flags: 1 } ]);
  assert.equal(CjsSchema.deleteConstructor(" ReplaceAfterDelete "), true);
  assert.equal(CjsSchema.setConstructor("ReplaceAfterDelete", Replacement), CjsSchema);
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
  assert.equal(CjsSchema.deleteConstructor("ReplaceAfterDelete"), false);
  assert.equal(CjsSchema.getConstructor(null), null);
  assert.equal(CjsSchema.deleteConstructor(" "), false);
});

test("registration revisions refresh schemas through both facades; defaults are built once", () =>
{
  class Holder { reference = null; }
  CjsSchema.define(Holder, {
    className: "RegistrationRevisionHolder",
    fields: { reference: type.rootRef("LateRegisteredResource") }
  });
  let constructions = 0;
  class Defaults { constructor() { this.value = ++constructions; } }
  CjsSchema.define(Defaults, { className: "RegistrationRevisionDefaults", fields: { value: type.uint32 } });
  class Resource { static isResource = true; }
  class Ordinary {}
  const registry = new CjsBlueClasses();
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
    assert.equal(CjsSchema.getDefaults(Defaults).value, 1, "defaults come from one pristine instance, never rebuilt");
    CjsSchema.setConstructor("LateRegisteredResource", Ordinary);
    assert.equal(CjsSchema.getSchema(Holder), registered, "a rejected duplicate does not mutate the registry revision");
    assert.equal(CjsSchema.getDefaults(Defaults).value, 1);
    CjsSchema.deleteConstructor("LateRegisteredResource");
    const removed = CjsSchema.getSchema(Holder);
    assert.deepEqual(removed.children.map(field => field.name), [ "reference" ]);
    assert.deepEqual(removed.resources, []);
    assert.equal(CjsSchema.getDefaults(Defaults).value, 1);
    CjsSchema.setConstructor("LateRegisteredResource", Resource);
    assert.deepEqual(CjsSchema.getSchema(Holder).resources.map(field => field.name), [ "reference" ]);
    assert.equal(CjsSchema.getDefaults(Defaults).value, 1);
    registry.UnregisterClasses([ { name: "LateRegisteredResource" } ]);
    assert.deepEqual(CjsSchema.getSchema(Holder).resources, []);
    assert.equal(CjsSchema.getDefaults(Defaults).value, 1);
    assert.equal(constructions, 1);
  }
  finally
  {
    CjsSchema.deleteConstructor("LateRegisteredResource");
    CjsSchema.deleteConstructor("RegistrationRevisionHolder");
    CjsSchema.deleteConstructor("RegistrationRevisionDefaults");
  }
});

test("canonical and alias collisions resolve independently without erasing sealed metadata", () =>
{
  const registry = new CjsBlueClasses();
  class Original {}
  class Other {}
  class Later { declared = 4; }
  CjsSchema.define(Original, { className: "CanonicalCollision", aliases: [ "OriginalAlias" ] });
  registry.RegisterClasses([ { name: "OccupiedAlias", type: Other } ]);
  CjsSchema.meta.define({
    className: "CanonicalCollision", aliases: [ "OccupiedAlias", "AvailableAlias" ], fields: { declared: type.uint32 }
  })(Later);
  try
  {
    assert.equal(CjsSchema.getConstructor("CanonicalCollision"), Original);
    assert.equal(CjsSchema.getConstructor("OriginalAlias"), Original);
    assert.equal(CjsSchema.getConstructor("OccupiedAlias"), Other);
    assert.equal(CjsSchema.getConstructor("AvailableAlias"), Later);
    assert.equal(CjsSchema.getSchema(Later).members[0].name, "declared");
    CjsSchema.deleteConstructor("AvailableAlias");
    assert.equal(CjsSchema.getConstructor("CanonicalCollision"), Original);
    assert.equal(CjsSchema.getConstructor("OccupiedAlias"), Other);
    registry.UnregisterClasses([ { name: "CanonicalCollision" } ]);
    assert.equal(CjsSchema.getConstructor("OriginalAlias"), Original);
    assert.throws(() => CjsSchema.define(Later, { className: "AnotherName" }), /already registered/);
    assert.equal(CjsSchema.getField(Later, "declared").type.kind, "uint32");
    CjsSchema.setConstructor("CanonicalCollision", Later);
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
  const registry = new CjsBlueClasses();
  assert.throws(() => CjsSchema.setConstructor(" ", HiddenName), /non-empty name/);
  assert.throws(() => registry.RegisterClasses([ { name: "InvalidConstructor", type: {} } ]), /must be a function/);
  assert.equal(CjsSchema.getConstructor("InvalidConstructor"), null);
  registry.RegisterClasses([ { name: " StableIdentity ", type: HiddenName } ]);
  try
  {
    assert.equal(CjsSchema.getConstructor("StableIdentity"), HiddenName);
    assert.equal(Object.getPrototypeOf(registry.CreateInstanceFromName("StableIdentity")), HiddenName.prototype);
  }
  finally
  {
    registry.UnregisterClasses([ { name: "StableIdentity" } ]);
  }
});


test("QueryThisInterface walks the exposure table and chain, logging a miss unless silent", (t) =>
{
  class IThing {}
  CjsSchema.define(IThing, { className: "IThing" });
  class Parent {}
  CjsSchema.define(Parent, { className: "QtiParent" });
  CjsSchema.blue.interface(IThing)(Parent);
  class Child extends Parent {}
  CjsSchema.define(Child, { className: "QtiChild" });
  CjsSchema.blue.interface()(Child);
  CjsSchema.blue.chainTo(Parent)(Child);
  class Unrelated {}
  CjsSchema.define(Unrelated, { className: "QtiUnrelated" });

  const errors = [];
  const sink = (_channel, _type, _userData, message) => errors.push(message);
  CcpLog.UnregisterLogEcho(CcpLog.LogToDebugger);
  CcpLog.RegisterLogEcho(sink, CcpLog.LogType.LOGTYPE_ERR);
  t.after(() =>
  {
    CcpLog.UnregisterLogEcho(sink);
    CcpLog.RegisterLogEcho(CcpLog.LogToDebugger);
  });

  const classes = new CjsBlueClasses();
  const child = new Child();
  assert.equal(classes.QueryThisInterface(child, Child), child);
  assert.equal(classes.QueryThisInterface(child, Parent), child);
  assert.equal(classes.QueryThisInterface(child, IThing), child);
  assert.deepEqual(errors, []);

  assert.equal(classes.QueryThisInterface(child, Unrelated, CjsBlueClasses.BLUEQIOPT.BEQI_SILENT), null);
  assert.deepEqual(errors, []);
  assert.equal(classes.QueryThisInterface(child, Unrelated), null);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /Interface QtiUnrelated not found on class QtiChild/);
});
