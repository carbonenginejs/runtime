// Backend buffers and textures count their bytes on Tr2MemoryCounterAL, as Carbon's dx11 backend does
// (Tr2BufferALDx11.cpp:176, 185; Tr2TextureALDx11.cpp:539, 833). The device-resource lifecycle's budget reads
// these counters (docs internal/decisions/device-resource-registration.md, Revised lifecycle § 7).
import assert from "node:assert/strict";
import test from "node:test";
import { PixelFormat, Tr2CpuUsage, Tr2GpuUsage } from "../../npm/dist/global/consts/renderContext/index.js";
import { Tr2BufferALStub, Tr2TextureALStub, Tr2MemoryCounterAL, Tr2BitmapDimensions, Tr2MsaaDesc,
  Tr2BufferDescriptionAL } from "../../npm/dist/trinityal/index.js";

const context = { IsValid: () => true };

test("a backend buffer counts stride times count while it exists", () =>
{
  const before = Tr2MemoryCounterAL.gpuMemoryBufferEst;
  const buffer = new Tr2BufferALStub();
  const desc = Tr2BufferDescriptionAL.create__Stride(16, 8, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.WRITE);
  assert.equal(buffer.Create(desc, null, context), 0);
  assert.equal(Tr2MemoryCounterAL.gpuMemoryBufferEst, before + 128, "Tr2BufferALDx11.cpp:176");
  assert.equal(buffer.Create(desc, null, context), 0);
  assert.equal(Tr2MemoryCounterAL.gpuMemoryBufferEst, before + 128, "re-creating replaces, never adds");
  buffer.Destroy();
  assert.equal(Tr2MemoryCounterAL.gpuMemoryBufferEst, before, "Tr2BufferALDx11.cpp:185");
});

test("a backend texture counts every mip while it exists", () =>
{
  const before = Tr2MemoryCounterAL.gpuMemoryTextureEst;
  const texture = new Tr2TextureALStub();
  const desc = Tr2BitmapDimensions.create__WidthHeightMipCountFormat(8, 8, 1, PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM);
  assert.equal(texture.Create(desc, new Tr2MsaaDesc(), Tr2GpuUsage.SHADER_RESOURCE | Tr2GpuUsage.RENDER_TARGET, Tr2CpuUsage.NONE, null, context), 0);
  assert.equal(Tr2MemoryCounterAL.gpuMemoryTextureEst, before + 8 * 8 * 4, "Tr2TextureALDx11.cpp:539");
  texture.Destroy();
  assert.equal(Tr2MemoryCounterAL.gpuMemoryTextureEst, before, "Tr2TextureALDx11.cpp:833");
});

test("a failed create counts nothing", () =>
{
  const before = Tr2MemoryCounterAL.gpuMemoryBufferEst;
  const buffer = new Tr2BufferALStub();
  const desc = Tr2BufferDescriptionAL.create__Stride(16, 0, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.WRITE);
  assert.notEqual(buffer.Create(desc, null, context), 0);
  assert.equal(Tr2MemoryCounterAL.gpuMemoryBufferEst, before);
});
