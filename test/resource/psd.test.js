import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { CjsPsdFormat } from "../../npm/dist/resource/formats/psd/index.js";
import { ImageIO, HostBitmap, LoadParameters, Metadata, ImageIOResult } from "../../npm/dist/resource/imageio/index.js";
import { BitmapDimensions } from "../../npm/dist/global/imageio/index.js";
import { PixelFormat as F, TextureType } from "../../npm/dist/global/consts/renderContext/index.js";

const Code = ImageIOResult.Code;
const fixture = name => readFile(new URL(`../fixtures/psd/${name}.psd`, import.meta.url));
// Source: imageio/tests/TestPsdHandler.cpp:11-30. Values are little-endian host pixels.
const cases = [
    [ "r", 5, 12, F.PIXEL_FORMAT_R8_UNORM, 1, 0x00, 0x04 ],
    [ "al", 5, 12, F.PIXEL_FORMAT_R8G8_UNORM, 2, 0x7900, 0xd104 ],
    [ "rgb", 5, 12, F.PIXEL_FORMAT_B8G8R8X8_UNORM, 4, 0xff000000, 0xff100000 ],
    [ "rgba", 5, 12, F.PIXEL_FORMAT_B8G8R8A8_UNORM, 4, 0x79000000, 0xd1100000 ],
    [ "rgbRle", 32, 32, F.PIXEL_FORMAT_B8G8R8X8_UNORM, 4, 0xff636161, 0xffbfbfbf ]
];

for (const [ name, width, height, format, bpp, first, last ] of cases)
{
    test(`PSD Carbon fixture ${name}: dimensions, pixels, metadata and round trip`, async () =>
    {
        const bitmap = new HostBitmap(), metadata = new Metadata();
        metadata.cutout.width = 0.25;
        const result = ImageIO.readImage(await fixture(name), new LoadParameters(`${name}.PSD`, 3), bitmap, metadata);
        assert.equal(result.code, Code.OK, "TestPsdHandler.cpp:11-30");
        assert.deepEqual([ bitmap.GetWidth(), bitmap.GetHeight(), bitmap.GetFormat(), bitmap.GetMipCount(), bitmap.GetArraySize(), bitmap.GetType() ],
            [ width, height, format, 1, 1, TextureType.TEX_TYPE_2D ]);
        assert.equal(metadata.cutout.width, 1);
        const data = bitmap.GetRawData();
        const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
        const pixel = offset => bpp === 1 ? view.getUint8(offset) : bpp === 2 ? view.getUint16(offset, true) : view.getUint32(offset, true);
        assert.equal(pixel(0), first, "TestPsdHandler.cpp top-left pixel");
        assert.equal(pixel((width * height - 1) * bpp), last, "TestPsdHandler.cpp bottom-right pixel");
        assert.equal(ImageIO.isSaveSupported("out.psd", bitmap).code, Code.OK);
        const saved = ImageIO.saveImage("out.psd", bitmap, metadata);
        assert.equal(saved.result.code, Code.OK);
        assert.equal(new DataView(saved.bytes.buffer).getUint16(38), 0, "PsdHandler.cpp:389: uncompressed save");
        const reloaded = new HostBitmap();
        assert.equal(ImageIO.readImage(saved.bytes, new LoadParameters("out.psd"), reloaded).code, Code.OK);
        assert.equal(reloaded.GetFormat(), format);
        assert.deepEqual(reloaded.GetRawData(), data);
    });
}

for (const name of [ "rgb", "rgbRle" ])
{
    test(`PSD ${name} trimmed header and data fail (TestPsdHandler.cpp:65-87)`, async () =>
    {
        const bytes = await fixture(name);
        const bitmap = new HostBitmap();
        bitmap.Create(1, 1, 1, F.PIXEL_FORMAT_R8_UNORM);
        assert.equal(ImageIO.readImage(bytes.subarray(0, 13), new LoadParameters("x.psd"), bitmap).code, Code.READ_FAILURE);
        assert.equal(bitmap.IsValid(), true, "Header errors leave existing bitmap intact");
        const result = ImageIO.readImage(bytes.subarray(0, bytes.length - 20), new LoadParameters("x.psd"), bitmap);
        assert.equal(result.code, name === "rgb" ? Code.READ_FAILURE : Code.INVALID_DATA);
        assert.equal(bitmap.IsValid(), false, "PsdHandler.cpp:318 destroys failed pixel output");
    });
}

test("PSD missing input fails at acquisition; empty stream returns READ_FAILURE", async () =>
{
    // Carbon's filename overload acquires the stream. JS formats take bytes;
    // filesystem acquisition remains the caller's job, as with sibling formats.
    await assert.rejects(fixture("iDontExist"), { code: "ENOENT" });
    assert.equal(ImageIO.readImage(new Uint8Array(0), new LoadParameters("iDontExist.psd"), new HostBitmap()).code, Code.READ_FAILURE);
});

test("PSD header rejection and output mutation follow DoReadHeader and ReadImage", async () =>
{
    const original = await fixture("rgb");
    for (const [ offset, value, code ] of [ [ 0, 0, Code.INVALID_HEADER ], [ 4, 2, Code.HEADER_NOT_SUPPORTED ],
        [ 12, 5, Code.HEADER_NOT_SUPPORTED ], [ 22, 16, Code.HEADER_NOT_SUPPORTED ], [ 24, 4, Code.HEADER_NOT_SUPPORTED ] ])
    {
        const bytes = Uint8Array.from(original);
        new DataView(bytes.buffer).setUint16(offset, value);
        const metadata = new Metadata();
        metadata.cutout.width = 0.25;
        assert.equal(CjsPsdFormat.readImageNative(bytes, null, new HostBitmap(), metadata).code, code);
        assert.equal(metadata.cutout.width, 0.25);
    }
    const bytes = Uint8Array.from(original);
    const offset = CjsPsdFormat.inspect(bytes).imageDataOffset;
    new DataView(bytes.buffer).setUint16(offset - 2, 2);
    assert.equal(CjsPsdFormat.readImageNative(bytes, null, new HostBitmap()).code, Code.HEADER_NOT_SUPPORTED);
    assert.equal(CjsPsdFormat.is(bytes), true, "Routing is independent of compression support");
    assert.equal(CjsPsdFormat.readImageNative(original, null, { Create: () => false }).code, Code.ERROR_CREATING_BITMAP);
});

test("PSD save rejection matches Carbon, while mip chains save only the top level", () =>
{
    assert.equal(CjsPsdFormat.save(new HostBitmap()).result.code, Code.INVALID_BITMAP);
    for (const dimensions of [
        new BitmapDimensions({ type: TextureType.TEX_TYPE_CUBE, format: F.PIXEL_FORMAT_R8_UNORM, width: 4, height: 4, arraySize: 6 }),
        new BitmapDimensions({ type: TextureType.TEX_TYPE_2D, format: F.PIXEL_FORMAT_R8_UNORM, width: 4, height: 4, arraySize: 2 }),
        new BitmapDimensions({ type: TextureType.TEX_TYPE_2D, format: F.PIXEL_FORMAT_R8G8B8A8_UNORM, width: 4, height: 4 })
    ]) assert.equal(CjsPsdFormat.isSaveSupported(dimensions).code, Code.SAVE_NOT_SUPPORTED);
    const unsupported = new HostBitmap();
    unsupported.Create(1, 1, 1, F.PIXEL_FORMAT_R8G8B8A8_UNORM);
    assert.equal(CjsPsdFormat.save(unsupported).result.code, Code.SAVE_NOT_SUPPORTED);
    const mipmapped = new HostBitmap();
    mipmapped.Create(4, 4, 2, F.PIXEL_FORMAT_R8_UNORM);
    assert.equal(CjsPsdFormat.save(mipmapped).bytes.length, 40 + 16);
});

test("PSD PackBits retains skipped row counts, repeat/literal/no-op handling and overflow failures", () =>
{
    const bitmap = new HostBitmap();
    bitmap.Create(3, 2, 1, F.PIXEL_FORMAT_R8_UNORM);
    const header = CjsPsdFormat.save(bitmap).bytes.subarray(0, 40);
    new DataView(header.buffer).setUint16(38, 1);
    const pack = data =>
    {
        const bytes = new Uint8Array(44 + data.length);
        bytes.set(header);
        bytes.set([ 255, 255, 255, 255 ], 40); // ignored row lengths
        bytes.set(data, 44);
        return bytes;
    };
    const decoded = new HostBitmap();
    assert.equal(CjsPsdFormat.readImageNative(pack([ 128, 253, 7, 1, 8, 9 ]), null, decoded).code, Code.OK);
    assert.deepEqual(Array.from(decoded.GetRawData()), [ 7, 7, 7, 7, 8, 9 ]);
    for (const bytes of [ [ 250, 7 ], [ 251 ], [ 5, 7 ], [ 128 ] ])
    {
        assert.equal(CjsPsdFormat.readImageNative(pack(bytes), null, decoded).code, Code.INVALID_DATA);
        assert.equal(decoded.IsValid(), false);
    }
});

test("PSD standalone facade uses existing outputs and normalized RGBA writes", async () =>
{
    const bytes = await fixture("rgba");
    assert.equal(ImageIO.getImageHandler("PsD"), CjsPsdFormat.carbon);
    assert.equal(CjsPsdFormat.carbon.checkExtension("psdx"), false);
    assert.equal(CjsPsdFormat.carbon.checkExtension(".psd"), false);
    assert.deepEqual(Object.keys(CjsPsdFormat.outputs), [ "image", "rgba", "raw" ]);
    assert.equal(CjsPsdFormat.read(bytes).bytes, bytes);
    const reader = new CjsPsdFormat({ emit: "rgba" });
    const rgba = await reader.ReadAsync(bytes);
    assert.deepEqual(Array.from(rgba.data.subarray(0, 4)), [ 0, 0, 0, 121 ]);
    assert.deepEqual(CjsPsdFormat.read(reader.Write(rgba), { emit: "image" }).data, rgba.data);
    const gray = CjsPsdFormat.read(await fixture("al"), { emit: "rgba" });
    assert.deepEqual(Array.from(gray.data.slice(-4)), [ 4, 4, 4, 209 ]);
    assert.equal((await CjsPsdFormat.verifySupport(bytes, { emit: "rgba" })).supported, true);
    assert.throws(() => CjsPsdFormat.read(bytes, { emit: "psdJson" }), /unknown emit/);
    assert.equal(CjsPsdFormat.is(new Uint8Array(4)), false);
});
