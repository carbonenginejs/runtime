import assert from "node:assert/strict";
import { test } from "node:test";

import { CjsWebgpuDevice } from "../../../npm/dist/trinityal/webgpu/index.js";
import { CjsWebgpuShaderAL, CjsWebgpuShaderProgramAL } from "../../../npm/dist/trinityal/webgpu/internal.js";
import { ALResult } from "../../../npm/dist/trinityal/index.js";
import { ShaderType } from "../../../npm/dist/global/consts/renderContext/index.js";


// WebGPU's own GPUShaderStage bitflags, for the fake device - unrelated to
// Carbon's ShaderType, which is what the AL carries.
const SHADER_STAGE = Object.freeze({ VERTEX: 1, FRAGMENT: 2, COMPUTE: 4 });

const VERTEX_WGSL = "@vertex fn main() -> @builtin(position) vec4f { return vec4f(0); }";

/** A GPUDevice stand-in that records every module it is asked to compile. */
function fakeDevice()
{
  const modules = [];
  const device = {
    modules,
    createShaderModule(descriptor)
    {
      const value = { kind: "shader-module", descriptor };
      modules.push(descriptor);
      return value;
    },
    createBuffer(descriptor) { return { kind: "buffer", descriptor, destroy() {} }; },
    // A program builds its pipeline layout at Create, as DX12 builds its root
    // signature there; a program with no bindings still creates an empty one.
    createBindGroupLayout(descriptor) { return { kind: "bind-group-layout", descriptor }; },
    createPipelineLayout(descriptor) { return { kind: "pipeline-layout", descriptor }; },
    queue: { writeBuffer() {} },
    pushErrorScope() {},
    popErrorScope() { return Promise.resolve(null); }
  };
  return { device, modules };
}

function deviceAndContext(valid = true)
{
  const fake = fakeDevice();
  const webgpu = new CjsWebgpuDevice({ device: fake.device, shaderStage: SHADER_STAGE });
  return { fake, webgpu, context: { IsValid: () => valid, GetWebgpu: () => webgpu } };
}

/** A compiled shader for `stage`, plus the fake that recorded it. */
function shaderFor(stage, source = VERTEX_WGSL, label = "test.wgsl")
{
  const { fake, context } = deviceAndContext();
  const shader = new CjsWebgpuShaderAL();
  const result = shader.Create(stage, new TextEncoder().encode(source), { inputs: [] }, label, context);
  return { shader, result, fake, context };
}

test("a shader compiles its bytecode as WGSL and keeps the source", () =>
{
  const { shader, result, fake } = shaderFor(ShaderType.VERTEX_SHADER);

  assert.equal(result, ALResult.S_OK);
  assert.equal(shader.IsValid(), true);
  assert.equal(shader.GetType(), ShaderType.VERTEX_SHADER);
  assert.notEqual(shader.GetModule(), null);

  // BYTECODE IS WGSL TEXT HERE, NOT DXBC - Carbon compiles offline for one API,
  // we translate to WGSL. The AL contract only stores bytes and a signature.
  assert.equal(fake.modules.length, 1);
  assert.equal(fake.modules[0].code, VERTEX_WGSL);
  assert.equal(fake.modules[0].label, "test.wgsl");

  // The stub copies its bytecode so a shader outlives its producer; the source
  // round-trips for the same reason.
  assert.equal(new TextDecoder().decode(shader.GetBytecode()), VERTEX_WGSL);
});

test("empty bytecode reports OUT_OF_MEMORY, which is Carbon's own odd choice", () =>
{
  const { context } = deviceAndContext();
  const shader = new CjsWebgpuShaderAL();

  // Transcribed rather than tidied to E_INVALIDARG: a caller testing for
  // Carbon's code would not recognise a different one.
  assert.equal(shader.Create(ShaderType.VERTEX_SHADER, new Uint8Array(0), null, "empty", context), ALResult.E_OUTOFMEMORY);
  assert.equal(shader.IsValid(), false);
});

test("an invalid context is refused before anything is compiled", () =>
{
  const { fake, context } = deviceAndContext(false);
  const shader = new CjsWebgpuShaderAL();

  assert.equal(shader.Create(ShaderType.VERTEX_SHADER, new TextEncoder().encode(VERTEX_WGSL), null, "x", context), ALResult.E_INVALIDCALL);
  assert.equal(fake.modules.length, 0, "nothing reached the device");
});

test("Destroy drops the module and the shader is reusable", () =>
{
  const { shader, context } = shaderFor(ShaderType.VERTEX_SHADER);

  shader.Destroy();

  assert.equal(shader.IsValid(), false);
  assert.equal(shader.GetModule(), null);
  assert.equal(shader.GetType(), ShaderType.INVALID_SHADER, "Carbon's sentinel, not null");

  assert.equal(
    shader.Create(ShaderType.VERTEX_SHADER, new TextEncoder().encode(VERTEX_WGSL), null, "again", context),
    ALResult.S_OK
  );
});

test("a program links compiled stages and answers for each", () =>
{
  const { fake, context } = deviceAndContext();
  const vertex = new CjsWebgpuShaderAL();
  const fragment = new CjsWebgpuShaderAL();

  vertex.Create(ShaderType.VERTEX_SHADER, new TextEncoder().encode(VERTEX_WGSL), null, "v.wgsl", context);
  fragment.Create(ShaderType.PIXEL_SHADER, new TextEncoder().encode("@fragment fn main() {}"), null, "f.wgsl", context);

  const program = new CjsWebgpuShaderProgramAL();

  assert.equal(program.Create([ vertex, fragment ], context), ALResult.S_OK);
  assert.equal(program.IsValid(), true);
  assert.deepEqual(program.GetShaders(), [ vertex, fragment ]);

  // A pipeline description asks for a stage by name; WebGPU has no link step,
  // so the program's job is to answer that.
  assert.equal(program.GetModuleFor(ShaderType.VERTEX_SHADER), vertex.GetModule());
  assert.equal(program.GetModuleFor(ShaderType.PIXEL_SHADER), fragment.GetModule());
  assert.equal(program.GetModuleFor(ShaderType.COMPUTE_SHADER), null, "a stage it does not have");
  assert.equal(fake.modules.length, 2);
});

test("a program refuses an empty list and an uncompiled stage", () =>
{
  const { context } = deviceAndContext();
  const program = new CjsWebgpuShaderProgramAL();

  assert.equal(program.Create([], context), ALResult.E_INVALIDARG);

  // Refuse where the cause is: an uncompiled stage would otherwise surface at
  // pipeline creation, as a message about the pipeline.
  assert.equal(program.Create([ new CjsWebgpuShaderAL() ], context), ALResult.E_INVALIDARG);
  assert.equal(program.IsValid(), false);
});

test("the device-resource surface Carbon's backends share is answered", () =>
{
  const { shader } = shaderFor(ShaderType.VERTEX_SHADER);

  assert.equal(shader.GetMemoryClass(), 2);
  assert.equal(shader.Describe({}).memoryClass, shader.GetMemoryClass());

  // Unlike the stub, the name is kept: GPUShaderModule carries a writable
  // label, and it is what a WebGPU compilation error quotes.
  assert.equal(shader.SetName("hull.vs"), ALResult.S_OK);
  assert.equal(shader.GetModule().label, "hull.vs");
});

test("a null shader claims its stage without becoming valid", () =>
{
  const shader = new CjsWebgpuShaderAL();

  shader.SetNullShaderType(ShaderType.PIXEL_SHADER);

  // Carbon uses this for a stage the pipeline must name that does no work.
  // Staying invalid is the point - nothing must reference a module for it.
  assert.equal(shader.GetType(), ShaderType.PIXEL_SHADER);
  assert.equal(shader.IsValid(), false);
});

test("a program answers the device-resource surface and names every stage under it", () =>
{
  const { fake, context } = deviceAndContext();
  const vertex = new CjsWebgpuShaderAL();
  vertex.Create(ShaderType.VERTEX_SHADER, new TextEncoder().encode(VERTEX_WGSL), { inputs: [] }, "v.wgsl", context);

  const program = new CjsWebgpuShaderProgramAL();
  program.Create([ vertex ], context);

  assert.equal(program.GetMemoryClass(), 2);
  assert.equal(program.Describe({}).memoryClass, program.GetMemoryClass());

  // WebGPU has no program object to label - there is no link step - so the
  // name reaches the modules, which is where it can appear in an error.
  assert.equal(program.SetName("hull"), ALResult.S_OK);
  assert.equal(vertex.GetModule().label, "hull");
  assert.equal(fake.modules.length, 1);
});
