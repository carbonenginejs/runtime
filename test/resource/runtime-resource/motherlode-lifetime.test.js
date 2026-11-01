import assert from "node:assert/strict";
import {test, beforeEach, afterEach} from "node:test";
import {CjsSchema, blue as exposure} from "../../../npm/dist/blue/schema/index.js";
import {blue, BlueAsyncRes, BlueResMan, MotherLode, ICacheable, getMotherLodeKey} from "../../../npm/dist/blue/blue/index.js";
import {TriTextureRes} from "../../../npm/dist/resource/index.js";
import {normalizeResourcePath} from "#utils/path";

/** A device-resource fixture owning a small value and real device adapter slots. */
class CacheFixture extends TriTextureRes
{
  value = null;
  _OnShutdown() { super._OnShutdown(); this.value = null; }
}
/** Report a controlled allocation size through Carbon's ICacheable contract. */
class SizedResource extends CacheFixture
{
  size = 0;
  known = true;
  IsMemoryUsageKnown() { return this.known; }
  GetMemoryUsage() { return this.size; }
}
exposure.inherit(ICacheable)(SizedResource, {kind: "class"});
exposure.interface(ICacheable)(SizedResource);

/** Build a cache-policy fixture without scheduling a source load. */
function cacheResource(path, Resource = CacheFixture)
{
  const resource = new Resource();
  resource._path = normalizeResourcePath(path);
  return resource;
}
function insertSized(motherLode, name, size)
{
  const key = getMotherLodeKey("res:/data/" + name + ".bin");
  const resource = cacheResource(key, SizedResource);
  resource.size = size;
  resource.value = {name};
  motherLode.Insert(key, resource, {time: 0});
  return {key, resource};
}
function expire(motherLode) { return motherLode.PurgeInactive({time: 10, maxIdleMilliseconds: 5}); }
let previous;
beforeEach(() => { previous = blue.resMan; blue.resMan = new BlueResMan(); });
afterEach(() => { try { blue.resMan.Clear(); } finally { blue.resMan = previous; } });



test("MotherLode exposes canonical identity and activity diagnostics", () =>
{
  let time = 100;
  const motherLode = new MotherLode({
    cacheSize: 4096,
    now: () => time++
  });
  const resource = cacheResource("RES:/Texture/Ship.DDS");
  const key = getMotherLodeKey(resource.GetPath(), "texture/native@1");
  const result = motherLode.Insert(key, resource);

  assert.equal(result.key, key);
  assert.equal(result.resource, resource);
  assert.equal(result.inserted, true);
  assert.equal(result.replaced, false);
  assert.equal(result.displaced, null);
  assert.equal(motherLode.IsStarted(), true);
  assert.equal(motherLode.HasKey(key), true);
  assert.equal(motherLode.Has(resource.GetPath(), "texture/native@1"), true);
  assert.equal(motherLode.Lookup(key), resource);
  assert.equal(motherLode.GetSize(), 1);
  assert.equal(motherLode.GetCount(), 1);
  assert.equal(motherLode.GetCacheSize(), 4096);
  assert.deepEqual(motherLode.GetKeys(), [ key ]);
  assert.deepEqual(motherLode.GetValues(), [ resource ]);
  assert.deepEqual([ ...motherLode.Entries() ], [ [ key, resource ] ]);

  assert.equal(motherLode.Lock(key), 1);
  assert.equal(motherLode.Lock(key), 2);
  assert.equal(motherLode.Unlock(key), 1);
  assert.equal(motherLode.KeepAlive(key), resource);

  const stats = motherLode.GetStats();
  assert.equal(stats.count, 1);
  assert.equal(stats.size, 1);
  assert.equal(stats.live, 1);
  assert.equal(stats.cached, 0);
  assert.equal(stats.locked, 1);
  assert.equal(stats.bytes, 0);
  assert.equal(stats.cacheSize, 4096);
  assert.equal(stats.states.empty, 1);
  assert.deepEqual(stats.paths, [ "res:/texture/ship.dds" ]);
  assert.ok(stats.activityFrame >= 4);
});

test("MotherLode replacement and removal clean displaced resource ownership", () =>
{
  const motherLode = new MotherLode();
  const key = getMotherLodeKey("res:/data/value.bin", "raw@1");
  const first = cacheResource("res:/data/value.bin");
  const blocked = cacheResource("res:/data/value.bin");
  const replacement = cacheResource("res:/data/value.bin");
  let firstDestroyed = 0;
  let replacementDestroyed = 0;

  first.value = { value: 1 };
  first.SetAdapterResource("test", { destroy() { firstDestroyed += 1; } });
  replacement.value = { value: 2 };
  replacement.SetAdapterResource("test", { destroy() { replacementDestroyed += 1; } });

  motherLode.Insert(key, first);
  const refused = motherLode.Insert(key, blocked, { replace: false });

  assert.equal(refused.resource, first);
  assert.equal(refused.inserted, false);
  assert.equal(refused.replaced, false);
  assert.equal(motherLode.Lookup(key), first);
  assert.equal((first.value !== null), true);

  const replaced = motherLode.Insert(key, replacement);

  assert.equal(replaced.resource, replacement);
  assert.equal(replaced.inserted, true);
  assert.equal(replaced.replaced, true);
  assert.equal(replaced.displaced, first);
  assert.equal(firstDestroyed, 1);
  assert.equal(first.HasAdapterResource("test"), false);
  assert.equal((first.value !== null), false);
  assert.equal(motherLode.Lookup(key), replacement);

  assert.equal(motherLode.Delete(key), true);
  assert.equal(replacementDestroyed, 1);
  assert.equal((replacement.value !== null), false);
  assert.equal(motherLode.Delete(key), false);

  const retainedKey = getMotherLodeKey("res:/data/retained.bin");
  const retained = cacheResource("res:/data/retained.bin");
  const retainedReplacement = cacheResource("res:/data/retained.bin");
  let retainedDestroyed = 0;
  retained.value = { retained: true };
  retained.SetAdapterResource("test", { destroy() { retainedDestroyed += 1; } });
  motherLode.Insert(retainedKey, retained);

  const retainedResult = motherLode.Insert(retainedKey, retainedReplacement, { cleanup: false });

  assert.equal(retainedResult.displaced, retained);
  assert.equal(retainedDestroyed, 0);
  assert.equal(retained.HasAdapterResource("test"), true);
  assert.equal((retained.value !== null), true);
  assert.equal(motherLode.Delete(retainedKey), true);

  const failingKey = getMotherLodeKey("res:/data/failing-cleanup.bin");
  const failingOwner = cacheResource("res:/data/failing-cleanup.bin");
  failingOwner._OnShutdown = () =>
  {
    throw new Error("expected cleanup failure");
  };
  const rejectedReplacement = cacheResource("res:/data/failing-cleanup.bin");
  motherLode.Insert(failingKey, failingOwner);

  assert.throws(
    () => motherLode.Insert(failingKey, rejectedReplacement),
    error => error.code === "CJS_MOTHERLODE_CLEANUP_FAILED"
      && error.operation === "replace"
      && error.resource === failingOwner
  );
  assert.equal(motherLode.Lookup(failingKey), failingOwner);
  assert.equal(motherLode.Delete(failingKey, { cleanup: false }), true);
});

test("MotherLode clears cached entries and shuts down idempotently", () =>
{
  const motherLode = new MotherLode();
  const live = cacheResource("res:/data/live.bin");
  const { resource: cached } = insertSized(motherLode, "cached", 64);
  let cachedDestroyed = 0;

  cached.SetAdapterResource("test", { destroy() { cachedDestroyed += 1; } });
  motherLode.Insert(getMotherLodeKey(live.GetPath()), live, { time: 10 });
  assert.deepEqual(expire(motherLode).cachedKeys, [ getMotherLodeKey(cached.GetPath()) ]);

  assert.equal(motherLode.GetStats().cached, 1);
  assert.equal(motherLode.GetStats().bytes, 64);
  assert.equal(motherLode.ClearCached(), 1);
  assert.equal(cachedDestroyed, 1);
  assert.equal((cached.value !== null), false);
  assert.equal(motherLode.GetSize(), 1);

  motherLode.Shutdown();
  motherLode.Shutdown();

  assert.equal(motherLode.IsStarted(), false);
  assert.equal(motherLode.GetSize(), 0);
  assert.throws(
    () => motherLode.Insert(getMotherLodeKey("res:/data/rejected.bin"), {}),
    error => error.code === "CJS_MOTHERLODE_INACTIVE"
  );

  motherLode.Startup();
  const restarted = cacheResource("res:/data/restarted.bin");
  const restartedResult = motherLode.Insert(getMotherLodeKey(restarted.GetPath(), "legacy"), restarted);
  assert.equal(restartedResult.inserted, true);
  assert.equal(restartedResult.key, getMotherLodeKey(restarted.GetPath(), "legacy"));
  assert.equal(motherLode.Has(restarted.GetPath(), "legacy"), true);
});

test("MotherLode trims cached identities oldest-first by reported memory use", () =>
{
  const motherLode = new MotherLode({ cacheSize: 128 });
  const destroyed = [];

  const createCached = name =>
  {
    const entry = insertSized(motherLode, name, 64);
    entry.resource.SetAdapterResource("test", { destroy() { destroyed.push(name); } });
    return entry;
  };

  const first = createCached("first");
  const second = createCached("second");
  const third = createCached("third");
  const sweep = expire(motherLode);

  assert.equal(sweep.purged, 0);
  assert.deepEqual(sweep.cachedKeys, [ first.key, second.key, third.key ]);

  const trim = motherLode.TrimCache();

  assert.deepEqual(trim, {
    cacheSize: 128,
    beforeBytes: 192,
    afterBytes: 128,
    evictedBytes: 64,
    overBudget: false,
    evicted: 1,
    failed: 0,
    evictedKeys: [ first.key ],
    failedKeys: []
  });
  assert.deepEqual(destroyed, [ "first" ]);
  assert.equal((first.resource.value !== null), false);
  assert.equal(blue.resMan.GetResourceStatus(first.resource).purged, true);
  assert.equal(motherLode.Lookup(first.key), null);
  assert.equal(motherLode.Lookup(second.key), second.resource);
  assert.equal(motherLode.Lookup(third.key), third.resource);
  assert.equal(motherLode.TrimCache().evicted, 0);

  assert.equal(motherLode.SetCacheSize(64), motherLode);
  assert.deepEqual(destroyed, [ "first", "second" ]);
  assert.equal(blue.resMan.GetResourceStatus(second.resource).purged, true);
  assert.equal(motherLode.Lookup(third.key), third.resource);

  motherLode.SetCacheSize(0);
  assert.deepEqual(destroyed, [ "first", "second", "third" ]);
  assert.equal(blue.resMan.GetResourceStatus(third.resource).purged, true);
  assert.equal(motherLode.GetSize(), 0);
});

test("MotherLode validates cache-size cleanup options before changing policy", () =>
{
  const motherLode = new MotherLode({ cacheSize: 128 });

  assert.throws(
    () => motherLode.SetCacheSize(64, []),
    /set cache size options must be an object/u
  );
  assert.equal(motherLode.GetCacheSize(), 128);
});

test("MotherLode caches only expired ICacheable entries that fit, and use takes them back out", () =>
{
  const motherLode = new MotherLode({ cacheSize: 30 });
  const plainKey = getMotherLodeKey("res:/data/plain.bin");
  const plain = cacheResource(plainKey, BlueAsyncRes);
  motherLode.Insert(plainKey, plain, { time: 0 });
  const live = insertSized(motherLode, "live", 1000);
  motherLode.KeepAlive(live.key, { time: 10 });
  const zero = insertSized(motherLode, "zero", 0);
  const tooBig = insertSized(motherLode, "too-big", 31);
  const locked = insertSized(motherLode, "locked", 20);
  motherLode.Lock(locked.key);
  const notAllowed = insertSized(motherLode, "not-allowed", 5);
  motherLode.Insert(notAllowed.key, notAllowed.resource, { cacheable: false, time: 0 });
  const renewed = insertSized(motherLode, "renewed", 20);
  const older = insertSized(motherLode, "older", 20);
  const newer = insertSized(motherLode, "newer", 10);

  const sweep = expire(motherLode);

  // MotherLode.cpp:339-387: no ICacheable, zero size, larger than the whole
  // budget, or caching not allowed - each is dropped rather than cached.
  assert.deepEqual(sweep.purgedKeys, [ plainKey, zero.key, tooBig.key, notAllowed.key ]);
  assert.deepEqual(sweep.cachedKeys, [ renewed.key, older.key, newer.key ]);
  assert.equal(sweep.locked, 1);
  assert.equal(motherLode.GetStats().bytes, 50);

  // Use takes an entry back out of the cache (MotherLode.cpp:149-157).
  assert.equal(motherLode.KeepAlive(renewed.key), renewed.resource);
  assert.equal(motherLode.GetStats().bytes, 30);
  assert.equal(motherLode.TrimCache().evicted, 0);

  const pressure = insertSized(motherLode, "pressure", 10);
  assert.deepEqual(expire(motherLode).cachedKeys, [ pressure.key ]);

  const trim = motherLode.TrimCache();

  assert.deepEqual(trim.evictedKeys, [ older.key ]);
  assert.equal(trim.afterBytes, 20);
  for (const kept of [ live, locked, renewed, newer, pressure ])
  {
    assert.equal(motherLode.Lookup(kept.key), kept.resource);
  }
  assert.equal(motherLode.ClearCached(), 2);
  assert.equal(motherLode.Lookup(newer.key), null);
  assert.equal(motherLode.Lookup(renewed.key), renewed.resource);
});

test("MotherLode keeps an entry whose size is unknown pending until it is known", () =>
{
  const motherLode = new MotherLode({ cacheSize: 100 });
  const pending = insertSized(motherLode, "pending", 0);
  pending.resource.known = false;
  const unwanted = insertSized(motherLode, "unwanted", 0);
  unwanted.resource.known = false;

  assert.deepEqual(expire(motherLode).cachedKeys, [ pending.key, unwanted.key ]);
  assert.equal(motherLode.GetStats().cached, 2);
  assert.equal(motherLode.GetStats().bytes, 0);
  assert.equal(motherLode.TrimCache().evicted, 0);

  // MotherLode.cpp:208-249: once known, a size joins the LRU; zero is dropped.
  pending.resource.known = true;
  pending.resource.size = 40;
  unwanted.resource.known = true;
  const trim = motherLode.TrimCache();

  assert.deepEqual(trim.evictedKeys, [ unwanted.key ]);
  assert.equal(trim.afterBytes, 40);
  assert.equal(blue.resMan.GetResourceStatus(unwanted.resource).purged, true);
  assert.equal(motherLode.Lookup(pending.key), pending.resource);
});

test("MotherLode cache trim preserves failed owners and reports partial pressure relief", () =>
{
  const motherLode = new MotherLode({ cacheSize: 100 });
  const { key: failingKey, resource: failing } = insertSized(motherLode, "failing-cache", 60);
  const { key: stuckKey, resource: stuck } = insertSized(motherLode, "stuck-cache", 60);
  const { key: goodKey, resource: good } = insertSized(motherLode, "good-cache", 60);
  for (const resource of [ failing, stuck ])
  {
    resource.SetAdapterResource("test", { destroy() { throw new Error("expected cache cleanup failure"); } });
  }
  expire(motherLode);

  assert.throws(
    () => motherLode.TrimCache(),
    error => error instanceof AggregateError
      && error.code === "CJS_MOTHERLODE_CACHE_TRIM_FAILED"
      && error.result.beforeBytes === 180
      && error.result.afterBytes === 120
      && error.result.overBudget === true
      && error.result.evicted === 1
      && error.result.failed === 2
      && error.result.evictedKeys[0] === goodKey
      && error.result.failedKeys[0] === failingKey
      && error.result.failedKeys[1] === stuckKey
  );
  assert.equal(motherLode.Lookup(failingKey), failing);
  assert.equal(motherLode.Lookup(stuckKey), stuck);
  assert.equal(motherLode.Lookup(goodKey), null);
  assert.equal(blue.resMan.GetResourceStatus(failing).purged, false);
  assert.equal(blue.resMan.GetResourceStatus(good).purged, true);
  assert.equal(motherLode.Delete(failingKey, { cleanup: false }), true);
  assert.equal(motherLode.Delete(stuckKey, { cleanup: false }), true);
});

test("BlueResMan Update enforces cache pressure unless one update skips it", async () =>
{
  const motherLode = new MotherLode({ cacheSize: 16 });
  const resMan = new BlueResMan({ motherLode });
  const { key, resource } = insertSized(motherLode, "update-cache", 8);
  const later = insertSized(motherLode, "update-cache-later", 12);
  expire(motherLode);

  assert.equal(resMan.Update({ cache: false, purge: false }), false);
  assert.equal(motherLode.Lookup(key), resource);
  assert.equal(resMan.Update({ purge: false }), true);
  assert.equal(motherLode.Lookup(key), null);
  assert.equal(motherLode.Lookup(later.key), later.resource);
  assert.equal((resource.value !== null), false);
  assert.equal(blue.resMan.GetResourceStatus(resource).purged, true);
});

test("MotherLode inactivity purge preserves failed owners and continues", () =>
{
  let time = 0;
  const motherLode = new MotherLode({ now: () => time });
  const failingKey = getMotherLodeKey("res:/data/failing-purge.bin");
  const goodKey = getMotherLodeKey("res:/data/good-purge.bin");
  const failing = cacheResource("res:/data/failing-purge.bin");
  const good = cacheResource("res:/data/good-purge.bin");
  failing.SetAdapterResource("test", { destroy() { throw new Error("expected purge failure"); } });
  good.value = { good: true };
  motherLode.Insert(failingKey, failing);
  motherLode.Insert(goodKey, good);

  time = 10;
  assert.throws(
    () => motherLode.PurgeInactive({ time, maxIdleMilliseconds: 1 }),
    error => error instanceof AggregateError
      && error.code === "CJS_MOTHERLODE_PURGE_FAILED"
      && error.result.purged === 1
      && error.result.purgedKeys[0] === goodKey
      && error.errors[0].code === "CJS_MOTHERLODE_CLEANUP_FAILED"
  );

  assert.equal(motherLode.Lookup(failingKey), failing);
  assert.equal(motherLode.Lookup(goodKey), null);
  assert.equal(blue.resMan.GetResourceStatus(failing).purged, false);
  assert.equal(blue.resMan.GetResourceStatus(good).purged, true);
  assert.equal(motherLode.Delete(failingKey, { cleanup: false }), true);
});