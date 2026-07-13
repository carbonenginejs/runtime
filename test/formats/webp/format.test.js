import assert from "node:assert/strict";
import test from "node:test";
import CjsWebpFormat, { CjsWebpFormat as NamedCjsWebpFormat } from "../../../src/formats/webp/index.js";

test("exports the WEBP reader and metadata-only contract", () =>
{
    assert.equal(CjsWebpFormat, NamedCjsWebpFormat);
    assert.deepEqual(CjsWebpFormat.inputTypes, [ "webp" ]);
    assert.deepEqual(CjsWebpFormat.outputTypes, []);
    assert.equal(CjsWebpFormat.implementationStatus, "metadata-only");
});

test("inspects VP8X dimensions and alpha/animation flags", () =>
{
    const bytes = makeWebP("VP8X", [ 0x12, 1, 0, 0, 1, 0, 0, 1, 0, 0 ]);
    const info = CjsWebpFormat.inspect(bytes);
    const support = CjsWebpFormat.isSupported(bytes);

    assert.equal(CjsWebpFormat.isWebP(bytes), true);
    assert.equal(info.width, 2);
    assert.equal(info.height, 2);
    assert.equal(info.hasAlpha, true);
    assert.equal(info.animated, true);
    const rawVariant = support.variants.find(variant => variant.kind === "raw");
    assert.equal(rawVariant.supported, true);
    assert.equal(rawVariant.mimeType, "image/webp");
    assert.equal(rawVariant.containerOnly, true);
    assert.equal(rawVariant.isDecoded, false);
    assert.equal(rawVariant.rgbaDecodeSupported, false);
    assert.equal(support.variants.find(variant => variant.kind === "rgba").supported, false);
});

test("reads raw WebP bytes and rejects hidden RGBA/image emits until a decoder exists", () =>
{
    const bytes = makeWebP("VP8L", [ 0x2f, 0, 0, 0, 0 ]);
    const raw = CjsWebpFormat.read(bytes);

    assert.equal(raw.payloadType, "raw");
    assert.equal(raw.sourceFormat, "webp");
    assert.equal(raw.mimeType, "image/webp");
    assert.equal(raw.containerOnly, true);
    assert.equal(raw.isDecoded, false);
    assert.equal(raw.rgbaDecodeSupported, false);
    assert.equal(raw.bytes, bytes);
    assert.throws(() => CjsWebpFormat.read(bytes, { emit: "rgba" }), /unknown emit value/u);
    assert.throws(() => CjsWebpFormat.read(bytes, { emit: "image" }), /unknown emit value/u);
});

test("inspects WebP animation frame geometry and timing", () =>
{
    const bytes = makeWebPChunks([
        [ "VP8X", [ 0x02, 0, 0, 0, 1, 0, 0, 1, 0, 0 ] ],
        [ "ANIM", new Array(6).fill(0) ],
        [ "ANMF", [ 0, 0, 0, 0, 0, 0, 31, 0, 0, 15, 0, 0, 100, 0, 0, 0 ] ]
    ]);
    const info = CjsWebpFormat.inspect(bytes);

    assert.equal(info.animationFrameCount, 1);
    assert.equal(info.animationDurationMs, 100);
    assert.deepEqual(info.animationFrames[0], {
        x: 0,
        y: 0,
        width: 32,
        height: 16,
        durationMs: 100,
        flags: 0
    });
});

function makeWebP(type, payload)
{
    return makeWebPChunks([ [ type, payload ] ]);
}

function makeWebPChunks(chunks)
{
    const total = chunks.reduce((sum, [ , payload ]) => sum + 8 + payload.length + (payload.length & 1), 0);
    const bytes = new Uint8Array(12 + total);
    bytes.set([ 0x52, 0x49, 0x46, 0x46 ], 0);
    writeU32LE(bytes, 4, bytes.length - 8);
    bytes.set([ 0x57, 0x45, 0x42, 0x50 ], 8);
    let offset = 12;
    for (const [ type, payload ] of chunks)
    {
        for (let i = 0; i < 4; i++) bytes[offset + i] = type.charCodeAt(i);
        writeU32LE(bytes, offset + 4, payload.length);
        bytes.set(payload, offset + 8);
        offset += 8 + payload.length + (payload.length & 1);
    }
    return bytes;
}

function writeU32LE(bytes, offset, value)
{
    bytes[offset] = value & 0xff;
    bytes[offset + 1] = (value >>> 8) & 0xff;
    bytes[offset + 2] = (value >>> 16) & 0xff;
    bytes[offset + 3] = (value >>> 24) & 0xff;
}
