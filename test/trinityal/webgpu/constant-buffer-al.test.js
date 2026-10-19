import assert from "node:assert/strict";
import { test } from "node:test";

import { CjsWebgpuDevice } from "../../../npm/dist/trinityal/webgpu/index.js";
import { CjsWebgpuConstantBufferAL, CjsWebgpuRenderContextAL } from "../../../npm/dist/trinityal/webgpu/internal.js";
import { CjsWebgpuConstantArena, CONST_PAGE_SIZE } from "../../../npm/dist/trinityal/webgpu/core/CjsWebgpuConstantArena.js";
import { ALResult, Tr2ConstantBufferAL, Tr2ConstantUsageAL } from "../../../npm/dist/trinityal/index.js";

// Carbon's constant buffer is a CPU shadow and a token; Lock invalidates the
// token (Tr2ConstantBufferALMetal.mm:60-69), Unlock is a no-op, and the bind
// copies the shadow into the frame's constant ARENA and binds (page, offset)
// (MetalWorkQueue.mm:2396-2439). These pin that shape - in particular that a
// buffer locked N times in a frame lands in N regions, so N draws read N
// snapshots rather than the last one.

const SHADER_STAGE = Object.freeze({ VERTEX: 1, FRAGMENT: 2, COMPUTE: 4 });
const BUFFER_USAGE = Object.freeze({ UNIFORM: 16, COPY_DST: 32, VERTEX: 64, INDEX: 128, STORAGE: 256 });

function fakeDevice()
{
  const calls = [];
  const device = {
    calls,
    limits: { minUniformBufferOffsetAlignment: 256 },
    queue: {
      writeBuffer(buffer, offset, data, dataOffset = 0, size = data.byteLength)
      {
        calls.push([ "writeBuffer", buffer.descriptor.label, offset, new Uint8Array(data.buffer, data.byteOffset + dataOffset, size).slice() ]);
      }
    },
    createBuffer(descriptor)
    {
      const value = { kind: "buffer", descriptor, destroy() { calls.push([ "destroy", descriptor.label ]); } };

      calls.push([ "createBuffer", descriptor ]);

      return value;
    },
    lost: new Promise(() => {}),
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

/** A real render context AL over the fake device: it owns the arena. */
function composedContext()
{
  const { calls, webgpu } = context();
  const al = new CjsWebgpuRenderContextAL({
    webgpu,
    renderTarget: { GetWidth: () => 1, GetHeight: () => 1, GetFormat: () => "bgra8unorm", GetDepthFormat: () => null, GetSampleCount: () => 1 }
  });

  al.CreateDevice();

  return { calls, webgpu, al };
}

test("Create makes a shadow and no device buffer; the arena is where bytes go", () =>
{
  const { calls, renderContext } = context();
  const buffer = new CjsWebgpuConstantBufferAL();

  assert.equal(buffer.Create(20, Tr2ConstantUsageAL.REUSABLE, null, renderContext), ALResult.S_OK);
  assert.equal(buffer.IsValid(), true);
  assert.equal(buffer.GetSize(), 20, "Carbon reports the requested size");
  assert.equal(buffer._shadowCopy.length, 32, "the shadow is rounded to sixteen bytes");
  assert.equal(calls.length, 0, "Metal's constant buffer owns no MTLBuffer either");
  assert.ok(buffer._id > 0);
});

test("Lock invalidates the token; each bind after a Lock lands in a fresh region", () =>
{
  // Through the CONTEXT, which is where Carbon puts UploadConstants
  // (Tr2RenderContextMetal.mm:679-697). The buffer keeps the shadow and the
  // token; the context owns the arena and writes the token.
  const { calls, al } = composedContext();
  // UploadConstants__Buffer takes the handle and reads its implementation, as
  // Carbon's reaches buffer.m_buffer; Lock/Unlock go through the handle too.
  const handle = al.CreateConstantBuffer(16);
  const buffer = handle.TrinityALImpl_GetObject();
  const first = buffer.Lock(al);

  assert.equal(first.result, ALResult.S_OK);
  first.data.set([ 1, 2, 3, 4 ]);
  assert.equal(buffer.Unlock(al), ALResult.S_OK);
  assert.equal(calls.filter(call => call[0] === "writeBuffer").length, 0, "nothing uploaded yet");

  const regionA = al.UploadConstants__Buffer(handle);

  assert.deepEqual([ regionA.page, regionA.offset, regionA.size ], [ 0, 0, 256 ], "aligned to the device's 256");
  assert.equal(al.UploadConstants__Buffer(handle), regionA, "bound twice in one frame without a Lock: one region");

  // The per-object case: lock again, draw again, same frame.
  buffer.Lock(al).data.set([ 9 ]);
  buffer.Unlock(al);

  const regionB = al.UploadConstants__Buffer(handle);

  assert.equal(regionB.offset, 256, "a NEW region; the first draw's bytes are untouched");

  const writes = calls.filter(call => call[0] === "writeBuffer");

  assert.equal(writes.length, 2);
  assert.deepEqual(Array.from(writes[0][3].subarray(0, 4)), [ 1, 2, 3, 4 ]);
  assert.deepEqual(Array.from(writes[1][3].subarray(0, 4)), [ 9, 2, 3, 4 ]);
  assert.equal(calls.filter(call => call[0] === "createBuffer").length, 1, "one two-megabyte page");
  assert.equal(calls.find(call => call[0] === "createBuffer")[1].size, CONST_PAGE_SIZE);

  // Carbon's OTHER overload: bytes, not a buffer, get a fresh region every
  // call because the token it constructs is zeroed each time (:679-686).
  const bytes = al.UploadConstants__DataSize(new Uint8Array(16), 16);

  assert.equal(bytes.offset, 512);
  assert.notEqual(al.UploadConstants__DataSize(new Uint8Array(16), 16).offset, bytes.offset);

  // The bare name routes by argument, for literal ports.
  assert.equal(al.UploadConstants(handle), al.UploadConstants__Buffer(handle));
  assert.equal(al.UploadConstants(new Uint8Array(16), 16).offset, 1024);

  // An uncreated handle has no storage: Carbon's `return 0`.
  assert.equal(al.UploadConstants__Buffer(new Tr2ConstantBufferAL()), null, "an uncreated buffer");
});

test("the arena turns a page when one is full, and a buffer too big for a page is refused", () =>
{
  const { calls, webgpu } = context();
  const arena = new CjsWebgpuConstantArena(webgpu);
  const bytes = new Uint8Array(CONST_PAGE_SIZE / 2);

  assert.deepEqual(arena.Allocate(bytes).page, 0);
  assert.deepEqual(arena.Allocate(bytes).page, 0);
  assert.deepEqual(arena.Allocate(bytes).page, 1, "the third half does not fit page zero");
  assert.equal(calls.filter(call => call[0] === "createBuffer").length, 2);
  assert.equal(arena.GetTotalUploadedSize(), CONST_PAGE_SIZE + CONST_PAGE_SIZE / 2);
  assert.throws(() => arena.Allocate(new Uint8Array(CONST_PAGE_SIZE + 1)), /does not fit/);

  arena.Destruct();
  assert.equal(calls.filter(call => call[0] === "destroy").length, 2);
});

test("initial data seeds the shadow, and Carbon's create-time refusals are kept", () =>
{
  const { renderContext } = context();
  const buffer = new CjsWebgpuConstantBufferAL();

  assert.equal(buffer.Create(16, Tr2ConstantUsageAL.IMMUTABLE, null, renderContext), ALResult.E_INVALIDARG);
  assert.equal(buffer.Create(0, Tr2ConstantUsageAL.REUSABLE, null, renderContext), ALResult.E_INVALIDARG);
  assert.equal(buffer.Create(16, Tr2ConstantUsageAL.REUSABLE, null, { IsValid: () => false }), ALResult.E_INVALIDARG);
  assert.equal(buffer.Lock(renderContext).result, ALResult.E_FAIL, "an invalid buffer cannot be locked");
  assert.equal(buffer.Create(16, Tr2ConstantUsageAL.IMMUTABLE, new Uint8Array([ 7, 7, 7, 7 ]), renderContext), ALResult.S_OK);
  assert.deepEqual(Array.from(buffer._shadowCopy.subarray(0, 4)), [ 7, 7, 7, 7 ]);

  buffer.Destroy();
  assert.equal(buffer.IsValid(), false);
  assert.equal(buffer.GetSize(), 0);
});

test("Create accepts Trinity's context, as Carbon's upcast does", () =>
{
  // FillAndSetConstants hands the Tr2RenderContext, not the AL; Carbon's
  // Tr2RenderContext IS the AL by inheritance, ours composes it.
  const { renderContext } = context();
  const trinityContext = { GetRenderContextAL: () => renderContext, IsValid: () => true };
  const buffer = new CjsWebgpuConstantBufferAL();

  assert.equal(buffer.Create(16, Tr2ConstantUsageAL.REUSABLE, null, trinityContext), ALResult.S_OK);
});

test("SetConstants on the buffer binds on the context, as Metal's does", () =>
{
  // Metal's context hands the buffer's implementation the bind
  // (Tr2RenderContextMetal.mm:664-677), which records itself only when it has
  // storage (Tr2ConstantBufferALMetal.mm:81-92).
  const { al } = composedContext();
  const buffer = new CjsWebgpuConstantBufferAL();

  assert.equal(buffer.SetConstants(1, 0, al), ALResult.S_OK);
  assert.equal(al.GetConstants(1, 0), null, "an invalid buffer binds nothing");
  buffer.Create(16, Tr2ConstantUsageAL.REUSABLE, null, al);
  assert.equal(buffer.SetConstants(1, 0, al), ALResult.S_OK);
  assert.equal(al.GetConstants(1, 0), buffer);
  assert.deepEqual(buffer.Describe({}), { memoryClass: buffer.GetMemoryClass(), size: 16 });

  // The context's own verb takes the handle and unwraps it.
  const handle = al.CreateConstantBuffer(16);

  assert.equal(al.SetConstants(handle, 0, 2), ALResult.S_OK);
  assert.equal(al.GetConstants(0, 2), handle.TrinityALImpl_GetObject());
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

  const empty = al.CreateConstantBuffer();

  assert.ok(empty instanceof Tr2ConstantBufferAL, "the backend-neutral handle");
  assert.equal(empty.IsValid(), false);
  assert.equal(empty.Create(32, Tr2ConstantUsageAL.REUSABLE, null, al), ALResult.S_OK);
  assert.ok(empty.TrinityALImpl_GetObject() instanceof CjsWebgpuConstantBufferAL, "of this backend's kind");

  const sized = al.CreateConstantBuffer(48);

  assert.equal(sized.IsValid(), true);
  assert.equal(sized.GetSize(), 48);
  assert.equal(al.CreateConstantBuffer(16, Tr2ConstantUsageAL.IMMUTABLE, null), null, "a refused sized create is null");

  // Carbon's ceiling (Tr2ConstantBufferAL.cpp:30-34) at this backend's limit.
  const big = new Tr2ConstantBufferAL();

  assert.equal(big.Create__Size(64 * 1024 + 16, al), ALResult.E_INVALIDARG);
  assert.equal(big.IsValid(), false);
  assert.equal(big.Create__Size(64 * 1024, al), ALResult.S_OK);
});
