import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
import test from "node:test";
import { CjsResMan } from "../../../../../src/resource/CjsResMan.js";
import CjsPngFormat, { CjsPngFormat as NamedCjsPngFormat } from "../../../../../src/resource/formats/png/index.js";

test("exports default and named CjsPngFormat", () =>
{
    assert.equal(CjsPngFormat, NamedCjsPngFormat);
    assert.deepEqual(CjsPngFormat.extensions, [ ".png" ]);
});

test("inspects png dimensions and emits raw payload", () =>
{
    const bytes = makePngHeader(32, 16);
    const info = CjsPngFormat.inspect(bytes);
    const raw = CjsPngFormat.read(bytes);

    assert.equal(CjsPngFormat.isPNG(bytes), true);
    assert.equal(info.sourceFormat, "png");
    assert.equal(info.width, 32);
    assert.equal(info.height, 16);
    assert.equal(raw.payloadType, "raw");
    assert.equal(raw.mimeType, "image/png");
});

test("support probing matches the PNG RGBA decoder contract", () =>
{
    const support = CjsPngFormat.getSupport(makePngRgba());
    assert.equal(support.supported, true);
    const rgbaVariant = support.outputs.find((variant) => variant.output === "rgba");
    const rawVariant = support.outputs.find((variant) => variant.output === "raw");
    assert.equal(rgbaVariant.supported, true);
    assert.equal(rawVariant.passthrough, true);
    assert.equal(rawVariant.decoded, false);
    assert.equal(support.preferredOutput, "rgba");

    const unsupported = CjsPngFormat.getSupport(makePngImage(1, 1, 4, 2, [ 0, 0, 0, 0 ]));
    assert.equal(unsupported.supported, true);
    assert.equal(unsupported.outputs.find((variant) => variant.output === "rgba").supported, false);

    const headerOnly = CjsPngFormat.getSupport(makePngHeader(1, 1));
    assert.equal(headerOnly.supported, true);
    assert.equal(headerOnly.outputs.find((variant) => variant.output === "rgba").supported, false);
    assert.match(headerOnly.outputs.find((variant) => variant.output === "rgba").reason, /IDAT/u);
});

test("rejects texture output because PNG is not a GPU texture container", () =>
{
    assert.throws(() => CjsPngFormat.read(makePngRgba(), { emit: "texture" }), /unknown emit value/u);
});

test("inspects PNG chunk summary metadata", () =>
{
    const info = CjsPngFormat.inspect(makePngImage(1, 1, 8, 3, [ 0, 0 ], [
        pngChunk("PLTE", new Uint8Array([ 255, 0, 0 ])),
        pngChunk("tRNS", new Uint8Array([ 128 ])),
        pngChunk("sRGB", new Uint8Array([ 0 ]))
    ]));

    assert.equal(info.chunkCount, 6);
    assert.equal(info.idatChunkCount, 1);
    assert.ok(info.idatBytes > 0);
    assert.equal(info.hasPalette, true);
    assert.equal(info.hasTransparency, true);
    assert.equal(info.hasSrgb, true);
});

test("inspects signed oFFs and unsigned pHYs placement chunks", () =>
{
    const offset = new Uint8Array(9);
    const physical = new Uint8Array(9);
    writeI32BE(offset, 0, -125000);
    writeI32BE(offset, 4, 250000);
    offset[8] = 0;
    writeU32BE(physical, 0, 500000);
    writeU32BE(physical, 4, 750000);
    physical[8] = 0;

    const info = CjsPngFormat.inspect(makePngImage(1, 1, 8, 6, [ 0, 0, 0, 0, 0 ], [
        pngChunk("oFFs", offset),
        pngChunk("pHYs", physical)
    ]));

    assert.deepEqual(info.offset, { x: -125000, y: 250000, unit: 0 });
    assert.deepEqual(info.physicalPixelDimensions, {
        x: 500000,
        y: 750000,
        unit: 0
    });
});

test("retains ancillary units and ignores malformed placement chunk lengths", () =>
{
    const offset = new Uint8Array(9);
    const physical = new Uint8Array(9);
    const malformed = new Uint8Array(10);
    writeI32BE(offset, 0, -2147483648);
    writeI32BE(offset, 4, 2147483647);
    offset[8] = 1;
    writeU32BE(physical, 0, 0xffffffff);
    writeU32BE(physical, 4, 1);
    physical[8] = 1;

    const exact = CjsPngFormat.inspect(makePngImage(1, 1, 8, 6, [ 0, 0, 0, 0, 0 ], [
        pngChunk("oFFs", offset),
        pngChunk("pHYs", physical)
    ]));
    const invalid = CjsPngFormat.inspect(makePngImage(1, 1, 8, 6, [ 0, 0, 0, 0, 0 ], [
        pngChunk("oFFs", malformed),
        pngChunk("pHYs", malformed)
    ]));

    assert.deepEqual(exact.offset, {
        x: -2147483648,
        y: 2147483647,
        unit: 1
    });
    assert.deepEqual(exact.physicalPixelDimensions, {
        x: 0xffffffff,
        y: 1,
        unit: 1
    });
    assert.equal(invalid.offset, null);
    assert.equal(invalid.physicalPixelDimensions, null);
});

test("resource-manager raw PNG inspection reuses its resident resource", async () =>
{
    const offset = new Uint8Array(9);
    const physical = new Uint8Array(9);
    writeI32BE(offset, 0, 100000);
    writeI32BE(offset, 4, 200000);
    writeU32BE(physical, 0, 300000);
    writeU32BE(physical, 4, 400000);
    const bytes = makePngImage(4, 2, 8, 6, [ 0, 0, 0, 0, 0 ], [
        pngChunk("oFFs", offset),
        pngChunk("pHYs", physical)
    ]);
    let reads = 0;
    const resMan = new CjsResMan({
        source: {
            Read()
            {
                reads++;
                return bytes;
            }
        }
    }).RegisterFormat(CjsPngFormat);

    const first = await resMan.GetObject("res:/character/example.png", {
        emit: "raw",
        cacheSource: true
    });
    const second = await resMan.GetObject("res:/character/example.png", {
        emit: "raw",
        cacheSource: true
    });

    assert.strictEqual(second, first);
    assert.equal(reads, 1);
    assert.deepEqual(first.metadata.offset, { x: 100000, y: 200000, unit: 0 });
    assert.deepEqual(first.metadata.physicalPixelDimensions, {
        x: 300000,
        y: 400000,
        unit: 0
    });
});

test("readAsync decodes a non-interlaced RGBA PNG to canonical pixels", async () =>
{
    const bytes = makePngRgba();
    const rgba = await CjsPngFormat.readAsync(bytes, { emit: "rgba" });

    assert.equal(rgba.payloadType, "rgba");
    assert.equal(rgba.mimeType, "image/png");
    assert.equal(rgba.width, 1);
    assert.equal(rgba.height, 1);
    assert.equal(rgba.strideBytes, 4);
    assert.equal(rgba.origin, "top-left");
    assert.deepEqual(Array.from(rgba.data), [ 255, 0, 0, 255 ]);
});

test("readAsync decodes grayscale-alpha and 16-bit RGB PNG samples", async () =>
{
    const grayAlpha = await CjsPngFormat.readAsync(makePngImage(1, 1, 8, 4, [ 0, 128, 64 ]), { emit: "rgba" });
    const rgb16 = await CjsPngFormat.readAsync(makePngImage(1, 1, 16, 2, [ 0, 255, 255, 128, 0, 0, 0 ]), { emit: "rgba" });

    assert.deepEqual(Array.from(grayAlpha.data), [ 128, 128, 128, 64 ]);
    assert.deepEqual(Array.from(rgb16.data), [ 255, 128, 0, 255 ]);
});

test("readAsync decodes packed grayscale and indexed PNG transparency", async () =>
{
    const packed = await CjsPngFormat.readAsync(makePngImage(2, 1, 1, 0, [ 0, 0b10000000 ]), { emit: "rgba" });
    const indexed = await CjsPngFormat.readAsync(makePngImage(2, 1, 8, 3, [ 0, 0, 1 ], [
        pngChunk("PLTE", new Uint8Array([ 255, 0, 0, 0, 255, 0 ])),
        pngChunk("tRNS", new Uint8Array([ 128, 255 ]))
    ]), { emit: "rgba" });

    assert.deepEqual(Array.from(packed.data), [
        255, 255, 255, 255,
        0, 0, 0, 255
    ]);
    assert.deepEqual(Array.from(indexed.data), [
        255, 0, 0, 128,
        0, 255, 0, 255
    ]);
});

test("readAsync deinterlaces Adam7 RGBA PNGs", async () =>
{
    const rgba = await CjsPngFormat.readAsync(makePngAdam7Rgba(), { emit: "rgba" });

    assert.equal(rgba.width, 2);
    assert.equal(rgba.height, 2);
    assert.deepEqual(Array.from(rgba.data), [
        255, 0, 0, 255,
        0, 255, 0, 255,
        0, 0, 255, 255,
        255, 255, 255, 255
    ]);
});

function makePngHeader(width, height)
{
    const bytes = new Uint8Array(33);
    bytes.set([ 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a ]);
    bytes.set([ 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52 ], 8);
    writeU32BE(bytes, 16, width);
    writeU32BE(bytes, 20, height);
    bytes[24] = 8;
    bytes[25] = 6;
    return bytes;
}

function makePngRgba()
{
    const signature = new Uint8Array([ 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a ]);
    const ihdr = new Uint8Array([ 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0 ]);
    const scanline = deflateSync(Buffer.from([ 0, 255, 0, 0, 255 ]));
    return concat(signature, pngChunk("IHDR", ihdr), pngChunk("IDAT", scanline), pngChunk("IEND", new Uint8Array()));
}

function makePngImage(width, height, bitDepth, colorType, rawScanline, chunks = [])
{
    const signature = new Uint8Array([ 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a ]);
    const ihdr = new Uint8Array(13);
    writeU32BE(ihdr, 0, width);
    writeU32BE(ihdr, 4, height);
    ihdr[8] = bitDepth;
    ihdr[9] = colorType;
    const scanline = deflateSync(Buffer.from(rawScanline));
    return concat(
        signature,
        pngChunk("IHDR", ihdr),
        ...chunks,
        pngChunk("IDAT", scanline),
        pngChunk("IEND", new Uint8Array())
    );
}

function makePngAdam7Rgba()
{
    const signature = new Uint8Array([ 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a ]);
    const ihdr = new Uint8Array([ 0, 0, 0, 2, 0, 0, 0, 2, 8, 6, 0, 0, 1 ]);
    const scanlines = new Uint8Array([
        0, 255, 0, 0, 255,
        0, 0, 255, 0, 255,
        0, 0, 0, 255, 255, 255, 255, 255, 255
    ]);
    return concat(
        signature,
        pngChunk("IHDR", ihdr),
        pngChunk("IDAT", new Uint8Array(deflateSync(Buffer.from(scanlines)))),
        pngChunk("IEND", new Uint8Array())
    );
}

function pngChunk(type, data)
{
    const chunk = new Uint8Array(12 + data.length);
    writeU32BE(chunk, 0, data.length);
    for (let i = 0; i < 4; i++) chunk[4 + i] = type.charCodeAt(i);
    chunk.set(data, 8);
    return chunk;
}

function concat(...parts)
{
    const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
    let offset = 0;
    for (const part of parts)
    {
        output.set(part, offset);
        offset += part.length;
    }
    return output;
}

function writeU32BE(bytes, offset, value)
{
    bytes[offset] = (value >>> 24) & 0xff;
    bytes[offset + 1] = (value >>> 16) & 0xff;
    bytes[offset + 2] = (value >>> 8) & 0xff;
    bytes[offset + 3] = value & 0xff;
}

function writeI32BE(bytes, offset, value)
{
    new DataView(bytes.buffer, bytes.byteOffset + offset, 4).setInt32(0, value, false);
}
