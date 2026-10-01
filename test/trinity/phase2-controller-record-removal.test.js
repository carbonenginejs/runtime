import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema, meta } from "../../npm/dist/global/schema/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { BlueList, Copier, DictReader, IInitialize, INotify, IListNotify, blue } from "../../npm/dist/global/blue/index.js";
import { Traverse } from "../../npm/dist/global/blue/find.js";
import { GetResources } from "../../npm/dist/global/blue/getResources.js";
import { BLUELISTEVENT } from "../../npm/dist/global/consts/blue.js";
import { Tr2ControllerReference } from "../../npm/dist/trinity/controllers/Tr2ControllerReference.js";
import { Tr2ControllerEventHandler } from "../../npm/dist/trinity/controllers/Tr2ControllerEventHandler.js";
import { Tr2TimelineEntry } from "../../npm/dist/trinity/controllers/timeline/Tr2TimelineEntry.js";
import { Tr2TimelineController } from "../../npm/dist/trinity/controllers/timeline/Tr2TimelineController.js";
import { Tr2Controller } from "../../npm/dist/trinity/controllers/Tr2Controller.js";
import { ITr2Controller } from "../../npm/dist/trinity/controllers/index.js";
import { ITr2ControllerAction } from "../../npm/dist/trinity/controllers/action/ITr2ControllerAction.js";

class Action extends ITr2ControllerAction
{
  name = "";
  calls = [];
  Link(owner) { this.calls.push(["link", owner]); }
  Unlink() { this.calls.push(["unlink"]); }
  Start(owner) { this.calls.push(["start", owner]); }
  Stop(owner) { this.calls.push(["stop", owner]); }
}
CjsSchema.define(Action, { className: "Phase2RecordAction", fields: { name: { type: "string", edit: { read: true, write: true, persist: true } } } });
meta.carbon.interfaceTable({ interfaces: [Action, ITr2ControllerAction], chainTo: null })(Action, { kind: "class" });

test("three records have native bases without model conveniences or invented struct exposure", () =>
{
  assert.equal(Object.getPrototypeOf(Tr2ControllerReference.prototype), ITr2Controller.prototype);
  assert.equal(Object.getPrototypeOf(Tr2ControllerEventHandler.prototype), IListNotify.prototype);
  assert.equal(Object.getPrototypeOf(Tr2TimelineEntry.prototype), Object.prototype);
  assert.deepEqual([...mappedInterfaces(Tr2ControllerReference)], [Tr2ControllerReference, IInitialize, INotify, ITr2Controller]);
  assert.deepEqual([...mappedInterfaces(Tr2ControllerEventHandler)], [Tr2ControllerEventHandler, IListNotify]);
  assert.deepEqual([...mappedInterfaces(Tr2TimelineEntry)], []);
  for (const Type of [Tr2ControllerReference, Tr2ControllerEventHandler, Tr2TimelineEntry])
    for (const key of ["SetValues", "UpdateValues", "GetResources", "Traverse", "OnEvent"])
      assert.equal(key in new Type(), false, Type.name + "." + key);
});

test("reference declarations preserve stored path and runtime loaded controller order", () =>
{
  const members = CjsSchema.getSchema(Tr2ControllerReference).members;
  assert.deepEqual(members.map(member => member.name), ["path", "controller"]);
  assert.equal(members[0].type.kind, "path");
  assert.equal(members[0].edit.notify, true);
  assert.equal(members[0].edit.persist, true);
  assert.equal(members[1].edit.read, true);
  assert.notEqual(members[1].edit.persist, true);
  assert.deepEqual(CjsSchema.getSchema(Tr2ControllerEventHandler).members.map(member => member.name), ["name", "actions"]);
});

test("declared reference initialization loads once and replays pending owner intent", async t =>
{
  const originalInitialize = Tr2ControllerReference.prototype.Initialize;
  const originalNotify = Tr2ControllerReference.prototype.OnModified;
  let initialized = 0, notified = 0;
  t.mock.method(Tr2ControllerReference.prototype, "Initialize", function()
  {
    initialized++;
    return originalInitialize.call(this);
  });
  t.mock.method(Tr2ControllerReference.prototype, "OnModified", function(name)
  {
    notified++;
    return originalNotify.call(this, name);
  });
  const previous = blue.resMan, paths = [];
  let resolve;
  blue.resMan = { LoadObject(path) { paths.push(path); return new Promise(done => { resolve = done; }); } };
  t.after(() => { blue.resMan = previous; });
  const reference = new DictReader({ declarations: true }).CreateObject({ _type: "Tr2ControllerReference", path: "res:/record.black" });
  assert.equal(initialized, 1);
  assert.equal(notified, 0, "mapped Initialize suppresses per-member notifications during construction");
  assert.deepEqual(paths, ["res:/record.black"]);
  const owner = {}, calls = [], loaded = new Tr2Controller();
  loaded.Link = value => calls.push(["link", value]);
  loaded.SetVariable = (name, value) => calls.push([name, value]);
  loaded.Start = () => calls.push(["start"]);
  reference.Link(owner);
  reference.SetVariable("amount", 3);
  reference.Start();
  resolve(loaded);
  await Promise.resolve();
  assert.equal(reference.controller, loaded);
  assert.deepEqual(calls, [["link", owner], ["amount", 3], ["start"]]);
});

test("typed controller loads reject nominal-only objects without exposed query identity", async t =>
{
  class NominalController extends ITr2Controller { IsLinked() { return false; } }
  const previous = blue.resMan;
  blue.resMan = { async LoadObject() { return new NominalController(); } };
  t.after(() => { blue.resMan = previous; });
  const reference = new Tr2ControllerReference();
  reference.path = "res:/wrong.black";
  assert.equal(await reference.ResolveController(), null);
  assert.equal(reference.controller, null);
});

test("reference copy omits runtime owner and controller and initializes the copied path", async t =>
{
  const previous = blue.resMan, paths = [];
  const loaded = new Tr2Controller();
  blue.resMan = { async LoadObject(path) { paths.push(path); return loaded; } };
  t.after(() => { blue.resMan = previous; });
  const source = new Tr2ControllerReference();
  source.path = "res:/copy.black";
  source.controller = new Tr2Controller();
  source.Link({});
  const copy = new Copier().CopyTo(source);
  assert.ok(copy);
  assert.notEqual(copy, source);
  assert.equal(copy.GetOwner(), null);
  assert.equal(copy.controller, null);
  await Promise.resolve();
  assert.equal(copy.controller, loaded);
  assert.deepEqual(paths, ["res:/copy.black"]);
});

test("event action list owns exact native metadata and notification lifecycle", () =>
{
  const handler = new Tr2ControllerEventHandler(), owner = {}, info = {};
  handler.actions.GetInfo(info);
  assert.deepEqual(info, { iid: ITr2ControllerAction, clsid: null, listOps: 0, notify: handler });
  const first = new Action();
  assert.equal(handler.actions.Append(first), true);
  assert.deepEqual(first.calls, []);
  handler.Link(owner);
  assert.deepEqual(first.calls, [["link", owner]]);
  handler.Unlink();
  handler.Unlink();
  assert.deepEqual(first.calls.slice(1), [["unlink"], ["unlink"]]);
  const second = new Action();
  assert.equal(handler.actions.Append(second), true);
  assert.deepEqual(second.calls, [["link", owner]], "native Unlink retains its controller");
  handler.actions.Remove(1);
  assert.deepEqual(second.calls.at(-1), ["unlink"]);
  assert.equal(handler.actions.Append({ Link() {}, Unlink() {} }), false);
});

test("event callback rejects unmapped actions and ignores unrelated lists", () =>
{
  const handler = new Tr2ControllerEventHandler();
  handler.Link({});
  const duck = { Link() { assert.fail("unmapped link"); }, Unlink() { assert.fail("unmapped unlink"); } };
  for (const event of [BLUELISTEVENT.BELIST_INSERTED, BLUELISTEVENT.BELIST_REMOVED])
    handler.OnListModified(event, 0, 0, duck, handler.actions);
  const action = new Action();
  handler.OnListModified(BLUELISTEVENT.BELIST_INSERTED, 0, 0, action, []);
  assert.deepEqual(action.calls, []);
});

test("real controller event dispatch starts all actions before stopping any", () =>
{
  const controller = new Tr2Controller(), handler = new Tr2ControllerEventHandler(), calls = [];
  handler.name = "event";
  for (const name of ["a", "b"])
  {
    const action = new Action();
    action.Start = owner => { assert.equal(owner, controller); calls.push(name + " start"); };
    action.Stop = owner => { assert.equal(owner, controller); calls.push(name + " stop"); };
    handler.actions.Append(action);
  }
  controller.eventHandlers.Append(handler);
  controller.Link({});
  controller.Start();
  controller.HandleEvent("event");
  assert.deepEqual(calls, ["a start", "b start", "a stop", "b stop"]);
  controller.Unlink();
});

test("handler construction and copy preserve list identity shared actions and observer", () =>
{
  const source = new DictReader({ declarations: true }).CreateObject({ _type: "Tr2ControllerEventHandler", name: "copied", actions: [{ _type: "Phase2RecordAction", name: "shared" }] });
  assert.equal(Object.getPrototypeOf(source.actions), BlueList.prototype);
  source.actions.Append(source.actions.GetAt(0));
  const copy = new Copier().CopyTo(source);
  assert.ok(copy);
  assert.equal(copy.name, "copied");
  assert.equal(copy.actions.GetSize(), 2);
  assert.equal(copy.actions[0], copy.actions[1]);
  assert.notEqual(copy.actions[0], source.actions[0]);
  const info = {};
  copy.actions.GetInfo(info);
  assert.equal(info.notify, copy);
  const seen = [];
  Traverse(copy, value => seen.push(value));
  assert.equal(seen.includes(copy.actions[0]), true);
  assert.deepEqual(GetResources(copy), []);
});

test("timeline owner constructs and edits the plain three-field entry", () =>
{
  const entry = new Tr2TimelineEntry();
  assert.deepEqual([entry.startTime, entry.endTime, entry.trackID], [0, 0, 0]);
  const fields = CjsSchema.getSchema(Tr2TimelineEntry).members;
  assert.deepEqual(fields.map(field => field.name), ["startTime", "endTime", "trackID"]);
  assert.deepEqual(fields.map(field => field.type.kind), ["float32", "float32", "uint32"]);
  const owner = new Tr2TimelineController();
  owner.AddAction(new Action(), 2, 5, 3);
  assert.equal(owner.entries[0].constructor, Tr2TimelineEntry);
  assert.deepEqual([owner.entries[0].startTime, owner.entries[0].endTime, owner.entries[0].trackID], [2, 5, 3]);
  assert.equal(owner.GetActionStartTime(0), 2);
  assert.equal(owner.GetActionEndTime(0), 5);
});
