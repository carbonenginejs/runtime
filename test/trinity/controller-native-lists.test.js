import assert from "node:assert/strict";
import test from "node:test";
import { BlueList } from "../../npm/dist/global/blue/BlueList.js";
import { Copier } from "../../npm/dist/global/blue/Copier.js";
import { DictReader } from "../../npm/dist/global/blue/DictReader.js";
import { CjsModel } from "../../npm/dist/global/model/CjsModel.js";
import { CjsSchema, meta } from "../../npm/dist/global/schema/index.js";
import { BLUELISTEVENT } from "../../npm/dist/global/consts/blue.js";
import { CjsBlackReader } from "../../npm/dist/resource/formats/black/core/CjsBlackReader.js";
import { Tr2Controller } from "../../npm/dist/trinity/controllers/Tr2Controller.js";
import { Tr2ControllerEventHandler } from "../../npm/dist/trinity/controllers/Tr2ControllerEventHandler.js";
import { Tr2ControllerFloatVariable } from "../../npm/dist/trinity/controllers/expression/Tr2ControllerFloatVariable.js";
import { Tr2StateMachine } from "../../npm/dist/trinity/controllers/state/Tr2StateMachine.js";

const fields = [
  ["stateMachines", Tr2StateMachine, "Tr2StateMachine"],
  ["variables", Tr2ControllerFloatVariable, "Tr2ControllerFloatVariable"],
  ["eventHandlers", Tr2ControllerEventHandler, "Tr2ControllerEventHandler"]
];
const { BELIST_INSERTED, BELIST_REMOVED, BELIST_UNLOADSTART, BELIST_LOADFINISHED, BELIST_MOVED, BELIST_SWAPPED } = BLUELISTEVENT;

function Info(list)
{
  const info = {};
  list.GetInfo(info);
  return info;
}

function Variable(name, value)
{
  const variable = new Tr2ControllerFloatVariable();
  variable.name = name;
  variable.defaultValue = value;
  variable.Initialize();
  return variable;
}

function Record(object, names, events)
{
  for (const name of names)
  {
    const original = object[name];
    object[name] = function(...args)
    {
      events.push(name);
      return original.apply(this, args);
    };
  }
}

function Observe(controller)
{
  const events = [], original = controller.OnListModified;
  controller.OnListModified = function(event, key, key2, value, list)
  {
    events.push({ event, key, key2, value, list, items: Array.from(list), notify: Info(list).notify });
    return original.call(this, event, key, key2, value, list);
  };
  return events;
}

test("controller constructor owns three independently configured subscribed BlueLists", () =>
{
  const first = new Tr2Controller(), second = new Tr2Controller();
  for (const [field, Type, className] of fields)
  {
    const list = first[field], child = new Type();
    assert.equal(Object.getPrototypeOf(list), BlueList.prototype);
    assert.equal(Array.isArray(list), true);
    assert.notEqual(list, second[field]);
    assert.deepEqual(Info(list), { iid: Type, clsid: className, listOps: 0, notify: first });
    assert.equal(list.Append(child), true);
    assert.equal(list.GetAt(0), child);
    assert.equal(list.Append({}), false);
    assert.equal(list.Append(null), false);
    assert.equal(list.Append(new Tr2Controller()), false);
    assert.equal(list.length, 1);
  }
});

test("state-machine list operations link/start and stop/unlink real children in native order", t =>
{
  const controller = new Tr2Controller(), machine = new Tr2StateMachine(), calls = [];
  Record(machine, ["Link", "Unlink", "Start", "Stop"], calls);
  controller.Link({});
  controller.Start();
  t.after(() => controller.Unlink());
  assert.equal(controller.stateMachines.Append(machine), true);
  assert.deepEqual(calls, ["Link", "Unlink", "Start"]);
  assert.equal(machine.GetController(), controller);
  calls.length = 0;
  assert.equal(controller.stateMachines.Remove(0), true);
  // Native OnListModified calls Stop before Unlink; Unlink itself also stops.
  assert.deepEqual(calls, ["Stop", "Unlink", "Stop"]);
  assert.equal(machine.GetController(), null);
});

test("unlinked insertions wait for Link, and linked event-handler edits notify exactly once", t =>
{
  const controller = new Tr2Controller(), machine = new Tr2StateMachine();
  const handler = new Tr2ControllerEventHandler(), calls = [];
  Record(handler, ["Link", "Unlink"], calls);
  controller.stateMachines.Append(machine);
  controller.eventHandlers.Append(handler);
  assert.equal(machine.GetController(), null);
  assert.deepEqual(calls, []);
  controller.Link({});
  t.after(() => controller.Unlink());
  assert.equal(machine.GetController(), controller);
  assert.deepEqual(calls, ["Link", "Unlink"]);
  calls.length = 0;
  controller.eventHandlers.Remove(0);
  assert.deepEqual(calls, ["Unlink"]);
  controller.eventHandlers.Insert(-1, handler);
  assert.deepEqual(calls, ["Unlink", "Link", "Unlink"]);
});

test("variable edits stop playback, rebuild destinations and preserve the current owner", t =>
{
  const controller = new Tr2Controller(), owner = {};
  const first = Variable("first", 2), second = Variable("second", 3);
  controller.variables.Append(first);
  controller.Link(owner);
  controller.Start();
  t.after(() => controller.Unlink());
  const oldBuffer = controller.GetVariableBuffer();
  controller.variables.Append(second);
  const insertedBuffer = controller.GetVariableBuffer();
  assert.equal(controller.isPlaying, false);
  assert.equal(controller.GetOwner(), owner);
  assert.notEqual(insertedBuffer, oldBuffer);
  assert.deepEqual(Array.from(insertedBuffer), [2, 3]);
  first.SetValue(7);
  second.SetValue(9);
  assert.deepEqual(Array.from(insertedBuffer), [7, 9]);
  assert.deepEqual(Array.from(oldBuffer), [2]);
  controller.Start();
  controller.variables.Remove(0);
  const removedBuffer = controller.GetVariableBuffer();
  assert.equal(controller.isPlaying, false);
  assert.equal(controller.GetOwner(), owner);
  assert.deepEqual(Array.from(removedBuffer), [9]);
  second.SetValue(11);
  assert.deepEqual(Array.from(removedBuffer), [11]);
  // Removal already happened before native Unlink walks the remaining list.
  // The removed variable still targets the previous buffer; do not repair it here.
  first.SetValue(13);
  assert.deepEqual(Array.from(insertedBuffer), [13, 9]);
  assert.deepEqual(controller.GetVariableView().map(entry => [entry.name, entry.index, entry.offset]), [["second", 0, 0]]);
});

test("controller ignores native loading, move and swap events without relinking", t =>
{
  const controller = new Tr2Controller(), machine = new Tr2StateMachine(), handler = new Tr2ControllerEventHandler();
  controller.stateMachines.Append(machine);
  controller.eventHandlers.Append(handler);
  controller.variables.Append(Variable("x", 4));
  controller.Link({});
  controller.Start();
  t.after(() => controller.Unlink());
  const calls = [], buffer = controller.GetVariableBuffer();
  Record(controller, ["Link", "Unlink"], calls);
  Record(machine, ["Link", "Unlink", "Start", "Stop"], calls);
  Record(handler, ["Link", "Unlink"], calls);
  for (const [field] of fields)
  {
    const list = controller[field];
    for (const event of [BELIST_UNLOADSTART, BELIST_LOADFINISHED, BELIST_MOVED, BELIST_SWAPPED])
      controller.OnListModified(event, 0, 0, list[0], list);
  }
  controller.variables.Swap(0, 0);
  controller.variables.Move(0, 0);
  controller.variables.Remove(-1);
  assert.deepEqual(calls, []);
  assert.equal(controller.GetVariableBuffer(), buffer);
  assert.equal(controller.isPlaying, true);
});

test("notification payloads require exact self exposure even for nominal subclasses", t =>
{
  class UnexposedMachine extends Tr2StateMachine {}
  class UnexposedHandler extends Tr2ControllerEventHandler {}
  for (const [Type, className] of [[UnexposedMachine, "ControllerListUnexposedMachine"], [UnexposedHandler, "ControllerListUnexposedHandler"]])
  {
    CjsSchema.define(Type, { className });
    meta.carbon.interfaceTable({ interfaces: [], chainTo: null })(Type);
  }
  const controller = new Tr2Controller(), machine = new UnexposedMachine(), handler = new UnexposedHandler(), calls = [];
  controller.Link({});
  controller.Start();
  t.after(() => controller.Unlink());
  assert.equal(CjsSchema.cast(machine, Tr2StateMachine), machine);
  assert.equal(CjsSchema.cast(handler, Tr2ControllerEventHandler), handler);
  Record(machine, ["Link", "Unlink", "Start", "Stop"], calls);
  Record(handler, ["Link", "Unlink"], calls);
  for (const [list, value] of [[controller.stateMachines, machine], [controller.eventHandlers, handler]])
  {
    assert.equal(list.Append(value), false);
    controller.OnListModified(BELIST_INSERTED, 0, 0, value, list);
    controller.OnListModified(BELIST_REMOVED, 0, 0, value, list);
  }
  assert.deepEqual(calls, []);
  assert.equal(machine.GetController(), null);
});

test("legacy child helpers retain the list and explicitly notify once", t =>
{
  const controller = new Tr2Controller(), machine = new Tr2StateMachine();
  const list = controller.stateMachines, events = Observe(controller);
  controller.Link({});
  t.after(() => controller.Unlink());
  CjsModel.addChild(controller, "stateMachines", machine);
  assert.equal(machine.GetController(), controller);
  CjsModel.removeChild(controller, "stateMachines", machine);
  assert.equal(machine.GetController(), null);
  assert.equal(controller.stateMachines, list);
  assert.equal(Info(list).notify, controller);
  assert.deepEqual(events.map(entry => entry.event), [BELIST_INSERTED, BELIST_REMOVED]);
  assert.deepEqual(events.map(entry => entry.key), [0, 0]);
});

test("DictReader reads existing child identities into subscribed lists without changing the held factory seam", () =>
{
  const controller = new Tr2Controller(), list = controller.variables, events = Observe(controller);
  const old = Variable("old", 1), incoming = Variable("new", 6);
  list.Append(old);
  events.length = 0;
  new DictReader().ReadInto(controller, { variables: [incoming, incoming] });
  assert.equal(controller.variables, list);
  assert.deepEqual(Array.from(list), [incoming, incoming]);
  assert.equal(Info(list).notify, controller);
  assert.deepEqual(events.map(entry => entry.event), [BELIST_UNLOADSTART, BELIST_LOADFINISHED]);
  assert.deepEqual(events[0].items, [old]);
  assert.deepEqual(events[1].items, [incoming, incoming]);
});

test("retained from and SetValues paths populate configured lists and initialize authored variables", t =>
{
  const controller = Tr2Controller.from({
    variables: [{ _type: "Tr2ControllerFloatVariable", _id: "shared", name: "x", defaultValue: 4 }, { _ref: "shared" }],
    stateMachines: [{ _type: "Tr2StateMachine", name: "machine" }],
    eventHandlers: [{ _type: "Tr2ControllerEventHandler", name: "event" }]
  });
  const list = controller.variables;
  assert.equal(list[0], list[1]);
  assert.equal(list[0].GetValue(), 4);
  for (const [field] of fields) assert.equal(Info(controller[field]).notify, controller);
  const events = Observe(controller);
  controller.SetValues({ variables: [{ _type: "Tr2ControllerFloatVariable", name: "replacement", defaultValue: 8 }] });
  assert.equal(controller.variables, list);
  assert.equal(Info(list).notify, controller);
  assert.deepEqual(events.map(entry => entry.event), [BELIST_UNLOADSTART, BELIST_LOADFINISHED]);
  assert.equal(list[0].GetValue(), 8);
  controller.Link({});
  t.after(() => controller.Unlink());
  assert.deepEqual(Array.from(controller.GetVariableBuffer()), [8]);
});

test("canonical Black loading retains constructor-owned lists and initializes real children", t =>
{
  const fixture = new BlackFixture();
  const bytes = fixture.Finish(fixture.Object(1, "Tr2Controller", [
    ["variables", Concat([U32(2), fixture.Object(2, "Tr2ControllerFloatVariable", [["name", fixture.String("gain")], ["defaultValue", F32(2.5)]]), fixture.Object(2)])],
    ["stateMachines", Concat([U32(1), fixture.Object(3, "Tr2StateMachine")])],
    ["eventHandlers", Concat([U32(1), fixture.Object(4, "Tr2ControllerEventHandler")])]
  ]));
  const createdLists = [], events = [], original = Tr2Controller.prototype.OnListModified;
  Tr2Controller.prototype.OnListModified = function(event, key, key2, value, list)
  {
    events.push(event);
    createdLists.push(list);
    assert.equal(Info(list).notify, this);
    return original.call(this, event, key, key2, value, list);
  };
  t.after(() => { Tr2Controller.prototype.OnListModified = original; });
  const reader = new CjsBlackReader(bytes, { schema: null });
  const controller = reader.ReadRuntime().root;
  assert.deepEqual(events, [BELIST_LOADFINISHED, BELIST_LOADFINISHED, BELIST_LOADFINISHED]);
  assert.deepEqual(createdLists, [controller.variables, controller.stateMachines, controller.eventHandlers]);
  assert.equal(controller.variables[0], controller.variables[1]);
  assert.equal(controller.variables[0], reader.references.get(2));
  assert.equal(controller.variables[0].GetValue(), 2.5);
  assert.equal(reader.reader.AtEnd(), true);
  assert.deepEqual(reader.reports, []);
  controller.Link({});
  t.after(() => controller.Unlink());
  assert.deepEqual(Array.from(controller.GetVariableBuffer()), [2.5, 2.5]);
  assert.equal(controller.stateMachines[0].GetController(), controller);
});

test("Copier preserves destination list configuration and observer with shared child identity", t =>
{
  const source = new Tr2Controller(), destination = new Tr2Controller();
  const variable = Variable("shared", 5);
  source.variables.Append(variable);
  source.variables.Append(variable);
  source.stateMachines.Append(new Tr2StateMachine());
  source.eventHandlers.Append(new Tr2ControllerEventHandler());
  destination.variables.Append(Variable("old", 99));
  const lists = fields.map(([name]) => destination[name]), events = Observe(destination);
  assert.equal(new Copier().CopyTo(source, destination), destination);
  for (const [index, [name, Type, className]] of fields.entries())
  {
    assert.equal(destination[name], lists[index]);
    assert.deepEqual(Info(destination[name]), { iid: Type, clsid: className, listOps: 0, notify: destination });
    assert.notEqual(destination[name][0], source[name][0]);
  }
  assert.equal(destination.variables[0], destination.variables[1]);
  assert.equal(destination.variables[0].GetValue(), 5);
  assert.equal(destination.IsLinked(), false);
  assert.deepEqual(events.map(entry => entry.event), [BELIST_LOADFINISHED, BELIST_UNLOADSTART, BELIST_LOADFINISHED, BELIST_LOADFINISHED]);
  destination.Link({});
  t.after(() => destination.Unlink());
  const fresh = new Copier().CloneTo(source);
  assert.ok(fresh);
  for (const [name] of fields) assert.equal(Info(fresh[name]).notify, fresh);
});

test("custom expression conveniences preserve absent-variable results without native exposure", () =>
{
  const controller = new Tr2Controller();
  assert.equal(controller.GetFloatVariableByName("missing"), undefined);
  assert.equal(controller.GetVariableValue("missing"), 0);
  assert.equal(controller.GetVariableValue("missing", -2), -2);
  assert.equal(controller.SetVariableValue("missing", 9), false);
  controller.variables.Append(Variable("value", 3));
  assert.equal(controller.GetFloatVariableByName("value"), 3);
  assert.equal(controller.SetVariableValue("value", 5), true);
  assert.equal(controller.GetVariableValue("value", -2), 5);
  controller.variables[0].value = null;
  assert.equal(controller.GetVariableValue("value", -2), -2, "retained convenience handles a nullish JS value");
  assert.equal(controller.GetFloatVariableByName("value"), null, "the optional-value accessor does not apply that fallback");
  for (const name of ["GetTime", "GetVariableValue", "SetVariableValue", "GetExpressionContext"])
  {
    const method = CjsSchema.getMethod(Tr2Controller, name);
    assert.equal(method.impl.status, "custom");
    assert.equal(method.carbon?.method, undefined);
  }
  const owner = {}, stateMachine = new Tr2StateMachine();
  assert.deepEqual(controller.GetExpressionContext(owner, stateMachine, { key: 7 }), { key: 7, controller, owner, stateMachine, time: 0 });
});

/** Authored minimal Black framing; schema facts come only from runtime declarations. */
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
function F32(value) { const bytes = new Uint8Array(4); new DataView(bytes.buffer).setFloat32(0, value, true); return bytes; }
