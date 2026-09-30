import assert from "node:assert/strict";
import test from "node:test";

import { CjsWebgpuRenderContextAL } from "../../../npm/dist/trinityal/webgpu/internal.js";
import { CjsWebgpuDevice } from "../../../npm/dist/trinityal/webgpu/index.js";
import { Tr2RenderStateSetup } from "../../../npm/dist/resource/shader/index.js";
import { PixelFormat, Tr2CpuUsage, Tr2GpuUsage, ShaderType, Topology } from "../../../npm/dist/global/consts/renderContext/index.js";
import { writeBackendBlock } from "../../../npm/dist/resource/format/index.js";
import { Tr2BufferAL, Tr2BitmapDimensions, Tr2BufferDescriptionAL, Tr2ResourceSetDescriptionAL } from "../../../npm/dist/trinityal/index.js";
import { ALResult, Failed } from "../../../npm/dist/trinityal/index.js";

// A draw verb resolves its pipeline from BOUND STATE, inside the verb, the way
// Metal's EmitRenderPipelineState (MetalWorkQueue.mm:1595-1747) and DX12's
// SetAllState (Tr2RenderContextDx12.cpp:810-878) do. Nothing here hands the
// backend a batch, a material or a package: it binds verbs and draws.

const SHADER_STAGE = Object.freeze({ VERTEX: 1, FRAGMENT: 2, COMPUTE: 4 });
const BUFFER_USAGE = Object.freeze({ UNIFORM: 16, COPY_DST: 32, VERTEX: 64, INDEX: 128, STORAGE: 256 });
const TEXTURE_USAGE = Object.freeze({ TEXTURE_BINDING: 4, COPY_DST: 2, RENDER_ATTACHMENT: 16 });
const VERTEX_WGSL = "@vertex fn main() -> @builtin(position) vec4f { return vec4f(0); }";
const FRAGMENT_WGSL = "@fragment fn main() -> @location(0) vec4f { return vec4f(1); }";

/** The device half, faked at exactly the seams a draw touches. */
function composed()
{
  const log = [];
  const viewports = [];
  const pipelines = [];
  const pass = {
    setPipeline: pipeline => log.push(`setPipeline:${pipeline.id}`),
    setBindGroup: (index, group, offsets) => log.push(`setBindGroup:${index}:${group.id}:${(offsets ?? []).join("/")}`),
    setViewport: (...args) => viewports.push(args),
    setVertexBuffer: (slot, buffer, offset) => log.push(`setVertexBuffer:${slot}:${buffer}:${offset}`),
    setIndexBuffer: (buffer, format, offset) => log.push(`setIndexBuffer:${buffer}:${format}:${offset}`),
    drawIndexed: (...args) => log.push(`drawIndexed:${args.join(",")}`),
    draw: (...args) => log.push(`draw:${args.join(",")}`),
    drawIndirect: (buffer, offset) => log.push(`drawIndirect:${buffer}:${offset}`),
    drawIndexedIndirect: (buffer, offset) => log.push(`drawIndexedIndirect:${buffer}:${offset}`),
    end: () => log.push("pass.end")
  };
  const bindGroups = [];
  const created = { buffers: [], textures: [], samplers: [], writes: [] };
  const device = {
    createShaderModule: descriptor => ({ kind: "module", label: descriptor.label }),
    // WebGPU's default per-stage limits (the spec's supported-limits table).
    limits: { maxTextureDimension2D: 8192, maxTextureDimension3D: 2048, maxSampledTexturesPerShaderStage: 16, maxSamplersPerShaderStage: 16, maxStorageTexturesPerShaderStage: 4, maxStorageBuffersPerShaderStage: 8, maxUniformBuffersPerShaderStage: 12 },
    createBindGroupLayout: descriptor => ({ kind: "bind-group-layout", descriptor }),
    createPipelineLayout: descriptor => ({ kind: "pipeline-layout", descriptor }),
    createBindGroup(descriptor)
    {
      const group = { id: bindGroups.length + 1, descriptor };

      bindGroups.push(group);

      return group;
    },
    createBuffer(descriptor)
    {
      const buffer = { kind: "buffer", descriptor, destroy() {} };

      created.buffers.push(descriptor);

      return buffer;
    },
    createTexture(descriptor)
    {
      created.textures.push(descriptor);

      return { kind: "texture", descriptor, destroy() {}, createView: view => ({ kind: "view", dimension: view.dimension }) };
    },
    createSampler(descriptor)
    {
      created.samplers.push(descriptor);

      return { kind: "sampler", descriptor };
    },
    queue: { writeBuffer(buffer, offset) { created.writes.push([ buffer.descriptor.label, offset ]); }, submit() {} },
    createRenderPipeline(descriptor)
    {
      const pipeline = { id: pipelines.length + 1, descriptor };

      pipelines.push(pipeline);

      return pipeline;
    },
    createCommandEncoder: () => ({ beginRenderPass: () => pass, finish: () => "command-buffer" }),
    pushErrorScope() {},
    popErrorScope() { return Promise.resolve(null); }
  };
  const webgpu = new CjsWebgpuDevice({ device, shaderStage: SHADER_STAGE, bufferUsage: BUFFER_USAGE, textureUsage: TEXTURE_USAGE });
  const al = new CjsWebgpuRenderContextAL({
    webgpu,
    dispatcher: { PrepareAccumulator: () => null, EncodeAccumulator() {} },
    renderTarget: {
      AcquireFrame: () => ({ id: "frame" }),
      CreateRenderPassDescriptor: () => ({ label: "descriptor" }),
      GetWidth: () => 1280,
      GetHeight: () => 720,
      GetFormat: () => "bgra8unorm",
      GetDepthFormat: () => "depth24plus",
      GetSampleCount: () => 1
    }
  });

  al.CreateDevice();
  al.BeginScene();
  al.DrainTransitions();

  return { al, log, viewports, pipelines, bindGroups, created };
}

/** A linked program; `block` puts bind-group declarations on both stages. */
function programFor(al, { block = null, fragment = true } = {})
{
  const signature = {
    registers: block ? [{registerType:36, registerIndex:3}, {registerType:1, registerIndex:3}] : [],
    pipelineInputs: [ { usage: 0, usageIndex: 0, registerIndex: 0 } ],
    backendBlock: block ? { bytes: block, size: block.byteLength } : null
  };
  const stages = [ al.CreateShader(ShaderType.VERTEX_SHADER, VERTEX_WGSL, signature, "v.wgsl") ];

  if (fragment) stages.push(al.CreateShader(ShaderType.PIXEL_SHADER, FRAGMENT_WGSL, signature, "f.wgsl"));

  return al.CreateShaderProgram(stages);
}

function deviceBuffer(name, al)
{
  const value = al.CreateBuffer(Tr2BufferDescriptionAL.FromStride(4, 64,
    Tr2GpuUsage.VERTEX_BUFFER | Tr2GpuUsage.INDEX_BUFFER, Tr2CpuUsage.WRITE));
  assert.ok(value && value.IsValid());
  value.TrinityALImpl_GetObject().GetDeviceBuffer = () => name;
  return value;
}

function deviceTexture(id, al)
{
  const value = al.CreateTexture(Tr2BitmapDimensions.texture2D(4, 4, 1, PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM),
    { gpuUsage: Tr2GpuUsage.RENDER_TARGET | Tr2GpuUsage.SHADER_RESOURCE });
  assert.ok(value && value.IsValid());
  value.TrinityALImpl_GetObject().GetDeviceTextureView = dimension => ({ kind: "view", dimension, id });
  return value;
}

/** Carbon's SubmitGeometry sequence against a complete state. */
function bindGeometry(al, program)
{
  al.SetTopology(Topology.TOP_TRIANGLES);
  al.SetVertexLayout(al.CreateVertexLayout([
    { usage: 0, usageIndex: 0, type: "Float32", elementCount: 3, offset: 0, stream: 0 }
  ]));
  al.SetStreamSource(0, deviceBuffer("vb", al), 0, 12);
  al.SetIndices(deviceBuffer("ib", al), 2);
  al.SetShaderProgram(program);
  al.SetRenderStates(Tr2RenderStateSetup.fromKeyValues([]));
}

test("a draw resolves a pipeline from bound state once, and the next draw reuses it", () =>
{
  const { al, log, pipelines } = composed();
  const program = programFor(al);

  bindGeometry(al, program);

  assert.equal(al.DrawIndexedInstanced(36, 1, 0, 0, 0), ALResult.S_OK);
  assert.equal(al.DrawIndexedInstanced(36, 1, 0, 0, 0), ALResult.S_OK);
  assert.equal(al.m_pipelineFailure, null);

  const events = al.DrainTransitions();

  // Metal opens the encoder before it asks whether it can draw
  // (MetalWorkQueue.mm:2922-2944), so the pass opens first.
  assert.deepEqual(events.map(event => event.type), [ "open", "pipeline", "draw", "draw" ]);
  assert.equal(events[1].created, true);
  assert.equal(pipelines.length, 1, "two draws, one pipeline");
  assert.equal(al.IsPipelineDirty(), false, "resolving clears the dirty flag, as SetAllState does (cpp:870)");

  // The encoder is told each thing once; the second draw repeats only the draw.
  assert.deepEqual(log, [
    "setPipeline:1",
    "setVertexBuffer:0:vb:0",
    "setIndexBuffer:ib:uint16:0",
    "drawIndexed:36,1,0,0,0",
    "drawIndexed:36,1,0,0,0"
  ]);

  // The descriptor is the bound state: the program's layout and modules, the
  // declaration matched to the program's inputs at the stream's stride, and
  // the bound target's format.
  const descriptor = pipelines[0].descriptor;

  assert.equal(descriptor.layout, program.GetPipelineLayout());
  assert.equal(descriptor.vertex.module, program.GetModuleFor(ShaderType.VERTEX_SHADER));
  assert.equal(descriptor.vertex.entryPoint, "main");
  assert.deepEqual(descriptor.vertex.buffers, [
    { arrayStride: 12, stepMode: "vertex", attributes: [ { shaderLocation: 0, offset: 0, format: "float32x3" } ] }
  ]);
  assert.equal(descriptor.fragment.module, program.GetModuleFor(ShaderType.PIXEL_SHADER));
  assert.deepEqual(descriptor.fragment.targets.map(target => target.format), [ "bgra8unorm" ]);
  assert.equal(descriptor.primitive.topology, "triangle-list");
  assert.equal(descriptor.depthStencil.format, "depth24plus");
});

test("SetViewport reaches the pass at the draw, as Metal's work queue applies it", () =>
{
  // Tr2RenderContextMetal.mm:1180-1186 hands the viewport to the work queue,
  // which sets it on the encoder before the draw. It used to be stored and
  // never applied, so a shadow cascade drew over the whole atlas.
  const { al, viewports } = composed();

  bindGeometry(al, programFor(al));
  al.SetViewport({ x: 640, y: 0, width: 320, height: 360, minZ: 0, maxZ: 1 });
  al.DrawIndexedInstanced(36, 1);

  assert.deepEqual(viewports.at(-1), [ 640, 0, 320, 360, 0, 1 ]);
});

test("a state change dirties the pipeline and the next draw resolves a second one", () =>
{
  const { al, pipelines } = composed();

  bindGeometry(al, programFor(al));
  al.DrawIndexedInstanced(36, 1);

  assert.equal(al.SetTopology(Topology.TOP_LINES), ALResult.S_OK);
  assert.equal(al.IsPipelineDirty(), true);
  assert.equal(al.DrawIndexedInstanced(36, 1), ALResult.S_OK);
  assert.equal(pipelines.length, 2);
  assert.equal(pipelines[1].descriptor.primitive.topology, "line-list");

  // Back to the first state: the cache answers, nothing is created.
  al.SetTopology(Topology.TOP_TRIANGLES);
  al.DrawIndexedInstanced(36, 1);
  assert.equal(pipelines.length, 2);
  assert.equal(al.DrainTransitions().filter(event => event.type === "pipeline").map(event => event.created).join(","), "true,true,false");
});

test("a forced hash collision still resolves each state to its own pipeline", () =>
{
  // Carbon's lookup compares the description on a hash hit (operator==,
  // PsoDescription.cpp:68-71). Every state is forced to one hash here, so only
  // the block compare can tell them apart.
  const { al, pipelines } = composed();
  const description = al.GetPsoDescription();
  const updateHash = description.UpdateHash;

  description.UpdateHash = function () { updateHash.call(this); this.hash = 7; return 7; };

  bindGeometry(al, programFor(al));
  al.DrawIndexedInstanced(36, 1);
  al.SetTopology(Topology.TOP_LINES);
  al.DrawIndexedInstanced(36, 1);

  assert.equal(pipelines.length, 2, "one bucket, two entries");
  assert.equal(pipelines[1].descriptor.primitive.topology, "line-list");

  al.SetTopology(Topology.TOP_TRIANGLES);
  al.DrawIndexedInstanced(36, 1);
  al.SetTopology(Topology.TOP_LINES);
  al.DrawIndexedInstanced(36, 1);

  assert.equal(pipelines.length, 2, "both found again in the shared bucket");
  assert.deepEqual(al.DrainTransitions().filter(event => event.type === "pipeline").map(event => event.created), [ true, true, false, false ]);
  assert.equal(al._pipelines.get(7).length, 2);
});

test("a redundant setter leaves the pipeline clean", () =>
{
  // Carbon's setters compare before dirtying (Tr2RenderContextDx12.cpp:315-345).
  const { al } = composed();
  const setup = Tr2RenderStateSetup.fromKeyValues([]);

  bindGeometry(al, programFor(al));
  al.SetRenderStates(setup, { invertedDepthTest: false, invertedCullMode: false, wireframe: false });
  al.DrawIndexedInstanced(36, 1);

  al.SetTopology(Topology.TOP_TRIANGLES);
  al.SetRenderStates(setup, { invertedDepthTest: false, invertedCullMode: false, wireframe: false });
  assert.equal(al.IsPipelineDirty(), false, "same topology, same setup, equal overrides in a fresh record");

  // Negative control: a changed override does dirty it.
  al.SetRenderStates(setup, { invertedDepthTest: true, invertedCullMode: false, wireframe: false });
  assert.equal(al.IsPipelineDirty(), true);
});

test("a cache hit builds no vertex layouts, and a second setup with the same states hits", () =>
{
  const { al, pipelines } = composed();
  let builds = 0;
  const build = al.BuildVertexBufferLayouts;

  al.BuildVertexBufferLayouts = function () { builds += 1; return build.call(this); };

  bindGeometry(al, programFor(al));
  al.DrawIndexedInstanced(36, 1);

  // A different setup object with the same content is the same pipeline.
  al.SetRenderStates(Tr2RenderStateSetup.fromKeyValues([]));
  assert.equal(al.IsPipelineDirty(), true, "a new setup object dirties");
  al.DrawIndexedInstanced(36, 1);

  assert.equal(pipelines.length, 1);
  assert.equal(builds, 1, "built on the miss only");
});

test("a hit restores the dummy vertex stream slot its pipeline was built with", () =>
{
  const { al } = composed();
  const signature = {
    registers: [],
    pipelineInputs: [
      { usage: 0, usageIndex: 0, registerIndex: 0, type: 0 },
      { usage: 5, usageIndex: 0, registerIndex: 1, type: 0 }
    ],
    backendBlock: null
  };
  const withDummy = al.CreateShaderProgram([
    al.CreateShader(ShaderType.VERTEX_SHADER, VERTEX_WGSL, signature, "v.wgsl"),
    al.CreateShader(ShaderType.PIXEL_SHADER, FRAGMENT_WGSL, signature, "f.wgsl")
  ]);
  const plain = programFor(al);

  bindGeometry(al, withDummy);
  al.DrawIndexedInstanced(36, 1);
  al.SetShaderProgram(plain);
  al.DrawIndexedInstanced(36, 1);
  assert.equal(al._dummyVertexStream, null, "the plain program's pipeline has no dummy stream");

  al.SetShaderProgram(withDummy);
  al.DrawIndexedInstanced(36, 1);

  // The encoder binds the dummy at this slot (EmitRenderEncoderState); the
  // work queue drops the rebind here because the pass still holds it.
  assert.equal(al._dummyVertexStream, 1);
  assert.equal(al.m_pipelineFailure, null);
});

test("a hit binds the streams of the pipeline it found, not of the last miss", () =>
{
  // The operator's patterned hull (54daec1f): one program drawn from a mesh
  // with its UVs interleaved on stream 0 and one with them on stream 1. A hit
  // kept the last miss's buffer layouts, so the stream-1 pipeline drew with
  // slot 1 unset and WebGPU invalidated the command buffer.
  const { al, pipelines } = composed();
  const signature = {
    registers: [],
    pipelineInputs: [
      { usage: 0, usageIndex: 0, registerIndex: 0, type: 0 },
      { usage: 5, usageIndex: 0, registerIndex: 1, type: 0 }
    ],
    backendBlock: null
  };
  const program = al.CreateShaderProgram([
    al.CreateShader(ShaderType.VERTEX_SHADER, VERTEX_WGSL, signature, "v.wgsl"),
    al.CreateShader(ShaderType.PIXEL_SHADER, FRAGMENT_WGSL, signature, "f.wgsl")
  ]);
  const interleaved = al.CreateVertexLayout([
    { usage: 0, usageIndex: 0, type: "Float32", elementCount: 3, offset: 0, stream: 0 },
    { usage: 5, usageIndex: 0, type: "Float32", elementCount: 2, offset: 12, stream: 0 }
  ]);
  const split = al.CreateVertexLayout([
    { usage: 0, usageIndex: 0, type: "Float32", elementCount: 3, offset: 0, stream: 0 },
    { usage: 5, usageIndex: 0, type: "Float32", elementCount: 2, offset: 0, stream: 1 }
  ]);
  const drawWith = (layout) =>
  {
    al.SetVertexLayout(layout);
    assert.equal(al.DrawIndexedInstanced(36, 1), ALResult.S_OK, al.m_pipelineFailure ?? "drew");
    return al.GetPsoDescription().vertexBufferLayouts.filter(Boolean).length;
  };

  al.SetTopology(Topology.TOP_TRIANGLES);
  al.SetStreamSource(0, deviceBuffer("vb0", al), 0, 20);
  al.SetStreamSource(1, deviceBuffer("vb1", al), 0, 8);
  al.SetIndices(deviceBuffer("ib", al), 2);
  al.SetShaderProgram(program);
  al.SetRenderStates(Tr2RenderStateSetup.fromKeyValues([]));

  assert.equal(drawWith(interleaved), 1, "miss: one stream");
  assert.equal(drawWith(split), 2, "miss: two streams");
  assert.equal(drawWith(interleaved), 1, "hit: the interleaved pipeline's one stream");
  assert.equal(drawWith(split), 2, "hit: the split pipeline's two streams, slot 1 included");
  assert.equal(pipelines.length, 2);
});

test("the indirect draws resolve state like a draw and read their arguments from the buffer", () =>
{
  // Metal's DrawInstancedIndirect / DrawIndexedInstancedIndirect
  // (Tr2RenderContextMetal.mm:487-521): the same resource check as a draw,
  // then the work queue's indirect DrawPrimitives / DrawIndexedPrimitives.
  const { al, log, pipelines } = composed();
  const args = deviceBuffer("args", al);

  bindGeometry(al, programFor(al));

  assert.equal(al.DrawInstancedIndirect(args, 16), ALResult.S_OK, al.m_pipelineFailure ?? "drew");
  assert.equal(al.DrawIndexedInstancedIndirect(args, 32), ALResult.S_OK, al.m_pipelineFailure ?? "drew");

  assert.equal(pipelines.length, 1, "one pipeline, resolved as for a direct draw");
  assert.ok(log.includes("drawIndirect:args:16"), log.join(" | "));
  assert.ok(log.includes("setIndexBuffer:ib:uint16:0"), "the indexed form binds the index buffer");
  assert.ok(log.includes("drawIndexedIndirect:args:32"), log.join(" | "));

  // Negative control: an invalid argument buffer draws nothing.
  const before = log.length;
  assert.equal(al.DrawInstancedIndirect(new Tr2BufferAL(), 0), ALResult.E_INVALIDARG);
  assert.equal(log.length, before);
});

test("a non-indexed draw binds no index buffer and draws vertices", () =>
{
  const { al, log } = composed();

  bindGeometry(al, programFor(al));
  assert.equal(al.DrawPrimitive(0, 2), ALResult.S_OK);
  assert.deepEqual(log, [ "setPipeline:1", "setVertexBuffer:0:vb:0", "draw:6,1,0,0" ]);
});

test("a program without a pixel stage resolves a depth-only pipeline", () =>
{
  const { al, pipelines } = composed();

  bindGeometry(al, programFor(al, { fragment: false }));
  assert.equal(al.DrawIndexedInstanced(36, 1), ALResult.S_OK);
  assert.equal("fragment" in pipelines[0].descriptor, false, "WebGPU spells depth-only by omitting the fragment stage");
});

const GROUPED_BLOCK = () => writeBackendBlock({
  bindGroups: [ { group: 0, bindings: [
    {
      group: 0, binding: 0, resourceKind: "uniform-buffer", registerSpace: 0, registerIndex: 0,
      visibility: [ "vertex", "fragment" ], type: "array<vec4<f32>, 4>", generatedSymbol: "cb0"
    },
    {
      group: 0, binding: 1, resourceKind: "sampled-resource", registerSpace: 0, registerIndex: 3,
      visibility: [ "fragment" ], type: "texture_2d<f32>", generatedSymbol: "t3"
    },
    {
      group: 0, binding: 2, resourceKind: "sampler", registerSpace: 0, registerIndex: 3,
      visibility: [ "fragment" ], type: "sampler", generatedSymbol: "s3"
    }
  ] } ],
  transforms: []
});

test("a program that declares bind groups draws with the bound constant buffer and the set's entries", async () =>
{
  const { al, log, pipelines, bindGroups, created } = composed();
  const program = programFor(al, { block: GROUPED_BLOCK() });

  // b0 travels SetConstants, as Carbon's constant buffers do; the texture and
  // sampler travel the resource set.
  const constants = al.CreateConstantBuffer(64);
  const sampler = al.CreateSamplerState({ minFilter: 2, magFilter: 2, mipFilter: 2, addressU: 1, addressV: 1, addressW: 1 });
  const description = new Tr2ResourceSetDescriptionAL({ program });

  description.SetSampler(ShaderType.PIXEL_SHADER, 3, sampler);
  description.SetSrv(ShaderType.PIXEL_SHADER, 3, deviceTexture("diffuse", al));

  const set = al.CreateResourceSet(description, program);

  bindGeometry(al, program);
  constants.Lock(al).data.set([ 1, 2, 3 ]);
  constants.Unlock(al);
  al.SetConstants(constants, ShaderType.VERTEX_SHADER, 0);
  al.SetResourceSet(set);

  assert.equal(al.DrawIndexedInstanced(36, 1), ALResult.S_OK);
  assert.equal(al.DrawIndexedInstanced(36, 1), ALResult.S_OK);
  assert.equal(pipelines.length, 1);
  assert.equal(bindGroups.length, 1, "one bind group for two draws of the same state");
  assert.equal(created.buffers.filter(buffer => buffer.usage & BUFFER_USAGE.UNIFORM).length, 1, "the arena's one page; no null buffer was needed");
  assert.equal(created.buffers.find(buffer => buffer.usage & BUFFER_USAGE.UNIFORM).label, "Constant buffer page 0");

  // Metal's arena: the bind is the PAGE, the region is a dynamic offset.
  const entries = bindGroups[0].descriptor.entries;

  assert.equal(entries.length, 3);
  assert.equal(entries[0].resource.buffer.descriptor.label, "Constant buffer page 0");
  assert.deepEqual([ entries[0].resource.offset, entries[0].resource.size ], [ 0, 64 ]);
  assert.equal(entries[0].resource.buffer.descriptor.usage & 16, 16, "UNIFORM");
  assert.equal(entries[1].resource.id, "diffuse");
  assert.equal(entries[2].resource, sampler.GetSampler());
  assert.equal(log.filter(entry => entry === "setBindGroup:0:1:0").length, 1, "bound once for the encoder, at offset 0");
  assert.equal(log.filter(entry => entry.startsWith("drawIndexed")).length, 2);
  assert.equal(created.writes.length, 1, "locked once, drawn twice: one upload");
  assert.equal(constants.m_token.frame, al.GetRecordingFrameNumber(), "the bind consumed the token");

  // THE PER-OBJECT CASE: lock again and draw again in the same frame. The
  // bytes land in a NEW region, the bind group is the same object, and the
  // encoder is told the new offset - so both draws read their own snapshot.
  constants.Lock(al).data.set([ 4, 5, 6 ]);
  constants.Unlock(al);
  al.DrawIndexedInstanced(36, 1);
  assert.equal(bindGroups.length, 1, "same page, same group");
  assert.equal(created.writes.length, 2);
  assert.deepEqual(created.writes.map(write => write[1]), [ 0, 256 ], "two regions, 256 apart");
  assert.equal(log.filter(entry => entry === "setBindGroup:0:1:256").length, 1);

  // A different constant buffer at the same register: still the page, a
  // third region.
  const other = al.CreateConstantBuffer(64);

  al.SetConstants(other, ShaderType.VERTEX_SHADER, 0);
  al.DrawIndexedInstanced(36, 1);
  assert.equal(bindGroups.length, 1);
  assert.equal(created.writes.at(-1)[1], 512);

  // A new scene resets the arena. IT ALSO UNBINDS THE GEOMETRY, as Carbon's
  // EndScene does (`Tr2RenderContextMetal.mm:869-873`), so frame two rebinds
  // before it can draw - a draw straight after BeginScene has no program.
  await al.EndScene();
  al.BeginScene();
  assert.ok(Failed(al.DrawIndexedInstanced(36, 1)), "nothing is bound yet");

  bindGeometry(al, program);
  al.SetConstants(other, ShaderType.VERTEX_SHADER, 0);
  al.SetResourceSet(set);
  al.DrawIndexedInstanced(36, 1);
  assert.equal(created.writes.at(-1)[1], 0, "frame two starts at offset zero");
});

test("slots nothing filled take dummies, as Metal's Create fills them", () =>
{
  const { al, bindGroups, created } = composed();
  const program = programFor(al, { block: GROUPED_BLOCK() });

  // No constant buffer bound, no resource set bound: DX12's null CB and
  // Metal's dummy texture and sampler.
  bindGeometry(al, program);
  assert.equal(al.DrawIndexedInstanced(36, 1), ALResult.S_OK);

  const entries = bindGroups[0].descriptor.entries;

  assert.equal(created.buffers.filter(buffer => buffer.usage & BUFFER_USAGE.UNIFORM).length, 1, "a null uniform buffer, and no arena page was needed");
  assert.equal(created.buffers.find(buffer => buffer.usage & BUFFER_USAGE.UNIFORM).size, 64, "sized to the layout's minBindingSize");
  assert.equal(entries[0].resource.buffer.kind, "buffer");
  assert.deepEqual([ entries[0].resource.offset, entries[0].resource.size ], [ 0, 64 ]);
  assert.equal(created.textures.length, 1, "a 1x1 dummy texture");
  assert.equal(entries[1].resource.dimension, "2d");
  assert.equal(created.samplers.length, 1, "a default sampler");

  // A set made against ANOTHER program does not answer for this one.
  const foreign = programFor(al, { block: GROUPED_BLOCK() });
  const set = al.CreateResourceSet(new Tr2ResourceSetDescriptionAL({ program: foreign }), foreign);

  al.SetResourceSet(set);
  al.DrawIndexedInstanced(36, 1);
  assert.equal(created.textures.length, 1, "the dummies are shared, created once");
  assert.equal(bindGroups.length, 1, "and the same group is reused - the set did not apply");
});

test("what the vertex half cannot say refuses the draw and names the gap", () =>
{
  const { al, log } = composed();
  const program = programFor(al);

  // No stream bound: the layout's stream has no stride.
  al.SetTopology(Topology.TOP_TRIANGLES);
  al.SetVertexLayout(al.CreateVertexLayout([ { usage: 0, usageIndex: 0, type: "Float32", elementCount: 3, offset: 0 } ]));
  al.SetIndices(deviceBuffer("ib", al), 2);
  al.SetShaderProgram(program);
  al.SetRenderStates(Tr2RenderStateSetup.fromKeyValues([]));

  assert.ok(Failed(al.DrawIndexedInstanced(36, 1)));
  assert.match(al.m_pipelineFailure, /stride for vertex stream 0/);

  // A valid AL value whose implementation has no device buffer must refuse.
  al.SetStreamSource(0, deviceBuffer(null, al), 0, 12);
  assert.ok(Failed(al.DrawIndexedInstanced(36, 1)));
  assert.match(al.m_pipelineFailure, /device buffer on vertex stream 0/);

  // An index stride WebGPU has no format for.
  al.SetStreamSource(0, deviceBuffer("vb", al), 0, 12);
  al.SetIndices(deviceBuffer("ib", al), 3);
  assert.ok(Failed(al.DrawIndexedInstanced(36, 1)));
  assert.match(al.m_pipelineFailure, /index format for a 3-byte stride/);

  // A declaration whose element type this backend cannot name: WebGPU has no
  // three-component 8-bit format. (FLOAT32_3 is Carbon's own DataType name and
  // IS nameable - float32x3.)
  al.SetIndices(deviceBuffer("ib", al), 2);
  al.SetVertexLayout(al.CreateVertexLayout([ { usage: 0, usageIndex: 0, type: "UBYTE_3", offset: 0 } ]));
  assert.ok(Failed(al.DrawIndexedInstanced(36, 1)));
  assert.match(al.m_pipelineFailure, /vertex format for stream 0/);

  assert.equal(log.length, 0, "no refusal reached the encoder");
});

test("a program the backend did not link cannot resolve", () =>
{
  const { al } = composed();

  bindGeometry(al, { IsValid: () => true, id: "foreign" });
  assert.ok(Failed(al.DrawIndexedInstanced(36, 1)));
  assert.match(al.m_pipelineFailure, /a program this backend linked/);
});

test("releasing device resources drops the resolved pipelines", () =>
{
  const { al, pipelines } = composed();

  bindGeometry(al, programFor(al));
  al.DrawIndexedInstanced(36, 1);
  al.ReleaseDeviceResources();
  al.ResetRenderTargets();

  assert.equal(al.IsPipelineDirty(), true);
  al.DrawIndexedInstanced(36, 1);
  assert.equal(pipelines.length, 2, "the same state resolves afresh after a release");
});

test("a pixel stage reports the colour locations its WGSL writes", () =>
{
  const { al } = composed();
  const signature = { registers: [], pipelineInputs: [], backendBlock: null };
  const outputs = source => al.CreateShader(ShaderType.PIXEL_SHADER, source, signature, "f.wgsl").GetOutputs();

  // Our lowering's struct (SV_TargetN -> @location(N)), and a direct return.
  assert.deepEqual(outputs("struct FragmentOutput\n{\n    @location(1) output1: vec2<f32>,\n    @location(0) output0: vec4<f32>,\n};\n@fragment fn main() -> FragmentOutput { var output: FragmentOutput; return output; }"), [ 0, 1 ]);
  assert.deepEqual(outputs(FRAGMENT_WGSL), [ 0 ]);

  // A depth-only stage writes no colour location.
  assert.deepEqual(outputs("struct FragmentOutput\n{\n    @builtin(frag_depth) depth: f32,\n};\n@fragment fn main() -> FragmentOutput { var output: FragmentOutput; return output; }"), []);

  // And the program answers for its pixel stage, or null without one.
  assert.deepEqual(programFor(al).GetFragmentOutputs(), [ 0 ]);
  assert.equal(programFor(al, { fragment: false }).GetFragmentOutputs(), null);
});

test("inputs the mesh lacks read a constant dummy stream, as Metal's do", () =>
{
  // quadv5 declares POSITION0, BLENDINDICES0 (UINT) and TANGENT0; a mesh with
  // only a position used to be refused ("a vertex element for input 6:0, ...").
  // Metal feeds each missing input from one non-stepping dummy stream at offset
  // 0, format by declared type (Tr2VertexLayoutALMetal.mm:145-165).
  const { al, log, pipelines, created } = composed();
  const signature = {
    registers: [],
    pipelineInputs: [
      { usage: 0, usageIndex: 0, registerIndex: 0, type: 0 },
      { usage: 6, usageIndex: 0, registerIndex: 1, type: 2 },
      { usage: 5, usageIndex: 0, registerIndex: 2, type: 0 },
      { usage: 5, usageIndex: 1, registerIndex: 3, type: 1 }
    ],
    backendBlock: null
  };
  const program = al.CreateShaderProgram([
    al.CreateShader(ShaderType.VERTEX_SHADER, VERTEX_WGSL, signature, "v.wgsl"),
    al.CreateShader(ShaderType.PIXEL_SHADER, FRAGMENT_WGSL, signature, "f.wgsl")
  ]);

  bindGeometry(al, program);

  assert.equal(al.DrawIndexedInstanced(36, 1, 0, 0, 0), ALResult.S_OK, al.m_pipelineFailure ?? "drew");

  const buffers = pipelines[0].descriptor.vertex.buffers;

  assert.deepEqual(buffers[0].attributes, [ { shaderLocation: 0, offset: 0, format: "float32x3" } ], "the mesh's own stream");
  assert.deepEqual(buffers[1], {
    arrayStride: 0,
    stepMode: "vertex",
    attributes: [
      { shaderLocation: 1, offset: 0, format: "uint8x4" },
      { shaderLocation: 2, offset: 0, format: "float32x4" },
      { shaderLocation: 3, offset: 0, format: "sint8x4" }
    ]
  });

  // The dummy stream is bound at the next slot, to one 16-byte zeroed buffer.
  assert.ok(log.some(entry => /^setVertexBuffer:1:\[object Object\]:0$/u.test(entry)), log.join(" | "));
  assert.equal(created.buffers.filter(descriptor => descriptor.label === "Tr2RenderContextAL dummy vertex stream").length, 1);
  assert.equal(created.buffers.find(descriptor => descriptor.label === "Tr2RenderContextAL dummy vertex stream").size, 16);
});

test("a draw fills the emulated-addressing modes buffer from the bound sampler states", () =>
{
  // WebGPU has no border address mode; the translated shader tests it from
  // cjsAddressModes, which the backend recognises by its symbol and fills per
  // draw. The shader stage used to drop the symbol, so the buffer bound empty
  // and decals kept their clamp-to-edge smear.
  const { al } = composed();
  const block = writeBackendBlock({
    bindGroups: [ { group: 0, bindings: [
      {
        group: 0, binding: 0, resourceKind: "uniform-buffer", registerSpace: 0, registerIndex: 8,
        visibility: [ "fragment" ], type: "array<vec4<f32>, 4>", generatedSymbol: "cjsAddressModes"
      },
      {
        group: 0, binding: 1, resourceKind: "sampled-resource", registerSpace: 0, registerIndex: 3,
        visibility: [ "fragment" ], type: "texture_2d<f32>", generatedSymbol: "t3"
      },
      {
        group: 0, binding: 2, resourceKind: "sampler", registerSpace: 0, registerIndex: 3,
        visibility: [ "fragment" ], type: "sampler", generatedSymbol: "s3"
      }
    ] } ],
    transforms: []
  });
  const program = programFor(al, { block });
  const decal = al.CreateSamplerState({ minFilter: 2, magFilter: 2, mipFilter: 2, addressU: 4, addressV: 4, addressW: 3 });
  const description = new Tr2ResourceSetDescriptionAL({ program });

  description.SetSampler(ShaderType.PIXEL_SHADER, 3, decal);
  description.SetSrv(ShaderType.PIXEL_SHADER, 3, deviceTexture("decal", al));

  const set = al.CreateResourceSet(description, program);

  bindGeometry(al, program);
  al.SetResourceSet(set);

  assert.equal(al.DrawIndexedInstanced(36, 1), ALResult.S_OK);
  assert.notEqual(al._addressModes, null, "the backend recognised the buffer");

  const modes = new Float32Array(al._addressModes.m_shadowCopy.buffer, 0, 16);

  assert.deepEqual([ ...modes.slice(12, 16) ], [ 4, 4, 3, 0 ], "s3: border U and V, clamp W");
  assert.deepEqual([ ...modes.slice(0, 12) ], new Array(12).fill(0), "s0..s2: nothing to emulate");
});

test("an invalid instance extent refuses pipeline creation and a repaired next draw succeeds", () =>
{
  const { al, pipelines, log } = composed();
  const signature = { registers: [], pipelineInputs: [
    { usage: 0, usageIndex: 0, registerIndex: 0 },
    { usage: 5, usageIndex: 8, registerIndex: 1 }
  ] };
  const program = al.CreateShaderProgram([
    al.CreateShader(ShaderType.VERTEX_SHADER, VERTEX_WGSL, signature, "v.wgsl"),
    al.CreateShader(ShaderType.PIXEL_SHADER, FRAGMENT_WGSL, signature, "f.wgsl")
  ]);
  bindGeometry(al, program);
  al.SetVertexLayout(al.CreateVertexLayout([
    { usage: 0, usageIndex: 0, type: "Float32", elementCount: 3, offset: 0, stream: 0 },
    { usage: 5, usageIndex: 8, type: "Float32", elementCount: 2, offset: 32, stream: 1, instanceStepRate: 1 }
  ]));
  al.SetStreamSource(1, deviceBuffer("instances", al), 0, 32);
  assert.ok(Failed(al.DrawIndexedInstanced(6, 2)));
  assert.match(al.m_pipelineFailure, /stream 1.*offset \(32\).*arrayStride \(32\)/);
  assert.equal(pipelines.length, 0, "invalid descriptor never reaches createRenderPipeline");
  assert.equal(log.some(entry => entry.startsWith("setPipeline:")), false);
  al.SetStreamSource(1, deviceBuffer("instances", al), 0, 40);
  assert.equal(al.DrawIndexedInstanced(6, 2), ALResult.S_OK);
  assert.equal(pipelines.length, 1);
  assert.equal(pipelines[0].descriptor.vertex.buffers[1].arrayStride, 40);
});
