import assert from "node:assert/strict";
import test from "node:test";
import { CjsWemFormat } from "../../../src/formats/wem/index.js";

// Cheap structural WEM support: the fmt tag picks the first candidate but
// bounded content validation decides. This is advisory until readAsync runs.
// Synthetic wems
// below are minimal RIFF/WAVE containers with hand-built chunk layouts.

function writer()
{
    const bytes = [];
    const scratch = new DataView(new ArrayBuffer(8));
    return {
        ascii(text) { for (const char of text) bytes.push(char.charCodeAt(0)); return this; },
        u16(value) { bytes.push(value & 0xff, (value >> 8) & 0xff); return this; },
        u32(value) { bytes.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff); return this; },
        fill(count, value = 0) { for (let i = 0; i < count; i++) bytes.push(value); return this; },
        bytes()
        {
            const out = new Uint8Array(bytes);
            // Patch the RIFF size field (total - 8).
            scratch.setUint32(0, out.byteLength - 8, true);
            for (let i = 0; i < 4; i++) out[4 + i] = scratch.getUint8(i);
            return out;
        }
    };
}

function makeWem({ codecTag, channels, sampleRate, byteRate, blockAlign, bits, vorb = false, dataBytes = 0x120 })
{
    const w = writer();
    w.ascii("RIFF").u32(0).ascii("WAVE");
    w.ascii("fmt ").u32(22); // 16 base fields + 6-byte tail written below
    w.u16(codecTag).u16(channels).u32(sampleRate).u32(byteRate).u16(blockAlign).u16(bits);
    w.u32(0).u16(0); // extra fmt tail (cbSize etc.)
    if (vorb)
    {
        w.ascii("vorb").u32(0x34);
        w.u32(48000); // sample count at vorb+0
        w.fill(0x30);
    }
    w.ascii("data").u32(dataBytes).fill(dataBytes);
    return w.bytes();
}

test("correctly-tagged codecs validate as declared with no mismatch", async () =>
{
    const vorbis = CjsWemFormat.getSupport(makeWem({
        codecTag: 0xffff, channels: 2, sampleRate: 48000, byteRate: 0, blockAlign: 0, bits: 0, vorb: true
    }));
    assert.equal(vorbis.verified, false);
    assert.equal(vorbis.metadata.declared, "wwise-vorbis");
    assert.equal(vorbis.metadata.resolved, "wwise-vorbis");
    assert.equal(vorbis.metadata.mismatch, false);
    assert.equal(vorbis.preferredOutput, "ogg");

    const ptadpcm = CjsWemFormat.getSupport(makeWem({
        codecTag: 0x8311, channels: 2, sampleRate: 48000, byteRate: 0, blockAlign: 0x48, bits: 4, dataBytes: 0x48 * 4
    }));
    assert.equal(ptadpcm.metadata.resolved, "wwise-ptadpcm");
    assert.equal(ptadpcm.metadata.mismatch, false);
    assert.equal(ptadpcm.preferredOutput, "pcm");

    const pcm = CjsWemFormat.getSupport(makeWem({
        codecTag: 0x0001, channels: 2, sampleRate: 48000, byteRate: 48000 * 4, blockAlign: 4, bits: 16, dataBytes: 4 * 64
    }));
    assert.equal(pcm.metadata.resolved, "pcm");
    assert.equal(pcm.preferredOutput, "pcm");
});

test("a mislabeled tag fails its own validation and resolves by content", async () =>
{
    // Tag claims PTADPCM but the layout is impossible for it (blockAlign 5
    // over 2 channels) while a Vorbis sidecar chunk is present.
    const report = CjsWemFormat.getSupport(makeWem({
        codecTag: 0x8311, channels: 2, sampleRate: 48000, byteRate: 0, blockAlign: 5, bits: 4, vorb: true
    }));
    assert.equal(report.verified, false);
    assert.equal(report.metadata.declared, "wwise-ptadpcm");
    assert.equal(report.metadata.resolved, "wwise-vorbis");
    assert.equal(report.metadata.mismatch, true);
    assert.equal(report.preferredOutput, "ogg");
    assert.equal(report.outputs.find(v => v.output === "ogg").supported, true);
    assert.equal(report.outputs.find(v => v.output === "pcm").supported, false);
});

test("an undecodable codec resolves to the raw route only", async () =>
{
    const report = CjsWemFormat.getSupport(makeWem({
        codecTag: 0x3040, channels: 0, sampleRate: 48000, byteRate: 0, blockAlign: 0, bits: 0
    }));
    assert.equal(report.verified, false);
    assert.equal(report.metadata.resolved, null);
    assert.equal(report.preferredOutput, "raw");
    assert.equal(report.outputs.find(v => v.output === "ogg").supported, false);
    assert.equal(report.outputs.find(v => v.output === "pcm").supported, false);
    assert.equal(report.outputs.find(v => v.output === "raw").supported, true);
});
