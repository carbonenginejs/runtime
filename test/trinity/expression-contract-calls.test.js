import assert from "node:assert/strict";
import test from "node:test";
import { Tr2Controller, Tr2TimelineController, Tr2ControllerFloatVariable, Tr2StateMachine, Tr2CurveScalarExpression, Tr2CurveVector3Expression, Tr2CurveEulerRotationExpression, Tr2CurveConstant } from "../../npm/dist/trinity/index.js";
import { ITr2CurveSetOwner } from "../../npm/dist/trinity/curves/ITr2CurveSetOwner.js";
import { ITr2ControllerOwner } from "../../npm/dist/trinity/controllers/ITr2ControllerOwner.js";
import { DEFAULT_FUNCTIONS, ResolveIdentifier, GetRandomConstant, GetInputValue, GetInputValue__Time, GetCurveSetTime, GetExternalControllerVariable } from "../../npm/dist/trinity/controllers/expression/expressionRuntime.js";

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
  for (const [method, read] of [["GetRandomConstant", GetRandomConstant], ["GetInputValue", GetInputValue], ["GetInputValue__Time", GetInputValue__Time]])
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
  curve.GetInputValue__Time = () => undefined;
  assert.equal(GetRandomConstant({ curve }), undefined);
  assert.equal(GetInputValue({ curve }, 0), undefined);
  assert.equal(GetInputValue__Time({ curve }, 0, 2), undefined);
});

test("explicit evaluator inputs require scalar-function sampling and preserve bounds", () =>
{
  const input = new Tr2CurveConstant();
  input.GetValueAt = time => time + 2;
  const context = { inputs: [input], time: 4 };
  assert.equal(GetInputValue(context, 0), 6);
  assert.equal(GetInputValue__Time(context, 0, 8), 10);
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

test("expression adapters retain explicit data and absent contexts; CurveSetTime is 0 without a curve-set owner", () =>
{
  assert.equal(GetRandomConstant({}), 0);
  assert.equal(GetInputValue({}, 0), 0);
  assert.equal(ResolveIdentifier("missing", {}), 0);
  assert.equal(GetExternalControllerVariable({ externalControllerVariables: { speed: 6 } }, "speed", 4), 6);
  // Tr2ControllerExpression.cpp:36-42.
  assert.equal(GetCurveSetTime({ owner: {} }, "set"), 0);
});

test("the override settings drive ShipSpeed, ShipMaxSpeed and the UTC server-time terms, as Carbon's do", async t =>
{
  const { Tr2ControllerExpression } = await import("../../npm/dist/trinity/controllers/expression/Tr2ControllerExpression.js");
  const { CcpTime } = await import("../../npm/dist/global/blue/index.js");
  const saved = { ...Object.fromEntries([ "controllerFunctionOverrideEnabled", "controllerShipSpeed", "controllerShipMaxSpeed", "controllerServerTime" ].map(k => [ k, Tr2ControllerExpression[k] ])) };
  t.after(() => Object.assign(Tr2ControllerExpression, saved));
  // Saturday 2026-03-14 12:34:56 UTC, as runtime-epoch Blue ticks (Tr2ControllerExpression.cpp:241-292, Windows UTC parts).
  const ticks = CcpTime.timeFromDouble((Date.UTC(2026, 2, 14, 12, 34, 56) - CcpTime.BLUE_EPOCH_UNIX_MS) / 1000);
  Object.assign(Tr2ControllerExpression, { controllerFunctionOverrideEnabled: true, controllerShipSpeed: 42, controllerShipMaxSpeed: 300, controllerServerTime: ticks });
  const ctx = { owner: null };
  assert.equal(DEFAULT_FUNCTIONS.ShipSpeed(ctx), 42);
  assert.equal(DEFAULT_FUNCTIONS.ShipMaxSpeed(ctx), 300);
  assert.deepEqual([ "ServerYear", "ServerMonth", "ServerDay", "ServerHour", "ServerMinute", "ServerSecond", "ServerDayOfWeek" ].map(n => DEFAULT_FUNCTIONS[n](ctx)), [ 2026, 3, 14, 12, 34, 56, 6 ]);
  assert.equal(DEFAULT_FUNCTIONS.IsWeekend(ctx), 1);
  assert.equal(DEFAULT_FUNCTIONS.ServerTimeGreaterThan(ctx, 2026, 3, 13, -1, -1, -1), 1);
  // TimePhase works on absolute FILETIME ticks (cpp:357-377): a day period leaves the UTC time of day.
  assert.ok(Math.abs(DEFAULT_FUNCTIONS.ServerTimePhase(ctx, 86400) - (12 * 3600 + 34 * 60 + 56)) < 1e-3);
  assert.equal(DEFAULT_FUNCTIONS.ServerTimePhase(ctx, 0), 0);
});

test("BoundingSphereRadius, KillCount and ShipBoosterIntensity read the owning ship, as Carbon's terms do", async () =>
{
  // Tr2ControllerExpression.cpp:123-140, :204-212. The VDS controller buckets
  // BoundingSphereRadius() into ShipSize; a missing port read 0 for every hull.
  const { EveShip2 } = await import("../../npm/dist/trinity/index.js");
  const ship = new EveShip2();
  ship.boundingSphereRadius = 1200;
  ship.displayKillCounterValue = 4;
  ship.boosters = { GetBoosterIntensity: () => -0.5 };
  assert.equal(DEFAULT_FUNCTIONS.BoundingSphereRadius({ owner: ship }), ship.GetRadius());
  assert.ok(DEFAULT_FUNCTIONS.BoundingSphereRadius({ owner: ship }) > 0);
  assert.equal(DEFAULT_FUNCTIONS.KillCount({ owner: ship }), 4);
  assert.equal(DEFAULT_FUNCTIONS.ShipBoosterIntensity({ owner: ship }), 0, "never negative");
  assert.equal(DEFAULT_FUNCTIONS.BoundingSphereRadius({ owner: null }), 0);
  assert.equal(DEFAULT_FUNCTIONS.KillCount({ owner: {} }), 0);
});

test("controller owners answer Owner in their binding roots, as ITr2ControllerOwner's default does", async () =>
{
  // ITr2ControllerOwner.h: GetBindingRoots defaults to variables["Owner"] = GetRootObject().
  // Without it a Tr2ActionSetExternalControllerVariable aimed at "Owner" found
  // nothing, so the VDS controller never handed the ship its radius.
  const trinity = await import("../../npm/dist/trinity/index.js");
  for (const name of [ "EveShip2", "EveEffectRoot2", "EveChildBoosterSet", "EveChildInstanceContainer", "EveMeshOverlayEffect" ])
  {
    const owner = new trinity[name]();
    assert.equal(owner.GetBindingRoots().Owner, owner, name);
    assert.equal(typeof owner.GetControllerValueByName, "function", name);
  }
});
