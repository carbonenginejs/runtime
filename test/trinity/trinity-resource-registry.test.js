// CjsTrinity: Carbon's registry, the scene-content sweep, SetDevice, Initialize
// and Shutdown (docs internal/decisions/device-resource-registration.md, Revised
// lifecycle). Registering keeps one entry; UnregisterResource destructs; the
// sweep, run every sweep interval of Blue frame time, releases what is unused
// past the one rule and drops stale entries; the device is handed in and
// replaced only through SetDevice.
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

/** Blue ticks per second. */
const SECOND = 10000000;

/**
 * Controls Blue's frame time for one test.
 *
 * @param {object} t The test context.
 * @returns {{ at: function(number): void }} Sets the frame time, in seconds.
 */
function clock(t)
{
  let now = 0;
  t.mock.method(blue.os, "GetCurrentFrameTime", () => now);
  return { at(seconds) { now = seconds * SECOND; } };
}

/**
 * A prepared scene-content stand-in, listed with the holder as `IsGood` lists one.
 *
 * @param {CjsTrinity} holder Trinity.
 * @param {string} name A label for failures.
 * @param {number} stamp The frame time of its last use, in ticks.
 * @returns {object} The resource.
 */
function listed(holder, name, stamp = 0)
{
  const r = resource(name);
  r._state = 1;
  r._stamp = stamp;
  holder._ListSceneResource(r);
  return r;
}

test("Carbon's registry: registering twice keeps one entry, before any device", () =>
{
  const holder = new CjsTrinity();
  const r = resource("r");
  holder.RegisterResource(r);
  holder.RegisterResource(r);
  assert.equal(holder.device, null);
  assert.deepEqual(holder.GetResourcesRegistered(), [ r ]);
});

test("UnregisterResource is the destructor's: the resource leaves the registry, its entry goes stale and is dropped unreleased", t =>
{
  clock(t);
  const holder = new CjsTrinity();
  const r = listed(holder, "r"), other = listed(holder, "other");
  holder.UnregisterResource(r);
  assert.deepEqual(holder.GetResourcesRegistered(), [ other ]);
  assert.equal(r._state, 2, "DESTRUCTED");
  assert.equal(holder._resourcesRegistered.length, 2, "an array: the stale entry stays until the sweep");
  holder.CollectResources();
  assert.deepEqual(holder._sceneResources, [ other ]);
  assert.deepEqual(holder._resourcesRegistered, [ other ], "the sweep compacts Carbon's registry too");
  assert.equal(r.releases, 0, "its Destruct released it; the sweep does not again");
});

test("the sweep releases what is unused past the rule once, keeps the rest in order, and a release lists it again on use", t =>
{
  const time = clock(t);
  const holder = new CjsTrinity();
  holder.resourceIdleRule = 10;
  const [ a, b, c, d ] = [ "a", "b", "c", "d" ].map(name => listed(holder, name, 0));
  b._stamp = d._stamp = 8 * SECOND;
  time.at(13);
  holder.CollectResources();
  assert.deepEqual(holder._sceneResources, [ b, d ]);
  assert.deepEqual(holder._sceneGenerations, [ 0, 0 ]);
  assert.deepEqual([ a, b, c, d ].map(r => r.releases), [ 1, 0, 1, 0 ]);
  assert.deepEqual([ a, c ].map(r => [ r._state, r._generation, r._listed ]), [ [ 0, 1, false ], [ 0, 1, false ] ]);
  assert.deepEqual(holder.GetResourcesRegistered(), [ b, d ], "released scene content leaves Carbon's registry");
  holder.CollectResources();
  assert.deepEqual([ a.releases, c.releases ], [ 1, 1 ], "a dropped resource is not released again");
});

test("one stamp: a use at the current frame keeps a resource, nothing stamps ahead", t =>
{
  const time = clock(t);
  const holder = new CjsTrinity();
  holder.resourceIdleRule = 10;
  const r = listed(holder, "r", 0);
  time.at(9);
  holder.CollectResources();
  assert.equal(r.releases, 0, "9 s idle is within a 10 s rule");
  time.at(11);
  holder.CollectResources();
  assert.equal(r.releases, 1);
});

test("an entry the device released and nothing prepared again is dropped, so the next use lists it again", t =>
{
  clock(t);
  const holder = new CjsTrinity();
  const r = listed(holder, "r");
  r._state = 0;
  holder.CollectResources();
  assert.deepEqual(holder._sceneResources, []);
  assert.equal(r._listed, false);
  assert.equal(r.releases, 0);
});

test("a release that lists another resource during the sweep is kept", t =>
{
  const time = clock(t);
  const holder = new CjsTrinity();
  holder.resourceIdleRule = 1;
  const r = listed(holder, "r", 0);
  let late = null;
  r.ReleaseResources = function() { this.releases++; late = listed(holder, "late", 5 * SECOND); };
  time.at(5);
  holder.CollectResources();
  assert.deepEqual(holder._sceneResources, [ late ]);
});

test("OnTick forwards to the device and sweeps once the sweep interval of Blue frame time has passed", t =>
{
  const time = clock(t);
  const holder = new CjsTrinity();
  holder.resourceIdleRule = 2;
  holder.resourceSweepInterval = 60;
  const d = device();
  holder.SetDevice(d);
  time.at(100);
  holder.OnTick(0, 0);
  assert.equal(d.ticks, 1);
  assert.equal(holder._lastSweep, 100 * SECOND, "the first tick sweeps");
  const r = listed(holder, "r", 100 * SECOND);
  time.at(130);
  holder.OnTick(0, 0);
  assert.equal(r.releases, 0, "the interval has not passed");
  time.at(160);
  holder.OnTick(0, 0);
  assert.equal(r.releases, 1);
  assert.deepEqual(holder._sceneResources, []);
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
    const rule = trinity.resourceIdleRule, interval = trinity.resourceSweepInterval;
    library.SetConfiguration({ deviceResources: { idleRule: 5, sweepInterval: 20 } });
    assert.deepEqual([ trinity.resourceIdleRule, trinity.resourceSweepInterval ], [ 5, 20 ], "deviceResources configures the sweep");
    assert.throws(() => library.SetConfiguration({ deviceResources: { idleRule: -1 } }), /Invalid configuration entry/);
    trinity.resourceIdleRule = rule;
    trinity.resourceSweepInterval = interval;
  }
  finally
  {
    await library.Shutdown();
  }
  assert.equal(trinity.device, null, "Shutdown stops what AttachTrinity started");
  assert.equal(trinity.fontManager, null);
});
