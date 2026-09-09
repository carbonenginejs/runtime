import assert from "node:assert/strict";
import { test } from "node:test";

import { CjsWebgpuDevice } from "../../../npm/dist/trinityal/webgpu/index.js";
import { CjsWebgpuShaderAL, CjsWebgpuShaderProgramAL } from "../../../npm/dist/trinityal/webgpu/internal.js";
import { ALResult } from "../../../npm/dist/trinityal/index.js";
import { ShaderType } from "../../../npm/dist/global/consts/renderContext/index.js";
import { writeBackendBlock } from "../../../npm/dist/resource/format/index.js";

// The pipeline layout is built at Create, from the stages, the way DX12 builds
// its root signature (Tr2ShaderProgramALDx12.cpp:220-252): each stage's
// signature contributes its own bindings and the program merges them. The
// per-pass backend block is how a WGSL stage's bindings reach its signature,
// and these pin that road end to end - block bytes in, GPUPipelineLayout out.

const SHADER_STAGE = Object.freeze({ VERTEX: 1, FRAGMENT: 2, COMPUTE: 4 });
const VERTEX_WGSL = "@vertex fn main() -> @builtin(position) vec4f { return vec4f(0); }";
const FRAGMENT_WGSL = "@fragment fn main() -> @location(0) vec4f { return vec4f(1); }";

function fakeDevice()
{
  const calls = { modules: [], bindGroupLayouts: [], pipelineLayouts: [] };
  const device = {
    calls,
    createShaderModule(descriptor)
    {
      calls.modules.push(descriptor);

      return { kind: "shader-module", descriptor };
    },
    createBindGroupLayout(descriptor)
    {
      calls.bindGroupLayouts.push(descriptor);

      return { kind: "bind-group-layout", descriptor };
    },
    createPipelineLayout(descriptor)
    {
      calls.pipelineLayouts.push(descriptor);

      return { kind: "pipeline-layout", descriptor };
    },
    pushErrorScope() {},
    popErrorScope() { return Promise.resolve(null); }
  };

  return device;
}

function context()
{
  const device = fakeDevice();
  const webgpu = new CjsWebgpuDevice({ device, shaderStage: SHADER_STAGE });

  return { device, renderContext: { IsValid: () => true, GetWebgpu: () => webgpu } };
}

/** A block in the shape the WebGPU format writes: one group, three bindings. */
function blockBytes(bindings = standardBindings())
{
  return writeBackendBlock({ bindGroups: [ { group: 0, bindings } ], transforms: [] });
}

function standardBindings()
{
  return [
    {
      group: 0, binding: 0, resourceKind: "uniform-buffer", registerSpace: 0, registerIndex: 0,
      visibility: [ "vertex", "fragment" ], type: "array<vec4<f32>, 4>", generatedSymbol: "cb0"
    },
    {
      group: 0, binding: 1, resourceKind: "sampled-resource", registerSpace: 0, registerIndex: 0,
      visibility: [ "fragment" ], type: "texture_2d<f32>", generatedSymbol: "t0"
    },
    {
      group: 0, binding: 2, resourceKind: "sampler", registerSpace: 0, registerIndex: 0,
      visibility: [ "fragment" ], type: "sampler", generatedSymbol: "s0"
    }
  ];
}

function signatureWith(bytes)
{
  return { pipelineInputs: [], registers: [], staticSamplers: [], backendBlock: { bytes, size: bytes.byteLength } };
}

function stage(type, wgsl, signature, renderContext)
{
  const shader = new CjsWebgpuShaderAL();
  const result = shader.Create(type, new TextEncoder().encode(wgsl), signature, `${type}.wgsl`, renderContext);

  return { shader, result };
}

test("a stage keeps only the block's bindings visible to it", () =>
{
  const { renderContext } = context();
  const signature = signatureWith(blockBytes());
  const vertex = stage(ShaderType.VERTEX_SHADER, VERTEX_WGSL, signature, renderContext);
  const fragment = stage(ShaderType.PIXEL_SHADER, FRAGMENT_WGSL, signature, renderContext);

  assert.equal(vertex.result, ALResult.S_OK);
  assert.equal(fragment.result, ALResult.S_OK);

  // Metal's per-stage resource mask describes that stage's own bindings
  // (Tr2ShaderALMetal.mm:37-217); this is the same table in WGSL terms.
  assert.deepEqual(vertex.shader.GetBindings().map(binding => binding.binding), [ 0 ]);
  assert.deepEqual(fragment.shader.GetBindings().map(binding => binding.binding), [ 0, 1, 2 ]);
  assert.deepEqual(vertex.shader.GetBindings()[0].buffer, { type: "uniform", hasDynamicOffset: false, minBindingSize: 64 });
  assert.equal(fragment.shader.GetBindings()[1].texture.viewDimension, "2d");
});

test("a program merges its stages into one pipeline layout, as DX12 merges a root signature", () =>
{
  const { device, renderContext } = context();
  const signature = signatureWith(blockBytes());
  const vertex = stage(ShaderType.VERTEX_SHADER, VERTEX_WGSL, signature, renderContext).shader;
  const fragment = stage(ShaderType.PIXEL_SHADER, FRAGMENT_WGSL, signature, renderContext).shader;
  const program = new CjsWebgpuShaderProgramAL();

  assert.equal(program.Create([ vertex, fragment ], renderContext), ALResult.S_OK);

  // One group, three slots. The uniform both stages read is ONE entry visible
  // to both; the texture and sampler are the fragment stage's alone.
  assert.equal(device.calls.bindGroupLayouts.length, 1);
  const entries = device.calls.bindGroupLayouts[0].entries;

  assert.deepEqual(entries.map(entry => [ entry.binding, entry.visibility ]), [
    [ 0, SHADER_STAGE.VERTEX | SHADER_STAGE.FRAGMENT ],
    [ 1, SHADER_STAGE.FRAGMENT ],
    [ 2, SHADER_STAGE.FRAGMENT ]
  ]);
  // The LAYOUT entry is dynamic by the backend's decision - constants bind
  // out of a per-frame arena at (page, offset) - while the stage's own
  // binding keeps the container's word.
  assert.deepEqual(entries[0].buffer, { type: "uniform", hasDynamicOffset: true, minBindingSize: 64 });
  assert.deepEqual(Object.keys(entries[2]).sort(), [ "binding", "sampler", "visibility" ]);

  assert.equal(device.calls.pipelineLayouts.length, 1);
  assert.equal(device.calls.pipelineLayouts[0].bindGroupLayouts.length, 1);
  assert.equal(program.GetPipelineLayout().kind, "pipeline-layout");
  assert.equal(program.GetBindGroupLayouts().length, 1);
  assert.equal(program.GetBindings().length, 3);

  // Two programs are two identities, which is what the pipeline cache keys on.
  const second = new CjsWebgpuShaderProgramAL();

  assert.equal(second.Create([ vertex, fragment ], renderContext), ALResult.S_OK);
  assert.notEqual(second.GetIdentity(), program.GetIdentity());
  assert.match(program.GetIdentity(), /^program:\d+$/);

  program.Destroy();
  assert.equal(program.GetIdentity(), null);
  assert.equal(program.GetPipelineLayout(), null);
});

test("a program without blocks has an empty layout rather than none", () =>
{
  const { device, renderContext } = context();
  const vertex = stage(ShaderType.VERTEX_SHADER, VERTEX_WGSL, null, renderContext).shader;
  const fragment = stage(ShaderType.PIXEL_SHADER, FRAGMENT_WGSL, null, renderContext).shader;
  const program = new CjsWebgpuShaderProgramAL();

  assert.equal(program.Create([ vertex, fragment ], renderContext), ALResult.S_OK);
  assert.equal(device.calls.bindGroupLayouts.length, 0);
  assert.deepEqual(device.calls.pipelineLayouts[0].bindGroupLayouts, []);
  assert.deepEqual(program.GetBindings(), []);
});

test("two stages claiming one slot with different layouts are refused at link", () =>
{
  const { renderContext } = context();
  const vertexBlock = blockBytes([ {
    group: 0, binding: 0, resourceKind: "uniform-buffer", registerSpace: 0, registerIndex: 0,
    visibility: [ "vertex" ], type: "array<vec4<f32>, 4>", generatedSymbol: "cb0"
  } ]);
  const fragmentBlock = blockBytes([ {
    group: 0, binding: 0, resourceKind: "sampled-resource", registerSpace: 0, registerIndex: 0,
    visibility: [ "fragment" ], type: "texture_2d<f32>", generatedSymbol: "t0"
  } ]);
  const vertex = stage(ShaderType.VERTEX_SHADER, VERTEX_WGSL, signatureWith(vertexBlock), renderContext).shader;
  const fragment = stage(ShaderType.PIXEL_SHADER, FRAGMENT_WGSL, signatureWith(fragmentBlock), renderContext).shader;
  const program = new CjsWebgpuShaderProgramAL();

  // A container defect, refused where the cause is rather than at pipeline
  // creation with a message about the pipeline.
  assert.equal(program.Create([ vertex, fragment ], renderContext), ALResult.E_INVALIDARG);
  assert.equal(program.IsValid(), false);
});

test("a block that is not this backend's is refused before anything compiles", () =>
{
  const { device, renderContext } = context();
  const foreign = new Uint8Array([ 0xee, 0, 0 ]);
  const { shader, result } = stage(ShaderType.VERTEX_SHADER, VERTEX_WGSL, signatureWith(foreign), renderContext);

  // Metal refuses a signature it cannot honour at Create
  // (Tr2ShaderALMetal.mm:24-27), and so does this.
  assert.equal(result, ALResult.E_INVALIDARG);
  assert.equal(shader.IsValid(), false);
  assert.equal(device.calls.modules.length, 0, "nothing compiled");
});

test("the vertex stage's pipeline inputs become the program's inputs", () =>
{
  const { renderContext } = context();
  const inputs = [ { usage: 0, usageIndex: 0, registerIndex: 0 }, { usage: 5, usageIndex: 0, registerIndex: 1 } ];
  const vertex = stage(ShaderType.VERTEX_SHADER, VERTEX_WGSL, { pipelineInputs: inputs }, renderContext).shader;
  const fragment = stage(ShaderType.PIXEL_SHADER, FRAGMENT_WGSL, { pipelineInputs: [ { usage: 9 } ] }, renderContext).shader;
  const program = new CjsWebgpuShaderProgramAL();

  program.Create([ fragment, vertex ], renderContext);

  // Metal's m_iaInputs come from the VERTEX stage regardless of link order
  // (Tr2ShaderProgramALMetal.mm:86).
  assert.deepEqual(program.GetInputs(), inputs);
});
