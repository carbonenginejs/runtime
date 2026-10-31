import { configureResourceManager } from "../../support/configuredResMan.js";
import assert from "node:assert/strict";
import { test } from "node:test";

import { CjsBlueResMan } from "../../../npm/dist/resource/index.js";
import { Tr2EffectRes } from "../../../npm/dist/trinity/shader/index.js";
import "../../support/frameLoop.js";

// A browser backend has no shipped containers of its own. The orchestrator
// commits the source tree, target and translator once; the loader passes the
// shipped bytes through and Tr2EffectRes translates them when they load.

const SHIPPED = new Uint8Array([ 1, 2, 3, 4 ]);
const calls = [];
const translator = {
  buildEffect(bytes, options)
  {
    calls.push({ bytes, options });
    return { bytes: new Uint8Array([ 9 ]), metadata: { bodyIndex: 0 }, permutationGraph: { variants: [ { permutationIndex: 0, bodyKey: "a" } ] } };
  }
};

Tr2EffectRes.CommitBackend({ source: "dx11", target: "webgpu", translator });

/** Loads a path through a manager whose source answers every read with SHIPPED. */
async function Load(path)
{
  calls.length = 0;
  const resourceManager = await configureResourceManager(new CjsBlueResMan({ source: { Read: () => SHIPPED } }));
  const resource = resourceManager.GetResource(path);
  // The synthetic bytes are not a container; the load fails after the
  // translation decision, which is what these tests observe.
  await resourceManager.Ready(resource).catch(() => {});
  return [ ...calls ];
}

test("the loader passes shipped bytes through and takes no translation options", async () =>
{
  const resourceManager = await configureResourceManager(new CjsBlueResMan());
  const loader = resourceManager.GetObjectLoader("sm_hi");

  assert.equal(loader(SHIPPED, {}), SHIPPED);
  assert.equal(Tr2EffectRes.readShaderResource.length, 1);
});

test("a shipped effect.dx11 path is translated on load, told its own path", async () =>
{
  const made = await Load("res:/graphics/effect.dx11/managed/space/quad/quadv5.sm_hi");

  assert.equal(made.length, 1);
  assert.deepEqual(Array.from(made[0].bytes), Array.from(SHIPPED));
  assert.equal(made[0].options.source, "res:/graphics/effect.dx11/managed/space/quad/quadv5.sm_hi");
});

test("an effect.webgpu path is stored, not translated", async () =>
{
  assert.equal((await Load("res:/graphics/effect.webgpu/cjs/selection/selectionmask.sm_hi")).length, 0);
});
