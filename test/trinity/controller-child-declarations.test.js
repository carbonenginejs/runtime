import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { BlueList } from "../../npm/dist/global/blue/BlueList.js";
import { IInitialize } from "../../npm/dist/global/blue/IInitialize.js";
import { IListNotify } from "../../npm/dist/global/blue/IListNotify.js";
import { INotify } from "../../npm/dist/global/blue/INotify.js";
import { ISimTimeRebaseNotify } from "../../npm/dist/global/blue/ISimTimeRebaseNotify.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { Tr2StateMachine } from "../../npm/dist/trinity/controllers/state/Tr2StateMachine.js";
import { Tr2ControllerFloatVariable } from "../../npm/dist/trinity/controllers/expression/Tr2ControllerFloatVariable.js";
import { Tr2ControllerEventHandler } from "../../npm/dist/trinity/controllers/Tr2ControllerEventHandler.js";

const cases = [
  {
    Type: Tr2StateMachine,
    mapped: [Tr2StateMachine, IListNotify, INotify],
    nominal: [IListNotify, ISimTimeRebaseNotify, INotify]
  },
  {
    Type: Tr2ControllerFloatVariable,
    mapped: [Tr2ControllerFloatVariable, IInitialize, INotify],
    nominal: [IInitialize, INotify]
  },
  {
    Type: Tr2ControllerEventHandler,
    mapped: [Tr2ControllerEventHandler, IListNotify],
    nominal: [IListNotify]
  }
];

for (const { Type, mapped, nominal } of cases)
{
  test(`${Type.name} exposes the exact ordered native table independently of nominal composition`, () =>
  {
    const item = new Type();
    assert.deepEqual([...mappedInterfaces(Type)], mapped);
    assert.equal("GetValues" in item, false);
    for (const Interface of nominal) assert.equal(CjsSchema.cast(item, Interface), item);
    assert.equal(mappedInterfaces(Type).has(ISimTimeRebaseNotify), false);
    if (Type !== Tr2ControllerFloatVariable) assert.equal(mappedInterfaces(Type).has(IInitialize), false);
  });

  test(`${Type.name} enters its own unsubscribed BlueList while other children and ducks are rejected`, () =>
  {
    const list = new BlueList(Type);
    const info = {};
    list.GetInfo(info);
    assert.equal(info.notify, null);
    const item = new Type();
    assert.equal(list.Append(item), true);
    assert.equal(list.GetSize(), 1);
    assert.equal(list.GetAt(0), item);
    for (const { Type: Other } of cases)
    {
      if (Other !== Type) assert.equal(list.Append(new Other()), false);
    }
    assert.equal(list.Append({
      name: "duck", OnListModified() {}, OnModified() {}, OnSimClockRebase() {}, Initialize() {}
    }), false);
    assert.equal(list.GetSize(), 1);
    assert.equal(list.GetAt(0), item);
    list.GetInfo(info);
    assert.equal(info.notify, null);
  });
}

test("child declarations preserve their own concrete notification and initialization methods", () =>
{
  for (const [Type, method, Interface] of [
    [Tr2StateMachine, "OnListModified", IListNotify],
    [Tr2StateMachine, "OnModified", INotify],
    [Tr2StateMachine, "OnSimClockRebase", ISimTimeRebaseNotify],
    [Tr2ControllerFloatVariable, "Initialize", IInitialize],
    [Tr2ControllerFloatVariable, "OnModified", INotify],
    [Tr2ControllerEventHandler, "OnListModified", IListNotify]
  ])
  {
    assert.equal(Object.hasOwn(Type.prototype, method), true);
    assert.notEqual(Type.prototype[method], Interface.prototype[method]);
    assert.notEqual(CjsSchema.getMethod(Type, method).impl.status, "abstract");
  }

  const state = new Tr2StateMachine();
  assert.equal(state.OnModified("startState"), true);
  state.OnSimClockRebase(100, 130);
  assert.equal(state._machineStartTime, 30);
  assert.equal(state._stateStartTime, 30);
  assert.equal(state.OnListModified(0, 0, 0, null, []), undefined);

  const variable = new Tr2ControllerFloatVariable();
  variable.defaultValue = 7;
  assert.equal(variable.Initialize(), true);
  assert.equal(variable.GetValue(), 7);
  assert.equal(variable.OnModified("value"), true);
  assert.equal(new Tr2ControllerEventHandler().OnListModified(0, 0, 0, null, []), undefined);
});

test("child declarations retain independent storage and state-machine list ownership", () =>
{
  for (const [Type, field, itemType] of [
    [Tr2StateMachine, "states", "Tr2StateMachineState"],
    [Tr2ControllerEventHandler, "actions", "ITr2ControllerAction"]
  ])
  {
    const first = new Type(), second = new Type();
    if (Type === Tr2StateMachine || Type === Tr2ControllerEventHandler)
    {
      assert.equal(Object.getPrototypeOf(first[field]), BlueList.prototype);
      const info = {};
      first[field].GetInfo(info);
      assert.equal(info.notify, first);
    }
    else
    {
      assert.equal(Object.getPrototypeOf(first[field]), Array.prototype);
    }
    assert.notEqual(first[field], second[field]);
    const member = CjsSchema.getSchema(Type).members.find(entry => entry.name === field);
    assert.equal(member.type.kind, "list");
    assert.equal(member.type.itemType, itemType);
    assert.equal(member.edit.read, true);
    assert.equal(member.edit.persist, true);
  }
});

test("concrete child tables retain exact exposure in a fresh process", () =>
{
  const moduleURL = path => new URL(`../../npm/dist/${path}`, import.meta.url).href;
  execFileSync(process.execPath, [
    ...process.execArgv,
    "--input-type=module", "--eval", `
      import assert from "node:assert/strict";
      import { meta, CjsSchema } from ${JSON.stringify(moduleURL("global/schema/index.js"))};
      import { mappedInterfaces } from ${JSON.stringify(moduleURL("global/compose/interface.js"))};
      import { IInitialize } from ${JSON.stringify(moduleURL("global/blue/IInitialize.js"))};
      import { IListNotify } from ${JSON.stringify(moduleURL("global/blue/IListNotify.js"))};
      import { INotify } from ${JSON.stringify(moduleURL("global/blue/INotify.js"))};
      const { Tr2StateMachine } = await import(${JSON.stringify(moduleURL("trinity/controllers/state/Tr2StateMachine.js"))});
      const { Tr2ControllerFloatVariable } = await import(${JSON.stringify(moduleURL("trinity/controllers/expression/Tr2ControllerFloatVariable.js"))});
      const { Tr2ControllerEventHandler } = await import(${JSON.stringify(moduleURL("trinity/controllers/Tr2ControllerEventHandler.js"))});
      for (const [Type, expected] of [
        [Tr2StateMachine, [Tr2StateMachine, IListNotify, INotify]],
        [Tr2ControllerFloatVariable, [Tr2ControllerFloatVariable, IInitialize, INotify]],
        [Tr2ControllerEventHandler, [Tr2ControllerEventHandler, IListNotify]]
      ])
      {
        assert.deepEqual([...mappedInterfaces(Type)], expected);
        const item = new Type();
        assert.equal("GetValues" in item, false);
      }
    `
  ], { encoding: "utf8", timeout: 30000, windowsHide: true });
});
