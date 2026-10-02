import assert from "node:assert/strict";
import test from "node:test";
import { blue, CjsBlueResMan } from "../../npm/dist/global/blue/index.js";
import { CjsLoadingObject } from "../../npm/dist/resource/index.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { Tr2Controller, Tr2ControllerReference, UnlinkReason } from "../../npm/dist/trinity/index.js";

function installLoader(t, load)
{
  const previous = blue.resMan;
  blue.resMan = { LoadObject: load };
  t.after(() => { blue.resMan = previous; });
}

function recordingController(events)
{
  const controller = new Tr2Controller();
  controller.Link = owner => events.push([ "link", owner ]);
  controller.Unlink = reason => events.push([ "unlink", reason ]);
  controller.Start = () => events.push([ "start" ]);
  controller.Stop = () => events.push([ "stop" ]);
  controller.SetVariable = (name, value) => events.push([ "variable", name, value ]);
  return controller;
}

test("reference loads through Blue and replays the latest variables before pending Start", async t =>
{
  let resolve;
  const paths = [];
  installLoader(t, path => { paths.push(path); return new Promise(done => { resolve = done; }); });
  const events = [];
  const controller = recordingController(events);
  const reference = new Tr2ControllerReference();
  const owner = {};
  reference.path = "res:/controller.red";
  assert.equal(reference.Initialize(), true, "Tr2ControllerReference.cpp:12-19 retains Initialize's bool return");
  reference.Link(owner);
  reference.SetVariable("IsWarping", 0);
  reference.SetVariable("IsWarping", 1);
  reference.Start();
  assert.equal(reference.controller, null);
  resolve(controller);
  await Promise.resolve();
  assert.deepEqual(paths, [ reference.path ]);
  assert.equal(reference.controller, controller);
  assert.deepEqual(events, [ [ "link", owner ], [ "variable", "IsWarping", 1 ], [ "start" ] ]);
  assert.equal(Tr2ControllerReference.registerResourceResolver, undefined, "no optional production resolver remains");
  assert.equal(CjsSchema.getField(Tr2ControllerReference, "path").type.kind, "path");
});

test("Stop and Unlink cancel pending start intent; detached owners receive no late variables", async t =>
{
  const pending = [];
  installLoader(t, () => new Promise(resolve => pending.push(resolve)));
  for (const unlink of [ false, true ])
  {
    const reference = new Tr2ControllerReference();
    reference.path = "res:/controller.red";
    const owner = {};
    const events = [];
    reference.Initialize();
    reference.Link(owner);
    reference.SetVariable("pending", 1);
    reference.Start();
    if (unlink) reference.Unlink(UnlinkReason.DELETING);
    else reference.Stop();
    pending.shift()(recordingController(events));
    await Promise.resolve();
    assert.deepEqual(events, unlink ? [] : [ [ "link", owner ], [ "variable", "pending", 1 ] ]);
    assert.equal(reference.IsLinked(), !unlink);
  }
});

test("owner changes while loading discard the former owner's pending values", async t =>
{
  let resolve;
  installLoader(t, () => new Promise(done => { resolve = done; }));
  const reference = new Tr2ControllerReference();
  reference.path = "res:/controller.red";
  reference.Initialize();
  reference.Link({});
  reference.SetVariable("old", 4);
  reference.Start();
  const owner = {};
  reference.Link(owner);
  reference.SetVariable("new", 8);
  const events = [];
  resolve(recordingController(events));
  await Promise.resolve();
  assert.deepEqual(events, [ [ "link", owner ], [ "variable", "new", 8 ] ]);
});

test("path notifications retire the old controller and reject superseded same-path loads", async t =>
{
  const pending = [];
  installLoader(t, () => new Promise(resolve => pending.push(resolve)));
  const events = [];
  const reference = new Tr2ControllerReference();
  reference.controller = recordingController(events);
  const owner = {};
  reference.Link(owner);
  reference.path = "res:/controller.red";
  reference.OnModified("path");
  reference.OnModified("path");
  assert.equal(reference.controller, null, "cpp:25 drops the previous controller immediately");
  assert.deepEqual(events, [ [ "link", owner ], [ "unlink", undefined ] ]);
  const stale = recordingController([]);
  const current = recordingController(events);
  pending[1](current);
  await Promise.resolve();
  pending[0](stale);
  await Promise.resolve();
  assert.equal(reference.controller, current);
  reference.path = "res:/next.red";
  reference.OnModified("path");
  reference.path = "";
  reference.OnModified("path");
  pending[2](stale);
  await Promise.resolve();
  assert.equal(reference.controller, null, "clearing the path also invalidates in-flight work");
});

test("failed or wrongly typed loads leave the reference empty and can be retried", async t =>
{
  let attempt = 0;
  const controller = new Tr2Controller();
  installLoader(t, () =>
  {
    attempt += 1;
    if (attempt === 1) throw new Error("synthetic failure");
    return attempt === 2 ? {} : controller;
  });
  const reference = new Tr2ControllerReference();
  reference.path = "res:/controller.red";
  assert.equal(await reference.ResolveController(), null);
  assert.equal(await reference.ResolveController(), null, "LoadObject<ITr2Controller> rejects another root type");
  assert.equal(await reference.ResolveController(), controller);
});

test("references sharing a path get separate controllers built from one cached decode", async t =>
{
  let reads = 0;
  const manager = new CjsBlueResMan({ source: { Read() { reads += 1; return new Uint8Array([ 1 ]); } } });
  manager.RegisterExtension("red", CjsLoadingObject, {
    Format: class { static read() { return { _type: "Tr2Controller", variables: [ { _type: "Tr2ControllerFloatVariable", name: "x", value: 2 } ] }; } },
    Target: Tr2Controller
  });
  const previous = blue.resMan;
  blue.resMan = manager;
  t.after(() => { blue.resMan = previous; });
  const a = new Tr2ControllerReference();
  const b = new Tr2ControllerReference();
  a.path = b.path = "res:/controller.red";
  await Promise.all([ a.ResolveController(), b.ResolveController() ]);
  assert.ok(a.controller && b.controller);
  assert.notEqual(a.controller, b.controller, "BlueResMan.cpp:785 builds for each caller");
  assert.notEqual(a.controller.variables[0], b.controller.variables[0]);
  assert.equal(reads, 1);
});
