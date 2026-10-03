import { CjsGifFormat } from "../../npm/dist/resource/formats/gif/index.js";
import { CjsJpegFormat } from "../../npm/dist/resource/formats/jpeg/index.js";
import { CjsPngFormat } from "../../npm/dist/resource/formats/png/index.js";
import { CjsPsdFormat } from "../../npm/dist/resource/formats/psd/index.js";
import { CjsTgaFormat } from "../../npm/dist/resource/formats/tga/index.js";
import { CjsVtaFormat } from "../../npm/dist/resource/formats/vta/index.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";

import assert from "node:assert/strict";
import test from "node:test";
import { buildVta } from "../support/vtaFixture.js";

import { ImageIO, HostBitmap, LoadParameters, ImageIOResult, Metadata } from "../../npm/dist/resource/imageio/index.js";
import { CjsDdsFormat } from "../../npm/dist/resource/formats/dds/index.js";
import { PixelFormat as F, TextureType } from "../../npm/dist/global/consts/renderContext/index.js";
import { blue, CjsBlueResMan } from "../../npm/dist/global/blue/index.js";

// The composing application registers formats once, with its resource manager.
for (const Format of [ CjsDdsFormat, CjsGifFormat, CjsJpegFormat, CjsPngFormat, CjsPsdFormat, CjsTgaFormat, CjsVtaFormat ])
  blue.resMan.RegisterFormat(Format);

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

test("VTA static loading selects grid zero and frame zero with volume dimensions and metadata", async () =>
{
  const bytes = buildVta({
    grids: [ { name: "density", encoding: 0, width: 2, height: 1, depth: 2 },
      { name: "temperature", encoding: 0, width: 1, height: 1, depth: 1 } ],
    frames: [ [ [ 1, 2, 3, 4 ], [ 90 ] ], [ [ 5, 6, 7, 8 ], [ 91 ] ] ],
    metadata: { author: "fixture" }
  });
  const bitmap = new HostBitmap(), metadata = new Metadata();
  const parameters = new LoadParameters("volume.VTA", 3);
  assert.equal(ImageIO.readImage(bytes, parameters, bitmap).code, ImageIOResult.Code.METHOD_NOT_SUPPORTED);
  const result = await ImageIO.readImageAsync(bytes, parameters, bitmap, metadata);
  assert.equal(result.IsOk(), true, result.GetErrorMessage());
  assert.equal(bitmap.GetType(), TextureType.TEX_TYPE_3D);
  assert.equal(bitmap.GetFormat(), F.PIXEL_FORMAT_R8_UNORM);
  assert.deepEqual([ bitmap.GetWidth(), bitmap.GetHeight(), bitmap.GetDepth(), bitmap.GetMipCount() ], [ 2, 1, 2, 1 ]);
  assert.deepEqual(Array.from(bitmap.GetRawData()), [ 1, 2, 3, 4 ]);
  assert.deepEqual(metadata.metadata, [ [ "author", "fixture" ] ]);

  const allocationFailure = { CreateVolume: () => false };
  assert.equal((await ImageIO.readImageAsync(bytes, parameters, allocationFailure)).code, ImageIOResult.Code.OUT_OF_MEMORY);
});

test("VTA static loading rejects zero frames or zero grids (VtaHandler.cpp:512-515)", async () =>
{
  for (const fixture of [
    { grids: [], frames: [ [] ] },
    { grids: [ { name: "density", encoding: 0, width: 1, height: 1, depth: 1 } ], frames: [] }
  ])
  {
    const result = await ImageIO.readImageAsync(buildVta(fixture), new LoadParameters("empty.vta"), new HostBitmap());
    assert.equal(result.code, ImageIOResult.Code.INVALID_DATA);
  }
});


const imagePayload = { width: 1, height: 1, data: new Uint8Array([ 80, 120, 160, 255 ]) };
const imageCases = [
  [ "dds", CjsDdsFormat, () => legacyDds(1, 1, 32, BGRA_MASKS, [ 160, 120, 80, 255 ]), false ],
  [ "gif", CjsGifFormat, () => Uint8Array.from([
    71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 128, 0, 0,
    80, 120, 160, 0, 0, 0, 44, 0, 0, 0, 0, 1, 0, 1, 0, 0,
    2, 2, 68, 1, 0, 59
  ]), false ],
  [ "jpg", CjsJpegFormat, () => CjsJpegFormat.write(imagePayload), false ],
  [ "png", CjsPngFormat, () => CjsPngFormat.writeAsync(imagePayload), true ],
  [ "psd", CjsPsdFormat, () => CjsPsdFormat.write(imagePayload), false ],
  [ "tga", CjsTgaFormat, () => CjsTgaFormat.write(imagePayload), false ],
  [ "vta", CjsVtaFormat, () => buildVta({
    grids: [ { name: "density", encoding: 0, width: 1, height: 1, depth: 1 } ],
    frames: [ [ [ 80 ] ] ], metadata: { author: "synthetic" }
  }), true ]
];

for (const [ extension, Format, makeBytes, asyncOnly ] of imageCases)
{
  test(`ResMan-only ${extension} registration preserves ImageIO reads and save results`, async () =>
  {
    const bytes = await makeBytes();
    const parameters = new LoadParameters(`sample.${extension.toUpperCase()}`);
    const expected = new HostBitmap(), expectedMetadata = new Metadata();
    const actual = new HostBitmap(), actualMetadata = new Metadata();
    assert.equal(ImageIO.getImageHandler(extension), Format.carbon);
    const direct = await Format.carbon.readImageAsync(bytes, parameters, expected, expectedMetadata);
    const routed = await ImageIO.readImageAsync(bytes, parameters, actual, actualMetadata);
    assert.equal(direct.code, ImageIOResult.Code.OK);
    assert.equal(routed.code, direct.code);
    assert.deepEqual([ actual.GetWidth(), actual.GetHeight(), actual.GetDepth(), actual.GetFormat() ],
      [ expected.GetWidth(), expected.GetHeight(), expected.GetDepth(), expected.GetFormat() ]);
    assert.deepEqual(actual.GetRawData(), expected.GetRawData());
    assert.deepEqual(actualMetadata, expectedMetadata);
    if (extension !== "jpg") assert.deepEqual(Array.from(actual.GetRawData()),
      extension === "vta" ? [ 80 ] : [ 160, 120, 80, 255 ]);
    const sync = new HostBitmap();
    assert.equal(ImageIO.readImage(bytes, parameters, sync).code,
      asyncOnly ? ImageIOResult.Code.METHOD_NOT_SUPPORTED : ImageIOResult.Code.OK);
    if (!asyncOnly) assert.deepEqual(sync.GetRawData(), actual.GetRawData());

    const saveBitmap = new HostBitmap();
    saveBitmap.Create(1, 1, 1, F.PIXEL_FORMAT_B8G8R8A8_UNORM);
    saveBitmap.GetRawData().set([ 160, 120, 80, 255 ]);
    const expectedSaveCode = extension === "psd" ? ImageIOResult.Code.OK : ImageIOResult.Code.METHOD_NOT_SUPPORTED;
    assert.equal(ImageIO.isSaveSupported(parameters.filename, saveBitmap).code, expectedSaveCode);
    assert.equal(Format.carbon.isSaveSupported(saveBitmap).code, expectedSaveCode);
    const directSave = Format.carbon.save(saveBitmap);
    const routedSave = ImageIO.saveImage(parameters.filename, saveBitmap);
    assert.equal(routedSave.result.code, expectedSaveCode);
    assert.equal(routedSave.result.code, directSave.result.code);
    assert.deepEqual(routedSave.bytes, directSave.bytes);
    if (routedSave.result.IsOk())
    {
      const roundTrip = new HostBitmap();
      assert.equal(ImageIO.readImage(routedSave.bytes, parameters, roundTrip).code, ImageIOResult.Code.OK);
      assert.deepEqual(roundTrip.GetRawData(), saveBitmap.GetRawData());
    }
  });
}

test("ImageIO observes active ResMan replacement, late registration and removal without a second registration", async t =>
{
  const previous = blue.resMan;
  t.after(() => { blue.resMan = previous; });
  blue.resMan = new CjsBlueResMan();
  const parameters = new LoadParameters("late.PSD");
  const bytes = CjsPsdFormat.write(imagePayload);
  const bitmap = new HostBitmap();
  assert.equal(ImageIO.readImage(bytes, parameters, bitmap).code, ImageIOResult.Code.UNRECOGNIZED_IMAGE_TYPE);
  assert.equal((await ImageIO.readImageAsync(bytes, parameters, bitmap)).code, ImageIOResult.Code.UNRECOGNIZED_IMAGE_TYPE);
  assert.equal(ImageIO.isSaveSupported(parameters.filename, bitmap).code, ImageIOResult.Code.UNRECOGNIZED_IMAGE_TYPE);
  assert.equal(ImageIO.saveImage(parameters.filename, bitmap).result.code, ImageIOResult.Code.UNRECOGNIZED_IMAGE_TYPE);

  blue.resMan.RegisterFormat(CjsPsdFormat);
  assert.equal(ImageIO.readImage(bytes, parameters, bitmap).code, ImageIOResult.Code.OK);
  assert.equal(ImageIO.isSaveSupported(parameters.filename, bitmap).code, ImageIOResult.Code.OK);
  assert.equal(ImageIO.saveImage(parameters.filename, bitmap).result.code, ImageIOResult.Code.OK);
  blue.resMan.RegisterFormat(CjsPsdFormat);
  assert.equal(blue.resMan.GetFormats("psd").length, 1);

  blue.resMan.formats.delete("psd");
  assert.equal(ImageIO.getImageHandler("psd"), null);
  assert.equal(ImageIO.saveImage(parameters.filename, bitmap).result.code, ImageIOResult.Code.UNRECOGNIZED_IMAGE_TYPE);
});

test("ImageIO ignores non-image formats and retains first registered image handler order", t =>
{
  const previous = blue.resMan;
  t.after(() => { blue.resMan = previous; });
  blue.resMan = new CjsBlueResMan();
  class DataFormat { static extensions = [ ".psd" ]; }
  class FirstImage extends CjsPsdFormat {}
  class SecondImage extends CjsPsdFormat {}
  blue.resMan.RegisterFormat(DataFormat);
  assert.equal(ImageIO.getImageHandler("psd"), null);
  blue.resMan.RegisterFormat(FirstImage).RegisterFormat(SecondImage);
  assert.equal(ImageIO.getImageHandler("psd"), FirstImage.carbon);
  blue.resMan.RegisterFormat(FirstImage);
  assert.equal(ImageIO.getImageHandler("psd"), SecondImage.carbon, "ResMan owns re-registration order");
});

test("ImageIO registration adaptation is recorded in schema metadata", () =>
{
  for (const name of [ "getImageHandler", "readImage", "readImageAsync", "isSaveSupported", "saveImage" ])
    assert.equal(CjsSchema.getMethod(ImageIO, name).impl.status, "adapted");
});
