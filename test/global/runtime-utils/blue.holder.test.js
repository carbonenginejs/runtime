import assert from "node:assert/strict";
import { test } from "node:test";

import { blue, BlueResManQueue, CjsBluePaths, CjsResMan, IBlueEvents, IBlueOS, IBluePaths, IBlueResMan } from "../../../npm/dist/global/blue/index.js";
import * as blueExports from "../../../npm/dist/global/blue/index.js";
import { installBlueServices } from "../../../npm/dist/global/blue/blue.js";
import { CjsSchema } from "../../../npm/dist/global/schema/index.js";

test("the slots are filled before anything can read them", () =>
{
  // The holder's body runs before any importer's, so there is never a null to
  // capture, which is what lets a consumer write blue.resMan.GetResource(...)
  // without a guard. The manager is real by default, as Carbon's is.
  assert.equal(blue.resMan instanceof CjsResMan, true);
  assert.ok(CjsSchema.cast(blue.resMan, IBlueResMan), "it is Carbon's IBlueResMan");
  assert.equal(blue.paths instanceof CjsBluePaths, true);
  assert.equal(blue.paths instanceof IBluePaths, true);
});

test("an unconfigured manager answers: a path it cannot fetch fails on the resource", () =>
{
  const resource = blue.resMan.GetResource("res:/model/holder-unconfigured.gr2");

  assert.equal(resource.IsFailed(), true, "no source is configured yet");
  blue.resMan.Delete("res:/model/holder-unconfigured.gr2");
});

test("the manager is registered for ticks, as Carbon's Initialize does (BlueResMan.cpp:113)", () =>
{
  assert.ok(CjsSchema.cast(blue.resMan, IBlueEvents), "it is an IBlueEvents");
  assert.equal(blue.os.IsRegisteredForTicks(blue.resMan), true);
});

class HolderManager extends IBlueResMan
{
  OnTick() { throw new Error("installation must not tick"); }
  GetResource() { throw new Error("installation must not fetch"); }
  LoadObject() { throw new Error("installation must not load objects"); }
  Shutdown() { throw new Error("installation must not retire borrowed services"); }
}
CjsSchema.carbon.inherit(IBlueEvents)(HolderManager);

class HolderOS extends IBlueOS
{
  registrations = [];
  calls = [];
  hook = null;

  RegisterForTicks(cb, cookie = null)
  {
    this.calls.push({ operation: "register", cb, cookie });
    if (this.hook) this.hook("register", "before", cb, cookie);
    if (!this.Has(cb, cookie)) this.registrations.push({ cb, cookie });
    if (this.hook) this.hook("register", "after", cb, cookie);
  }

  UnregisterForTicks(cb, cookie = null)
  {
    this.calls.push({ operation: "unregister", cb, cookie });
    if (this.hook) this.hook("unregister", "before", cb, cookie);
    const index = this.registrations.findIndex(entry => entry.cb === cb && entry.cookie === cookie);
    if (index >= 0) this.registrations.splice(index, 1);
    if (this.hook) this.hook("unregister", "after", cb, cookie);
  }

  Has(cb, cookie)
  {
    return this.registrations.some(entry => entry.cb === cb && entry.cookie === cookie);
  }

  PumpOS() { throw new Error("installation must not pump"); }
  Startup() { throw new Error("installation must not start services"); }
}

function holderFixture(t)
{
  const old = { resMan: new HolderManager(), paths: new IBluePaths(), os: new HolderOS() };
  const next = { resMan: new HolderManager(), paths: new IBluePaths(), os: new HolderOS() };
  const previous = installBlueServices(old);
  const cookie = old.os.calls[0].cookie;
  old.os.calls.length = 0;
  t.after(() =>
  {
    old.os.hook = null;
    next.os.hook = null;
    installBlueServices(previous);
  });
  return { old, next, cookie };
}

function assertHolder(services)
{
  assert.equal(blue.resMan, services.resMan);
  assert.equal(blue.paths, services.paths);
  assert.equal(blue.os, services.os);
}

test("named installation is internal and retains registration owners", t =>
{
  const classes = blue.classes;
  const enums = blue.enums;
  const { old } = holderFixture(t);
  assert.equal("installBlueServices" in blueExports, false);
  assert.deepEqual(installBlueServices({ classes: {}, enums: {} }), old);
  assert.equal(blue.classes, classes);
  assert.equal(blue.enums, enums);
  assert.equal(old.os.calls.length, 0);
});

for (const names of [["resMan"], ["os"], ["resMan", "os"], ["resMan", "paths", "os"]])
{
  test(`named installation transfers ${names.join(" and ")} and restores references`, t =>
  {
    const { old, next, cookie } = holderFixture(t);
    const changes = Object.fromEntries(names.map(name => [name, next[name]]));
    const expected = { ...old, ...changes };
    const steps = [];
    for (const [label, os] of [["old", old.os], ["next", next.os]])
    {
      os.hook = (operation, phase) =>
      {
        assertHolder(old);
        if (phase === "before") steps.push([label, operation]);
      };
    }
    assert.deepEqual(installBlueServices(changes), old);
    assertHolder(expected);
    assert.deepEqual(steps, [[expected.os === old.os ? "old" : "next", "register"], ["old", "unregister"]]);
    assert.equal(expected.os.Has(expected.resMan, cookie), true);
    assert.equal(old.os.Has(old.resMan, cookie), false);
    old.os.hook = null;
    next.os.hook = null;
    assert.deepEqual(installBlueServices(old), expected);
    assertHolder(old);
    assert.equal(old.os.Has(old.resMan, cookie), true);
    assert.equal(expected.os.Has(expected.resMan, cookie), false);
  });
}

test("paths-only and unchanged installation make no tick calls", t =>
{
  const { old, next } = holderFixture(t);
  assert.deepEqual(installBlueServices(), old);
  assert.deepEqual(installBlueServices(old), old);
  assert.deepEqual(installBlueServices({ paths: next.paths }), old);
  assertHolder({ ...old, paths: next.paths });
  assert.equal(old.os.calls.length, 0);
  assert.equal(next.os.calls.length, 0);
});

test("all explicit interfaces are validated before tick side effects", t =>
{
  const { old, next } = holderFixture(t);
  for (const name of ["resMan", "paths", "os"])
  {
    for (const value of [null, undefined, {}])
    {
      assert.throws(() => installBlueServices({ ...next, [name]: value }), TypeError);
      assertHolder(old);
    }
  }
  assert.throws(() => installBlueServices({ resMan: new IBlueResMan() }), TypeError);
  for (const options of [null, [], 2]) assert.throws(() => installBlueServices(options), TypeError);
  assert.equal(old.os.calls.length, 0);
  assert.equal(next.os.calls.length, 0);
});

test("installation owns only its stable private tick cookie", t =>
{
  const { old, next, cookie } = holderFixture(t);
  const hostCookie = Symbol("host");
  assert.equal(typeof cookie, "symbol");
  old.os.RegisterForTicks(old.resMan);
  old.os.RegisterForTicks(old.resMan, hostCookie);
  next.os.RegisterForTicks(next.resMan);
  next.os.RegisterForTicks(next.resMan, hostCookie);
  installBlueServices(next);
  assert.equal(old.os.Has(old.resMan, cookie), false);
  assert.equal(next.os.Has(next.resMan, cookie), true);
  for (const host of [null, hostCookie])
  {
    assert.equal(old.os.Has(old.resMan, host), true);
    assert.equal(next.os.Has(next.resMan, host), true);
  }
  installBlueServices(old);
  assert.equal(next.os.Has(next.resMan, cookie), false);
  for (const host of [null, hostCookie]) assert.equal(next.os.Has(next.resMan, host), true);
});

for (const phase of ["before", "after"])
{
  test(`registration failure ${phase} mutation compensates without publishing`, t =>
  {
    const { old, next, cookie } = holderFixture(t);
    const failure = new Error("registration failed");
    next.os.hook = (operation, at) =>
    {
      assertHolder(old);
      if (operation === "register" && at === phase) throw failure;
    };
    assert.throws(() => installBlueServices(next), error => error === failure);
    assertHolder(old);
    assert.equal(old.os.Has(old.resMan, cookie), true);
    assert.equal(next.os.Has(next.resMan, cookie), false);
    assert.deepEqual(next.os.calls.map(call => call.operation), ["register", "unregister"]);
    assert.equal(old.os.calls.length, 0);
  });

  test(`detach failure ${phase} mutation restores the old pair and removes the candidate`, t =>
  {
    const { old, next, cookie } = holderFixture(t);
    const failure = new Error("detach failed");
    old.os.hook = (operation, at) =>
    {
      assertHolder(old);
      if (operation === "unregister" && at === phase) throw failure;
    };
    next.os.hook = () => assertHolder(old);
    assert.throws(() => installBlueServices(next), error => error === failure);
    assertHolder(old);
    assert.equal(old.os.Has(old.resMan, cookie), true);
    assert.equal(next.os.Has(next.resMan, cookie), false);
    assert.deepEqual(old.os.calls.map(call => call.operation), ["unregister", "register"]);
    assert.deepEqual(next.os.calls.map(call => call.operation), ["register", "unregister"]);
  });
}

test("registration compensation failure reports the original first and as cause", t =>
{
  const { old, next } = holderFixture(t);
  const original = new Error("register failed");
  const cleanup = new Error("candidate cleanup failed");
  next.os.hook = (operation, phase) =>
  {
    if (phase === "after") throw operation === "register" ? original : cleanup;
  };
  assert.throws(() => installBlueServices(next), error =>
  {
    assert.ok(error instanceof AggregateError);
    assert.equal(error.cause, original);
    assert.deepEqual(error.errors, [original, cleanup]);
    return true;
  });
  assertHolder(old);
});

test("detach compensation attempts both inverses and reports every failure", t =>
{
  const { old, next } = holderFixture(t);
  const original = new Error("detach failed");
  const oldCleanup = new Error("old registration failed");
  const nextCleanup = new Error("candidate cleanup failed");
  old.os.hook = (operation, phase) =>
  {
    if (phase === "after") throw operation === "unregister" ? original : oldCleanup;
  };
  next.os.hook = (operation, phase) =>
  {
    if (operation === "unregister" && phase === "after") throw nextCleanup;
  };
  assert.throws(() => installBlueServices(next), error =>
  {
    assert.ok(error instanceof AggregateError);
    assert.equal(error.cause, original);
    assert.deepEqual(error.errors, [original, oldCleanup, nextCleanup]);
    return true;
  });
  assertHolder(old);
});

test("tick hooks cannot reenter installation", t =>
{
  const { next } = holderFixture(t);
  next.os.hook = () => assert.throws(() => installBlueServices(), /cannot be reentered/);
  installBlueServices(next);
  assertHolder(next);
});

test("an uncomposed paths service answers rather than refusing", () =>
{
  // The two differ on purpose. An uncomposed manager cannot answer "fetch me
  // this" at all. An uncomposed paths service CAN answer "is it here": no -
  // which is what Carbon returns for a file absent from the local machine, and
  // what Tr2Mesh's low-detail probe is already written for.
  assert.equal(blue.paths.FileExistsLocally("res:/model/ship.gr2"), false);

  // What it genuinely cannot do without a file system is still refused.
  assert.throws(() => blue.paths.ResolvePath("res:/model/ship.gr2"),
    /^Error: CjsBluePaths does not implement IBluePaths\.ResolvePath\.$/u);
});

test("an implementation is installed into the holder, never captured from it", () =>
{
  // Reaching through the holder is what keeps the implementation swappable:
  // nobody downstream holds the manager, so replacing it needs no cooperation
  // and no moment before which it must happen.
  class RecordingResMan extends IBlueResMan
  {
    constructor() { super(); this.asked = []; }
    GetResource(path) { this.asked.push(path); return { path }; }
  }
  // Registered because every class is, and because the name is what the
  // refusal below reports. An unregistered implementation currently answers
  // with its nearest registered ancestor - CjsSchema.getClassName walks the
  // prototype chain - so it would name the interface instead of itself.
  CjsSchema.define(RecordingResMan, { className: "RecordingResMan", fields: {} });

  const previous = blue.resMan;
  blue.resMan = new RecordingResMan();
  try
  {
    assert.deepEqual(blue.resMan.GetResource("res:/texture/a.dds"), { path: "res:/texture/a.dds" });
    assert.deepEqual(blue.resMan.asked, [ "res:/texture/a.dds" ]);
    // Only what it overrode answers; the rest still refuses, naming the class
    // that failed to honour the interface rather than the interface's file.
    assert.throws(() => blue.resMan.LoadObject("res:/x.red"),
      /^Error: RecordingResMan does not implement IBlueResMan\.LoadObject\.$/u);
  }
  finally { blue.resMan = previous; }
});

test("the queue enum keeps Carbon's members and values", () =>
{
  // IBlueResMan.h:12-18. Implicit C++ enumerators, so 0-based in declaration order.
  assert.deepEqual({ ...BlueResManQueue }, { BRMQ_MAIN: 0, BRMQ_BACKGROUND: 1, BRMQ_COUNT: 2 });
  assert.equal(IBlueResMan.Queue, BlueResManQueue);
});

test("both interfaces publish the verb list Carbon publishes", () =>
{
  // The point of the split: CjsResMan has 68 public methods, and these are the
  // ones a consumer is entitled to. Adding to this list means Carbon added to
  // IBlueResMan.
  const names = Interface => Object.getOwnPropertyNames(Interface.prototype)
    .filter(name => name !== "constructor").sort();

  assert.deepEqual(names(IBlueResMan), [
    "AddToQueue", "CancelFromQueue", "GetNextIdForQueue", "GetPendingLoads", "GetPendingPrepares",
    "GetResource", "IsOnMainThread", "IsUrgentResourceLoads", "LoadObject", "PauseQueue",
    "PumpMainThreadQueue", "RegisterResourceConstructor", "ReleaseBackgroundLoadMemory",
    "ReserveBackgroundLoadMemory", "ResumeQueue", "SaveObject", "SetUrgentResourceLoads",
    "UnregisterResourceConstructor"
  ]);

  assert.deepEqual(names(IBluePaths), [
    "FileExists", "FileExistsLocally", "FileNeedsDownload", "GetDirectoryContents",
    "GetExpandedSearchPaths", "GetFileContentsWithYield", "GetSearchPath", "GetStreamFromPath",
    "InitializeStdAppPaths", "IsDirectory", "LogPaths", "ResolvePath", "ResolvePathForWriting",
    "ResolvePathToRoot", "SetSearchPath"
  ]);
});
