import assert from "node:assert/strict";
import test from "node:test";
import { blue, BlueAsyncRes, BlueResMan, MotherLode } from "../../../npm/dist/blue/blue/index.js";
import "../../support/frameLoop.js";

/** A concrete test resource whose owned value comes through the native load hook. */
class ValueResource extends BlueAsyncRes
{
  value = null;
  async _DoLoad()
  {
    this.value = await blue.resMan.ReadResourceObjectPayload(this, this._dataStream.data);
    return BlueAsyncRes.LoadingResult.LR_SUCCESS;
  }
  _DoPrepare() { return this.value !== null; }
  _OnShutdown() { this.value = null; }
}

/** Install and restore the one global manager; resources retain no manager attachment. */
function managerFor(t, read, options = {})
{
  const previous = blue.resMan;
  const manager = new BlueResMan({ source: { Read: read }, ...options });
  blue.resMan = manager;
  manager.RegisterObjectLoader("val", bytes => bytes[0]);
  manager.RegisterExtension("val", ValueResource);
  t.after(() => { try { manager.Clear(); } finally { blue.resMan = previous; } });
  return manager;
}

/** A controllable source completion used to exercise late results. */
function deferred()
{
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

test("native attempts settle on one handle and retain no event or manager callbacks", async t =>
{
  let reads = 0;
  const manager = managerFor(t, () => new Uint8Array([ ++reads ]));
  const resource = manager.GetResource("res:/example.val");
  assert.equal(resource.IsLoading(), true);
  assert.equal(await manager.Ready(resource), resource);
  assert.equal(resource.value, 1);
  assert.equal(manager.GetResourcePayload(resource), null);
  assert.equal(resource._revision, 1);
  assert.equal(await manager.ReloadResource(resource.GetPath()), resource);
  assert.equal(resource.value, 2);
  assert.equal(resource._revision, 2, "the reload's prepare is one more change for owners to pull");
  for (const key of ["__reloadHook", "__objectLoader", "__lifecycleController", "__state", "state", "object"])
    assert.equal(Object.hasOwn(resource, key), false, key);
  for (const key of ["OnEvent", "Ready", "GetPayload", "SetState", "IsCurrent"])
    assert.equal(key in resource, false, key);
  const operation = resource._loadAttempt;
  assert.equal(operation, null);
});

test("failure stays prepared and bad until an explicit same-handle Reload", async t =>
{
  let reads = 0;
  const manager = managerFor(t, () =>
  {
    reads += 1;
    if (reads === 1) throw new Error("read failed");
    return new Uint8Array([ 7 ]);
  });
  const resource = manager.GetResource("res:/failure.val");
  await assert.rejects(manager.Ready(resource), /read failed/);
  for (let i = 0; i < 100; i++)
  {
    assert.equal(resource.IsGood(), false);
    resource.KeepAlive();
  }
  await assert.rejects(manager.Ready(resource), /read failed/);
  assert.equal(reads, 1);
  assert.equal(resource.IsPrepared(), true);
  assert.equal(resource.IsLoading(), false);
  assert.equal(manager.GetResourceStatus(resource).purged, false);
  resource.Reload();
  assert.equal(await manager.Ready(resource), resource);
  assert.equal(reads, 2);
});

test("an inactivity purge revives the same handle and respects the retry cap", async t =>
{
  let reads = 0;
  const manager = managerFor(t, () => new Uint8Array([ ++reads ]));
  const resource = manager.GetResource("res:/purge.val");
  await manager.Ready(resource);
  manager.motherLode.PurgeInactive({ time: 1e12, maxIdleMilliseconds: 1 });
  assert.equal(manager.GetResourceStatus(resource).purged, true);
  assert.equal(resource.value, null);
  resource.KeepAlive();
  assert.equal(await manager.Ready(resource), resource);
  assert.equal(manager.Lookup(resource.GetPath()), resource);
  assert.equal(reads, 2);
  manager._MarkResourcePurged(resource);
  resource._revivalAttempts = manager.maxReloadAttempts;
  resource.KeepAlive();
  assert.equal(resource.IsGood(), false);
  assert.equal(reads, 2);
  resource.Reload();
  await manager.Ready(resource);
  assert.equal(reads, 3);
});

test("a cancelled source result cannot overwrite a later attempt", async t =>
{
  const first = deferred();
  let reads = 0;
  const manager = managerFor(t, () => ++reads === 1 ? first.promise : new Uint8Array([ 9 ]));
  const resource = manager.GetResource("res:/late.val");
  const old = manager.Ready(resource);
  await Promise.resolve();
  await Promise.resolve();
  resource.Reload();
  await assert.rejects(old, { code: "CJS_RESOURCE_LOAD_CANCELLED" });
  first.resolve(new Uint8Array([ 1 ]));
  await manager.Ready(resource);
  assert.equal(resource.value, 9);
  assert.equal(resource.IsGood(), true);
});

test("a cancelled reader result cannot mutate the current family data", async t =>
{
  const first = deferred(), started = deferred();
  let decodes = 0;
  const manager = managerFor(t, () => new Uint8Array([ 3 ]));
  manager.RegisterObjectLoader("slow", () =>
  {
    if (++decodes !== 1) return 8;
    started.resolve();
    return first.promise;
  });
  manager.RegisterExtension("slow", ValueResource);
  const resource = manager.GetResource("res:/late.slow");
  const old = manager.Ready(resource);
  await started.promise;
  resource.Reload();
  await assert.rejects(old, { code: "CJS_RESOURCE_LOAD_CANCELLED" });
  await manager.Ready(resource);
  first.resolve(1);
  await manager.Wait();
  assert.equal(resource.value, 8);
});

test("background concurrency one cannot deadlock a native source read", async t =>
{
  const manager = managerFor(t, () => new Uint8Array([ 5 ]), { maxConcurrentLoads: 1 });
  const resources = [manager.GetResource("res:/one.val"), manager.GetResource("res:/two.val")];
  await Promise.all(resources.map(resource => manager.Ready(resource)));
  assert.deepEqual(resources.map(resource => resource.value), [5, 5]);
});

test("pending native loads pin their identity and release the pin on completion", async t =>
{
  const input = deferred();
  const manager = managerFor(t, () => input.promise);
  const resource = manager.GetResource("res:/pending.val");
  const result = manager.motherLode.PurgeInactive({ time: 1e12, maxIdleMilliseconds: 1 });
  assert.equal(result.locked, 1);
  assert.equal(manager.Lookup(resource.GetPath()), resource);
  input.resolve(new Uint8Array([4]));
  await manager.Ready(resource);
  manager.motherLode.PurgeInactive({ time: 2e12, maxIdleMilliseconds: 1 });
  assert.equal(manager.Lookup(resource.GetPath()), null);
  assert.equal(manager.GetResourceStatus(resource).purged, true);
});

test("failed loads also release their pending-load pin", async t =>
{
  const manager = managerFor(t, () => { throw new Error("unavailable"); });
  const resource = manager.GetResource("res:/failed.val");
  await assert.rejects(manager.Ready(resource), /unavailable/);
  manager.motherLode.PurgeInactive({ time: 1e12, maxIdleMilliseconds: 1 });
  assert.equal(manager.Lookup(resource.GetPath()), null);
});

for (const existing of [false, true])
test(`ReloadResource consumes cache freshness once with an ${existing ? "existing" : "uncached"} handle`, async t =>
{
  let reads = 0;
  const manager = managerFor(t, () => new Uint8Array([++reads]));
  class FreshFormat { static read(bytes) { return bytes[0]; } }
  manager.RegisterExtension("val", ValueResource, { Format: FreshFormat });
  const path = "res:/fresh.val";
  const first = existing ? manager.GetResource(path, { cacheSource: true }) : null;
  if (first) await manager.Ready(first);
  else await manager.ReadResource(path, { cacheSource: true });
  assert.equal(reads, 1);
  const resource = await manager.ReloadResource(path, { cacheSource: true });
  if (first) assert.equal(resource, first);
  assert.equal(resource.value, 2);
  assert.deepEqual(await manager.ReadResource(path), new Uint8Array([2]));
  assert.equal(reads, 2, "the fresh retained source survives format reading");
});

test("extension re-registration changes new handles while a reload keeps its captured route", async t =>
{
  const manager = managerFor(t, () => new Uint8Array([4]));
  const old = manager.GetResource("res:/old.val");
  await manager.Ready(old);
  manager.RegisterObjectLoader("val", bytes => bytes[0] + 10);
  manager.RegisterExtension("val", ValueResource);
  assert.equal(await manager.ReloadResource("res:/old.val"), old);
  assert.equal(old.value, 4);
  const fresh = manager.GetResource("res:/new.val");
  await manager.Ready(fresh);
  assert.equal(fresh.value, 14);
});

test("automatic identity purge follows the configured cadence", async t =>
{
  let time = 0;
  const manager = managerFor(t, () => new Uint8Array([1]), {
    motherLode: new MotherLode({ now: () => time, cacheSize: 0 })
  });
  manager.RegisterObjectLoader("plain", () => 1);
  manager.RegisterExtension("plain", ValueResource);
  // On by default: a second's cadence and 30 s of identity idleness, with no payload release.
  assert.equal(manager.IsAutoPurgeEnabled(), true);
  assert.equal(manager.GetAutoPurgePolicy().intervalMilliseconds, 1000);
  assert.equal(manager.GetAutoPurgePolicy().maxIdleMilliseconds, 30000);
  assert.equal(manager.GetAutoPurgePolicy().payloadMaxIdleMilliseconds, undefined);
  manager.SetAutoPurgePolicy({ intervalMilliseconds: 10, maxIdleMilliseconds: 20,
    payloadMaxIdleMilliseconds: 5, now: () => time });
  const resource = manager.GetResource("res:/auto.plain");
  await manager.Ready(resource);
  manager.PumpAutoPurge({time});
  time = 5;
  manager.Update({purge: {time}});
  time = 10;
  manager.Update({purge: false});
  manager.Update({purge: {time}});
  assert.equal(manager.GetResourceStatus(resource).purged, false, "within maxIdleMilliseconds");
  time = 20;
  manager.Update({purge: {time}});
  assert.equal(manager.GetResourceStatus(resource).purged, true);
  assert.equal(manager.Lookup(resource.GetPath()), null);
  manager.SetAutoPurgePolicy(false);
  assert.equal(manager.PumpAutoPurge({time: 100}), null);
});

test("an automatic purge policy naming no limit takes the default identity limit", t =>
{
  const manager = managerFor(t, () => new Uint8Array([1]));
  manager.SetAutoPurgePolicy({ intervalMilliseconds: 50 });
  assert.equal(manager.GetAutoPurgePolicy().maxIdleMilliseconds, BlueResMan.defaultAutoPurgePolicy.maxIdleMilliseconds);
  manager.SetAutoPurgePolicy({ payloadMaxIdleMilliseconds: 500 });
  assert.equal(manager.GetAutoPurgePolicy().maxIdleMilliseconds, undefined, "a payload-only policy keeps identities");
  manager.SetAutoPurgePolicy(null);
  assert.equal(manager.IsAutoPurgeEnabled(), false);
});
