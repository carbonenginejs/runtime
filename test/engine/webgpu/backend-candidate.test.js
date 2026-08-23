import assert from "node:assert/strict";
import test from "node:test";

import { CjsBackendCandidate } from "../../../npm/dist/global/contracts/index.js";
import {
  CjsWebgpuBackendCandidate,
  CjsWebgpuDevice
} from "../../../npm/dist/engine/webgpu/index.js";


const SHADER_STAGE = Object.freeze({ VERTEX: 1, FRAGMENT: 2, COMPUTE: 4 });


function fakeDevice()
{
  return {
    createShaderModule() {},
    lost: new Promise(() => {})
  };
}


test("CjsWebgpuBackendCandidate is the nominal WebGPU selection participant", () =>
{
  const candidate = new CjsWebgpuBackendCandidate({
    label: "main device",
    limits: { maxSampledTexturesPerShaderStage: 20 },
    features: new Set([ "texture-compression-bc" ])
  });

  assert.ok(candidate instanceof CjsBackendCandidate);
  assert.equal(candidate.name, "webgpu");
  assert.equal(candidate.label, "main device");
  assert.deepEqual(candidate.limits, { maxSampledTexturesPerShaderStage: 20 });
  assert.deepEqual(candidate.features, [ "texture-compression-bc" ]);
});


test("CjsWebgpuBackendCandidate proves by acquiring a ready device with the resolved descriptor", async () =>
{
  const device = fakeDevice();
  const descriptor = Object.freeze({
    requiredLimits: Object.freeze({ maxSampledTexturesPerShaderStage: 20 })
  });
  const adapterOptions = Object.freeze({ powerPreference: "high-performance" });
  const seen = [];
  const adapter = {
    async requestDevice(value)
    {
      seen.push([ "device", value ]);
      return device;
    }
  };
  const gpu = {
    async requestAdapter(value)
    {
      seen.push([ "adapter", value ]);
      return adapter;
    }
  };
  const candidate = new CjsWebgpuBackendCandidate({
    requestOptions: { gpu, adapterOptions, shaderStage: SHADER_STAGE }
  });

  const proof = await candidate.Prove({ descriptor });

  assert.ok(proof instanceof CjsWebgpuDevice);
  assert.equal(proof.GetDevice(), device);
  assert.deepEqual(seen, [ [ "adapter", adapterOptions ], [ "device", descriptor ] ]);
  assert.equal(seen[1][1], descriptor);
});


test("CjsWebgpuBackendCandidate keeps core policy out of engine request options", async () =>
{
  assert.throws(
    () => new CjsWebgpuBackendCandidate({ requestOptions: { deviceDescriptor: {} } }),
    /cannot override the core-resolved device descriptor/i
  );
  assert.throws(
    () => new CjsWebgpuBackendCandidate({ requestOptions: null }),
    /requestOptions must be an object/i
  );

  const candidate = new CjsWebgpuBackendCandidate({
    requestOptions: { gpu: null, shaderStage: SHADER_STAGE }
  });
  await assert.rejects(candidate.Prove({ descriptor: Object.freeze({}) }), /WebGPU is unavailable/i);
  assert.throws(() => candidate.Prove(null), /requires a selection context/i);
});
