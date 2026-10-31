// The readiness watch: resolve once every resource an object reaches has
// finished, so the object can be shown whole instead of built in pieces.
//
// Ours (CjsBlueResMan.Watch JSDoc): the operator's ccpwgl Tw2MotherLode.Watch,
// not Carbon's Tr2LoadPrepareFence. Also pins the two error paths agreed with
// it: a resource left EMPTY is failed rather than waited on forever, and a
// failed load is prepared but bad; late cancelled attempts are covered separately.
import assert from "node:assert/strict";
import { test, beforeEach, afterEach } from "node:test";

import "../../../npm/dist/index.js";
import { CjsBlueResMan, BlueAsyncRes, blue } from "../../../npm/dist/global/blue/index.js";
import { Tr2Effect, TriTextureParameter } from "../../../npm/dist/trinity/index.js";
import { TriTextureRes } from "../../../npm/dist/resource/index.js";
import { Tr2EffectRes } from "../../../npm/dist/trinity/shader/index.js";
import { HoldFrameLoop } from "../../support/frameLoop.js";


/** Fixture completion uses the native flags and manager operation settlement. */
function prepared(resource)
{
  resource._isLoading = false;
  resource._SetGood(true);
  resource._SetPrepared(true);
  blue.resMan._FinishResourceLoad(resource);
}


/** An effect holding an effect resource and one texture, both in REQUESTED. */
function watchedEffect()
{
  const effect = new Tr2Effect();
  const effectRes = new Tr2EffectRes();
  effectRes._path = "res:/fx/thing.sm_hi";
  effectRes._isLoading = true;
  effect.effectResource = effectRes;
  const texture = addTexture(effect, "res:/tex/a.dds", true);
  return { effect, effectRes, texture };
}


function addTexture(effect, path, state)
{
  const texture = new TriTextureRes();
  texture._path = path;
  texture._isLoading = state;
  const parameter = new TriTextureParameter();
  parameter.SetParameterName(path);
  parameter.SetResource(texture);
  effect.AddResource(parameter);
  return texture;
}


/** Records how a watch promise settled, without awaiting it. */
function track(promise)
{
  const outcome = { settled: false, value: null, error: null };
  promise.then(value => { outcome.settled = true; outcome.value = value; },
    error => { outcome.settled = true; outcome.error = error; });
  return outcome;
}


const tick = () => new Promise(resolve => setImmediate(resolve));


test("a watch resolves after two updates with nothing pending", async () =>
{
  const resMan = new CjsBlueResMan();
  blue.resMan = resMan;
  const { effect, effectRes, texture } = watchedEffect();
  const outcome = track(resMan.Watch(effect));

  resMan.UpdateWatched({ time: 0 });
  prepared(effectRes);
  resMan.UpdateWatched({ time: 10 });
  await tick();
  assert.equal(outcome.settled, false, "the texture is still loading");

  prepared(texture);
  resMan.UpdateWatched({ time: 20 });
  await tick();
  assert.equal(outcome.settled, false, "one quiet update is not enough");

  resMan.UpdateWatched({ time: 30 });
  await tick();
  assert.equal(outcome.value.object, effect);
  assert.deepEqual(outcome.value.failed, []);
});


test("a resource added by a finishing parent is still counted", async () =>
{
  const resMan = new CjsBlueResMan();
  blue.resMan = resMan;
  const { effect, effectRes, texture } = watchedEffect();
  prepared(effectRes);
  prepared(texture);
  const outcome = track(resMan.Watch(effect));

  resMan.UpdateWatched({ time: 0 });                   // quiet once
  const late = addTexture(effect, "res:/tex/late.dds", true);
  resMan.UpdateWatched({ time: 10 });                  // the late child resets it
  prepared(late);
  resMan.UpdateWatched({ time: 20 });
  resMan.UpdateWatched({ time: 30 });
  await tick();
  assert.equal(outcome.value.object, effect);
});


test("a failed resource does not hold the watch, and is reported", async () =>
{
  const resMan = new CjsBlueResMan();
  blue.resMan = resMan;
  const { effect, effectRes, texture } = watchedEffect();
  const outcome = track(resMan.Watch(effect));
  prepared(effectRes);
  resMan._FailResourceLoad(texture, new Error("missing"));
  resMan.UpdateWatched({ time: 0 });
  resMan.UpdateWatched({ time: 1 });
  await tick();
  assert.deepEqual(outcome.value.failed, [ texture ]);
});


test("the watch renews a purged resource and waits for its same-handle reload", async () =>
{
  let release, reads = 0;
  class WatchedResource extends BlueAsyncRes
  {
    _DoLoad() { return BlueAsyncRes.LoadingResult.LR_SUCCESS; }
    _DoPrepare() { return true; }
  }
  const resMan = new CjsBlueResMan({ source: {Read() { reads++; return new Promise(resolve => { release = resolve; }); }} });
  blue.resMan = resMan;
  resMan.RegisterObjectLoader("watch", data => data);
  resMan.RegisterExtension("watch", WatchedResource);
  const resource = new WatchedResource();
  resource._path = "res:/watch.watch";
  resMan._MarkResourcePurged(resource);
  const outcome = track(resMan.Watch(resource));
  resMan.UpdateWatched({time: 0});
  resMan.UpdateWatched({time: 1});
  await tick();
  assert.equal(outcome.settled, false);
  assert.equal(reads, 1);
  assert.equal(resource.IsLoading(), true);
  release(new Uint8Array([1]));
  await resMan.Ready(resource);
  resMan.UpdateWatched({time: 2});
  resMan.UpdateWatched({time: 3});
  await tick();
  assert.equal(outcome.value.object, resource);
  assert.equal(resMan.Lookup(resource.GetPath()), resource);
});


test("a resource left EMPTY is failed after the stall limit, and the watch completes", async t =>
{
  // UpdateWatched runs on this test's clock; the frame loop's Update would not.
  HoldFrameLoop(t);
  const resMan = new CjsBlueResMan();
  blue.resMan = resMan;
  const { effect, effectRes, texture } = watchedEffect();
  prepared(effectRes);
  prepared(texture);
  const stub = addTexture(effect, "res:/tex/never.dds", false);
  const outcome = track(resMan.Watch(effect, { stallMilliseconds: 100 }));

  resMan.UpdateWatched({ time: 0 });
  resMan.UpdateWatched({ time: 99 });
  await tick();
  assert.equal(outcome.settled, false);
  assert.equal(stub.IsPrepared(), false);

  resMan.UpdateWatched({ time: 100 });
  assert.equal(stub.IsPrepared(), true);
  assert.equal(stub.IsGood(), false);
  assert.equal(resMan.GetResourceStatus(stub).error.code, "CJS_RESOURCE_NEVER_STARTED");
  assert.match(resMan.GetResourceStatus(stub).error.message, /Resource never started/);
  resMan.UpdateWatched({ time: 101 });
  await tick();
  assert.deepEqual(outcome.value.failed, [ stub ]);
});


test("a watch times out naming what was still pending", async () =>
{
  const resMan = new CjsBlueResMan();
  blue.resMan = resMan;
  const { effect } = watchedEffect();
  const outcome = track(resMan.Watch(effect, { timeoutMilliseconds: 50 }));
  resMan.UpdateWatched({ time: 0 });
  resMan.UpdateWatched({ time: 50 });
  await tick();
  assert.equal(outcome.error.code, "CJS_RESOURCE_WATCH_TIMEOUT");
  assert.deepEqual(outcome.error.pending.sort(), [ "res:/fx/thing.sm_hi", "res:/tex/a.dds" ]);
});


test("Unwatch rejects the watch and stops counting it", async () =>
{
  const resMan = new CjsBlueResMan();
  blue.resMan = resMan;
  const { effect } = watchedEffect();
  const outcome = track(resMan.Watch(effect));
  assert.equal(resMan.Unwatch(effect), true);
  assert.equal(resMan.Unwatch(effect), false);
  await tick();
  assert.equal(outcome.error.code, "CJS_RESOURCE_WATCH_CANCELLED");
  assert.equal(resMan.UpdateWatched({ time: 0 }), 0);
});


test("the manager's Update advances watches", async () =>
{
  const resMan = new CjsBlueResMan();
  blue.resMan = resMan;
  const { effect, effectRes, texture } = watchedEffect();
  prepared(effectRes);
  prepared(texture);
  const outcome = track(resMan.Watch(effect));
  resMan.Update({ watch: { time: 0 } });
  resMan.Update({ watch: { time: 1 } });
  await tick();
  assert.equal(outcome.value.object, effect);
});







let previousManager;
beforeEach(() => { previousManager = blue.resMan; });
afterEach(() => { try { blue.resMan.Clear(); } finally { blue.resMan = previousManager; } });
