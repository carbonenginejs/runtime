// Notify targets are held weakly (BlueAsyncRes._reloadNotifyTargets): Carbon's
// block is non-owning (BlueAsyncRes.h:189), so a resource must not keep a
// consumer alive that nothing else references.
import assert from "node:assert/strict";
import { test } from "node:test";
import v8 from "node:v8";
import { runInNewContext } from "node:vm";
import { BlueAsyncRes } from "../../../npm/dist/blue/blue/index.js";

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
