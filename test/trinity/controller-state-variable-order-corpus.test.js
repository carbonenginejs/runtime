// Optional offline proof of Fixes CE-198 against a real ship VFX file.
// Set CONTROLLER_BLACK_CORPUS_DIR to a directory containing the filename below.
// Game data is not committed; size and md5 pin the inspected input.
//
// Carbon trinity 85a2b621 queued each Tr2StateMachineState action through
// ContinueOnMainThread, so a state's transitions were evaluated before its
// actions had written their variables and compared stale values. Here the
// state actions run directly, so the step that crosses a threshold takes the
// crossing transition on the very same Update, with no ExecuteMainThreadActions
// in between.
//
// ISOLATION. Both machines are exercised in place, on the controllers as
// authored, linked to the loaded root container (the owner the file itself
// names). Nothing is rebuilt: the other machines in those controllers only
// act on the owner's curve sets and never run here, because the test never
// drains the main-thread queue until t.after.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { be } from "../../npm/dist/global/blue/index.js";
import { CjsBlackFormat } from "../../npm/dist/resource/formats/black/index.js";
import "../../npm/dist/audio/index.js";
import { ExecuteMainThreadActions, Tr2ControllerExpression } from "../../npm/dist/trinity/index.js";
import { StubResMan } from "../support/stubResMan.js";

const corpus = process.env.CONTROLLER_BLACK_CORPUS_DIR;
const NAME = "gbc3_t1_empire_fx.black";
const SIZE = 76676;
const MD5 = "f3d7feb4a37c2692d7e49d1ca5466f7b";
const SECOND = 10000000;
// A state machine reports 0 run time while its start stamp is 0, so the clock
// starts well away from zero.
const EPOCH = 1000 * SECOND;

/**
 * Loads the pinned file and installs a controllable Blue clock and resource
 * manager, restoring everything in t.after.
 * @param {object} t Test context.
 * @returns {Promise<{root: object, clock: {ticks: number}}>} Loaded root and clock.
 */
async function load(t)
{
  const data = await readFile(join(corpus, NAME));
  assert.equal(data.length, SIZE, NAME);
  assert.equal(createHash("md5").update(data).digest("hex"), MD5, NAME);

  const previous = be.resMan;
  const getActualTime = be.os.GetActualTime;
  const getFrameTime = be.os.GetCurrentFrameTime;
  const override = Tr2ControllerExpression.controllerFunctionOverrideEnabled;
  const overrideSpeed = Tr2ControllerExpression.controllerShipSpeed;
  const overrideMax = Tr2ControllerExpression.controllerShipMaxSpeed;
  t.after(() =>
  {
    be.resMan = previous;
    be.os.GetActualTime = getActualTime;
    be.os.GetCurrentFrameTime = getFrameTime;
    Tr2ControllerExpression.controllerFunctionOverrideEnabled = override;
    Tr2ControllerExpression.controllerShipSpeed = overrideSpeed;
    Tr2ControllerExpression.controllerShipMaxSpeed = overrideMax;
    ExecuteMainThreadActions();
  });
  const clock = { ticks: EPOCH };
  be.os.GetActualTime = () => clock.ticks;
  be.os.GetCurrentFrameTime = () => clock.ticks;
  be.resMan = new StubResMan();
  const root = CjsSchema.from("EveChildContainer", CjsBlackFormat.readPayload(data).object);
  return { root, clock };
}

/**
 * Records every state a machine enters, in order.
 * @param {object} machine Tr2StateMachine.
 * @returns {string[]} Live list of entered state names.
 */
function recordStates(machine)
{
  const entered = [];
  for (const state of machine.states)
  {
    const start = state.Start.bind(state);
    state.Start = () =>
    {
      if (!state._isActive) entered.push(state.name);
      start();
    };
  }
  return entered;
}

test("real ship VFX file: accumulator sampler reaches OnComplete on the step that crosses its threshold", {
  skip: !corpus && "set CONTROLLER_BLACK_CORPUS_DIR for the real Black-file proof"
}, async t =>
{
  const { root, clock } = await load(t);
  const controller = root.controllers.find(value => value.name === "AccumulatorArmorAndHull");
  assert.ok(controller, "real effect carries AccumulatorArmorAndHull");
  const machine = controller.stateMachines.find(value => value.name === "AccumulatorSampler");
  assert.ok(machine, "controller carries AccumulatorSampler");

  const threshold = controller.GetVariableValue("accumulationThreshold");
  const interval = controller.GetVariableValue("accumulationSampleInterval");
  assert.ok(threshold > 0 && interval > 0, `authored threshold ${threshold}, interval ${interval}`);

  controller.Link(root);
  const entered = recordStates(machine);
  controller.Start();
  assert.equal(machine.currentState.name, "Wait", "Reset falls through to Wait on start");
  controller.SetVariable("accumulationAllowed", 1);

  // Damage is cumulative, as the sampler differences successive totals. Each
  // step advances past the sample interval and raises ArmorDamage and
  // HullDamage so the running sum rises by `piece`, ending above the threshold.
  const piece = Math.ceil(threshold / 2.5);
  let armor = 0;
  let hull = 0;
  let steps = 0;
  let crossed = null;
  while (!crossed && steps < 10)
  {
    steps += 1;
    clock.ticks += Math.round((interval + 0.5) * SECOND);
    armor += piece - 1;
    hull += 1;
    controller.SetVariable("ArmorDamage", armor);
    controller.SetVariable("HullDamage", hull);
    const before = controller.GetVariableValue("_accumulationValue");
    controller.Update(0);
    // No ExecuteMainThreadActions: the actions must already have run.
    const value = controller.GetVariableValue("_accumulationValue");
    assert.equal(value, before + piece, `step ${steps} accumulates the damage delta`);
    if (value >= threshold) crossed = { value, state: machine.currentState.name };
    else assert.equal(machine.currentState.name, "Wait", `step ${steps} stays below ${threshold}`);
  }
  assert.ok(crossed, "damage crossed the authored threshold");
  assert.equal(crossed.state, "OnComplete", "the crossing step must take Sample -> OnComplete, not Wait");
  assert.equal(controller.GetVariableValue("_accumulationCompletePending"), 1);
  assert.equal(controller.GetVariableValue("_accumulationProgress"), 1, "OnComplete writes progress 1");
  assert.deepEqual(entered.slice(-2), [ "Sample", "OnComplete" ]);
  t.diagnostic(`threshold ${threshold}, crossing on step ${steps}, states entered: ${entered.join(" > ")}`);
});

test("real ship VFX file: brake check latches its speed delta on the step it is computed", {
  skip: !corpus && "set CONTROLLER_BLACK_CORPUS_DIR for the real Black-file proof"
}, async t =>
{
  const { root, clock } = await load(t);
  const controller = root.controllers.find(value => value.name === "BrakeCheck");
  assert.ok(controller, "real effect carries BrakeCheck");
  const machine = controller.stateMachines.find(value => value.name === "BrakeCheck");
  assert.ok(machine, "controller carries the BrakeCheck machine");
  const minimum = controller.GetVariableValue("SpeedMinForBrakeCheck");
  const drop = controller.GetVariableValue("SpeedDeltaBrakeThreshold");
  const interval = controller.GetVariableValue("SpeedSampleInterval");
  assert.ok(minimum > 0 && drop < 0 && interval > 0);

  // ShipSpeed() and ShipMaxSpeed() read Carbon's own function-override settings
  // (Tr2ControllerExpression.cpp:142-201), the supported way to supply them
  // without a real ship.
  Tr2ControllerExpression.controllerFunctionOverrideEnabled = true;
  Tr2ControllerExpression.controllerShipMaxSpeed = 100;
  Tr2ControllerExpression.controllerShipSpeed = 80;

  controller.Link(root);
  const entered = recordStates(machine);
  controller.Start();
  assert.ok(Math.abs(controller.GetVariableValue("_SpeedPrevious") - 0.8) < 1e-6, "Start samples the ship at 80%");
  assert.equal(machine.currentState.name, "SpeedWait");

  // The ship brakes to 40%: delta -0.4 is below the authored threshold and the
  // previous sample is above the minimum, so SpeedCalc must see the delta its
  // own action just wrote and go on to SpeedBrakeTrigger.
  Tr2ControllerExpression.controllerShipSpeed = 40;
  clock.ticks += Math.round((interval + 0.5) * SECOND);
  controller.Update(0);
  assert.ok(Math.abs(controller.GetVariableValue("_SpeedDelta") - -0.4) < 1e-6);
  assert.ok(entered.includes("SpeedCalc") && entered.includes("SpeedBrakeTrigger"), `entered ${entered.join(" > ")}`);
  assert.ok(entered.indexOf("SpeedBrakeTrigger") > entered.indexOf("SpeedCalc"));
  assert.equal(controller.GetVariableValue("_BrakeTriggered"), 1);
  assert.ok(Math.abs(controller.GetVariableValue("_SpeedDeltaLatched") - -0.4) < 1e-6);
  t.diagnostic(`states entered: ${entered.join(" > ")}`);
});
