import assert from "node:assert/strict";
import { test } from "node:test";

import { CjsWebgpuDevice } from "../../../npm/dist/trinityal/webgpu/index.js";
import { CjsWebgpuShaderAL, CjsWebgpuShaderProgramAL } from "../../../npm/dist/trinityal/webgpu/internal.js";
import { ALResult } from "../../../npm/dist/trinity/core/index.js";

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
  const { shader, result, fake } = shaderFor("vertex");

  assert.equal(result, ALResult.S_OK);
  assert.equal(shader.IsValid(), true);
  assert.equal(shader.GetType(), "vertex");
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
  assert.equal(shader.Create("vertex", new Uint8Array(0), null, "empty", context), ALResult.E_OUTOFMEMORY);
  assert.equal(shader.IsValid(), false);
});

test("an invalid context is refused before anything is compiled", () =>
{
  const { fake, context } = deviceAndContext(false);
  const shader = new CjsWebgpuShaderAL();

  assert.equal(shader.Create("vertex", new TextEncoder().encode(VERTEX_WGSL), null, "x", context), ALResult.E_INVALIDCALL);
  assert.equal(fake.modules.length, 0, "nothing reached the device");
});

test("Destroy drops the module and the shader is reusable", () =>
{
  const { shader, context } = shaderFor("vertex");

  shader.Destroy();

  assert.equal(shader.IsValid(), false);
  assert.equal(shader.GetModule(), null);
  assert.equal(shader.GetType(), null);

  assert.equal(
    shader.Create("vertex", new TextEncoder().encode(VERTEX_WGSL), null, "again", context),
    ALResult.S_OK
  );
});

test("a program links compiled stages and answers for each", () =>
{
  const { fake, context } = deviceAndContext();
  const vertex = new CjsWebgpuShaderAL();
  const fragment = new CjsWebgpuShaderAL();

  vertex.Create("vertex", new TextEncoder().encode(VERTEX_WGSL), null, "v.wgsl", context);
  fragment.Create("fragment", new TextEncoder().encode("@fragment fn main() {}"), null, "f.wgsl", context);

  const program = new CjsWebgpuShaderProgramAL();

  assert.equal(program.Create([ vertex, fragment ], context), ALResult.S_OK);
  assert.equal(program.IsValid(), true);
  assert.deepEqual(program.GetShaders(), [ vertex, fragment ]);

  // A pipeline description asks for a stage by name; WebGPU has no link step,
  // so the program's job is to answer that.
  assert.equal(program.GetModuleFor("vertex"), vertex.GetModule());
  assert.equal(program.GetModuleFor("fragment"), fragment.GetModule());
  assert.equal(program.GetModuleFor("compute"), null, "a stage it does not have");
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
