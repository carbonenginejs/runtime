import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { BlueList } from "../../npm/dist/global/blue/BlueList.js";
import { IInitialize } from "../../npm/dist/global/blue/IInitialize.js";
import { IListNotify } from "../../npm/dist/global/blue/IListNotify.js";
import { INotify } from "../../npm/dist/global/blue/INotify.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { Tr2Controller } from "../../npm/dist/trinity/controllers/Tr2Controller.js";
import { ITr2ActionController } from "../../npm/dist/trinity/controllers/ITr2Controller/ITr2ActionController.js";
import { ITr2Controller } from "../../npm/dist/trinity/controllers/ITr2Controller/ITr2Controller.js";
import { EveThrottleable } from "../../npm/dist/trinity/eve/EveThrottleable.js";

test("controller callbackCount is a live READ uint64 property before construction", () =>
{
  const schema = CjsSchema.getSchema(Tr2Controller);
  const property = schema.properties.find(entry => entry.name === "callbackCount");
  assert.ok(property);
  assert.equal(property.key, "callbackCount");
  assert.equal(property.role, "property");
  assert.equal(property.type.kind, "uint64");
  assert.equal(property.edit.read, true);
  assert.equal(property.edit.write, undefined);
  assert.equal(property.edit.persist, undefined);
  assert.equal(property.edit.notify, undefined);
  assert.equal(schema.members.some(entry => entry.name === "callbackCount"), false);
});

test("controller callbackCount remains computed, getter-only and numeric", () =>
{
  const controller = new Tr2Controller();
  const descriptor = Object.getOwnPropertyDescriptor(Tr2Controller.prototype, "callbackCount");
  assert.equal(typeof descriptor.get, "function");
  assert.equal(descriptor.set, undefined);
  assert.equal(Object.hasOwn(controller, "callbackCount"), false);
  assert.equal(controller.callbackCount, 0);
  controller.RegisterCallback("first", () => {});
  controller.RegisterCallback("second", () => {});
  assert.equal(controller.callbackCount, 2);
  assert.equal(controller.GetCallbackCount(), 2);
  assert.equal(typeof controller.callbackCount, "number");
  assert.throws(() => { controller.callbackCount = 19; }, TypeError);
  controller.ClearCallbacks();
  assert.equal(controller.callbackCount, 0);
});

test("controller composes the native observer without replacing its own handler", () =>
{
  const controller = new Tr2Controller();
  assert.equal(CjsSchema.cast(controller, IListNotify), controller);
  assert.equal(CjsSchema.cast(controller, ITr2ActionController), controller);
  assert.equal(CjsSchema.cast(controller, EveThrottleable), controller);
  assert.equal(Object.hasOwn(Tr2Controller.prototype, "OnListModified"), true);
  assert.notEqual(controller.OnListModified, IListNotify.prototype.OnListModified);

  // This separate empty list checks observer admission, not controller list migration.
  const list = new BlueList(ITr2Controller);
  list.SetNotify(controller);
  const info = {};
  list.GetInfo(info);
  assert.equal(info.notify, controller);
  list.SetNotify(null);
});

test("controller exposes its exact supported own table without invented lifecycle interfaces", () =>
{
  const expected = new Set([Tr2Controller, ITr2Controller, ITr2ActionController, IListNotify]);
  for (const Interface of mappedInterfaces(EveThrottleable)) expected.add(Interface);
  assert.deepEqual([...mappedInterfaces(Tr2Controller)], [...expected]);
  assert.equal(mappedInterfaces(Tr2Controller).has(IInitialize), false);
  assert.equal(mappedInterfaces(Tr2Controller).has(INotify), false);
});

test("controller exposure follows its explicit EveThrottleable parent table", () =>
{
  // A fresh process keeps the temporary parent declaration out of other tests.
  const moduleURL = path => new URL(`../../npm/dist/${path}`, import.meta.url).href;
  execFileSync(process.execPath, ["--input-type=module", "--eval", `
    import assert from "node:assert/strict";
    import { meta } from ${JSON.stringify(moduleURL("global/schema/index.js"))};
    import { mappedInterfaces } from ${JSON.stringify(moduleURL("global/compose/interface.js"))};
    import { EveThrottleable } from ${JSON.stringify(moduleURL("trinity/eve/EveThrottleable.js"))};
    import { Tr2Controller } from ${JSON.stringify(moduleURL("trinity/controllers/Tr2Controller.js"))};
    class ParentInterface {}
    meta.blue.mapInterface(ParentInterface)(EveThrottleable);
    assert.equal(mappedInterfaces(Tr2Controller).has(ParentInterface), true);
  `], { encoding: "utf8", timeout: 30000 });
});

test("controller declarations retain independent owned typed lists", () =>
{
  const first = new Tr2Controller(), second = new Tr2Controller();
  for (const name of ["stateMachines", "variables", "eventHandlers"])
  {
    assert.equal(Object.getPrototypeOf(first[name]), BlueList.prototype);
    const info = {};
    first[name].GetInfo(info);
    assert.equal(info.notify, first);
    assert.notEqual(first[name], second[name]);
    const member = CjsSchema.getSchema(Tr2Controller).members.find(entry => entry.name === name);
    assert.equal(member.type.kind, "list");
    assert.equal(member.edit.read, true);
    assert.equal(member.edit.persist, true);
  }
});
