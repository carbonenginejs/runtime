import assert from "node:assert/strict";
import test from "node:test";

import { HostBitmap, ImageUtility, BitmapDimensions } from "../../npm/dist/global/imageio/index.js";
import { PixelFormat as F, TextureType as T } from "../../npm/dist/global/consts/renderContext/index.js";

const BGRA = F.PIXEL_FORMAT_B8G8R8A8_UNORM;
const BGRX = F.PIXEL_FORMAT_B8G8R8X8_UNORM;
const RGBA = F.PIXEL_FORMAT_R8G8B8A8_UNORM;
const R8 = F.PIXEL_FORMAT_R8_UNORM;
const R8G8 = F.PIXEL_FORMAT_R8G8_UNORM;
const BC1 = F.PIXEL_FORMAT_BC1_UNORM;
const BC3 = F.PIXEL_FORMAT_BC3_UNORM;

function bitmap(width, height, mips, format)
{
  const b = new HostBitmap();
  assert.equal(b.Create(width, height, mips, format), true);
  return b;
}

test("a new bitmap is invalid and Destroy keeps the sizes (HostBitmap.cpp:230-240)", () =>
{
  const b = bitmap(8, 4, 1, BGRA);
  assert.equal(b.IsValid(), true);
  b.Destroy();
  assert.equal(b.IsValid(), false);
  assert.equal(b.GetWidth(), 8);
  assert.equal(b.GetFormat(), F.PIXEL_FORMAT_UNKNOWN);
  assert.equal(new HostBitmap().GetRawData(), null);
});

test("Create sizes an uncompressed full chain, and refuses bad compressed sizes", () =>
{
  // 8x4 BGRA full chain: 8x4 + 4x2 + 2x1 + 1x1 pixels = 32+8+2+1 = 43 px * 4.
  const b = bitmap(8, 4, 0, BGRA);
  assert.equal(b.GetRawDataSize(), 43 * 4);
  assert.equal(new HostBitmap().Create(6, 4, 1, BC1), false);
  assert.equal(new HostBitmap().Create(0, 4, 1, BGRA), false);
  assert.equal(new HostBitmap().Create(4, 4, 1, F.PIXEL_FORMAT_SENTINEL), false);
});

test("compressed sizes round each mip up to a whole block, minimum one block (HostBitmap.cpp:18-26)", () =>
{
  // 8x8 BC1 full chain (4 levels): 2x2 blocks, then 1 block for 4x4, 2x2, 1x1 = 4+1+1+1 blocks * 8 bytes.
  const b = bitmap(8, 8, 0, BC1);
  assert.equal(b.GetRawDataSize(), 7 * 8);
  assert.equal(b.GetPitch(), 2 * 8);
});

test("GetMipRawData walks the chain and places array elements at size / arraySize", () =>
{
  const b = new HostBitmap();
  assert.equal(b.Create2DArray(4, 4, 0, 2, BGRA), true);
  const element = (16 + 4 + 1) * 4;
  assert.equal(b.GetRawDataSize(), element * 2);
  assert.equal(b.GetRawDataSize() - b.GetMipRawData(1, 0).length, 16 * 4);
  assert.equal(b.GetRawDataSize() - b.GetMipRawData(2, 0).length, 20 * 4);
  assert.equal(b.GetRawDataSize() - b.GetMipRawData(0, 1).length, element);
  assert.equal(b.GetMipRawData(3, 0), null);
  assert.equal(b.GetMipRawData(0, 2), null);
});

test("quirk: a compressed mip offset steps GetMipHeight(i)/4 block rows (HostBitmap.cpp:448-453)", () =>
{
  // 8x8 BC1: level 0 is 2 block rows of 16 bytes; level 1 (4x4) one row of 8 bytes;
  // level 2 is 4 pixels high after rounding, so one more block row.
  const b = bitmap(8, 8, 0, BC1);
  assert.equal(b.GetRawDataSize() - b.GetMipRawData(1).length, 32);
  assert.equal(b.GetRawDataSize() - b.GetMipRawData(2).length, 40);
});

test("CreateCube, CreateVolume and CreateFromBitmapDimensions", () =>
{
  const cube = new HostBitmap();
  assert.equal(cube.CreateCube(2, 1, R8), true);
  assert.equal(cube.GetArraySize(), 6);
  assert.equal(cube.GetRawDataSize(), 24);

  const volume = new HostBitmap();
  assert.equal(volume.CreateVolume(2, 2, 2, 1, R8), true);
  assert.equal(volume.GetRawDataSize(), 8);

  const fromDims = new HostBitmap();
  assert.equal(fromDims.CreateFromBitmapDimensions(BitmapDimensions.Texture2D(4, 2, 1, BGRA)), true);
  assert.equal(fromDims.GetRawDataSize(), 32);
  assert.equal(new HostBitmap().CreateFromBitmapDimensions(new BitmapDimensions()), false);
});

test("ChangeFormat relabels only between same-size uncompressed formats", () =>
{
  const b = bitmap(1, 1, 1, BGRA);
  assert.equal(b.ChangeFormat(RGBA), true);
  assert.equal(b.ChangeFormat(R8), false);
  assert.equal(b.ChangeFormat(BC1), false);
});

test("ConvertFormat covers Carbon's transitions and refuses the rest", () =>
{
  const b = bitmap(2, 1, 1, BGRX);
  b.GetRawData().set([ 1, 2, 3, 9, 4, 5, 6, 9 ]);
  assert.equal(b.ConvertFormat(BGRA), true);
  assert.deepEqual([ ...b.GetRawData() ], [ 1, 2, 3, 255, 4, 5, 6, 255 ]);

  assert.equal(b.ConvertFormat(RGBA), true);
  assert.deepEqual([ ...b.GetRawData() ], [ 3, 2, 1, 255, 6, 5, 4, 255 ]);
  assert.equal(b.ConvertFormat(BGRA), true);

  // quirk: BGRA -> R8 keeps byte 0, which is blue (HostBitmap.cpp:321-325).
  assert.equal(b.ConvertFormat(R8), true);
  assert.deepEqual([ ...b.GetRawData() ], [ 1, 4 ]);

  assert.equal(b.ConvertFormat(BGRX), true);
  assert.deepEqual([ ...b.GetRawData() ], [ 1, 1, 1, 255, 4, 4, 4, 255 ]);

  const rg = bitmap(1, 1, 1, R8G8);
  rg.GetRawData().set([ 7, 200 ]);
  assert.equal(rg.ConvertFormat(BGRA), true);
  assert.deepEqual([ ...rg.GetRawData() ], [ 7, 7, 7, 200 ]);

  assert.equal(bitmap(4, 4, 1, BC1).ConvertFormat(BGRA), false);
});

test("GenerateMipMaps box-filters each level and DropMipMaps undoes it", () =>
{
  const b = bitmap(2, 2, 1, R8);
  b.GetRawData().set([ 0, 4, 8, 12 ]);
  assert.equal(b.GenerateMipMaps(), true);
  assert.equal(b.GetMipCount(), 2);
  assert.deepEqual([ ...b.GetRawData() ], [ 0, 4, 8, 12, 6 ]);

  assert.equal(b.DropMipMaps(), true);
  assert.equal(b.GetMipCount(), 1);
  assert.deepEqual([ ...b.GetRawData() ], [ 0, 4, 8, 12 ]);

  // quirk: asking for more than the full chain fails with the mip count left at 0.
  const c = bitmap(2, 2, 1, R8);
  assert.equal(c.GenerateMipMaps(5), false);
  assert.equal(c.GetMipCount(), 0);
});

test("GenerateMipMaps keeps each array element's top level in place", () =>
{
  const b = new HostBitmap();
  b.Create2DArray(2, 2, 1, 2, R8);
  b.GetRawData().set([ 1, 1, 1, 1, 9, 9, 9, 9 ]);
  assert.equal(b.GenerateMipMaps(), true);
  assert.deepEqual([ ...b.GetRawData() ], [ 1, 1, 1, 1, 1, 9, 9, 9, 9, 9 ]);
});

test("Downsample2x2 halves in place; a full-chain bitmap fails as Carbon's wrap does", () =>
{
  const b = bitmap(2, 2, 1, R8);
  b.GetRawData().set([ 0, 4, 8, 12 ]);
  assert.equal(b.Downsample2x2(), true);
  assert.equal(b.GetWidth(), 1);
  assert.deepEqual([ ...b.GetRawData() ], [ 6 ]);

  const wrap = bitmap(4, 4, 0, R8);
  assert.equal(wrap.Downsample2x2(), false);
  assert.equal(wrap.IsValid(), false);
});

test("Crop compacts rows; quirk: an empty rectangle destroys and returns true", () =>
{
  const b = bitmap(3, 2, 1, R8);
  b.GetRawData().set([ 1, 2, 3, 4, 5, 6 ]);
  assert.equal(b.Crop(1, 0, 3, 2), true);
  assert.deepEqual([ ...b.GetRawData() ], [ 2, 3, 5, 6 ]);

  const e = bitmap(2, 2, 1, R8);
  assert.equal(e.Crop(1, 1, 1, 1), true);
  assert.equal(e.IsValid(), false);
});

test("RotateFaceClockwise turns (x, y) into (size-1-y, x)", () =>
{
  const b = bitmap(2, 2, 1, R8);
  b.GetRawData().set([ 1, 2, 3, 4 ]);
  assert.equal(b.RotateFaceClockwise(0, 1), true);
  assert.deepEqual([ ...b.GetRawData() ], [ 3, 1, 4, 2 ]);
});

test("ConvertCrossmapToCubemap takes the 3:4 cells and turns -Z half a turn", () =>
{
  const b = bitmap(3, 4, 1, R8);
  // cells (col,row) hold their face index + 10; -Z (1,3) is face 5.
  const cell = { "2,1": 10, "0,1": 11, "1,0": 12, "1,2": 13, "1,1": 14, "1,3": 15 };
  const data = b.GetRawData();
  for (let y = 0; y < 4; y++) for (let x = 0; x < 3; x++) data[y * 3 + x] = cell[`${x},${y}`] ?? 0;

  assert.equal(b.ConvertCrossmapToCubemap(), true);
  assert.equal(b.GetType(), T.TEX_TYPE_CUBE);
  assert.deepEqual([ ...b.GetRawData() ], [ 10, 11, 12, 13, 14, 15 ]);
});

test("PopulateMargin copies edges outward and leaves corners", () =>
{
  const b = bitmap(3, 3, 1, R8);
  b.GetRawData().set([ 0, 0, 0, 0, 7, 0, 0, 0, 0 ]);
  assert.equal(b.PopulateMargin(1), true);
  assert.deepEqual([ ...b.GetRawData() ], [ 0, 7, 0, 7, 7, 7, 0, 7, 0 ]);
});

test("CopyChannel copies a byte channel between same-shape bitmaps", () =>
{
  const a = bitmap(1, 1, 1, BGRA);
  const r = bitmap(1, 1, 1, R8);
  r.GetRawData()[0] = 99;
  assert.equal(a.CopyChannel(r, 0, 2), true);
  assert.equal(a.GetRawData()[2], 99);
  assert.equal(a.CopyChannel(r, 1, 0), false);
});

test("GetPixel reads BGRA, and quirk: x == width passes the bounds test (HostBitmap.cpp:1324)", () =>
{
  const b = bitmap(1, 1, 1, BGRA);
  b.GetRawData().set([ 51, 102, 153, 255 ]);
  const p = b.GetPixel(0, 0);
  assert.equal(p.b, Math.fround(51 / 255));
  assert.equal(p.r, Math.fround(153 / 255));
  assert.notEqual(b.GetPixel(1, 0), null);
  assert.equal(b.GetPixel(2, 0), null);
});

test("BC1 interpolates on the packed 565 value (ImageUtility.cpp:66-80)", () =>
{
  // color0 = 0xF800 (red), color1 = 0x001F (blue); all selectors 2.
  const block = new Uint8Array([ 0x00, 0xF8, 0x1F, 0x00, 0xAA, 0xAA, 0xAA, 0xAA ]);
  const packed = Math.floor((2 * 0xF800 + 0x001F) / 3);
  assert.equal(ImageUtility.getPixelColor_BC1(0, 0, 4, 0, block), ImageUtility.convertBGR565A8ToBGRA8(packed, 255));
});

test("bug: BC3 reads block 0 whatever the pixel (ImageUtility.cpp:101-110)", () =>
{
  const two = new Uint8Array(32);
  two.set([ 255, 255 ], 0);
  two.set([ 0, 0 ], 16);
  assert.equal(ImageUtility.getPixelColor_BC3(4, 0, 8, 0, two) >>> 24, 255);
});

test("bug: BC3 alpha-index bytes are sign-extended as MSVC chars", () =>
{
  // alpha0 > alpha1; mask byte 0 = 0x80 -> signed -128 fills the upper bits,
  // so pixel (3,0), bits 9-11, reads index 7 instead of 0.
  const block = new Uint8Array(16);
  block.set([ 200, 100, 0x80, 0, 0, 0, 0, 0 ]);
  const alpha = ImageUtility.getPixelColor_BC3(3, 0, 4, 0, block) >>> 24;
  assert.equal(alpha, Math.floor((1 * 200 + 6 * 100 + 3) / 7));
});

test("GetAverageColor samples BGRX and treats X as opaque", () =>
{
  const b = bitmap(2, 2, 1, BGRX);
  b.GetRawData().set([ 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0 ]);
  const c = b.GetAverageColor();
  assert.equal(c.b > 0, true);
  assert.equal(c.a, Math.fround(Math.fround(Math.fround(1 / 1) / 255) * 255));
});

test("Swap exchanges everything, as Carbon's move assignment does", () =>
{
  const a = bitmap(2, 2, 1, R8);
  const b = bitmap(4, 4, 1, BGRA);
  a.Swap(b);
  assert.equal(a.GetWidth(), 4);
  assert.equal(a.GetFormat(), BGRA);
  assert.equal(b.GetRawDataSize(), 4);
});
