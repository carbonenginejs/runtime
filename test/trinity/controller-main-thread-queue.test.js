import * as CcpLog from "../../npm/dist/global/logging/ccpLog.js";
import test from "node:test";
import assert from "node:assert/strict";
import { be } from "../../npm/dist/global/blue/index.js";
import {
  ContinueOnMainThread,
  ExecuteMainThreadActions,
  ITr2StateMachineStateFinalizer,
  Tr2ActionPlayCurveSet,
  Tr2Controller,
  Tr2ControllerFloatVariable,
  Tr2StateMachine,
  Tr2StateMachineState,
  Tr2StateMachineTransition
} from "../../npm/dist/trinity/index.js";

/** A transition that always fires toward a fixed destination. */
function alwaysTo(destination)
{
  return new (class extends Tr2StateMachineTransition
  {
    CanActivate()
    {
      return true;
    }
    GetDestination()
    {
      return destination;
    }
    GetVariableMask()
    {
      return 0n;
    }
  })();
}

/** A plain action recording its lifecycle into `events` under `name`. */
function recordingAction(name, events, canTransition = () => true)
{
  return {
    Link() {},
    Unlink() {},
    Start()
    {
      events.push(`${name}:start`);
    },
    Stop()
    {
      events.push(`${name}:stop`);
    },
    CanTransition()
    {
      events.push(`${name}:canTransition`);
      return canTransition();
    }
  };
}

test("ContinueOnMainThread defers until ExecuteMainThreadActions (ContinueOnMainThread.cpp:14-52)", () =>
{
  ExecuteMainThreadActions();
  const events = [];
  ContinueOnMainThread(() => events.push("a"));
  ContinueOnMainThread(() => events.push("b"));
  assert.deepEqual(events, []);
  ExecuteMainThreadActions();
  assert.deepEqual(events, ["a", "b"]);
  ExecuteMainThreadActions();
  assert.deepEqual(events, ["a", "b"]);
});

test("actions queued during a drain wait for the next drain unless a nested drain asks for another pass", () =>
{
  ExecuteMainThreadActions();
  const events = [];
  ContinueOnMainThread(() =>
  {
    events.push("outer");
    ContinueOnMainThread(() => events.push("queued-late"));
  });
  ExecuteMainThreadActions();
  assert.deepEqual(events, ["outer"]);
  ExecuteMainThreadActions();
  assert.deepEqual(events, ["outer", "queued-late"]);

  // A nested call only bumps the invocation count; the outer loop then swaps
  // and runs one more batch (ContinueOnMainThread.cpp:26-50).
  events.length = 0;
  ContinueOnMainThread(() =>
  {
    events.push("first");
    ContinueOnMainThread(() => events.push("second"));
    ExecuteMainThreadActions();
    events.push("after-nested");
  });
  ExecuteMainThreadActions();
  assert.deepEqual(events, ["first", "after-nested", "second"]);
});

test("a throwing action drops the rest of its batch and resets the queue state", () =>
{
  ExecuteMainThreadActions();
  const events = [];
  ContinueOnMainThread(() =>
  {
    throw new Error("boom");
  });
  ContinueOnMainThread(() => events.push("dropped"));
  assert.throws(() => ExecuteMainThreadActions(), /boom/);
  ExecuteMainThreadActions();
  assert.deepEqual(events, []);
  ContinueOnMainThread(() => events.push("next"));
  ExecuteMainThreadActions();
  assert.deepEqual(events, ["next"]);
});

test("state actions start and stop at once; Stop runs before the finalizer is asked (Fixes CE-198)", () =>
{
  ExecuteMainThreadActions();
  const events = [];
  let canFinalize = false;
  const controller = new Tr2Controller();
  controller.updateThrottle = false;
  const source = new Tr2StateMachineState();
  source.name = "source";
  source.actions = [recordingAction("source", events)];
  const destination = new Tr2StateMachineState();
  destination.name = "destination";
  destination.actions = [recordingAction("destination", events)];
  let fire = false;
  source.transitions = [new (class extends Tr2StateMachineTransition
  {
    CanActivate()
    {
      return fire;
    }
    GetDestination()
    {
      return destination;
    }
    GetVariableMask()
    {
      return 0n;
    }
  })()];
  source.finalizer = new (class extends ITr2StateMachineStateFinalizer
  {
    CanTransition()
    {
      events.push("finalizer");
      return canFinalize;
    }
  })();
  const machine = new Tr2StateMachine();
  machine.startState = source;
  machine.states = [source, destination];
  controller.stateMachines = [machine];
  controller.Link({});

  controller.Start();
  assert.deepEqual(events, ["source:start"]);

  fire = true;
  canFinalize = true;
  controller.Update(0.1);
  // Fixes CE-198: Stop runs directly, then the finalizer is asked, as before trinity 85a2b621.
  assert.deepEqual(events, ["source:start", "source:canTransition", "source:stop", "finalizer", "destination:start"]);
  assert.equal(machine.currentState, destination);
  ExecuteMainThreadActions();
  assert.deepEqual(events, ["source:start", "source:canTransition", "source:stop", "finalizer", "destination:start"]);
});

test("a state entered by FollowTransitions starts its actions before its transitions are evaluated (Fixes CE-198)", () =>
{
  ExecuteMainThreadActions();
  const events = [];
  const controller = new Tr2Controller();
  const a = new Tr2StateMachineState();
  a.name = "a";
  const b = new Tr2StateMachineState();
  b.name = "b";
  const c = new Tr2StateMachineState();
  c.name = "c";
  b.actions = [recordingAction("b", events)];
  a.transitions = [alwaysTo(b)];
  b.transitions = [alwaysTo(c)];
  const machine = new Tr2StateMachine();
  machine.startState = a;
  machine.states = [a, b, c];
  controller.stateMachines = [machine];
  controller.Link({});
  controller.Start();
  // Tr2StateMachine.cpp:145-149: Update(ALL) runs straight after Start; b's
  // action has already started when b's transition is evaluated.
  assert.equal(machine.currentState, c);
  assert.deepEqual(events, ["b:start", "b:canTransition", "b:stop"]);
  ExecuteMainThreadActions();
  assert.deepEqual(events, ["b:start", "b:canTransition", "b:stop"]);
});

test("a variable a state's action writes is current when that state's transitions are evaluated (CE-198)", () =>
{
  ExecuteMainThreadActions();
  const controller = new Tr2Controller();
  controller.updateThrottle = false;
  const armed = new Tr2ControllerFloatVariable();
  armed.name = "armed";
  controller.variables = [armed];

  // The entry state writes `armed`; its only transition reads it.
  const entry = new Tr2StateMachineState();
  entry.name = "entry";
  entry.actions = [{
    Link() {},
    Unlink() {},
    Start(owner)
    {
      owner.SetVariable("armed", 1);
    },
    Stop() {},
    CanTransition()
    {
      return true;
    }
  }];
  const ready = new Tr2StateMachineState();
  ready.name = "ready";
  const transition = new Tr2StateMachineTransition();
  transition.name = "ready";
  transition.condition = "armed > 0";
  entry.transitions = [transition];

  const machine = new Tr2StateMachine();
  machine.startState = entry;
  machine.states = [entry, ready];
  controller.stateMachines = [machine];
  controller.Link({});

  // No drain and no further Update: the transition must already see armed = 1.
  controller.Start();
  assert.equal(controller.GetVariableValue("armed"), 1);
  assert.equal(machine.currentState, ready);
});

test("Tr2Controller queues updateable Updates with Blue ticks (Tr2Controller.cpp:257-267)", t =>
{
  ExecuteMainThreadActions();
  const frame = 133000000000000000;
  t.mock.method(be.os, "GetCurrentFrameTime", () => frame);
  const calls = [];
  const controller = new Tr2Controller();
  controller.updateThrottle = false;
  controller.Link({});
  controller.RegisterUpdateable({
    Update(realTime, simTime)
    {
      calls.push([realTime, simTime]);
    }
  });
  controller.Start();
  controller.Update(1);
  assert.equal(calls.length, 0);
  ExecuteMainThreadActions();
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1], frame);
  // Real time is be.os actual time: Blue ticks on the runtime epoch, an exact Number.
  assert.equal(Number.isSafeInteger(calls[0][0]) && calls[0][0] > 0, true, "real time is runtime-epoch Blue ticks");
});

test("the synced-range probe reads Blue's frame-latched clock, so the start frame always allows transition", () =>
{
  // No mock: Blue's frame time only moves when the OS pumps, so wall time
  // passing inside one frame must not change the answer. Under the old
  // performance.now clock this returned false once any time had elapsed.
  const owner = { PlayCurveSet() {}, GetRangeDuration: () => 2 };
  const controller = { GetOwner: () => owner, RegisterUpdateable() {} };
  const action = new Tr2ActionPlayCurveSet();
  action.syncToRange = true;
  action.rangeName = "range";
  action.Start(controller);
  const until = performance.now() + 5;
  while (performance.now() < until)
  {
    // spin so wall time advances
  }
  assert.equal(action.CanTransition(), true);
  assert.equal(action.CanTransition(), true);
});

test("state run times are TimeAsFloat tick differences of Blue frame time", t =>
{
  ExecuteMainThreadActions();
  const start = 133000000000000000;
  let ticks = start;
  t.mock.method(be.os, "GetCurrentFrameTime", () => ticks);
  const controller = new Tr2Controller();
  const state = new Tr2StateMachineState();
  const machine = new Tr2StateMachine();
  machine.startState = state;
  machine.states = [state];
  controller.stateMachines = [machine];
  controller.Link({});
  controller.Start();
  assert.equal(machine.GetStateRunTime(), 0);
  ticks = start + 25000000;
  assert.equal(machine.GetStateRunTime(), 2.5);
  assert.equal(machine.GetMachineRunTime(), 2.5);
  ExecuteMainThreadActions();
});

test("the state-machine loop guard logs Carbon's CCP_LOGERR text (Tr2StateMachine.cpp:136)", t =>
{
  const reports = [];
  const sink = (channel, type, userData, message) => reports.push(message);
  CcpLog.UnregisterLogEcho(CcpLog.LogToDebugger);
  CcpLog.RegisterLogEcho(sink);
  t.after(() =>
  {
    CcpLog.UnregisterLogEcho(sink);
    CcpLog.RegisterLogEcho(CcpLog.LogToDebugger);
  });
  const state = {
    Link() {},
    Start() {},
    Update()
    {
      return state;
    }
  };
  const machine = new Tr2StateMachine();
  machine.name = "looping";
  machine.states = [state];
  machine.startState = state;
  machine.Link({});
  machine.Start();
  assert.deepEqual(reports, ["Tr2StateMachine: infinite loop in state machine looping detected"]);
});

test("a missing transition destination logs Carbon's CCP_LOGERR text (Tr2StateMachineTransition.cpp:66-69)", t =>
{
  const reports = [];
  const sink = (channel, type, userData, message) => reports.push(message);
  CcpLog.UnregisterLogEcho(CcpLog.LogToDebugger);
  CcpLog.RegisterLogEcho(sink);
  t.after(() =>
  {
    CcpLog.UnregisterLogEcho(sink);
    CcpLog.RegisterLogEcho(CcpLog.LogToDebugger);
  });
  const transition = new Tr2StateMachineTransition();
  transition.name = "nowhere";
  const source = { GetStateMachine: () => ({ GetStateByName: () => null }) };
  transition.Link(source);
  assert.equal(transition.GetDestination(), null);
  assert.deepEqual(reports, ["Invalid destination state name nowhere for state machine transition"]);

  // Linking a source with no state machine resolves nothing and logs nothing
  // (Tr2StateMachineTransition.cpp:43-47).
  reports.length = 0;
  new Tr2StateMachineTransition().Link({ GetStateMachine: () => null });
  assert.deepEqual(reports, []);
});
