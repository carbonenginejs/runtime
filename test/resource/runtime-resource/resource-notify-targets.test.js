import { Tr2SkinnedModel } from "../../../npm/dist/character/trinity/trinityCore/Tr2SkinnedModel.js";
import { Tr2GrannyPrimitiveSet } from "../../../npm/dist/trinity/core/line/Tr2GrannyPrimitiveSet.js";
import { EveTrailsSet } from "../../../npm/dist/trinity/eve/attachment/booster/EveTrailsSet.js";
import { EveTurretSet } from "../../../npm/dist/trinity/eve/attachment/turrets/EveTurretSet.js";
// Carbon keeps notify targets until their owners explicitly detach them.
// BlueAsyncRes.cpp:261-334; completion does not surrender owner subscriptions.
import assert from "node:assert/strict";
import { test } from "node:test";
import { BlueAsyncRes, blue, BlueResMan } from "../../../npm/dist/blue/blue/index.js";
import { TriGeometryRes } from "../../../npm/dist/resource/index.js";
import { Tr2Mesh } from "../../../npm/dist/trinity/core/mesh/Tr2Mesh.js";
import { Tr2GrannyAnimation } from "../../../npm/dist/trinity/core/animation/Tr2GrannyAnimation.js";
import { Tr2Effect } from "../../../npm/dist/trinity/shader/index.js";

/** Record native flags without renewing the resource. */
function targetFor(seen)
{
  return {
    RebuildCachedData: resource => seen.push(["rebuild", resource.IsPrepared(), resource._isGood]),
    ReleaseCachedData: resource => seen.push(["release", resource.IsPrepared(), resource._isGood])
  };
}

test("both outcomes notify persistent targets with Carbon's prepared flag", () =>
{
  for (const good of [true, false])
  {
    const resource = new BlueAsyncRes(), seen = [], target = targetFor(seen);
    resource.AddNotifyTarget(target);
    resource._SetPrepared(true);
    resource._SetGood(good);
    resource._NotifyRebuildCachedData();
    assert.deepEqual(seen, [["rebuild", true, good]]);
    assert.deepEqual(resource._reloadNotifyTargets.map(ref => ref.deref()), [target]);
    resource._NotifyReleaseCachedData();
    assert.deepEqual(seen[1], ["release", true, good]);
    resource.RemoveNotifyTarget(target);
    resource.AssertNoNotifyTargets();
  }
});

test("a late target is called immediately and remains subscribed", () =>
{
  const resource = new BlueAsyncRes(), seen = [], target = targetFor(seen);
  resource._SetPrepared(true);
  resource._SetGood(true);
  resource.AddNotifyTarget(target);
  resource._NotifyRebuildCachedData();
  assert.equal(seen.length, 2);
  resource.RemoveNotifyTarget(target);
  resource._NotifyRebuildCachedData();
  assert.equal(seen.length, 2);
});

test("native duplicate registration is preserved and removal erases every occurrence", () =>
{
  const resource = new BlueAsyncRes(), seen = [], target = targetFor(seen);
  resource.AddNotifyTarget(target);
  resource.AddNotifyTarget(target);
  resource._NotifyRebuildCachedData();
  assert.equal(seen.length, 2);
  resource.RemoveNotifyTarget(target);
  resource.AssertNoNotifyTargets();
});

test("many completed subscriptions are released by deterministic owner teardown", () =>
{
  const resource = new BlueAsyncRes();
  let told = 0;
  const targets = Array.from({length: 1000}, () => ({ RebuildCachedData() { told++; }, ReleaseCachedData() {} }));
  for (const target of targets) resource.AddNotifyTarget(target);
  resource._NotifyRebuildCachedData();
  assert.equal(told, targets.length);
  for (const target of targets) resource.RemoveNotifyTarget(target);
  resource.AssertNoNotifyTargets();
});

/**
 * Mark a resource finished, good or failed, as preparing does.
 * @param {BlueAsyncRes} resource
 * @param {boolean} good
 */
function finish(resource, good)
{
  resource._SetPrepared(true);
  resource._SetGood(good);
  resource._NotifyRebuildCachedData();
}

test("a mesh pulls both geometry slots' changes at GetGeometryResource and registers no target", () =>
{
  const mesh = new Tr2Mesh(), geometry = new TriGeometryRes(), low = new TriGeometryRes(), seen = recordCachedData(mesh);
  mesh.SetGeometryRes(geometry);
  mesh.SetLowResGeometryRes(low);
  assert.equal(mesh.GetGeometryResource(), low);
  assert.deepEqual(seen, []);

  finish(low, true);
  mesh.GetGeometryResource();
  mesh.GetGeometryResource();
  assert.deepEqual(seen, [["rebuild", low]]);

  finish(geometry, true);
  assert.equal(mesh.GetGeometryResource(), geometry);
  assert.deepEqual(seen, [["rebuild", low], ["rebuild", geometry]]);

  geometry.AssertNoNotifyTargets();
  low.AssertNoNotifyTargets();
  mesh.Destruct();
});

test("a shared-geometry animation pulls its geometry's changes at each update and registers no target", () =>
{
  const animation = new Tr2GrannyAnimation(), geometry = new TriGeometryRes(), seen = recordCachedData(animation);
  animation.SetSharedGeometryRes(geometry);
  seen.length = 0;
  animation._RenewResources();
  assert.deepEqual(seen, []);

  finish(geometry, true);
  animation._RenewResources();
  animation._RenewResources();
  assert.deepEqual(seen, [["rebuild", geometry]]);

  geometry._SetGood(false);
  animation._RenewResources();
  assert.deepEqual(seen.at(-1), ["release", geometry]);

  geometry.AssertNoNotifyTargets();
  animation.Destruct();
});

test("a skinned model pulls its geometry's changes when its skeleton is asked for", t =>
{
  const manager = blue.resMan, original = manager.GetResource, geometry = new TriGeometryRes();
  manager.GetResource = () => geometry;
  t.after(() => { manager.GetResource = original; });
  const model = new Tr2SkinnedModel(), seen = recordCachedData(model);
  model.geometryResPath = "res:/model.gr2";
  model.Initialize();
  finish(geometry, true);
  model.GetSkeleton();
  model.GetSkeleton();
  assert.deepEqual(seen, [["rebuild", geometry]]);

  // Initializing again rebuilds from the same resource, as Carbon's AddNotifyTarget does at once.
  model.Initialize();
  model.GetSkeleton();
  assert.deepEqual(seen, [["rebuild", geometry], ["rebuild", geometry]]);
  geometry.AssertNoNotifyTargets();
  model.Destruct();
});

/**
 * Replace an owner's two Carbon methods with recorders, and return what they saw.
 * @param {object} owner
 * @returns {Array<Array>}
 */
function recordCachedData(owner)
{
  const seen = [];
  owner.RebuildCachedData = resource => seen.push(["rebuild", resource]);
  owner.ReleaseCachedData = resource => seen.push(["release", resource]);
  return seen;
}

test("an effect registers no notify target and pulls its resource's changes at EnsureGood", () =>
{
  const effect = new Tr2Effect(), resource = new BlueAsyncRes(), seen = recordCachedData(effect);
  effect.effectResource = resource;
  assert.equal(effect.EnsureGood(), false);
  assert.deepEqual(seen, []);

  resource._SetPrepared(true);
  resource._SetGood(true);
  effect.EnsureGood();
  effect.EnsureGood();
  assert.deepEqual(seen, [["rebuild", resource]]);

  resource._NotifyRebuildCachedData();
  effect.EnsureGood();
  assert.deepEqual(seen.at(-1), ["rebuild", resource]);
  assert.equal(seen.length, 2);

  resource._SetGood(false);
  effect.EnsureGood();
  effect.EnsureGood();
  assert.deepEqual(seen.at(-1), ["release", resource]);
  assert.equal(seen.length, 3);

  resource.AssertNoNotifyTargets();
  effect.Destruct();
  effect.Destruct();
});

test("trails register no target when bound or rebound", () =>
{
  const owner = new EveTrailsSet(), first = new TriGeometryRes(), second = new TriGeometryRes();
  owner.SetGeometryResource(first);
  owner.SetGeometryResource(second);
  first.AssertNoNotifyTargets();
  second.AssertNoNotifyTargets();
  owner.Destruct();
});

test("skinned models, primitive sets and turrets register no target on their path-acquired resources", t =>
{
  const manager = blue.resMan, original = manager.GetResource;
  let next;
  manager.GetResource = () => next;
  t.after(() => { manager.GetResource = original; });
  const cases = [
    [new Tr2SkinnedModel(), "geometryResPath", "Initialize"],
    [new Tr2GrannyPrimitiveSet(), "grannyResPath", "SetGrannyResource"],
    [new EveTurretSet(), "geometryResPath", "InitializeGeometryResource"]
  ];
  for (const [owner, field, method] of cases)
  {
    if (owner.constructor === EveTurretSet) owner.lodLevel = EveTurretSet.LOD.LOD_HIGHEST;
    owner[field] = "res:/first.gr2";
    const first = next = new TriGeometryRes();
    owner[method]();
    first.AssertNoNotifyTargets();
    owner[field] = "res:/second.gr2";
    const second = next = new TriGeometryRes();
    owner[method]();
    second.AssertNoNotifyTargets();
    owner.Destruct();
  }
});
