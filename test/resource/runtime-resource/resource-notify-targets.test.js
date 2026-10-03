// Notify targets are told once, when the resource finishes, and then released.
//
// Carbon keeps a target until its owner's destructor removes it
// (BlueAsyncRes.cpp:261-334). JavaScript has no destructor, so a kept target
// holds its owner for as long as the resource is cached. Owners instead ask
// IsGood() before use and re-register while the resource is pending; these
// tests pin both halves of that.
import assert from "node:assert/strict";
import { test } from "node:test";

import { CjsResource } from "../../../npm/dist/resource/index.js";


const { State } = CjsResource;


/** A notify target that records what it was told, as primitives. */
function recordingTarget(seen, label)
{
  return {
    RebuildCachedData: res => seen.push([ label, "rebuild", res.state ]),
    ReleaseCachedData: res => seen.push([ label, "release", res.state ])
  };
}


/** A resource with a stub manager whose reload hook restarts the load. */
function createBound(state)
{
  const resource = new CjsResource();
  resource.path = "res:/thing.png";
  resource.SetState(state);
  resource.SetLifecycleController({ keepAlive: () => {} });
  resource.SetReloadHook(() => { resource.MarkRequested(); });
  return resource;
}


test("a target hears RebuildCachedData for both outcomes (BlueAsyncRes.cpp:160-189)", () =>
{
  const seen = [];
  const good = new CjsResource();
  const bad = new CjsResource();
  good.AddNotifyTarget(recordingTarget(seen, "good"));
  bad.AddNotifyTarget(recordingTarget(seen, "bad"));

  good.MarkPrepared();
  bad.SetError(new Error("nope"));

  assert.deepEqual(seen, [ [ "good", "rebuild", State.PREPARED ], [ "bad", "rebuild", State.FAILED ] ]);
});


test("completion releases every target", () =>
{
  const seen = [];
  const resource = new CjsResource();
  resource.AddNotifyTarget(recordingTarget(seen, "once"));
  resource.MarkPrepared();

  resource.NotifyRebuildCachedData();
  resource.NotifyReleaseCachedData();
  assert.equal(seen.length, 1, "told once, then no longer held");
});


test("a finished resource tells a new target at once and stores nothing", () =>
{
  const seen = [];
  const resource = new CjsResource();
  resource.MarkPrepared();

  const target = recordingTarget(seen, "late");
  resource.AddNotifyTarget(target);
  assert.deepEqual(seen, [ [ "late", "rebuild", State.PREPARED ] ]);

  resource.NotifyRebuildCachedData();
  assert.equal(seen.length, 1, "nothing was stored");
});


test("a duplicate registration while pending is ignored", () =>
{
  const seen = [];
  const resource = new CjsResource();
  const target = recordingTarget(seen, "twice");
  resource.AddNotifyTarget(target);
  resource.AddNotifyTarget(target);
  resource.MarkPrepared();
  assert.equal(seen.length, 1);
});


test("RemoveNotifyTarget stops a pending notification", () =>
{
  const seen = [];
  const resource = new CjsResource();
  const target = recordingTarget(seen, "gone");
  resource.AddNotifyTarget(target);
  resource.RemoveNotifyTarget(target);
  resource.RemoveNotifyTarget(target);      // already gone: does nothing
  resource.MarkPrepared();
  assert.equal(seen.length, 0);
});


test("a target that re-registers inside its own call is kept for the next completion", () =>
{
  const resource = createBound(State.REQUESTED);
  let calls = 0;
  const plain = { RebuildCachedData: () => { calls += 1; }, ReleaseCachedData: () => {} };
  resource.AddNotifyTarget(plain);

  // Re-registers from inside its own rebuild, once the resource is pending again.
  const rearming = {
    RebuildCachedData: res =>
    {
      calls += 1;
      res.MarkPurged();
      res.IsGood();                       // revives: back to REQUESTED
      res.AddNotifyTarget(rearming);      // pending, so it is stored
    },
    ReleaseCachedData: () => {}
  };
  resource.AddNotifyTarget(rearming);
  resource.MarkPrepared();
  assert.equal(calls, 2, "both told once");
  assert.equal(resource.state, State.REQUESTED, "the re-arming target revived it");

  resource.MarkPrepared();
  assert.equal(calls, 3, "the re-registered target heard the second completion");
});


test("an owner that checks every frame re-arms through a purge and rebuilds once", () =>
{
  const resource = createBound(State.REQUESTED);
  let rebuilds = 0;
  const owner = {
    RebuildCachedData: () => { rebuilds += 1; },
    ReleaseCachedData: () => {},
    // The agreed owner pattern: check before use, re-arm while pending.
    Use()
    {
      if (resource.IsGood()) return true;
      if (!resource.IsFailed()) resource.AddNotifyTarget(this);
      return false;
    }
  };

  assert.equal(owner.Use(), false);
  assert.equal(owner.Use(), false);
  resource.MarkPrepared();
  assert.equal(rebuilds, 1);
  assert.equal(owner.Use(), true);

  resource.MarkPurged();
  assert.equal(owner.Use(), false, "purged: not good, and IsGood started a reload");
  assert.equal(resource.state, State.REQUESTED);
  owner.Use();
  resource.MarkPrepared();
  assert.equal(rebuilds, 2, "the revived resource rebuilt the owner once");
  assert.equal(owner.Use(), true);
});


test("an owner of a failed resource is not rebuilt every frame", () =>
{
  const resource = new CjsResource();
  let rebuilds = 0;
  const owner = {
    RebuildCachedData: () => { rebuilds += 1; },
    ReleaseCachedData: () => {},
    Use()
    {
      if (resource.IsGood()) return true;
      if (!resource.IsFailed()) resource.AddNotifyTarget(this);
      return false;
    }
  };

  owner.Use();
  resource.SetError(new Error("missing"));
  assert.equal(rebuilds, 1, "told of the failure once");
  for (let frame = 0; frame < 10; frame++) owner.Use();
  assert.equal(rebuilds, 1, "no re-arm on FAILED, so no rebuild storm");
});


test("many owners waiting on one resource are all released when it completes", () =>
{
  const resource = new CjsResource();
  let told = 0;
  for (let i = 0; i < 10000; i++)
  {
    resource.AddNotifyTarget({ RebuildCachedData: () => { told += 1; }, ReleaseCachedData: () => {} });
  }
  resource.MarkPrepared();
  assert.equal(told, 10000);

  told = 0;
  resource.NotifyRebuildCachedData();
  assert.equal(told, 0, "the resource holds none of them");
});


test("a purge releases targets still waiting, which then hear the reload", () =>
{
  // Normally nobody is waiting at purge time - completion released them - but
  // a target registered on a purged handle before it revives is kept.
  const seen = [];
  const resource = createBound(State.PREPARED);
  resource.MarkPurged();
  resource.AddNotifyTarget(recordingTarget(seen, "waiting"));
  resource.IsGood();
  resource.MarkPrepared();
  assert.deepEqual(seen, [ [ "waiting", "rebuild", State.PREPARED ] ]);
});
