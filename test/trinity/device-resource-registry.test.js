// The device's use-driven resource registry
// (docs internal/decisions/device-resource-registration.md, *Registry container*):
// a use registers once, the eviction pass compacts in place, releases what is
// idle past its rule, and drops what was unregistered without releasing it.
import assert from "node:assert/strict";
import test from "node:test";

import { TriDevice } from "../../npm/dist/trinity/index.js";

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
 * Passes rendered time and runs the eviction pass, as `OnTick` does once the interval has passed.
 *
 * @param {TriDevice} device The device.
 * @param {number} seconds Rendered seconds to add first.
 */
function pass(device, seconds)
{
  device._renderedTime += seconds;
  device._ReleaseIdleResources();
}

test("a use registers once; using it again keeps the one entry", () =>
{
  const device = new TriDevice();
  const r = resource("r");
  device.RegisterResource(r, 10);
  device.RegisterResource(r, 10);
  device.RegisterResource(r, 10);
  assert.deepEqual(device._resourcesRegistered, [ r ]);
  assert.equal(r._registered, true);
});

test("released and then used again before the pass keeps one entry", () =>
{
  const device = new TriDevice();
  const r = resource("r");
  device.RegisterResource(r, 10);
  r.ReleaseResources(1);
  device.RegisterResource(r, 10);
  assert.deepEqual(device._resourcesRegistered, [ r ]);
  pass(device, 1);
  assert.deepEqual(device._resourcesRegistered, [ r ], "used within its rule, so kept");
  assert.equal(r.releases, 1, "the pass did not release it again");
});

test("destructed while on the stack: dropped at the pass, never released twice, and registers again cleanly", () =>
{
  const device = new TriDevice();
  const r = resource("r");
  const other = resource("other");
  device.RegisterResource(r, 10);
  device.RegisterResource(other, 10);
  // Its Destruct releases its own device objects and unregisters.
  r.ReleaseResources(1);
  device.UnregisterResource(r);
  assert.equal(device._resourcesRegistered.length, 2, "nothing changes the array before the pass");
  pass(device, 1);
  assert.deepEqual(device._resourcesRegistered, [ other ]);
  assert.equal(r._registered, false);
  assert.equal(r.releases, 1, "the pass drops it without releasing it");
  pass(device, 100);
  assert.equal(r.releases, 1);
  device.RegisterResource(r, 10);
  assert.deepEqual(device._resourcesRegistered, [ r ], "other went idle; r registers again with one entry");
  assert.equal(r._unregistered, false);
});

test("unregistered and then used before the pass keeps its entry", () =>
{
  const device = new TriDevice();
  const r = resource("r");
  device.RegisterResource(r, 10);
  device.UnregisterResource(r);
  device.RegisterResource(r, 10);
  pass(device, 1);
  assert.deepEqual(device._resourcesRegistered, [ r ]);
});

test("idle past its rule: released once and dropped; the rest keep their order", () =>
{
  const device = new TriDevice();
  const a = resource("a"), b = resource("b"), c = resource("c"), d = resource("d");
  for (const r of [ a, b, c, d ]) device.RegisterResource(r, 10);
  device._renderedTime += 8;
  device.RegisterResource(b, 10);
  device.RegisterResource(d, 10);
  pass(device, 5);
  assert.deepEqual(device._resourcesRegistered, [ b, d ]);
  assert.deepEqual([ a, b, c, d ].map(r => r.releases), [ 1, 0, 1, 0 ]);
  assert.deepEqual([ a, b, c, d ].map(r => r._registered), [ false, true, false, true ]);
  pass(device, 1);
  assert.deepEqual([ a.releases, c.releases ], [ 1, 1 ], "a dropped resource is not released again");
});

test("Infinity never evicts", () =>
{
  const device = new TriDevice();
  const r = resource("r");
  device.RegisterResource(r, Infinity);
  pass(device, 1e9);
  assert.deepEqual(device._resourcesRegistered, [ r ]);
  assert.equal(r.releases, 0);
});

test("a release that registers another resource during the pass is kept", () =>
{
  const device = new TriDevice();
  const late = resource("late");
  const r = resource("r");
  r.ReleaseResources = function() { this.releases++; device.RegisterResource(late, 10); };
  device.RegisterResource(r, 1);
  pass(device, 5);
  assert.deepEqual(device._resourcesRegistered, [ late ]);
});

test("OnTick counts rendered seconds from the clamped tick delta and runs the pass once the interval has passed", () =>
{
  const device = new TriDevice();
  const r = resource("r");
  device.RegisterResource(r, 2);
  const second = 10000000;
  device.OnTick(0, 0);
  device.OnTick(second / 2, second / 2);
  assert.equal(device._renderedTime, 0.5);
  assert.equal(device._lastResourceEviction, 0, "the interval has not passed");
  // A long gap (a hidden tab) counts as at most one second.
  device.OnTick(600 * second, 600 * second);
  assert.equal(device._renderedTime, 1.5);
  assert.equal(device._lastResourceEviction, 1.5);
  assert.equal(r.releases, 0, "1.5 s idle is within a 2 s rule");
  device.OnTick(601 * second, 601 * second);
  device.OnTick(602 * second, 602 * second);
  assert.equal(device._renderedTime, 3.5);
  assert.equal(r.releases, 1);
  assert.deepEqual(device._resourcesRegistered, []);
});
