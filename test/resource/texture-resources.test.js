import assert from "node:assert/strict";
import test from "node:test";

import { CjsResMan, RegisterTextureResources, TextureResourceExtensions, TriTextureRes, Tr2ImageRes } from "../../npm/dist/resource/index.js";
import { HostBitmap } from "../../npm/dist/global/imageio/index.js";
import { PixelFormat } from "../../npm/dist/global/consts/renderContext/index.js";

/** A 2x1 BGRA DDS, the legacy (non-DX10) header Carbon's reader accepts. */
function legacyDds(width, height, pixels)
{
  const header = new Uint8Array(128);
  const v = new DataView(header.buffer);
  v.setUint32(0, 0x20534444, true);   // "DDS "
  v.setUint32(4, 124, true);
  v.setUint32(8, 0x1007, true);
  v.setUint32(12, height, true);
  v.setUint32(16, width, true);
  v.setUint32(28, 1, true);
  v.setUint32(76, 32, true);
  v.setUint32(80, 0x41, true);        // RGB | ALPHAPIXELS
  v.setUint32(88, 32, true);
  [ 0xFF0000, 0xFF00, 0xFF, 0xFF000000 ].forEach((mask, i) => v.setUint32(92 + i * 4, mask, true));
  v.setUint32(108, 0x1000, true);
  const out = new Uint8Array(128 + pixels.length);
  out.set(header);
  out.set(pixels, 128);
  return out;
}

/** A manager serving one in-memory file. */
function managerServing(path, bytes, options = {})
{
  const resMan = new CjsResMan();
  resMan.Register({ source: { Read: () => Promise.resolve(bytes) } });
  RegisterTextureResources(resMan, options);
  return resMan;
}

test("RegisterTextureResources routes Carbon's image extensions", () =>
{
  assert.deepEqual([ ...TextureResourceExtensions ], [ "dds", "png", "jpg", "jpeg", "tga", "gif" ]);
  assert.throws(() => RegisterTextureResources({}), TypeError);
  assert.throws(() => RegisterTextureResources(new CjsResMan(), { Handler: HostBitmap }), TypeError);
});

test("a texture resource loads as Carbon's HostBitmap, not a plain payload", async () =>
{
  const bytes = legacyDds(2, 1, [ 1, 2, 3, 255, 4, 5, 6, 255 ]);
  const resMan = managerServing("res:/x/y.dds", bytes);

  const resource = await resMan.LoadObject("res:/x/y.dds");

  assert.ok(resource instanceof TriTextureRes, "the route's handler");

  const bitmap = resource.GetBitmap();

  assert.ok(bitmap instanceof HostBitmap, "Carbon's m_loadedBitmap");
  assert.equal(bitmap.GetFormat(), PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM);
  assert.equal(bitmap.GetWidth(), 2);
  assert.deepEqual([ ...bitmap.GetRawData() ], [ 1, 2, 3, 255, 4, 5, 6, 255 ]);
  // The dimensions TriTextureRes reports are the bitmap's.
  assert.equal(resource.width, 2);
  assert.equal(resource.height, 1);
  assert.equal(resource.cpuMip, 1);
});

test("the same route serves Tr2ImageRes, which is Carbon's CPU-only image", async () =>
{
  const bytes = legacyDds(1, 1, [ 10, 20, 30, 255 ]);
  const resMan = managerServing("res:/x/icon.dds", bytes, { Handler: Tr2ImageRes });

  const resource = await resMan.LoadObject("res:/x/icon.dds");

  assert.ok(resource instanceof Tr2ImageRes);
  assert.equal(resource.GetBitmap().IsValid(), true);
  assert.equal(resource.GetWidth(), 1);
  assert.deepEqual(resource.GetPixelColor(0, 0), { b: Math.fround(10 / 255), g: Math.fround(20 / 255), r: Math.fround(30 / 255), a: 1 });
  assert.equal(resource.IsPixelOpaque(0, 0), true);
});

test("a file the image handlers refuse fails the load, as Carbon's DoLoad does", async () =>
{
  const resMan = managerServing("res:/x/broken.dds", new Uint8Array(128));

  await assert.rejects(
    () => resMan.LoadObject("res:/x/broken.dds"),
    error => /broken\.dds/.test(error.message) || error.code === "CJS_RESOURCE_IMAGE_READ_FAILED"
  );
});
