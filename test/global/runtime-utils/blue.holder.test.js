import assert from "node:assert/strict";
import { test } from "node:test";

import { blue, BlueResManQueue, CjsBluePaths, IBluePaths, IBlueResMan } from "../../../npm/dist/global/blue/index.js";
import { CjsSchema } from "../../../npm/dist/global/schema/index.js";

test("the slots are filled before anything can read them", () =>
{
  // The holder constructs nothing it holds, so it is a leaf of the module
  // graph and its body runs before any importer's. There is never a null to
  // capture, which is what lets a consumer write blue.resMan.GetResource(...)
  // without a guard.
  assert.equal(blue.resMan instanceof IBlueResMan, true);
  assert.equal(blue.paths instanceof CjsBluePaths, true);
  assert.equal(blue.paths instanceof IBluePaths, true);
});

test("asking an uncomposed manager says so at the call site", () =>
{
  assert.throws(() => blue.resMan.GetResource("res:/model/ship.gr2"),
    /^Error: IBlueResMan\.GetResource must be implemented\.$/u);
});

test("an uncomposed paths service answers rather than refusing", () =>
{
  // The two differ on purpose. An uncomposed manager cannot answer "fetch me
  // this" at all. An uncomposed paths service CAN answer "is it here": no -
  // which is what Carbon returns for a file absent from the local machine, and
  // what Tr2Mesh's low-detail probe is already written for.
  assert.equal(blue.paths.FileExistsLocally("res:/model/ship.gr2"), false);

  // What it genuinely cannot do without a file system is still refused.
  assert.throws(() => blue.paths.GetDirectoryContents("res:/model/"),
    /^Error: CjsBluePaths does not implement IBluePaths\.GetDirectoryContents\.$/u);
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
  // prototype chain - so it would name the contract instead of itself.
  CjsSchema.define(RecordingResMan, { className: "RecordingResMan", fields: {} });

  const previous = blue.resMan;
  blue.resMan = new RecordingResMan();
  try
  {
    assert.deepEqual(blue.resMan.GetResource("res:/texture/a.dds"), { path: "res:/texture/a.dds" });
    assert.deepEqual(blue.resMan.asked, [ "res:/texture/a.dds" ]);
    // Only what it overrode answers; the rest still refuses, naming the class
    // that failed to honour the contract rather than the contract's file.
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
  const names = Contract => Object.getOwnPropertyNames(Contract.prototype)
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
