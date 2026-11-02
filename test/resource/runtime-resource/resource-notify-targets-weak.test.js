// Notify targets are held weakly (BlueAsyncRes._reloadNotifyTargets): Carbon's
// block is non-owning (BlueAsyncRes.h:189), so a resource must not keep a
// consumer alive that nothing else references.
import assert from "node:assert/strict";
import { test } from "node:test";
import v8 from "node:v8";
import { runInNewContext } from "node:vm";
import { BlueAsyncRes, BlueResMan, blue } from "../../../npm/dist/blue/blue/index.js";
import { RegisterDataLoader } from "../../support/testDataRes.js";
import "../../support/frameLoop.js";

v8.setFlagsFromString("--expose-gc");
const gc = runInNewContext("gc");

/** Lets the job that made a WeakRef finish, then collects. */
async function collect()
{
  for (let i = 0; i < 3; i++)
  {
    await new Promise(resolve => setImmediate(resolve));
    gc();
  }
}

/** Registers a target nothing else holds; returns a probe for it and a call counter. */
function registerUnreferenced(resource, calls)
{
  const target = { RebuildCachedData() { calls.rebuild++; }, ReleaseCachedData() { calls.release++; } };
  resource.AddNotifyTarget(target);
  return new WeakRef(target);
}

test("an unreferenced target is collected and stops being notified; a live one still is", async () =>
{
  const resource = new BlueAsyncRes();
  const dead = { rebuild: 0, release: 0 };
  const probe = registerUnreferenced(resource, dead);
  const seen = [];
  const live = { RebuildCachedData: value => seen.push([ "rebuild", value ]), ReleaseCachedData: value => seen.push([ "release", value ]) };
  resource.AddNotifyTarget(live);

  await collect();
  assert.equal(probe.deref(), undefined, "the resource did not keep its target alive");

  resource._SetPrepared(true);
  resource._NotifyRebuildCachedData();
  resource._NotifyReleaseCachedData();
  assert.deepEqual(dead, { rebuild: 0, release: 0 });
  assert.deepEqual(seen, [ [ "rebuild", resource ], [ "release", resource ] ]);
  assert.deepEqual(resource._reloadNotifyTargets.map(ref => ref.deref()), [ live ], "the dead entry was dropped");

  resource.RemoveNotifyTarget(live);
  resource.AssertNoNotifyTargets();
});

test("removing a live target also drops collected ones, and an unregistered one is not an error", async () =>
{
  const resource = new BlueAsyncRes();
  registerUnreferenced(resource, { rebuild: 0, release: 0 });
  const live = { RebuildCachedData() {}, ReleaseCachedData() {} };
  resource.AddNotifyTarget(live);
  await collect();

  resource.RemoveNotifyTarget(live);
  assert.equal(resource._reloadNotifyTargets.length, 0);
  resource.RemoveNotifyTarget(live);
  resource.AssertNoNotifyTargets();
});

test("one auto-purge sweep empties a cached resource's list of collected targets, with no reload", async t =>
{
  const previous = blue.resMan;
  const resMan = new BlueResMan({ source: { Read: () => new Uint8Array([ 1, 2, 3 ]) } });
  blue.resMan = resMan;
  t.after(() => { try { resMan.Clear(); } finally { blue.resMan = previous; } });
  RegisterDataLoader(resMan, "bin", bytes => bytes.length);
  const resource = await resMan.FetchResource("res:/weak/sweep.bin");
  const calls = { rebuild: 0, release: 0 };
  registerUnreferenced(resource, calls);
  assert.equal(resource._reloadNotifyTargets.length, 1);
  await collect();

  assert.ok(resMan.IsAutoPurgeEnabled(), "auto-purge is on by default");
  // Configuring the policy makes the next pump due at once (PumpAutoPurge); the clock is the real one.
  resMan.SetAutoPurgePolicy(BlueResMan.defaultAutoPurgePolicy);
  assert.notEqual(resMan.PumpAutoPurge(), null, "the sweep ran");

  assert.equal(resource._reloadNotifyTargets.length, 0);
  assert.equal(calls.rebuild, 1, "only the immediate notify of a prepared resource; no reload");
  assert.equal(resMan.Lookup("res:/weak/sweep.bin"), resource, "the sweep keeps the resource cached");
});
