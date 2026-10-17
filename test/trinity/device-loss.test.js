import assert from "node:assert/strict";
import test from "node:test";

import { be } from "../../npm/dist/global/blue/index.js";
import {
  gTriDev,
  Tr2RenderContext_GetMainThreadRenderContext,
  Tr2Renderer,
  TriDevice
} from "../../npm/dist/trinity/index.js";
import { ALResult, Tr2RenderContextALStub } from "../../npm/dist/trinityal/index.js";
import { CjsWebgpuDevice } from "../../npm/dist/trinityal/webgpu/index.js";
import { CjsWebgpuRenderContextAL } from "../../npm/dist/trinityal/webgpu/internal.js";

// Device loss follows Carbon's DX path (TriDevice11.cpp:43-110,
// TriDevice12.cpp:290-315): notify, release everything, mark lost, then
// ChangeDevice every tick until a device exists again. Until npm/dist is
// rebuilt from a source tree with that path, these tests say why they skip.
const lossSkip = typeof TriDevice.prototype.ChangeDevice === "function" ? false
  : "npm/dist predates TriDevice.ChangeDevice; rebuild npm/dist to run the device-loss tests";

const SHADER_STAGE = Object.freeze({ VERTEX: 1, FRAGMENT: 2, COMPUTE: 4 });
const BUFFER_USAGE = Object.freeze({ MAP_READ: 1, COPY_SRC: 4, COPY_DST: 8, INDEX: 16, VERTEX: 32, UNIFORM: 64, STORAGE: 128, INDIRECT: 256 });

/** A GPUDevice at the seams this path touches; `lose` resolves its `lost`. */
function fakeDevice(name)
{
  let lose;
  const lost = new Promise(resolve => { lose = resolve; });
  const made = [];
  const device = {
    name,
    made,
    destroyed: false,
    lost,
    queue: { writeBuffer() {}, writeTexture() {}, submit() {} },
    pushErrorScope() {},
    popErrorScope: () => Promise.resolve(null),
    createShaderModule: descriptor => ({ kind: "module", descriptor, device }),
    createSampler(descriptor)
    {
      const sampler = { kind: "sampler", descriptor, device };
      made.push(sampler);
      return sampler;
    },
    createBuffer(descriptor)
    {
      const buffer = { kind: "buffer", descriptor, device, destroy() {} };
      made.push(buffer);
      return buffer;
    },
    createCommandEncoder: () => ({ finish: () => "commands" }),
    destroy() { device.destroyed = true; }
  };
  return { device, lose };
}

const flush = () => new Promise(resolve => setImmediate(resolve));

/** A WebGPU-backed main context and a created device; everything is put back after. */
async function withLostCapableDevice(body)
{
  const first = fakeDevice("first");
  const second = fakeDevice("second");
  const adapter = { requestDevice: async () => second.device };
  const webgpu = new CjsWebgpuDevice({
    gpu: { requestAdapter: async () => adapter },
    adapter,
    device: first.device,
    shaderStage: SHADER_STAGE,
    bufferUsage: BUFFER_USAGE
  });
  const configured = [];
  const al = new CjsWebgpuRenderContextAL({
    webgpu,
    dispatcher: { PrepareAccumulator: () => null, EncodeAccumulator() {} },
    renderTarget: {
      Configure: options => configured.push([ webgpu.GetDevice(), options ]),
      GetWidth: () => 64,
      GetHeight: () => 64,
      GetFormat: () => "bgra8unorm",
      GetDepthFormat: () => null,
      GetSampleCount: () => 1
    }
  });

  const previousDevice = gTriDev.device;
  const renderContext = Tr2RenderContext_GetMainThreadRenderContext();
  renderContext.SetRenderContextAL(al);
  const device = new TriDevice();
  gTriDev.device = device;

  try
  {
    assert.equal(device.CreateSimpleDevice({ canvas: true }, 64, 64), true);
    await body({ device, al, webgpu, first, second, configured });
  }
  finally
  {
    be.os.UnregisterForTicks(device, TriDevice.TICK_COOKIE);
    gTriDev.device = previousDevice;
    renderContext.SetRenderContextAL(new Tr2RenderContextALStub());
  }
}

test("a lost device is released, notified, replaced over ticks and prepared again", { skip: lossSkip }, async () =>
{
  const events = [];
  const resource = {
    PrepareResources: () => events.push("prepare"),
    ReleaseResources: storage => events.push([ "release", storage ])
  };
  TriDevice.RegisterResource(resource);

  try
  {
    await withLostCapableDevice(async ({ device, al, webgpu, first, second, configured }) =>
    {
      const removed = [];
      device.onDeviceRemoved = (...args) => removed.push(args);

      // A Tr2SamplerStateAL value sharing the factory's implementation
      // (Tr2SamplerStateAL.cpp:25-28).
      const sampler = al.CreateSamplerState({
        minFilter: 2, magFilter: 2, mipFilter: 2, comparison: false,
        addressU: 1, addressV: 1, addressW: 1, maxAnisotropy: 1
      });
      const state = sampler.TrinityALImpl_GetObject();
      assert.equal(state.GetSampler().device, first.device);
      assert.equal(Tr2Renderer.GetQuadListIndexBuffer().IsValid(), true, "prepared on creation");
      events.length = 0;
      assert.equal(device.IsDeviceLost(), false);

      first.lose({ reason: "unknown", message: "simulated" });
      await flush();
      assert.equal(al.IsValid(), false, "the layer reports the loss through IsValid");

      // The removal tick: notify, release everything, mark lost.
      device.HandleRenderTick(0, 0);
      assert.equal(removed.length, 1);
      assert.equal(removed[0][0], ALResult.E_DEVICELOST);
      assert.equal(removed[0][2], removed[0][2] | 0, "the loss count");
      assert.deepEqual(events, [ [ "release", 3 ] ], "TRISTORAGE_ALL");
      assert.equal(device.IsDeviceLost(), true);
      assert.equal(Tr2Renderer.GetQuadListIndexBuffer().IsValid(), false, "Tr2Renderer released its quad list");
      assert.equal(al._mipGenerator, null);
      assert.equal(al._constantArena, null);
      assert.equal(al._commandEncoder, null);

      // The replacement is asynchronous: the next tick starts it and the device stays lost.
      device.HandleRenderTick(0, 0);
      assert.equal(device.IsDeviceLost(), true);
      assert.equal(events.includes("prepare"), false);

      await flush();
      assert.equal(webgpu.GetDevice(), second.device);
      assert.equal(first.device.destroyed, true);

      // The tick after it lands runs ChangeDevice to the end.
      device.HandleRenderTick(0, 0);
      assert.equal(device.IsDeviceLost(), false);
      assert.equal(device.DeviceExists(), true);
      assert.deepEqual(events, [ [ "release", 3 ], "prepare" ]);
      assert.equal(removed.length, 1, "notified once per loss");

      // Nothing the layer holds points at the old device.
      assert.equal(configured.at(-1)[0], second.device, "the canvas was configured with the new device");
      assert.equal(sampler.TrinityALImpl_GetObject(), state, "same sampler state");
      assert.equal(state.GetSampler().device, second.device, "same sampler state, new GPU object");
      assert.ok(al.CreateSamplerState(state.GetDescription()).Equals(sampler), "identity kept");
      const quadList = Tr2Renderer.GetQuadListIndexBuffer();
      assert.equal(quadList.IsValid(), true, "prepared again");
      assert.equal(quadList.GetBuffer().TrinityALImpl_GetObject().GetDeviceBuffer().device, second.device);
    });
  }
  finally
  {
    TriDevice.UnregisterResource(resource);
  }
});

test("a device that was never created is not a lost one", { skip: lossSkip }, () =>
{
  const previousDevice = gTriDev.device;
  const device = new TriDevice();
  gTriDev.device = device;
  const removed = [];
  device.onDeviceRemoved = (...args) => removed.push(args);

  try
  {
    device.HandleRenderTick(0, 0);
    assert.equal(device.IsDeviceLost(), false);
    assert.deepEqual(removed, []);
  }
  finally
  {
    gTriDev.device = previousDevice;
  }
});
