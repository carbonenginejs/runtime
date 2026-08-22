import assert from "node:assert/strict";
import test from "node:test";
import CjsFlacFormat, { CjsFlacFormat as NamedCjsFlacFormat } from "../../../src/formats/flac/index.js";

test("exports the FLAC metadata/raw contract", () =>
{
    assert.equal(CjsFlacFormat, NamedCjsFlacFormat);
    assert.deepEqual(CjsFlacFormat.extensions, [ ".flac" ]);
    assert.equal(CjsFlacFormat.getOutputCapability("pcm"), null);
});

test("reads STREAMINFO and Vorbis comments", () =>
{
    const bytes = makeFlac();
    const info = CjsFlacFormat.inspect(bytes);

    assert.equal(CjsFlacFormat.isFLAC(bytes), true);
    assert.equal(info.sampleRate, 48000);
    assert.equal(info.channels, 2);
    assert.equal(info.bitsPerSample, 16);
    assert.equal(info.totalSamples, 96000);
    assert.equal(info.durationSeconds, 2);
    assert.equal(info.metadataBlockCount, 4);
    assert.equal(info.hasLastMetadataBlock, true);
    assert.equal(info.audioDataOffset, bytes.length - 3);
    assert.equal(info.audioDataBytes, 3);
    assert.equal(info.comments.vendor, "test");
    assert.deepEqual(info.comments.comments, [ "TITLE=fixture" ]);
    assert.deepEqual(info.seekTable, [ { sampleNumber: 0, offset: 123, numberSamples: 4096 } ]);
    assert.deepEqual(info.pictures, [ {
        pictureType: 3,
        mimeType: "image/png",
        description: "cover",
        width: 32,
        height: 32,
        colorDepth: 32,
        colors: 0,
        dataByteLength: 3
    } ]);
});

test("prefers raw FLAC and reports PCM as a backend path", () =>
{
    const bytes = makeFlac();
    const raw = CjsFlacFormat.read(bytes);
    const support = CjsFlacFormat.getSupport(bytes);

    assert.equal(raw.payloadType, "raw");
    assert.equal(raw.sourceFormat, "flac");
    assert.equal(raw.mimeType, "audio/flac");
    assert.equal(raw.bytes, bytes);
    assert.equal(support.preferredOutput, "raw");
    const rawVariant = support.outputs.find((variant) => variant.output === "raw");
    assert.equal(rawVariant.passthrough, true);
    assert.equal(rawVariant.decoded, false);
    assert.equal(support.outputs.find((variant) => variant.output === "pcm"), undefined);
    assert.throws(() => CjsFlacFormat.read(bytes, { emit: "pcm" }), /PCM decode\/output is not implemented/u);
});

test("rejects truncated FLAC metadata", () =>
{
    const support = CjsFlacFormat.getSupport(new Uint8Array([ 0x66, 0x4c, 0x61, 0x43, 0x80, 0, 0, 34 ]));
    assert.equal(support.supported, false);
    assert.match(support.reason, /truncated/u);
});

function makeFlac()
{
    const streamInfo = new Uint8Array(34);
    writeU16BE(streamInfo, 0, 4096);
    writeU16BE(streamInfo, 2, 4096);
    streamInfo[10] = 0x0b;
    streamInfo[11] = 0xb8;
    streamInfo[12] = 0x02;
    streamInfo[13] = 0xf0;
    streamInfo[14] = 0x00;
    streamInfo[15] = 0x01;
    streamInfo[16] = 0x77;
    streamInfo[17] = 0x00;
    const comment = concat(u32le(4), ascii("test"), u32le(1), u32le(13), ascii("TITLE=fixture"));
    const seek = new Uint8Array(18);
    writeU64BE(seek, 8, 123);
    writeU16BE(seek, 16, 4096);
    const picture = concat(
        u32be(3), u32be(ascii("image/png").length), ascii("image/png"),
        u32be(5), ascii("cover"), u32be(32), u32be(32), u32be(32), u32be(0), u32be(3),
        new Uint8Array([ 1, 2, 3 ])
    );
    return concat(
        ascii("fLaC"),
        metadataBlock(0, streamInfo),
        metadataBlock(4, comment),
        metadataBlock(3, seek),
        metadataBlock(0x80 | 6, picture),
        new Uint8Array([ 0xff, 0xf8, 0x00 ])
    );
}

function metadataBlock(header, data)
{
    return concat(new Uint8Array([ header, (data.length >>> 16) & 0xff, (data.length >>> 8) & 0xff, data.length & 0xff ]), data);
}

function ascii(value) { return Uint8Array.from(value, (character) => character.charCodeAt(0)); }
function u32le(value) { return new Uint8Array([ value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff ]); }
function u32be(value) { return new Uint8Array([ (value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff ]); }
function writeU16BE(bytes, offset, value) { bytes[offset] = value >>> 8; bytes[offset + 1] = value & 0xff; }
function writeU64BE(bytes, offset, value)
{
    writeU32BE(bytes, offset, Math.floor(value / 0x100000000));
    writeU32BE(bytes, offset + 4, value >>> 0);
}
function writeU32BE(bytes, offset, value)
{
    bytes[offset] = (value >>> 24) & 0xff;
    bytes[offset + 1] = (value >>> 16) & 0xff;
    bytes[offset + 2] = (value >>> 8) & 0xff;
    bytes[offset + 3] = value & 0xff;
}
function concat(...parts)
{
    const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
    let offset = 0;
    for (const part of parts) { output.set(part, offset); offset += part.length; }
    return output;
}
