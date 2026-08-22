import assert from "node:assert/strict";
import test from "node:test";
import CjsMp3Format, { CjsMp3Format as NamedCjsMp3Format } from "../../../src/formats/mp3/index.js";

test("exports default and named CjsMp3Format", () =>
{
    assert.equal(CjsMp3Format, NamedCjsMp3Format);
    assert.deepEqual(CjsMp3Format.extensions, [ ".mp3" ]);
    assert.deepEqual(Object.values(CjsMp3Format.outputs).filter(entry => entry.role === "runtime").map(entry => entry.output), []);
    assert.deepEqual(Object.values(CjsMp3Format.outputs).filter(entry => entry.role === "debug").map(entry => entry.output), [ "mp3Json", CjsMp3Format.Output.RAW ]);
});

test("inspects mp3 id3 header", () =>
{
    const bytes = new Uint8Array([ 0x49, 0x44, 0x33, 0x04, 0x01, 0x40, 0, 0, 0, 12 ]);
    const info = CjsMp3Format.inspect(bytes);

    assert.equal(CjsMp3Format.isMP3(bytes), true);
    assert.equal(info.sourceFormat, "mp3");
    assert.equal(info.hasId3, true);
    assert.equal(info.id3Version, 4);
    assert.equal(info.id3Revision, 1);
    assert.equal(info.id3Flags, 0x40);
    assert.equal(info.id3Size, 12);
});

test("inspects MPEG audio frame timing metadata", () =>
{
    const bytes = new Uint8Array(417);
    bytes.set([ 0xff, 0xfb, 0x90, 0x64 ]);
    const info = CjsMp3Format.inspect(bytes);

    assert.equal(info.version, "mpeg1");
    assert.equal(info.layer, "layer3");
    assert.equal(info.bitrateKbps, 128);
    assert.equal(info.sampleRate, 44100);
    assert.equal(info.channels, 2);
    assert.equal(info.frameCount, 1);
    assert.equal(info.durationSeconds, 1152 / 44100);
});

test("prefers the supported raw MP3 variant", () =>
{
    const bytes = new Uint8Array(417);
    bytes.set([ 0xff, 0xfb, 0x90, 0x64 ]);
    const support = CjsMp3Format.getSupport(bytes);
    const raw = CjsMp3Format.read(bytes);
    const rawVariant = support.outputs.find((variant) => variant.output === "raw");

    assert.equal(support.preferredOutput, "raw");
    assert.equal(raw.mimeType, "audio/mpeg");
    assert.equal(rawVariant.passthrough, true);
    assert.equal(rawVariant.decoded, false);
});

test("inspects Xing VBR declarations and gapless LAME metadata", () =>
{
    const bytes = new Uint8Array(417);
    bytes.set([ 0xff, 0xfb, 0x90, 0x64 ]);
    bytes.set([ 0x58, 0x69, 0x6e, 0x67 ], 36);
    writeU32BE(bytes, 40, 3);
    writeU32BE(bytes, 44, 10);
    writeU32BE(bytes, 48, 1251);
    bytes.set([ 0x4c, 0x41, 0x4d, 0x45 ], 156);
    bytes[177] = 0x12;
    bytes[178] = 0x34;
    bytes[179] = 0x56;

    const info = CjsMp3Format.inspect(bytes);

    assert.equal(info.vbrHeader, "Xing");
    assert.equal(info.declaredFrameCount, 10);
    assert.equal(info.declaredByteCount, 1251);
    assert.equal(info.encoderDelay, 0x123);
    assert.equal(info.encoderPadding, 0x456);
    assert.equal(info.durationSeconds, (10 * 1152 - 0x123 - 0x456) / 44100);
});

function writeU32BE(bytes, offset, value)
{
    bytes[offset] = (value >>> 24) & 0xff;
    bytes[offset + 1] = (value >>> 16) & 0xff;
    bytes[offset + 2] = (value >>> 8) & 0xff;
    bytes[offset + 3] = value & 0xff;
}
