import assert from "node:assert/strict";
import test from "node:test";
import { blue } from "../../npm/dist/blue/index.js";
import { TriDevice, trinity, Tr2DeviceResource, Tr2Renderer, EveTrailsSet } from "../../npm/dist/trinity/index.js";
import { CjsGraph } from "../../npm/dist/global/model/graph/CjsGraph.js";
const SECOND = 10000000;
function setup(t) {
  const oldResources = TriDevice._resourcesRegistered, oldGenerations = TriDevice._registeredGenerations;
  TriDevice._resourcesRegistered = []; TriDevice._registeredGenerations = [];
  let now = 1000 * SECOND;
  const previousActiveTime = TriDevice.activeTime;
  TriDevice.activeTime = now;
  t.after(() => { TriDevice.activeTime = previousActiveTime; });
  t.mock.method(Tr2Renderer, "IsResourceCreationAllowed", () => true);
  const device = new TriDevice();
  t.after(() => { TriDevice._resourcesRegistered = oldResources; TriDevice._registeredGenerations = oldGenerations; });
  return { device, at: seconds => { now = (1000 + seconds) * SECOND; TriDevice.activeTime = now; } };
}
function resource(result = true) {
  const r = Object.create(Tr2DeviceResource.prototype);
  r.prepares = 0; r.releases = 0;
  r._OnPrepareResources = () => { r.prepares++; return result; };
  r.ReleaseResources = () => { r.releases++; };
  return r;
}
test("readiness renews and registers without preparing; device preparation makes it good", t => {
  const { device, at } = setup(t), r = resource();
  assert.equal(r.IsGood(), false); assert.equal(r.prepares, 0);
  assert.deepEqual(device.GetResourcesRegistered(), [r]);
  assert.equal(r.IsGood(), false); assert.equal(r.prepares, 0);
  device._PreparePendingResources(); assert.equal(r.IsGood(), true); assert.equal(r.prepares, 1);
  at(5); r.KeepAlive(); assert.equal(r._stamp, 1005 * SECOND);
  device._PreparePendingResources(); assert.equal(r.prepares, 1);
});
test("failed and throwing preparation back off without starving other resources", t => {
  const { device, at } = setup(t), bad = resource(false), throws = resource(), good = resource();
  throws._OnPrepareResources = () => { throws.prepares++; throw new Error("fixture"); };
  for (const r of [bad, throws, good]) r.KeepAlive();
  device._PreparePendingResources(); device._PreparePendingResources();
  assert.equal(bad.prepares, 1); assert.equal(throws.prepares, 1); assert.equal(good.IsGood(), true);
  at(1); device._PreparePendingResources(); assert.equal(bad.prepares, 2); assert.equal(throws.prepares, 2);
});
test("idle expiry releases once; next use registers and waits for preparation", t => {
  const { device, at } = setup(t), r = resource();
  r.KeepAlive(); device._PreparePendingResources(); at(TriDevice.resourceIdleRule + 1);
  device.CollectResources(); device.CollectResources(); assert.equal(r.releases, 1);
  assert.deepEqual(device.GetResourcesRegistered(), []); assert.equal(r._state, 0);
  assert.equal(r.IsGood(), false); assert.equal(r.prepares, 1);
  device._PreparePendingResources(); assert.equal(r.IsGood(), true); assert.equal(r.prepares, 2);
});
test("renewed and exempt infrastructure resources survive idle collection", t => {
  const { device, at } = setup(t), used = resource(), infrastructure = resource();
  infrastructure._neverPurge = true; used.KeepAlive(); infrastructure.KeepAlive();
  device._PreparePendingResources(); at(TriDevice.resourceIdleRule + 1); used.IsGood(); device.CollectResources();
  assert.equal(used.releases, 0); assert.equal(infrastructure.releases, 0);
});
test("destroyed resources cannot register or prepare again", t => {
  const { device } = setup(t), r = resource(); r.KeepAlive();
  Tr2DeviceResource.prototype.Destruct.call(r); assert.equal(r.IsGood(), false); device._PreparePendingResources();
  assert.equal(r.prepares, 0); assert.deepEqual(device.GetResourcesRegistered(), []);
});
test("trail destruction removes pending device registration immediately", t => {
  const { device } = setup(t), trails = new EveTrailsSet();
  trails.KeepAlive(); assert.ok(device.GetResourcesRegistered().includes(trails));
  trails.Destruct(); device._PreparePendingResources();
  assert.equal(device.GetResourcesRegistered().includes(trails), false);
  assert.equal(trails.IsGood(), false);
});
test("preparation budget progresses fairly across ticks", t => {
  const { device } = setup(t); device.resourcePrepareBudget = 1;
  const a = resource(false), b = resource(), c = resource();
  for (const r of [a,b,c]) r.KeepAlive();
  device._PreparePendingResources(); assert.deepEqual([a.prepares,b.prepares,c.prepares], [1,0,0]);
  device._PreparePendingResources(); device._PreparePendingResources();
  assert.deepEqual([a.prepares,b.prepares,c.prepares], [1,1,1]);
});
test("resource creation gate and destruction during preparation are respected", t => {
  const { device } = setup(t), r = resource(); r.KeepAlive();
  Tr2Renderer.IsResourceCreationAllowed.mock.mockImplementation(() => false);
  device._PreparePendingResources(); assert.equal(r.prepares, 0);
  Tr2Renderer.IsResourceCreationAllowed.mock.mockImplementation(() => true);
  r.PrepareResources = () => { Tr2DeviceResource.prototype.Destruct.call(r); return true; };
  // Destructed is the graph's answer; the device state only says it is not prepared.
  device._PreparePendingResources(); assert.equal(CjsGraph.isDestructed(r), true); assert.equal(r._state, 0); assert.equal(r.IsGood(), false);
});
test("release callback can renew without its new registration being removed", t => {
  const { device, at } = setup(t), r = resource(); r.KeepAlive(); device._PreparePendingResources();
  r.ReleaseResources = () => { r.releases++; r.KeepAlive(); };
  at(TriDevice.resourceIdleRule + 1); device.CollectResources();
  assert.deepEqual(device.GetResourcesRegistered(), [r]); assert.equal(r.releases, 1);
  device._PreparePendingResources(); assert.equal(r.IsGood(), true);
});
test("OnTick prepares pending resources and performs the idle sweep", t => {
  const { device, at } = setup(t), r = resource();
  t.mock.method(device, "Update", () => {}); t.mock.method(device, "HandleRenderTick", () => {});
  r.KeepAlive(); device.OnTick(); assert.equal(r.prepares, 1);
  at(TriDevice.resourceSweepInterval + TriDevice.resourceIdleRule + 1);
  device.OnTick(); assert.equal(r.releases, 1); assert.deepEqual(device.GetResourcesRegistered(), []);
});
