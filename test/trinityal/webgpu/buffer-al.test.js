import assert from "node:assert/strict";
import { test } from "node:test";

import { CjsWebgpuDevice } from "../../../npm/dist/trinityal/webgpu/index.js";
import { CjsWebgpuBufferAL } from "../../../npm/dist/trinityal/webgpu/internal.js";
import { ALResult, Tr2BufferDescriptionAL } from "../../../npm/dist/trinity/core/index.js";
import { Tr2CpuUsage, Tr2GpuUsage } from "../../../npm/dist/global/consts/renderContext/index.js";

const SHADER_STAGE = Object.freeze({ VERTEX: 1, FRAGMENT: 2, COMPUTE: 4 });
const BUFFER_USAGE = Object.freeze({ UNIFORM: 16, COPY_DST: 32, VERTEX: 64, INDEX: 128, STORAGE: 256, INDIRECT: 512 });

/** A GPUDevice stand-in that records every queue write. */
function fakeDevice()
{
  const calls = [];
  const device = {
    calls,
    queue: {
      writeBuffer(buffer, offset, data)
      {
        calls.push([ "writeBuffer", buffer, offset, new Uint8Array(data.buffer, data.byteOffset, data.byteLength).slice() ]);
      }
    },
    createBuffer(descriptor)
    {
      const value = { kind: "buffer", descriptor, destroy() { calls.push([ "destroyBuffer", value ]); } };
      calls.push([ "createBuffer", descriptor, value ]);
      return value;
    },
    createShaderModule(descriptor) { return { kind: "shader-module", descriptor }; },
    pushErrorScope() {},
    popErrorScope() { return Promise.resolve(null); }
  };
  return { device, calls };
}

/** A render context AL stand-in: Create only asks it for validity and the device. */
function contextFor(webgpu, valid = true)
{
  return { IsValid: () => valid, GetWebgpu: () => webgpu };
}

function deviceAndContext()
{
  const fake = fakeDevice();
  const webgpu = new CjsWebgpuDevice({ device: fake.device, shaderStage: SHADER_STAGE, bufferUsage: BUFFER_USAGE });
  return { fake, webgpu, context: contextFor(webgpu) };
}

/** The Tr2Blitter screen-quad description: four 24-byte vertices, rewritten every draw. */
const quadDescription = () =>
  Tr2BufferDescriptionAL.FromStride(24, 4, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.WRITE_OFTEN);

const writes = (calls) => calls.filter(call => call[0] === "writeBuffer");

test("a WRITE_OFTEN vertex buffer is created with VERTEX | COPY_DST and no initial write", () =>
{
  const { fake, context } = deviceAndContext();
  const buffer = new CjsWebgpuBufferAL();

  assert.equal(buffer.Create(quadDescription(), null, context), ALResult.S_OK);
  assert.equal(buffer.IsValid(), true);
  assert.equal(buffer.GetSizeInBytes(), 96);

  const [ , descriptor ] = fake.calls.find(call => call[0] === "createBuffer");
  assert.equal(descriptor.size, 96);
  assert.equal(descriptor.usage, BUFFER_USAGE.VERTEX | BUFFER_USAGE.COPY_DST);

  // Nothing is uploaded until something writes. A buffer that wrote its own
  // zeroes at create would cost a queue write per buffer for no reason.
  assert.equal(writes(fake.calls).length, 0);
});

test("the upload happens on unmap, not on map", () =>
{
  const { fake, context } = deviceAndContext();
  const buffer = new CjsWebgpuBufferAL();
  buffer.Create(quadDescription(), null, context);

  const { result, data } = buffer.MapForWriting(context);
  assert.equal(result, ALResult.S_OK);
  assert.equal(data.length, 96);

  data[0] = 7;
  data[95] = 9;

  // THE POINT OF THE CLASS. A map that uploaded eagerly would put half-written
  // vertices on the queue; the guarantee callers rely on is that the write is
  // visible no later than the unmap.
  assert.equal(writes(fake.calls).length, 0);

  buffer.UnmapForWriting();

  const uploaded = writes(fake.calls);
  assert.equal(uploaded.length, 1);
  assert.equal(uploaded[0][2], 0);
  assert.equal(uploaded[0][3].length, 96);
  assert.equal(uploaded[0][3][0], 7);
  assert.equal(uploaded[0][3][95], 9);
});

test("the shadow is retained across maps, so a partial rewrite keeps the rest", () =>
{
  const { fake, context } = deviceAndContext();
  const buffer = new CjsWebgpuBufferAL();
  buffer.Create(quadDescription(), null, context);

  const first = buffer.MapForWriting(context);
  first.data[0] = 1;
  first.data[50] = 2;
  buffer.UnmapForWriting();

  // Carbon's UpdateBuffer maps, memcpys at an offset and unmaps, expecting the
  // bytes outside that range to survive. A freshly zeroed scratch per map would
  // blank byte 50 here and nothing would report it.
  const second = buffer.MapForWriting(context);
  assert.equal(second.data[50], 2);
  second.data[0] = 3;
  buffer.UnmapForWriting();

  const uploaded = writes(fake.calls);
  assert.equal(uploaded.length, 2);
  assert.equal(uploaded[1][3][0], 3);
  assert.equal(uploaded[1][3][50], 2);
});

test("a nested map is refused rather than silently uploading twice", () =>
{
  const { context } = deviceAndContext();
  const buffer = new CjsWebgpuBufferAL();
  buffer.Create(quadDescription(), null, context);

  assert.equal(buffer.MapForWriting(context).result, ALResult.S_OK);
  assert.equal(buffer.MapForWriting(context).result, ALResult.E_INVALIDCALL);

  // A second map AFTER the unmap is legal in every Carbon backend.
  buffer.UnmapForWriting();
  assert.equal(buffer.MapForWriting(context).result, ALResult.S_OK);
});

test("initial data is uploaded once at create", () =>
{
  const { fake, context } = deviceAndContext();
  const buffer = new CjsWebgpuBufferAL();
  const bytes = new Uint8Array(96).fill(5);

  assert.equal(buffer.Create(quadDescription(), bytes, context), ALResult.S_OK);

  const uploaded = writes(fake.calls);
  assert.equal(uploaded.length, 1);
  assert.equal(uploaded[0][3][95], 5);
});

test("Carbon's create-time refusals are kept", () =>
{
  const { webgpu, context } = deviceAndContext();
  const buffer = new CjsWebgpuBufferAL();

  // count == 0, in every backend.
  assert.equal(
    buffer.Create(Tr2BufferDescriptionAL.FromStride(24, 0, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.WRITE_OFTEN), null, context),
    ALResult.E_INVALIDARG);

  // Immutable with no contents: nothing could ever put bytes in it.
  assert.equal(
    buffer.Create(Tr2BufferDescriptionAL.FromStride(24, 4, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.NONE), null, context),
    ALResult.E_INVALIDARG);

  // READ with WRITE_OFTEN, which DX12 refuses outright and we have no read path for.
  assert.equal(
    buffer.Create(
      Tr2BufferDescriptionAL.FromStride(24, 4, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.WRITE_OFTEN | Tr2CpuUsage.READ),
      null, context),
    ALResult.E_INVALIDARG);

  // An invalid context.
  assert.equal(buffer.Create(quadDescription(), null, contextFor(webgpu, false)), ALResult.E_INVALIDCALL);

  assert.equal(buffer.IsValid(), false);
});

test("UpdateBuffer refuses a WRITE_OFTEN buffer and writes a plain WRITE one", () =>
{
  const { fake, context } = deviceAndContext();
  const often = new CjsWebgpuBufferAL();
  often.Create(quadDescription(), null, context);

  // The stub refuses this and DX12 refuses it for a dynamic buffer, both
  // because such a buffer's storage moves under a partial write. Ours does not
  // move, but a caller reaching here has confused the two update paths.
  assert.equal(often.UpdateBuffer(0, 4, new Uint8Array(4).fill(1), context), ALResult.E_INVALIDCALL);

  const plain = new CjsWebgpuBufferAL();
  plain.Create(Tr2BufferDescriptionAL.FromStride(16, 2, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.WRITE), null, context);

  const before = writes(fake.calls).length;
  assert.equal(plain.UpdateBuffer(8, 4, new Uint8Array([ 1, 2, 3, 4 ]), context), ALResult.S_OK);

  const uploaded = writes(fake.calls);
  assert.equal(uploaded.length, before + 1);
  assert.deepEqual(Array.from(uploaded.at(-1)[3].slice(8, 12)), [ 1, 2, 3, 4 ]);

  // Out of range.
  assert.equal(plain.UpdateBuffer(30, 8, new Uint8Array(8), context), ALResult.E_INVALIDARG);
});

test("Destroy releases the GPU buffer and leaves the AL buffer reusable", () =>
{
  const { fake, context } = deviceAndContext();
  const buffer = new CjsWebgpuBufferAL();
  buffer.Create(quadDescription(), null, context);

  buffer.Destroy();

  assert.equal(buffer.IsValid(), false);
  assert.equal(buffer.GetSizeInBytes(), 0);
  assert.equal(fake.calls.some(call => call[0] === "destroyBuffer"), true);

  assert.equal(buffer.Create(quadDescription(), null, context), ALResult.S_OK);
});

test("reading back is refused by name rather than returning empty bytes", () =>
{
  const { context } = deviceAndContext();
  const buffer = new CjsWebgpuBufferAL();
  buffer.Create(quadDescription(), null, context);

  assert.equal(buffer.MapForReading().result, ALResult.E_INVALIDCALL);
  assert.equal(buffer.MapForReading().data, null);
});
