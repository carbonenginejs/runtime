import assert from "node:assert/strict";
import test from "node:test";
import CjsWemFormat, { CjsWemFormat as NamedCjsWemFormat } from "../../../src/formats/wem/index.js";
import { BitReader, OggPageWriter, ilog, oggChecksum } from "../../../src/formats/wem/core/bitStream.js";
import { bookMaptype1Quantvals, parseCodebookLibrary, rebuildCodebook } from "../../../src/formats/wem/core/codebookLibrary.js";
import { getPackedCodebooksAotuv603 } from "../../../src/formats/wem/core/packedCodebooksAotuv603.js";

test("exports default and named CjsWemFormat", () =>
{
    assert.equal(CjsWemFormat, NamedCjsWemFormat);
    assert.deepEqual(CjsWemFormat.extensions, [ ".wem" ]);
});

test("inspects wwise vorbis wem with inline fmt sample count", () =>
{
    const bytes = makeVorbisWem({ sampleCount: 96000 });
    const info = CjsWemFormat.inspect(bytes);

    assert.equal(CjsWemFormat.isWEM(bytes), true);
    assert.equal(info.container, "RIFF");
    assert.equal(info.littleEndian, true);
    assert.equal(info.codecTag, 0xffff);
    assert.equal(info.codec, "wwise-vorbis");
    assert.equal(info.channels, 2);
    assert.equal(info.sampleRate, 48000);
    assert.equal(info.sampleCount, 96000);
    assert.equal(info.durationSeconds, 2);
    assert.equal(info.vorbis.inline, true);
    assert.ok(info.dataOffset > 0);
    assert.equal(info.dataBytes, 4);
});

test("inspects wwise vorbis wem with separate vorb chunk", () =>
{
    const bytes = makeVorbisWemWithVorbChunk({ sampleCount: 24000 });
    const info = CjsWemFormat.inspect(bytes);

    assert.equal(info.codec, "wwise-vorbis");
    assert.equal(info.sampleCount, 24000);
    assert.equal(info.durationSeconds, 0.5);
    assert.equal(info.vorbis.inline, false);
    assert.equal(info.chunks.some((chunk) => chunk.id === "vorb"), true);
});

test("identifies non-vorbis wwise codecs from format tags", () =>
{
    assert.equal(CjsWemFormat.inspect(makePcmWem(0x0002)).codec, "wwise-ima-adpcm");
    assert.equal(CjsWemFormat.inspect(makePcmWem(0x3041)).codec, "wwise-opus-nx");
    assert.equal(CjsWemFormat.inspect(makePcmWem(0x8311)).codec, "wwise-ptadpcm");
    assert.equal(CjsWemFormat.inspect(makePcmWem(0x1234)).codec, "wwise-format-0x1234");
});

test("computes pcm duration from byte rate", () =>
{
    const info = CjsWemFormat.inspect(makePcmWem(0x0001, { byteRate: 4, dataBytes: 8 }));
    assert.equal(info.codec, "pcm");
    assert.equal(info.durationSeconds, 2);
});

test("reads big-endian RIFX containers", () =>
{
    const info = CjsWemFormat.inspect(makeRifxWem());
    assert.equal(info.container, "RIFX");
    assert.equal(info.littleEndian, false);
    assert.equal(info.codecTag, 0xffff);
    assert.equal(info.channels, 2);
    assert.equal(info.sampleRate, 48000);
});

test("emits raw container payload and passthrough support report", () =>
{
    const bytes = makeVorbisWem({ sampleCount: 96000 });
    const raw = CjsWemFormat.read(bytes);
    const support = CjsWemFormat.getSupport(bytes);

    assert.equal(raw.payloadType, "raw");
    assert.equal(raw.codec, "wwise-vorbis");
    assert.equal(raw.bytes, bytes);
    assert.equal(support.supported, true);
    assert.equal(support.preferredOutput, "ogg");
});

test("emit json returns metadata and unsupported emits fail cleanly", () =>
{
    const bytes = makeVorbisWem({ sampleCount: 96000 });
    const metadata = CjsWemFormat.read(bytes, { emit: "json" });

    assert.equal(metadata.codec, "wwise-vorbis");
    // pcm is a valid emit, but Vorbis routes through the ogg repack instead.
    assert.throws(() => CjsWemFormat.read(bytes, { emit: "pcm" }), /pcm decode is not supported/u);
    assert.throws(() => CjsWemFormat.read(bytes, { emit: "flac" }), /unknown emit value/u);
});

test("decodes a PTADPCM frame to the hand-computed sample vector", () =>
{
    // One mono frame, blockAlign 8 -> 8 samples: hist2=100, hist1=200,
    // index=0, codes [15,0,7,7,8,8] (low nibble first). Prediction
    // sample = step + 2*hist1 - hist2 walked by hand through the step table.
    const bytes = makePtadpcmWem({
        channels: 1,
        blockAlign: 8,
        frames: [ [ 100, 200, 0, 0x0f, 0x77, 0x88 ] ]
    });
    const pcm = CjsWemFormat.toPcm(bytes);

    assert.equal(pcm.payloadType, "pcm");
    assert.equal(pcm.sourceCodec, "wwise-ptadpcm");
    assert.equal(pcm.channels, 1);
    assert.equal(pcm.sampleCount, 8);
    const expected = [ 100, 200, 314, 372, 422, 468, 516, 565 ];
    const actual = [ ...pcm.channelData[0] ].map((value) => Math.round(value * 32768));
    assert.deepEqual(actual, expected);
});

test("decodes interleaved stereo PTADPCM frames per channel", () =>
{
    // Two channels, one frame group: left all-zero codes hold a constant
    // predictor line (2*h1 - h2 with h2 == h1 stays flat), right seeds a
    // different history so the channels must not bleed into each other.
    const bytes = makePtadpcmWem({
        channels: 2,
        blockAlign: 16,
        frames: [
            [ 1000, 1000, 0, 0x77, 0x77, 0x77 ],
            [ -2000, -2000, 0, 0x77, 0x77, 0x77 ]
        ]
    });
    const pcm = CjsWemFormat.toPcm(bytes);

    assert.equal(pcm.channels, 2);
    assert.equal(pcm.sampleCount, 8);
    assert.ok(pcm.channelData[0].every((value) => Math.round(value * 32768) === 1000));
    assert.ok(pcm.channelData[1].every((value) => Math.round(value * 32768) === -2000));
});

test("advertises the pcm variant for PTADPCM and prefers it over raw", () =>
{
    const support = CjsWemFormat.getSupport(makePtadpcmWem({
        channels: 1,
        blockAlign: 8,
        frames: [ [ 0, 0, 0, 0x77, 0x77, 0x77 ] ]
    }));

    assert.equal(support.preferredOutput, "pcm");
    assert.equal(support.outputs.find((variant) => variant.output === "pcm").supported, true);
});

test("rejects non-wem bytes without throwing from probes", () =>
{
    const junk = new Uint8Array([ 1, 2, 3, 4 ]);
    const support = CjsWemFormat.getSupport(junk);

    assert.equal(CjsWemFormat.isWEM(junk), false);
    assert.equal(support.supported, false);
    assert.throws(() => CjsWemFormat.inspect(junk), /expected a RIFF\/RIFX/u);
});

test("flags truncated trailing chunks instead of throwing", () =>
{
    const bytes = makeVorbisWem({ sampleCount: 96000 }).slice(0, 30);
    const info = CjsWemFormat.inspect(bytes);
    assert.equal(info.chunks.some((chunk) => chunk.truncated), true);
});

test("bit reader and ogg writer round-trip LSB-first values", () =>
{
    const writer = new OggPageWriter();
    writer.writeBits(0x2a, 8);
    writer.writeBits(5, 3);
    writer.writeBits(0x1234, 16);
    writer.writeBits(1, 1);
    writer.setGranule(48000);
    writer.flushPage(true);

    const bytes = writer.toBytes();
    assert.equal(writer.pageCount, 1);
    assert.equal(String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]), "OggS");
    assert.equal(bytes[5], 2 | 4);
    assert.equal(bytes[6] | (bytes[7] << 8), 48000 & 0xffff);

    const payloadStart = 27 + bytes[26];
    const reader = new BitReader(bytes, payloadStart);
    assert.equal(reader.readBits(8), 0x2a);
    assert.equal(reader.readBits(3), 5);
    assert.equal(reader.readBits(16), 0x1234);
    assert.equal(reader.readBits(1), 1);
    assert.equal(reader.totalBitsRead, 28);

    const stored = bytes[22] | (bytes[23] << 8) | (bytes[24] << 16) | (bytes[25] * 0x1000000);
    const copy = bytes.slice();
    copy[22] = copy[23] = copy[24] = copy[25] = 0;
    assert.equal(oggChecksum(copy, copy.length), stored >>> 0);
});

test("vorbis helper math matches the reference", () =>
{
    assert.equal(ilog(0), 0);
    assert.equal(ilog(1), 1);
    assert.equal(ilog(7), 3);
    assert.equal(ilog(8), 4);
    assert.equal(bookMaptype1Quantvals(256, 4), 4);
    assert.equal(bookMaptype1Quantvals(625, 4), 5);
});

test("parses the bundled packed codebook library and rebuilds every entry", () =>
{
    const library = parseCodebookLibrary(getPackedCodebooksAotuv603());
    assert.ok(library.count > 500, `expected hundreds of codebooks, got ${library.count}`);

    for (let id = 0; id < library.count; id++)
    {
        const size = library.offsets[id + 1] - library.offsets[id];
        const reader = new BitReader(library.bytes.subarray(library.offsets[id], library.offsets[id + 1]));
        const writer = new OggPageWriter();
        rebuildCodebook(reader, size, writer);
        writer.flushPage();
        assert.ok(writer.toBytes().length > 0, `codebook ${id} rebuilt empty`);
    }
});

test("rejects non-vorbis wem for ogg emit with a clear error", () =>
{
    const bytes = makePcmWem(0x0001, { byteRate: 4, dataBytes: 8 });
    assert.throws(() => CjsWemFormat.toOgg(bytes), /only Wwise Vorbis can be repacked/u);
    assert.throws(() => CjsWemFormat.read(bytes, { emit: "ogg" }), /only Wwise Vorbis/u);
});

test("advertises the ogg variant for wwise vorbis input", () =>
{
    const support = CjsWemFormat.getSupport(makeVorbisWem({ sampleCount: 96000 }));
    const oggVariant = support.outputs.find((variant) => variant.output === "ogg");

    assert.equal(support.preferredOutput, "ogg");
    assert.equal(oggVariant.supported, true);
    assert.deepEqual(Object.values(CjsWemFormat.outputs).filter(entry => entry.role === "runtime").map(entry => entry.output), [ "raw", "ogg", "pcm" ]);
});

test("does not advertise ogg for unsupported old Wwise Vorbis layouts", () =>
{
    for (const vorbSize of [ 0x28, 0x2c ])
    {
        const bytes = makeVorbisWemWithVorbChunk({ sampleCount: 96000, vorbSize });
        const support = CjsWemFormat.getSupport(bytes);
        const oggVariant = support.outputs.find((variant) => variant.output === "ogg");

        assert.equal(support.preferredOutput, "raw");
        assert.equal(oggVariant.supported, false);
        assert.match(oggVariant.reason, /No decodable codec validated/u);
        assert.throws(() => CjsWemFormat.read(bytes, { emit: "ogg" }), /old header-triad/u);
    }
});

function makeVorbisWem({ sampleCount })
{
    const fmtSize = 0x42;
    const data = [ 1, 2, 3, 4 ];
    const bytes = new Uint8Array(12 + 8 + fmtSize + 8 + data.length);
    writeAscii(bytes, 0, "RIFF");
    writeU32LE(bytes, 4, bytes.length - 8);
    writeAscii(bytes, 8, "WAVE");
    writeAscii(bytes, 12, "fmt ");
    writeU32LE(bytes, 16, fmtSize);
    writeU16LE(bytes, 20, 0xffff);
    writeU16LE(bytes, 22, 2);
    writeU32LE(bytes, 24, 48000);
    writeU32LE(bytes, 28, 0);
    writeU16LE(bytes, 32, 0);
    writeU16LE(bytes, 34, 0);
    writeU16LE(bytes, 36, fmtSize - 0x12);
    writeU32LE(bytes, 20 + 0x18, sampleCount);
    writeAscii(bytes, 20 + fmtSize, "data");
    writeU32LE(bytes, 20 + fmtSize + 4, data.length);
    bytes.set(data, 20 + fmtSize + 8);
    return bytes;
}

function makeVorbisWemWithVorbChunk({ sampleCount, vorbSize = 0x2a })
{
    const fmtSize = 0x18;
    const bytes = new Uint8Array(12 + 8 + fmtSize + 8 + vorbSize + 8);
    writeAscii(bytes, 0, "RIFF");
    writeU32LE(bytes, 4, bytes.length - 8);
    writeAscii(bytes, 8, "WAVE");
    writeAscii(bytes, 12, "fmt ");
    writeU32LE(bytes, 16, fmtSize);
    writeU16LE(bytes, 20, 0xffff);
    writeU16LE(bytes, 22, 2);
    writeU32LE(bytes, 24, 48000);
    writeU16LE(bytes, 36, fmtSize - 0x12);
    const vorbOffset = 20 + fmtSize;
    writeAscii(bytes, vorbOffset, "vorb");
    writeU32LE(bytes, vorbOffset + 4, vorbSize);
    writeU32LE(bytes, vorbOffset + 8, sampleCount);
    const dataOffset = vorbOffset + 8 + vorbSize;
    writeAscii(bytes, dataOffset, "data");
    writeU32LE(bytes, dataOffset + 4, 0);
    return bytes;
}

function makePcmWem(formatTag, { byteRate = 0, dataBytes = 0 } = {})
{
    const bytes = new Uint8Array(12 + 8 + 16 + 8 + dataBytes);
    writeAscii(bytes, 0, "RIFF");
    writeU32LE(bytes, 4, bytes.length - 8);
    writeAscii(bytes, 8, "WAVE");
    writeAscii(bytes, 12, "fmt ");
    writeU32LE(bytes, 16, 16);
    writeU16LE(bytes, 20, formatTag);
    writeU16LE(bytes, 22, 2);
    writeU32LE(bytes, 24, 48000);
    writeU32LE(bytes, 28, byteRate);
    writeAscii(bytes, 36, "data");
    writeU32LE(bytes, 40, dataBytes);
    return bytes;
}

// PTADPCM wem: frames are [hist2, hist1, index, ...nibbleBytes] per channel,
// serialized as int16 LE + int16 LE + u8 + raw bytes; one frame per channel
// in channel order forms one blockAlign-sized group.
function makePtadpcmWem({ channels, blockAlign, frames })
{
    const frameSize = blockAlign / channels;
    const dataBytes = frames.length * frameSize;
    const bytes = new Uint8Array(12 + 8 + 16 + 8 + dataBytes);
    writeAscii(bytes, 0, "RIFF");
    writeU32LE(bytes, 4, bytes.length - 8);
    writeAscii(bytes, 8, "WAVE");
    writeAscii(bytes, 12, "fmt ");
    writeU32LE(bytes, 16, 16);
    writeU16LE(bytes, 20, 0x8311);
    writeU16LE(bytes, 22, channels);
    writeU32LE(bytes, 24, 48000);
    writeU32LE(bytes, 28, 48000 * blockAlign);
    writeU16LE(bytes, 32, blockAlign);
    writeU16LE(bytes, 34, 4);
    writeAscii(bytes, 36, "data");
    writeU32LE(bytes, 40, dataBytes);
    let offset = 44;
    for (const [ hist2, hist1, index, ...codes ] of frames)
    {
        writeU16LE(bytes, offset, hist2 & 0xffff);
        writeU16LE(bytes, offset + 2, hist1 & 0xffff);
        bytes[offset + 4] = index;
        bytes.set(codes, offset + 5);
        offset += frameSize;
    }
    return bytes;
}

function makeRifxWem()
{
    const bytes = new Uint8Array(12 + 8 + 16);
    writeAscii(bytes, 0, "RIFX");
    writeU32BE(bytes, 4, bytes.length - 8);
    writeAscii(bytes, 8, "WAVE");
    writeAscii(bytes, 12, "fmt ");
    writeU32BE(bytes, 16, 16);
    writeU16BE(bytes, 20, 0xffff);
    writeU16BE(bytes, 22, 2);
    writeU32BE(bytes, 24, 48000);
    return bytes;
}

function writeAscii(bytes, offset, text)
{
    for (let i = 0; i < text.length; i++) bytes[offset + i] = text.charCodeAt(i);
}

function writeU16LE(bytes, offset, value)
{
    bytes[offset] = value & 0xff;
    bytes[offset + 1] = (value >>> 8) & 0xff;
}

function writeU32LE(bytes, offset, value)
{
    bytes[offset] = value & 0xff;
    bytes[offset + 1] = (value >>> 8) & 0xff;
    bytes[offset + 2] = (value >>> 16) & 0xff;
    bytes[offset + 3] = (value >>> 24) & 0xff;
}

function writeU16BE(bytes, offset, value)
{
    bytes[offset] = (value >>> 8) & 0xff;
    bytes[offset + 1] = value & 0xff;
}

function writeU32BE(bytes, offset, value)
{
    bytes[offset] = (value >>> 24) & 0xff;
    bytes[offset + 1] = (value >>> 16) & 0xff;
    bytes[offset + 2] = (value >>> 8) & 0xff;
    bytes[offset + 3] = value & 0xff;
}
