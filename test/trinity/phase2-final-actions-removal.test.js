import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { blue, DictReader, DictWriter, Copier, INotify, IInitialize, ICustomPersist } from "../../npm/dist/global/blue/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { ITr2ControllerAction } from "../../npm/dist/trinity/controllers/action/ITr2ControllerAction.js";
import { ITr2Updateable } from "../../npm/dist/trinity/core/ITr2Updateable.js";
import { ExecuteMainThreadActions } from "../../npm/dist/trinity/core/continueOnMainThread.js";
import { Tr2ActionChildEffect } from "../../npm/dist/trinity/controllers/action/Tr2ActionChildEffect.js";
import { Tr2ActionPython } from "../../npm/dist/trinity/controllers/action/Tr2ActionPython.js";
import { EveChildContainer } from "../../npm/dist/trinity/index.js";

for (const [Type, values, extra] of [
  [Tr2ActionChildEffect, { childName: "spark", path: "res:/child.red", addOnStart: false }, []],
  [Tr2ActionPython, { module: "fixture", className: "Host" }, [ITr2Updateable, INotify, IInitialize, ICustomPersist]]
]) test(`${Type.name} has native contracts and Blue construction without model state`, () =>
{
  const instance = new Type();
  assert.equal(Object.getPrototypeOf(Type.prototype), ITr2ControllerAction.prototype);
  assert.equal("GetValues" in instance, false);
  assert.deepEqual([...mappedInterfaces(Type)], [Type, ITr2ControllerAction, ...extra]);
  assert.equal(Type.from, undefined);
  for (const key of ["SetValues", "UpdateValues", "GetValues", "Dispose"])
    assert.equal(instance[key], undefined);
  const created = new DictReader({ declarations: true }).CreateObject({ _type: Type.name, ...values });
  const clone = new Copier().CloneTo(created);
  assert.ok(clone instanceof Type);
  const written = new DictWriter().WriteObject(clone, {}, { persistOnly: true });
  for (const [key, value] of Object.entries(values)) assert.equal(written[key], value);
  for (const key of ["_child", "_loadRequest", "_instance", "_controller", "_loadedState"])
    assert.equal(Object.hasOwn(written, key), false);
});

test("ChildEffect retains native declaration order and forwards prefetch with a required controller", t =>
{
  assert.deepEqual(CjsSchema.getSchema(Tr2ActionChildEffect).members.map(field => field.name),
    ["path", "childName", "targetAnotherOwner", "addOnStart", "removeOnStop"]);
  const calls = [], owner = {}, action = new Tr2ActionChildEffect();
  const previous = Tr2ActionChildEffect.registerResourcePrefetcher((...args) => calls.push(args));
  t.after(() => Tr2ActionChildEffect.registerResourcePrefetcher(previous));
  action.path = "res:/child.red";
  action.Link({ GetOwner: () => owner });
  assert.deepEqual(calls, [[action.path, owner]]);
  Tr2ActionChildEffect.clearResourcePrefetcher();
  action.Link({ GetOwner: () => owner });
  assert.equal(calls.length, 1);
  assert.throws(() => action.Link({}), TypeError);
  assert.throws(() => action.Start({}), TypeError);
});

test("ChildEffect discards an older load and releases its cache without removing a retained child", async t =>
{
  const pending = [], events = [], owner = { children: [] };
  t.mock.method(blue.resMan, "LoadObject", () => new Promise(resolve => pending.push(resolve)));
  const action = new Tr2ActionChildEffect(), controller = { GetOwner: () => owner };
  action.path = "res:/child.red";
  action.childName = "spark";
  action.Start(controller);
  action.Start(controller);
  const first = new EveChildContainer(), second = new EveChildContainer();
  first.StartControllers = () => events.push("stale");
  second.StartControllers = () => events.push("start");
  pending[0](first);
  pending[1](second);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(owner.children, [second]);
  assert.deepEqual(events, ["start"]);
  assert.equal(action._child, second);
  action.removeOnStop = false;
  action.Stop(controller);
  assert.equal(action._child, null);
  assert.deepEqual(owner.children, [second]);
  action.removeOnStop = true;
  action.Stop(controller);
  assert.deepEqual(owner.children, [second]);
});

function HostFactory(t, factory)
{
  const previous = Tr2ActionPython.registerFactory(factory);
  t.after(() => { Tr2ActionPython.registerFactory(previous); ExecuteMainThreadActions(); });
}

test("Python reader initialization and copy own state bytes without claiming custom binary dispatch", t =>
{
  const calls = [];
  HostFactory(t, (_module, _class, action) => ({ OnLoad: bytes => calls.push([action, bytes]) }));
  const action = new DictReader({ declarations: true }).CreateObject({
    _type: "Tr2ActionPython", module: "m", className: "c", state: [1, 2]
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], action);
  assert.equal(calls[0][1], action.state);
  const clone = new Copier().CloneTo(action);
  assert.equal(calls.length, 2);
  assert.notEqual(clone.state.buffer, action.state.buffer);
  clone.state[0] = 9;
  assert.equal(action.state[0], 1);
  action.SetBufferAndSize("state", new Uint8Array(0));
  assert.equal(calls.length, 2, "retained JS adapter skips empty OnLoad");
});

test("Python retains queued host capture across notification and requires controller registration", t =>
{
  const events = [], updates = new Set();
  HostFactory(t, (_module, className) => ({
    OnStart: () => events.push(`${className}:start`),
    OnStop: () => events.push(`${className}:stop`),
    OnUpdate: (_owner, _controller, real, sim) => events.push([className, real, sim])
  }));
  t.mock.method(blue.os, "GetActualTime", () => 10000000);
  t.mock.method(blue.os, "GetCurrentFrameTime", () => 20000000);
  const controller = { GetOwner: () => null, RegisterUpdateable: x => updates.add(x), UnRegisterUpdateable: x => updates.delete(x) };
  const action = new Tr2ActionPython();
  action.module = "m";
  action.className = "old";
  action.Link(controller);
  action.Start(controller);
  action.Update(30000000, 50000000);
  // Existing explicit notification seam; canonical construction uses IInitialize instead.
  new DictReader().ReadInto(action, { className: "new" }, action);
  ExecuteMainThreadActions();
  assert.deepEqual(events, ["old:start", ["old", 2, 3], "old:stop", "new:start"]);
  assert.equal(updates.has(action), true);
  action.Stop(controller);
  ExecuteMainThreadActions();
  assert.equal(updates.size, 0);
  action.Unlink();
  assert.throws(() => action.Start({ GetOwner: () => null }), TypeError);
  assert.throws(() => action.Stop({ GetOwner: () => null }), TypeError);
});

test("Python preserves optional host hooks and visible factory or queued host failures", t =>
{
  HostFactory(t, () => ({}));
  const action = new Tr2ActionPython(), controller = { GetOwner: () => null, UnRegisterUpdateable() {} };
  action.module = "m";
  action.className = "c";
  action.Link(controller);
  assert.doesNotThrow(() => action.Start(controller));
  assert.doesNotThrow(() => action.Update(1, 1));
  action.Stop(controller);
  const failure = new Error("host failure");
  Tr2ActionPython.registerFactory(() => { throw failure; });
  assert.throws(() => action.OnModified("module"), error => error === failure);
  Tr2ActionPython.registerFactory(() => ({ OnStart() { throw failure; } }));
  action.Initialize();
  action.Start(controller);
  assert.throws(() => ExecuteMainThreadActions(), error => error === failure);
});
