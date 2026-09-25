import assert from "node:assert/strict";
import { test } from "node:test";

import { Tr2Effect, TriTextureParameter } from "../../npm/dist/trinity/shader/index.js";
import { ResourceRequirement, ShaderStageType } from "../../npm/dist/resource/index.js";
import { composeStubResMan } from "../support/stubResMan.js";

// A browser container merges Detail1Map..Detail3Map into the register of the
// first and records the members on its Tr2EffectResource (arrayLayers). The
// effect keeps the named parameters; the merged register binds the texture
// made from their current paths, with no stand-in while it loads.

const { PIXEL_SHADER } = ShaderStageType;

/** A shader-shaped object with one pixel stage holding `resources`. */
function shaderWith(resources)
{
  const stage = {
    exists: true,
    constants: [],
    resources,
    uavs: new Map(),
    samplers: new Map(),
    constantValues: new Uint8Array(0),
    GetConstantBufferSize: () => 0
  };
  const stageInputs = [];
  stageInputs[PIXEL_SHADER] = stage;
  const pass = { stageInputs, resourceSetDesc: null, renderStateValues: [], stageOrder: [] };
  return { GetEffect: () => ({ techniques: [ { passes: [ pass ] } ] }), ProcessEffect() {} };
}

/** An effect with the three detail maps, merged at t5. */
function detailEffect(paths, packed = false)
{
  const effect = new Tr2Effect();
  paths.forEach((path, index) =>
  {
    const parameter = new TriTextureParameter();
    parameter.name = `Detail${index + 1}Map`;
    if (path) parameter.SetResourcePath(path);
    // The shader here is a reflection-shaped stand-in, which the members'
    // own handle rebuild refuses; their handles are not what is tested.
    parameter.RebuildEffectHandles = () => {};
    effect.resources.push(parameter);
  });
  effect.shader = shaderWith(new Map([
    [ 5, { name: "Detail1Map", arrayLayers: [ "Detail1Map", "Detail2Map", "Detail3Map" ], packed } ]
  ]));
  effect.RebuildCachedData();
  return effect;
}

/** What the merged register's value binds, through a recording description. */
function bind(effect)
{
  const [ merged ] = effect.parametersForPasses[0].passes[0].stageInput[PIXEL_SHADER].textures;
  const bound = [];
  const desc = { SetSrv: (stage, register, resource) => { bound.push({ stage, register, resource }); return true; } };
  merged.sourceValue.CopyToResourceSet(desc, PIXEL_SHADER, merged.registerIndex, merged.registerCount, null);
  return bound[0];
}

function dynamicRequests(stub)
{
  return stub.requests.filter(request => request.path.startsWith("dynamic:"));
}

test("a merged register binds the array made from its members' paths", () =>
{
  const stub = composeStubResMan();
  try
  {
    const effect = detailEffect([ "res:/a.dds", "res:/b.dds", "res:/c.dds" ]);
    const bound = bind(effect);

    const [ request ] = dynamicRequests(stub);
    assert.equal(request.path, "dynamic:/texturearray/res:/a.dds;res:/b.dds;res:/c.dds");
    assert.equal(request.options.requirement, ResourceRequirement.TEXTURE);
    assert.equal(bound.register, 5);
    // Not prepared: the resource itself is bound, which a backend treats as
    // its fallback - no 1x1 stand-in resource.
    assert.equal(bound.resource, stub.resources.get(request.path));
  }
  finally { stub.restore(); }
});

test("a packed merge asks for a texture pack", () =>
{
  const stub = composeStubResMan();
  try
  {
    bind(detailEffect([ "res:/a.dds", "res:/b.dds", "res:/c.dds" ], true));
    assert.equal(dynamicRequests(stub)[0].path, "dynamic:/texturepack/res:/a.dds;res:/b.dds;res:/c.dds");
  }
  finally { stub.restore(); }
});

test("a member without a path binds nothing and requests nothing", () =>
{
  const stub = composeStubResMan();
  try
  {
    const bound = bind(detailEffect([ "res:/a.dds", "", "res:/c.dds" ]));
    assert.equal(dynamicRequests(stub).length, 0);
    assert.equal(bound.resource, null);
  }
  finally { stub.restore(); }
});

test("a changed member path is a different array", () =>
{
  const stub = composeStubResMan();
  try
  {
    const effect = detailEffect([ "res:/a.dds", "res:/b.dds", "res:/c.dds" ]);
    bind(effect);
    bind(effect);
    assert.equal(dynamicRequests(stub).length, 1, "an unchanged path is not asked for again");

    effect.GetResourceByName("Detail2Map").SetResourcePath("res:/d.dds");
    bind(effect);
    assert.equal(dynamicRequests(stub).at(-1).path, "dynamic:/texturearray/res:/a.dds;res:/d.dds;res:/c.dds");
  }
  finally { stub.restore(); }
});
