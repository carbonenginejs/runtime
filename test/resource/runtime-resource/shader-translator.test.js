import assert from "node:assert/strict";
import { test } from "node:test";

import { CjsResMan, ResourceRequirement } from "../../../npm/dist/resource/index.js";
import { RegisterShaderResources } from "../../../npm/dist/resource/shader/index.js";

// A browser backend has no shipped containers, so composition passes the
// backend's effect format as a translator: the byte source supplies the
// shipped container and the translator's output is what Tr2EffectRes loads.

const PATH = "res:/graphics/effect.webgpu/managed/space/quad/quadv5.sm_hi";
const SHIPPED = new Uint8Array([ 1, 2, 3, 4 ]);

test("the translator converts the shipped bytes and its output is what loads", async () =>
{
  const calls = [];
  const translated = new Uint8Array([ 9, 9, 9 ]);
  const translator = { buildEffect: async (bytes, options) => { calls.push({ bytes, options }); return { bytes: translated }; } };
  const resourceManager = RegisterShaderResources(new CjsResMan({ source: { Read: () => SHIPPED } }), { translator });

  const resource = resourceManager.GetResource(PATH, { requirement: ResourceRequirement.SHADER });
  let loaded = null;
  resource.DoLoad = data => { loaded = data; };

  await resource.Ready().catch(() => {});

  assert.equal(calls.length, 1);
  assert.deepEqual(Array.from(calls[0].bytes), Array.from(SHIPPED));
  assert.equal(calls[0].options.source, PATH, "the translator is told the resource's own path");
  assert.equal(loaded, translated, "Tr2EffectRes receives the translation, not the shipped bytes");
});

test("without a translator the container bytes load unchanged", async () =>
{
  const resourceManager = RegisterShaderResources(new CjsResMan({ source: { Read: () => SHIPPED } }));
  const resource = resourceManager.GetResource(PATH, { requirement: ResourceRequirement.SHADER });
  let loaded = null;
  resource.DoLoad = data => { loaded = data; };

  await resource.Ready().catch(() => {});

  assert.deepEqual(Array.from(loaded), Array.from(SHIPPED));
});

test("a translator without buildEffect is refused", () =>
{
  assert.throws(() => RegisterShaderResources(new CjsResMan(), { translator: {} }), TypeError);
});
