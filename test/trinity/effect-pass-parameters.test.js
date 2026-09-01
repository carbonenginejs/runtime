import assert from "node:assert/strict";
import { test } from "node:test";

import { Tr2Effect } from "../../npm/dist/trinity/shader/index.js";
import { ShaderStageType } from "../../npm/dist/resource/shader/index.js";

const { VERTEX_SHADER, PIXEL_SHADER, GEOMETRY_SHADER } = ShaderStageType;

/** A reflected stage input carrying constants and resources. */
function stage({ constants = [], resources = new Map(), uavs = new Map(), size = null } = {})
{
  const declared = size ?? constants.reduce((total, c) => Math.max(total, c.offset + c.size), 0);
  return {
    exists: true,
    constants,
    resources,
    uavs,
    samplers: new Map(),
    constantValues: new Uint8Array(declared),
    GetConstantBufferSize: () => declared
  };
}

/** A shader-shaped object over one technique of one pass. */
function shaderWith(stages)
{
  const stageInputs = [];
  for (const [ stageType, value ] of Object.entries(stages)) stageInputs[Number(stageType)] = value;
  const pass = { stageInputs, resourceSetDesc: null, renderStateValues: [], stageOrder: [] };
  return { GetEffect: () => ({ techniques: [ { passes: [ pass ] } ] }), ProcessEffect() {} };
}

/** An effect with a resolved shader, bypassing the resource chain. */
function effectWith(shader)
{
  const effect = new Tr2Effect();
  effect.shader = shader;
  effect.RebuildCachedData();
  return effect;
}

test("parametersForPasses is built per technique, then per pass", () =>
{
  const effect = effectWith(shaderWith({ [VERTEX_SHADER]: stage() }));

  assert.equal(effect.parametersForPasses.length, 1);
  assert.equal(effect.parametersForPasses[0].passes.length, 1);
  // The shape Tr2Material's readers already expect.
  assert.equal(typeof effect.parametersForPasses[0].passes[0].resourceSetDirty, "boolean");
  assert.equal(effect.parametersForPasses[0].passes[0].stageInput.length, 6);
});

test("a fully static stage takes a shared constant mirror", () =>
{
  // Nothing binds a value, so Carbon takes the deduplicated shared buffer
  // rather than allocating the stage its own.
  const effect = effectWith(shaderWith({
    [VERTEX_SHADER]: stage({ constants: [ { name: "Unbound", offset: 0, size: 16 } ] })
  }));

  const stageInput = effect.parametersForPasses[0].passes[0].stageInput[VERTEX_SHADER];

  assert.equal(stageInput.constantMirror.length, 16);
  assert.equal(stageInput.shaderParameters.length, 0);
});

test("an unbound constant still sizes the buffer", () =>
{
  // Carbon's comment is the rule: the shader may sample an unset constant and
  // expect a default, so every constant counts toward the size.
  const effect = effectWith(shaderWith({
    [PIXEL_SHADER]: stage({ constants: [ { name: "NeverBound", offset: 32, size: 16 } ] })
  }));

  assert.equal(effect.parametersForPasses[0].passes[0].stageInput[PIXEL_SHADER].constantMirror.length, 48);
});

test("a bound parameter records its byte offset and size, not a register", () =>
{
  const effect = new Tr2Effect();
  effect.parameters.push({
    name: "Colour",
    SupportsDirtyNotification: () => false,
    RebuildEffectHandles() {}
  });
  effect.shader = shaderWith({
    [VERTEX_SHADER]: stage({ constants: [ { name: "Colour", offset: 16, size: 16 } ] })
  });
  effect.RebuildCachedData();

  const [ parameter ] = effect.parametersForPasses[0].passes[0].stageInput[VERTEX_SHADER].shaderParameters;

  assert.equal(parameter.sourceName, "Colour");
  // registerIndex/registerCount are Carbon's historical names; for a constant
  // they are a byte offset and a byte size.
  assert.equal(parameter.registerIndex, 16);
  assert.equal(parameter.registerCount, 16);
});

test("a notifying parameter goes in the separate vector", () =>
{
  // MarkConstantBuffersDirty keys off exactly this split.
  const effect = new Tr2Effect();
  effect.parameters.push({
    name: "Animated",
    SupportsDirtyNotification: () => true,
    RebuildEffectHandles() {}
  });
  effect.shader = shaderWith({
    [VERTEX_SHADER]: stage({ constants: [ { name: "Animated", offset: 0, size: 16 } ] })
  });
  effect.RebuildCachedData();

  const stageInput = effect.parametersForPasses[0].passes[0].stageInput[VERTEX_SHADER];

  assert.equal(stageInput.shaderParameters.length, 0);
  assert.equal(stageInput.shaderParametersWithNotification.length, 1);
});

test("a resource records its register and the sRGB flag", () =>
{
  const effect = new Tr2Effect();
  effect.resources.push({ name: "DiffuseMap", RebuildEffectHandles() {} });
  effect.shader = shaderWith({
    [PIXEL_SHADER]: stage({
      resources: new Map([ [ 3, { name: "DiffuseMap", isSRGB: true } ] ])
    })
  });
  effect.RebuildCachedData();

  const [ texture ] = effect.parametersForPasses[0].passes[0].stageInput[PIXEL_SHADER].textures;

  // Here registerIndex really is the register, and registerCount is a flag
  // word carrying only the sRGB bit.
  assert.equal(texture.registerIndex, 3);
  assert.equal(texture.registerCount, 1);
});

test("an unresolved resource name produces no entry", () =>
{
  // Unlike constants, the resource vector is sparse.
  const effect = effectWith(shaderWith({
    [PIXEL_SHADER]: stage({ resources: new Map([ [ 0, { name: "Missing" } ] ]) })
  }));

  assert.equal(effect.parametersForPasses[0].passes[0].stageInput[PIXEL_SHADER].textures.length, 0);
});

test("binding an effect resource clears GDR compatibility", () =>
{
  // A general draw cannot know a per-effect resource, so Carbon marks the pass
  // incompatible and rolls that up to the effect.
  const effect = new Tr2Effect();
  effect.resources.push({ name: "DiffuseMap", RebuildEffectHandles() {} });
  effect.shader = shaderWith({
    [PIXEL_SHADER]: stage({ resources: new Map([ [ 0, { name: "DiffuseMap" } ] ]) })
  });
  effect.RebuildCachedData();

  assert.equal(effect.parametersForPasses[0].passes[0].compatibleWithGdr, false);
  assert.equal(effect.compatibleWithGdr, false);
});

test("a geometry stage clears GDR compatibility", () =>
{
  // Anything but vertex, pixel or compute.
  const effect = effectWith(shaderWith({
    [VERTEX_SHADER]: stage(),
    [GEOMETRY_SHADER]: stage()
  }));

  assert.equal(effect.parametersForPasses[0].passes[0].compatibleWithGdr, false);
});

test("a plain vertex and pixel pass stays GDR compatible", () =>
{
  const effect = effectWith(shaderWith({
    [VERTEX_SHADER]: stage(),
    [PIXEL_SHADER]: stage()
  }));

  assert.equal(effect.parametersForPasses[0].passes[0].compatibleWithGdr, true);
  assert.equal(effect.compatibleWithGdr, true);
});

test("rebuilding replaces rather than appends", () =>
{
  const effect = effectWith(shaderWith({ [VERTEX_SHADER]: stage() }));

  effect.RebuildCachedData();
  effect.RebuildCachedData();

  assert.equal(effect.parametersForPasses.length, 1);
});

test("no shader leaves the mapping empty rather than throwing", () =>
{
  const effect = new Tr2Effect();

  effect.RebuildCachedData();

  assert.deepEqual(effect.parametersForPasses, []);
});
