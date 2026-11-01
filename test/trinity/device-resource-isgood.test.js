// Tr2DeviceResource.IsGood (docs internal/decisions/device-resource-registration.md):
// a use registers the resource with trinity and prepares it on first use, renews
// it after, and answers whether its device objects exist; the eviction pass
// releases what goes unused and the next use prepares it again.
import assert from "node:assert/strict";
import test from "node:test";

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

/**
 * Passes rendered time and runs the eviction pass.
 *
 * @param {number} seconds Rendered seconds to add first.
 */
function pass(seconds)
{
  trinity._renderedTime += seconds;
  trinity._ReleaseIdleResources();
}

test("the first IsGood registers and prepares; later ones only renew", () =>
{
  const r = resource();
  assert.equal(trinity.GetResourcesRegistered().includes(r), false, "built and never used: not registered");
  assert.equal(r.IsGood(), true);
  assert.equal(r.prepares, 1);
  assert.equal(trinity.GetResourcesRegistered().includes(r), true);
  assert.equal(r._retention, trinity.resourceRetentionShort, "the short rule by default");
  trinity._renderedTime += 3;
  assert.equal(r.IsGood(), true);
  assert.equal(r.prepares, 1, "no second prepare while registered");
  assert.equal(r._lastUsed, trinity._renderedTime);
  trinity.UnregisterResource(r);
  pass(0);
});

test("a failed prepare answers false", () =>
{
  const r = resource(false);
  assert.equal(r.IsGood(), false);
  trinity.UnregisterResource(r);
  pass(0);
});

test("unused past its rule it is released and dropped; the next IsGood prepares it again", () =>
{
  const r = resource();
  r.IsGood();
  pass(trinity.resourceRetentionShort + 1);
  assert.equal(r.releases, 1);
  assert.equal(trinity.GetResourcesRegistered().includes(r), false);
  assert.equal(r._prepared, false);
  assert.equal(r.IsGood(), true);
  assert.equal(r.prepares, 2);
  assert.equal(trinity.GetResourcesRegistered().includes(r), true);
  trinity.UnregisterResource(r);
  pass(0);
});

test("used within its rule it survives every pass", () =>
{
  const r = resource();
  for (let i = 0; i < 30; i++)
  {
    r.IsGood();
    pass(1);
  }
  assert.equal(r.releases, 0);
  assert.equal(r.prepares, 1);
  trinity.UnregisterResource(r);
  pass(0);
});

test("a device release clears the answer until the device prepares it again", () =>
{
  const r = resource();
  r.IsGood();
  trinity.device.ReleaseDeviceResources();
  assert.equal(r._prepared, false);
  trinity.device.PrepareDeviceResources();
  assert.equal(r.IsGood(), true);
  assert.equal(r.prepares, 2);
  trinity.UnregisterResource(r);
  pass(0);
});

test("an owner's rule set before the first use is kept", () =>
{
  const r = resource();
  r._retention = Infinity;
  r.IsGood();
  pass(1e9);
  assert.equal(r.releases, 0);
  trinity.UnregisterResource(r);
  pass(0);
});
