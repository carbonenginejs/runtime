import assert from "node:assert/strict";
import test from "node:test";

import { CjsPngFormat } from "../../../../src/resource/formats/png/index.js";
import { CjsJpegFormat } from "../../../../src/resource/formats/jpeg/index.js";
import { CjsTgaFormat } from "../../../../src/resource/formats/tga/index.js";
import { BitmapDimensions, HostBitmap, ImageIOResult } from "#imageio";
import { PixelFormat, TextureType } from "#consts/render-context";

const OK = ImageIOResult.Code.OK;
const REFUSED = ImageIOResult.Code.SAVE_NOT_SUPPORTED;

/** A 2x2 B8G8R8A8 bitmap: red, green / blue, white, each byte stored B, G, R, A. */
function bgraBitmap()
{
    const bitmap = new HostBitmap();
    assert.ok(bitmap.Create(2, 2, 1, PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM));
    const pitch = bitmap.GetMipPitch(0);
    const data = bitmap.GetMipRawData(0);
    const pixels = [ [ 0, 0, 255, 255 ], [ 0, 255, 0, 255 ], [ 255, 0, 0, 255 ], [ 255, 255, 255, 255 ] ];
    pixels.forEach((bgra, index) => data.set(bgra, Math.floor(index / 2) * pitch + (index % 2) * 4));
    return bitmap;
}

/** RGBA of the same four pixels, row by row. */
const RGBA = [ 255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255 ];

const dims = (type, format, arraySize = 1) => BitmapDimensions.create__AllFields(type, format, 4, 4, 1, 1, arraySize);

test("each format keeps Carbon's dimension check and accepts any convertible format", () =>
{
    const rgba = PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM;
    const block = PixelFormat.PIXEL_FORMAT_BC1_UNORM;

    for (const Format of [ CjsPngFormat, CjsJpegFormat, CjsTgaFormat ])
    {
        assert.equal(Format.isSaveSupported(dims(TextureType.TEX_TYPE_2D, rgba)).code, OK, Format.className);
        // Block-compressed: Carbon refuses, ours converts.
        assert.equal(Format.isSaveSupported(dims(TextureType.TEX_TYPE_2D, block)).code, OK, `${Format.className} BC1`);
        assert.equal(Format.isSaveSupported(dims(TextureType.TEX_TYPE_2D, rgba, 2)).code, REFUSED, `${Format.className} array`);
        assert.equal(Format.isSaveSupported(dims(TextureType.TEX_TYPE_CUBE, rgba)).code, REFUSED, `${Format.className} cube`);
    }

    // Tr2PngHandler.cpp:511-517 takes 1D or 2D; the JPEG and TGA handlers take 2D only.
    assert.equal(CjsPngFormat.isSaveSupported(dims(TextureType.TEX_TYPE_1D, rgba)).code, OK);
    assert.equal(CjsJpegFormat.isSaveSupported(dims(TextureType.TEX_TYPE_1D, rgba)).code, REFUSED);
    assert.equal(CjsTgaFormat.isSaveSupported(dims(TextureType.TEX_TYPE_1D, rgba)).code, REFUSED);
});

test("PNG and TGA save the pixels exactly, converting from B8G8R8A8", async () =>
{
    for (const Format of [ CjsPngFormat, CjsTgaFormat ])
    {
        const { result, bytes } = Format.save(bgraBitmap());
        assert.equal(result.code, OK, Format.className);
        const decoded = await Format.readAsync(bytes, { emit: "rgba" });
        assert.equal(decoded.width, 2);
        assert.equal(decoded.height, 2);
        assert.deepEqual([ ...decoded.data.subarray(0, 16) ], RGBA, Format.className);
    }
});

test("JPEG saves a decodable image at Carbon's dimensions", async () =>
{
    const { result, bytes } = CjsJpegFormat.save(bgraBitmap());
    assert.equal(result.code, OK);
    const decoded = await CjsJpegFormat.readAsync(bytes, { emit: "rgba" });
    assert.equal(decoded.width, 2);
    assert.equal(decoded.height, 2);
});

test("a block-compressed bitmap saves through the shared conversion", async () =>
{
    const bitmap = new HostBitmap();
    assert.ok(bitmap.Create(4, 4, 1, PixelFormat.PIXEL_FORMAT_BC1_UNORM));
    const { result, bytes } = CjsPngFormat.save(bitmap);
    assert.equal(result.code, OK);
    const decoded = await CjsPngFormat.readAsync(bytes, { emit: "rgba" });
    assert.equal(decoded.width, 4);
    assert.equal(decoded.height, 4);
});

test("saving converts a copy and leaves the caller's bitmap as it was", () =>
{
    const bitmap = bgraBitmap();
    const before = [ ...bitmap.GetMipRawData(0) ];
    CjsTgaFormat.save(bitmap);
    assert.equal(bitmap.GetFormat(), PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM);
    assert.deepEqual([ ...bitmap.GetMipRawData(0) ], before);
});

test("an invalid bitmap is refused as Carbon refuses it", () =>
{
    for (const Format of [ CjsPngFormat, CjsJpegFormat, CjsTgaFormat ])
    {
        const { result, bytes } = Format.save(new HostBitmap());
        assert.equal(result.code, ImageIOResult.Code.INVALID_BITMAP, Format.className);
        assert.equal(bytes, null);
    }
});
