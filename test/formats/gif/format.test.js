import assert from "node:assert/strict";
import test from "node:test";
import CjsGifFormat, { CjsGifFormat as NamedCjsGifFormat } from "../../../src/formats/gif/index.js";

test("exports GIF reader metadata and output contract", () =>
{
    assert.equal(CjsGifFormat, NamedCjsGifFormat);
    assert.deepEqual(CjsGifFormat.inputTypes, [ "gif" ]);
    assert.deepEqual(CjsGifFormat.outputTypes, [ "image", "rgba" ]);
});

test("decodes a first-frame GIF to canonical RGBA", () =>
{
    const bytes = makeGif([ 255, 0, 0 ], [ 0, 0, 0 ]);
    const rgba = CjsGifFormat.read(bytes, { emit: "rgba" });
    const support = CjsGifFormat.isSupported(bytes);

    assert.equal(CjsGifFormat.isGIF(bytes), true);
    assert.equal(rgba.payloadType, "rgba");
    assert.equal(rgba.width, 1);
    assert.equal(rgba.height, 1);
    assert.equal(rgba.mimeType, "image/gif");
    assert.equal(rgba.containerOnly, false);
    assert.equal(rgba.isDecoded, true);
    assert.equal(rgba.rgbaDecodeSupported, true);
    assert.deepEqual(Array.from(rgba.data), [ 255, 0, 0, 255 ]);
    assert.equal(support.supported, "full");
    assert.equal(support.variants.find((variant) => variant.kind === "rgba").isDecoded, true);
});

test("reports raw payload and graphics metadata", () =>
{
    const bytes = makeGif([ 255, 0, 0 ], [ 0, 0, 0 ]);
    const raw = CjsGifFormat.read(bytes);
    const info = CjsGifFormat.read(bytes, { emit: "gifJson" });

    assert.equal(raw.payloadType, "raw");
    assert.equal(raw.mimeType, "image/gif");
    assert.equal(raw.containerOnly, true);
    assert.equal(raw.isDecoded, false);
    assert.equal(raw.rgbaDecodeSupported, true);
    assert.equal(raw.bytes, bytes);
    assert.equal(info.sourceFormat, "gif");
    assert.equal(info.frameCount, 1);
    assert.equal(info.animated, false);

    const rawVariant = CjsGifFormat.isSupported(bytes).variants.find((variant) => variant.kind === "raw");
    assert.equal(rawVariant.mimeType, "image/gif");
    assert.equal(rawVariant.containerOnly, true);
    assert.equal(rawVariant.isDecoded, false);
    assert.equal(rawVariant.rgbaDecodeSupported, true);
});

test("reports GIF application-extension loop count", () =>
{
    const info = CjsGifFormat.inspect(makeLoopingGif(7));

    assert.equal(info.loopCount, 7);
});

test("composites animated GIF frames while preserving first-frame data", () =>
{
    const rgba = CjsGifFormat.read(makeAnimatedGif(), { emit: "rgba" });

    assert.equal(rgba.metadata.frameCount, 2);
    assert.equal(rgba.frames.length, 2);
    assert.deepEqual(Array.from(rgba.data), [ 255, 0, 0, 255, 0, 255, 0, 255 ]);
    assert.deepEqual(Array.from(rgba.frames[1].data), [ 0, 255, 0, 255, 0, 255, 0, 255 ]);
});

test("applies GIF disposal method 2 before the next frame", () =>
{
    const rgba = CjsGifFormat.read(makeDisposalGif(), { emit: "rgba" });

    assert.equal(rgba.frames[1].disposalMethod, 2);
    assert.deepEqual(Array.from(rgba.frames[1].data), [ 0, 255, 0, 255, 0, 255, 0, 255 ]);
    assert.deepEqual(Array.from(rgba.frames[2].data), [ 0, 0, 0, 0, 0, 255, 0, 255 ]);
});

test("restores the previous canvas for GIF disposal method 3", () =>
{
    const rgba = CjsGifFormat.read(makeRestorePreviousGif(), { emit: "rgba" });

    assert.equal(rgba.frames[1].disposalMethod, 3);
    assert.deepEqual(Array.from(rgba.frames[1].data), [ 0, 255, 0, 255, 0, 255, 0, 255 ]);
    assert.deepEqual(Array.from(rgba.frames[2].data), [ 255, 0, 0, 255, 0, 255, 0, 255 ]);
});

function makeGif(firstColor, secondColor)
{
    return Uint8Array.from([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61,
        1, 0, 1, 0, 0x80, 0, 0,
        ...firstColor, ...secondColor,
        0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0,
        2, 2, 0x44, 0x01, 0,
        0x3b
    ]);
}

function makeLoopingGif(loopCount)
{
    return Uint8Array.from([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61,
        1, 0, 1, 0, 0x80, 0, 0,
        255, 0, 0, 0, 0, 0,
        0x21, 0xff, 0x0b,
        0x4e, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2e, 0x30,
        3, 1, loopCount & 0xff, (loopCount >>> 8) & 0xff, 0,
        0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0,
        2, 2, 0x44, 0x01, 0,
        0x3b
    ]);
}

function makeAnimatedGif()
{
    return Uint8Array.from([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61,
        2, 0, 1, 0, 0x80, 0, 0,
        255, 0, 0, 0, 255, 0,
        0x2c, 0, 0, 0, 0, 2, 0, 1, 0, 0,
        2, 2, 0x44, 0x0a, 0,
        0x21, 0xf9, 4, 0, 1, 0, 0, 0,
        0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0,
        2, 2, 0xcc, 0x00, 0,
        0x3b
    ]);
}

function makeDisposalGif()
{
    return Uint8Array.from([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61,
        2, 0, 1, 0, 0x81, 0, 0,
        255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0,
        0x2c, 0, 0, 0, 0, 2, 0, 1, 0, 0,
        2, 2, 0x44, 0x0a, 0,
        0x21, 0xf9, 4, 0x08, 0, 0, 0, 0,
        0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0,
        2, 2, 0xcc, 0x00, 0,
        0x21, 0xf9, 4, 0, 0, 0, 0, 0,
        0x2c, 1, 0, 0, 0, 1, 0, 1, 0, 0,
        2, 2, 0xcc, 0x00, 0,
        0x3b
    ]);
}

function makeRestorePreviousGif()
{
    return Uint8Array.from([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61,
        2, 0, 1, 0, 0x80, 0, 0,
        255, 0, 0, 0, 255, 0,
        0x2c, 0, 0, 0, 0, 2, 0, 1, 0, 0,
        2, 2, 0x44, 0x0a, 0,
        0x21, 0xf9, 4, 0x0c, 0, 0, 0, 0,
        0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0,
        2, 2, 0xcc, 0x00, 0,
        0x21, 0xf9, 4, 0, 0, 0, 0, 0,
        0x2c, 1, 0, 0, 0, 1, 0, 1, 0, 0,
        2, 2, 0xcc, 0x00, 0,
        0x3b
    ]);
}
