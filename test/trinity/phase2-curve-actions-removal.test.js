import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { CjsModel } from "../../npm/dist/global/model/index.js";
import { blue, DictReader, DictWriter, Copier, BlueList, INotify } from "../../npm/dist/global/blue/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { ITr2ControllerAction } from "../../npm/dist/trinity/controllers/action/ITr2ControllerAction.js";
import { ITr2Updateable } from "../../npm/dist/trinity/core/ITr2Updateable.js";
import { Tr2ActionPlayCurveSet } from "../../npm/dist/trinity/controllers/action/Tr2ActionPlayCurveSet.js";
import { Tr2ActionSetValue } from "../../npm/dist/trinity/controllers/action/Tr2ActionSetValue.js";
import { Tr2Controller } from "../../npm/dist/trinity/controllers/Tr2Controller.js";

for (const [Type, values, interfaces] of [
  [Tr2ActionPlayCurveSet, { curveSetName: "warp", rangeName: "entry", syncToRange: true }, []],
  [Tr2ActionSetValue, { path: "", destination: null, attribute: "value", value: "7", delayBinding: true }, [INotify]]
])
{
  test(`${CjsSchema.getClassName(Type)} constructs and copies through Blue without model state`, () =>
  {
    const instance = new Type();
    assert.equal(Object.getPrototypeOf(Type.prototype), ITr2ControllerAction.prototype);
    assert.equal(CjsSchema.cast(instance, CjsModel), null);
    assert.equal(CjsSchema.cast(instance, ITr2ControllerAction), instance);
    assert.deepEqual([...mappedInterfaces(Type)], [Type, ITr2ControllerAction, ...interfaces]);
    assert.equal(Type.from, undefined);
    for (const method of ["Initialize", "SetValues", "GetValues", "UpdateValues", "Dispose"])
      assert.equal(instance[method], undefined, method);
    const object = new DictReader().CreateObject({ _type: CjsSchema.getClassName(Type), ...values });
    const clone = new Copier().CloneTo(object);
    assert.ok(clone instanceof Type);
    assert.notEqual(clone, object);
    const written = new DictWriter().WriteObject(clone, {}, { persistOnly: true });
    for (const [key, value] of Object.entries(values)) assert.equal(written[key], value);
    for (const key of ["_controller", "_bindingPoint", "_startTime", "isBindingValid", "isExpressionValid"])
      assert.equal(Object.hasOwn(written, key), false, key);
    const actions = new BlueList(ITr2ControllerAction, { className: null, listOps: 0 });
    assert.equal(actions.Append(clone), true);
    assert.equal(actions.GetAt(0), clone);
  });
}

test("PlayCurveSet retains nominal updateability without adding a native query entry", () =>
{
  const action = new Tr2ActionPlayCurveSet();
  assert.equal(CjsSchema.cast(action, ITr2Updateable), action);
  assert.equal(mappedInterfaces(Tr2ActionPlayCurveSet).has(ITr2Updateable), false);
  assert.equal(new BlueList(ITr2Updateable, { className: null, listOps: 0 }).Append(action), false);
  assert.doesNotThrow(() => action.Link({}));
  assert.doesNotThrow(() => action.Unlink());
  assert.equal(Object.hasOwn(action, "_controller"), false);
});

test("PlayCurveSet unregisters before stopping and retains frame-clock transition windows", t =>
{
  let ticks = 100000000;
  t.mock.method(blue.os, "GetCurrentFrameTime", () => ticks);
  const calls = [], updates = new Set();
  const action = new Tr2ActionPlayCurveSet();
  action.curveSetName = "warp";
  action.rangeName = "entry";
  action.syncToRange = true;
  const owner = {
    PlayCurveSet(name, range) { calls.push(["play", name, range]); },
    GetRangeDuration(name, range) { calls.push(["duration", name, range]); return 2; },
    StopCurveSet(name) { assert.equal(updates.size, 0); calls.push(["stop", name]); }
  };
  const controller = {
    GetOwner: () => owner,
    RegisterUpdateable(item) { updates.add(item); },
    UnRegisterUpdateable(item) { calls.push(["unregister"]); updates.delete(item); }
  };
  action.Start(controller);
  assert.equal(updates.has(action), true);
  assert.equal(action.CanTransition(), true);
  ticks += 10000000;
  assert.equal(action.CanTransition(), false);
  ticks += 10000000;
  assert.equal(action.CanTransition(), true);
  assert.equal(action.CanTransition(), true);
  action.Update(-1, -2);
  assert.equal(action.CanTransition(), false);
  action.RebaseSimTime(30000000);
  ticks += 30000000;
  assert.equal(action.CanTransition(), false);
  ticks += 20000000;
  assert.equal(action.CanTransition(), true);
  action.Stop(controller);
  assert.deepEqual(calls, [["play", "warp", "entry"], ["duration", "warp", "entry"], ["unregister"], ["stop", "warp"]]);
});

test("SetValue Blue member notifications recompile linked expressions and leave copies unlinked", () =>
{
  const destination = { value: 0 };
  const controller = new Tr2Controller();
  const action = new Tr2ActionSetValue();
  assert.equal(CjsSchema.cast(action, INotify), action);
  assert.equal(action.isExpressionValid, false);
  assert.equal(action.isBindingValid, false);
  action.destination = destination;
  action.attribute = "value";
  action.value = "2";
  action.Link(controller);
  assert.equal(action.isExpressionValid, true);
  assert.equal(action.isBindingValid, true);
  new DictReader().ReadInto(action, { value: "7" }, action);
  action.Start(controller);
  assert.equal(destination.value, 7);
  // Copy authored fields into the live action; the mapped notification
  // recompiles without requiring an inherited model values helper.
  const source = new Tr2ActionSetValue();
  source.value = "9";
  const copyTarget = new Tr2ActionSetValue();
  copyTarget.value = "1";
  copyTarget.Link(controller);
  assert.equal(new Copier().CopyTo(source, copyTarget), copyTarget);
  assert.equal(copyTarget.GetValue(), 9);
  const clone = new Copier().CloneTo(source);
  assert.equal(clone.isExpressionValid, false);
  assert.equal(clone.isBindingValid, false);
  copyTarget.Unlink();
  action.Unlink();
  assert.equal(action.isExpressionValid, false);
  assert.equal(action.isBindingValid, false);
  assert.throws(() => { action.isExpressionValid = true; }, TypeError);
  assert.throws(() => { action.isBindingValid = true; }, TypeError);
});

test("SetValue forwards linked expression-term queries through the required controller contract", () =>
{
  const action = new Tr2ActionSetValue();
  assert.ok(Array.isArray(action.GetExpressionTermInfo()));
  action.Link({ GetOwner: () => ({}), GetExpressionTermInfo(result) { result.push({ name: "owned" }); } });
  assert.equal(action.GetExpressionTermInfo().at(-1).name, "owned");
  action.Unlink();
  action.Link({ GetOwner: () => ({}) });
  assert.throws(() => action.GetExpressionTermInfo(), TypeError);
});

test("SetValue copy stops at a cleared object pointer in native member order", () =>
{
  // BlueVariable.cpp:417-434 clears an IROOTPTR then fails on a NULL source;
  // Copier.cpp:184-190 returns before notification or later member copies.
  const source = new Tr2ActionSetValue();
  source.value = "9";
  const target = new Tr2ActionSetValue();
  target.destination = { value: 0 };
  target.attribute = "value";
  target.value = "7";
  target.Link(new Tr2Controller());
  const notifications = [];
  const onModified = target.OnModified;
  target.OnModified = function(name) { notifications.push(name); return onModified.call(this, name); };
  assert.equal(new Copier().CopyTo(source, target), null);
  assert.equal(target.destination, null);
  assert.equal(target.attribute, "value");
  assert.equal(target.value, "7");
  assert.equal(target.GetValue(), 7);
  assert.equal(target.isBindingValid, true, "failed copy must not synthesize a destination notification");
  assert.deepEqual(notifications, []);
  target.Unlink();
});
