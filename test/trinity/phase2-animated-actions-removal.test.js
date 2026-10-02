import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { blue, DictReader, DictWriter, Copier, BlueList, INotify } from "../../npm/dist/global/blue/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { ITr2ControllerAction } from "../../npm/dist/trinity/controllers/action/ITr2ControllerAction.js";
import { ITr2Updateable } from "../../npm/dist/trinity/core/ITr2Updateable.js";
import { Tr2ActionAnimateValue } from "../../npm/dist/trinity/controllers/action/Tr2ActionAnimateValue.js";
import { Tr2ActionAnimateCurveSet } from "../../npm/dist/trinity/controllers/action/Tr2ActionAnimateCurveSet.js";
import { Tr2ActionSetExternalControllerVariable } from "../../npm/dist/trinity/controllers/action/Tr2ActionSetExternalControllerVariable.js";

const cases = [
  [Tr2ActionAnimateValue, { value: "2", path: "", attribute: "value", destination: null, curve: null, delayBinding: false }, [ITr2Updateable, INotify]],
  [Tr2ActionAnimateCurveSet, { value: "2", curveSet: null }, [ITr2Updateable, INotify]],
  [Tr2ActionSetExternalControllerVariable, { destinationOwner: "child", variable: "input", value: 2, sourceVariable: "", startControllers: false }, [INotify]]
];

for (const [Type, values, extra] of cases)
{
  test(`${CjsSchema.getClassName(Type)} retains Blue construction, copy and admission without model state`, () =>
  {
    const instance = new Type();
    assert.equal(Object.getPrototypeOf(Type.prototype), ITr2ControllerAction.prototype);
    assert.equal("GetValues" in instance, false);
    assert.deepEqual([...mappedInterfaces(Type)], [Type, ITr2ControllerAction, ...extra]);
    for (const Interface of [ITr2ControllerAction, ...extra]) assert.equal(CjsSchema.cast(instance, Interface), instance);
    assert.equal(Type.from, undefined);
    for (const name of ["SetValues", "GetValues", "UpdateValues", "Initialize", "Dispose"])
      assert.equal(instance[name], undefined, name);
    const created = new DictReader({ declarations: true }).CreateObject({ _type: CjsSchema.getClassName(Type), ...values });
    const clone = new Copier().CloneTo(created);
    assert.ok(clone instanceof Type);
    assert.notEqual(clone, created);
    const output = new DictWriter().WriteObject(clone, {}, { persistOnly: true });
    for (const [key, value] of Object.entries(values)) assert.equal(output[key], value);
    for (const key of ["isExpressionValid", "isBindingValid", "destinationIsValid", "_runtime", "_controller"])
      assert.equal(Object.hasOwn(output, key), false);
    const actions = new BlueList(ITr2ControllerAction, { className: null, listOps: 0 });
    assert.equal(actions.Append(clone), true);
    assert.equal(actions.GetAt(0), clone);
    assert.equal(clone.CanTransition(), true);
  });
}

function AnimationFixture(Type)
{
  const action = new Type(), output = [], updates = new Set();
  const controller = {
    GetOwner: () => null,
    RegisterUpdateable: item => updates.add(item),
    UnRegisterUpdateable: item => updates.delete(item),
    GetVariableValue: () => 3,
    GetExpressionTermInfo: () => {}
  };
  let write = value => output.push(value);
  if (Type === Tr2ActionAnimateValue)
  {
    const target = {};
    Object.defineProperty(target, "value", { get: () => output.at(-1) ?? 0, set: value => write(value) });
    action.destination = target;
    action.attribute = "value";
  }
  else action.curveSet = { ApplyTime: value => write(value) };
  return { action, controller, output, updates, setWrite: callback => { write = callback; } };
}

for (const Type of [Tr2ActionAnimateValue, Tr2ActionAnimateCurveSet])
{
  test(`${CjsSchema.getClassName(Type)} updates retained expressions until a Blue notification`, t =>
  {
    t.mock.method(blue.os, "GetCurrentFrameTime", () => 100000000);
    const { action, controller, output, updates } = AnimationFixture(Type);
    assert.equal(action.isExpressionValid, false);
    action.value = "2";
    action.Link(controller);
    action.Start(controller);
    assert.equal(updates.has(action), true);
    assert.equal(action.isExpressionValid, true);
    action.Update(0, 110000000);
    action.value = "7";
    assert.equal(action.isExpressionValid, true, "live validity must not recompile unnotified text");
    action.Update(0, 120000000);
    const retainedWrites = Type === Tr2ActionAnimateValue ? [2] : [2, 2];
    assert.deepEqual(output, retainedWrites);
    new DictReader({ declarations: true }).ReadInto(action, { value: "7" });
    action.Update(0, 130000000);
    assert.deepEqual(output, [...retainedWrites, 7]);
    action.RebaseSimTime(10000000);
    assert.equal(action._runtime.startTime, 110000000);
    assert.equal(action._runtime.lastTime, 140000000);
    action.Stop(controller);
    assert.equal(updates.size, 0);
    action.Unlink();
    assert.equal(action.isExpressionValid, false);
    action.Update(0, 200000000);
    assert.equal(action._runtime.lastTime, 200000000);
    assert.throws(() => { action.isExpressionValid = true; }, TypeError);
  });

  test(`${CjsSchema.getClassName(Type)} skips evaluator failure but preserves nonfinite results and target errors`, () =>
  {
    const { action, controller, output, setWrite } = AnimationFixture(Type);
    action.value = "input";
    action.Link(controller);
    action.Update(0, 1);
    assert.deepEqual(output, [3]);
    controller.GetVariableValue = () => { throw new Error("evaluation failure"); };
    assert.doesNotThrow(() => action.Update(0, 2));
    assert.deepEqual(output, [3]);
    assert.equal(action._runtime.lastTime, 2);
    new DictReader({ declarations: true }).ReadInto(action, { value: "(-1)^0.5" });
    action.Update(0, 3);
    assert.ok(Number.isNaN(output.at(-1)));
    new DictReader({ declarations: true }).ReadInto(action, { value: "2" });
    const failure = new Error("target failure");
    setWrite(() => { throw failure; });
    assert.throws(() => action.Update(0, 4), error => error === failure);
    action.Unlink();
  });
}

test("External preserves destination cache until notified and excludes its weak runtime link from copies", () =>
{
  const action = new Tr2ActionSetExternalControllerVariable();
  const calls = [];
  const first = { StartControllers: () => calls.push("start"), SetControllerVariable: (name, value) => calls.push([name, value]) };
  const second = { SetControllerVariable: () => {} };
  let roots = [["CHILD", first]];
  const controller = { GetOwner: () => ({ GetBindingRoots: () => roots }), GetFloatVariableByName: () => 5 };
  action.destinationOwner = "child";
  assert.equal(action.destinationIsValid, false);
  action.Link(controller);
  assert.equal(action.destinationIsValid, true);
  assert.equal(action.destination, first);
  roots = [["CHILD", second]];
  new DictReader({ declarations: true }).ReadInto(action, { value: 2 });
  assert.equal(action.destination, first);
  action.startControllers = true;
  action.sourceVariable = "input";
  action.Start(controller);
  assert.deepEqual(calls, ["start", ["", 5]]);
  const clone = new Copier().CloneTo(action);
  assert.ok(clone instanceof Tr2ActionSetExternalControllerVariable);
  assert.equal(clone.destination, null);
  assert.equal(clone.destinationIsValid, false);
  new DictReader({ declarations: true }).ReadInto(action, { destinationOwner: "child" });
  assert.equal(action.destination, second, "NOTIFY must run even when authored name is equal");
  assert.equal(CjsSchema.getField(Tr2ActionSetExternalControllerVariable, "destination").type.kind, "weakRef");
  assert.throws(() => { action.destinationIsValid = false; }, TypeError);
  action.Unlink();
  assert.equal(action.destinationIsValid, false);
});
