import assert from "node:assert/strict";
import test from "node:test";
import CjsMp4Format, { CjsMp4Format as NamedCjsMp4Format } from "../../../src/formats/mp4/index.js";

test("exports default and named CjsMp4Format", () =>
{
    assert.equal(CjsMp4Format, NamedCjsMp4Format);
    assert.deepEqual(CjsMp4Format.extensions, [ ".mp4", ".m4v", ".m4a" ]);
});

test("inspects mp4 container", () =>
{
    const bytes = new Uint8Array([ 0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d ]);
    const info = CjsMp4Format.inspect(bytes);

    assert.equal(CjsMp4Format.isMP4(bytes), true);
    assert.equal(info.sourceFormat, "mp4");
    assert.equal(info.container, "isobmff");
});

test("treats M4A as an MP4 audio-profile input", () =>
{
    const bytes = new Uint8Array([ 0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x4d, 0x34, 0x41, 0x20 ]);
    const info = CjsMp4Format.read(bytes, { inputType: "m4a", emit: "json" });

    assert.equal(info.sourceFormat, "mp4");
    assert.equal(info.container, "isobmff");
    assert.equal(CjsMp4Format.getSupport(bytes, { inputType: "m4a" }).format, "mp4");
});

test("extracts M4A-style AAC track metadata", () =>
{
    const info = CjsMp4Format.inspect(makeMp4AudioTrack());
    const track = info.tracks[0];

    assert.equal(track.type, "audio");
    assert.equal(track.handler, "soun");
    assert.equal(track.codec, "mp4a");
    assert.equal(track.channels, 2);
    assert.equal(track.sampleRate, 44100);
});

test("emits a GPU-free video container payload without decoding frames", () =>
{
    const bytes = makeMp4VideoTrack();
    const video = CjsMp4Format.read(bytes, { emit: "video" });
    const support = CjsMp4Format.getSupport(bytes);
    const rawVariant = support.outputs.find((variant) => variant.output === "raw");

    assert.equal(video.payloadType, "video");
    assert.equal(video.sourceFormat, "mp4");
    assert.equal(video.container, "isobmff");
    assert.equal(video.mimeType, "video/mp4");
    assert.deepEqual(video.codecs, [ "avc1" ]);
    assert.deepEqual(video.videoCodecs, [ "avc1" ]);
    assert.deepEqual(video.audioCodecs, []);
    assert.equal(video.durationTimescale, 1000);
    assert.equal(video.tracks[0].codec, "avc1");
    assert.equal(video.sourceBytes, bytes);
    assert.equal(support.supported, true);
    assert.equal(rawVariant.passthrough, true);
    assert.equal(support.outputs.find((variant) => variant.output === "video").supported, true);
});

test("inspects MP4 movie and video track timing metadata", () =>
{
    const bytes = makeMp4VideoTrack();
    const info = CjsMp4Format.inspect(bytes);
    const track = info.tracks[0];

    assert.equal(info.brand, "isom");
    assert.deepEqual(info.compatibleBrands, [ "isom", "iso2" ]);
    assert.equal(info.durationTimescale, 1000);
    assert.equal(info.duration, 2000);
    assert.equal(track.type, "video");
    assert.equal(track.codec, "avc1");
    assert.equal(track.id, 1);
    assert.equal(track.width, 1920);
    assert.equal(track.height, 1080);
    assert.equal(track.language, "eng");
    assert.equal(track.sampleTable.sampleCount, 3);
    assert.equal(track.sampleTable.sampleBytes, 600);
    assert.equal(track.sampleTable.decodeDuration, 2000);
    assert.equal(track.sampleTable.compositionTimeEntries, 2);
    assert.equal(track.sampleTable.compositionSampleCount, 3);
    assert.equal(track.sampleTable.compositionOffsetMin, 10);
    assert.equal(track.sampleTable.compositionOffsetMax, 20);
    assert.equal(track.sampleTable.chunkCount, 2);
    assert.equal(track.sampleTable.keyframeCount, 2);
});

function makeMp4VideoTrack()
{
    const ftyp = makeBox("ftyp", concat(ascii("isom"), u32(0), ascii("isom"), ascii("iso2")));
    const mvhd = makeFullBox("mvhd", 20, (payload) =>
    {
        writeU32BE(payload, 12, 1000);
        writeU32BE(payload, 16, 2000);
    });
    const tkhd = makeFullBox("tkhd", 84, (payload) =>
    {
        writeU32BE(payload, 12, 1);
        writeU32BE(payload, 20, 2000);
        writeU32BE(payload, 76, 1920 * 65536);
        writeU32BE(payload, 80, 1080 * 65536);
    });
    const mdhd = makeFullBox("mdhd", 24, (payload) =>
    {
        writeU32BE(payload, 12, 1000);
        writeU32BE(payload, 16, 2000);
        writeU16BE(payload, 20, (5 << 10) | (14 << 5) | 7);
    });
    const hdlr = makeFullBox("hdlr", 12, (payload) =>
    {
        payload.set(ascii("vide"), 8);
    });
    const sampleEntry = makeBox("avc1", new Uint8Array(28));
    writeU16BE(sampleEntry, 8 + 16, 1920);
    writeU16BE(sampleEntry, 8 + 18, 1080);
    const stsdPayload = new Uint8Array(8 + sampleEntry.length);
    writeU32BE(stsdPayload, 4, 1);
    stsdPayload.set(sampleEntry, 8);
    const stsd = makeBox("stsd", stsdPayload);
    const stts = makeFullBox("stts", 24, (payload) =>
    {
        writeU32BE(payload, 4, 2);
        writeU32BE(payload, 8, 2);
        writeU32BE(payload, 12, 667);
        writeU32BE(payload, 16, 1);
        writeU32BE(payload, 20, 666);
    });
    const ctts = makeFullBox("ctts", 24, (payload) =>
    {
        writeU32BE(payload, 4, 2);
        writeU32BE(payload, 8, 1);
        writeU32BE(payload, 12, 10);
        writeU32BE(payload, 16, 2);
        writeU32BE(payload, 20, 20);
    });
    const stsc = makeFullBox("stsc", 20, (payload) =>
    {
        writeU32BE(payload, 4, 1);
        writeU32BE(payload, 8, 1);
        writeU32BE(payload, 12, 3);
        writeU32BE(payload, 16, 1);
    });
    const stsz = makeFullBox("stsz", 24, (payload) =>
    {
        writeU32BE(payload, 4, 0);
        writeU32BE(payload, 8, 3);
        writeU32BE(payload, 12, 200);
        writeU32BE(payload, 16, 200);
        writeU32BE(payload, 20, 200);
    });
    const stco = makeFullBox("stco", 16, (payload) =>
    {
        writeU32BE(payload, 4, 2);
        writeU32BE(payload, 8, 100);
        writeU32BE(payload, 12, 500);
    });
    const stss = makeFullBox("stss", 16, (payload) =>
    {
        writeU32BE(payload, 4, 2);
        writeU32BE(payload, 8, 1);
        writeU32BE(payload, 12, 3);
    });
    const stbl = makeBox("stbl", concat(stsd, stts, ctts, stsc, stsz, stco, stss));
    const minf = makeBox("minf", stbl);
    const mdia = makeBox("mdia", concat(mdhd, hdlr, minf));
    const trak = makeBox("trak", concat(tkhd, mdia));
    const moov = makeBox("moov", concat(mvhd, trak));
    return concat(ftyp, moov);
}

function makeMp4AudioTrack()
{
    const ftyp = makeBox("ftyp", concat(ascii("M4A "), u32(0), ascii("M4A "), ascii("isom")));
    const mvhd = makeFullBox("mvhd", 20, (payload) =>
    {
        writeU32BE(payload, 12, 44100);
        writeU32BE(payload, 16, 88200);
    });
    const tkhd = makeFullBox("tkhd", 84, (payload) => writeU32BE(payload, 12, 1));
    const mdhd = makeFullBox("mdhd", 24, (payload) =>
    {
        writeU32BE(payload, 12, 44100);
        writeU32BE(payload, 16, 88200);
    });
    const hdlr = makeFullBox("hdlr", 12, (payload) => payload.set(ascii("soun"), 8));
    const samplePayload = new Uint8Array(20);
    writeU16BE(samplePayload, 8, 2);
    writeU32BE(samplePayload, 16, 44100 * 65536);
    const sampleEntry = makeBox("mp4a", samplePayload);
    const stsdPayload = new Uint8Array(8 + sampleEntry.length);
    writeU32BE(stsdPayload, 4, 1);
    stsdPayload.set(sampleEntry, 8);
    const stbl = makeBox("stbl", makeBox("stsd", stsdPayload));
    const mdia = makeBox("mdia", concat(mdhd, hdlr, makeBox("minf", stbl)));
    return concat(ftyp, makeBox("moov", concat(mvhd, makeBox("trak", concat(tkhd, mdia)))));
}

function makeFullBox(type, payloadLength, fill)
{
    const payload = new Uint8Array(payloadLength);
    fill(payload);
    return makeBox(type, payload);
}

function makeBox(type, payload)
{
    const bytes = new Uint8Array(8 + payload.length);
    writeU32BE(bytes, 0, bytes.length);
    bytes.set(ascii(type), 4);
    bytes.set(payload, 8);
    return bytes;
}

function ascii(value)
{
    return Uint8Array.from(value, (character) => character.charCodeAt(0));
}

function u32(value)
{
    const bytes = new Uint8Array(4);
    writeU32BE(bytes, 0, value);
    return bytes;
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
