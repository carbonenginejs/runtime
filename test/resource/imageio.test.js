import assert from "node:assert/strict";
import test from "node:test";

import { ImageIO, HostBitmap, LoadParameters, ImageIOResult, Metadata } from "../../npm/dist/resource/imageio/index.js";
import { CjsDdsFormat } from "../../npm/dist/resource/formats/dds/index.js";
import { PixelFormat as F } from "../../npm/dist/global/consts/renderContext/index.js";
import { blue } from "../../npm/dist/global/blue/index.js";

/** A legacy (non-DX10) uncompressed DDS: 32-bit masks, no mips unless mipCount > 1. */
function legacyDds(width, height, bitCount, masks, pixels, mipCount = 1)
{
  const header = new Uint8Array(128);
  const v = new DataView(header.buffer);
  v.setUint32(0, 0x20534444, true);           // "DDS "
  v.setUint32(4, 124, true);
  v.setUint32(8, 0x1007 | (mipCount > 1 ? 0x20000 : 0), true);
  v.setUint32(12, height, true);
  v.setUint32(16, width, true);
  v.setUint32(28, mipCount, true);
  v.setUint32(76, 32, true);
  v.setUint32(80, 0x40 | (masks[3] ? 0x1 : 0), true);
  v.setUint32(88, bitCount, true);
  masks.forEach((m, i) => v.setUint32(92 + i * 4, m, true));
  v.setUint32(108, 0x1000, true);
  const out = new Uint8Array(128 + pixels.length);
  out.set(header);
  out.set(pixels, 128);
  return out;
}

const BGRA_MASKS = [ 0xFF0000, 0xFF00, 0xFF, 0xFF000000 ];

test("ImageIOResult carries Carbon's codes and message text", () =>
{
  assert.equal(new ImageIOResult().IsOk(), true);
  const r = new ImageIOResult(ImageIOResult.Code.HEADER_NOT_SUPPORTED, "unsupported DDS format X");
  assert.equal(r.IsOk(), false);
  assert.equal(r.GetErrorMessage(), "image header not supported: unsupported DDS format X");
});

test("LoadParameters.GetMipLevelRange follows Tr2ImageHandler.cpp:165-191", () =>
{
  assert.deepEqual(new LoadParameters("a.dds", 2).GetMipLevelRange(256, 256, 9), { skipCount: 2, mipCount: 7 });
  assert.deepEqual(new LoadParameters("a.dds", 9).GetMipLevelRange(256, 256, 5), { skipCount: 2, mipCount: 3 });
  assert.deepEqual(new LoadParameters("a.dds", 2).GetMipLevelRange(8, 8, 4), { skipCount: 0, mipCount: 4 });
  assert.deepEqual(new LoadParameters("a.dds", 0, 3).GetMipLevelRange(256, 256, 9), { skipCount: 6, mipCount: 3 });
});

test("CjsDdsFormat.carbon is Carbon's handler table, built per format class", () =>
{
  const table = CjsDdsFormat.carbon;
  assert.equal(CjsDdsFormat.carbon, table);
  assert.deepEqual(Object.keys(table), [ "checkExtension", "readImage", "readImageAsync", "isSaveSupported", "save" ]);
  assert.equal(table.checkExtension("DDS"), true);
  assert.equal(table.checkExtension("png"), false);
  assert.equal(table.isSaveSupported(null).code, ImageIOResult.Code.METHOD_NOT_SUPPORTED);
});

test("ImageIO.readImage routes by extension and fills the caller's bitmap", () =>
{
  const bytes = legacyDds(2, 1, 32, BGRA_MASKS, [ 1, 2, 3, 4, 5, 6, 7, 8 ]);
  const bitmap = new HostBitmap();
  const metadata = new Metadata();
  const r = ImageIO.readImage(bytes, new LoadParameters("x/y.dds"), bitmap, metadata);
  assert.equal(r.IsOk(), true, r.GetErrorMessage());
  assert.equal(bitmap.GetFormat(), F.PIXEL_FORMAT_B8G8R8A8_UNORM);
  assert.equal(bitmap.GetWidth(), 2);
  assert.deepEqual([ ...bitmap.GetRawData() ], [ 1, 2, 3, 4, 5, 6, 7, 8 ]);
  assert.equal(metadata.cutout.width, 1);

  assert.equal(ImageIO.readImage(bytes, new LoadParameters("x.nope"), new HostBitmap()).code, ImageIOResult.Code.UNRECOGNIZED_IMAGE_TYPE);
});

test("24-bit RGB expands to BGRX with X = 0 (Tr2DdsHandler.cpp:774-795)", () =>
{
  const bytes = legacyDds(2, 1, 24, [ 0xFF0000, 0xFF00, 0xFF, 0 ], [ 1, 2, 3, 4, 5, 6 ]);
  const bitmap = new HostBitmap();
  assert.equal(ImageIO.readImage(bytes, new LoadParameters("a.dds"), bitmap).IsOk(), true);
  assert.equal(bitmap.GetFormat(), F.PIXEL_FORMAT_B8G8R8X8_UNORM);
  assert.deepEqual([ ...bitmap.GetRawData() ], [ 1, 2, 3, 0, 4, 5, 6, 0 ]);
});

test("a requested format converts after the native read", () =>
{
  const bytes = legacyDds(1, 1, 32, BGRA_MASKS, [ 9, 8, 7, 6 ]);
  const bitmap = new HostBitmap();
  const r = ImageIO.readImage(bytes, new LoadParameters("a.dds", 0, 0xffffffff, F.PIXEL_FORMAT_R8G8B8A8_UNORM), bitmap);
  assert.equal(r.IsOk(), true);
  assert.deepEqual([ ...bitmap.GetRawData() ], [ 7, 8, 9, 6 ]);

  const bad = ImageIO.readImage(bytes, new LoadParameters("a.dds", 0, 0xffffffff, F.PIXEL_FORMAT_BC7_UNORM), new HostBitmap());
  assert.equal(bad.code, ImageIOResult.Code.ERROR_CONVERTING_FORMAT);
});

test("mip skipping drops the top level and reads the rest (DoReadHeader, Tr2DdsHandler.cpp:484-515)", () =>
{
  // 16x16 BGRA with 3 mips: 256 + 64 + 16 pixels; mip 1 is filled with 7s.
  const px = new Uint8Array((256 + 64 + 16) * 4);
  px.fill(7, 256 * 4, (256 + 64) * 4);
  const bytes = legacyDds(16, 16, 32, BGRA_MASKS, px, 3);
  const bitmap = new HostBitmap();
  assert.equal(ImageIO.readImage(bytes, new LoadParameters("a.dds", 1), bitmap).IsOk(), true);
  assert.equal(bitmap.GetWidth(), 8);
  assert.equal(bitmap.GetMipCount(), 2);
  assert.equal(bitmap.GetRawData()[0], 7);
});

test("HostBitmap is reachable by name through blue.classes", () =>
{
  assert.equal(blue.classes.CreateInstanceFromName("HostBitmap").constructor, HostBitmap);
});

test("the DDS format exposes Carbon's legacy clean-ups to direct readers", () =>
{
  assert.deepEqual([ ...CjsDdsFormat.expand24To32(new Uint8Array([ 1, 2, 3, 4, 5, 6 ])) ], [ 1, 2, 3, 0, 4, 5, 6, 0 ]);
  assert.deepEqual([ ...CjsDdsFormat.convertL8A8ToBgra(new Uint8Array([ 9, 200 ])) ], [ 9, 9, 9, 200 ]);

  const bytes = legacyDds(2, 1, 24, [ 0xFF0000, 0xFF00, 0xFF, 0 ], [ 1, 2, 3, 4, 5, 6 ]);
  const plain = CjsDdsFormat.read(bytes, { emit: "texture" });
  assert.equal(plain.pixelFormat, "bgr8unorm");
  assert.equal(plain.data.length, 6);

  const expanded = CjsDdsFormat.read(bytes, { emit: "texture", expandLegacy: true });
  assert.equal(expanded.pixelFormat, "bgrx8unorm");
  assert.deepEqual([ ...expanded.data ], [ 1, 2, 3, 0, 4, 5, 6, 0 ]);
  assert.equal(expanded.subresources[0].rowPitch, 8);
});

test("a block-compressed read decodes when a caller asks for RGBA or BGRA", () =>
{
  // One 4x4 DXT1 block: color0 = 0xF800 (red), all indices 0.
  const header = legacyDds(4, 4, 0, [ 0, 0, 0, 0 ], [ 0x00, 0xF8, 0x00, 0x00, 0, 0, 0, 0 ]);
  const v = new DataView(header.buffer);
  v.setUint32(80, 0x4, true);                  // DDPF_FOURCC
  v.setUint32(84, 0x31545844, true);           // "DXT1"

  const native = new HostBitmap();
  assert.equal(ImageIO.readImage(header, new LoadParameters("a.dds"), native).IsOk(), true);
  assert.equal(native.GetFormat(), F.PIXEL_FORMAT_BC1_UNORM);

  const rgba = new HostBitmap();
  assert.equal(ImageIO.readImage(header, new LoadParameters("a.dds", 0, 0xffffffff, F.PIXEL_FORMAT_R8G8B8A8_UNORM), rgba).IsOk(), true);
  assert.equal(rgba.GetFormat(), F.PIXEL_FORMAT_R8G8B8A8_UNORM);
  assert.deepEqual([ ...rgba.GetRawData().subarray(0, 4) ], [ 255, 0, 0, 255 ]);

  const bgra = new HostBitmap();
  assert.equal(ImageIO.readImage(header, new LoadParameters("a.dds", 0, 0xffffffff, F.PIXEL_FORMAT_B8G8R8A8_UNORM), bgra).IsOk(), true);
  assert.deepEqual([ ...bgra.GetRawData().subarray(0, 4) ], [ 0, 0, 255, 255 ]);
});

test("PNG reads into a HostBitmap through the async path, as BGRA", async () =>
{
  const { CjsPngFormat } = await import("../../npm/dist/resource/formats/png/index.js");
  const png = await CjsPngFormat.writeAsync({ width: 1, height: 1, data: new Uint8Array([ 10, 20, 30, 40 ]) });

  const sync = ImageIO.readImage(png, new LoadParameters("a.png"), new HostBitmap());
  assert.equal(sync.code, ImageIOResult.Code.METHOD_NOT_SUPPORTED);

  const bitmap = new HostBitmap();
  const r = await ImageIO.readImageAsync(png, new LoadParameters("a.png"), bitmap);
  assert.equal(r.IsOk(), true, r.GetErrorMessage());
  assert.equal(bitmap.GetFormat(), F.PIXEL_FORMAT_B8G8R8A8_UNORM);
  assert.deepEqual([ ...bitmap.GetRawData() ], [ 30, 20, 10, 40 ]);
});
