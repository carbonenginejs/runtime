import test from "node:test";
import assert from "node:assert/strict";
import { Tr2ControllerReference, Tr2SyncToAnimation, Tr2TimelineController, Tr2StateMachineTransition, Tr2StateMachineState, Tr2StateMachine, Tr2Controller, Tr2ActionPlayCurveSet, TriCurveSet, TriRigidOrientation, TriTorque } from "../../npm/dist/trinity/index.js";

test("animation finalizer preserves the native remaining-time comparison", () =>
{
  let remaining = 1;
  const finalizer = new Tr2SyncToAnimation();
  const layer = { GetAnimationRemainingTime: () => remaining };
  const animation = { GetAnimationLayer: () => layer };
  const controller = { GetOwner: () => ({ GetAnimationController: () => animation }) };
  for (const value of [NaN, Infinity, 1])
  {
    remaining = value;
    assert.equal(finalizer.CanTransition(controller), false);
  }
  for (const value of [-Infinity, -1, 0])
  {
    remaining = value;
    assert.equal(finalizer.CanTransition(controller), true);
  }
});

test("timeline links the appended action before appending its entry", () =>
{
  const timeline = new Tr2TimelineController();
  timeline.Link({});
  let observed;
  timeline.AddAction({ Link(controller)
  {
    observed = [controller.actions.length, controller.entries.length];
  } }, 0, 1);
  assert.deepEqual(observed, [1, 0]);
  assert.equal(timeline.entries.length, 1);
});

test("removing an active unowned timeline action does not stop or unlink it", () =>
{
  const timeline = new Tr2TimelineController();
  const calls = [];
  timeline.AddAction({ Start() {}, Stop() { calls.push("stop"); }, Unlink() { calls.push("unlink"); } }, 0, 1);
  timeline.Start();
  assert.equal(timeline.RemoveAction(0), true);
  assert.deepEqual(calls, []);
});

test("rigid orientation resets its cursor after replacing sorted keys", () =>
{
  const curve = new TriRigidOrientation();
  const key = time =>
  {
    const value = new TriTorque();
    value.time = time;
    return value;
  };
  curve.states = [key(0), key(1), key(2), key(3)];
  curve.Sort();
  curve.Seek(4);
  curve.states = [key(0), key(1)];
  curve.Sort();
  assert.equal(curve.Seek(0.5), 0);
});

test("rigid orientation participates in curve-set updates", () =>
{
  const key = new TriTorque();
  key.omega0[2] = 1;
  const curve = new TriRigidOrientation();
  curve.states = [key];
  const set = new TriCurveSet();
  set.curves = [curve];
  set.ApplyTime(1);
  assert.ok(Math.abs(curve.value[2] - Math.sin(1 - Math.exp(-1))) < 1e-6);
});

test("zero-width looping ranges preserve Carbon's NaN quirk", () =>
{
  const curve = new TriCurveSet();
  curve.SetTimeRange(2, 2, true);
  curve.PlayFrom(3);
  curve.UpdateAt(0);
  assert.ok(Number.isNaN(curve.scaledTime));
  curve.SetTimeRange(2, 2, false);
  curve.PlayFrom(3);
  curve.UpdateAt(0);
  assert.equal(curve.scaledTime, 2);
});

test("transition activation requires linking and name edits refresh the destination", () =>
{
  const transition = new Tr2StateMachineTransition();
  transition.condition = "1";
  assert.equal(transition.CanActivate(), false);
  const source = new Tr2StateMachineState();
  source.name = "source";
  const first = new Tr2StateMachineState();
  first.name = "first";
  const second = new Tr2StateMachineState();
  second.name = "second";
  transition.name = "first";
  source.transitions = [transition];
  const machine = new Tr2StateMachine();
  machine.states = [source, first, second];
  const controller = new Tr2Controller();
  controller.stateMachines = [machine];
  controller.Link({});
  assert.equal(transition.GetDestination(), first);
  transition.SetValues({ name: "second" });
  assert.equal(transition.GetDestination(), second);
  transition.Unlink();
  assert.equal(transition.CanActivate(), false);
});

test("range playback uses one frame clock and truncates negative iterations", t =>
{
  let milliseconds = 10000;
  t.mock.method(performance, "now", () => milliseconds);
  const owner = { PlayCurveSet() {}, GetRangeDuration: () => 2 };
  const controller = { GetOwner: () => owner, GetTime: () => 999, RegisterUpdateable() {} };
  const action = new Tr2ActionPlayCurveSet();
  action.syncToRange = true;
  action.rangeName = "range";
  action.Start(controller);
  assert.equal(action.CanTransition(), true);
  milliseconds = 9000;
  assert.equal(action.CanTransition(), false);
  milliseconds = 12000;
  assert.equal(action.CanTransition(), true);
  action.Update(300, 500);
  assert.equal(action.CanTransition(), false);
});

test("controller references preserve empty-path assignments and clear owners before unlinking", () =>
{
  const reference = new Tr2ControllerReference();
  let observed;
  const delegate = { Link() {}, Unlink()
  {
    observed = [reference.IsLinked(), reference.GetOwner()];
  } };
  reference.controller = delegate;
  reference.Initialize();
  assert.equal(reference.controller, delegate);
  reference.Link({});
  reference.Unlink();
  assert.deepEqual(observed, [false, null]);
});

test("missing transition destinations stay cached until linking or a name notification", () =>
{
  const transition = new Tr2StateMachineTransition();
  transition.name = "later";
  const states = [];
  const machine = { GetStateByName: name => states.find(state => state.name === name) ?? null };
  const source = { GetStateMachine: () => machine };
  transition.Link(source);
  assert.equal(transition.GetDestination(), null);
  const destination = { name: "later" };
  states.push(destination);
  assert.equal(transition.GetDestination(), null);
  transition.OnModified("name");
  assert.equal(transition.GetDestination(), destination);
});
