import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import CjsOggFormat, { CjsOggFormat as NamedCjsOggFormat } from "../../../src/formats/ogg/index.js";
import { dctIv, imdct, vorbisWindowSlope } from "../../../src/formats/ogg/core/imdct.js";

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "fixtures", "ogg");

test("exports the Ogg reader with Vorbis PCM decode", () =>
{
    assert.equal(CjsOggFormat, NamedCjsOggFormat);
    assert.deepEqual(CjsOggFormat.inputTypes, [ "ogg", "oga", "ogv" ]);
    assert.deepEqual(CjsOggFormat.outputTypes, [ "pcm", "audio" ]);
    assert.equal(CjsOggFormat.implementationStatus, "vorbis-pcm");
});

test("inspects a Vorbis identification stream", () =>
{
    const packet = new Uint8Array(30);
    packet.set([ 1, 0x76, 0x6f, 0x72, 0x62, 0x69, 0x73, 0 ], 0);
    packet[11] = 2;
    writeU32LE(packet, 12, 48000);
    const bytes = makeOggPage(packet);
    const info = CjsOggFormat.inspect(bytes);

    assert.equal(CjsOggFormat.isOGG(bytes), true);
    assert.equal(info.codec, "vorbis");
    assert.equal(info.mediaType, "audio");
    assert.equal(info.tracks[0].channels, 2);
    assert.equal(info.tracks[0].sampleRate, 48000);
    assert.equal(info.tracks[0].durationSamples, 0);
    assert.equal(CjsOggFormat.read(bytes, { emit: "oggJson" }).codec, "vorbis");
});

test("reports Vorbis duration from the final audio granule position", () =>
{
    const packet = new Uint8Array(30);
    packet.set([ 1, 0x76, 0x6f, 0x72, 0x62, 0x69, 0x73, 0 ], 0);
    packet[11] = 2;
    writeU32LE(packet, 12, 48000);
    const info = CjsOggFormat.inspect(makeOggPage(packet, { granulePosition: 96000 }));

    assert.equal(info.tracks[0].granulePosition, 96000);
    assert.equal(info.tracks[0].durationSamples, 96000);
    assert.equal(info.tracks[0].durationSeconds, 2);
});

test("reports stream sequencing and EOS health metadata", () =>
{
    const packet = new Uint8Array(30);
    packet.set([ 1, 0x76, 0x6f, 0x72, 0x62, 0x69, 0x73, 0 ], 0);
    packet[11] = 2;
    writeU32LE(packet, 12, 48000);
    const info = CjsOggFormat.inspect(makeOggPage(packet, { headerType: 6, granulePosition: 48000 }));
    const track = info.tracks[0];

    assert.equal(track.bos, true);
    assert.equal(track.eos, true);
    assert.equal(track.firstSequence, 0);
    assert.equal(track.lastSequence, 0);
    assert.equal(track.firstGranulePosition, 48000);
    assert.equal(track.lastGranulePosition, 48000);
    assert.equal(track.payloadBytes, 30);
});

test("reports Opus duration after pre-skip", () =>
{
    const packet = new Uint8Array([ 0x4f, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64, 1, 2, 0x80, 0x00, 0x80, 0xbb, 0x00, 0x00, 0, 0, 0 ]);
    const info = CjsOggFormat.inspect(makeOggPage(packet, { granulePosition: 48960 }));

    assert.equal(info.tracks[0].preSkip, 128);
    assert.equal(info.tracks[0].durationSamples, 48832);
    assert.equal(info.tracks[0].durationSeconds, 48832 / 48000);
});

test("inspects Theora identification dimensions and frame rate", () =>
{
    const packet = new Uint8Array(46);
    packet.set([ 0x80, 0x74, 0x68, 0x65, 0x6f, 0x72, 0x61 ], 0);
    writeU16BE(packet, 10, 120);
    writeU16BE(packet, 12, 68);
    writeU24BE(packet, 14, 1920);
    writeU24BE(packet, 17, 1080);
    writeU32BE(packet, 22, 30000);
    writeU32BE(packet, 26, 1001);
    writeU24BE(packet, 30, 1);
    writeU24BE(packet, 33, 1);
    packet[36] = 1;
    const info = CjsOggFormat.inspect(makeOggPage(packet));
    const support = CjsOggFormat.isSupported(makeOggPage(packet));
    const track = info.tracks[0];

    assert.equal(track.codec, "theora");
    assert.equal(track.mediaType, "video");
    assert.equal(track.frameWidth, 1920);
    assert.equal(track.frameHeight, 1088);
    assert.equal(track.width, 1920);
    assert.equal(track.height, 1080);
    assert.equal(track.frameRate, 30000 / 1001);
    assert.equal(track.pixelAspectRatio, 1);
    assert.equal(track.colorSpace, 1);
    assert.equal(support.variants.find(variant => variant.kind === "decoded").payloadType, "video-frame");
    assert.equal(support.variants.find(variant => variant.kind === "decoded").supported, false);
});

test("reads raw Ogg bytes and reports codec-specific PCM availability", () =>
{
    const packet = new Uint8Array([ 0x4f, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64, 1, 2, 0, 0, 0x80, 0xbb, 0x00, 0x00, 0, 0, 0 ]);
    const bytes = makeOggPage(packet);
    const raw = CjsOggFormat.read(bytes);
    const support = CjsOggFormat.isSupported(bytes);

    assert.equal(raw.payloadType, "raw");
    assert.equal(raw.sourceFormat, "ogg");
    assert.equal(raw.mimeType, "audio/ogg");
    assert.equal(raw.containerOnly, true);
    assert.equal(raw.isDecoded, false);
    assert.equal(raw.pcmDecodeSupported, false);
    assert.equal(raw.frameDecodeSupported, false);
    assert.equal(raw.bytes, bytes);
    assert.equal(support.preferred, "ogg");
    assert.match(support.reason, /raw Ogg passthrough/u);
    const rawVariant = support.variants.find(variant => variant.kind === "raw");
    assert.equal(rawVariant.mimeType, "audio/ogg");
    assert.equal(rawVariant.containerOnly, true);
    assert.equal(rawVariant.isDecoded, false);
    assert.equal(rawVariant.pcmDecodeSupported, false);
    assert.equal(rawVariant.frameDecodeSupported, false);
    assert.equal(support.variants.find(variant => variant.kind === "pcm").supported, false);
    assert.throws(() => CjsOggFormat.read(bytes, { emit: "pcm" }), /supports Vorbis only/u);
});

test("rejects an Ogg page with a bad CRC", () =>
{
    const bytes = makeOggPage(new Uint8Array([ 1, 0x76, 0x6f, 0x72, 0x62, 0x69, 0x73 ]));
    bytes[bytes.length - 1] ^= 0xff;
    assert.throws(() => CjsOggFormat.inspect(bytes), /checksum mismatch/u);
});

test("assembles a first packet continued across pages", () =>
{
    const packet = new Uint8Array(260);
    packet.set([ 1, 0x76, 0x6f, 0x72, 0x62, 0x69, 0x73, 0, 0, 0, 0, 2 ], 0);
    writeU32LE(packet, 12, 48000);
    const first = makeOggPage(packet.subarray(0, 255), { headerType: 2, sequence: 0, segmentLength: 255 });
    const second = makeOggPage(packet.subarray(255), { headerType: 1, sequence: 1, continued: true, serial: 1 });
    const bytes = new Uint8Array(first.length + second.length);
    bytes.set(first, 0);
    bytes.set(second, first.length);
    const info = CjsOggFormat.inspect(bytes);

    assert.equal(info.codec, "vorbis");
    assert.equal(info.tracks[0].channels, 2);
});

test("fast DCT-IV and IMDCT match the naive transforms", () =>
{
    for (const m of [ 64, 256 ])
    {
        const input = Float32Array.from({ length: m }, (_, i) => Math.sin(i * 0.37) * 0.5);
        const fast = new Float32Array(m);
        dctIv(input, fast);
        for (let k = 0; k < m; k++)
        {
            let acc = 0;
            for (let j = 0; j < m; j++)
            {
                acc += input[j] * Math.cos((Math.PI / m) * (j + 0.5) * (k + 0.5));
            }
            assert.ok(Math.abs(acc - fast[k]) < 1e-3, `dctIv m=${m} k=${k}: ${acc} vs ${fast[k]}`);
        }
    }

    const n = 256;
    const spectrum = Float32Array.from({ length: n >> 1 }, (_, i) => Math.cos(i * 0.21));
    const fast = new Float32Array(n);
    imdct(spectrum, fast, n);
    for (const i of [ 0, 1, 63, 64, 128, 200, 255 ])
    {
        let acc = 0;
        for (let j = 0; j < (n >> 1); j++)
        {
            acc += spectrum[j] * Math.cos((Math.PI / (2 * n)) * (2 * i + 1 + (n >> 1)) * (2 * j + 1));
        }
        assert.ok(Math.abs(acc - fast[i]) < 1e-3, `imdct i=${i}: ${acc} vs ${fast[i]}`);
    }
});

test("vorbis window slopes are power-complementary", () =>
{
    const slope = vorbisWindowSlope(128);
    for (const i of [ 0, 31, 64, 127 ])
    {
        const sum = slope[i] * slope[i] + slope[128 - 1 - i] * slope[128 - 1 - i];
        assert.ok(Math.abs(sum - 1) < 1e-6, `window not complementary at ${i}: ${sum}`);
    }
});

test("decodes an Ogg Vorbis fixture to PCM with the expected tone", () =>
{
    const bytes = readFileSync(path.join(FIXTURES, "sine-440.ogg"));
    const pcm = CjsOggFormat.read(bytes, { emit: "pcm" });
    const support = CjsOggFormat.isSupported(bytes);

    assert.equal(pcm.payloadType, "pcm");
    assert.equal(pcm.isDecoded, true);
    assert.equal(pcm.containerOnly, false);
    assert.equal(pcm.sampleFormat, "float32");
    assert.equal(pcm.channels, 2);
    assert.equal(pcm.sampleRate, 48000);
    assert.ok(pcm.frameCount > 0.3 * 48000 && pcm.frameCount <= 0.36 * 48000, `frameCount ${pcm.frameCount}`);
    assert.ok(pcm.data instanceof Float32Array);
    assert.equal(pcm.data.length, pcm.frameCount * 2);
    assert.equal(pcm.channelData.length, 2);
    assert.equal(support.preferred, "pcm");
    assert.match(support.reason, /PCM decode is supported/u);
    assert.equal(support.variants.find(variant => variant.kind === "pcm").supported, true);

    // steady-state analysis away from the encoder's fade-in
    const start = 4800;
    const count = 9600;
    const left = pcm.channelData[0];
    let sumSq = 0;
    for (let i = start; i < start + count; i++) sumSq += left[i] * left[i];
    const rms = Math.sqrt(sumSq / count);
    assert.ok(rms > 0.02 && rms < 0.9, `sine rms out of range: ${rms}`);

    // Goertzel power at 440Hz vs an off-frequency probe
    const goertzel = (frequency) =>
    {
        const w = (2 * Math.PI * frequency) / 48000;
        const coefficient = 2 * Math.cos(w);
        let s0 = 0, s1 = 0, s2 = 0;
        for (let i = start; i < start + count; i++)
        {
            s0 = left[i] + coefficient * s1 - s2;
            s2 = s1;
            s1 = s0;
        }
        return s1 * s1 + s2 * s2 - coefficient * s1 * s2;
    };
    assert.ok(goertzel(440) > goertzel(1000) * 1000, "440Hz tone is not dominant");
});

test("audio emit mirrors pcm with an audio payload type", () =>
{
    const bytes = readFileSync(path.join(FIXTURES, "sine-440.ogg"));
    const audio = CjsOggFormat.read(bytes, { emit: "audio" });
    assert.equal(audio.payloadType, "audio");
    assert.equal(audio.isDecoded, true);
});

function makeOggPage(packet, options = {})
{
    const headerType = options.headerType ?? 2;
    const serial = options.serial ?? 1;
    const sequence = options.sequence ?? 0;
    const segmentLength = options.segmentLength ?? packet.length;
    const bytes = new Uint8Array(27 + 1 + packet.length);
    bytes.set([ 0x4f, 0x67, 0x67, 0x53, 0, headerType ], 0);
    writeU64LE(bytes, 6, options.granulePosition ?? 0);
    writeU32LE(bytes, 14, serial);
    writeU32LE(bytes, 18, sequence);
    bytes[26] = 1;
    bytes[27] = segmentLength;
    bytes.set(packet, 28);
    writeU32LE(bytes, 22, computeOggCrc(bytes));
    return bytes;
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

function writeU24BE(bytes, offset, value)
{
    bytes[offset] = (value >>> 16) & 0xff;
    bytes[offset + 1] = (value >>> 8) & 0xff;
    bytes[offset + 2] = value & 0xff;
}

function writeU32BE(bytes, offset, value)
{
    bytes[offset] = (value >>> 24) & 0xff;
    bytes[offset + 1] = (value >>> 16) & 0xff;
    bytes[offset + 2] = (value >>> 8) & 0xff;
    bytes[offset + 3] = value & 0xff;
}

function writeU64LE(bytes, offset, value)
{
    writeU32LE(bytes, offset, value);
    writeU32LE(bytes, offset + 4, 0);
}

function computeOggCrc(bytes)
{
    let crc = 0;
    for (let i = 0; i < bytes.length; i++)
    {
        const value = i >= 22 && i < 26 ? 0 : bytes[i];
        crc ^= value << 24;
        for (let bit = 0; bit < 8; bit++)
        {
            crc = (crc & 0x80000000) ? ((crc << 1) ^ 0x04c11db7) : (crc << 1);
        }
    }
    return crc >>> 0;
}
