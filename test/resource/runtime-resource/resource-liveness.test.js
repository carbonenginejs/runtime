// Renewal stands in for Carbon's reference-counted MotherLode lifetime.
import assert from "node:assert/strict";
import { test } from "node:test";
import { BlueAsyncRes, BlueResMan, blue } from "../../../npm/dist/blue/blue/index.js";
import { RegisterDataLoader } from "../../support/testDataRes.js";
import "../../support/frameLoop.js";

/** One process-wide manager, restored after every test. */
function managerFor(t)
{
  const previous = blue.resMan;
  const manager = new BlueResMan({ source: { Read: () => "{}" } });
  blue.resMan = manager;
  RegisterDataLoader(manager, "json", value => JSON.parse(value));
  t.after(() => { try { manager.Clear(); } finally { blue.resMan = previous; } });
  return manager;
}

test("IsGood renews while pure inspection leaves activity unchanged", async t =>
{
  const manager = managerFor(t), resource = manager.GetResource("res:/renew.json");
  await manager.Ready(resource);
  manager.activityTime = 100;
  resource.IsGood();
  assert.equal(resource._lastUsedTime, 100);
  manager.activityTime = 200;
  resource.IsPrepared();
  resource.IsLoading();
  manager.GetResourceStatus(resource);
  assert.equal(resource._lastUsedTime, 100);
  resource.IsGood();
  assert.equal(resource._lastUsedTime, 200);
});

test("explicit Reload cancels a prepared handle and rebuilds that same handle", async t =>
{
  const manager = managerFor(t), resource = manager.GetResource("res:/reload.json");
  await manager.Ready(resource);
  resource.Reload();
  assert.equal(resource.IsLoading(), true);
  assert.equal(resource.IsPrepared(), false);
  await manager.Ready(resource);
  assert.equal(resource.IsGood(), true);
  assert.equal(manager.Lookup(resource.GetPath()), resource);
});

test("a purged handle revives on use and successful preparation resets the retry count", async t =>
{
  const manager = managerFor(t), resource = manager.GetResource("res:/purged.json");
  await manager.Ready(resource);
  manager.PurgeInactive({ maxIdleFrames: 0, maxIdleMilliseconds: 0 });
  assert.equal(manager.GetResourceStatus(resource).purged, true);
  assert.equal(resource.IsGood(), false);
  assert.equal(manager.GetReloadAttempts(resource), 1);
  await manager.Ready(resource);
  assert.equal(manager.GetReloadAttempts(resource), 0);
  assert.equal(manager.Lookup(resource.GetPath()), resource);
});

test("a failed native resource is prepared, stays bad and never retries on use", async t =>
{
  const manager = managerFor(t);
  RegisterDataLoader(manager, "bad", () => { throw new Error("bad data"); });
  const resource = manager.GetResource("res:/failed.bad");
  await assert.rejects(manager.Ready(resource), /bad data/);
  for (let i = 0; i < 10; i++) assert.equal(resource.IsGood(), false);
  assert.equal(resource.IsPrepared(), true);
  assert.equal(resource.IsLoading(), false);
  assert.equal(manager.GetReloadAttempts(resource), 0);
});

test("retry counters belong to the manager and reset explicitly", t =>
{
  const manager = managerFor(t), resource = new BlueAsyncRes();
  resource._revivalAttempts = manager.maxReloadAttempts;
  manager.ResetReloadAttempts(resource);
  assert.equal(manager.GetReloadAttempts(resource), 0);
});

test("resources expose the inherited resource marker and no string state events", () =>
{
  class Derived extends BlueAsyncRes {}
  const resource = new Derived();
  assert.equal(BlueAsyncRes.isResource, true);
  assert.equal(Derived.isResource, true);
  assert.equal(resource.isResource, true);
  for (const name of ["OnEvent", "OnCompleted", "SetState", "state", "SetReloadHook", "SetLifecycleController"])
    assert.equal(name in resource, false, name);
});
