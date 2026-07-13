import assert from "node:assert/strict";
import test from "node:test";
import CjsDdsFormat, { CjsDdsFormat as NamedCjsDdsFormat } from "../../../src/formats/dds/index.js";

test("exports default and named CjsDdsFormat", () =>
{
    assert.equal(CjsDdsFormat, NamedCjsDdsFormat);
    assert.deepEqual(CjsDdsFormat.inputTypes, [ "dds" ]);
});

test("inspects dds dimensions and compressed support variant", () =>
{
    const bytes = makeDdsHeader(64, 32, "DXT1");
    const info = CjsDdsFormat.inspect(bytes);
    const support = CjsDdsFormat.isSupported(bytes);

    assert.equal(CjsDdsFormat.isDDS(bytes), true);
    assert.equal(info.payloadType, "texture");
    assert.equal(info.width, 64);
    assert.equal(info.height, 32);
    assert.equal(info.fourCc, "DXT1");
    assert.equal(info.pixelFormat, "bc1-rgba-unorm");
    assert.equal(support.variants[0].kind, "compressed");
});

test("emits compressed dds texture payload", () =>
{
    const bytes = makeDdsHeader(4, 4, "DXT1", [ 1, 2, 3, 4, 5, 6, 7, 8 ]);
    const texture = CjsDdsFormat.read(bytes, { emit: "texture" });

    assert.equal(texture.payloadType, "texture");
    assert.equal(texture.pixelFormat, "bc1-rgba-unorm");
    assert.equal(texture.isCompressed, true);
    assert.equal(texture.mipCount, 1);
    assert.equal(texture.dataBytes, 8);
    assert.equal(texture.expectedDataBytes, 8);
    assert.equal(texture.isDataComplete, true);
    assert.equal(texture.missingDataBytes, 0);
    assert.equal(texture.extraDataBytes, 0);
    assert.equal(texture.subresources.length, 1);
    assert.equal(texture.subresources[0].byteLength, 8);
    assert.deepEqual(Array.from(texture.data), [ 1, 2, 3, 4, 5, 6, 7, 8 ]);
});

test("reports expected and missing DDS texture data bytes during inspection", () =>
{
    const bytes = makeDdsHeader(8, 8, "DXT1", new Uint8Array(8));
    const info = CjsDdsFormat.inspect(bytes);
    const support = CjsDdsFormat.isSupported(bytes);

    assert.equal(info.dataBytes, 8);
    assert.equal(info.expectedDataBytes, 32);
    assert.equal(info.isDataComplete, false);
    assert.equal(info.missingDataBytes, 24);
    assert.equal(info.extraDataBytes, 0);
    assert.equal(support.supported, "partial");
    assert.equal(support.preferred, "dds");
    assert.equal(support.variants.find((variant) => variant.kind === "texture").supported, false);
    assert.match(support.variants.find((variant) => variant.kind === "texture").reason, /truncated/u);
    assert.equal(support.variants.find((variant) => variant.kind === "rgba").supported, false);
    assert.equal(support.variants.find((variant) => variant.kind === "raw").supported, true);
    assert.throws(() => CjsDdsFormat.read(bytes, { emit: "texture" }), (error) =>
    {
        assert.equal(error.code, "CJS_FORMAT_TRUNCATED");
        assert.equal(error.expectedDataBytes, 32);
        assert.equal(error.dataBytes, 8);
        assert.equal(error.missingDataBytes, 24);
        return true;
    });
});

test("emits DX10 cube-array texture subresource face metadata", () =>
{
    const bytes = makeDx10DdsHeader(4, 4, 71, new Uint8Array(12 * 8), {
        arraySize: 2,
        caps2: 0xfe00
    });
    const texture = CjsDdsFormat.read(bytes, { emit: "texture" });

    assert.equal(texture.dimension, "cube");
    assert.equal(texture.faces, 6);
    assert.deepEqual(texture.cubeFaces, [
        "positive-x",
        "negative-x",
        "positive-y",
        "negative-y",
        "positive-z",
        "negative-z"
    ]);
    assert.equal(texture.isCubeComplete, true);
    assert.equal(texture.arraySize, 2);
    assert.equal(texture.subresources.length, 12);
    assert.deepEqual(texture.subresources[0], {
        mip: 0,
        layer: 0,
        arrayIndex: 0,
        face: 0,
        offset: 0,
        byteLength: 8,
        rowPitch: 8,
        slicePitch: 8,
        width: 4,
        height: 4,
        depth: 1
    });
    assert.deepEqual(texture.subresources.slice(4, 8).map((entry) => [ entry.arrayIndex, entry.face, entry.layer ]), [
        [ 0, 4, 4 ],
        [ 0, 5, 5 ],
        [ 1, 0, 6 ],
        [ 1, 1, 7 ]
    ]);
});

test("decodes a BC1 block to canonical RGBA", () =>
{
    const bytes = makeDdsHeader(4, 4, "DXT1", [ 0x00, 0xf8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 ]);
    const rgba = CjsDdsFormat.read(bytes, { emit: "rgba" });
    const support = CjsDdsFormat.isSupported(bytes);

    assert.equal(rgba.payloadType, "rgba");
    assert.equal(rgba.strideBytes, 16);
    assert.equal(rgba.origin, "top-left");
    assert.deepEqual(Array.from(rgba.data.slice(0, 4)), [ 255, 0, 0, 255 ]);
    assert.equal(support.variants.find((variant) => variant.kind === "rgba").supported, true);
});

test("decodes BC2 and BC3 alpha blocks to canonical RGBA", () =>
{
    const bc2 = CjsDdsFormat.read(makeDdsHeader(4, 4, "DXT3", [
        0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
        0x00, 0xf8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ]), { emit: "rgba" });
    const bc3 = CjsDdsFormat.read(makeDdsHeader(4, 4, "DXT5", [
        0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0xf8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ]), { emit: "rgba" });

    assert.deepEqual(Array.from(bc2.data.slice(0, 4)), [ 255, 0, 0, 255 ]);
    assert.deepEqual(Array.from(bc3.data.slice(0, 4)), [ 255, 0, 0, 255 ]);
});

test("decodes BC4 and BC5 channel blocks to canonical RGBA", () =>
{
    const bc4 = CjsDdsFormat.read(makeDdsHeader(4, 4, "ATI1", [
        255, 0, 0, 0, 0, 0, 0, 0
    ]), { emit: "rgba" });
    const bc5 = CjsDdsFormat.read(makeDdsHeader(4, 4, "ATI2", [
        255, 0, 0, 0, 0, 0, 0, 0,
        0, 255, 0, 0, 0, 0, 0, 0
    ]), { emit: "rgba" });

    assert.deepEqual(Array.from(bc4.data.slice(0, 4)), [ 255, 255, 255, 255 ]);
    assert.deepEqual(Array.from(bc5.data.slice(0, 4)), [ 255, 0, 0, 255 ]);
});

test("decodes DX10 half-float HDR DDS to canonical float RGBA", () =>
{
    const payload = new Uint8Array(8);
    writeU16LE(payload, 0, 0x3c00);
    writeU16LE(payload, 2, 0x3800);
    writeU16LE(payload, 4, 0x0000);
    writeU16LE(payload, 6, 0x4000);
    const bytes = makeDx10DdsHeader(1, 1, 10, payload);
    const rgba = CjsDdsFormat.read(bytes, { emit: "rgba" });

    assert.equal(rgba.pixelFormat, "rgba32float");
    assert.equal(rgba.colorSpace, "linear");
    assert.ok(rgba.data instanceof Float32Array);
    assert.deepEqual(Array.from(rgba.data), [ 1, 0.5, 0, 2 ]);
});

test("decodes the legacy A32B32G32R32F DDS float fourCC", () =>
{
    const payload = new Uint8Array(16);
    new DataView(payload.buffer).setFloat32(0, 2, true);
    new DataView(payload.buffer).setFloat32(4, 1, true);
    new DataView(payload.buffer).setFloat32(8, 0.5, true);
    new DataView(payload.buffer).setFloat32(12, 1, true);
    const rgba = CjsDdsFormat.read(makeLegacyFourCcDdsHeader(1, 1, 116, payload), { emit: "rgba" });

    assert.equal(rgba.pixelFormat, "rgba32float");
    assert.deepEqual(Array.from(rgba.data), [ 2, 1, 0.5, 1 ]);
});

test("reports BC6H as native-only until an HDR block decoder is available", () =>
{
    const bytes = makeDx10DdsHeader(4, 4, 95, new Uint8Array(16));
    const support = CjsDdsFormat.isSupported(bytes);

    assert.equal(support.variants.find((variant) => variant.kind === "texture").supported, true);
    assert.equal(support.variants.find((variant) => variant.kind === "rgba").supported, false);
    assert.equal(support.variants.find((variant) => variant.kind === "compressed").nativeOnly, true);
    assert.match(support.variants.find((variant) => variant.kind === "rgba").reason, /native compressed texture only/u);
    assert.equal(CjsDdsFormat.inspect(bytes).nativeTextureOnly, true);
    assert.throws(() => CjsDdsFormat.read(bytes, { emit: "rgba" }), /RGBA decode is not implemented/u);
});

test("reports BC7 as native-only until a software block decoder is available", () =>
{
    const bytes = makeDx10DdsHeader(4, 4, 98, new Uint8Array(16));
    const support = CjsDdsFormat.isSupported(bytes);

    assert.equal(CjsDdsFormat.inspect(bytes).pixelFormat, "bc7-rgba-unorm");
    assert.equal(support.variants.find((variant) => variant.kind === "texture").supported, true);
    assert.equal(support.variants.find((variant) => variant.kind === "rgba").supported, false);
    assert.equal(support.variants.find((variant) => variant.kind === "compressed").nativeOnly, true);
    assert.match(support.variants.find((variant) => variant.kind === "rgba").reason, /native compressed texture only/u);
    assert.equal(CjsDdsFormat.inspect(bytes).nativeTextureOnly, true);
    assert.throws(() => CjsDdsFormat.read(bytes, { emit: "rgba" }), /RGBA decode is not implemented/u);
});

function makeDdsHeader(width, height, fourCc, payload = [])
{
    const bytes = new Uint8Array(128 + payload.length);
    bytes.set([ 0x44, 0x44, 0x53, 0x20 ]);
    writeU32LE(bytes, 4, 124);
    writeU32LE(bytes, 12, height);
    writeU32LE(bytes, 16, width);
    writeU32LE(bytes, 28, 1);
    writeU32LE(bytes, 80, 0x4);
    bytes.set(Array.from(fourCc).map(c => c.charCodeAt(0)), 84);
    bytes.set(payload, 128);
    return bytes;
}

function makeDx10DdsHeader(width, height, dxgiFormat, payload = [], options = {})
{
    const bytes = new Uint8Array(148 + payload.length);
    const mipCount = options.mipCount ?? 1;
    const resourceDimension = options.resourceDimension ?? 3;
    const arraySize = options.arraySize ?? 1;
    const caps2 = options.caps2 ?? 0;

    bytes.set([ 0x44, 0x44, 0x53, 0x20 ]);
    writeU32LE(bytes, 4, 124);
    writeU32LE(bytes, 12, height);
    writeU32LE(bytes, 16, width);
    writeU32LE(bytes, 28, mipCount);
    writeU32LE(bytes, 80, 0x4);
    bytes.set([ 0x44, 0x58, 0x31, 0x30 ], 84);
    writeU32LE(bytes, 112, caps2);
    writeU32LE(bytes, 128, dxgiFormat);
    writeU32LE(bytes, 132, resourceDimension);
    writeU32LE(bytes, 140, arraySize);
    bytes.set(payload, 148);
    return bytes;
}

function makeLegacyFourCcDdsHeader(width, height, fourCcCode, payload = [])
{
    const bytes = new Uint8Array(128 + payload.length);
    bytes.set([ 0x44, 0x44, 0x53, 0x20 ]);
    writeU32LE(bytes, 4, 124);
    writeU32LE(bytes, 12, height);
    writeU32LE(bytes, 16, width);
    writeU32LE(bytes, 28, 1);
    writeU32LE(bytes, 80, 0x4);
    writeU32LE(bytes, 84, fourCcCode);
    bytes.set(payload, 128);
    return bytes;
}

function writeU32LE(bytes, offset, value)
{
    bytes[offset] = value & 0xff;
    bytes[offset + 1] = (value >>> 8) & 0xff;
    bytes[offset + 2] = (value >>> 16) & 0xff;
    bytes[offset + 3] = (value >>> 24) & 0xff;
}

function writeU16LE(bytes, offset, value)
{
    bytes[offset] = value & 0xff;
    bytes[offset + 1] = (value >>> 8) & 0xff;
}
