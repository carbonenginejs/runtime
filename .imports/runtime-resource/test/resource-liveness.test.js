// The liveness contract: IsGood renews, KeepAlive revives, completed fires for
// both outcomes and replays to late subscribers.
//
// These three are what make a consumer able to ignore purging entirely. Each
// one has a failure mode that is silent rather than loud - a resource that is
// never renewed, a purged handle that never comes back, a subscriber that waits
// forever - so they are pinned here rather than left to integration.
import assert from "node:assert/strict";
import { test } from "node:test";

import { CjsResource } from "../npm/dist/index.js";


const { State } = CjsResource;


/** A resource with a stub manager, recording what the lifecycle asked for. */
function createBound(state = State.PREPARED)
{
  const calls = { keepAlive: 0, reload: 0 };
  const resource = new CjsResource();
  resource.path = "res:/thing.png";
  resource.SetState(state);
  resource.SetLifecycleController({
    keepAlive: () => { calls.keepAlive += 1; }
  });
  // Bound separately from the controller, because purge detaches the latter.
  resource.SetReloadHook(() => { calls.reload += 1; resource.MarkRequested(); });
  return { resource, calls };
}


test("IsGood renews, because every caller is about to use the resource", () =>
{
  // ccpwgl merges these (Tw2Resource.js:108-112) so no call site can forget.
  const { resource, calls } = createBound();

  assert.equal(resource.IsGood(), true);
  assert.equal(calls.keepAlive, 1, "the query renewed the resource");

  resource.IsGood();
  assert.equal(calls.keepAlive, 2, "every query renews");
});


test("a purged resource reloads itself the moment anything asks", () =>
{
  const { resource, calls } = createBound();
  resource.MarkPurged();

  assert.equal(resource.IsGood(), false, "purged is not good");
  assert.equal(calls.reload, 1, "asking for it started a reload");
  assert.equal(resource.state, State.REQUESTED, "back on the normal load path");

  // And it is not good WHILE reloading - which is what stops a half-loaded draw.
  assert.equal(resource.IsGood(), false);
  assert.equal(calls.reload, 1, "no second reload once underway");
});


test("Reload does nothing to a resource that is loaded or still loading", () =>
{
  // It recovers a payload that is absent but recoverable. It is not a way to
  // force a refetch of something already present.
  for (const state of [ State.PREPARED, State.LOADING, State.LOADED, State.PREPARING, State.EMPTY ])
  {
    const { resource, calls } = createBound(state);
    assert.equal(resource.Reload(), false, state);
    assert.equal(calls.reload, 0, state);
    assert.equal(resource.state, state, `${state} is left alone`);
  }
});


test("a failed resource retries, but only up to the cap", () =>
{
  // Without a cap this is a retry storm: KeepAlive runs from IsGood, which the
  // render path calls every frame.
  const { resource, calls } = createBound(State.EMPTY);
  resource.SetError(new Error("cdn hiccup"));

  for (let i = 0; i < CjsResource.maxReloadAttempts; i++)
  {
    assert.equal(resource.Reload(), true, `attempt ${i + 1}`);
    resource.SetError(new Error("still failing"));
  }

  assert.equal(resource.Reload(), false, "gives up after the cap");
  assert.equal(calls.reload, CjsResource.maxReloadAttempts);
});


test("a successful load clears the retry budget", () =>
{
  // The cap bounds CONSECUTIVE failures, not how often a resource may be purged
  // and reloaded across a long session.
  const { resource, calls } = createBound(State.EMPTY);

  resource.SetError(new Error("blip"));
  resource.Reload();
  assert.equal(resource.GetReloadAttempts(), 1);

  resource.MarkPrepared();
  assert.equal(resource.GetReloadAttempts(), 0, "success resets the count");

  resource.MarkPurged();
  resource.Reload();
  assert.equal(calls.reload, 2, "and the next purge is free to reload");
});


test("ResetReloadAttempts is the deliberate try-again gesture", () =>
{
  const { resource } = createBound(State.EMPTY);
  resource.SetError(new Error("nope"));

  for (let i = 0; i < CjsResource.maxReloadAttempts; i++)
  {
    resource.Reload();
    resource.SetError(new Error("nope"));
  }
  assert.equal(resource.Reload(), false, "exhausted");

  resource.ResetReloadAttempts();
  assert.equal(resource.Reload(), true, "asked again on purpose");
});


test("a detached purged handle stays purged rather than pretending", () =>
{
  const resource = new CjsResource();
  resource.SetState(State.PREPARED);
  resource.MarkPurged();

  assert.equal(resource.Reload(), false, "no manager to re-register with");
  assert.equal(resource.state, State.PURGED);
});


test("PURGED is not terminal, because it is recoverable", () =>
{
  assert.equal(CjsResource.isTerminalState(State.PURGED), false);
  assert.equal(CjsResource.isTerminalState(State.PREPARED), true);
  assert.equal(CjsResource.isTerminalState(State.FAILED), true);
});


test("completed means finished trying, either way", () =>
{
  const good = new CjsResource();
  const bad = new CjsResource();

  assert.equal(good.HasCompleted(), false, "empty has not tried yet");

  good.MarkPrepared();
  bad.SetError(new Error("nope"));

  assert.equal(good.HasCompleted(), true);
  assert.equal(bad.HasCompleted(), true, "failure is completion too");

  // The narrower question is still available, and is what handlers branch on.
  assert.equal(good.IsPrepared(), true);
  assert.equal(bad.IsPrepared(), false);
});


test("purging is not completion - nothing was tried and nothing concluded", () =>
{
  // If it were, subscribers would rebuild cached data from a deleted payload.
  const resource = new CjsResource();
  resource.MarkPrepared();
  resource.MarkPurged();

  assert.equal(resource.HasCompleted(), false);
});


test("OnCompleted fires for both outcomes and lets the handler branch", () =>
{
  const seen = [];
  const good = new CjsResource();
  const bad = new CjsResource();

  good.OnCompleted(res => seen.push(res.IsPrepared()));
  bad.OnCompleted(res => seen.push(res.IsPrepared()));

  good.MarkPrepared();
  bad.SetError(new Error("nope"));

  assert.deepEqual(seen, [ true, false ]);
});


test("OnCompleted fires immediately when the resource already finished", () =>
{
  // The gap a plain emitter leaves: subscribe after PREPARED and nothing ever
  // arrives, so callers do the work synchronously "just in case" instead.
  const resource = new CjsResource();
  resource.MarkPrepared();

  let called = 0;
  resource.OnCompleted(() => { called += 1; });

  assert.equal(called, 1, "replayed rather than dropped");
  assert.equal(resource.GetEventListenerCount("completed"), 0, "and stored nothing");
});


test("a reload completes again, so derived data gets rebuilt", () =>
{
  // The symmetry that makes revival identical to first load for a subscriber.
  const { resource } = createBound(State.EMPTY);

  let completions = 0;
  resource.OnCompleted(() => { completions += 1; });

  resource.MarkPrepared();
  assert.equal(completions, 1);

  resource.MarkPurged();
  resource.IsGood();              // reloads
  resource.MarkPrepared();

  assert.equal(completions, 2, "the payload changed, so subscribers hear again");
});


test("OnCompleted rejects a non-function rather than silently never firing", () =>
{
  assert.throws(() => new CjsResource().OnCompleted(null), TypeError);
});


test("isResource is declared on the class, not just the instance", () =>
{
  // So a schema field declared as @type.objectRef("TriGeometryRes") can be
  // known to hold a resource before any instance exists.
  class Derived extends CjsResource {}

  assert.equal(CjsResource.isResource, true);
  assert.equal(Derived.isResource, true, "subclasses inherit the declaration");
  assert.equal(new Derived().isResource, true, "and the instance agrees");
});


// End-to-end: the whole point of the contract is that a consumer holding a
// purged handle gets it back without ever learning it was gone.
test("a purged handle reloads into itself when something asks for it again", async () =>
{
  const { CjsResMan } = await import("../npm/dist/index.js");

  let reads = 0;
  const resMan = new CjsResMan({
    source: { Read: () => { reads += 1; return `{"value":${reads}}`; } }
  });
  resMan.RegisterObjectLoader("json", value => JSON.parse(value));

  const path = "res:/data/liveness.json";
  const handle = resMan.GetResource(path);
  assert.deepEqual(await handle.Ready(), { value: 1 });
  assert.equal(handle.IsGood(), true);

  // Evict it out from under the consumer, exactly as the idle sweep would.
  resMan.PurgeInactive({ maxIdleFrames: 0, maxIdleMilliseconds: 0 });
  assert.equal(handle.IsPurged(), true, "the sweep deleted it");

  // The consumer does nothing special - it just asks whether it can draw.
  assert.equal(handle.IsGood(), false, "not good while it comes back");
  assert.equal(handle.IsPurged(), false, "asking started the reload");

  await handle.Ready();

  assert.equal(handle.IsGood(), true, "the SAME handle is alive again");
  assert.equal(resMan.Lookup(path), handle, "and is canonical once more");
  assert.equal(reads, 2, "it really did reload, rather than never purging");
});


test("a purged handle declines to reload when another has claimed its identity", async () =>
{
  // Displacing the newcomer would kill whoever holds it - the exact failure
  // this contract exists to prevent - so the stale handle stays purged.
  const { CjsResMan } = await import("../npm/dist/index.js");

  const resMan = new CjsResMan({ source: { Read: () => "{}" } });
  resMan.RegisterObjectLoader("json", value => JSON.parse(value));

  const path = "res:/data/contested.json";
  const stale = resMan.GetResource(path);
  await stale.Ready();

  resMan.PurgeInactive({ maxIdleFrames: 0, maxIdleMilliseconds: 0 });
  assert.equal(stale.IsPurged(), true);

  const claimant = resMan.GetResource(path);
  assert.notEqual(claimant, stale, "a fresh handle took the identity");

  assert.equal(stale.Reload(), false, "declined");
  assert.equal(stale.IsPurged(), true, "and says so honestly");
  assert.equal(resMan.Lookup(path), claimant, "the newcomer is untouched");
});
