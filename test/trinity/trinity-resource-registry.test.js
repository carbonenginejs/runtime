// CjsTrinity: the device-resource registry, SetDevice, Initialize and Shutdown
// (docs internal/decisions/device-resource-registration.md). A use registers
// once, the eviction pass compacts in place, releases what is idle past its rule
// and drops what was unregistered without releasing it again; the device is
// handed in and replaced only through SetDevice.
import assert from "node:assert/strict";
import test from "node:test";

import { blue } from "../../npm/dist/blue/blue/index.js";
import { CjsTrinity, trinity, TriStorageFlags } from "../../npm/dist/index.js";
import { Tr2RenderContextALStub } from "../../npm/dist/trinityal/index.js";
import { CjsLibrary } from "../../npm/dist/core/index.js";

/**
 * A stand-in device resource that counts its releases.
 *
 * @param {string} name A label for failures.
 * @returns {object} The resource.
 */
function resource(name)
{
  return { name, releases: 0, ReleaseResources() { this.releases++; } };
}

/**
 * A stand-in device that records what Trinity asks of it.
 *
 * @returns {object} The device.
 */
function device()
{
  return {
    prepared: 0, released: [], ticks: 0,
    PrepareDeviceResources() { this.prepared++; },
    ReleaseDeviceResources(storage) { this.released.push(storage); },
    OnTick() { this.ticks++; }
  };
}

/**
 * Passes rendered time and runs the eviction pass, as `OnTick` does once the interval has passed.
 *
 * @param {CjsTrinity} holder Trinity.
 * @param {number} seconds Rendered seconds to add first.
 */
function pass(holder, seconds)
{
  holder._renderedTime += seconds;
  holder._ReleaseIdleResources();
}

test("a use registers once; using it again keeps the one entry", () =>
{
  const holder = new CjsTrinity();
  const r = resource("r");
  holder.RegisterResource(r, 10);
  holder.RegisterResource(r, 10);
  holder.RegisterResource(r, 10);
  assert.deepEqual(holder._resourcesRegistered, [ r ]);
  assert.deepEqual(holder.GetResourcesRegistered(), [ r ]);
  assert.equal(r._registered, true);
});

test("registering works before there is a device", () =>
{
  const holder = new CjsTrinity();
  const r = resource("r");
  holder.RegisterResource(r, Infinity);
  assert.equal(holder.device, null);
  assert.deepEqual(holder.GetResourcesRegistered(), [ r ]);
});

test("released and then used again before the pass keeps one entry", () =>
{
  const holder = new CjsTrinity();
  const r = resource("r");
  holder.RegisterResource(r, 10);
  r.ReleaseResources(1);
  holder.RegisterResource(r, 10);
  assert.deepEqual(holder._resourcesRegistered, [ r ]);
  pass(holder, 1);
  assert.deepEqual(holder._resourcesRegistered, [ r ], "used within its rule, so kept");
  assert.equal(r.releases, 1, "the pass did not release it again");
});

test("destructed while listed: unlisted at once, dropped at the pass, never released twice, and registers again cleanly", () =>
{
  const holder = new CjsTrinity();
  const r = resource("r");
  const other = resource("other");
  holder.RegisterResource(r, 10);
  holder.RegisterResource(other, 10);
  // Its Destruct releases its own device objects and unregisters.
  r.ReleaseResources(1);
  holder.UnregisterResource(r);
  assert.equal(holder._resourcesRegistered.length, 2, "nothing changes the array before the pass");
  assert.deepEqual(holder.GetResourcesRegistered(), [ other ], "but it is no longer listed");
  pass(holder, 1);
  assert.deepEqual(holder._resourcesRegistered, [ other ]);
  assert.equal(r._registered, false);
  assert.equal(r.releases, 1, "the pass drops it without releasing it");
  pass(holder, 100);
  assert.equal(r.releases, 1);
  holder.RegisterResource(r, 10);
  assert.deepEqual(holder._resourcesRegistered, [ r ], "other went idle; r registers again with one entry");
  assert.equal(r._unregistered, false);
});

test("unregistered and then used before the pass keeps its entry", () =>
{
  const holder = new CjsTrinity();
  const r = resource("r");
  holder.RegisterResource(r, 10);
  holder.UnregisterResource(r);
  holder.RegisterResource(r, 10);
  pass(holder, 1);
  assert.deepEqual(holder._resourcesRegistered, [ r ]);
});

test("idle past its rule: released once and dropped; the rest keep their order", () =>
{
  const holder = new CjsTrinity();
  const a = resource("a"), b = resource("b"), c = resource("c"), d = resource("d");
  for (const r of [ a, b, c, d ]) holder.RegisterResource(r, 10);
  holder._renderedTime += 8;
  holder.RegisterResource(b, 10);
  holder.RegisterResource(d, 10);
  pass(holder, 5);
  assert.deepEqual(holder._resourcesRegistered, [ b, d ]);
  assert.deepEqual([ a, b, c, d ].map(r => r.releases), [ 1, 0, 1, 0 ]);
  assert.deepEqual([ a, b, c, d ].map(r => r._registered), [ false, true, false, true ]);
  pass(holder, 1);
  assert.deepEqual([ a.releases, c.releases ], [ 1, 1 ], "a dropped resource is not released again");
});

test("Infinity never evicts", () =>
{
  const holder = new CjsTrinity();
  const r = resource("r");
  holder.RegisterResource(r, Infinity);
  pass(holder, 1e9);
  assert.deepEqual(holder._resourcesRegistered, [ r ]);
  assert.equal(r.releases, 0);
});

test("a release that registers another resource during the pass is kept", () =>
{
  const holder = new CjsTrinity();
  const late = resource("late");
  const r = resource("r");
  r.ReleaseResources = function() { this.releases++; holder.RegisterResource(late, 10); };
  holder.RegisterResource(r, 1);
  pass(holder, 5);
  assert.deepEqual(holder._resourcesRegistered, [ late ]);
});

test("OnTick forwards to the device, counts clamped rendered seconds and runs the pass once the interval has passed", () =>
{
  const holder = new CjsTrinity();
  const d = device();
  holder.SetDevice(d);
  const r = resource("r");
  holder.RegisterResource(r, 2);
  const second = 10000000;
  holder.OnTick(0, 0);
  holder.OnTick(second / 2, second / 2);
  assert.equal(d.ticks, 2);
  assert.equal(holder._renderedTime, 0.5);
  assert.equal(holder._lastResourceEviction, 0, "the interval has not passed");
  // A long gap (a hidden tab) counts as at most one second.
  holder.OnTick(600 * second, 600 * second);
  assert.equal(holder._renderedTime, 1.5);
  assert.equal(holder._lastResourceEviction, 1.5);
  assert.equal(r.releases, 0, "1.5 s idle is within a 2 s rule");
  holder.OnTick(601 * second, 601 * second);
  holder.OnTick(602 * second, 602 * second);
  assert.equal(holder._renderedTime, 3.5);
  assert.equal(r.releases, 1);
  assert.deepEqual(holder._resourcesRegistered, []);
});

test("SetDevice: the same device again does nothing", () =>
{
  const holder = new CjsTrinity();
  const d = device();
  holder.SetDevice(d);
  holder.SetDevice(d);
  assert.equal(d.prepared, 1);
  assert.deepEqual(d.released, []);
});

test("SetDevice: a swap releases from the old device, then prepares on the new", () =>
{
  const holder = new CjsTrinity();
  const order = [];
  const first = device(), second = device();
  first.ReleaseDeviceResources = storage => order.push([ "release first", storage, holder.device === first ]);
  second.PrepareDeviceResources = () => order.push([ "prepare second", holder.device === second ]);
  holder.SetDevice(first);
  holder.SetDevice(second);
  assert.deepEqual(order, [ [ "release first", TriStorageFlags.TRISTORAGE_ALL, true ], [ "prepare second", true ] ]);
  assert.equal(holder.device, second);
});

test("SetDevice(null) throws: clearing is Shutdown's", () =>
{
  const holder = new CjsTrinity();
  assert.throws(() => holder.SetDevice(null), /Shutdown clears it/);
});

test("Initialize needs a device and runs Trinity's start-up once", () =>
{
  const holder = new CjsTrinity();
  const renderer = { started: 0, initialize() { this.started++; } };
  const fontManager = {};
  assert.throws(() => holder.Initialize({ fontManager, renderer }), /no device backend chosen/);
  const d = device();
  holder.Initialize({ device: d, fontManager, renderer });
  for (const name of [ "BlitOriginal", "BlitCurrent", "g_texelSize" ]) assert.ok(holder.variableStore.FindVariable(name), `${name} is registered`);
  assert.equal(renderer.started, 1);
  assert.equal(holder.fontManager, fontManager);
  assert.equal(holder.device, d);
  assert.equal(d.prepared, 1, "what is already registered is prepared");
  assert.equal(blue.os.IsRegisteredForTicks(holder), true);
  assert.throws(() => holder.Initialize({ device: device(), fontManager, renderer }), /already initialized/);
  holder.Shutdown();
  assert.equal(blue.os.IsRegisteredForTicks(holder), false);
  assert.deepEqual(d.released, [ TriStorageFlags.TRISTORAGE_ALL ]);
  assert.equal(holder.device, null);
});

test("CjsLibrary builds the device for the host's abstraction layer and starts trinity", async () =>
{
  assert.equal(trinity.device, null, "no device until the host chooses a backend");
  const library = new CjsLibrary();
  await library.Initialize();
  try
  {
    assert.throws(() => library.AttachTrinity({}), /no device backend chosen/);
    const built = library.AttachTrinity({ renderContextAL: new Tr2RenderContextALStub() });
    assert.equal(trinity.device, built);
    assert.ok(trinity.fontManager);
    assert.ok(trinity.variableStore.FindVariable("Time"), "the renderer's globals are registered");
  }
  finally
  {
    await library.Shutdown();
  }
  assert.equal(trinity.device, null, "Shutdown stops what AttachTrinity started");
  assert.equal(trinity.fontManager, null);
});
