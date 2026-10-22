import assert from "node:assert/strict";
import { test } from "node:test";
import { Tr2TextureLodManager } from "../../../npm/dist/resource/index.js";
import { BitmapDimensions } from "../../../npm/dist/global/imageio/index.js";
import { PixelFormat } from "#consts/render-context";

function dims(width, height, mips = 1)
{
  return BitmapDimensions.create__WidthHeightMipCountFormat(width, height, mips, PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM);
}

test("Tr2TextureLodManager tracks memory and trims past the budgets", () =>
{
  const manager = new Tr2TextureLodManager();
  const desc = dims(16, 16, 1);

  assert.equal(manager.CanUploadToGpu(desc), true);
  assert.equal(manager.NeedToTrimGpuTexture(), false);
  manager.GpuTextureCreated(desc);
  assert.equal(manager.gpuMemorySize, 16 * 16 * 4);
  manager.GpuTextureDestroyed(desc);
  assert.equal(manager.gpuMemorySize, 0);

  manager.CpuTextureCreated(desc);
  assert.equal(manager.cpuMemorySize, 16 * 16 * 4);
  manager.CpuTextureDestroyed(desc);
  assert.equal(manager.cpuMemorySize, 0);

  // Destroying more than was created wraps at 32 bits, as Carbon's unsigned addition does.
  manager.GpuTextureDestroyed(desc);
  assert.equal(manager.gpuMemorySize, (2 ** 32) - (16 * 16 * 4));
  assert.equal(manager.NeedToTrimGpuTexture(), true);
});

test("Tr2TextureLodManager GetStats is a zeroed copy and the vta setting reloads only .vta textures", () =>
{
  const manager = new Tr2TextureLodManager();
  const stats = manager.GetStats();

  assert.deepEqual(stats, { gpuMemoryUsed: 0, gpuMemoryAllocated: 0, cpuMemoryUsed: 0, cpuMemoryAllocated: 0, gpuUploadSize: 0 });
  stats.gpuMemoryUsed = 5;
  assert.equal(manager.GetStats().gpuMemoryUsed, 0);

  const reloaded = [];
  const make = path => ({ GetPath: () => path, Reload: () => reloaded.push(path) });
  manager.RegisterTexture(make("res:/a.vta")).RegisterTexture(make("res:/b.dds")).RegisterTexture(make(".vta"));

  manager.SetUseLowResVtaFilesSetting(true);
  assert.equal(manager.GetUseLowResVtaFilesSetting(), true);
  assert.deepEqual(reloaded, ["res:/a.vta"]);
  manager.SetUseLowResVtaFilesSetting(true);
  assert.equal(reloaded.length, 1);
});
