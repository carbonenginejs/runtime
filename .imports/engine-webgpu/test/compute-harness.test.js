import assert from "node:assert/strict";
import test from "node:test";

import { createHarnessComputePipeline } from "../harness/webgpu/computePipeline.js";

function computeDescriptor()
{
  return {
    key: "Main.pass0",
    shaderModules: [ {
      key: "Main.pass0.compute",
      stageName: "compute",
      stageType: 2,
      threadGroupSize: [ 1, 1, 1 ],
      wgsl: `
@group(0) @binding(0) var<storage, read_write> values: array<u32>;
@compute @workgroup_size(1)
fn main()
{
  values[0] = values[0] + 1u;
}`,
      entryPoint: "main"
    } ],
    bindGroups: [ {
      group: 0,
      bindings: [ {
        key: "group0:binding0",
        identity: "storage-resource:0:0",
        scopeIdentity: "storage-resource:0:0@compute",
        resourceKind: "storage-resource",
        sourceTruth: "wgsl-layout",
        group: 0,
        binding: 0,
        dynamic: false,
        visibility: [ "compute" ],
        layout: {
          type: "array<u32>",
          buffer: { type: "storage", hasDynamicOffset: false, minBindingSize: 4 },
          texture: null,
          sampler: null
        }
      } ]
    } ]
  };
}

function fakeDevice(messages = [])
{
  const calls = {
    shaderModules: [],
    bindGroupLayouts: [],
    pipelineLayouts: [],
    computePipelines: []
  };
  return {
    calls,
    pushErrorScope(filter)
    {
      assert.equal(filter, "validation");
    },
    async popErrorScope()
    {
      return null;
    },
    createShaderModule(descriptor)
    {
      calls.shaderModules.push(descriptor);
      return {
        async getCompilationInfo()
        {
          return { messages };
        }
      };
    },
    createBindGroupLayout(descriptor)
    {
      calls.bindGroupLayouts.push(descriptor);
      return { descriptor };
    },
    createPipelineLayout(descriptor)
    {
      calls.pipelineLayouts.push(descriptor);
      return { descriptor };
    },
    async createComputePipelineAsync(descriptor)
    {
      calls.computePipelines.push(descriptor);
      return { descriptor };
    }
  };
}

test("compute harness creates a canonical validation-only native pipeline", async () =>
{
  const device = fakeDevice();
  const result = await createHarnessComputePipeline(device, computeDescriptor(), { COMPUTE: 4 });
  assert.equal(result.bindingCount, 1);
  assert.equal(result.warningCount, 0);
  assert.equal(device.calls.shaderModules.length, 1);
  assert.equal(device.calls.bindGroupLayouts.length, 1);
  assert.deepEqual(device.calls.bindGroupLayouts[0].entries, [ {
    binding: 0,
    visibility: 4,
    buffer: { type: "storage", hasDynamicOffset: false, minBindingSize: 4 }
  } ]);
  assert.equal(device.calls.computePipelines.length, 1);
  assert.equal(device.calls.computePipelines[0].compute.entryPoint, "main");
});

test("compute harness rejects render topology, non-compute visibility, and diagnostics", async () =>
{
  const render = computeDescriptor();
  render.shaderModules[0].stageName = "vertex";
  await assert.rejects(
    createHarnessComputePipeline(fakeDevice(), render, { COMPUTE: 4 }),
    /exactly one compute shader/u
  );

  const visibility = computeDescriptor();
  visibility.bindGroups[0].bindings[0].visibility = [ "fragment" ];
  await assert.rejects(
    createHarnessComputePipeline(fakeDevice(), visibility, { COMPUTE: 4 }),
    /visibility must contain exactly compute/u
  );

  await assert.rejects(
    createHarnessComputePipeline(
      fakeDevice([ { type: "warning", message: "synthetic warning" } ]),
      computeDescriptor(),
      { COMPUTE: 4 }
    ),
    /compute WGSL produced diagnostics: synthetic warning/u
  );
});
