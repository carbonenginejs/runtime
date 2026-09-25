import assert from "node:assert/strict";
import { test } from "node:test";

import { CjsResMan, ResourceRequirement } from "../../../npm/dist/resource/index.js";
import { RegisterShaderResources } from "../../../npm/dist/resource/shader/index.js";

// A browser backend has no shipped containers, so composition passes the
// backend's effect format as a translator: the byte source supplies the
// shipped container and the translator's output is what Tr2EffectRes loads.

const PATH = "res:/graphics/effect.webgpu/managed/space/quad/quadv5.sm_hi";
const SHIPPED = new Uint8Array([ 1, 2, 3, 4 ]);

/** A translator whose default build carries a body for indices 0 and 2 of four. */
function Translator(calls, translated)
{
  return {
    buildEffect: (bytes, options) =>
    {
      calls.push({ bytes, options });
      return {
        bytes: translated,
        metadata: { bodyIndex: 0 },
        permutationGraph: { variants: [ 0, 1, 0, 2 ].map((body, permutationIndex) => ({ permutationIndex, bodyKey: `body${body}` })) }
      };
    }
  };
}

/** Loads PATH through a manager and captures what reaches the resource. */
async function Load(options)
{
  const resourceManager = RegisterShaderResources(new CjsResMan({ source: { Read: () => SHIPPED } }), options);
  const resource = resourceManager.GetResource(PATH, { requirement: ResourceRequirement.SHADER });
  const seen = { loaded: null, translator: null };
  resource.DoLoad = data => { seen.loaded = data; };
  resource.SetPermutationTranslator = (translate, indices) => { seen.translator = { translate, indices }; };

  await resource.Ready().catch(() => {});
  return seen;
}

test("the translator converts the shipped bytes and its output is what loads", async () =>
{
  const calls = [];
  const translated = new Uint8Array([ 9, 9, 9 ]);
  const seen = await Load({ translator: Translator(calls, translated) });

  assert.equal(calls.length, 1, "on demand, the load translates one permutation");
  assert.deepEqual(Array.from(calls[0].bytes), Array.from(SHIPPED));
  assert.equal(calls[0].options.source, PATH, "the translator is told the resource's own path");
  assert.deepEqual(calls[0].options.permutation, [], "the load translates the default permutation");
  assert.equal(seen.loaded, translated, "Tr2EffectRes receives the translation, not the shipped bytes");
  assert.deepEqual(seen.translator.indices, [ 0, 2 ], "every index sharing the translated body is covered");

  const later = seen.translator.translate([ { name: "AXIS", value: "ON" } ]);
  assert.deepEqual(calls[1].options.permutation, [ { name: "AXIS", value: "ON" } ]);
  assert.deepEqual(Array.from(calls[1].bytes), Array.from(SHIPPED), "later permutations translate the same shipped bytes");
  assert.equal(later.bytes, translated);
});

test("permutations: all translates every permutation at load and installs no translator", async () =>
{
  const calls = [];
  const seen = await Load({ translator: Translator(calls, new Uint8Array([ 7 ])), permutations: "all" });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.mode, "all");
  assert.equal(seen.translator, null);
  assert.deepEqual(Array.from(seen.loaded), [ 7 ]);
});

test("an unknown permutations mode is refused", () =>
{
  assert.throws(() => RegisterShaderResources(new CjsResMan(), { translator: Translator([], null), permutations: "some" }), TypeError);
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
