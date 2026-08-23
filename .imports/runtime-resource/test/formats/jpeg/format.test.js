import assert from "node:assert/strict";
import test from "node:test";
import CjsJpegFormat, { CjsJpegFormat as NamedCjsJpegFormat } from "../../../src/formats/jpeg/index.js";

test("exports default and named CjsJpegFormat", () =>
{
    assert.equal(CjsJpegFormat, NamedCjsJpegFormat);
    assert.deepEqual(CjsJpegFormat.extensions, [ ".jpg", ".jpeg" ]);
    assert.deepEqual(Object.values(CjsJpegFormat.outputs).filter(entry => entry.role === "runtime").map(entry => entry.output), [ "image", "rgba" ]);
});

test("inspects jpeg marker and exposes raw fallback", () =>
{
    const bytes = new Uint8Array([ 0xff, 0xd8, 0xff, 0xd9 ]);
    const info = CjsJpegFormat.inspect(bytes);
    const raw = CjsJpegFormat.read(bytes);
    const support = CjsJpegFormat.getSupport(bytes);
    const rawVariant = support.outputs.find((variant) => variant.output === "raw");

    assert.equal(CjsJpegFormat.isJPEG(bytes), true);
    assert.equal(CjsJpegFormat.isJPG(bytes), true);
    assert.equal(info.sourceFormat, "jpeg");
    assert.equal(support.preferredOutput, "raw");
    assert.equal(rawVariant.supported, true);
    assert.equal(rawVariant.passthrough, true);
    assert.equal(rawVariant.decoded, false);
    assert.equal(raw.mimeType, "image/jpeg");
});

test("inspects JPEG APP and comment marker summary", () =>
{
    const info = CjsJpegFormat.inspect(concat(
        new Uint8Array([ 0xff, 0xd8 ]),
        jpegSegment(0xe1, new Uint8Array([ 0x45, 0x78, 0x69, 0x66, 0, 0 ])),
        jpegSegment(0xe2, new Uint8Array([ 0x49, 0x43, 0x43, 0x5f, 0x50, 0x52, 0x4f, 0x46, 0x49, 0x4c, 0x45, 0 ])),
        jpegSegment(0xfe, new Uint8Array([ 1, 2, 3, 4, 5, 6, 7, 8 ])),
        new Uint8Array([ 0xff, 0xd9 ])
    ));

    assert.equal(info.appMarkerCount, 2);
    assert.equal(info.commentCount, 1);
    assert.equal(info.hasExif, true);
    assert.equal(info.hasIccProfile, true);
});

test("software-decodes a baseline JPEG to canonical RGBA", () =>
{
    const bytes = Uint8Array.from(Buffer.from(
        "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAP/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AJgA/9k=",
        "base64"));
    const rgba = CjsJpegFormat.read(bytes, { emit: "rgba" });
    const support = CjsJpegFormat.getSupport(bytes);

    assert.equal(rgba.payloadType, "rgba");
    assert.equal(rgba.mimeType, "image/jpeg");
    assert.equal(rgba.width, 1);
    assert.equal(rgba.height, 1);
    assert.equal(rgba.data.length, 4);
    assert.equal(rgba.data[3], 255);
    assert.equal(rgba.metadata.decoder, "software-baseline");
    assert.equal(support.supported, true);
    assert.equal(support.outputs.find((variant) => variant.output === "rgba").decoded, true);
});

test("reports truncated or unsupported JPEG frames without claiming RGBA", () =>
{
    const support = CjsJpegFormat.getSupport(new Uint8Array([ 0xff, 0xd8, 0xff, 0xd9 ]));
    assert.equal(support.outputs.find((variant) => variant.output === "rgba").supported, false);
    assert.throws(() => CjsJpegFormat.read(new Uint8Array([ 0xff, 0xd8, 0xff, 0xd9 ]), { emit: "rgba" }), /baseline frame metadata/u);
});

test("rejects texture output because JPEG is not a GPU texture container", () =>
{
    assert.throws(() => CjsJpegFormat.read(new Uint8Array([ 0xff, 0xd8, 0xff, 0xd9 ]), { emit: "texture" }), /unknown emit value/u);
});

function jpegSegment(marker, data)
{
    const bytes = new Uint8Array(4 + data.length);
    bytes[0] = 0xff;
    bytes[1] = marker;
    bytes[2] = ((data.length + 2) >>> 8) & 0xff;
    bytes[3] = (data.length + 2) & 0xff;
    bytes.set(data, 4);
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
