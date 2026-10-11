import assert from "node:assert/strict";
import { test } from "node:test";

import { CjsWebgpuDevice } from "../../../npm/dist/trinityal/webgpu/index.js";

function deferred()
{
  let resolve;
  const promise = new Promise((accept) => { resolve = accept; });
  return { promise, resolve };
}

/** A GPUDevice at the seams the boundary touches; `lost` settles through the returned deferred. */
function fakeDevice(name = "device")
{
  const lost = deferred();
  const calls = [];
  const device = {
    name,
    calls,
    lost: lost.promise,
    queue: { submit(commandBuffers) { calls.push([ "submit", commandBuffers ]); } },
    createShaderModule: descriptor => ({ kind: "shaderModule", descriptor }),
    destroy() { calls.push([ "destroy" ]); }
  };
  return { device, lost };
}

test("CjsWebgpuDevice reports a loss of its current device and refuses it afterwards", async () =>
{
  const first = fakeDevice("loss-first");
  const webgpu = new CjsWebgpuDevice({ device: first.device });
  assert.equal(webgpu.IsLost(), false);

  const info = { reason: "unknown", message: "simulated" };
  first.lost.resolve(info);
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(webgpu.IsLost(), true);
  assert.equal(webgpu.GetLostInfo(), info);
  assert.throws(() => webgpu.GetDevice(), /device is lost/i);
});

test("CjsWebgpuDevice ignores a loss reported by a device it already replaced", async () =>
{
  const first = fakeDevice("stale-loss-first");
  const second = fakeDevice("stale-loss-second");
  const webgpu = new CjsWebgpuDevice({
    gpu: { requestAdapter: async () => ({ requestDevice: async () => second.device }) },
    device: first.device
  });
  await webgpu.Recreate();
  first.lost.resolve({ reason: "destroyed", message: "replaced" });
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(webgpu.IsLost(), false);
  assert.equal(webgpu.GetDevice(), second.device);
  assert.equal(webgpu.GetGeneration(), 2);
  assert.equal(first.device.calls.filter(([ kind ]) => kind === "destroy").length, 1);
});

test("CjsWebgpuDevice cannot be resurrected by an in-flight recreation", async () =>
{
  const first = fakeDevice("destroy-race-first");
  const acquired = fakeDevice("destroy-race-acquired");
  const adapterGate = deferred();
  const gpu = { requestAdapter: async () => adapterGate.promise };
  const webgpu = new CjsWebgpuDevice({ gpu, device: first.device });
  const recreation = webgpu.Recreate();
  await Promise.resolve();
  webgpu.Destroy();
  adapterGate.resolve({ requestDevice: async () => acquired.device });
  await assert.rejects(recreation, /recreation was superseded/i);
  assert.equal(webgpu.IsReady(), false);
  assert.throws(() => webgpu.GetDevice(), /device is destroyed/i);
  assert.equal(first.device.calls.filter(([ kind ]) => kind === "destroy").length, 1);
  assert.equal(acquired.device.calls.filter(([ kind ]) => kind === "destroy").length, 1);
});

test("CjsWebgpuDevice lets only the latest overlapping recreation commit", async () =>
{
  const initial = fakeDevice("overlap-initial");
  const older = fakeDevice("overlap-older");
  const newer = fakeDevice("overlap-newer");
  const olderAdapterGate = deferred();
  let requestCount = 0;
  const gpu = {
    requestAdapter: async () =>
    {
      requestCount += 1;
      if (requestCount === 1) return olderAdapterGate.promise;
      return { requestDevice: async () => newer.device };
    }
  };
  const webgpu = new CjsWebgpuDevice({ gpu, device: initial.device });
  const firstRecreation = webgpu.Recreate();
  await Promise.resolve();
  const secondRecreation = webgpu.Recreate();
  await secondRecreation;
  olderAdapterGate.resolve({ requestDevice: async () => older.device });
  await assert.rejects(firstRecreation, /recreation was superseded/i);
  assert.equal(webgpu.GetDevice(), newer.device);
  assert.equal(webgpu.GetGeneration(), 2);
  assert.equal(older.device.calls.filter(([ kind ]) => kind === "destroy").length, 1);
  assert.equal(newer.device.calls.filter(([ kind ]) => kind === "destroy").length, 0);
});

test("CjsWebgpuDevice.Request keeps adapter policy explicit and reports unavailable WebGPU", async () =>
{
  await assert.rejects(CjsWebgpuDevice.Request({ gpu: null }), /WebGPU is unavailable/i);
  await assert.rejects(CjsWebgpuDevice.Request({
    gpu: { requestAdapter: async () => null }
  }), /requestAdapter returned null/i);

  const fake = fakeDevice("requested");
  const adapterOptions = { powerPreference: "low-power" };
  const deviceDescriptor = { label: "explicit device" };
  const seen = [];
  const adapter = {
    async requestDevice(value)
    {
      seen.push([ "device", value ]);
      return fake.device;
    }
  };
  const gpu = {
    async requestAdapter(value)
    {
      seen.push([ "adapter", value ]);
      return adapter;
    }
  };
  const webgpu = await CjsWebgpuDevice.Request({ gpu, adapterOptions, deviceDescriptor });
  assert.deepEqual(seen, [ [ "adapter", adapterOptions ], [ "device", deviceDescriptor ] ]);
  assert.equal(webgpu.GetAdapter(), adapter);
  assert.equal(webgpu.GetDevice(), fake.device);

  const injectedAdapter = await CjsWebgpuDevice.Request({
    gpu: null,
    adapter,
    deviceDescriptor
  });
  assert.equal(injectedAdapter.GetAdapter(), adapter);
  assert.equal(injectedAdapter.GetDevice(), fake.device);

  const injectedDevice = await CjsWebgpuDevice.Request({
    gpu: null,
    device: fake.device
  });
  assert.equal(injectedDevice.GetAdapter(), null);
  assert.equal(injectedDevice.GetDevice(), fake.device);
});
