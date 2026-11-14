import assert from "node:assert/strict";
import { test } from "node:test";
import { ImportDist } from "../support/allDistClasses.js";

// ClassInfo is compiled once per class at registration (blue/schema/compileClassInfo.js), into the object the
// registration carries. A late chain or interface recompiles into that same object, and an enum named by a
// member resolves on first read, as it may register after the class.

const { CjsSchema, type } = await ImportDist("blue/schema/index.js");
const { exposure: be } = await ImportDist("blue/exposure/be.js");
const { getClassRegistration } = await ImportDist("blue/exposure/classes/registry.js");
const { ClassInfo, blue } = await ImportDist("blue/index.js");
const { EDITFLAGS } = await ImportDist("global/consts/blue.js");

test("the registration carries the class's ClassInfo, compiled at define", () =>
{
  class CompiledProbe
  {
    speed = 0;
  }
  CjsSchema.decorateField(CompiledProbe, "speed", be.mapAttribute(be.READWRITE | be.PERSIST), type.float32);
  be.define("CompiledProbe")(CompiledProbe);

  const registration = getClassRegistration("CompiledProbe");
  assert.equal(registration.classInfo, ClassInfo.exposeToBlue(CompiledProbe));
  assert.equal(registration.classInfo, blue.classes.GetInfo("CompiledProbe"));
  assert.deepEqual(registration.classInfo.memberTable.map(row => row.name), [ "speed" ]);
  assert.equal(registration.classInfo.memberTable[0].editFlags, EDITFLAGS.READWRITE | EDITFLAGS.PERSIST);
});

test("a late chain and interface recompile into the ClassInfo already held", () =>
{
  class LateChainBase
  {
    size = 0;
  }
  CjsSchema.decorateField(LateChainBase, "size", be.mapAttribute(be.READWRITE | be.PERSIST), type.float32);
  be.define("LateChainBase")(LateChainBase);

  class LateChainChild
  {
    name = "";
  }
  CjsSchema.decorateField(LateChainChild, "name", be.mapAttribute(be.READWRITE | be.PERSIST), type.string);
  be.define("LateChainChild")(LateChainChild);

  const held = ClassInfo.exposeToBlue(LateChainChild);
  assert.equal(held.parentClassInfo, null);
  assert.equal(held.entries.has("size"), false);

  be.exposureChainTo(LateChainBase)(LateChainChild);
  assert.equal(ClassInfo.exposeToBlue(LateChainChild), held);
  assert.equal(getClassRegistration("LateChainChild").classInfo, held);
  assert.equal(held.parentClassInfo, ClassInfo.exposeToBlue(LateChainBase));
  assert.equal(held.entries.has("size"), true);

  const notify = blue.classes.GetClassRegistration("INotify").type;
  assert.equal(held.isNotify, false);
  be.mapInterface(notify)(LateChainChild);
  assert.equal(ClassInfo.exposeToBlue(LateChainChild), held);
  assert.ok(held.interfaceTable.includes("INotify"));
  assert.equal(held.isNotify, true);
});

test("an enum that registers after its class resolves on first read", () =>
{
  class LateEnumHost
  {
    mode = 0;
  }
  CjsSchema.decorateField(LateEnumHost, "mode", be.mapAttributeWithChooser(be.READWRITE | be.PERSIST | be.ENUM, "step6.LateChooser"), type.int32);
  be.define("LateEnumHost")(LateEnumHost);
  const row = ClassInfo.exposeToBlue(LateEnumHost).memberTable[0];

  blue.enums.RegisterEnum("step6.LateChooser", { OFF: 0, ON: 1 }, { chooser: [ { name: "Off", value: 0 }, { name: "On", value: 1 } ] });
  assert.deepEqual(row.chooserTable, [ [ "Off", 0, "" ], [ "On", 1, "" ] ]);
});
