import assert from "node:assert/strict";
import test from "node:test";
import CjsWebmFormat, { CjsWebmFormat as NamedCjsWebmFormat } from "../../../src/formats/webm/index.js";

test("exports default and named CjsWebmFormat", () =>
{
    assert.equal(CjsWebmFormat, NamedCjsWebmFormat);
    assert.deepEqual(CjsWebmFormat.extensions, [ ".webm" ]);
});

test("inspects webm container", () =>
{
    const bytes = new Uint8Array([ 0x1a, 0x45, 0xdf, 0xa3 ]);
    const info = CjsWebmFormat.inspect(bytes);

    assert.equal(CjsWebmFormat.isWebM(bytes), true);
    assert.equal(info.sourceFormat, "webm");
    assert.equal(info.container, "ebml");
});

test("emits a GPU-free video container payload without decoding frames", () =>
{
    const bytes = makeWebmVideoTrack();
    const video = CjsWebmFormat.read(bytes, { emit: "video" });
    const support = CjsWebmFormat.getSupport(bytes);
    const rawVariant = support.outputs.find((variant) => variant.output === "raw");

    assert.equal(video.payloadType, "video");
    assert.equal(video.sourceFormat, "webm");
    assert.equal(video.container, "ebml");
    assert.equal(video.mimeType, "video/webm");
    assert.deepEqual(video.codecs, [ "V_VP9" ]);
    assert.deepEqual(video.videoCodecs, [ "V_VP9" ]);
    assert.deepEqual(video.audioCodecs, []);
    assert.equal(video.durationTimescale, 1000000000);
    assert.equal(video.tracks[0].codec, "V_VP9");
    assert.equal(video.sourceBytes, bytes);
    assert.equal(support.supported, true);
    assert.equal(rawVariant.passthrough, true);
    assert.equal(support.outputs.find((variant) => variant.output === "video").supported, true);
});

test("inspects WebM Info and video track metadata", () =>
{
    const bytes = makeWebmVideoTrack();
    const info = CjsWebmFormat.inspect(bytes);
    const track = info.tracks[0];

    assert.equal(info.timecodeScale, 1000000);
    assert.equal(info.duration, 2000000000);
    assert.equal(info.durationTimescale, 1000000000);
    assert.equal(info.durationSeconds, 2);
    assert.equal(track.type, "video");
    assert.equal(track.codec, "V_VP9");
    assert.equal(track.id, 1);
    assert.equal(track.width, 1920);
    assert.equal(track.height, 1080);
    assert.equal(track.language, "eng");
    assert.equal(track.defaultDuration, 33333333);
    assert.equal(track.codecPrivateBytes, 2);
    assert.equal(info.clusterCount, 1);
    assert.equal(info.blockCount, 1);
    assert.deepEqual(info.blockTrackIds, [ 1 ]);
    assert.deepEqual(info.clusterTimecodes, [ 100 ]);
    assert.deepEqual(info.blocks, [ {
        trackId: 1,
        timecode: 10,
        absoluteTimecode: 110,
        keyframe: true,
        invisible: false,
        lacing: "none",
        frameCount: 1,
        frameSizes: [ 2 ],
        payloadBytes: 2
    } ]);
});

test("inspects laced WebM block frame sizes", () =>
{
    const cases = [
        [ "xiph", 0x82, new Uint8Array([ 1, 3, 9, 8, 7, 6, 5 ]), [ 3, 2 ] ],
        [ "fixed", 0x84, new Uint8Array([ 1, 9, 8, 7, 6 ]), [ 2, 2 ] ],
        [ "ebml", 0x86, new Uint8Array([ 2, 0x82, 0xc0, 1, 2, 3, 4, 5, 6 ]), [ 2, 3, 1 ] ]
    ];

    for (const [ lacing, flags, payload, frameSizes ] of cases)
    {
        const info = CjsWebmFormat.inspect(makeWebmWithSimpleBlock(flags, payload));
        const block = info.blocks[0];

        assert.equal(block.lacing, lacing);
        assert.equal(block.frameCount, frameSizes.length);
        assert.deepEqual(block.frameSizes, frameSizes);
        assert.equal(block.payloadBytes, payload.byteLength);
        assert.equal(block.lacingError, undefined);
    }
});

function makeWebmVideoTrack()
{
    const info = ebmlElement([ 0x15, 0x49, 0xa9, 0x66 ], concat(
        ebmlElement([ 0x2a, 0xd7, 0xb1 ], u32be(1000000)),
        ebmlElement([ 0x44, 0x89 ], float32be(2000))
    ));
    const video = ebmlElement([ 0xe0 ], concat(
        ebmlElement([ 0xb0 ], u16be(1920)),
        ebmlElement([ 0xba ], u16be(1080))
    ));
    const entry = ebmlElement([ 0xae ], concat(
        ebmlElement([ 0xd7 ], new Uint8Array([ 1 ])),
        ebmlElement([ 0x83 ], new Uint8Array([ 1 ])),
        ebmlElement([ 0x86 ], ascii("V_VP9")),
        ebmlElement([ 0x22, 0xb5, 0x9c ], ascii("eng")),
        ebmlElement([ 0x23, 0xe3, 0x83 ], u32be(33333333)),
        ebmlElement([ 0x63, 0xa2 ], new Uint8Array([ 1, 2 ])),
        video
    ));
    const tracks = ebmlElement([ 0x16, 0x54, 0xae, 0x6b ], entry);
    const block = ebmlElement([ 0xa3 ], new Uint8Array([ 0x81, 0, 10, 0x80, 0, 0 ]));
    const cluster = ebmlElement([ 0x1f, 0x43, 0xb6, 0x75 ], concat(ebmlElement([ 0xe7 ], u16be(100)), block));
    return concat(ebmlElement([ 0x1a, 0x45, 0xdf, 0xa3 ], new Uint8Array()), ebmlElement([ 0x18, 0x53, 0x80, 0x67 ], concat(info, tracks, cluster)));
}

function makeWebmWithSimpleBlock(flags, payload)
{
    const blockPayload = concat(new Uint8Array([ 0x81, 0, 0, flags ]), payload);
    const block = ebmlElement([ 0xa3 ], blockPayload);
    const cluster = ebmlElement([ 0x1f, 0x43, 0xb6, 0x75 ], concat(ebmlElement([ 0xe7 ], u16be(0)), block));
    return concat(ebmlElement([ 0x1a, 0x45, 0xdf, 0xa3 ], new Uint8Array()), ebmlElement([ 0x18, 0x53, 0x80, 0x67 ], cluster));
}

function ebmlElement(id, payload)
{
    return concat(Uint8Array.from(id), new Uint8Array([ 0x80 | payload.length ]), payload);
}

function ascii(value)
{
    return Uint8Array.from(value, (character) => character.charCodeAt(0));
}

function u16be(value)
{
    return new Uint8Array([ (value >>> 8) & 0xff, value & 0xff ]);
}

function u32be(value)
{
    return new Uint8Array([ (value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff ]);
}

function float32be(value)
{
    const bytes = new Uint8Array(4);
    new DataView(bytes.buffer).setFloat32(0, value, false);
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
