import assert from "node:assert/strict";
import test from "node:test";
import { CjsBmpFormat } from "../../npm/dist/resource/formats/bmp/index.js";
import { CjsFormat } from "../../npm/dist/resource/format/CjsFormat.js";
import { ImageIO, HostBitmap, BitmapDimensions, LoadParameters, Metadata, ImageIOResult } from "../../npm/dist/resource/imageio/index.js";
import { PixelFormat as F, TextureType as T } from "../../npm/dist/global/consts/renderContext/index.js";

const Code = ImageIOResult.Code;

/** Independent synthetic file builder; pixels are specified in top-left BGRA order. */
function fixture({ width = 2, height = 2, bits = 24, headerSize = 40, gap = 0 } = {})
{
    const stride = Math.ceil(width * bits / 32) * 4;
    const pixelStart = 14 + Math.max(headerSize, 16) + gap;
    const bytes = new Uint8Array(pixelStart + stride * height);
    const view = new DataView(bytes.buffer);
    view.setUint16(0, 0x4d42, true);
    view.setUint32(2, bytes.length, true);
    view.setUint32(10, pixelStart + (headerSize < 40 ? 24 : 0), true);
    view.setUint32(14, headerSize, true);
    view.setUint32(18, width, true);
    view.setUint32(22, height, true);
    view.setUint16(26, 1, true);
    view.setUint16(28, bits, true);
    if (headerSize >= 40) view.setUint32(34, stride * height, true);
    const native = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++)
    {
        for (let x = 0; x < width; x++)
        {
            const index = (y * width + x) * 4;
            const b = 11 + x + y * 3, g = 43 + x * 2 + y, r = 97 + x + y * 7;
            const a = bits === 24 ? 255 : (x + y) * 37;
            native.set([ b, g, r, a ], index);
            const stored = pixelStart + (height - 1 - y) * stride + x * bits / 8;
            bytes.set(bits === 24 ? [ b, g, r ] : [ b, g, r, a ], stored);
        }
        bytes.fill(0xcd, pixelStart + y * stride + width * bits / 8, pixelStart + (y + 1) * stride);
    }
    return { bytes, native, pixelStart, stride };
}

/** Native decode without ImageIO global registration. */
function decode(bytes, bitmap = new HostBitmap(), metadata = null)
{
    const result = CjsBmpFormat.readImageNative(bytes, null, bitmap, metadata);
    return { result, bitmap };
}

test("BMP import is inert and caller registration routes by extension", () =>
{
    assert.equal(ImageIO.getImageHandler("bmp"), null);
    ImageIO.registerImageHandler(CjsBmpFormat);
    assert.equal(ImageIO.getImageHandler("BmP"), CjsBmpFormat);
    assert.equal(CjsBmpFormat.checkExtension("bmpx"), false);
    assert.equal(CjsBmpFormat.checkExtension(".bmp"), false);
    const { bytes, native } = fixture({ bits: 32 });
    const bitmap = new HostBitmap();
    assert.equal(ImageIO.readImage(bytes, new LoadParameters("x.BMP", 5), bitmap).code, Code.OK);
    assert.deepEqual(bitmap.GetRawData(), native);
    assert.equal(bitmap.GetMipCount(), 1, "BMP ignores mip-skip parameters like Carbon");
});

for (const bits of [ 24, 32 ])
{
    for (const width of [ 1, 2, 3, 4 ])
    {
        test(`BMP ${bits}-bit width ${width}: bottom-up rows, padding, native format and round trip`, () =>
        {
            const { bytes, native } = fixture({ bits, width });
            const metadata = new Metadata();
            metadata.cutout.width = 0.25;
            metadata.metadata.push([ "caller", "preserved" ]);
            const { result, bitmap } = decode(bytes, new HostBitmap(), metadata);
            assert.equal(result.code, Code.OK);
            assert.equal(bitmap.GetFormat(), bits === 24 ? F.PIXEL_FORMAT_B8G8R8X8_UNORM : F.PIXEL_FORMAT_B8G8R8A8_UNORM);
            assert.deepEqual(bitmap.GetRawData(), native);
            const rgba = CjsBmpFormat.read(bytes, { emit: "rgba" }).data;
            for (let i = 0; i < native.length; i += 4)
            {
                assert.deepEqual(Array.from(rgba.subarray(i, i + 4)), [ native[i + 2], native[i + 1], native[i], native[i + 3] ]);
            }
            assert.equal(metadata.cutout.width, 1);
            assert.deepEqual(metadata.metadata, [ [ "caller", "preserved" ] ]);
            const saved = CjsBmpFormat.save(bitmap, metadata);
            assert.equal(saved.result.code, Code.OK);
            const reloaded = decode(saved.bytes);
            assert.equal(reloaded.result.code, Code.OK);
            assert.deepEqual(reloaded.bitmap.GetRawData(), native);
            assert.equal(reloaded.bitmap.GetFormat(), bitmap.GetFormat());
            const view = new DataView(saved.bytes.buffer);
            assert.equal(view.getUint16(28, true), bits);
            assert.equal(view.getUint32(30, true), 0);
        });
    }
}

for (const headerSize of [ 40, 52, 56, 108, 124 ])
{
    test(`BMP DIB size ${headerSize}: reads fixed fields and seeks past extensions/gaps`, () =>
    {
        const { bytes, native } = fixture({ headerSize, gap: 13, bits: 32 });
        bytes.fill(0xa9, 54, 14 + headerSize + 13);
        assert.equal(CjsBmpFormat.inspect(bytes).structSize, headerSize);
        assert.deepEqual(decode(bytes).bitmap.GetRawData(), native);
    });
}

for (const headerSize of [ 0, 16, 20, 39 ])
{
    test(`BMP short DIB ${headerSize}: preserves Carbon's 16-byte read and relative-seek quirk`, () =>
    {
        // Carbon quirk, CE-204; Tr2BmpHandler.cpp:85,103-112,229: 30 bytes consumed, then offBits - 54.
        const { bytes, native, pixelStart } = fixture({ headerSize });
        const header = CjsBmpFormat.inspect(bytes);
        assert.equal(header.offBits, pixelStart + 24);
        assert.equal(header.compression, 0);
        assert.equal(header.xPelsPerMeter, 1);
        assert.equal(header.sizeImage, 2 * 2 * 24);
        assert.deepEqual(decode(bytes).bitmap.GetRawData(), native);
        new DataView(bytes.buffer).setUint32(10, pixelStart, true);
        const shifted = decode(bytes);
        assert.equal(shifted.result.code, Code.OK);
        assert.notDeepEqual(shifted.bitmap.GetRawData(), native, "The donor reads 24 bytes before the advertised pixel offset");
    });
}

test("BMP header rejection preserves prior destination and metadata", () =>
{
    const original = fixture().bytes;
    const bitmap = decode(original).bitmap, metadata = new Metadata();
    metadata.cutout.width = 0.25;
    for (const count of [ 0, 1, 13, 14, 29, 30, 53 ])
    {
        assert.equal(decode(original.subarray(0, count), bitmap, metadata).result.code, Code.READ_FAILURE);
        assert.equal(bitmap.IsValid(), true);
        assert.equal(metadata.cutout.width, 0.25);
    }
    const invalid = Uint8Array.from(original);
    invalid[0] = 0;
    assert.equal(decode(invalid, bitmap, metadata).result.code, Code.INVALID_HEADER);
    assert.equal(bitmap.IsValid(), true);
    assert.equal(metadata.cutout.width, 0.25);
});

test("BMP rejects palettes, 16-bit pixels, RLE, bitfields and embedded codecs as Carbon does", () =>
{
    for (const bits of [ 0, 1, 4, 8, 16, 48, 64 ])
    {
        const bytes = fixture().bytes;
        new DataView(bytes.buffer).setUint16(28, bits, true);
        assert.equal(CjsBmpFormat.is(null, bytes), true);
        assert.equal(decode(bytes).result.code, Code.HEADER_NOT_SUPPORTED);
        assert.throws(() => CjsBmpFormat.inspect(bytes), { code: Code.HEADER_NOT_SUPPORTED });
    }
    for (const compression of [ 1, 2, 3, 4, 5, 6 ])
    {
        const bytes = fixture().bytes;
        new DataView(bytes.buffer).setUint32(30, compression, true);
        assert.equal(decode(bytes).result.code, Code.HEADER_NOT_SUPPORTED);
    }
    const core = new Uint8Array(40), view = new DataView(core.buffer);
    view.setUint16(0, 0x4d42, true);
    view.setUint32(14, 12, true);
    view.setUint16(18, 2, true);
    view.setUint16(20, 2, true);
    view.setUint16(22, 1, true);
    view.setUint16(24, 24, true);
    assert.equal(decode(core).result.code, Code.HEADER_NOT_SUPPORTED, "12-byte OS/2 CORE is not the donor's MinDibHeader");
});

test("BMP truncated pixels, impossible offsets and unsigned top-down extents fail without retaining output", () =>
{
    const original = fixture().bytes;
    for (const edit of [
        bytes => bytes.subarray(0, bytes.length - 1),
        bytes => { new DataView(bytes.buffer).setUint32(10, 0xffffffff, true); return bytes; },
        // Carbon quirk, CE-205: Tr2BmpHandler.cpp:36,39,116 reads height unsigned.
        bytes => { new DataView(bytes.buffer).setInt32(22, -2, true); return bytes; },
        bytes => { new DataView(bytes.buffer).setUint32(18, 0xffffffff, true); return bytes; }
    ])
    {
        const bitmap = decode(original).bitmap, metadata = new Metadata();
        metadata.cutout.width = 0.25;
        assert.equal(decode(edit(Uint8Array.from(original)), bitmap, metadata).result.code, Code.READ_FAILURE);
        assert.equal(bitmap.IsValid(), false);
        assert.equal(metadata.cutout.width, 1);
    }
    const zeroWidth = Uint8Array.from(original);
    new DataView(zeroWidth.buffer).setUint32(18, 0, true);
    assert.equal(decode(zeroWidth).result.code, Code.ERROR_CREATING_BITMAP);
});

test("BMP retains Carbon's ignored header fields and zero-height acceptance", () =>
{
    const { bytes, native } = fixture();
    const view = new DataView(bytes.buffer);
    view.setUint32(2, 0, true);
    view.setUint32(6, 0xffffffff, true);
    view.setUint16(26, 9, true);
    view.setUint32(34, 0, true);
    view.setUint32(46, 256, true);
    assert.deepEqual(decode(bytes).bitmap.GetRawData(), native);
    // Carbon quirk, CE-206: Tr2BmpHandler.cpp:236 accepts zero height.
    view.setUint32(22, 0, true);
    const empty = decode(bytes);
    assert.equal(empty.result.code, Code.OK, "CreateFromBitmapDimensions and the zero-iteration loop accept height zero");
    assert.equal(empty.bitmap.IsValid(), false);
});

test("BMP writer reproduces Carbon's padding-size bug without emitting fictitious bytes", () =>
{
    // Carbon bug, CE-203; Tr2BmpHandler.cpp:301: width 2 + padding 2 is multiplied by 3,
    // declaring 12 bytes, while the writer emits 6 pixels bytes + 2 padding.
    const bitmap = new HostBitmap();
    bitmap.Create(2, 1, 1, F.PIXEL_FORMAT_B8G8R8X8_UNORM);
    bitmap.GetRawData().set([ 1, 2, 3, 255, 4, 5, 6, 255 ]);
    const saved = CjsBmpFormat.save(bitmap).bytes;
    assert.equal(saved.length, 62);
    const view = new DataView(saved.buffer);
    assert.equal(view.getUint32(2, true), 66);
    assert.equal(view.getUint32(34, true), 12);
    assert.equal(view.getUint32(10, true), 54);
    assert.equal(view.getUint32(14, true), 40);
    assert.equal(view.getInt32(38, true), 1);
    assert.equal(view.getInt32(42, true), 1);
    assert.deepEqual(Array.from(saved.subarray(54)), [ 1, 2, 3, 4, 5, 6, 0, 0 ]);
});

test("BMP save support follows Carbon dimensions/formats and writes only the top mip", () =>
{
    assert.equal(CjsBmpFormat.save(new HostBitmap()).result.code, Code.INVALID_BITMAP);
    for (const [ type, format, arraySize ] of [
        [ T.TEX_TYPE_1D, F.PIXEL_FORMAT_B8G8R8A8_UNORM, 1 ],
        [ T.TEX_TYPE_3D, F.PIXEL_FORMAT_B8G8R8A8_UNORM, 1 ],
        [ T.TEX_TYPE_CUBE, F.PIXEL_FORMAT_B8G8R8A8_UNORM, 6 ],
        [ T.TEX_TYPE_2D, F.PIXEL_FORMAT_B8G8R8A8_UNORM, 2 ],
        [ T.TEX_TYPE_2D, F.PIXEL_FORMAT_R8G8B8A8_UNORM, 1 ],
        [ T.TEX_TYPE_2D, F.PIXEL_FORMAT_R8_UNORM, 1 ]
    ])
    {
        const dimensions = BitmapDimensions.create__AllFields(type, format, 4, 4, 1, 1, arraySize);
        assert.equal(CjsBmpFormat.isSaveSupported(dimensions).code, Code.SAVE_NOT_SUPPORTED);
    }
    const unsupported = new HostBitmap();
    unsupported.Create(1, 1, 1, F.PIXEL_FORMAT_R8G8B8A8_UNORM);
    assert.equal(CjsBmpFormat.save(unsupported).result.code, Code.SAVE_NOT_SUPPORTED);
    const mipmapped = new HostBitmap();
    mipmapped.Create(4, 4, 3, F.PIXEL_FORMAT_B8G8R8A8_UNORM);
    mipmapped.GetRawData().fill(23);
    assert.equal(CjsBmpFormat.isSaveSupported(mipmapped).code, Code.OK);
    const saved = CjsBmpFormat.save(mipmapped);
    assert.equal(saved.bytes.length, 54 + 64);
    assert.equal(decode(saved.bytes).bitmap.GetMipCount(), 1);
});

test("BMP format contract, shared conversions, async fallbacks and support verification", async () =>
{
    CjsFormat.validateContract(CjsBmpFormat);
    assert.equal(CjsBmpFormat.id, "CjsBmpFormat");
    assert.equal(CjsBmpFormat.canWrite(), true);
    assert.equal(CjsBmpFormat.canWrite("rgba"), true);
    assert.equal(CjsBmpFormat.canWrite("pcm"), false);
    const { bytes, native } = fixture({ bits: 32 });
    const padded = new Uint8Array(bytes.length + 7);
    padded.set(bytes, 3);
    const input = new DataView(padded.buffer, 3, bytes.length);
    assert.equal(CjsBmpFormat.is(null, input), true);
    assert.equal(CjsBmpFormat.is(null, "not binary"), false);
    const raw = CjsBmpFormat.read(bytes);
    assert.equal(raw.bytes, bytes);
    const reader = new CjsBmpFormat({ emit: "rgba" });
    const rgba = await reader.ReadAsync(input);
    const expected = Uint8Array.from(native);
    for (let i = 0; i < expected.length; i += 4)
    {
        expected[i] = native[i + 2];
        expected[i + 2] = native[i];
    }
    assert.deepEqual(rgba.data, expected, "shared ImageIO conversion swaps B/R and preserves zero alpha");
    assert.deepEqual((await CjsBmpFormat.readAsync(bytes, { emit: "image" })).data, expected);
    assert.deepEqual(CjsBmpFormat.read(reader.Write(rgba), { emit: "rgba" }).data, expected);
    const requested = new HostBitmap();
    const parameters = new LoadParameters("x.bmp");
    parameters.requestedFormat = F.PIXEL_FORMAT_R8G8B8A8_UNORM;
    assert.equal(ImageIO.readImage(bytes, parameters, requested).code, Code.OK);
    assert.deepEqual(requested.GetRawData(), expected);
    assert.equal(reader.Inspect(bytes).width, 2);
    assert.equal(reader.GetSupport(bytes, { emit: "rgba" }).verified, false);
    assert.equal((await reader.VerifySupport(bytes, { emit: "rgba" })).supported, true);
    assert.equal((await CjsBmpFormat.verifySupport(bytes.subarray(0, 54), { emit: "rgba" })).supported, false);
    assert.throws(() => CjsBmpFormat.read(bytes, { emit: "bmpJson" }), /unknown emit/);
});
