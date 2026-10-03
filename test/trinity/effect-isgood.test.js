// Tr2Effect.IsGood: "am I good to draw", answered from the effect's own
// resource, after renewing every resource the effect holds.
//
// Ours, not Carbon's (see the method's JSDoc). The two failure modes pinned
// here are both silent: an early exit that leaves later textures unrenewed, and
// a failed texture that switches the whole effect off.
import assert from "node:assert/strict";
import { test } from "node:test";

import { Tr2Effect, Tr2Shader, TriTextureParameter } from "../../npm/dist/trinity/index.js";
import { Tr2EffectRes } from "../../npm/dist/resource/shader/index.js";
import { CjsResource, TriTextureRes } from "../../npm/dist/resource/index.js";


const { State } = CjsResource;


/** Adds a texture parameter bound to a resource in `state`, counting renewals. */
function addTexture(effect, name, state)
{
  const resource = new TriTextureRes();
  resource.path = `res:/${name}.dds`;
  resource.SetState(state);
  const renewals = { count: 0 };
  resource.SetLifecycleController({ keepAlive: () => { renewals.count += 1; } });

  const parameter = new TriTextureParameter();
  parameter.SetParameterName(name);
  parameter.SetResource(resource);
  effect.AddResource(parameter);
  return renewals;
}


test("IsGood renews every texture, with no early exit at the first one not ready", () =>
{
  const effect = new Tr2Effect();
  const pending = addTexture(effect, "pending", State.REQUESTED);
  const failed = addTexture(effect, "failed", State.FAILED);
  const ready = addTexture(effect, "ready", State.PREPARED);

  effect.IsGood();
  assert.deepEqual([ pending.count, failed.count, ready.count ], [ 1, 1, 1 ]);
  effect.IsGood();
  assert.deepEqual([ pending.count, failed.count, ready.count ], [ 2, 2, 2 ]);
});


test("a failed texture does not make the effect bad; it draws with the fallback", () =>
{
  const effect = new Tr2Effect();
  addTexture(effect, "missing", State.FAILED);
  effect.shader = new Tr2Shader();
  assert.equal(effect.IsGood(), true);
});


test("an effect without a resolved shader is not good", () =>
{
  const effect = new Tr2Effect();
  assert.equal(effect.IsGood(), false);
});


test("a pending effect resource is not good, and registers the effect once", () =>
{
  let registrations = 0;
  class CountingEffectRes extends Tr2EffectRes
  {
    AddNotifyTarget(target)
    {
      registrations += 1;
      return super.AddNotifyTarget(target);
    }
  }
  const effect = new Tr2Effect();
  const resource = new CountingEffectRes();
  resource.SetState(State.REQUESTED);
  effect.effectResource = resource;
  effect.shader = new Tr2Shader();      // stale: from before a purge, say

  assert.equal(effect.IsGood(), false, "the resource answers, not a leftover shader");
  assert.equal(effect.IsGood(), false);
  assert.equal(registrations, 2, "asked each time; the resource keeps one");

  let rebuilds = 0;
  effect.RebuildCachedDataInternal = () => { rebuilds += 1; };
  resource.MarkPrepared();
  assert.equal(rebuilds, 1, "told once when the resource finished");
});


test("a failed effect resource is not re-registered, so it is not rebuilt every frame", () =>
{
  const effect = new Tr2Effect();
  const resource = new Tr2EffectRes();
  resource.SetError(new Error("missing effect"));
  effect.effectResource = resource;

  let rebuilds = 0;
  effect.RebuildCachedDataInternal = () => { rebuilds += 1; };
  for (let frame = 0; frame < 5; frame++) assert.equal(effect.IsGood(), false);
  assert.equal(rebuilds, 0);
});


test("pure queries on a purged resource do not revive it", () =>
{
  const resource = new CjsResource();
  resource.path = "res:/thing.dds";
  resource.MarkPrepared();
  let reloads = 0;
  resource.SetReloadHook(() => { reloads += 1; resource.MarkRequested(); });
  resource.MarkPurged();

  resource.IsPrepared();
  resource.HasCompleted();
  resource.IsPurged();
  resource.IsFailed();
  assert.equal(reloads, 0, "looking is not using");
  assert.equal(resource.state, State.PURGED);

  resource.IsGood();
  assert.equal(reloads, 1, "asking IsGood is using");
});
