// The readiness watch: resolve once every resource an object reaches has
// finished, so the object can be shown whole instead of built in pieces.
//
// Ours (CjsBlueResMan.Watch JSDoc): the operator's ccpwgl Tw2MotherLode.Watch,
// not Carbon's Tr2LoadPrepareFence. Also pins the two error paths agreed with
// it: a resource left EMPTY is failed rather than waited on forever, and a
// result arriving after a failure is an error, not a success.
import assert from "node:assert/strict";
import { test } from "node:test";

import "../../../npm/dist/index.js";
import { CjsBlueResMan, CjsResource } from "../../../npm/dist/global/blue/index.js";
import { Tr2Effect, TriTextureParameter } from "../../../npm/dist/trinity/index.js";
import { TriTextureRes } from "../../../npm/dist/resource/index.js";
import { Tr2EffectRes } from "../../../npm/dist/resource/shader/index.js";


const { State } = CjsResource;


/** An effect holding an effect resource and one texture, both in REQUESTED. */
function watchedEffect()
{
  const effect = new Tr2Effect();
  const effectRes = new Tr2EffectRes();
  effectRes.path = "res:/fx/thing.sm_hi";
  effectRes.SetState(State.REQUESTED);
  effect.effectResource = effectRes;
  const texture = addTexture(effect, "res:/tex/a.dds", State.REQUESTED);
  return { effect, effectRes, texture };
}


function addTexture(effect, path, state)
{
  const texture = new TriTextureRes();
  texture.path = path;
  texture.SetState(state);
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
  const { effect, effectRes, texture } = watchedEffect();
  const outcome = track(resMan.Watch(effect));

  resMan.UpdateWatched({ time: 0 });
  effectRes.MarkPrepared();
  resMan.UpdateWatched({ time: 10 });
  await tick();
  assert.equal(outcome.settled, false, "the texture is still loading");

  texture.MarkPrepared();
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
  const { effect, effectRes, texture } = watchedEffect();
  effectRes.MarkPrepared();
  texture.MarkPrepared();
  const outcome = track(resMan.Watch(effect));

  resMan.UpdateWatched({ time: 0 });                   // quiet once
  const late = addTexture(effect, "res:/tex/late.dds", State.REQUESTED);
  resMan.UpdateWatched({ time: 10 });                  // the late child resets it
  late.MarkPrepared();
  resMan.UpdateWatched({ time: 20 });
  resMan.UpdateWatched({ time: 30 });
  await tick();
  assert.equal(outcome.value.object, effect);
});


test("a failed resource does not hold the watch, and is reported", async () =>
{
  const resMan = new CjsBlueResMan();
  const { effect, effectRes, texture } = watchedEffect();
  const outcome = track(resMan.Watch(effect));
  effectRes.MarkPrepared();
  texture.SetError(new Error("missing"));
  resMan.UpdateWatched({ time: 0 });
  resMan.UpdateWatched({ time: 1 });
  await tick();
  assert.deepEqual(outcome.value.failed, [ texture ]);
});


test("the watch renews everything, and a purged resource counts as pending", async () =>
{
  const resMan = new CjsBlueResMan();
  const { effect, effectRes, texture } = watchedEffect();
  effectRes.MarkPrepared();
  texture.MarkPrepared();
  let renewals = 0;
  let reloads = 0;
  texture.SetLifecycleController({ keepAlive: () => { renewals += 1; } });
  texture.SetReloadHook(() => { reloads += 1; texture.MarkRequested(); });
  texture.MarkPurged();

  const outcome = track(resMan.Watch(effect));
  resMan.UpdateWatched({ time: 0 });
  resMan.UpdateWatched({ time: 1 });
  await tick();
  assert.equal(outcome.settled, false, "purged is not finished");
  assert.equal(reloads, 1, "renewing the purged texture started its reload");
  assert.ok(renewals >= 2, "renewed on every update");

  texture.MarkPrepared();
  resMan.UpdateWatched({ time: 2 });
  resMan.UpdateWatched({ time: 3 });
  await tick();
  assert.equal(outcome.value.object, effect);
});


test("a resource left EMPTY is failed after the stall limit, and the watch completes", async () =>
{
  const resMan = new CjsBlueResMan();
  const { effect, effectRes, texture } = watchedEffect();
  effectRes.MarkPrepared();
  texture.MarkPrepared();
  const stub = addTexture(effect, "res:/tex/never.dds", State.EMPTY);
  const outcome = track(resMan.Watch(effect, { stallMilliseconds: 100 }));

  resMan.UpdateWatched({ time: 0 });
  resMan.UpdateWatched({ time: 99 });
  await tick();
  assert.equal(outcome.settled, false);
  assert.equal(stub.state, State.EMPTY);

  resMan.UpdateWatched({ time: 100 });
  assert.equal(stub.state, State.FAILED);
  assert.equal(stub.error.code, "CJS_RESOURCE_NEVER_STARTED");
  assert.match(stub.error.message, /remained EMPTY for 100 ms; it was never requested/);
  resMan.UpdateWatched({ time: 101 });
  await tick();
  assert.deepEqual(outcome.value.failed, [ stub ]);
});


test("a watch times out naming what was still pending", async () =>
{
  const resMan = new CjsBlueResMan();
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
  const { effect, effectRes, texture } = watchedEffect();
  effectRes.MarkPrepared();
  texture.MarkPrepared();
  const outcome = track(resMan.Watch(effect));
  resMan.Update({ watch: { time: 0 } });
  resMan.Update({ watch: { time: 1 } });
  await tick();
  assert.equal(outcome.value.object, effect);
});


test("a result after a failure is an error, and the resource stays failed", () =>
{
  const resource = new CjsResource();
  resource.path = "res:/late.dds";
  const original = new Error("timed out");
  resource.SetError(original);

  const seen = [];
  resource.OnEvent("lateresult", (_name, _res, error) => seen.push(error.code));
  resource.MarkPrepared();

  assert.equal(resource.state, State.FAILED);
  assert.equal(resource.IsGood(), false);
  assert.equal(resource.error.code, "CJS_RESOURCE_COMPLETED_AFTER_FAILURE");
  assert.equal(resource.error.cause, original);
  assert.deepEqual(seen, [ "CJS_RESOURCE_COMPLETED_AFTER_FAILURE" ]);
});


test("a failed resource still reloads through a new request", () =>
{
  const resource = new CjsResource();
  resource.SetError(new Error("first try"));
  resource.MarkRequested();
  resource.MarkPrepared();
  assert.equal(resource.state, State.PREPARED);
});
