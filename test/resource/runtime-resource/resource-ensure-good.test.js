// Resource changes are pulled at use (resource-lifecycle.md): EnsureGood renews
// and answers IsGood; _revision counts finished prepares; ensureDependency
// calls Carbon's RebuildCachedData/ReleaseCachedData (BlueAsyncRes.h:26-27)
// from the owner's side when the revision it built from is out of date.
import assert from "node:assert/strict";
import { test } from "node:test";
import { BlueAsyncRes, BlueResMan, blue } from "../../../npm/dist/blue/blue/index.js";
import { RegisterDataLoader } from "../../support/testDataRes.js";
import "../../support/frameLoop.js";

/** A manager installed as Blue's, serving one data extension through a test Res class. */
function manager(t, loader = bytes => bytes.length)
{
  const previous = blue.resMan;
  const resMan = new BlueResMan({ source: { Read: () => new Uint8Array([ 1, 2, 3 ]) } });
  blue.resMan = resMan;
  t.after(() => { try { resMan.Clear(); } finally { blue.resMan = previous; } });
  RegisterDataLoader(resMan, "bin", loader);
  return resMan;
}

/** An owner that records Carbon's two calls. */
function owner()
{
  return {
    _dependencyRevisions: new Map(),
    calls: [],
    RebuildCachedData(resource) { this.calls.push([ "rebuild", resource ]); },
    ReleaseCachedData(resource) { this.calls.push([ "release", resource ]); }
  };
}

/** A bare resource set prepared, good or not, as a finished load leaves it. */
function prepared(good)
{
  const resource = new BlueAsyncRes();
  resource._isPrepared = true;
  resource._isGood = good;
  resource._NotifyRebuildCachedData();
  return resource;
}

test("EnsureGood renews the resource and answers IsGood", async t =>
{
  const resMan = manager(t);
  const resource = await resMan.FetchResource("res:/ensure/good.bin");
  let renewed = 0;
  const keepAlive = resource.KeepAlive;
  resource.KeepAlive = function (...args) { renewed++; return keepAlive.apply(this, args); };

  assert.equal(resource.EnsureGood(), true);
  assert.ok(renewed >= 1, "EnsureGood renews");
  resource._isGood = false;
  assert.equal(resource.EnsureGood(), false);
});

test("the revision counts finished prepares, good and failed, not reload starts or purges", async t =>
{
  const resMan = manager(t);
  const resource = await resMan.FetchResource("res:/ensure/revision.bin");
  assert.equal(resource._revision, 1, "the first prepare");

  resource.Reload();
  assert.equal(resource._revision, 1, "a reload starting does not count");
  await resMan.Ready(resource);
  assert.equal(resource._revision, 2, "its prepare does");

  resMan._MarkResourcePurged(resource);
  assert.equal(resource._revision, 2, "a purge does not count");

  const failing = manager(t, () => { throw new Error("bad bytes"); });
  await assert.rejects(failing.FetchResource("res:/ensure/failed.bin"), /bad bytes/u);
  assert.equal(failing.Lookup("res:/ensure/failed.bin")._revision, 1, "a failed prepare counts");
});

test("ensureDependency rebuilds once per change and releases once when the dependency goes bad", () =>
{
  const resource = prepared(true), user = owner();

  assert.equal(BlueAsyncRes.ensureDependency(resource, user, "geometry"), true);
  assert.deepEqual(user.calls, [ [ "rebuild", resource ] ], "first use builds");
  BlueAsyncRes.ensureDependency(resource, user, "geometry");
  assert.equal(user.calls.length, 1, "no change, no work");

  resource._NotifyRebuildCachedData();
  BlueAsyncRes.ensureDependency(resource, user, "geometry");
  assert.deepEqual(user.calls.at(-1), [ "rebuild", resource ], "a new revision rebuilds");
  assert.equal(user.calls.length, 2);

  resource._isGood = false;
  assert.equal(BlueAsyncRes.ensureDependency(resource, user, "geometry"), false);
  assert.deepEqual(user.calls.at(-1), [ "release", resource ], "going bad releases");
  BlueAsyncRes.ensureDependency(resource, user, "geometry");
  assert.equal(user.calls.length, 3, "released once");

  resource._isGood = true;
  resource._NotifyRebuildCachedData();
  BlueAsyncRes.ensureDependency(resource, user, "geometry");
  assert.deepEqual(user.calls.at(-1), [ "rebuild", resource ], "good again rebuilds");
});

test("ensureDependency: a never-good dependency asks nothing of the owner; slots are independent", () =>
{
  const bad = prepared(false), good = prepared(true), user = owner();

  assert.equal(BlueAsyncRes.ensureDependency(bad, user, "low"), false);
  assert.deepEqual(user.calls, [], "nothing built, so nothing to release");
  BlueAsyncRes.ensureDependency(good, user, "high");
  assert.deepEqual(user.calls, [ [ "rebuild", good ] ]);
});

test("ensureDependency: a rebound slot starts again; an empty slot is false and forgets", () =>
{
  const first = prepared(true), second = prepared(true), user = owner();
  BlueAsyncRes.ensureDependency(first, user, "geometry");
  BlueAsyncRes.ensureDependency(second, user, "geometry");
  assert.deepEqual(user.calls, [ [ "rebuild", first ], [ "rebuild", second ] ], "the new resource is built from; the old is not released here");

  assert.equal(BlueAsyncRes.ensureDependency(null, user, "geometry"), false);
  assert.equal(user._dependencyRevisions.has("geometry"), false);
  assert.equal(user.calls.length, 2);
});

test("ensureDependency renews the dependency and needs the owner's record", () =>
{
  const resource = prepared(true);
  let renewed = 0;
  resource.EnsureGood = function () { renewed++; return this._isGood; };
  BlueAsyncRes.ensureDependency(resource, owner(), "slot");
  assert.equal(renewed, 1);

  assert.throws(() => BlueAsyncRes.ensureDependency(resource, { RebuildCachedData() {}, ReleaseCachedData() {} }, "slot"), /_dependencyRevisions/u);
});

test("ensureDependency is re-entrant: a rebuild that asks for the same dependency finds it current", () =>
{
  const resource = prepared(true), user = owner();
  let depth = 0;
  user.RebuildCachedData = function (dependency)
  {
    this.calls.push([ "rebuild", dependency ]);
    if (++depth > 3) throw new Error("rebuilt without end");
    // As Tr2Mesh's morph targets read its geometry during its rebuild.
    assert.equal(BlueAsyncRes.ensureDependency(dependency, this, "geometry"), true);
  };
  BlueAsyncRes.ensureDependency(resource, user, "geometry");
  assert.equal(user.calls.length, 1);

  resource._isGood = false;
  user.ReleaseCachedData = function (dependency)
  {
    this.calls.push([ "release", dependency ]);
    assert.equal(BlueAsyncRes.ensureDependency(dependency, this, "geometry"), false);
  };
  BlueAsyncRes.ensureDependency(resource, user, "geometry");
  assert.deepEqual(user.calls.map(call => call[0]), [ "rebuild", "release" ], "released once, even when asked again inside");
});

test("IsGood only asks: it renews nothing (Carbon's BlueAsyncRes::IsGood)", async t =>
{
  const resMan = manager(t);
  const resource = await resMan.FetchResource("res:/ensure/pure.bin");
  let renewed = 0;
  resource.KeepAlive = () => { renewed++; };

  assert.equal(resource.IsGood(), true);
  assert.equal(resource.isGood, true);
  assert.equal(renewed, 0, "asking does not renew");
  assert.equal(resource.EnsureGood(), true);
  assert.equal(renewed, 1, "only EnsureGood renews");
});
