import { configureResourceManager } from "../../support/configuredResMan.js";
import assert from "node:assert/strict";
import test from "node:test";
import { CjsBlueResMan } from "../../../npm/dist/resource/index.js";
import { CjsIncarnaTextureConstructor, IncarnaTexturePrefix, RegisterIncarnaTextures } from "../../../npm/dist/character/index.js";
import { PixelFormat } from "../../../npm/dist/global/consts/renderContext/index.js";
import "../../support/frameLoop.js";

/**
 * `dynamic:/incarna/<role>/<source>` is one quad shader input made from one
 * Incarna texture: a channel mapping run through Carbon's texture pipeline.
 */

/** A 1x1 BGRA DDS, the legacy (non-DX10) header Carbon's reader accepts. */
function legacyDds(bgra)
{
  const header = new Uint8Array(128);
  const v = new DataView(header.buffer);
  v.setUint32(0, 0x20534444, true);   // "DDS "
  v.setUint32(4, 124, true);
  v.setUint32(8, 0x1007, true);
  v.setUint32(12, 1, true);
  v.setUint32(16, 1, true);
  v.setUint32(28, 1, true);
  v.setUint32(76, 32, true);
  v.setUint32(80, 0x41, true);        // RGB | ALPHAPIXELS
  v.setUint32(88, 32, true);
  [ 0xFF0000, 0xFF00, 0xFF, 0xFF000000 ].forEach((mask, i) => v.setUint32(92 + i * 4, mask, true));
  v.setUint32(108, 0x1000, true);
  const out = new Uint8Array(132);
  out.set(header);
  out.set(bgra, 128);
  return out;
}

// One texel: red 10, green 20, blue 30, alpha 40.
const SOURCE = "res:/x/walkway_os.dds";

async function manager()
{
  const files = { [SOURCE]: legacyDds([ 30, 20, 10, 40 ]) };
  const resMan = new CjsBlueResMan();
  resMan.Register({ source: { Read: path => Promise.resolve(files[path]) } });
  await configureResourceManager(resMan);
  RegisterIncarnaTextures(resMan);
  return resMan;
}

for (const [ role, format, texel ] of [
  [ "albedo", PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM, [ 10, 10, 10, 255 ] ],
  [ "roughness", PixelFormat.PIXEL_FORMAT_R8_UNORM, [ 20 ] ],
  [ "material", PixelFormat.PIXEL_FORMAT_R8_UNORM, [ 30 ] ],
  [ "glow", PixelFormat.PIXEL_FORMAT_R8_UNORM, [ 40 ] ],
  [ "normal", PixelFormat.PIXEL_FORMAT_R8G8_UNORM, [ 40, 20 ] ],
  [ "dirt", PixelFormat.PIXEL_FORMAT_R8_UNORM, [ 30 ] ],
  [ "detail", PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM, [ 128, 128, 128, 40 ] ]
])
{
  test(`the ${role} role maps its channels`, async () =>
  {
    const resMan = await manager();
    const path = CjsIncarnaTextureConstructor.texturePath(role, SOURCE);
    assert.equal(path, `${IncarnaTexturePrefix}${role}/${SOURCE}`);
    const texture = resMan.GetResource(path);
    await resMan.Ready(texture);

    const bitmap = texture.GetBitmap();
    assert.equal(bitmap.GetFormat(), format);
    assert.deepEqual([ ...bitmap.GetMipRawData(0).subarray(0, texel.length) ], texel);
    assert.equal(resMan.GetResource(path), texture, "one texture per path");
  });
}

test("an unknown role or a missing source is not a recipe", async () =>
{
  assert.equal(CjsIncarnaTextureConstructor.buildRecipe(`specular/${SOURCE}`), null);
  assert.equal(CjsIncarnaTextureConstructor.buildRecipe("albedo/"), null);
  assert.equal(CjsIncarnaTextureConstructor.buildRecipe(SOURCE), null);
  const resMan = await manager();
  const resource = resMan.GetResource(`${IncarnaTexturePrefix}specular/${SOURCE}`);
  assert.equal(resMan.GetResourceStatus(resource).error.code, "CJS_TEXTURE_PROCEDURAL_PATH_INVALID");
});

/** A 2x2 BGRA DDS with its 1x1 mip, the shape of a shipped texture's chain. */
function mippedDds()
{
  const header = new Uint8Array(128);
  const v = new DataView(header.buffer);
  v.setUint32(0, 0x20534444, true);   // "DDS "
  v.setUint32(4, 124, true);
  v.setUint32(8, 0x1007 | 0x20000, true);   // ... | MIPMAPCOUNT
  v.setUint32(12, 2, true);
  v.setUint32(16, 2, true);
  v.setUint32(28, 2, true);
  v.setUint32(76, 32, true);
  v.setUint32(80, 0x41, true);
  v.setUint32(88, 32, true);
  [ 0xFF0000, 0xFF00, 0xFF, 0xFF000000 ].forEach((mask, i) => v.setUint32(92 + i * 4, mask, true));
  v.setUint32(108, 0x401008, true);         // TEXTURE | COMPLEX | MIPMAP
  const out = new Uint8Array(128 + 16 + 4);
  out.set(header);
  out.set(new Array(4).fill([ 30, 20, 10, 40 ]).flat(), 128);
  out.set([ 30, 20, 10, 40 ], 144);
  return out;
}

test("a source with mips keeps its chain, which a mip step would have refused", async () =>
{
  const resMan = new CjsBlueResMan();
  resMan.Register({ source: { Read: () => Promise.resolve(mippedDds()) } });
  await configureResourceManager(resMan);
  RegisterIncarnaTextures(resMan);
  const texture = resMan.GetResource(CjsIncarnaTextureConstructor.texturePath("albedo", "res:/x/mipped_os.dds"));
  await resMan.Ready(texture);

  const bitmap = texture.GetBitmap();
  assert.ok(bitmap, "the recipe produced a bitmap");
  assert.equal(bitmap.GetMipCount(), 2);
  assert.deepEqual([ ...bitmap.GetMipRawData(1).subarray(0, 4) ], [ 10, 10, 10, 255 ]);
});
