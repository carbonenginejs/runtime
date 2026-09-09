import assert from "node:assert/strict";
import { test } from "node:test";

import { CjsWebgpuDevice } from "../../../npm/dist/trinityal/webgpu/index.js";
import { CjsWebgpuRenderContextAL, CjsWebgpuResourceSetAL } from "../../../npm/dist/trinityal/webgpu/internal.js";
import { ALResult, Tr2ResourceSetDescriptionAL } from "../../../npm/dist/trinityal/index.js";
import { ShaderType } from "../../../npm/dist/global/consts/renderContext/index.js";
import { writeBackendBlock } from "../../../npm/dist/resource/format/index.js";

// Carbon's resource set resolves the description against the program at
// Create (Tr2ResourceSetALMetal.mm:57-279), fills what the description left
// empty with dummies (:240-265), and carries no constant buffers
// (Tr2ResourceSetAL.h:57-65). These pin that shape for WebGPU.

const SHADER_STAGE = Object.freeze({ VERTEX: 1, FRAGMENT: 2, COMPUTE: 4 });
const BUFFER_USAGE = Object.freeze({ UNIFORM: 16, COPY_DST: 32, VERTEX: 64, INDEX: 128, STORAGE: 256 });
const TEXTURE_USAGE = Object.freeze({ TEXTURE_BINDING: 4, COPY_DST: 2 });
const VERTEX_WGSL = "@vertex fn main() -> @builtin(position) vec4f { return vec4f(0); }";
const FRAGMENT_WGSL = "@fragment fn main() -> @location(0) vec4f { return vec4f(1); }";

function composed()
{
  const created = { buffers: 0, textures: 0, samplers: 0 };
  const device = {
    createShaderModule: descriptor => ({ kind: "module", descriptor }),
    createBindGroupLayout: descriptor => ({ kind: "bind-group-layout", descriptor }),
    createPipelineLayout: descriptor => ({ kind: "pipeline-layout", descriptor }),
    createBuffer(descriptor) { created.buffers += 1; return { kind: "buffer", descriptor, destroy() {} }; },
    createTexture(descriptor)
    {
      created.textures += 1;

      return { kind: "texture", descriptor, createView: view => ({ kind: "view", dimension: view.dimension }) };
    },
    createSampler(descriptor) { created.samplers += 1; return { kind: "sampler", descriptor }; },
    queue: { writeBuffer() {} },
    pushErrorScope() {},
    popErrorScope() { return Promise.resolve(null); }
  };
  const webgpu = new CjsWebgpuDevice({ device, shaderStage: SHADER_STAGE, bufferUsage: BUFFER_USAGE, textureUsage: TEXTURE_USAGE });
  const al = new CjsWebgpuRenderContextAL({
    webgpu,
    dispatcher: { PrepareAccumulator: () => null, EncodeAccumulator() {} },
    renderTarget: { GetWidth: () => 1, GetHeight: () => 1, GetFormat: () => "bgra8unorm", GetDepthFormat: () => null, GetSampleCount: () => 1 }
  });

  al.CreateDevice();

  return { al, created };
}

function programWith(al, bindings)
{
  const block = writeBackendBlock({ bindGroups: [ { group: 0, bindings } ], transforms: [] });
  const signature = { pipelineInputs: [], backendBlock: { bytes: block, size: block.byteLength } };

  return al.CreateShaderProgram([
    al.CreateShader(ShaderType.VERTEX_SHADER, VERTEX_WGSL, signature, "v.wgsl"),
    al.CreateShader(ShaderType.PIXEL_SHADER, FRAGMENT_WGSL, signature, "f.wgsl")
  ]);
}

const BINDINGS = [
  { group: 0, binding: 0, resourceKind: "uniform-buffer", registerSpace: 0, registerIndex: 0, visibility: [ "vertex", "fragment" ], type: "array<vec4<f32>, 2>", generatedSymbol: "cb0" },
  { group: 0, binding: 1, resourceKind: "sampled-resource", registerSpace: 0, registerIndex: 2, visibility: [ "fragment" ], type: "texture_cube<f32>", generatedSymbol: "t2" },
  { group: 0, binding: 2, resourceKind: "sampler", registerSpace: 0, registerIndex: 2, visibility: [ "fragment" ], type: "sampler", generatedSymbol: "s2" },
  { group: 0, binding: 3, resourceKind: "sampled-resource", registerSpace: 0, registerIndex: 5, visibility: [ "vertex" ], type: "StructuredBuffer", structureStride: 64, generatedSymbol: "t5" }
];

test("Create resolves every non-uniform slot against the program, by the stage the binding is visible to", () =>
{
  const { al, created } = composed();
  const program = programWith(al, BINDINGS);
  const description = new Tr2ResourceSetDescriptionAL();
  const sampler = al.CreateSamplerState({ minFilter: 2, magFilter: 2, mipFilter: 2, addressU: 3, addressV: 3, addressW: 3 });
  const bones = { GetDeviceBuffer: () => ({ kind: "buffer", id: "bones" }) };

  description.SetSampler(ShaderType.PIXEL_SHADER, 2, sampler);
  description.SetSrv(ShaderType.PIXEL_SHADER, 2, { GetDeviceTextureView: (dimension, colorSpace) => ({ kind: "view", dimension, colorSpace }) }, 1);
  description.SetSrv(ShaderType.VERTEX_SHADER, 5, bones);

  const set = new CjsWebgpuResourceSetAL();

  assert.equal(set.Create(description, program, al), ALResult.S_OK);
  assert.equal(set.IsValid(), true);

  const entries = set.GetEntries();

  assert.deepEqual([ ...entries.keys() ], [ "0:1", "0:2", "0:3" ], "the uniform slot is not the set's");
  assert.deepEqual(entries.get("0:1"), { kind: "view", dimension: "cube", colorSpace: 1 }, "the texture's view in the layout's dimension and the bound colour space");
  assert.equal(entries.get("0:2"), sampler.GetSampler());
  assert.equal(entries.get("0:3").buffer.id, "bones");
  assert.equal(created.textures, 0, "nothing needed a dummy");
  assert.equal(set.GetProgram(), program);
  assert.equal(set.GetDescription(), description);

  set.Destroy();
  assert.equal(set.IsValid(), false);
  assert.equal(set.GetEntries().size, 0);
});

test("what the description leaves empty takes a dummy of the slot's kind, and a texture without a device view too", () =>
{
  const { al, created } = composed();
  const program = programWith(al, BINDINGS);
  const description = new Tr2ResourceSetDescriptionAL();

  // A TriTextureRes, not yet a Tr2TextureAL: Carbon's fallback texture.
  description.SetSrv(ShaderType.PIXEL_SHADER, 2, { id: "still-loading" });

  const set = al.CreateResourceSet(description, program);
  const entries = set.GetEntries();

  assert.equal(entries.get("0:1").dimension, "cube", "the dummy matches the layout's dimension");
  assert.equal(entries.get("0:2").kind, "sampler");
  assert.equal(entries.get("0:3").buffer.kind, "buffer");
  assert.equal(created.textures, 1);
  assert.equal(created.samplers, 1);
  assert.equal(created.buffers, 1, "a null storage buffer");

  // Dummies are the context's and shared: a second set creates none.
  al.CreateResourceSet(new Tr2ResourceSetDescriptionAL(), program);
  assert.equal(created.textures + created.samplers + created.buffers, 3);
});

test("a program this backend did not link, or no description, is refused", () =>
{
  const { al } = composed();
  const set = new CjsWebgpuResourceSetAL();

  assert.equal(set.Create(new Tr2ResourceSetDescriptionAL(), { IsValid: () => true, id: "row" }, al), ALResult.E_INVALIDARG);
  assert.equal(set.Create(null, programWith(al, BINDINGS), al), ALResult.E_INVALIDARG);
  assert.equal(al.CreateResourceSet(new Tr2ResourceSetDescriptionAL(), null), null);
  assert.equal(set.IsValid(), false);
});
