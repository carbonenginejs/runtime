import assert from "node:assert/strict";
import test from "node:test";
import { Tr2Controller, Tr2TimelineController, Tr2ControllerFloatVariable, Tr2StateMachine, Tr2CurveScalarExpression, Tr2CurveVector3Expression, Tr2CurveEulerRotationExpression, Tr2CurveConstant } from "../../npm/dist/trinity/index.js";
import { ITr2CurveSetOwner } from "../../npm/dist/trinity/curves/ITr2CurveSetOwner.js";
import { ITr2ControllerOwner } from "../../npm/dist/trinity/controllers/ITr2ControllerOwner.js";
import { DEFAULT_FUNCTIONS, ResolveIdentifier, GetRandomConstant, GetInputValue, GetInputValue_Time, GetCurveSetTime, GetExternalControllerVariable, GetServerTimeValue, CallContextFunction } from "../../npm/dist/trinity/controllers/expression/expressionRuntime.js";

for (const Type of [Tr2Controller, Tr2TimelineController])
{
  test(`${Type.name} expressions use the native optional-valued variable getter`, () =>
  {
    const controller = new Type();
    const variable = new Tr2ControllerFloatVariable();
    variable.name = "speed";
    variable.SetValue(7);
    controller.variables.push(variable);
    assert.equal(ResolveIdentifier("speed", { controller }), 7);
    assert.equal(ResolveIdentifier("absent", { controller, absent: 4 }), 4);
    controller.GetFloatVariableByName = undefined;
    assert.throws(() => ResolveIdentifier("speed", { controller }), TypeError);
  });
}

test("StateTime requires native GetStateRunTime and retains standalone action time", () =>
{
  const stateMachine = new Tr2StateMachine();
  stateMachine.GetStateRunTime = () => 9;
  stateMachine.GetStateTime = () => assert.fail("Native name must be used");
  assert.equal(DEFAULT_FUNCTIONS.StateTime({ stateMachine }), 9);
  stateMachine.GetStateRunTime = undefined;
  assert.throws(() => DEFAULT_FUNCTIONS.StateTime({ stateMachine }), TypeError);
  assert.equal(DEFAULT_FUNCTIONS.StateTime({ stateTime: 3 }), 3);
});

for (const Type of [Tr2CurveScalarExpression, Tr2CurveVector3Expression, Tr2CurveEulerRotationExpression])
{
  for (const [method, read] of [["GetRandomConstant", GetRandomConstant], ["GetInputValue", GetInputValue], ["GetInputValue_Time", GetInputValue_Time]])
  {
    test(`${Type.name} expressions require ${method}`, () =>
    {
      const curve = new Type();
      curve[method] = undefined;
      assert.throws(() => read({ curve }, 0, 1), TypeError);
    });
  }
}

test("expression helpers preserve required getter results without numeric fallbacks", () =>
{
  const curve = new Tr2CurveScalarExpression();
  curve.GetRandomConstant = () => undefined;
  curve.GetInputValue = () => undefined;
  curve.GetInputValue_Time = () => undefined;
  assert.equal(GetRandomConstant({ curve }), undefined);
  assert.equal(GetInputValue({ curve }, 0), undefined);
  assert.equal(GetInputValue_Time({ curve }, 0, 2), undefined);
});

test("explicit evaluator inputs require scalar-function sampling and preserve bounds", () =>
{
  const input = new Tr2CurveConstant();
  input.GetValueAt = time => time + 2;
  const context = { inputs: [input], time: 4 };
  assert.equal(GetInputValue(context, 0), 6);
  assert.equal(GetInputValue_Time(context, 0, 8), 10);
  assert.equal(GetInputValue(context, 5), 0);
  input.GetValueAt = undefined;
  input.value[0] = 17;
  assert.throws(() => GetInputValue(context, 0), TypeError);
});

for (const [method, name] of [["GetCurveSetDuration", "set"], ["GetRangeDuration", "set/range"]])
{
  test(`curve-set expressions require nominal ${method}`, () =>
  {
    const owner = new ITr2CurveSetOwner();
    owner[method] = () => 7;
    assert.equal(GetCurveSetTime({ owner }, name), 7);
    owner[method] = undefined;
    assert.throws(() => GetCurveSetTime({ owner }, name), TypeError);
  });
}

test("curve-set expressions reject structural owners and preserve native getter results", () =>
{
  assert.equal(GetCurveSetTime({ owner: { GetCurveSetDuration() { return 9; } } }, "set"), 0);
  const owner = new ITr2CurveSetOwner();
  owner.GetCurveSetDuration = () => undefined;
  assert.equal(GetCurveSetTime({ owner }, "set"), undefined);
});

test("external variables require nominal controller owners and their method", () =>
{
  assert.equal(GetExternalControllerVariable({ owner: { GetControllerValueByName() { return 9; } } }, "speed", 4), 4);
  const owner = new ITr2ControllerOwner();
  assert.equal(GetExternalControllerVariable({ owner }, "speed", 4), 4);
  owner.GetControllerValueByName = () => 7;
  assert.equal(GetExternalControllerVariable({ owner }, "speed", 4), 7);
  owner.GetControllerValueByName = undefined;
  assert.throws(() => GetExternalControllerVariable({ owner }, "speed", 4), TypeError);
});

test("expression adapters retain explicit data, absent contexts and caller callbacks", () =>
{
  assert.equal(GetRandomConstant({}), 0);
  assert.equal(GetInputValue({}, 0), 0);
  assert.equal(ResolveIdentifier("missing", {}), 0);
  assert.equal(GetExternalControllerVariable({ externalControllerVariables: { speed: 6 } }, "speed", 4), 6);
  assert.equal(GetCurveSetTime({ functions: { CurveSetTime: () => 8 } }, "set"), 8);
  assert.equal(CallContextFunction({ owner: { AnimationTime: () => 5 } }, "AnimationTime", "idle"), 5);
  assert.equal(CallContextFunction({ functions: { KillCount: () => 3 } }, "KillCount"), 3);
  assert.equal(GetServerTimeValue({ owner: { GetServerTime: () => 100 } }), 100);
});
