import assert from "node:assert/strict";
import { test } from "node:test";

import { CjsWebgpuDevice } from "../../../npm/dist/trinityal/webgpu/index.js";
import { CjsWebgpuRenderContextAL, CjsWebgpuSamplerStateAL } from "../../../npm/dist/trinityal/webgpu/internal.js";
import { ALResult, NormalizeSamplerDescription, SamplerDescriptionKey } from "../../../npm/dist/trinityal/index.js";

// Carbon's Tr2SamplerStateAL::Create is a factory lookup on the primary
// context keyed on the description (Tr2SamplerStateAL.cpp:25-28). These pin
// the WebGPU state, the factory, and the two spellings a description arrives in.

const SHADER_STAGE = Object.freeze({ VERTEX: 1, FRAGMENT: 2, COMPUTE: 4 });

function composed()
{
  const samplers = [];
  const device = {
    createSampler(descriptor)
    {
      const sampler = { kind: "sampler", descriptor };

      samplers.push(descriptor);

      return sampler;
    },
    createShaderModule: descriptor => ({ kind: "module", descriptor }),
    pushErrorScope() {},
    popErrorScope() { return Promise.resolve(null); }
  };
  const webgpu = new CjsWebgpuDevice({ device, shaderStage: SHADER_STAGE });
  const al = new CjsWebgpuRenderContextAL({
    webgpu,
    dispatcher: { PrepareAccumulator: () => null, EncodeAccumulator() {} },
    renderTarget: { GetWidth: () => 1, GetHeight: () => 1, GetFormat: () => "bgra8unorm", GetDepthFormat: () => null, GetSampleCount: () => 1 }
  });

  al.CreateDevice();

  return { al, samplers };
}

const authored = (overrides = {}) => ({
  minFilter: 2, magFilter: 2, mipFilter: 2, comparison: false,
  addressU: 1, addressV: 3, addressW: 1, maxAnisotropy: 1, ...overrides
});

test("a sampler state is created from Carbon's description and keeps the authored one", () =>
{
  const { al, samplers } = composed();
  const state = new CjsWebgpuSamplerStateAL();

  assert.equal(state.Create(authored({ addressW: 4 }), al), ALResult.S_OK);
  assert.equal(state.IsValid(), true);
  assert.equal(samplers.length, 1);
  assert.equal(samplers[0].addressModeU, "repeat");
  assert.equal(samplers[0].addressModeV, "clamp-to-edge");
  // Border has no WebGPU spelling: folded to clamp-to-edge for the device, the
  // AUTHORED mode kept for the material's emulation buffer.
  assert.equal(samplers[0].addressModeW, "clamp-to-edge");
  assert.equal(state.GetDescription().addressW, 4);
  assert.equal(state.GetSampler().kind, "sampler");
  assert.equal(state.GetIndexInHeap(), 0xffffffff);

  state.Destroy();
  assert.equal(state.IsValid(), false);
});

test("the context's factory dedupes on the description, whichever spelling it arrives in", () =>
{
  const { al, samplers } = composed();

  // The reader's spelling keeps floats as raw bits; an override's spelling is
  // plain floats. 2.0f is 0x40000000.
  const fromReader = authored({ minLODRaw: 0x40000000, maxLODRaw: 0x7f7fffff, mipLODBiasRaw: 0 });
  const fromOverride = authored({ minLOD: 2, maxLOD: 3.4028234663852886e38, mipLODBias: 0 });

  assert.equal(SamplerDescriptionKey(fromReader), SamplerDescriptionKey(fromOverride));
  assert.equal(NormalizeSamplerDescription(fromReader).minLOD, 2);

  const first = al.CreateSamplerState(fromReader);
  const second = al.CreateSamplerState(fromOverride);
  const third = al.CreateSamplerState(authored({ addressU: 4 }));

  assert.equal(first, second, "one state for equal descriptions - identity is the comparison");
  assert.notEqual(first, third);
  assert.equal(samplers.length, 2, "two distinct descriptions, two device samplers");
  assert.equal(samplers[0].lodMinClamp, 2);
  assert.equal(samplers[0].lodMaxClamp, 32, "Carbon's FLT_MAX lands on WebGPU's upper clamp");
});

test("a description Carbon's enum cannot spell is refused, and nothing is null-keyed", () =>
{
  const { al, samplers } = composed();

  assert.equal(al.CreateSamplerState(authored({ addressU: 9 })), null);
  assert.equal(al.CreateSamplerState(null), null);
  assert.equal(samplers.length, 0);
});
