import assert from "node:assert/strict";
import test from "node:test";

import { CjsWebgpuRenderContextAL } from "../../../npm/dist/trinityal/webgpu/internal.js";
import { CjsWebgpuDevice } from "../../../npm/dist/trinityal/webgpu/index.js";
import { Tr2RenderStateSetup } from "../../../npm/dist/resource/shader/index.js";
import { ShaderType, Topology } from "../../../npm/dist/global/consts/renderContext/index.js";
import { writeBackendBlock } from "../../../npm/dist/resource/format/index.js";

// A draw verb resolves its pipeline from BOUND STATE, inside the verb, the way
// Metal's EmitRenderPipelineState (MetalWorkQueue.mm:1595-1747) and DX12's
// SetAllState (Tr2RenderContextDx12.cpp:810-878) do. Nothing here hands the
// backend a batch, a material or a package: it binds verbs and draws.

const SHADER_STAGE = Object.freeze({ VERTEX: 1, FRAGMENT: 2, COMPUTE: 4 });
const VERTEX_WGSL = "@vertex fn main() -> @builtin(position) vec4f { return vec4f(0); }";
const FRAGMENT_WGSL = "@fragment fn main() -> @location(0) vec4f { return vec4f(1); }";

/** The device half, faked at exactly the seams a draw touches. */
function composed()
{
  const log = [];
  const pipelines = [];
  const pass = {
    setPipeline: pipeline => log.push(`setPipeline:${pipeline.id}`),
    setVertexBuffer: (slot, buffer, offset) => log.push(`setVertexBuffer:${slot}:${buffer}:${offset}`),
    setIndexBuffer: (buffer, format, offset) => log.push(`setIndexBuffer:${buffer}:${format}:${offset}`),
    drawIndexed: (...args) => log.push(`drawIndexed:${args.join(",")}`),
    draw: (...args) => log.push(`draw:${args.join(",")}`),
    end: () => log.push("pass.end")
  };
  const device = {
    createShaderModule: descriptor => ({ kind: "module", label: descriptor.label }),
    createBindGroupLayout: descriptor => ({ kind: "bind-group-layout", descriptor }),
    createPipelineLayout: descriptor => ({ kind: "pipeline-layout", descriptor }),
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
  const webgpu = new CjsWebgpuDevice({ device, shaderStage: SHADER_STAGE });
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

  return { al, log, pipelines };
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

test("a program that declares bind groups refuses to draw and says why", () =>
{
  const { al, log, pipelines } = composed();
  const block = writeBackendBlock({
    bindGroups: [ { group: 0, bindings: [ {
      group: 0, binding: 0, resourceKind: "uniform-buffer", registerSpace: 0, registerIndex: 0,
      visibility: [ "vertex", "fragment" ], type: "array<vec4<f32>, 4>", generatedSymbol: "cb0"
    } ] } ],
    transforms: []
  });

  bindGeometry(al, programFor(al, { block }));

  // The pipeline resolves - the layout is the program's own - but nothing can
  // fill its group yet, and a draw with an unfilled group is a GPU validation
  // error. Refusing here, with the reason, is the honest answer until the
  // resource-set half lands.
  assert.equal(al.DrawIndexedInstanced(36, 1), false);
  assert.equal(pipelines.length, 1, "the pipeline itself resolved");
  assert.match(al.m_pipelineFailure, /bind groups for the program's 1 group/);
  assert.equal(log.some(entry => entry.startsWith("draw")), false, "nothing was drawn");
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
