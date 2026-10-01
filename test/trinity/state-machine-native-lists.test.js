import assert from "node:assert/strict";
import test from "node:test";
import { BlueList } from "../../npm/dist/global/blue/BlueList.js";
import { blue } from "../../npm/dist/global/blue/blue.js";
import { Copier } from "../../npm/dist/global/blue/Copier.js";
import { DictReader } from "../../npm/dist/global/blue/DictReader.js";
import { IListNotify } from "../../npm/dist/global/blue/IListNotify.js";
import { INotify } from "../../npm/dist/global/blue/INotify.js";
import { CjsModel } from "../../npm/dist/global/model/CjsModel.js";
import { CjsSchema, meta } from "../../npm/dist/global/schema/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { BLUELISTEVENT } from "../../npm/dist/global/consts/blue.js";
import { CjsBlackReader } from "../../npm/dist/resource/formats/black/core/CjsBlackReader.js";
import { Tr2Controller } from "../../npm/dist/trinity/controllers/Tr2Controller.js";
import { Tr2StateMachine } from "../../npm/dist/trinity/controllers/state/Tr2StateMachine.js";
import { Tr2StateMachineState } from "../../npm/dist/trinity/controllers/state/Tr2StateMachineState.js";

const {
  BELIST_INSERTED, BELIST_REMOVED, BELIST_UNLOADSTART, BELIST_LOADFINISHED,
  BELIST_MOVED, BELIST_SWAPPED, BELIST_LOADING, BELIST_UNLOADING
} = BLUELISTEVENT;

function Info(list)
{
  const info = {};
  list.GetInfo(info);
  return info;
}

function State(name)
{
  const state = new Tr2StateMachineState();
  state.name = name;
  return state;
}

function AssertOwned(machine, list = machine.states)
{
  assert.equal(machine.states, list);
  assert.equal(Object.getPrototypeOf(list), BlueList.prototype);
  assert.deepEqual(Info(list), {
    iid: Tr2StateMachineState, clsid: "Tr2StateMachineState", listOps: 0, notify: machine
  });
}

function Observe(machine)
{
  const events = [], original = machine.OnListModified;
  machine.OnListModified = function(event, key, key2, value, list)
  {
    events.push({ event, key, key2, value, list, items: Array.from(list), notify: Info(list).notify });
    return original.call(this, event, key, key2, value, list);
  };
  return events;
}

function TraceStates(entries)
{
  const calls = [], stack = [];
  for (const [state, label] of entries)
  {
    for (const method of ["Link", "Unlink", "Start", "Stop"])
    {
      const original = state[method], name = `${label}.${method}`;
      state[method] = function(...args)
      {
        calls.push([name, stack.at(-1) ?? null]);
        stack.push(name);
        try { return original.apply(this, args); }
        finally { stack.pop(); }
      };
    }
  }
  return calls;
}

function Linked(t, machine, states = Array.from(machine.states))
{
  const controller = new Tr2Controller();
  machine.Link(controller);
  assert.equal(machine.GetController(), controller);
  t.after(() =>
  {
    machine.Unlink();
    // Removed/nonmember states need not be in the machine's cleanup walk.
    for (const state of states) state.Unlink();
  });
  return controller;
}

test("a machine owns an independent subscribed BlueList admitting the real state self identity", () =>
{
  const machine = new Tr2StateMachine(), other = new Tr2StateMachine(), state = State("idle");
  AssertOwned(machine);
  AssertOwned(other);
  assert.notEqual(machine.states, other.states);
  assert.equal(Array.isArray(machine.states), true);
  assert.deepEqual([...mappedInterfaces(Tr2StateMachineState)], [Tr2StateMachineState, IListNotify, INotify]);
  assert.equal(CjsSchema.cast(state, CjsModel), state);
  assert.equal(CjsSchema.cast(state, IListNotify), state);
  assert.equal(CjsSchema.cast(state, INotify), state);
  assert.equal(machine.states.Append(state), true);
  assert.equal(machine.states.GetAt(0), state);
  assert.equal(machine.states.Append({}), false);
  assert.equal(machine.states.Append(null), false);
  assert.equal(machine.states.Append(new Tr2StateMachine()), false);
  assert.equal(machine.states.length, 1);
  assert.equal(state.GetStateMachine(), null, "unlinked insertion does not link the child");
  const member = CjsSchema.getSchema(Tr2StateMachine).members.find(entry => entry.name === "states");
  assert.equal(member.type.kind, "list");
  assert.equal(member.type.itemType, "Tr2StateMachineState");
  assert.equal(member.edit.read, true);
  assert.equal(member.edit.persist, true);
});

test("unlinked insertion waits for Link and linked insertion links without starting the state", t =>
{
  const machine = new Tr2StateMachine(), first = State("first"), second = State("second");
  const calls = TraceStates([[first, "first"], [second, "second"]]);
  assert.equal(machine.states.Append(first), true);
  assert.deepEqual(calls, []);
  Linked(t, machine, [first, second]);
  assert.equal(first.GetStateMachine(), machine);
  assert.deepEqual(calls, [["first.Link", null], ["first.Unlink", "first.Link"]]);
  calls.length = 0;
  assert.equal(machine.states.Append(second), true);
  assert.deepEqual(calls, [["second.Link", null], ["second.Unlink", "second.Link"]]);
  assert.equal(second.GetStateMachine(), machine);
  assert.equal(second._isActive, false);
  assert.equal(machine.currentState, null);
});

test("removing the current state stops it, starts the start state, then unlinks with its nested Stop", t =>
{
  const machine = new Tr2StateMachine(), removed = State("removed"), start = State("start");
  machine.states.Append(removed);
  machine.states.Append(start);
  machine.startState = removed;
  Linked(t, machine, [removed, start]);
  machine.Start();
  assert.equal(machine.currentState, removed);
  machine.startState = start;
  const calls = TraceStates([[removed, "removed"], [start, "start"]]);
  machine._stateStartTime = -1;
  assert.equal(machine.states.Remove(0), true);
  assert.deepEqual(calls, [
    ["removed.Stop", null], ["start.Start", null],
    ["removed.Unlink", null], ["removed.Stop", "removed.Unlink"]
  ]);
  assert.equal(machine.currentState, start);
  assert.equal(machine._stateStartTime, blue.os.GetCurrentFrameTime());
  assert.equal(start.GetStateMachine(), machine);
  assert.equal(start._isActive, true);
  assert.equal(removed.GetStateMachine(), null);
  assert.equal(removed._isActive, false);
});

test("removing a noncurrent state restarts the start state without stopping the previous current state", t =>
{
  const machine = new Tr2StateMachine();
  const active = State("active"), removed = State("removed"), start = State("start");
  for (const state of [active, removed, start]) machine.states.Append(state);
  machine.startState = active;
  Linked(t, machine, [active, removed, start]);
  machine.Start();
  machine.startState = start;
  const calls = TraceStates([[active, "active"], [removed, "removed"], [start, "start"]]);
  assert.equal(machine.states.Remove(1), true);
  assert.deepEqual(calls, [
    ["start.Start", null], ["removed.Unlink", null], ["removed.Stop", "removed.Unlink"]
  ]);
  assert.equal(machine.currentState, start);
  assert.equal(active._isActive, true, "native removal does not stop a different current state");
  assert.equal(start._isActive, true);
  assert.equal(removed.GetStateMachine(), null);
});

test("unlinked removal still selects and calls Start on the start state", () =>
{
  const machine = new Tr2StateMachine(), removed = State("removed"), start = State("start");
  machine.states.Append(removed);
  machine.states.Append(start);
  machine.startState = start;
  const calls = TraceStates([[removed, "removed"], [start, "start"]]);
  machine._stateStartTime = -1;
  assert.equal(machine.states.Remove(0), true);
  assert.deepEqual(calls, [["start.Start", null], ["removed.Unlink", null]]);
  assert.equal(machine.GetController(), null);
  assert.equal(machine.currentState, start);
  assert.equal(machine._stateStartTime, blue.os.GetCurrentFrameTime());
  assert.equal(start.GetStateMachine(), null);
  assert.equal(start._isActive, false, "the real Start cannot activate an unlinked state");
});

test("removing the start state itself leaves the current pointer on the now-unlinked removed state", t =>
{
  const machine = new Tr2StateMachine(), state = State("start-and-removed");
  machine.states.Append(state);
  machine.startState = state;
  Linked(t, machine, [state]);
  machine.Start();
  const calls = TraceStates([[state, "state"]]);
  assert.equal(machine.states.Remove(0), true);
  assert.deepEqual(calls, [
    ["state.Stop", null], ["state.Start", null],
    ["state.Unlink", null], ["state.Stop", "state.Unlink"]
  ]);
  assert.equal(machine.states.length, 0);
  assert.equal(machine.currentState, state);
  assert.equal(machine.startState, state);
  assert.equal(state.GetStateMachine(), null);
  assert.equal(state._isActive, false);
});

test("foreign, unknown, flag-only and bulk or reorder events do not run state lifecycle methods", t =>
{
  const machine = new Tr2StateMachine(), state = State("active");
  machine.states.Append(state);
  machine.startState = state;
  Linked(t, machine, [state]);
  machine.Start();
  const calls = TraceStates([[state, "state"]]);
  machine.OnListModified(BELIST_INSERTED, 0, 0, state, []);
  machine.OnListModified(BELIST_REMOVED, 0, 0, state, []);
  for (const event of [0, 3, BELIST_LOADING, BELIST_UNLOADING,
    BELIST_UNLOADSTART, BELIST_LOADFINISHED, BELIST_MOVED, BELIST_SWAPPED])
  {
    machine.OnListModified(event, 0, 0, state, machine.states);
  }
  assert.equal(machine.states.Swap(0, 0), true);
  assert.equal(machine.states.Move(0, 0), true);
  assert.deepEqual(calls, []);
  assert.equal(machine.currentState, state);
  assert.equal(state._isActive, true);
  machine.states.Remove(-1);
  assert.deepEqual(calls, []);
  assert.equal(machine.currentState, state, "bulk unload does not repair the runtime current pointer");
});

test("insert and remove notifications select their native event after masking load flags", t =>
{
  const machine = new Tr2StateMachine(), state = State("flagged");
  Linked(t, machine, [state]);
  const calls = TraceStates([[state, "state"]]);
  machine.OnListModified(BELIST_INSERTED | BELIST_LOADING, 0, 0, state, machine.states);
  assert.deepEqual(calls, [["state.Link", null], ["state.Unlink", "state.Link"]]);
  assert.equal(state.GetStateMachine(), machine);
  calls.length = 0;
  machine.OnListModified(BELIST_REMOVED | BELIST_UNLOADING, 0, 0, state, machine.states);
  assert.deepEqual(calls, [["state.Unlink", null], ["state.Stop", "state.Unlink"]]);
  assert.equal(state.GetStateMachine(), null);
});

test("state payload admission requires exact query exposure even for nominal subclasses", t =>
{
  class UnexposedState extends Tr2StateMachineState {}
  CjsSchema.define(UnexposedState, { className: "NativeStateListUnexposedState" });
  meta.carbon.interfaceTable({ interfaces: [], chainTo: null })(UnexposedState);
  const machine = new Tr2StateMachine(), state = new UnexposedState();
  Linked(t, machine, [state]);
  const calls = TraceStates([[state, "state"]]);
  assert.equal(CjsSchema.cast(state, Tr2StateMachineState), state);
  const duck = {
    Link() { assert.fail("duck Link must not run"); },
    Unlink() { assert.fail("duck Unlink must not run"); },
    Start() { assert.fail("duck Start must not run"); },
    Stop() { assert.fail("duck Stop must not run"); }
  };
  for (const value of [state, duck, null])
  {
    assert.equal(machine.states.Append(value), false);
    machine.OnListModified(BELIST_INSERTED, 0, 0, value, machine.states);
    machine.OnListModified(BELIST_REMOVED, 0, 0, value, machine.states);
  }
  assert.deepEqual(calls, []);
  assert.equal(machine.states.length, 0);
  assert.equal(machine.currentState, null);
  assert.equal(state.GetStateMachine(), null);
});

test("OnModified links a nonmember start state only when the machine is linked and never starts it", t =>
{
  const machine = new Tr2StateMachine(), start = State("nonmember");
  machine.startState = start;
  const calls = TraceStates([[start, "start"]]);
  assert.equal(machine.OnModified("startState"), true);
  assert.deepEqual(calls, []);
  Linked(t, machine, [start]);
  assert.equal(machine.OnModified("name"), true);
  assert.deepEqual(calls, []);
  assert.equal(machine.OnModified("startState"), true);
  assert.deepEqual(calls, [["start.Link", null], ["start.Unlink", "start.Link"]]);
  assert.equal(start.GetStateMachine(), machine);
  assert.equal(machine.states.length, 0);
  assert.equal(machine.currentState, null);
  assert.equal(start._isActive, false);
  machine.startState = null;
  calls.length = 0;
  assert.equal(machine.OnModified("startState"), true);
  assert.deepEqual(calls, []);
});

test("DictReader preserves owned storage, shared live states and the read-only current reference", t =>
{
  const machine = new Tr2StateMachine(), old = State("old"), incoming = State("incoming");
  const list = machine.states;
  list.Append(old);
  machine.currentState = old;
  const events = Observe(machine);
  // READ-only currentState is selected by the dictionary view but skipped by its writable-member filter.
  new DictReader().ReadInto(machine, { states: [incoming, incoming], startState: incoming, currentState: incoming });
  AssertOwned(machine, list);
  assert.deepEqual(Array.from(list), [incoming, incoming]);
  assert.equal(machine.startState, incoming);
  assert.equal(machine.currentState, old);
  assert.equal(incoming.GetStateMachine(), null);
  assert.deepEqual(events.map(entry => entry.event), [BELIST_UNLOADSTART, BELIST_LOADFINISHED]);
  assert.deepEqual(events[0].items, [old]);
  assert.deepEqual(events[1].items, [incoming, incoming]);
  for (const event of events)
  {
    assert.equal(event.list, list);
    assert.equal(event.notify, machine);
  }
  machine.Stop();
  Linked(t, machine);
  machine.Start();
  assert.equal(machine.currentState, incoming);
});

test("legacy from and SetValues retain configured list ownership and shared authored start references", t =>
{
  const machine = Tr2StateMachine.from({
    states: [{ _type: "Tr2StateMachineState", _id: "state", name: "initial" }, { _ref: "state" }],
    startState: { _ref: "state" }
  });
  const list = machine.states;
  AssertOwned(machine, list);
  assert.equal(list.length, 2);
  assert.equal(list[0], list[1]);
  assert.equal(machine.startState, list[0]);
  assert.equal(machine.currentState, null);
  const events = Observe(machine);
  machine.SetValues({
    states: [{ _type: "Tr2StateMachineState", _id: "replacement", name: "replacement" }, { _ref: "replacement" }],
    startState: { _ref: "replacement" }
  });
  AssertOwned(machine, list);
  assert.equal(list.length, 2);
  assert.equal(list[0].GetName(), "replacement");
  assert.equal(list[0], list[1]);
  assert.equal(machine.startState, list[0]);
  assert.equal(machine.currentState, null);
  assert.deepEqual(events.map(entry => entry.event), [BELIST_UNLOADSTART, BELIST_LOADFINISHED]);
  Linked(t, machine);
  machine.Start();
  assert.equal(machine.currentState, list[0]);
  assert.equal(list[0].GetStateMachine(), machine);
});

test("canonical Black reads real shared states into constructor-owned storage without a persisted current state", t =>
{
  const fixture = new BlackFixture();
  const bytes = fixture.Finish(fixture.Object(1, "Tr2StateMachine", [
    ["states", Concat([U32(2), fixture.Object(2, "Tr2StateMachineState", [["name", fixture.String("idle")]]), fixture.Object(2)])],
    ["startState", fixture.Object(2)]
  ]));
  const events = [], original = Tr2StateMachine.prototype.OnListModified;
  Tr2StateMachine.prototype.OnListModified = function(event, key, key2, value, list)
  {
    events.push({ event, list, owner: this, notify: Info(list).notify });
    return original.call(this, event, key, key2, value, list);
  };
  t.after(() => { Tr2StateMachine.prototype.OnListModified = original; });
  const reader = new CjsBlackReader(bytes, { schema: null });
  const machine = reader.ReadRuntime().root;
  AssertOwned(machine);
  assert.deepEqual(events.map(entry => entry.event), [BELIST_LOADFINISHED]);
  assert.equal(events[0].list, machine.states);
  assert.equal(events[0].owner, machine);
  assert.equal(events[0].notify, machine);
  assert.equal(machine.states.length, 2);
  assert.equal(machine.states[0], machine.states[1]);
  assert.equal(machine.states[0], reader.references.get(2));
  assert.equal(machine.startState, machine.states[0]);
  assert.equal(machine.currentState, null);
  assert.equal(machine.states[0].GetName(), "idle");
  assert.equal(reader.reader.AtEnd(), true);
  assert.deepEqual(reader.reports, []);
  Linked(t, machine);
  machine.Start();
  assert.equal(machine.currentState, machine.states[0]);
});

test("Copier retains existing and fresh list ownership and shares copied states with startState", t =>
{
  const source = new Tr2StateMachine(), shared = State("shared");
  source.states.Append(shared);
  source.states.Append(shared);
  source.startState = shared;
  source.currentState = shared;
  const destination = new Tr2StateMachine(), old = State("old"), list = destination.states;
  list.Append(old);
  destination.currentState = old;
  const events = Observe(destination);
  assert.equal(new Copier().CopyTo(source, destination), destination);
  AssertOwned(destination, list);
  assert.equal(list.length, 2);
  assert.notEqual(list[0], shared);
  assert.equal(list[0], list[1]);
  assert.equal(destination.startState, list[0]);
  assert.equal(list[0].GetName(), "shared");
  assert.equal(destination.currentState, old, "nonpersisted runtime state remains destination-owned");
  assert.deepEqual(events.map(entry => entry.event), [BELIST_UNLOADSTART, BELIST_LOADFINISHED]);
  assert.equal(source.states[0], shared);
  assert.equal(source.startState, shared);
  assert.equal(source.currentState, shared);
  destination.Stop();
  Linked(t, destination);
  destination.Start();
  assert.equal(destination.currentState, list[0]);
  const fresh = new Copier().CloneTo(source);
  assert.ok(fresh instanceof Tr2StateMachine);
  AssertOwned(fresh);
  assert.notEqual(fresh.states, source.states);
  assert.notEqual(fresh.states[0], shared);
  assert.equal(fresh.states[0], fresh.states[1]);
  assert.equal(fresh.startState, fresh.states[0]);
  assert.equal(fresh.currentState, null);
  Linked(t, fresh);
  fresh.Start();
  assert.equal(fresh.currentState, fresh.states[0]);
});

test("legacy addChild and removeChild notify once while retaining the machine's subscribed list", t =>
{
  const machine = new Tr2StateMachine(), child = State("child"), list = machine.states;
  Linked(t, machine, [child]);
  const calls = TraceStates([[child, "child"]]), events = Observe(machine);
  assert.equal(CjsModel.addChild(machine, "states", child), child);
  assert.equal(child.GetStateMachine(), machine);
  assert.equal(list.GetAt(0), child);
  assert.equal(CjsModel.removeChild(machine, "states", child), true);
  assert.equal(child.GetStateMachine(), null);
  assert.equal(list.length, 0);
  AssertOwned(machine, list);
  assert.deepEqual(events.map(entry => entry.event), [BELIST_INSERTED, BELIST_REMOVED]);
  assert.deepEqual(events.map(entry => entry.key), [0, 0]);
  assert.deepEqual(events.map(entry => entry.value), [child, child]);
  assert.deepEqual(calls, [
    ["child.Link", null], ["child.Unlink", "child.Link"],
    ["child.Unlink", null], ["child.Stop", "child.Unlink"]
  ]);
});

test("state lookup requires GetName while retained accessors remain custom conveniences", () =>
{
  const machine = new Tr2StateMachine(), state = State("named");
  machine.states.Append(state);
  assert.equal(machine.GetStateByName("named"), state);
  assert.equal(machine.GetStateByName("missing"), null);
  assert.equal(machine.GetState(0), state);
  assert.equal(machine.GetState(-1), null);
  assert.equal(machine.GetState(99), null);
  assert.equal(machine.GetCurrentState(), null);
  assert.equal(machine.GetStateTime(), machine.GetStateRunTime());
  const transitions = CjsSchema.getMethod(Tr2StateMachine, "_followTransitions");
  assert.equal(transitions.carbon.method, true);
  assert.equal(transitions.carbon.originalName, "FollowTransitions");
  assert.equal(transitions.impl.status, "adapted");
  for (const name of ["GetCurrentState", "GetState", "GetStateTime"])
  {
    const method = CjsSchema.getMethod(Tr2StateMachine, name);
    assert.equal(method.impl.status, "custom");
    assert.equal(method.carbon?.method, undefined);
  }
  // Deliberately bypass native admission to expose malformed legacy Array input.
  Array.prototype.push.call(machine.states, { name: "malformed" });
  assert.throws(() => machine.GetStateByName("malformed"), TypeError);
});

/** Minimal authored Black framing; runtime declarations provide all schema facts. */
class BlackFixture
{
  strings = [];
  String(value)
  {
    let index = this.strings.indexOf(value);
    if (index === -1) { index = this.strings.length; this.strings.push(value); }
    return U16(index);
  }
  Object(id, kind = null, fields = [])
  {
    if (kind === null) return U32(id);
    const parts = [this.String(kind)];
    for (const [name, value] of fields) parts.push(Concat([this.String(name), value]));
    const body = Concat(parts);
    return Concat([U32(id), U32(body.length), body]);
  }
  Finish(root)
  {
    const parts = [U16(this.strings.length)];
    for (const value of this.strings) parts.push(Concat([new TextEncoder().encode(value), new Uint8Array(1)]));
    const strings = Concat(parts), wide = U16(0);
    return Concat([U32(0xb1acf11e), U32(1), U32(strings.length), strings, U32(wide.length), wide, root]);
  }
}
function Concat(parts)
{
  const bytes = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
  let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  return bytes;
}
function U16(value) { const bytes = new Uint8Array(2); new DataView(bytes.buffer).setUint16(0, value, true); return bytes; }
function U32(value) { const bytes = new Uint8Array(4); new DataView(bytes.buffer).setUint32(0, value, true); return bytes; }
