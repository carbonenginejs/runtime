import assert from "node:assert/strict";
import test from "node:test";

import {
  ALResult,
  Tr2RenderContextALStub,
  Tr2SamplerStateALStub,
  Tr2ShaderALStub,
  Tr2ShaderProgramALStub
} from "../../npm/dist/trinity/core/index.js";
import { ShaderStageType } from "../../npm/dist/resource/index.js";

const context = () =>
{
  const al = new Tr2RenderContextALStub();

  al.CreateDevice();

  return al;
};

const shader = (stage, bytes = [ 1, 2, 3, 4 ], signature = null) =>
{
  const created = new Tr2ShaderALStub();

  created.Create(stage, new Uint8Array(bytes), signature, "shader.fx", context());

  return created;
};


test("a shader keeps its own copy of the bytecode", () =>
{
  // The caller's buffer is free to be reused or grown; the shader must not
  // change underneath the backend when it is.
  const bytecode = new Uint8Array([ 1, 2, 3, 4 ]);
  const created = new Tr2ShaderALStub();

  assert.equal(
    created.Create(ShaderStageType.VERTEX_SHADER, bytecode, null, "vs.fx", context()),
    ALResult.S_OK
  );

  bytecode[0] = 99;

  const stored = created.GetBytecode();

  assert.equal(stored.result, ALResult.S_OK);
  assert.deepEqual([ ...stored.bytecode ], [ 1, 2, 3, 4 ]);

  created.Destroy();
});

test("a shader with no bytecode is refused", () =>
{
  const created = new Tr2ShaderALStub();

  assert.equal(
    created.Create(ShaderStageType.VERTEX_SHADER, new Uint8Array(0), null, "vs.fx", context()),
    ALResult.E_OUTOFMEMORY
  );

  assert.equal(created.IsValid(), false);
  assert.equal(created.GetBytecode().result, ALResult.E_INVALIDCALL);

  created.Destroy();
});

test("the signature given at creation reads back", () =>
{
  // A DELIBERATE DEPARTURE from Carbon's stub, which drops it. Its real
  // backends keep it, and the register map will need it.
  const signature = { registers: [ { registerType: 0, registerIndex: 0 } ] };
  const created = shader(ShaderStageType.PIXEL_SHADER, [ 9 ], signature);

  assert.equal(created.GetSignature(), signature);

  created.Destroy();
});

test("a null shader claims a stage without becoming usable", () =>
{
  // Carbon's null shaders name a stage the pipeline must mention but that does
  // no work, so the shader stays invalid on purpose.
  const created = new Tr2ShaderALStub();

  created.SetNullShaderType(ShaderStageType.GEOMETRY_SHADER);

  assert.equal(created.GetType(), ShaderStageType.GEOMETRY_SHADER);
  assert.equal(created.IsValid(), false);

  created.Destroy();
});

test("a program links one shader per stage", () =>
{
  const al = context();
  const program = new Tr2ShaderProgramALStub();
  const shaders = [ shader(ShaderStageType.VERTEX_SHADER), shader(ShaderStageType.PIXEL_SHADER) ];

  assert.equal(program.Create(shaders, al), ALResult.S_OK);
  assert.equal(program.IsValid(), true);
  assert.equal(program.GetShaders().length, 2);

  program.Destroy();
  for (const each of shaders) each.Destroy();
});

test("two shaders for the same stage are refused", () =>
{
  // THE RULE WORTH HAVING. Without it the program links and draws with
  // whichever the backend happened to keep.
  const al = context();
  const program = new Tr2ShaderProgramALStub();
  const shaders = [ shader(ShaderStageType.VERTEX_SHADER), shader(ShaderStageType.VERTEX_SHADER) ];

  assert.equal(program.Create(shaders, al), ALResult.E_INVALIDARG);
  assert.equal(program.IsValid(), false);

  program.Destroy();
  for (const each of shaders) each.Destroy();
});

test("an empty program, an invalid shader and no device are each refused", () =>
{
  const al = context();
  const program = new Tr2ShaderProgramALStub();

  assert.equal(program.Create([], al), ALResult.E_INVALIDARG);

  const empty = new Tr2ShaderALStub();

  assert.equal(program.Create([ empty ], al), ALResult.E_INVALIDARG);

  assert.equal(
    program.Create([ shader(ShaderStageType.VERTEX_SHADER) ], new Tr2RenderContextALStub()),
    ALResult.E_INVALIDCALL
  );

  empty.Destroy();
  program.Destroy();
});

test("a program keeps its own list, so a caller's later edit cannot reach it", () =>
{
  const al = context();
  const program = new Tr2ShaderProgramALStub();
  const shaders = [ shader(ShaderStageType.VERTEX_SHADER) ];

  program.Create(shaders, al);
  shaders.push(shader(ShaderStageType.PIXEL_SHADER));

  assert.equal(program.GetShaders().length, 1);

  program.Destroy();
  for (const each of shaders) each.Destroy();
});

test("a sampler state creates, holds its description and destroys", () =>
{
  const description = { addressU: 4, addressV: 4, minFilter: 2 };
  const sampler = new Tr2SamplerStateALStub();

  assert.equal(sampler.IsValid(), false);
  assert.equal(sampler.Create(description, context()), ALResult.S_OK);
  assert.equal(sampler.IsValid(), true);
  assert.equal(sampler.GetDescription(), description);

  sampler.Destroy();

  assert.equal(sampler.IsValid(), false);
  assert.equal(sampler.GetDescription(), null);
});
