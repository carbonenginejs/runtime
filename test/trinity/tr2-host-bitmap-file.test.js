// Tr2HostBitmap: CreateFromFile, the four-byte pixel accessors, their script forms and the
// pixel counters (trinity/trinity/Tr2HostBitmap.cpp:486-510, 574-834; Tr2HostBitmap_Blue.cpp).
// Expected values are written from the Carbon source, not from our implementation.
import assert from "node:assert/strict";
import { test } from "node:test";
import { Tr2HostBitmap } from "../../npm/dist/trinity/core/Tr2HostBitmap.js";
import { CjsBmpFormat } from "../../npm/dist/resource/formats/bmp/index.js";
import { ImageIO } from "../../npm/dist/resource/imageio/index.js";
import { BlueResFileSystemForm, CjsBluePaths, IBlueResFileSystem } from "../../npm/dist/global/blue/index.js";
import { installBlueServices } from "../../npm/dist/global/blue/blue.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { PixelFormat as F, TextureType } from "../../npm/dist/global/consts/renderContext/index.js";
import { ALResult } from "../../npm/dist/trinityal/ALResult.js";

/** A 32-bit BMP: pixel (x, y) is b = 10 + x, g = 20 + y, r = 30, a = 200 (top-left origin). */
function bmp(width, height)
{
  const stride = width * 4;
  const start = 54;
  const bytes = new Uint8Array(start + stride * height);
  const view = new DataView(bytes.buffer);
  view.setUint16(0, 0x4d42, true);
  view.setUint32(2, bytes.length, true);
  view.setUint32(10, start, true);
  view.setUint32(14, 40, true);
  view.setUint32(18, width, true);
  view.setUint32(22, height, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 32, true);
  view.setUint32(34, stride * height, true);

  for (let y = 0; y < height; y++)
  {
    for (let x = 0; x < width; x++)
    {
      bytes.set([ 10 + x, 20 + y, 30, 200 ], start + (height - 1 - y) * stride + x * 4);
    }
  }

  return bytes;
}

/** A res file system answering from a map of path to bytes. */
function memoryFileSystem(files)
{
  const FileSystem = class extends IBlueResFileSystem
  {
    static protocols = [ "res" ];
    static forms = [ BlueResFileSystemForm.BYTES ];
    FileExists(path) { return files.has(path); }
    IsDirectory() { return false; }
    GetDirectoryContents() {}
    ResolvePathW(path) { return files.has(path) ? path : null; }
    async GetStreamFromPath(path, request)
    {
      return files.has(path) ? { form: request.form, data: files.get(path) } : null;
    }
  };

  return new FileSystem();
}

/** Installs a paths service over `files` for the test and restores the previous services after it. */
function withFiles(t, files)
{
  const paths = new CjsBluePaths();
  paths.RegisterFileSystem(memoryFileSystem(files));
  const previous = installBlueServices({ paths }, false);
  ImageIO.registerImageHandler(CjsBmpFormat);
  t.after(() => installBlueServices(previous, previous.running));
}

/** An RGBA-ish 4-byte bitmap filled with `value`. */
function filled(width, height, value = 0)
{
  const bitmap = new Tr2HostBitmap();
  assert.equal(bitmap.Create(width, height, 1, F.PIXEL_FORMAT_B8G8R8A8_UNORM), true);
  for (let y = 0; y < height; y++)
  {
    for (let x = 0; x < width; x++) bitmap.SetPixel(x, y, value);
  }
  return bitmap;
}

test("CreateFromFile reads a res path through blue.paths and ImageIO (cpp:486-510)", async t =>
{
  withFiles(t, new Map([ [ "res:/a.bmp", bmp(3, 2) ] ]));
  const bitmap = new Tr2HostBitmap();

  const loading = bitmap.CreateFromFile("res:/a.bmp");
  assert.ok(loading instanceof Promise, "a JavaScript file read is asynchronous");
  assert.equal(await loading, true);
  assert.equal(bitmap.width, 3);
  assert.equal(bitmap.height, 2);
  assert.equal(bitmap.format, F.PIXEL_FORMAT_B8G8R8A8_UNORM);
  // Row 1, column 2: b = 12, g = 21, r = 30, a = 200.
  assert.deepEqual([ ...bitmap.GetRawData(2, 1).subarray(0, 4) ], [ 12, 21, 30, 200 ]);
});

test("CreateFromFile destroys first and answers false for every failure (cpp:488-509)", async t =>
{
  withFiles(t, new Map([ [ "res:/a.bmp", bmp(2, 2) ], [ "res:/bad.bmp", new Uint8Array(8) ], [ "res:/a.unknown", bmp(2, 2) ] ]));
  const bitmap = new Tr2HostBitmap();
  assert.equal(await bitmap.CreateFromFile("res:/a.bmp"), true);
  assert.equal(bitmap.IsValid(), true);

  assert.equal(await bitmap.CreateFromFile(""), false, "an empty name fails");
  assert.equal(bitmap.IsValid(), false, "after Destroy");

  assert.equal(await bitmap.CreateFromFile("res:/a.bmp"), true);
  assert.equal(await bitmap.CreateFromFile("res:/missing.bmp"), false, "no file system has it");
  assert.equal(bitmap.IsValid(), false);
  assert.equal(await bitmap.CreateFromFile("nonsense"), false, "a path with no protocol is an open error");
  assert.equal(await bitmap.CreateFromFile("res:/bad.bmp"), false, "an undecodable image is a read error");
  assert.equal(await bitmap.CreateFromFile("res:/a.unknown"), false, "no handler for the extension");
});

test("the script CreateFromFile answers a description or None, and rejects a non-string (Blue.cpp:157-205)", async t =>
{
  withFiles(t, new Map([ [ "res:/a.bmp", bmp(4, 3) ] ]));
  const bitmap = new Tr2HostBitmap();

  assert.deepEqual(await bitmap._PyCreateFromFile("res:/a.bmp"), {
    Width: 4, Height: 3, Depth: 1, MipLevels: 1, Format: F.PIXEL_FORMAT_B8G8R8A8_UNORM, ResourceType: 0, ImageFileFormat: 0
  });
  assert.equal(await bitmap._PyCreateFromFile("res:/missing.bmp"), null);
  await assert.rejects(bitmap._PyCreateFromFile(7), /Expected a filepath string/u);

  const row = CjsSchema.getMethod(Tr2HostBitmap, "_PyCreateFromFile");
  assert.equal(row.exposure.macro, "MAP_METHOD_AS_METHOD");
  assert.equal(row.exposure.name, "CreateFromFile");
  assert.equal(CjsSchema.getMethod(Tr2HostBitmap, "CreateFromFile").impl.status, "adapted");
});

test("SetPixel and GetPixel__Data copy four bytes, with Carbon's off-by-one bounds (cpp:652-685)", () =>
{
  const bitmap = filled(2, 2);

  assert.equal(bitmap.SetPixel(1, 0, 0x80402010), true);
  assert.deepEqual([ ...bitmap.GetRawData(1, 0).subarray(0, 4) ], [ 0x10, 0x20, 0x40, 0x80 ], "bytes in little-endian order, as memcpy of an int");
  assert.equal(bitmap.GetPixel__Data(1, 0), 0x80402010);
  assert.equal(bitmap.GetPixel__Data(0, 0), 0);

  assert.equal(bitmap.SetPixel(-1, 0, 1), false);
  assert.equal(bitmap.SetPixel(0, -1, 1), false);
  assert.equal(bitmap.SetPixel(3, 0, 1), false);
  assert.equal(bitmap.SetPixel(0, 3, 1), false);

  // bug (cpp:658-659): the test is `> width`, so x == width lands on the next row's first pixel.
  assert.equal(bitmap.SetPixel(2, 0, 0x01020304), true);
  assert.equal(bitmap.GetPixel__Data(0, 1), 0x01020304);
  // y == height writes past the end in C++; the typed array drops it, and the call still answers true.
  assert.equal(bitmap.SetPixel(0, 2, 0x0a0b0c0d), true);
  assert.equal(bitmap.GetRawDataSize(), 16);
});

test("the pixel accessors refuse bitmaps that are not valid, uncompressed and four bytes per pixel (cpp:654, 671)", () =>
{
  const empty = new Tr2HostBitmap();
  assert.equal(empty.SetPixel(0, 0, 1), false);
  assert.equal(empty.GetPixel__Data(0, 0), null);

  const oneByte = new Tr2HostBitmap();
  oneByte.Create(2, 2, 1, F.PIXEL_FORMAT_R8_UNORM);
  assert.equal(oneByte.SetPixel(0, 0, 1), false);

  const compressed = new Tr2HostBitmap();
  compressed.Create(4, 4, 1, F.PIXEL_FORMAT_BC1_UNORM);
  assert.equal(compressed.SetPixel(0, 0, 1), false);
});

test("the script SetPixel/GetPixel take one tuple or one sequence of tuples (cpp:687-771)", () =>
{
  const bitmap = filled(2, 2);

  bitmap._PySetPixel(0, 0, 5);
  assert.equal(bitmap._PyGetPixel(0, 0), 5);

  bitmap._PySetPixel([ [ 1, 0, 6 ], [ 0, 1, -1 ] ]);
  assert.deepEqual(bitmap._PyGetPixel([ [ 1, 0 ], [ 0, 1 ] ]), [ 6, -1 ], "values come back as signed Python ints");

  assert.equal(bitmap._PyGetPixel(-1, 0), null, "an unreadable pixel is None");
  assert.equal(bitmap._PySetPixel(-1, 0, 1), null, "the three-argument form ignores a failed write (cpp:714)");
  assert.throws(() => bitmap._PySetPixel([ [ -1, 0, 1 ] ]), /returns NULL without setting an exception/u, "the sequence form fails on one (cpp:731)");
  assert.throws(() => bitmap._PySetPixel(1, 2), TypeError, "a tuple that is not three integers is a parse error");
  assert.throws(() => bitmap._PySetPixel(1.5, 0, 0), TypeError);
  assert.throws(() => bitmap._PySetPixel(0, 0, 0x80000000), TypeError, "'i' rejects values above INT_MAX");
  assert.throws(() => bitmap._PySetPixel(7), /Expected sequence of tuples/u);
  assert.throws(() => bitmap._PyGetPixel(7), /Expected sequence of tuples/u);

  const row = CjsSchema.getMethod(Tr2HostBitmap, "_PySetPixel");
  assert.equal(row.exposure.macro, "MAP_METHOD_AS_METHOD");
  assert.equal(row.exposure.name, "SetPixel");
  assert.equal(CjsSchema.getMethod(Tr2HostBitmap, "_PyGetPixel").exposure.name, "GetPixel");
});

test("PySetPixels fills a background, sets listed pixels and skips the ones outside (cpp:773-821)", () =>
{
  const bitmap = filled(3, 2);

  assert.equal(bitmap._PySetPixels(0x11, [ [ 2, 1, 0xffffffff ], [ 3, 0, 9 ], [ 0, -1, 9 ] ]), null);
  assert.equal(bitmap.GetPixel__Data(0, 0), 0x11);
  assert.equal(bitmap.GetPixel__Data(2, 1), 0xffffffff, "an unsigned 'I' value");
  assert.equal(bitmap.CountPixelsOfValue("rgba", 0x11), 0);

  const invalid = new Tr2HostBitmap();
  assert.equal(invalid._PySetPixels(1, []), null, "an invalid bitmap answers None before parsing");

  const mipped = new Tr2HostBitmap();
  mipped.Create(4, 4, 0, F.PIXEL_FORMAT_B8G8R8A8_UNORM);
  assert.equal(mipped._PySetPixels(7, [ [ 0, 0, 1 ] ]), null);
  assert.equal(mipped.GetPixel__Data(1, 1), 0, "not single-mip: untouched");

  // bug (cpp:803): the sequence is optional in the parse, then dereferenced.
  assert.throws(() => bitmap._PySetPixels(1), TypeError);
});

test("CountPixelsOfValue and IsMonochrome read channels of 0xAARRGGBB (cpp:574-650)", () =>
{
  const bitmap = filled(2, 2);
  bitmap.SetPixel(0, 0, 0xff_05_05_05);
  bitmap.SetPixel(1, 0, 0x00_05_09_05);
  bitmap.SetPixel(0, 1, 0x00_05_05_05);

  assert.equal(bitmap.CountPixelsOfValue("rgb", 5), 2);
  assert.equal(bitmap.CountPixelsOfValue("r", 5), 3);
  assert.equal(bitmap.CountPixelsOfValue("g", 9), 1);
  assert.equal(bitmap.CountPixelsOfValue("a", 255), 1);
  assert.equal(bitmap.CountPixelsOfValue("", 123), 4, "no channel selected: every pixel matches");

  assert.equal(bitmap.IsMonochrome(), false, "pixel (1,0) has g != r");
  bitmap.SetPixel(1, 0, 0x00_05_05_05);
  assert.equal(bitmap.IsMonochrome(), true, "alpha is ignored; each pixel's own r, g and b agree");
  bitmap.SetPixel(1, 1, 0x7f_01_02_01);
  assert.equal(bitmap.IsMonochrome(), false, "pixel (1,1) has g != r");

  const none = new Tr2HostBitmap();
  assert.equal(none.CountPixelsOfValue("r", 0), 0);
  assert.equal(none.IsMonochrome(), false);

  assert.equal(CjsSchema.getMethod(Tr2HostBitmap, "CountPixelsOfValue").impl.status, "implemented");
});

test("ChangeFormatFromScript answers an ALResult and carries the ChangeFormat row (cpp:31-34)", () =>
{
  const bitmap = filled(2, 2);

  assert.equal(bitmap.ChangeFormatFromScript(F.PIXEL_FORMAT_R8G8B8A8_UNORM), ALResult.S_OK);
  assert.equal(bitmap.format, F.PIXEL_FORMAT_R8G8B8A8_UNORM);
  assert.equal(bitmap.ChangeFormatFromScript(F.PIXEL_FORMAT_BC1_UNORM), ALResult.E_FAIL);
  assert.equal(new Tr2HostBitmap().ChangeFormatFromScript(F.PIXEL_FORMAT_R8G8B8A8_UNORM), ALResult.E_FAIL);

  const row = CjsSchema.getMethod(Tr2HostBitmap, "ChangeFormatFromScript");
  assert.equal(row.exposure.macro, "MAP_METHOD_AND_WRAP");
  assert.equal(row.exposure.name, "ChangeFormat");
  assert.equal(row.impl.status, "implemented");
});

test("the script raw-data accessors hand out views of the bytes (Blue.cpp:70-154)", () =>
{
  const bitmap = filled(2, 2, 0x01020304);
  const [ view, width, height, pitch ] = bitmap._PyGetRawData();

  assert.deepEqual([ width, height, pitch, view.length ], [ 2, 2, 8, 16 ]);
  view[0] = 0xaa;
  assert.equal(bitmap.GetRawData()[0], 0xaa, "the view is writable and shares the bytes");
  assert.equal(new Tr2HostBitmap()._PyGetRawData(), false);

  const mipped = new Tr2HostBitmap();
  mipped.Create(4, 4, 0, F.PIXEL_FORMAT_B8G8R8A8_UNORM);
  const [ mip1, w1, h1, p1 ] = mipped._PyGetMipRawData(1);
  assert.deepEqual([ w1, h1, p1, mip1.length ], [ 2, 2, 8, 16 ]);
  assert.equal(mipped._PyGetMipRawData(-1), false);
  assert.throws(() => mipped._PyGetMipRawData(9), RangeError);

  mipped._PySetMipRawData(1, new Uint8Array(16).fill(7));
  assert.equal(mipped._PyGetMipRawData(1)[0][15], 7);
  assert.throws(() => mipped._PySetMipRawData(1, new Uint8Array(15)), /buffer too small/u);
  assert.throws(() => mipped._PySetMipRawData(9, new Uint8Array(64)), /mip level out of range/u);
  assert.throws(() => new Tr2HostBitmap()._PySetMipRawData(0, new Uint8Array(4)), /invalid bitmap/u);

  assert.equal(CjsSchema.getMethod(Tr2HostBitmap, "_PyGetRawData").exposure.name, "GetRawData");
  assert.equal(CjsSchema.getMethod(Tr2HostBitmap, "_PyGetMipRawData").exposure.name, "GetMipRawData");
  assert.equal(CjsSchema.getMethod(Tr2HostBitmap, "_PySetMipRawData").exposure.name, "SetMipRawData");
});

test("the base ImageIO operations Carbon exposes through Tr2HostBitmap are not shadowed by stubs", () =>
{
  const bitmap = new Tr2HostBitmap();
  assert.equal(bitmap.Create(4, 4, 1, F.PIXEL_FORMAT_B8G8R8A8_UNORM), true);
  assert.equal(bitmap.Crop(0, 0, 2, 2), true);
  assert.equal(bitmap.width, 2);
  assert.equal(bitmap.Downsample2x2(), true);
  assert.equal(bitmap.width, 1);

  const cube = new Tr2HostBitmap();
  assert.equal(cube.CreateCube(4, 1, F.PIXEL_FORMAT_B8G8R8A8_UNORM), true);
  assert.equal(cube.imageType, TextureType.TEX_TYPE_CUBE);
});
