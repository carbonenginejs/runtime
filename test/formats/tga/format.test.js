import assert from "node:assert/strict";
import test from "node:test";
import CjsTgaFormat, { CjsTgaFormat as NamedCjsTgaFormat } from "../../../src/formats/tga/index.js";

test("exports default and named CjsTgaFormat", () =>
{
    assert.equal(CjsTgaFormat, NamedCjsTgaFormat);
    assert.deepEqual(CjsTgaFormat.inputTypes, [ "tga" ]);
});

test("inspects tga dimensions and emits raw payload", () =>
{
    const bytes = makeTgaHeader(8, 4);
    const raw = CjsTgaFormat.read(bytes);

    assert.equal(CjsTgaFormat.isTGA(bytes), true);
    assert.equal(raw.sourceFormat, "tga");
    assert.equal(raw.mimeType, "image/x-tga");
    assert.equal(raw.containerOnly, true);
    assert.equal(raw.isDecoded, false);
    assert.equal(raw.rgbaDecodeSupported, false);
    assert.equal(raw.metadata.width, 8);
    assert.equal(raw.metadata.height, 4);
});

test("reports raw-only TGA support as partial and rejects texture output", () =>
{
    const bytes = makeUnsupportedColorMappedTga();
    const support = CjsTgaFormat.isSupported(bytes);

    assert.equal(support.supported, "partial");
    const rawVariant = support.variants.find((variant) => variant.kind === "raw");
    assert.equal(rawVariant.supported, true);
    assert.equal(rawVariant.mimeType, "image/x-tga");
    assert.equal(rawVariant.containerOnly, true);
    assert.equal(rawVariant.isDecoded, false);
    assert.equal(rawVariant.rgbaDecodeSupported, false);
    assert.equal(support.variants.find((variant) => variant.kind === "rgba").supported, false);
    assert.throws(() => CjsTgaFormat.read(bytes, { emit: "texture" }), /unknown emit value/u);

    const headerOnly = CjsTgaFormat.isSupported(makeTgaHeader(2, 2));
    assert.equal(headerOnly.supported, "partial");
    assert.equal(headerOnly.variants.find((variant) => variant.kind === "rgba").supported, false);
});

test("decodes uncompressed true-color tga to rgba", () =>
{
    const bytes = makeTgaRgba();
    const rgba = CjsTgaFormat.read(bytes, { emit: "rgba" });
    const support = CjsTgaFormat.isSupported(bytes);

    assert.equal(rgba.payloadType, "rgba");
    assert.equal(rgba.mimeType, "image/x-tga");
    assert.equal(rgba.containerOnly, false);
    assert.equal(rgba.isDecoded, true);
    assert.equal(rgba.rgbaDecodeSupported, true);
    assert.equal(rgba.width, 2);
    assert.equal(rgba.height, 1);
    assert.equal(rgba.pixelFormat, "rgba8unorm");
    assert.equal(rgba.strideBytes, 8);
    assert.equal(rgba.origin, "top-left");
    assert.equal(rgba.alphaMode, "straight");
    assert.deepEqual(Array.from(rgba.data), [
        255, 0, 0, 255,
        0, 255, 0, 128
    ]);
    assert.equal(support.supported, "full");
});

test("normalizes bottom-left tga origin to top-left rgba rows", () =>
{
    const bytes = makeBottomLeftTgaRgba();
    const rgba = CjsTgaFormat.read(bytes, { emit: "rgba" });

    assert.equal(rgba.metadata.origin, "bottom-left");
    assert.deepEqual(Array.from(rgba.data), [
        0, 255, 0, 255,
        255, 0, 0, 255
    ]);
});

test("decodes indexed TGA color maps to canonical RGBA", () =>
{
    const bytes = makeIndexedTga();
    const info = CjsTgaFormat.inspect(bytes);
    const rgba = CjsTgaFormat.read(bytes, { emit: "rgba" });
    const support = CjsTgaFormat.isSupported(bytes);

    assert.equal(info.colorMapBytes, 6);
    assert.equal(info.imageDataOffset, 24);
    assert.equal(info.imageDataBytes, 2);
    assert.equal(rgba.payloadType, "rgba");
    assert.deepEqual(Array.from(rgba.data), [
        255, 0, 0, 255,
        0, 255, 0, 255
    ]);
    assert.equal(support.supported, "full");
});

test("decodes grayscale and RLE TGA images", () =>
{
    const grayscale = CjsTgaFormat.read(makeGrayscaleTga(), { emit: "rgba" });
    const rle = CjsTgaFormat.read(makeRleTga(), { emit: "rgba" });

    assert.deepEqual(Array.from(grayscale.data), [
        64, 64, 64, 255,
        128, 128, 128, 255
    ]);
    assert.deepEqual(Array.from(rle.data), [
        255, 0, 0, 255,
        255, 0, 0, 255
    ]);
});

test("decodes 16-bit TGA alpha pixels", () =>
{
    const rgba = CjsTgaFormat.read(make16BitTga(), { emit: "rgba" });

    assert.equal(rgba.alphaMode, "straight");
    assert.deepEqual(Array.from(rgba.data), [ 255, 0, 0, 255 ]);
});

test("decodes 15-bit TGA true-color pixels as opaque RGBA", () =>
{
    const rgba = CjsTgaFormat.read(make15BitTga(), { emit: "rgba" });

    assert.equal(rgba.alphaMode, "opaque");
    assert.deepEqual(Array.from(rgba.data), [ 255, 0, 0, 255 ]);
});

function makeTgaHeader(width, height)
{
    const bytes = new Uint8Array(18);
    bytes[2] = 2;
    bytes[12] = width & 0xff;
    bytes[13] = (width >>> 8) & 0xff;
    bytes[14] = height & 0xff;
    bytes[15] = (height >>> 8) & 0xff;
    bytes[16] = 32;
    return bytes;
}

function makeUnsupportedColorMappedTga()
{
    const bytes = makeTgaHeader(1, 1);
    bytes[1] = 0;
    bytes[2] = 1;
    bytes[16] = 8;
    return bytes;
}

function makeTgaRgba()
{
    const bytes = new Uint8Array(18 + 8);
    bytes[2] = 2;
    bytes[12] = 2;
    bytes[14] = 1;
    bytes[16] = 32;
    bytes[17] = 0x20;
    bytes.set([
        0, 0, 255, 255,
        0, 255, 0, 128
    ], 18);
    return bytes;
}

function makeBottomLeftTgaRgba()
{
    const bytes = new Uint8Array(18 + 8);
    bytes[2] = 2;
    bytes[12] = 1;
    bytes[14] = 2;
    bytes[16] = 32;
    bytes[17] = 0;
    bytes.set([
        0, 0, 255, 255,
        0, 255, 0, 255
    ], 18);
    return bytes;
}

function makeIndexedTga()
{
    const bytes = new Uint8Array(18 + 6 + 2);
    bytes[1] = 1;
    bytes[2] = 1;
    bytes[5] = 2;
    bytes[7] = 24;
    bytes[12] = 2;
    bytes[14] = 1;
    bytes[16] = 8;
    bytes[17] = 0x20;
    bytes.set([ 0, 0, 255, 0, 255, 0 ], 18);
    bytes.set([ 0, 1 ], 24);
    return bytes;
}

function makeGrayscaleTga()
{
    const bytes = new Uint8Array(18 + 2);
    bytes[2] = 3;
    bytes[12] = 2;
    bytes[14] = 1;
    bytes[16] = 8;
    bytes[17] = 0x20;
    bytes.set([ 64, 128 ], 18);
    return bytes;
}

function makeRleTga()
{
    const bytes = new Uint8Array(18 + 4);
    bytes[2] = 10;
    bytes[12] = 2;
    bytes[14] = 1;
    bytes[16] = 24;
    bytes[17] = 0x20;
    bytes.set([ 0x81, 0, 0, 255 ], 18);
    return bytes;
}

function make16BitTga()
{
    const bytes = new Uint8Array(18 + 2);
    bytes[2] = 2;
    bytes[12] = 1;
    bytes[14] = 1;
    bytes[16] = 16;
    bytes[17] = 0x21;
    bytes.set([ 0x00, 0xfc ], 18);
    return bytes;
}

function make15BitTga()
{
    const bytes = new Uint8Array(18 + 2);
    bytes[2] = 2;
    bytes[12] = 1;
    bytes[14] = 1;
    bytes[16] = 15;
    bytes[17] = 0x20;
    bytes.set([ 0x00, 0x7c ], 18);
    return bytes;
}
