import assert from "node:assert/strict";
import { test } from "node:test";

import { CjsWebgpuDevice } from "../../../npm/dist/trinityal/webgpu/index.js";
import { CjsWebgpuConstantBufferAL, CjsWebgpuRenderContextAL } from "../../../npm/dist/trinityal/webgpu/internal.js";
import { ALResult, Tr2ConstantUsageAL } from "../../../npm/dist/trinityal/index.js";

// Carbon's constant buffer: Lock hands back a CPU shadow and invalidates an
// upload token (Tr2ConstantBufferALMetal.mm:60-69); Unlock is a no-op; the
// bytes go to the device when the buffer is BOUND. These pin that shape.

const SHADER_STAGE = Object.freeze({ VERTEX: 1, FRAGMENT: 2, COMPUTE: 4 });
const BUFFER_USAGE = Object.freeze({ UNIFORM: 16, COPY_DST: 32, VERTEX: 64, INDEX: 128, STORAGE: 256 });

function fakeDevice()
{
  const calls = [];
  const device = {
    calls,
    queue: {
      writeBuffer(buffer, offset, data)
      {
        calls.push([ "writeBuffer", buffer.descriptor.label, offset, new Uint8Array(data.buffer, data.byteOffset, data.byteLength).slice() ]);
      }
    },
    createBuffer(descriptor)
    {
      const value = { kind: "buffer", descriptor, destroy() { calls.push([ "destroy", descriptor.label ]); } };

      calls.push([ "createBuffer", descriptor ]);

      return value;
    },
    createShaderModule: descriptor => ({ kind: "module", descriptor }),
    pushErrorScope() {},
    popErrorScope() { return Promise.resolve(null); }
  };

  return { device, calls };
}

function context()
{
  const fake = fakeDevice();
  const webgpu = new CjsWebgpuDevice({ device: fake.device, shaderStage: SHADER_STAGE, bufferUsage: BUFFER_USAGE });

  return { ...fake, webgpu, renderContext: { IsValid: () => true, GetWebgpu: () => webgpu } };
}

test("Create makes a UNIFORM buffer, rounded to sixteen bytes, and writes nothing without data", () =>
{
  const { calls, renderContext } = context();
  const buffer = new CjsWebgpuConstantBufferAL();

  assert.equal(buffer.Create(20, Tr2ConstantUsageAL.REUSABLE, null, renderContext), ALResult.S_OK);
  assert.equal(buffer.IsValid(), true);
  assert.equal(buffer.GetSize(), 20, "Carbon reports the requested size");
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1].size, 32);
  assert.equal(calls[0][1].usage & BUFFER_USAGE.UNIFORM, BUFFER_USAGE.UNIFORM);
  assert.equal(calls[0][1].usage & BUFFER_USAGE.COPY_DST, BUFFER_USAGE.COPY_DST);
});

test("Lock marks the shadow for upload; Unlock uploads nothing; the bind uploads once", () =>
{
  const { calls, renderContext } = context();
  const buffer = new CjsWebgpuConstantBufferAL();

  buffer.Create(16, Tr2ConstantUsageAL.REUSABLE, null, renderContext);

  const first = buffer.Lock(renderContext);

  assert.equal(first.result, ALResult.S_OK);
  first.data.set([ 1, 2, 3, 4 ]);
  assert.equal(buffer.Unlock(renderContext), ALResult.S_OK);

  const second = buffer.Lock(renderContext);

  second.data.set([ 9 ], 4);
  buffer.Unlock(renderContext);

  assert.equal(calls.filter(call => call[0] === "writeBuffer").length, 0, "nothing uploaded yet");

  // Locked twice, bound once: one upload, carrying both writes.
  assert.equal(buffer.Upload(), true);
  assert.equal(buffer.Upload(), false, "clean after the upload");

  const writes = calls.filter(call => call[0] === "writeBuffer");

  assert.equal(writes.length, 1);
  assert.deepEqual(Array.from(writes[0][3].subarray(0, 6)), [ 1, 2, 3, 4, 9, 0 ]);
  assert.equal(buffer.GetDeviceBuffer().kind, "buffer");
});

test("initial data is uploaded at Create, and IMMUTABLE without data is refused", () =>
{
  const { calls, renderContext } = context();
  const buffer = new CjsWebgpuConstantBufferAL();

  assert.equal(buffer.Create(16, Tr2ConstantUsageAL.IMMUTABLE, null, renderContext), ALResult.E_INVALIDARG);
  assert.equal(buffer.Create(16, Tr2ConstantUsageAL.IMMUTABLE, new Uint8Array([ 7, 7, 7, 7 ]), renderContext), ALResult.S_OK);

  const writes = calls.filter(call => call[0] === "writeBuffer");

  assert.equal(writes.length, 1);
  assert.deepEqual(Array.from(writes[0][3].subarray(0, 4)), [ 7, 7, 7, 7 ]);
  assert.equal(buffer.Upload(), false, "already clean");
});

test("Carbon's create-time refusals, and Destroy releases the device buffer", () =>
{
  const { calls, renderContext } = context();
  const buffer = new CjsWebgpuConstantBufferAL();

  assert.equal(buffer.Create(0, Tr2ConstantUsageAL.REUSABLE, null, renderContext), ALResult.E_INVALIDARG);
  assert.equal(buffer.Create(16, Tr2ConstantUsageAL.REUSABLE, null, { IsValid: () => false }), ALResult.E_INVALIDARG);
  assert.equal(buffer.Lock(renderContext).result, ALResult.E_FAIL, "an invalid buffer cannot be locked");

  buffer.Create(16, Tr2ConstantUsageAL.REUSABLE, null, renderContext);
  buffer.Destroy();

  assert.equal(buffer.IsValid(), false);
  assert.equal(buffer.GetSize(), 0);
  assert.equal(calls.some(call => call[0] === "destroy"), true);
});

test("SetConstants on the buffer uploads and binds on the context, as Metal's does", () =>
{
  const { calls, renderContext } = context();
  const bound = [];
  const binding = { ...renderContext, SetConstants: (buffer, stage, register) => (bound.push([ buffer, stage, register ]), true) };
  const buffer = new CjsWebgpuConstantBufferAL();

  assert.equal(buffer.SetConstants(1, 0, binding), ALResult.E_INVALIDCALL, "an invalid buffer binds nothing");

  buffer.Create(16, Tr2ConstantUsageAL.REUSABLE, null, renderContext);
  buffer.Lock(renderContext).data.set([ 5 ]);
  buffer.Unlock(renderContext);

  assert.equal(buffer.SetConstants(1, 0, binding), ALResult.S_OK);
  assert.equal(calls.filter(call => call[0] === "writeBuffer").length, 1, "the token is consumed at the bind");
  assert.deepEqual(bound, [ [ buffer, 1, 0 ] ]);
  assert.deepEqual(buffer.Describe({}), { memoryClass: buffer.GetMemoryClass(), size: 16 });
});

test("the render context creates the backend's constant buffer, empty or sized", () =>
{
  const { webgpu } = context();
  const al = new CjsWebgpuRenderContextAL({
    webgpu,
    dispatcher: { PrepareAccumulator: () => null, EncodeAccumulator() {} },
    renderTarget: { GetWidth: () => 1, GetHeight: () => 1, GetFormat: () => "bgra8unorm", GetDepthFormat: () => null, GetSampleCount: () => 1 }
  });

  al.CreateDevice();

  // Carbon default-constructs the member and sizes it later; the empty form is
  // that object, of this backend's kind.
  const empty = al.CreateConstantBuffer();

  assert.ok(empty instanceof CjsWebgpuConstantBufferAL);
  assert.equal(empty.IsValid(), false);
  assert.equal(empty.Create(32, Tr2ConstantUsageAL.REUSABLE, null, al), ALResult.S_OK);

  const sized = al.CreateConstantBuffer(48);

  assert.equal(sized.IsValid(), true);
  assert.equal(sized.GetSize(), 48);
  assert.equal(al.CreateConstantBuffer(16, Tr2ConstantUsageAL.IMMUTABLE, null), null, "a refused sized create is null");
});
