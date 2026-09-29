import assert from "node:assert/strict";
import { test } from "node:test";
import { TriTextureRes } from "../../../src/resource/texture/TriTextureRes.js";
import { CjsMotherLode } from "../../../src/global/blue/CjsMotherLode.js";
import { CjsResource } from "../../../src/global/blue/CjsResource.js";
import { HostBitmap } from "../../../src/global/imageio/index.js";
import { PixelFormat } from "../../../src/global/consts/renderContext/index.js";
import { TriStorageFlags, Tr2ALMemoryType } from "../../../src/global/consts/graphics/index.js";

// Source imports intentionally exercise the eviction policy without a dist build.
function loadedTexture(memoryClass = Tr2ALMemoryType.AL_MEMORY_VIDEO)
{
  const resource = new TriTextureRes();
  resource.Initialize("res:/synthetic/eviction.dds");
  const bitmap = new HostBitmap();
  bitmap.Create(2, 2, 1, PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM);
  resource.SetPayload(bitmap);
  let destroyed = 0;
  const texture = {
    IsValid: () => destroyed === 0,
    GetMemoryClass: () => memoryClass,
    Destroy() { destroyed += 1; }
  };
  resource.SetTexture(texture);
  resource.MarkPrepared();
  return { resource, bitmap, texture, destroyed: () => destroyed };
}

test("ReleaseResources honours the storage mask and retains Carbon's loaded bitmap", () =>
{
  for (const memoryClass of [ Tr2ALMemoryType.AL_MEMORY_VIDEO, Tr2ALMemoryType.AL_MEMORY_MANAGED ])
  {
    for (const mask of [ 0, TriStorageFlags.TRISTORAGE_VIDEOMEMORY, TriStorageFlags.TRISTORAGE_MANAGEDMEMORY, TriStorageFlags.TRISTORAGE_ALL ])
    {
      const { resource, bitmap, texture, destroyed } = loadedTexture(memoryClass);
      resource.originalMemoryUsage = 16;
      resource.ReleaseResources(mask);
      const release = Boolean(mask & TriStorageFlags.TRISTORAGE_MANAGEDMEMORY)
        || Boolean((mask & TriStorageFlags.TRISTORAGE_VIDEOMEMORY) && memoryClass === Tr2ALMemoryType.AL_MEMORY_VIDEO);
      // Carbon first resets matching owned memory, then clears the texture on
      // managed release even for a video texture (cpp:358-389).
      assert.equal(resource.texture, release ? null : texture, "TriTextureRes.cpp:367-389: storage controls the texture pointer");
      assert.equal(destroyed(), release ? 1 : 0, "TriTextureRes.cpp:358-381: owned AL is destroyed on matching storage or pointer release");
      assert.equal(resource.GetBitmap(), bitmap, "TriTextureRes.cpp:356-392 retains m_loadedBitmap");
      assert.equal(resource.GetPayload(), bitmap);
      assert.equal(resource.state, release ? CjsResource.State.UNLOADED : CjsResource.State.PREPARED);
      assert.equal(resource.originalMemoryUsage, release ? 0 : 16);
    }
  }
});

test("each full texture cache eviction destroys its AL and releases its bitmap before reload", () =>
{
  const motherLode = new CjsMotherLode({ now: () => 0 });
  const loaded = loadedTexture();
  const resource = loaded.resource;
  let destroys = 0;
  for (let cycle = 0; cycle < 12; cycle += 1)
  {
    if (cycle !== 0) resource.SetPayload(loadedTexture().bitmap);
    resource.SetTexture({
      IsValid: () => true,
      GetMemoryClass: () => Tr2ALMemoryType.AL_MEMORY_VIDEO,
      Destroy() { destroys += 1; }
    });
    resource.MarkPrepared();
    motherLode.Insert(resource.GetPath(), resource, { time: 0 });
    const result = motherLode.PurgeInactive({ time: 10, maxIdleMilliseconds: 5 });
    assert.equal(result.purged, 1);
    assert.equal(destroys, cycle + 1, "TriTextureRes.cpp:358-382: each owned AL must be released");
    assert.equal(resource.texture, null);
    assert.equal(resource.GetBitmap(), null, "JS full purge takes the place of Carbon's resource destructor");
    assert.equal(resource.HasPayload(), false);
    assert.equal(resource.IsPurged(), true);
    resource.ReleasePayload();
    assert.equal(destroys, cycle + 1, "repeated teardown does not destroy an AL twice");
  }
});

test("payload-only expiry preserves texture identity, AL, bitmap and payload statistics", () =>
{
  const motherLode = new CjsMotherLode({ now: () => 0 });
  const { resource, bitmap, texture, destroyed } = loadedTexture();
  const ordinary = new CjsResource();
  ordinary.Initialize("res:/synthetic/ordinary.bin");
  ordinary.SetPayload({ bytes: [ 1 ] });
  motherLode.Insert(resource.GetPath(), resource, { time: 0 });
  motherLode.Insert(ordinary.GetPath(), ordinary, { time: 0 });
  const result = motherLode.PurgeInactive({ time: 10, maxIdleMilliseconds: 100, payloadMaxIdleMilliseconds: 5 });
  assert.equal(result.purged, 0);
  assert.equal(result.payloadsReleased, 1, "only the non-texture payload expires");
  assert.equal(ordinary.HasPayload(), false);
  assert.equal(resource.GetBitmap(), bitmap);
  assert.equal(resource.GetPayload(), bitmap);
  assert.equal(resource.GetTexture(), texture);
  assert.equal(destroyed(), 0);
  assert.equal(motherLode.GetStats().payloads, 1, "retained texture payload remains counted");
});

test("full purge releases a bitmap even when no texture has been realized", () =>
{
  const { resource } = loadedTexture();
  resource.SetTexture(null);
  resource.ReleasePayload();
  assert.equal(resource.GetBitmap(), null);
  assert.equal(resource.GetPayload(), null);
});
