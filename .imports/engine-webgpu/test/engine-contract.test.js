import assert from "node:assert/strict";
import { test } from "node:test";

import { CjsWebgpuTrinityBatchDispatcher } from "../src/core/trinityBatchDispatcher.js";
import { CjsWebgpuDevice } from "../src/index.js";
import { EngineContractChecks } from "./conformance/engineContract.js";

// The adapter this file supplies is the whole point: it is how a backend
// declares "here is how you reach my seams" without the suite naming a single
// WebGPU type. engine-webgl will write its own, and the suite will not change.

function boundary()
{
  return {
    PreparePipeline: async () => ({}),
    CreateRenderPipeline: async () => ({}),
    CreateBindingSet: () => ({ Destroy() {} }),
    CreateDraw: () => ({}),
    EncodeDraw: () => {}
  };
}

const webgpu = {
  name: "WebGPU",

  CreateDispatcher(hooks)
  {
    return new CjsWebgpuTrinityBatchDispatcher(boundary(), hooks);
  },

  AssertResourceAdapter(resource)
  {
    // Reached through the public realization entry point rather than an
    // internal helper, so the check exercises what a caller actually hits. The
    // device is the barest thing this backend accepts as ready; the suite never
    // sees it.
    const device = new CjsWebgpuDevice({
      device: { createShaderModule: () => ({}) },
      shaderStage: { VERTEX: 1, FRAGMENT: 2, COMPUTE: 4 }
    });
    device.RealizeSampler(resource, { samplerKey: "s" });
  },

  IsAdapterRejection(message)
  {
    return /adapter methods/i.test(message);
  },

  PrepareAccumulator(accumulator)
  {
    const hooks = {
      ResolveMaterial: async () => ({}),
      ResolveGeometry: async () => ({}),
      ResolveBindings: async () => ({})
    };
    return new CjsWebgpuTrinityBatchDispatcher(boundary(), hooks).PrepareAccumulator(accumulator);
  },

  PrepareBatchMap(batchMap)
  {
    const hooks = {
      ResolveMaterial: async () => ({}),
      ResolveGeometry: async () => ({}),
      ResolveBindings: async () => ({})
    };
    return new CjsWebgpuTrinityBatchDispatcher(boundary(), hooks).PrepareBatchMap(batchMap);
  }
};

for (const check of EngineContractChecks(webgpu))
{
  test(check.title, async () => { await check.Run(assert); });
}
