import assert from "node:assert/strict";
import { test } from "node:test";
import { blue, BlueResMan, IBlueResManNotifications } from "../../../npm/dist/blue/blue/index.js";
import { RegisterDataLoader, TestDataRes } from "../../support/testDataRes.js";
import "../../support/frameLoop.js";

// GetResource's optional IBlueResManNotifications (IBlueResMan.h:20-35):
// OnResourceFromCache on a cache hit (BlueResMan.cpp:188-210),
// OnResourceCreated for a new resource before Initialize (:237-240, :281-286).

/** A manager installed as Blue's, serving one data extension through a test Res class. */
function manager(t)
{
  const previous = blue.resMan;
  const resMan = new BlueResMan({ source: { Read: () => new Uint8Array([ 1, 2, 3 ]) } });
  blue.resMan = resMan;
  t.after(() => { try { resMan.Clear(); } finally { blue.resMan = previous; } });
  RegisterDataLoader(resMan, "bin", bytes => bytes.length);
  return resMan;
}

/** Records each callback, and the path the resource had when it was made. */
class Recorder extends IBlueResManNotifications
{
  calls = [];

  OnResourceCreated(resource)
  {
    this.calls.push({ call: "created", resource, path: resource.GetPath() });
  }

  OnResourceFromCache(resource)
  {
    this.calls.push({ call: "fromCache", resource, path: resource.GetPath() });
  }
}

test("a new resource is reported created before Initialize", t =>
{
  const resMan = manager(t);
  const notifications = new Recorder();

  const resource = resMan.GetResource("res:/notify/new.bin", {}, notifications);

  assert.equal(notifications.calls.length, 1);
  assert.equal(notifications.calls[0].call, "created");
  assert.equal(notifications.calls[0].resource, resource);
  assert.equal(notifications.calls[0].path, "", "not yet Initialize()'d");
  assert.equal(resource.GetPath(), "res:/notify/new.bin");
});

test("a cached resource is reported from the cache, not created", t =>
{
  const resMan = manager(t);
  const first = resMan.GetResource("res:/notify/cached.bin");
  const notifications = new Recorder();

  const second = resMan.GetResource("res:/notify/cached.bin", {}, notifications);

  assert.equal(second, first);
  assert.deepEqual(notifications.calls.map(entry => entry.call), [ "fromCache" ]);
  assert.equal(notifications.calls[0].resource, first);
});

test("GetResourceW passes notifications through", t =>
{
  const resMan = manager(t);
  const notifications = new Recorder();

  resMan.GetResourceW("res:/notify/wide.bin", {}, notifications);
  resMan.GetResourceW("res:/notify/wide.bin", {}, notifications);

  assert.deepEqual(notifications.calls.map(entry => entry.call), [ "created", "fromCache" ]);
});

test("a dynamic resource is reported created", t =>
{
  const resMan = manager(t);
  const made = new TestDataRes();
  resMan.RegisterResourceConstructor("notify", { GetResource: () => made, IsCacheable: () => false });
  const notifications = new Recorder();

  const resource = resMan.GetResource("dynamic:/notify/query", {}, notifications);

  assert.equal(resource, made);
  assert.deepEqual(notifications.calls.map(entry => entry.call), [ "created" ]);
  assert.equal(notifications.calls[0].resource, made);
});

test("an implementer may override only one callback; the other does nothing", t =>
{
  const resMan = manager(t);
  const seen = [];
  const notifications = new class extends IBlueResManNotifications
  {
    OnResourceFromCache(resource) { seen.push(resource); }
  }();

  const resource = resMan.GetResource("res:/notify/half.bin", {}, notifications);
  resMan.GetResource("res:/notify/half.bin", {}, notifications);

  assert.deepEqual(seen, [ resource ]);
});

test("notifications default to null", t =>
{
  const resMan = manager(t);

  assert.equal(resMan.GetResource.length, 1, "options and notifications are optional");
  assert.ok(resMan.GetResource("res:/notify/plain.bin"));
});
