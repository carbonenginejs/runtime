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
    stageInputs: [
      { exists: true, signature: { pipelineInputs: INPUTS }, resources: new Map(), constants: [] },
      { exists: false, signature: { pipelineInputs: [] }, resources, constants: [] }
    ]
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
/**
 * A package whose pipeline declares its bindings, as a translated one does.
 * The resolver binds what the pipeline asks for, so a fixture that declares
 * nothing is a pipeline that needs nothing.
 */
function packageDeclaring(bindings = [])
{
  return () => ({
    GetPipeline: (technique, passIndex) => ({
      key: `${technique}.pass${passIndex}`,
      bindGroups: bindings.length ? [ { group: 0, bindings } ] : []
    })
  });
}

const CreatePackage = packageDeclaring();

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

// Layout descriptors as the package emits them, copied in shape from a real
// quadv5.sm_hi binding. The layout is what separates a texture from a buffer:
// a structured buffer is declared through an SRV and so carries the same
// "sampled-resource" kind that a texture does.
const TEXTURE_2D = Object.freeze({
  type: "texture_2d<f32>",
  buffer: null,
  texture: Object.freeze({ sampleType: "float", viewDimension: "2d", multisampled: false }),
  sampler: null
});

const SAMPLER = Object.freeze({
  type: "sampler",
  buffer: null,
  texture: null,
  sampler: Object.freeze({ type: "filtering" })
});

const UNIFORM_BUFFER = Object.freeze({
  type: "array<vec4<f32>, 32>",
  buffer: Object.freeze({ type: "uniform", hasDynamicOffset: false, minBindingSize: 512 }),
  texture: null,
  sampler: null
});

const READ_ONLY_STORAGE = Object.freeze({
  type: "array<vec4<f32>>",
  buffer: Object.freeze({ type: "read-only-storage", hasDynamicOffset: false, minBindingSize: 16 }),
  texture: null,
  sampler: null
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
  const resolver = resolverOver(new TestDevice(), {
    CreatePackage: packageDeclaring([ {
      name: "DiffuseMap",
      resourceKind: "sampled-resource",
      layout: TEXTURE_2D,
      registerSpace: 0,
      registerIndex: 3
    } ])
  });
  const batch = batchFor(materialWith([ reflectedPass() ]));

  await assert.rejects(
    resolver.ResolveBindings(batch, batch.objectData, { passIndex: 0 }),
    /no source was supplied for a sampled-resource/
  );
});

test("a supplied texture is bound at the identity the pipeline declares", async () =>
{
  // Not a key of our own invention: the device computes this identity from the
  // binding record, and handing it a different one fails at draw.
  const texture = { id: "diffuse" };
  const resolver = resolverOver(new TestDevice(), {
    ResolveTexture: () => texture,
    CreatePackage: packageDeclaring([ {
      name: "DiffuseMap",
      resourceKind: "sampled-resource",
      layout: TEXTURE_2D,
      registerSpace: 0,
      registerIndex: 3
    } ])
  });
  const batch = batchFor(materialWith([ reflectedPass() ]));

  const bindings = await resolver.ResolveBindings(batch, batch.objectData, { passIndex: 0 });

  assert.equal(bindings.resources.get("sampled-resource:0:3"), texture);
});

test("a declared scope identity is used verbatim", () =>
{
  // A stage-scoped binding carries its own identity, and the device compares it
  // exactly; recomputing one would drop the @stage suffix.
  const resolver = resolverOver(new TestDevice(), {
    ResolveTexture: () => ({ id: "t" }),
    CreatePackage: packageDeclaring([ {
      name: "DiffuseMap",
      resourceKind: "sampled-resource",
      layout: TEXTURE_2D,
      registerSpace: 0,
      registerIndex: 3,
      scopeIdentity: "sampled-resource:0:3@fragment"
    } ])
  });
  const batch = batchFor(materialWith([ reflectedPass() ]));

  return resolver.ResolveBindings(batch, batch.objectData, { passIndex: 0 })
    .then(bindings => assert.ok(bindings.resources.has("sampled-resource:0:3@fragment")));
});

test("a sampler and a storage buffer are answered by their own sources", async () =>
{
  // All three arrive as bindings and only the layout tells them apart. Routing
  // on resource kind alone hands a bone palette to whatever resolves texture
  // paths, which is how this started.
  const asked = [];
  const resolver = resolverOver(new TestDevice(), {
    ResolveTexture: name => { asked.push("texture:" + name); return { id: name }; },
    ResolveSampler: name => { asked.push("sampler:" + name); return { id: name }; },
    ResolveStorageBuffer: name => { asked.push("storage:" + name); return { id: name }; },
    CreatePackage: packageDeclaring([
      { name: "AlbedoMap", resourceKind: "sampled-resource", registerSpace: 0, registerIndex: 3, layout: TEXTURE_2D },
      { name: "BoneTransforms", resourceKind: "sampled-resource", registerSpace: 0, registerIndex: 4, layout: READ_ONLY_STORAGE },
      { name: "s0", resourceKind: "sampler", registerSpace: 0, registerIndex: 0, layout: SAMPLER }
    ])
  });
  const batch = batchFor(materialWith([ reflectedPass() ]));

  await resolver.ResolveBindings(batch, batch.objectData, { passIndex: 0 });

  assert.deepEqual(asked, [ "texture:AlbedoMap", "storage:BoneTransforms", "sampler:s0" ]);
});

test("a per-frame slot is filled from the scene, not from object data", async () =>
{
  // Carbon fixes b1 and b2 as per-frame. They used to fall through to the
  // per-object path, which filled them with object bytes and drew a wrong
  // picture instead of failing - every v5 shader binds both.
  const asked = [];
  const bytes = new Float32Array(4);
  const resolver = resolverOver(new TestDevice(), {
    ResolvePerFrame: slot => { asked.push(slot); return bytes; },
    CreatePackage: packageDeclaring([ {
      name: "cb1",
      resourceKind: "uniform-buffer",
      registerSpace: 0,
      registerIndex: 1,
      layout: UNIFORM_BUFFER
    } ])
  });
  const batch = batchFor(materialWith([ reflectedPass() ]));

  const bindings = await resolver.ResolveBindings(batch, batch.objectData, { passIndex: 0 });

  assert.deepEqual(asked, [ 1 ]);
  assert.equal(bindings.uniformData.get("uniform-buffer:0:1"), bytes);
});

test("a per-frame slot with no scene source refuses rather than guessing", async () =>
{
  const resolver = resolverOver(new TestDevice(), {
    CreatePackage: packageDeclaring([ {
      name: "cb2",
      resourceKind: "uniform-buffer",
      registerSpace: 0,
      registerIndex: 2,
      layout: UNIFORM_BUFFER
    } ])
  });
  const batch = batchFor(materialWith([ reflectedPass() ]));

  await assert.rejects(
    resolver.ResolveBindings(batch, batch.objectData, { passIndex: 0 }),
    /per-frame data owned by the scene/
  );
});

test("a register Carbon does not assign refuses rather than guessing", async () =>
{
  // This used to read "anything past b2 is per-object", which is right for b3
  // and b4 and silently wrong for the rest. Carbon assigns 0..6 and 8.
  const resolver = resolverOver(new TestDevice(), {
    CreatePackage: packageDeclaring([ {
      name: "cb9",
      resourceKind: "uniform-buffer",
      registerSpace: 0,
      registerIndex: 9,
      layout: UNIFORM_BUFFER
    } ])
  });
  const batch = batchFor(materialWith([ reflectedPass() ]));

  await assert.rejects(
    resolver.ResolveBindings(batch, batch.objectData, { passIndex: 0 }),
    /not one of Carbon's constant-buffer registers/
  );
});

test("a mapped register with no source names itself", async () =>
{
  // b5, b6 and b8 are real Carbon registers we do not fill yet. Saying so
  // beats handing them per-object bytes.
  const resolver = resolverOver(new TestDevice(), {
    CreatePackage: packageDeclaring([ {
      name: "cb8",
      resourceKind: "uniform-buffer",
      registerSpace: 0,
      registerIndex: 8,
      layout: UNIFORM_BUFFER
    } ])
  });
  const batch = batchFor(materialWith([ reflectedPass() ]));

  await assert.rejects(
    resolver.ResolveBindings(batch, batch.objectData, { passIndex: 0 }),
    /b8 .*has no source yet/
  );
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
