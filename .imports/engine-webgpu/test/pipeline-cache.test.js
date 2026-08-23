import assert from "node:assert/strict";
import { test } from "node:test";

import { CanonicalKey, CjsWebgpuPipelineCache, RenderPipelineKey } from "../src/core/pipelineCache.js";

test("CanonicalKey ignores property order but not content", () =>
{
  // A recipe assembled by two code paths is the same recipe; treating key
  // order as significant would miss every such hit.
  assert.equal(
    CanonicalKey({ topology: "triangle-list", cullMode: "back" }),
    CanonicalKey({ cullMode: "back", topology: "triangle-list" })
  );
  assert.notEqual(CanonicalKey({ cullMode: "back" }), CanonicalKey({ cullMode: "front" }));
  assert.notEqual(CanonicalKey([ 1, 2 ]), CanonicalKey([ 2, 1 ]), "array order is content");
  // A string "1" and a number 1 are different bindings, so they key differently.
  assert.notEqual(CanonicalKey({ a: 1 }), CanonicalKey({ a: "1" }));
  assert.equal(CanonicalKey({ a: 1, b: undefined }), CanonicalKey({ a: 1 }));
});

test("RenderPipelineKey declines to key an unnamed program", () =>
{
  // Keying on the recipe alone would hand back another program's pipeline:
  // two different programs share a recipe constantly.
  assert.equal(RenderPipelineKey(null, { topology: "triangle-list" }), null);
  assert.equal(RenderPipelineKey(undefined, {}), null);

  assert.equal(
    RenderPipelineKey("sha256:abc", { topology: "triangle-list" }),
    RenderPipelineKey("sha256:abc", { topology: "triangle-list" })
  );
  assert.notEqual(
    RenderPipelineKey("sha256:abc", { topology: "triangle-list" }),
    RenderPipelineKey("sha256:def", { topology: "triangle-list" })
  );
  assert.notEqual(
    RenderPipelineKey("sha256:abc", { topology: "triangle-list" }),
    RenderPipelineKey("sha256:abc", { topology: "line-list" })
  );
});

test("CjsWebgpuPipelineCache builds once per key and generation", async () =>
{
  const cache = new CjsWebgpuPipelineCache();
  let builds = 0;
  const build = () => Promise.resolve({ built: ++builds });

  const first = await cache.Resolve("a", 1, build);
  const second = await cache.Resolve("a", 1, build);
  assert.equal(builds, 1);
  assert.equal(first, second);
  assert.equal(cache.size, 1);

  await cache.Resolve("b", 1, build);
  assert.equal(builds, 2);
});

test("CjsWebgpuPipelineCache never hands back a pipeline from a dead device", async () =>
{
  const cache = new CjsWebgpuPipelineCache();
  let builds = 0;
  const build = () => Promise.resolve({ built: ++builds });

  const first = await cache.Resolve("a", 1, build);
  const afterLoss = await cache.Resolve("a", 2, build);

  // A pipeline built for a device that is gone is not repairable, and handing
  // it back would use a dead GPU object.
  assert.notEqual(first, afterLoss);
  assert.equal(builds, 2);

  await cache.Resolve("b", 2, build);
  cache.Prune(2);
  assert.equal(cache.size, 2);
  cache.Prune(3);
  assert.equal(cache.size, 0);
});

test("CjsWebgpuPipelineCache shares one build between racing callers", async () =>
{
  // Pipeline creation is asynchronous on this backend and a frame legitimately
  // prepares many at once; without this each caller creates a GPU object and
  // one silently wins.
  const cache = new CjsWebgpuPipelineCache();
  let builds = 0;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const build = () => gate.then(() => ({ built: ++builds }));

  const both = Promise.all([ cache.Resolve("a", 1, build), cache.Resolve("a", 1, build) ]);
  release();
  const [ first, second ] = await both;

  assert.equal(builds, 1);
  assert.equal(first, second);
});

test("CjsWebgpuPipelineCache does not poison a key with a failed build", async () =>
{
  const cache = new CjsWebgpuPipelineCache();
  let attempts = 0;
  const build = () =>
  {
    attempts += 1;
    return attempts === 1 ? Promise.reject(new Error("device busy")) : Promise.resolve({ ok: true });
  };

  await assert.rejects(() => cache.Resolve("a", 1, build), /device busy/);
  assert.equal(cache.size, 0, "a transient failure must not make the key permanently unbuildable");

  assert.deepEqual(await cache.Resolve("a", 1, build), { ok: true });
});

test("CjsWebgpuPipelineCache bypasses itself for an unnamed pipeline", async () =>
{
  const cache = new CjsWebgpuPipelineCache();
  let builds = 0;
  const build = () => Promise.resolve({ built: ++builds });

  await cache.Resolve(null, 1, build);
  await cache.Resolve(null, 1, build);

  // Not caching is never wrong, only slower. Retaining under a null key would
  // hand every unnamed pipeline the first one's result.
  assert.equal(builds, 2);
  assert.equal(cache.size, 0);

  await assert.rejects(() => cache.Resolve("a", 1, null), /build function is required/);
});
