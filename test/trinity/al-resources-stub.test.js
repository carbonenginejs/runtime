import assert from "node:assert/strict";
import test from "node:test";

import {
  ALResult,
  Tr2BufferALStub,
  Tr2BufferDescriptionAL,
  Tr2CapsALStub,
  Tr2ConstantBufferALStub,
  Tr2ConstantUsageAL,
  Tr2RenderContextALStub,
  Tr2StubPlatformCaps,
  Tr2SwapChainALStub,
  Tr2VertexLayoutALStub
} from "../../npm/dist/trinity/core/index.js";
import { PixelFormat, Tr2CpuUsage, Tr2GpuUsage } from "../../npm/dist/global/consts/renderContext/index.js";

const context = () =>
{
  const al = new Tr2RenderContextALStub();

  al.CreateDevice();

  return al;
};


test("the caps say yes to some things, which is the point of them", () =>
{
  // A backend that answered no to everything would drive Trinity down paths a
  // real device never takes.
  const caps = new Tr2CapsALStub();

  assert.equal(caps.SupportsFloat16(), true);
  assert.equal(caps.SupportsVertexShaderTextures(), true);
  assert.equal(caps.SupportsStandaloneSwapChain(), true);

  assert.equal(caps.SupportsGpuBuffer(), false);
  assert.equal(caps.SupportsVariableRefreshRate(), false);
  assert.equal(caps.SupportsRaytracing(), false);

  assert.equal(Tr2StubPlatformCaps.SUPPORTS_COMPUTE, true);
  assert.equal(Tr2StubPlatformCaps.SUPPORTS_UNORDERED_ACCESS, false);
  assert.equal(Tr2StubPlatformCaps.MAX_CONSTANT_BUFFER_SIZE, 4096);
});

test("a buffer description derives its stride from its format", () =>
{
  const typed = Tr2BufferDescriptionAL.FromFormat(
    PixelFormat.PIXEL_FORMAT_R32G32B32A32_FLOAT,
    100,
    Tr2GpuUsage.VERTEX_BUFFER,
    Tr2CpuUsage.WRITE
  );

  assert.equal(typed.stride, 16);
  assert.equal(typed.GetSizeInBytes(), 1600);

  const structured = Tr2BufferDescriptionAL.FromStride(48, 10, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.WRITE);

  assert.equal(structured.format, PixelFormat.PIXEL_FORMAT_UNKNOWN);
  assert.equal(structured.GetSizeInBytes(), 480);
});

test("an empty buffer, and one nothing can fill, are both refused", () =>
{
  const al = context();
  const buffer = new Tr2BufferALStub();

  assert.equal(
    buffer.Create(Tr2BufferDescriptionAL.FromStride(16, 0, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.WRITE), null, al),
    ALResult.E_INVALIDARG,
    "no elements"
  );

  assert.equal(
    buffer.Create(Tr2BufferDescriptionAL.FromStride(16, 4, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.NONE), null, al),
    ALResult.E_INVALIDARG,
    "no CPU write and no initial data"
  );

  assert.equal(buffer.IsValid(), false);

  buffer.Destroy();
});

test("a buffer created with no device is refused", () =>
{
  const buffer = new Tr2BufferALStub();

  assert.equal(
    buffer.Create(
      Tr2BufferDescriptionAL.FromStride(16, 4, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.WRITE),
      null,
      new Tr2RenderContextALStub()
    ),
    ALResult.E_INVALIDCALL
  );

  buffer.Destroy();
});

test("vertices written through a map read back through one", () =>
{
  // THIS IS WHAT THE PORT BUYS. A headless frame can hold real geometry: the
  // storage is genuine, so a caller writes vertices and reads the same bytes.
  const al = context();
  const buffer = new Tr2BufferALStub();

  const created = buffer.Create(
    Tr2BufferDescriptionAL.FromStride(4, 8, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.READ | Tr2CpuUsage.WRITE),
    null,
    al
  );

  assert.equal(created, ALResult.S_OK);
  assert.equal(buffer.IsValid(), true);

  const written = buffer.MapForWriting(al);

  assert.equal(written.result, ALResult.S_OK);
  assert.equal(written.data.length, 32);

  written.data.set([ 1, 2, 3, 4 ], 0);
  buffer.UnmapForWriting();

  const read = buffer.MapForReading(al);

  assert.equal(read.result, ALResult.S_OK);
  assert.deepEqual([ ...read.data.subarray(0, 4) ], [ 1, 2, 3, 4 ]);

  buffer.UnmapForReading();
  buffer.Destroy();
});

test("a ranged read returns the bytes of that range", () =>
{
  // A DELIBERATE DEVIATION, stated at the head of the source. Carbon's stub
  // validates the range and hands back the start of the buffer, which is
  // harmless there because its storage is never meaningfully filled. Ours is.
  const al = context();
  const buffer = new Tr2BufferALStub();

  buffer.Create(
    Tr2BufferDescriptionAL.FromStride(1, 8, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.READ | Tr2CpuUsage.WRITE),
    null,
    al
  );

  buffer.MapForWriting(al).data.set([ 0, 1, 2, 3, 4, 5, 6, 7 ]);
  buffer.UnmapForWriting();

  const ranged = buffer.MapForReading(al, 4, 2);

  assert.equal(ranged.result, ALResult.S_OK);
  assert.deepEqual([ ...ranged.data ], [ 4, 5 ]);

  buffer.Destroy();
});

test("a range past the end, or of nothing, is refused", () =>
{
  const al = context();
  const buffer = new Tr2BufferALStub();

  buffer.Create(
    Tr2BufferDescriptionAL.FromStride(1, 8, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.READ | Tr2CpuUsage.WRITE),
    null,
    al
  );

  assert.equal(buffer.MapForReading(al, 6, 4).result, ALResult.E_INVALIDARG);
  assert.equal(buffer.MapForReading(al, 6, 0).result, ALResult.E_INVALIDARG);

  buffer.Destroy();
});

test("mapping a buffer needs the usage it was created with", () =>
{
  const al = context();
  const buffer = new Tr2BufferALStub();

  buffer.Create(
    Tr2BufferDescriptionAL.FromStride(4, 4, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.WRITE),
    null,
    al
  );

  assert.equal(buffer.MapForReading(al).result, ALResult.E_INVALIDCALL);
  assert.equal(buffer.MapForWriting(al).result, ALResult.S_OK);

  buffer.Destroy();
});

test("UpdateBuffer validates, and refuses a buffer that is mapped often", () =>
{
  // It moves no bytes, exactly as Carbon's stub does not - the map path is
  // what carries data. The value here is the validation.
  const al = context();
  const buffer = new Tr2BufferALStub();

  buffer.Create(
    Tr2BufferDescriptionAL.FromStride(4, 4, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.WRITE),
    null,
    al
  );

  assert.equal(buffer.UpdateBuffer(0, 16, new Uint8Array(16), al), ALResult.S_OK);
  assert.equal(buffer.UpdateBuffer(8, 16, new Uint8Array(16), al), ALResult.E_INVALIDARG);

  const often = new Tr2BufferALStub();

  often.Create(
    Tr2BufferDescriptionAL.FromStride(4, 4, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.WRITE_OFTEN),
    null,
    al
  );

  assert.equal(often.UpdateBuffer(0, 16, new Uint8Array(16), al), ALResult.E_INVALIDCALL);

  buffer.Destroy();
  often.Destroy();
});

test("a constant buffer locks, holds what was written, and reports its size", () =>
{
  // This is where per-frame and per-object registers land, so the shadow copy
  // being real is what makes a headless frame inspectable.
  const al = context();
  const constants = new Tr2ConstantBufferALStub();

  assert.equal(constants.Create(64, Tr2ConstantUsageAL.REUSABLE, null, al), ALResult.S_OK);
  assert.equal(constants.GetSize(), 64);
  assert.equal(constants.IsValid(), true);

  const locked = constants.Lock();

  assert.equal(locked.result, ALResult.S_OK);

  new Float32Array(locked.data.buffer, locked.data.byteOffset, 4).set([ 1, 2, 3, 4 ]);

  assert.equal(constants.Unlock(), ALResult.S_OK);

  const relocked = constants.Lock();

  assert.deepEqual(
    [ ...new Float32Array(relocked.data.buffer, relocked.data.byteOffset, 4) ],
    [ 1, 2, 3, 4 ]
  );

  constants.Destroy();
});

test("an immutable constant buffer with no data is refused", () =>
{
  // It is written once, at creation - arriving empty means it can never hold
  // anything, so a buffer of zeroes would be the wrong thing to hand back.
  const al = context();
  const constants = new Tr2ConstantBufferALStub();

  assert.equal(constants.Create(64, Tr2ConstantUsageAL.IMMUTABLE, null, al), ALResult.E_INVALIDARG);
  assert.equal(constants.Create(0, Tr2ConstantUsageAL.REUSABLE, null, al), ALResult.E_INVALIDARG);
  assert.equal(constants.Create(64, Tr2ConstantUsageAL.IMMUTABLE, new Uint8Array(64), al), ALResult.S_OK);

  constants.Destroy();
});

test("locking a constant buffer that was never created fails", () =>
{
  const constants = new Tr2ConstantBufferALStub();
  const locked = constants.Lock();

  assert.equal(locked.result, ALResult.E_FAIL);
  assert.equal(locked.data, null);

  constants.Destroy();
});

test("a swap chain owns a back buffer and presents", () =>
{
  const al = context();
  const chain = new Tr2SwapChainALStub();

  assert.equal(chain.Create(null, al), ALResult.S_OK);
  assert.equal(chain.IsValid(), true);
  assert.equal(chain.GetBackBuffer().GetFormat(), PixelFormat.PIXEL_FORMAT_B8G8R8X8_UNORM);
  assert.equal(chain.Present(), ALResult.S_OK);

  // Carbon's stub back buffer is 4x4: it has no window to ask for a size, and
  // a caller needing a real one uses the context's default back buffer.
  assert.equal(chain.GetWidth(), 4);
  assert.equal(chain.GetHeight(), 4);

  chain.Destroy();

  assert.equal(chain.IsValid(), false);
});

test("a swap chain created with no device is refused", () =>
{
  const chain = new Tr2SwapChainALStub();

  assert.equal(chain.Create(null, new Tr2RenderContextALStub()), ALResult.E_INVALIDARG);
  assert.equal(chain.IsValid(), false);

  chain.Destroy();
});

test("a swap chain reports video memory, alone among the AL resources", () =>
{
  const chain = new Tr2SwapChainALStub();
  const buffer = new Tr2BufferALStub();

  assert.notEqual(chain.GetMemoryClass(), buffer.GetMemoryClass());

  chain.Destroy();
  buffer.Destroy();
});

test("a vertex layout needs elements, and keeps its own copy of them", () =>
{
  const al = context();
  const layout = new Tr2VertexLayoutALStub();
  const elements = [ { usage: 0, usageIndex: 0, type: 4, offset: 0 } ];

  assert.equal(layout.Create([], al), ALResult.E_FAIL, "an empty definition matches no shader input");
  assert.equal(layout.Create(elements, al), ALResult.S_OK);

  elements.push({ usage: 2, usageIndex: 0, type: 4, offset: 12 });

  assert.equal(layout.GetDefinition().length, 1, "the caller's later edit did not reach it");

  layout.Destroy();
});

test("a vertex layout created with no device is refused", () =>
{
  const layout = new Tr2VertexLayoutALStub();

  assert.equal(
    layout.Create([ { usage: 0, usageIndex: 0, type: 4, offset: 0 } ], new Tr2RenderContextALStub()),
    ALResult.E_FAIL
  );

  layout.Destroy();
});
