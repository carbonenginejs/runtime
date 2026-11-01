import assert from "node:assert/strict";
import { test, beforeEach, afterEach } from "node:test";
import { TriTextureRes } from "../../../npm/dist/trinity/resources/texture/TriTextureRes.js";
import { MotherLode } from "../../../npm/dist/blue/blue/MotherLode.js";
import { blue, BlueResMan, CjsLoadingObject } from "../../../npm/dist/blue/blue/index.js";
import { HostBitmap } from "../../../npm/dist/global/imageio/index.js";
import { PixelFormat } from "../../../npm/dist/global/consts/renderContext/index.js";
import { TriStorageFlags, Tr2ALMemoryType } from "../../../npm/dist/global/consts/graphics/index.js";

// Use the rebuilt package, including the texture LOAD setting decorator.
function loadedTexture(memoryClass = Tr2ALMemoryType.AL_MEMORY_VIDEO)
{
  const resource = new TriTextureRes();
  resource._path = "res:/synthetic/eviction.dds";
  const bitmap = new HostBitmap();
  bitmap.Create(2, 2, 1, PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM);
  resource.CreateFromHostBitmap(bitmap);
  let destroyed = 0;
  const texture = {
    IsValid: () => destroyed === 0,
    GetMemoryClass: () => memoryClass,
    Destroy() { if (!destroyed) destroyed += 1; }
  };
  // Model the value owned by RealizeTexture; SetTexture itself only borrows.
  resource._ownTexture = texture;
  resource.SetTexture(texture);
  resource._SetPrepared(true);
    resource._SetGood(true);
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
      assert.equal(resource.GetBitmap(), bitmap);
      assert.equal(resource.IsPrepared(), !release);
      assert.equal(resource.IsGood(), !release);
      assert.equal(resource.originalMemoryUsage, release ? 0 : 16);
    }
  }
});

test("each full texture cache eviction destroys its AL and releases its bitmap before reload", () =>
{
  // Cache size 0: expired resources are purged, not kept by the ICacheable cache.
  const motherLode = new MotherLode({ now: () => 0, cacheSize: 0 });
  const loaded = loadedTexture();
  const resource = loaded.resource;
  let destroys = 0;
  for (let cycle = 0; cycle < 12; cycle += 1)
  {
    if (cycle !== 0) resource.CreateFromHostBitmap(loadedTexture().bitmap);
    resource.ReleaseResources();
    let alive = true;
    const owned = {
      IsValid: () => alive,
      GetMemoryClass: () => Tr2ALMemoryType.AL_MEMORY_VIDEO,
      Destroy() { if (alive) { destroys += 1; alive = false; } }
    };
    resource._ownTexture = owned;
    resource.SetTexture(owned);
    resource._SetPrepared(true);
    resource._SetGood(true);
    motherLode.Insert(resource.GetPath(), resource, { time: 0 });
    const result = motherLode.PurgeInactive({ time: 10, maxIdleMilliseconds: 5 });
    assert.equal(result.purged, 1);
    assert.equal(destroys, cycle + 1, "TriTextureRes.cpp:358-382: each owned AL must be released");
    assert.equal(resource.texture, null);
    assert.equal(resource.GetBitmap(), null, "JS full purge takes the place of Carbon's resource destructor");
    assert.equal(resource.GetBitmap() !== null, false);
    assert.equal(blue.resMan.GetResourceStatus(resource).purged, true);
    resource.Shutdown();
    assert.equal(destroys, cycle + 1, "repeated teardown does not destroy an AL twice");
  }
});

test("payload-only expiry preserves texture identity, AL, bitmap and payload statistics", () =>
{
  const motherLode = new MotherLode({ now: () => 0 });
  const { resource, bitmap, texture, destroyed } = loadedTexture();
  const ordinary = plainResource("res:/synthetic/ordinary.bin", {bytes: [1]});
  motherLode.Insert(resource.GetPath(), resource, { time: 0 });
  motherLode.Insert(ordinary.GetPath(), ordinary, { time: 0 });
  const result = motherLode.PurgeInactive({ time: 10, maxIdleMilliseconds: 100, payloadMaxIdleMilliseconds: 5 });
  assert.equal(result.purged, 0);
  assert.equal(result.payloadsReleased, 1, "only the non-texture payload expires");
  assert.equal(blue.resMan.HasResourcePayload(ordinary), false);
  assert.equal(resource.GetBitmap(), bitmap);
  assert.equal(resource.GetBitmap(), bitmap);
  assert.equal(resource.GetTexture(), texture);
  assert.equal(destroyed(), 0);
  assert.equal(motherLode.GetStats().payloads, 0, "plain-data statistics exclude family-owned bitmaps");
});

test("full purge releases a bitmap even when no texture has been realized", () =>
{
  const { resource } = loadedTexture();
  resource.SetTexture(null);
  resource.Shutdown();
  assert.equal(resource.GetBitmap(), null);
  assert.equal(resource.GetBitmap(), null);
});

let previous;
beforeEach(() => { previous = blue.resMan; blue.resMan = new BlueResMan(); });
afterEach(() => { try { blue.resMan.Clear(); } finally { blue.resMan = previous; } });

/** Plain-data fixture for MotherLode's separate data lease. */
function plainResource(path, value)
{
  const resource = new CjsLoadingObject();
  resource._path = path;
  resource._SetPrepared(true);
  resource._SetGood(true);
  blue.resMan._GetResourceRecord(resource).payload = value;
  return resource;
}


test("MotherLode preserves independent family data and opaque adapter cleanup switches", () =>
{
  for (const releasePayload of [false, true])
  for (const destroyAdapters of [false, true])
  {
    const { resource, bitmap, destroyed } = loadedTexture();
    let adapters = 0;
    resource.SetAdapterResource("test", { Destroy() { adapters++; } });
    blue.resMan.motherLode.Insert(resource.GetPath(), resource);
    blue.resMan.motherLode.Delete(resource.GetPath(), { releasePayload, destroyAdapters });
    assert.equal(resource.GetBitmap(), releasePayload ? null : bitmap);
    assert.equal(destroyed(), releasePayload ? 1 : 0);
    assert.equal(adapters, destroyAdapters ? 1 : 0);
    assert.equal(resource.HasAdapterResource("test"), !destroyAdapters);
    resource.Shutdown();
    assert.equal(adapters, 1, "final shutdown releases an intentionally retained adapter once");
    assert.equal(destroyed(), 1);
  }
});

test("MotherLode can remove a plain-data handle without releasing its retained values", () =>
{
  const value = { retained: true };
  const resource = plainResource("res:/retained.bin", value);
  blue.resMan.motherLode.Insert(resource.GetPath(), resource);
  blue.resMan.motherLode.Delete(resource.GetPath(), { releasePayload: false });
  assert.equal(blue.resMan.GetResourcePayload(resource), value);
  resource.Shutdown();
  assert.equal(blue.resMan.GetResourcePayload(resource), null);
});
