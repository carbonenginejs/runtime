import assert from "node:assert/strict";
import test from "node:test";

import { CjsWebgpuRenderContextAL } from "../../../npm/dist/trinityal/webgpu/internal.js";
import { CjsWebgpuDevice } from "../../../npm/dist/trinityal/webgpu/index.js";
import { Tr2RenderStateSetup } from "../../../npm/dist/resource/shader/index.js";
import { ShaderType, Topology } from "../../../npm/dist/global/consts/renderContext/index.js";

// The user-pointer draws, which Carbon emulates in `Tr2DrawUPHelper` rather
// than in any backend. These tests watch the SCRATCH BUFFERS, because the whole
// emulation is "get the caller's bytes onto the device and then draw normally":
// if the right bytes reach a buffer of the right usage and the draw follows,
// there is nothing else the helper does.

const SHADER_STAGE = Object.freeze({ VERTEX: 1, FRAGMENT: 2, COMPUTE: 4 });
const BUFFER_USAGE = Object.freeze({ UNIFORM: 16, COPY_DST: 32, VERTEX: 64, INDEX: 128, STORAGE: 256 });
const TEXTURE_USAGE = Object.freeze({ TEXTURE_BINDING: 4, COPY_DST: 2 });
const VERTEX_WGSL = "@vertex fn main() -> @builtin(position) vec4f { return vec4f(0); }";
const FRAGMENT_WGSL = "@fragment fn main() -> @location(0) vec4f { return vec4f(1); }";

/** The device half, faked at the seams a staged draw touches. */
function composed()
{
  const log = [];
  const pipelines = [];
  const pass = {
    setPipeline: pipeline => log.push(`setPipeline:${pipeline.id}`),
    setBindGroup: () => {},
    setVertexBuffer: (slot, buffer, offset) => log.push(`setVertexBuffer:${slot}:${buffer.descriptor.label}:${offset}`),
    setIndexBuffer: (buffer, format, offset) => log.push(`setIndexBuffer:${buffer.descriptor.label}:${format}:${offset}`),
    drawIndexed: (...args) => log.push(`drawIndexed:${args.join(",")}`),
    draw: (...args) => log.push(`draw:${args.join(",")}`),
    end: () => {}
  };
  const buffers = [];
  const writes = [];
  const device = {
    createShaderModule: descriptor => ({ kind: "module", label: descriptor.label }),
    createBindGroupLayout: descriptor => ({ kind: "bind-group-layout", descriptor }),
    createPipelineLayout: descriptor => ({ kind: "pipeline-layout", descriptor }),
    createBindGroup: descriptor => ({ id: 1, descriptor }),
    createBuffer(descriptor)
    {
      const buffer = { kind: "buffer", descriptor, size: descriptor.size, destroy() {} };

      buffers.push(buffer);

      return buffer;
    },
    createTexture: descriptor => ({ kind: "texture", descriptor, createView: () => ({ kind: "view" }) }),
    createSampler: descriptor => ({ kind: "sampler", descriptor }),
    queue: {
      writeBuffer(buffer, offset, data)
      {
        writes.push({ label: buffer.descriptor.label, offset, bytes: new Uint8Array(data.slice()) });
      },
      submit() {}
    },
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

  // The declaration and the program, with no stream and no indices: the helper
  // is what must supply those.
  const program = al.CreateShaderProgram([
    al.CreateShader(ShaderType.VERTEX_SHADER, VERTEX_WGSL, {
      pipelineInputs: [ { usage: 0, usageIndex: 0, registerIndex: 0 } ],
      backendBlock: null
    }, "v.wgsl"),
    al.CreateShader(ShaderType.PIXEL_SHADER, FRAGMENT_WGSL, {
      pipelineInputs: [ { usage: 0, usageIndex: 0, registerIndex: 0 } ],
      backendBlock: null
    }, "f.wgsl")
  ]);

  al.SetTopology(Topology.TOP_TRIANGLES);
  al.SetVertexLayout(al.CreateVertexLayout([
    { usage: 0, usageIndex: 0, type: "Float32", elementCount: 3, offset: 0, stream: 0 }
  ]));
  al.SetShaderProgram(program);
  al.SetRenderStates(Tr2RenderStateSetup.fromKeyValues([]));

  return { al, log, buffers, writes };
}

/** Two triangles' worth of positions, each vertex distinct so a copy is checkable. */
const vertices = count => Float32Array.from({ length: count * 3 }, (_, i) => i + 1);

test("a non-indexed user-pointer draw stages the vertices and draws them", () =>
{
  const { al, log, buffers, writes } = composed();
  const data = vertices(6);

  assert.equal(al.DrawPrimitiveUP(2, data, 12), true);

  // One scratch vertex buffer, described in words as Carbon describes it, and
  // carrying the VERTEX usage a stream source needs.
  assert.equal(buffers.length, 1);
  assert.equal(buffers[0].descriptor.size, 72, "6 vertices x 12 bytes");
  assert.equal((buffers[0].descriptor.usage & BUFFER_USAGE.VERTEX) !== 0, true);

  // The caller's bytes, unchanged, and then an ordinary draw through them.
  assert.deepEqual(new Float32Array(writes.at(-1).bytes.buffer), data);
  assert.deepEqual(log, [ "setPipeline:1", `setVertexBuffer:0:${buffers[0].descriptor.label}:0`, "draw:6,1,0,0" ]);
});

test("an indexed user-pointer draw stages both halves and picks the ring by index width", () =>
{
  const { al, log, buffers, writes } = composed();
  const data = vertices(4);
  const indices = Uint16Array.of(0, 1, 2, 0, 2, 3);

  assert.equal(al.DrawIndexedPrimitiveUP(4, 2, indices, data, 12), true);

  assert.equal(buffers.length, 2, "one vertex buffer, one index buffer");
  assert.equal((buffers[1].descriptor.usage & BUFFER_USAGE.INDEX) !== 0, true);
  assert.deepEqual(new Uint16Array(writes.at(-1).bytes.buffer), indices);

  // `uint16` is read off the stride the helper bound, which it took from the
  // array's element width rather than from an overload it was called through.
  assert.deepEqual(log, [
    "setPipeline:1",
    `setVertexBuffer:0:${buffers[0].descriptor.label}:0`,
    `setIndexBuffer:${buffers[1].descriptor.label}:uint16:0`,
    "drawIndexed:6,1,0,0,0"
  ]);
});

test("a 32-bit index array binds uint32 and its own ring", () =>
{
  const { al, log } = composed();

  assert.equal(al.DrawIndexedPrimitiveUP(4, 2, Uint32Array.of(0, 1, 2, 0, 2, 3), vertices(4), 12), true);
  assert.equal(log.some(entry => entry.includes(":uint32:")), true);
});

test("four draws use four slots and the fifth comes back around", () =>
{
  const { al, buffers } = composed();

  for (let i = 0; i < 4; ++i) assert.equal(al.DrawPrimitiveUP(2, vertices(6), 12), true);

  assert.equal(buffers.length, 4, "the ring is four deep, so four draws never share a buffer");

  // The fifth draw is the same size as the first, so the slot it comes back to
  // is large enough and nothing is created.
  assert.equal(al.DrawPrimitiveUP(2, vertices(6), 12), true);
  assert.equal(buffers.length, 4);
});

test("a slot grows for a bigger batch and never shrinks again", () =>
{
  const { al, buffers } = composed();

  assert.equal(al.DrawPrimitiveUP(2, vertices(6), 12), true);
  for (let i = 0; i < 3; ++i) al.DrawPrimitiveUP(2, vertices(6), 12);
  assert.equal(buffers.length, 4);

  // Back to slot zero with ten times the geometry: that slot is recreated.
  assert.equal(al.DrawPrimitiveUP(20, vertices(60), 12), true);
  assert.equal(buffers.length, 5);
  assert.equal(buffers[4].descriptor.size, 720);

  // Around again at the small size: the grown slot still fits, so no sixth.
  for (let i = 0; i < 3; ++i) al.DrawPrimitiveUP(2, vertices(6), 12);
  assert.equal(al.DrawPrimitiveUP(2, vertices(6), 12), true);
  assert.equal(buffers.length, 5);
});

test("nothing to draw is not a failure, and nothing is staged", () =>
{
  const { al, log, buffers } = composed();

  // Carbon returns S_OK for a zero primitive count before it touches a buffer.
  assert.equal(al.DrawPrimitiveUP(0, vertices(6), 12), true);
  assert.equal(al.DrawIndexedPrimitiveUP(4, 0, Uint16Array.of(0, 1, 2), vertices(4), 12), true);
  assert.equal(buffers.length, 0);
  assert.deepEqual(log, []);
});

test("a short array refuses rather than reading past its end", () =>
{
  const { al, log } = composed();

  // Two triangles need six vertices; three are given.
  assert.equal(al.DrawPrimitiveUP(2, vertices(3), 12), false);
  assert.equal(al.DrawIndexedPrimitiveUP(4, 2, Uint16Array.of(0, 1, 2), vertices(4), 12), false);
  assert.deepEqual(log, [], "a refusal encodes nothing");
});

test("an unsupported index width refuses", () =>
{
  const { al } = composed();

  assert.equal(al.DrawIndexedPrimitiveUP(4, 2, Uint8Array.of(0, 1, 2, 0, 2, 3), vertices(4), 12), false);
});

test("destroying the context drops the scratch buffers", () =>
{
  const { al, buffers } = composed();

  al.DrawPrimitiveUP(2, vertices(6), 12);
  assert.equal(buffers.length, 1);

  al.Destroy();

  // The ring is rewound, so the next context's first draw stages afresh rather
  // than binding a buffer whose device is gone.
  assert.equal(al.DrawPrimitiveUP(2, vertices(6), 12), false);
});
