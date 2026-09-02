// The concrete resolver, against real Trinity objects rather than fixtures
// returning pre-built answers. This is the class that did not exist: every
// subclass of CjsTrinityBatchResolver lived under test/ and assumed away the
// problem it was meant to solve.
import assert from "node:assert/strict";
import { test } from "node:test";

import { CjsWebgpuDevice } from "../../../npm/dist/engine/webgpu/index.js";
import { CjsWebgpuTrinityBatchResolver } from "../../../npm/dist/engine/webgpu/internal.js";
import { Tr2RenderBatch, Tr2PerObjectData } from "../../../npm/dist/trinity/core/index.js";
import { Tr2EffectStateManager } from "../../../npm/dist/trinity/shader/index.js";
import { Tr2Shader } from "../../../npm/dist/resource/shader/index.js";

const SHADER_STAGE = Object.freeze({ VERTEX: 1, FRAGMENT: 2, COMPUTE: 4 });

/** A hull declaration in the producer's vocabulary, and channels to match. */
const DECL = [
  { usage: "Position", usageIndex: 0, type: "Float32", elementCount: 3, offset: 0 },
  { usage: "Normal", usageIndex: 0, type: "Float32", elementCount: 3, offset: 12 },
  { usage: "TexCoord", usageIndex: 0, type: "Float32", elementCount: 2, offset: 24 }
];

const MESH = {
  decl: DECL,
  vertex: {
    position: [ 0, 0, 0, 1, 0, 0, 1, 1, 0 ],
    normal: [ 0, 0, 1, 0, 0, 1, 0, 0, 1 ],
    texcoord0: [ 0, 0, 1, 0, 1, 1 ]
  },
  indices: [ { faces: [ 0, 1, 2 ] } ],
  lods: [ { ib: { size: 6, stride: 2 }, areas: [ { firstElement: 0, elementCount: 1 } ] } ]
};

/** The shader inputs a hull's vertex stage declares, in Carbon usage codes. */
const INPUTS = [
  { usage: 0, usageIndex: 0, registerIndex: 0 },
  { usage: 2, usageIndex: 0, registerIndex: 1 },
  { usage: 5, usageIndex: 0, registerIndex: 2 }
];

/** A reflected pass with authored render states and no resources. */
// RS_CULLMODE = 22, CULLMODE_NONE = 1: a pass that authors one state, so its
// handle is a REGISTERED setup rather than a reserved rendering-mode slot.
const AUTHORED = [ { state: 22, value: 1 } ];

function reflectedPass({ resources = new Map(), renderStateValues = AUTHORED } = {})
{
  return {
    renderStates: Tr2EffectStateManager.registerRenderStateSetup({ renderStateValues }),
    stageInputs: [ { pipelineInputs: INPUTS, resources: new Map(), constants: [] },
      { pipelineInputs: [], resources, constants: [] } ]
  };
}

/** A material shaped as Trinity's, over one technique of `passes`. */
function materialWith(passes, { values = {} } = {})
{
  // A real Tr2Shader, so the material-constant layout reads the reflection it
  // actually expects rather than a stand-in that answers differently.
  const shader = new Tr2Shader();
  shader.effect.techniques = [ { name: "Main", passes } ];

  const resource = { GetContainerBytes: () => new Uint8Array([ 1, 2, 3 ]) };

  return {
    GetEffectRes: () => resource,
    GetValues: () => values,
    GetShaderStateInterface: () => shader
  };
}

/** A geometry resource of the shape the resolver asks for. */
const GEOMETRY = {
  GetPath: () => "res:/dx9/model/ship/test/hull.gr2",
  GetPayload: () => ({ meshes: [ MESH ] }),
  GetMeshVertexElements: () => DECL
};

function batchFor(material)
{
  const batch = new Tr2RenderBatch();
  batch.SetMaterial(material);
  batch.SetGeometrySource(GEOMETRY, 0, 0, 1, false);
  batch.SetPerObjectData(new Tr2PerObjectData());
  batch.SetDrawIndexedInstanced(3, 1, 0, 0, 0);
  return batch;
}

class TestDevice extends CjsWebgpuDevice
{
  constructor()
  {
    super({ device: { createShaderModule() {} }, shaderStage: SHADER_STAGE });
    this.created = [];
  }

  async CreateGeometry(request)
  {
    this.created.push(request);
    return {
      request,
      indexed: Boolean(request.indexBuffer),
      vertexBufferLayouts: request.vertexBuffers.map(buffer => buffer.layout),
      Destroy() { this.destroyed = true; }
    };
  }
}

/** The package factory, which the resolver takes rather than importing a format. */
const CreatePackage = () => ({
  GetPipeline: (technique, passIndex) => ({ key: `${technique}.pass${passIndex}` })
});

function resolverOver(device, options = {})
{
  return new CjsWebgpuTrinityBatchResolver(device, {
    CreatePackage,
    targets: [ { format: "rgba8unorm" } ],
    ...options
  });
}

test("a material resolves to its pass's pipeline and a merged render state", async () =>
{
  const device = new TestDevice();
  const resolver = resolverOver(device);
  const batch = batchFor(materialWith([ reflectedPass(), reflectedPass() ]));

  batch.renderingMode = 1;   // RM_OPAQUE

  const first = await resolver.ResolveMaterial(batch.material, batch, { passIndex: 0 });
  const second = await resolver.ResolveMaterial(batch.material, batch, { passIndex: 1 });

  assert.equal(first.pipeline.key, "Main.pass0");
  assert.equal(second.pipeline.key, "Main.pass1");

  // The merge, both directions. The pass authored only a cull mode, so that
  // overrides RM_OPAQUE's "cw"...
  assert.equal(first.recipe.primitive.cullMode, "none");

  // ...and everything it did not author comes from the mode. Reading the pass
  // alone would have produced a pipeline with no depth state at all.
  assert.equal(first.recipe.depthStencil.depthCompare, "less-equal");
  assert.equal(first.recipe.depthStencil.depthWriteEnabled, true);
});

test("the recipe declares the pass's attachments, which the effect cannot know", async () =>
{
  const resolver = resolverOver(new TestDevice(), { targets: [ { format: "bgra8unorm" } ] });
  const batch = batchFor(materialWith([ reflectedPass() ]));

  const material = await resolver.ResolveMaterial(batch.material, batch, { passIndex: 0 });

  assert.equal(material.recipe.fragment.targets[0].format, "bgra8unorm");
});

test("geometry is realized once and shared between the two hooks", async () =>
{
  // The pipeline's vertex layout must equal the geometry's exactly, so both
  // hooks must be looking at the same realization.
  const device = new TestDevice();
  const resolver = resolverOver(device);
  const batch = batchFor(materialWith([ reflectedPass() ]));

  const material = await resolver.ResolveMaterial(batch.material, batch, { passIndex: 0 });
  const geometry = await resolver.ResolveGeometry(batch.geometrySource, batch, { passIndex: 0 });

  assert.equal(device.created.length, 1, "realized once, not once per hook");
  assert.deepEqual(material.recipe.vertex.buffers, geometry.geometry.vertexBufferLayouts);
  assert.equal(geometry.indexed, true);
});

test("the declaration is translated before it is bound", async () =>
{
  const device = new TestDevice();
  const resolver = resolverOver(device);

  await resolver.ResolveGeometry(batchFor(materialWith([ reflectedPass() ])).geometrySource,
    batchFor(materialWith([ reflectedPass() ])), { passIndex: 0 });

  const [ request ] = device.created;
  const { attributes } = request.vertexBuffers[0].layout;

  // Three shader inputs, three attributes, at the shader's own locations.
  assert.deepEqual(attributes.map(a => a.shaderLocation), [ 0, 1, 2 ]);
  assert.deepEqual(attributes.map(a => a.format), [ "float32x3", "float32x3", "float32x2" ]);
});

test("draw arguments are left to the batch, not derived a second time", async () =>
{
  // Tr2MeshBase already resolved them from the LOD's areas; deriving them again
  // here gives two answers that can disagree.
  const resolver = resolverOver(new TestDevice());
  const batch = batchFor(materialWith([ reflectedPass() ]));

  const geometry = await resolver.ResolveGeometry(batch.geometrySource, batch, { passIndex: 0 });

  assert.equal(Object.hasOwn(geometry, "draw"), false);
});

test("an effect binding a texture refuses to draw without a texture source", async () =>
{
  // Binding nothing would draw the wrong thing rather than fail.
  const resolver = resolverOver(new TestDevice());
  const pass = reflectedPass({ resources: new Map([ [ 3, { name: "DiffuseMap" } ] ]) });
  const batch = batchFor(materialWith([ pass ]));

  await assert.rejects(
    resolver.ResolveBindings(batch, batch.objectData, { passIndex: 0 }),
    /binds texture "DiffuseMap" and no ResolveTexture was supplied/
  );
});

test("a supplied texture source is bound at the shader's register", async () =>
{
  const texture = { id: "diffuse" };
  const resolver = resolverOver(new TestDevice(), { ResolveTexture: () => texture });
  const pass = reflectedPass({ resources: new Map([ [ 3, { name: "DiffuseMap" } ] ]) });
  const batch = batchFor(materialWith([ pass ]));

  const bindings = await resolver.ResolveBindings(batch, batch.objectData, { passIndex: 0 });

  assert.equal(bindings.resources.get("t3"), texture);
});

test("a material declaring no such pass says so rather than drawing", async () =>
{
  const resolver = resolverOver(new TestDevice());
  const batch = batchFor(materialWith([ reflectedPass() ]));

  await assert.rejects(
    resolver.ResolveMaterial(batch.material, batch, { passIndex: 4 }),
    /declares no pass 4 of technique Main/
  );
});
