import assert from "node:assert/strict";
import test from "node:test";
import CjsWavFormat, { CjsWavFormat as NamedCjsWavFormat } from "../../../src/formats/wav/index.js";

test("exports default and named CjsWavFormat", () =>
{
    assert.equal(CjsWavFormat, NamedCjsWavFormat);
    assert.deepEqual(CjsWavFormat.extensions, [ ".wav" ]);
});

test("inspects wav metadata and emits raw payload", () =>
{
    const bytes = makeWav();
    const info = CjsWavFormat.inspect(bytes);
    const raw = CjsWavFormat.read(bytes);
    const support = CjsWavFormat.getSupport(bytes);
    const rawVariant = support.outputs.find((variant) => variant.output === "raw");

    assert.equal(CjsWavFormat.isWAV(bytes), true);
    assert.equal(info.sampleRate, 48000);
    assert.equal(info.channels, 2);
    assert.equal(info.bitsPerSample, 16);
    assert.equal(info.frameCount, 0);
    assert.equal(info.durationSeconds, 0);
    assert.equal(raw.payloadType, "raw");
    assert.equal(raw.mimeType, "audio/wav");
    assert.equal(rawVariant.passthrough, true);
    assert.equal(rawVariant.decoded, false);
});

test("emits wav pcm payload without GPU or audio-device work", () =>
{
    const bytes = makeWav([ 1, 0, 255, 255 ]);
    const pcm = CjsWavFormat.read(bytes, { emit: "pcm" });
    const support = CjsWavFormat.getSupport(bytes);

    assert.equal(pcm.payloadType, "pcm");
    assert.equal(pcm.audioFormat, "pcm16");
    assert.equal(pcm.sampleFormat, "pcm16");
    assert.equal(pcm.sampleRate, 48000);
    assert.equal(pcm.channels, 2);
    assert.equal(pcm.channelLayout, "unspecified");
    assert.equal(pcm.interleaving, "interleaved");
    assert.equal(pcm.frameCount, 1);
    assert.equal(pcm.durationSeconds, 1 / 48000);
    assert.ok(pcm.data instanceof Int16Array);
    assert.deepEqual(Array.from(pcm.data), [ 1, -1 ]);
    assert.equal(support.supported, true);
});

test("does not advertise unsupported WAV PCM sample widths", () =>
{
    const bytes = makeWavWithFormat({ bitsPerSample: 12, blockAlign: 3, byteRate: 48000 * 3, samples: [ 0, 0, 0 ] });
    const support = CjsWavFormat.getSupport(bytes);

    assert.equal(support.supported, true);
    assert.equal(support.outputs.find((variant) => variant.output === "raw").supported, true);
    assert.equal(support.outputs.find((variant) => variant.output === "pcm").supported, false);
    assert.throws(() => CjsWavFormat.read(bytes, { emit: "pcm" }), /only PCM and IEEE-float/u);
});

test("emits IEEE-float WAV samples as Float32Array", () =>
{
    const bytes = makeFloatWav([ 1, 0.5 ]);
    const pcm = CjsWavFormat.read(bytes, { emit: "pcm" });

    assert.equal(pcm.sampleFormat, "float32");
    assert.ok(pcm.data instanceof Float32Array);
    assert.deepEqual(Array.from(pcm.data), [ 1, 0.5 ]);
});

test("inspects and decodes WAVE_FORMAT_EXTENSIBLE PCM", () =>
{
    const bytes = makeExtensibleWav([ 1, 0, 255, 255 ]);
    const info = CjsWavFormat.inspect(bytes);
    const pcm = CjsWavFormat.read(bytes, { emit: "pcm" });

    assert.equal(info.containerFormatTag, 0xfffe);
    assert.equal(info.formatTag, 1);
    assert.equal(info.validBitsPerSample, 16);
    assert.deepEqual(info.channelLayout, [ "front-left", "front-right" ]);
    assert.deepEqual(pcm.channelLayout, [ "front-left", "front-right" ]);
    assert.deepEqual(Array.from(pcm.data), [ 1, -1 ]);
});

function makeWav(samples = [])
{
    const bytes = new Uint8Array(44 + samples.length);
    writeAscii(bytes, 0, "RIFF");
    writeU32LE(bytes, 4, 36 + samples.length);
    writeAscii(bytes, 8, "WAVE");
    writeAscii(bytes, 12, "fmt ");
    writeU32LE(bytes, 16, 16);
    writeU16LE(bytes, 20, 1);
    writeU16LE(bytes, 22, 2);
    writeU32LE(bytes, 24, 48000);
    writeU32LE(bytes, 28, 48000 * 4);
    writeU16LE(bytes, 32, 4);
    writeU16LE(bytes, 34, 16);
    writeAscii(bytes, 36, "data");
    writeU32LE(bytes, 40, samples.length);
    bytes.set(samples, 44);
    return bytes;
}

function makeWavWithFormat({ bitsPerSample, blockAlign, byteRate, samples, formatTag = 1, channels = 2, sampleRate = 48000 })
{
    const bytes = new Uint8Array(44 + samples.length);
    writeAscii(bytes, 0, "RIFF");
    writeU32LE(bytes, 4, 36 + samples.length);
    writeAscii(bytes, 8, "WAVE");
    writeAscii(bytes, 12, "fmt ");
    writeU32LE(bytes, 16, 16);
    writeU16LE(bytes, 20, formatTag);
    writeU16LE(bytes, 22, channels);
    writeU32LE(bytes, 24, sampleRate);
    writeU32LE(bytes, 28, byteRate);
    writeU16LE(bytes, 32, blockAlign);
    writeU16LE(bytes, 34, bitsPerSample);
    writeAscii(bytes, 36, "data");
    writeU32LE(bytes, 40, samples.length);
    bytes.set(samples, 44);
    return bytes;
}

function makeFloatWav(samples)
{
    const bytes = new Uint8Array(44 + samples.length * 4);
    writeAscii(bytes, 0, "RIFF");
    writeU32LE(bytes, 4, 36 + samples.length * 4);
    writeAscii(bytes, 8, "WAVE");
    writeAscii(bytes, 12, "fmt ");
    writeU32LE(bytes, 16, 16);
    writeU16LE(bytes, 20, 3);
    writeU16LE(bytes, 22, 1);
    writeU32LE(bytes, 24, 48000);
    writeU32LE(bytes, 28, 48000 * 4);
    writeU16LE(bytes, 32, 4);
    writeU16LE(bytes, 34, 32);
    writeAscii(bytes, 36, "data");
    writeU32LE(bytes, 40, samples.length * 4);
    const view = new DataView(bytes.buffer);
    samples.forEach((sample, index) => view.setFloat32(44 + index * 4, sample, true));
    return bytes;
}

function makeExtensibleWav(samples)
{
    const bytes = new Uint8Array(72);
    writeAscii(bytes, 0, "RIFF");
    writeU32LE(bytes, 4, 64);
    writeAscii(bytes, 8, "WAVE");
    writeAscii(bytes, 12, "fmt ");
    writeU32LE(bytes, 16, 40);
    writeU16LE(bytes, 20, 0xfffe);
    writeU16LE(bytes, 22, 2);
    writeU32LE(bytes, 24, 48000);
    writeU32LE(bytes, 28, 48000 * 4);
    writeU16LE(bytes, 32, 4);
    writeU16LE(bytes, 34, 16);
    writeU16LE(bytes, 36, 22);
    writeU16LE(bytes, 38, 16);
    writeU32LE(bytes, 40, 3);
    writeU16LE(bytes, 44, 1);
    writeAscii(bytes, 60, "data");
    writeU32LE(bytes, 64, samples.length);
    bytes.set(samples, 68);
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
