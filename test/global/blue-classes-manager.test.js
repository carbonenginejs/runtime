import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../src/global/schema/CjsSchema.js";
import { type } from "../../src/global/schema/index.js";
import { be } from "../../src/global/blue/index.js";

class Effect
{
  name = "";
}
CjsSchema.define(Effect, {
  className: "BlueClassesManagerEffect",
  purpose: "A leaf the manager finds.",
  fields: {
    name: [ CjsSchema.blue.readwrite, CjsSchema.blue.persist, type.string ]
  }
});

class SpecialEffect extends Effect {}
CjsSchema.define(SpecialEffect, { className: "BlueClassesManagerSpecialEffect" });
CjsSchema.blue.chainTo(Effect)(SpecialEffect);

class Holder
{
  name = "";
  persisted = null;
  transient = null;
  items = [];
}
CjsSchema.define(Holder, {
  className: "BlueClassesManagerHolder",
  fields: {
    name: [ CjsSchema.blue.readwrite, CjsSchema.blue.persist, type.string ],
    persisted: [ CjsSchema.blue.readwrite, CjsSchema.blue.persist, type.rootRef("IRoot") ],
    transient: [ CjsSchema.blue.readwrite, type.rootRef("IRoot") ],
    items: [ CjsSchema.blue.read, CjsSchema.blue.persist, type.list("IRoot") ]
  }
});

function make(name, Type = Effect)
{
  const value = new Type();
  value.name = name;
  return value;
}

test("Find walks persisted members only and matches the class or its exposure chain (Find.cpp:147-246)", () =>
{
  const root = make("root", Holder);
  root.persisted = make("persisted");
  root.transient = make("transient");
  root.items = [ make("special", SpecialEffect), make("plain") ];
  const names = be.classes.Find(root, "anymodule.BlueClassesManagerEffect").map(value => value.name).sort();
  assert.deepEqual(names, [ "persisted", "plain", "special" ], "the non-persisted member is not followed");
  assert.deepEqual(be.classes.Find(root, [ "x.BlueClassesManagerSpecialEffect" ]).map(value => value.name), [ "special" ]);
  assert.deepEqual(be.classes.Find(root, "x.BlueClassesManagerEffect", 0), [], "maxLevel 0 inspects only the root");
  assert.deepEqual(be.classes.Find(root, "x.BlueClassesManagerHolder", -1, true), [ root ], "prune stops below a match");
  assert.throws(() => be.classes.Find(root, "NoModule"), /valid class id/);
  assert.throws(() => be.classes.Find(null, "x.Y"), TypeError);
});

test("Copy copies through the existing Copier and reports failures as Carbon does (BlueClasses_Blue.cpp:219-240)", () =>
{
  const source = make("original");
  const copy = be.classes.Copy(source);
  assert.notEqual(copy, source);
  assert.equal(CjsSchema.getClassName(copy.constructor), "BlueClassesManagerEffect");
  assert.equal(copy.name, "original");
  assert.throws(() => be.classes.Copy(null), /Value is not a Blue object/);
});

test("GetTypeInfo returns class, interface, member and method records (TypeInfo.cpp:66-190)", () =>
{
  const [ classInfo, interfaces, members, methods ] = be.classes.GetTypeInfo(make("x", SpecialEffect));
  assert.equal(classInfo.classname, "BlueClassesManagerSpecialEffect");
  assert.equal(classInfo.module, "");
  assert.equal(classInfo.autovar, 0);
  assert.equal(typeof interfaces, "object");
  // Be::EDITFLAGS: READ 0x1 | WRITE 0x2 | PERSIST 0x10.
  assert.equal(members.name.editflags, 0x13);
  assert.equal(members.name.type, "string");
  assert.deepEqual(methods, {});
  assert.throws(() => be.classes.GetTypeInfo(undefined), /Value is not a Blue object/);
});

test("GetClassTypes lists every registration and refuses a module filter it cannot apply", () =>
{
  const types = be.classes.GetClassTypes();
  assert.ok(types.some(([ info ]) => info.classname === "BlueClassesManagerHolder"));
  assert.throws(() => be.classes.GetClassTypes("trinity"), TypeError);
});

test("GetPersistedClassesReport lists persisted members per class, sorted (BlueClasses.cpp:607-669)", () =>
{
  const report = be.classes.GetPersistedClassesReport();
  const at = report.indexOf("BlueClassesManagerHolder:\n");
  assert.ok(at >= 0);
  const section = report.slice(at, report.indexOf("\n", report.indexOf("-   items:", at) + 12) + 1);
  assert.match(section, /-   name:\n    -   string\n/);
  assert.match(section, /-   persisted:\n/);
  assert.doesNotMatch(section, /transient/);
  assert.ok(report.indexOf("BlueClassesManagerEffect:\n") < at, "classes are sorted by name");
});

test("counts and wrappers JavaScript does not keep are refused; pending deletes are a no-op", () =>
{
  for (const name of [ "LiveCount", "LockCount", "GetWrapperList", "LiveList" ])
  {
    assert.throws(() => be.classes[name](), Error, name);
    assert.equal(CjsSchema.getMethod(be.classes.constructor, name).impl.status, "notSupported");
  }
  assert.equal(be.classes.ProcessAllPendingDeletes(), undefined);
  assert.equal(CjsSchema.getMethod(be.classes.constructor, "ProcessAllPendingDeletes").impl.status, "noop");
});
