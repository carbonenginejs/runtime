import assert from "node:assert/strict";
import { test } from "node:test";

import { CjsResource } from "../../../npm/dist/resource/index.js";
import { CjsWebgpuDevice } from "../../../npm/dist/engine/webgpu/index.js";
import { CjsWebgpuTrinityBatchDispatcher } from "../../../npm/dist/engine/webgpu/internal.js";
import {
  CjsTrinityBatchResolver,
  ITriRenderBatchAccumulator,
  TriRenderBatchMap
} from "../../../npm/dist/trinity/core/index.js";
import { EngineContractChecks } from "./conformance/engineContract.js";

// The adapter this file supplies is the whole point: it is how a backend
// declares "here is how you reach my seams" without the suite naming a single
// WebGPU type. engine-webgl will write its own, and the suite will not change.

function boundary()
{
  return new CjsWebgpuDevice({
    device: { createShaderModule: () => ({}) },
    shaderStage: { VERTEX: 1, FRAGMENT: 2, COMPUTE: 4 }
  });
}


class EmptyResolver extends CjsTrinityBatchResolver
{
  ResolveMaterial() { return {}; }
  ResolveGeometry() { return {}; }
  ResolveBindings() { return {}; }
}


class EmptyAccumulator extends ITriRenderBatchAccumulator
{
  GetGdprBatches() { return []; }
  GetBatches() { return []; }
  GetBatchCount() { return 0; }
}

const webgpu = {
  name: "WebGPU",

  CreateResolver()
  {
    return new EmptyResolver();
  },

  CreateDispatcher(resolver)
  {
    return new CjsWebgpuTrinityBatchDispatcher(boundary(), resolver);
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

  CreateResource()
  {
    return new CjsResource();
  },

  IsAdapterRejection(message)
  {
    return /CjsResource/i.test(message);
  },

  CreateAccumulator()
  {
    return new EmptyAccumulator();
  },

  CreateBatchMap()
  {
    return new TriRenderBatchMap([]);
  },

  PrepareAccumulator(accumulator)
  {
    return new CjsWebgpuTrinityBatchDispatcher(
      boundary(),
      new EmptyResolver()
    ).PrepareAccumulator(accumulator);
  },

  PrepareBatchMap(batchMap)
  {
    return new CjsWebgpuTrinityBatchDispatcher(
      boundary(),
      new EmptyResolver()
    ).PrepareBatchMap(batchMap);
  }
};

for (const check of EngineContractChecks(webgpu))
{
  test(check.title, async () => { await check.Run(assert); });
}
