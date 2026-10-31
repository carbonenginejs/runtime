import { Tr2SkinnedModel } from "../../../npm/dist/character/trinity/trinityCore/Tr2SkinnedModel.js";
import { Tr2GrannyPrimitiveSet } from "../../../npm/dist/trinity/core/line/Tr2GrannyPrimitiveSet.js";
import { EveTrailsSet } from "../../../npm/dist/trinity/eve/attachment/booster/EveTrailsSet.js";
import { EveTurretSet } from "../../../npm/dist/trinity/eve/attachment/turrets/EveTurretSet.js";
// Carbon keeps notify targets until their owners explicitly detach them.
// BlueAsyncRes.cpp:261-334; completion does not surrender owner subscriptions.
import assert from "node:assert/strict";
import { test } from "node:test";
import { BlueAsyncRes, blue, BlueResMan } from "../../../npm/dist/global/blue/index.js";
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
    assert.deepEqual(resource._reloadNotifyTargets, [target]);
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

test("a mesh rebinds and destructs both native geometry subscriptions", () =>
{
  const mesh = new Tr2Mesh(), first = new TriGeometryRes(), second = new TriGeometryRes(), low = new TriGeometryRes();
  mesh.SetGeometryRes(first);
  mesh.SetLowResGeometryRes(low);
  mesh.SetGeometryRes(second);
  first.AssertNoNotifyTargets();
  assert.deepEqual(second._reloadNotifyTargets, [mesh]);
  assert.deepEqual(low._reloadNotifyTargets, [mesh]);
  mesh.Destruct();
  second.AssertNoNotifyTargets();
  low.AssertNoNotifyTargets();
});

test("a shared-geometry animation detaches on rebinding and destruction", () =>
{
  const animation = new Tr2GrannyAnimation(), first = new TriGeometryRes(), second = new TriGeometryRes();
  animation.SetSharedGeometryRes(first);
  animation.SetSharedGeometryRes(second);
  first.AssertNoNotifyTargets();
  assert.deepEqual(second._reloadNotifyTargets, [animation]);
  animation.Destruct();
  second.AssertNoNotifyTargets();
});

test("an effect destructor detaches both resource references without duplicate removal", () =>
{
  const effect = new Tr2Effect(), first = new BlueAsyncRes(), second = new BlueAsyncRes();
  effect.effectResource = first;
  effect._acquiredEffectResource = second;
  first.AddNotifyTarget(effect);
  second.AddNotifyTarget(effect);
  effect.Destruct();
  first.AssertNoNotifyTargets();
  second.AssertNoNotifyTargets();
  effect.Destruct();
});

test("trails detach old geometry when rebound and current geometry when destructed", () =>
{
  const owner = new EveTrailsSet(), first = new TriGeometryRes(), second = new TriGeometryRes();
  owner.SetGeometryResource(first);
  owner.SetGeometryResource(second);
  first.AssertNoNotifyTargets();
  assert.deepEqual(second._reloadNotifyTargets, [owner]);
  owner.Destruct();
  second.AssertNoNotifyTargets();
});

test("skinned models, primitive sets and turrets detach their path-acquired resources", t =>
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
    assert.deepEqual(first._reloadNotifyTargets, [owner]);
    owner[field] = "res:/second.gr2";
    const second = next = new TriGeometryRes();
    owner[method]();
    first.AssertNoNotifyTargets();
    assert.deepEqual(second._reloadNotifyTargets, [owner]);
    owner.Destruct();
    second.AssertNoNotifyTargets();
  }
});
