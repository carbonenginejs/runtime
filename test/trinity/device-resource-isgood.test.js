// Tr2DeviceResource.IsGood and KeepAlive (docs internal/decisions/device-resource-registration.md,
// Revised lifecycle): a use stamps Blue's current frame time, prepares and lists a
// resource that has no device objects, and answers whether they exist; the sweep
// releases what goes unused past the rule and the next use prepares it again; a
// destructed resource never prepares again.
import assert from "node:assert/strict";
import test from "node:test";

import { blue } from "../../npm/dist/blue/blue/index.js";
import { trinity, Tr2DeviceResource, Tr2RenderContext_GetMainThreadRenderContext } from "../../npm/dist/trinity/index.js";
import { Tr2RenderContextALStub } from "../../npm/dist/trinityal/index.js";
import { InitializeTrinityStub } from "../support/trinityStub.js";

// A stub backend whose device exists, so resource creation is allowed (PrepareResources).
const al = new Tr2RenderContextALStub();
al.CreateDevice();
Tr2RenderContext_GetMainThreadRenderContext().SetRenderContextAL(al);
InitializeTrinityStub();

/**
 * A device resource as an inheriting class sees it: Tr2DeviceResource's methods,
 * none of its fields, no constructor registration.
 *
 * @param {boolean} [prepares=true] What OnPrepareResources answers.
 * @returns {object} The resource.
 */
function resource(prepares = true)
{
  const r = Object.create(Tr2DeviceResource.prototype);
  r.prepares = 0;
  r.releases = 0;
  r._OnPrepareResources = function() { this.prepares++; return prepares; };
  r.ReleaseResources = function() { this.releases++; };
  return r;
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
  let now = 1000 * SECOND;
  t.mock.method(blue.os, "GetCurrentFrameTime", () => now);
  return { at(seconds) { now = (1000 + seconds) * SECOND; } };
}

test("the first IsGood prepares and lists; later ones only stamp the current frame", t =>
{
  const time = clock(t);
  const r = resource();
  assert.equal(trinity.GetResourcesRegistered().includes(r), false, "built and never used: not registered");
  assert.equal(r.IsGood(), true);
  assert.equal(r.prepares, 1);
  assert.equal(trinity.GetResourcesRegistered().includes(r), true);
  assert.equal(trinity._sceneResources.filter(x => x === r).length, 1);
  time.at(3);
  assert.equal(r.IsGood(), true);
  assert.equal(r.prepares, 1, "no second prepare while prepared");
  assert.equal(r._stamp, 1003 * SECOND, "Blue's current frame time");
  assert.equal(trinity._sceneResources.filter(x => x === r).length, 1, "listed once");
  trinity.UnregisterResource(r);
  trinity.CollectResources();
});

test("a failed prepare answers false and lists nothing", t =>
{
  clock(t);
  const r = resource(false);
  assert.equal(r.IsGood(), false);
  assert.equal(trinity._sceneResources.includes(r), false);
});

test("unused past the rule it is released and dropped; the next IsGood prepares and lists it again", t =>
{
  const time = clock(t);
  const r = resource();
  r.IsGood();
  time.at(trinity.resourceIdleRule + 1);
  trinity.CollectResources();
  assert.equal(r.releases, 1);
  assert.equal(trinity.GetResourcesRegistered().includes(r), false);
  assert.equal(r._state, 0, "NONE");
  assert.equal(r.IsGood(), true);
  assert.equal(r.prepares, 2);
  assert.equal(trinity.GetResourcesRegistered().includes(r), true);
  trinity.UnregisterResource(r);
  trinity.CollectResources();
});

test("used within the rule it survives every sweep", t =>
{
  const time = clock(t);
  const r = resource();
  for (let i = 0; i < 30; i++)
  {
    time.at(i * trinity.resourceIdleRule / 2);
    r.IsGood();
    trinity.CollectResources();
  }
  assert.equal(r.releases, 0);
  assert.equal(r.prepares, 1);
  trinity.UnregisterResource(r);
  trinity.CollectResources();
});

test("KeepAlive is a use: it stamps the current frame and prepares", t =>
{
  const time = clock(t);
  const r = resource();
  r.KeepAlive();
  assert.equal(r.prepares, 1, "prepare-ahead");
  time.at(trinity.resourceIdleRule - 1);
  r.KeepAlive();
  time.at(2 * trinity.resourceIdleRule - 2);
  trinity.CollectResources();
  assert.equal(r.releases, 0, "renewed within the rule");
  trinity.UnregisterResource(r);
  trinity.CollectResources();
});

test("a destructed resource answers false and never prepares again", t =>
{
  clock(t);
  const r = resource();
  r.IsGood();
  trinity.UnregisterResource(r);
  assert.equal(r.IsGood(), false);
  assert.equal(r.prepares, 1);
  trinity.CollectResources();
  assert.equal(trinity._sceneResources.includes(r), false);
});

test("a device release drops the state until the device prepares it again, keeping its one entry", t =>
{
  clock(t);
  const r = resource();
  r.IsGood();
  trinity.device.ReleaseDeviceResources();
  assert.equal(r._state, 0, "NONE");
  trinity.device.PrepareDeviceResources();
  assert.equal(r._state, 1, "PREPARED");
  assert.equal(r.IsGood(), true);
  assert.equal(r.prepares, 2);
  assert.equal(trinity._sceneResources.filter(x => x === r).length, 1);
  trinity.UnregisterResource(r);
  trinity.CollectResources();
});
