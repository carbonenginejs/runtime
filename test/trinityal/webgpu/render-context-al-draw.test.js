import assert from "node:assert/strict";
import test from "node:test";

import { CjsWebgpuRenderContextAL } from "../../../npm/dist/trinityal/webgpu/internal.js";
import { CjsWebgpuDevice } from "../../../npm/dist/trinityal/webgpu/index.js";
import { Tr2RenderStateSetup } from "../../../npm/dist/resource/shader/index.js";
import { ShaderType, Topology } from "../../../npm/dist/global/consts/renderContext/index.js";
import { writeBackendBlock } from "../../../npm/dist/resource/format/index.js";
import { Tr2ResourceSetDescriptionAL } from "../../../npm/dist/trinityal/index.js";

// A draw verb resolves its pipeline from BOUND STATE, inside the verb, the way
// Metal's EmitRenderPipelineState (MetalWorkQueue.mm:1595-1747) and DX12's
// SetAllState (Tr2RenderContextDx12.cpp:810-878) do. Nothing here hands the
// backend a batch, a material or a package: it binds verbs and draws.

const SHADER_STAGE = Object.freeze({ VERTEX: 1, FRAGMENT: 2, COMPUTE: 4 });
const BUFFER_USAGE = Object.freeze({ UNIFORM: 16, COPY_DST: 32, VERTEX: 64, INDEX: 128, STORAGE: 256 });
const TEXTURE_USAGE = Object.freeze({ TEXTURE_BINDING: 4, COPY_DST: 2 });
const VERTEX_WGSL = "@vertex fn main() -> @builtin(position) vec4f { return vec4f(0); }";
const FRAGMENT_WGSL = "@fragment fn main() -> @location(0) vec4f { return vec4f(1); }";

/** The device half, faked at exactly the seams a draw touches. */
function composed()
{
  const log = [];
  const pipelines = [];
  const pass = {
    setPipeline: pipeline => log.push(`setPipeline:${pipeline.id}`),
    setBindGroup: (index, group, offsets) => log.push(`setBindGroup:${index}:${group.id}:${(offsets ?? []).join("/")}`),
    setVertexBuffer: (slot, buffer, offset) => log.push(`setVertexBuffer:${slot}:${buffer}:${offset}`),
    setIndexBuffer: (buffer, format, offset) => log.push(`setIndexBuffer:${buffer}:${format}:${offset}`),
    drawIndexed: (...args) => log.push(`drawIndexed:${args.join(",")}`),
    draw: (...args) => log.push(`draw:${args.join(",")}`),
    end: () => log.push("pass.end")
  };
  const bindGroups = [];
  const created = { buffers: [], textures: [], samplers: [], writes: [] };
  const device = {
    createShaderModule: descriptor => ({ kind: "module", label: descriptor.label }),
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

      return { kind: "texture", descriptor, createView: view => ({ kind: "view", dimension: view.dimension }) };
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

  return { al, log, pipelines, bindGroups, created };
}

/** A linked program; `block` puts bind-group declarations on both stages. */
function programFor(al, { block = null, fragment = true } = {})
{
  const signature = {
    pipelineInputs: [ { usage: 0, usageIndex: 0, registerIndex: 0 } ],
    backendBlock: block ? { bytes: block, size: block.byteLength } : null
  };
  const stages = [ al.CreateShader(ShaderType.VERTEX_SHADER, VERTEX_WGSL, signature, "v.wgsl") ];

  if (fragment) stages.push(al.CreateShader(ShaderType.PIXEL_SHADER, FRAGMENT_WGSL, signature, "f.wgsl"));

  return al.CreateShaderProgram(stages);
}

const deviceBuffer = name => ({ GetDeviceBuffer: () => name });

/** Carbon's SubmitGeometry sequence against a complete state. */
function bindGeometry(al, program)
{
  al.SetTopology(Topology.TOP_TRIANGLES);
  al.SetVertexLayout(al.CreateVertexLayout([
    { usage: 0, usageIndex: 0, type: "Float32", elementCount: 3, offset: 0, stream: 0 }
  ]));
  al.SetStreamSource(0, deviceBuffer("vb"), 0, 12);
  al.SetIndices(deviceBuffer("ib"), 2);
  al.SetShaderProgram(program);
  al.SetRenderStates(Tr2RenderStateSetup.fromKeyValues([]));
}

test("a draw resolves a pipeline from bound state once, and the next draw reuses it", () =>
{
  const { al, log, pipelines } = composed();
  const program = programFor(al);

  bindGeometry(al, program);

  assert.equal(al.DrawIndexedInstanced(36, 1, 0, 0, 0), true);
  assert.equal(al.DrawIndexedInstanced(36, 1, 0, 0, 0), true);
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

test("a state change dirties the pipeline and the next draw resolves a second one", () =>
{
  const { al, pipelines } = composed();

  bindGeometry(al, programFor(al));
  al.DrawIndexedInstanced(36, 1);

  assert.equal(al.SetTopology(Topology.TOP_LINES), true);
  assert.equal(al.IsPipelineDirty(), true);
  assert.equal(al.DrawIndexedInstanced(36, 1), true);
  assert.equal(pipelines.length, 2);
  assert.equal(pipelines[1].descriptor.primitive.topology, "line-list");

  // Back to the first state: the cache answers, nothing is created.
  al.SetTopology(Topology.TOP_TRIANGLES);
  al.DrawIndexedInstanced(36, 1);
  assert.equal(pipelines.length, 2);
  assert.equal(al.DrainTransitions().filter(event => event.type === "pipeline").map(event => event.created).join(","), "true,true,false");
});

test("a non-indexed draw binds no index buffer and draws vertices", () =>
{
  const { al, log } = composed();

  bindGeometry(al, programFor(al));
  assert.equal(al.DrawPrimitive(0, 2), true);
  assert.deepEqual(log, [ "setPipeline:1", "setVertexBuffer:0:vb:0", "draw:6,1,0,0" ]);
});

test("a program without a pixel stage resolves a depth-only pipeline", () =>
{
  const { al, pipelines } = composed();

  bindGeometry(al, programFor(al, { fragment: false }));
  assert.equal(al.DrawIndexedInstanced(36, 1), true);
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
  const description = new Tr2ResourceSetDescriptionAL();

  description.SetSampler(ShaderType.PIXEL_SHADER, 3, sampler);
  description.SetSrv(ShaderType.PIXEL_SHADER, 3, { GetDeviceTextureView: dimension => ({ kind: "view", dimension, id: "diffuse" }) });

  const set = al.CreateResourceSet(description, program);

  bindGeometry(al, program);
  constants.Lock(al).data.set([ 1, 2, 3 ]);
  constants.Unlock(al);
  al.SetConstants(constants, ShaderType.VERTEX_SHADER, 0);
  al.SetResourceSet(set);

  assert.equal(al.DrawIndexedInstanced(36, 1), true);
  assert.equal(al.DrawIndexedInstanced(36, 1), true);
  assert.equal(pipelines.length, 1);
  assert.equal(bindGroups.length, 1, "one bind group for two draws of the same state");
  assert.equal(created.buffers.length, 1, "the arena's one page; no null buffer was needed");
  assert.equal(created.buffers[0].label, "Constant buffer page 0");

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

  // A new scene resets the arena.
  await al.EndScene();
  al.BeginScene();
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
  assert.equal(al.DrawIndexedInstanced(36, 1), true);

  const entries = bindGroups[0].descriptor.entries;

  assert.equal(created.buffers.length, 1, "a null uniform buffer, and no arena page was needed");
  assert.equal(created.buffers[0].size, 64, "sized to the layout's minBindingSize");
  assert.equal(entries[0].resource.buffer.kind, "buffer");
  assert.deepEqual([ entries[0].resource.offset, entries[0].resource.size ], [ 0, 64 ]);
  assert.equal(created.textures.length, 1, "a 1x1 dummy texture");
  assert.equal(entries[1].resource.dimension, "2d");
  assert.equal(created.samplers.length, 1, "a default sampler");

  // A set made against ANOTHER program does not answer for this one.
  const foreign = programFor(al, { block: GROUPED_BLOCK() });
  const set = al.CreateResourceSet(new Tr2ResourceSetDescriptionAL(), foreign);

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
  al.SetIndices(deviceBuffer("ib"), 2);
  al.SetShaderProgram(program);
  al.SetRenderStates(Tr2RenderStateSetup.fromKeyValues([]));

  assert.equal(al.DrawIndexedInstanced(36, 1), false);
  assert.match(al.m_pipelineFailure, /stride for vertex stream 0/);

  // A stream that is a geometry descriptor rather than a device buffer, which
  // is what a mesh batch carries today.
  al.SetStreamSource(0, { geometry: "descriptor" }, 0, 12);
  assert.equal(al.DrawIndexedInstanced(36, 1), false);
  assert.match(al.m_pipelineFailure, /device buffer on vertex stream 0/);

  // An index stride WebGPU has no format for.
  al.SetStreamSource(0, deviceBuffer("vb"), 0, 12);
  al.SetIndices(deviceBuffer("ib"), 3);
  assert.equal(al.DrawIndexedInstanced(36, 1), false);
  assert.match(al.m_pipelineFailure, /index format for a 3-byte stride/);

  // A declaration whose element type this backend cannot name.
  al.SetIndices(deviceBuffer("ib"), 2);
  al.SetVertexLayout(al.CreateVertexLayout([ { usage: 0, usageIndex: 0, type: "FLOAT32_3", offset: 0 } ]));
  assert.equal(al.DrawIndexedInstanced(36, 1), false);
  assert.match(al.m_pipelineFailure, /vertex format for stream 0/);

  assert.equal(log.length, 0, "no refusal reached the encoder");
});

test("a program the backend did not link cannot resolve", () =>
{
  const { al } = composed();

  bindGeometry(al, { IsValid: () => true, id: "foreign" });
  assert.equal(al.DrawIndexedInstanced(36, 1), false);
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
