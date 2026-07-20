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

test("decodes unsigned BC6H to canonical float RGBA", () =>
{
    const bytes = makeDx10DdsHeader(4, 4, 95, makeBc6hMode11Block(0x200, 0x200));
    const support = CjsDdsFormat.isSupported(bytes);
    const rgba = CjsDdsFormat.read(bytes, { emit: "rgba" });

    assert.equal(support.variants.find((variant) => variant.kind === "texture").supported, true);
    assert.equal(support.variants.find((variant) => variant.kind === "rgba").supported, true);
    assert.equal(support.variants.find((variant) => variant.kind === "compressed").nativeOnly, false);
    assert.equal(CjsDdsFormat.inspect(bytes).nativeTextureOnly, false);
    assert.equal(rgba.pixelFormat, "rgba32float");
    assert.equal(rgba.strideBytes, 64);
    assert.equal(rgba.colorSpace, "linear");
    assert.ok(rgba.data instanceof Float32Array);
    assert.deepEqual(Array.from(rgba.data.slice(0, 4)), [ 1.5146484375, 1.5146484375, 1.5146484375, 1 ]);
});

test("decodes signed BC6H negative HDR values", () =>
{
    const bytes = makeDx10DdsHeader(4, 4, 96, makeBc6hMode11Block(0x300, 0x300));
    const rgba = CjsDdsFormat.read(bytes, { emit: "rgba" });

    assert.equal(CjsDdsFormat.inspect(bytes).pixelFormat, "bc6h-rgb-float");
    assert.deepEqual(Array.from(rgba.data.slice(0, 4)), [ -1.5302734375, -1.5302734375, -1.5302734375, 1 ]);
});

test("decodes BC6H endpoint interpolation and anchor-shortened indices", () =>
{
    const bytes = makeDx10DdsHeader(4, 4, 95, makeBc6hMode11Block(0, 0x3ff, [ 0, 15 ]));
    const rgba = CjsDdsFormat.read(bytes, { emit: "rgba" });

    assert.deepEqual(Array.from(rgba.data.slice(0, 4)), [ 0, 0, 0, 1 ]);
    assert.deepEqual(Array.from(rgba.data.slice(4, 8)), [ 65504, 65504, 65504, 1 ]);
});

test("recognizes all fourteen BC6H modes and reserved opaque-black modes", () =>
{
    const validModes = [ 0x00, 0x01, 0x02, 0x06, 0x0a, 0x0e, 0x12, 0x16, 0x1a, 0x1e, 0x03, 0x07, 0x0b, 0x0f ];
    const reservedModes = [ 0x13, 0x17, 0x1b, 0x1f ];

    for (const mode of [ ...validModes, ...reservedModes ])
    {
        const block = new Uint8Array(16);
        block[0] = mode;
        const rgba = CjsDdsFormat.read(makeDx10DdsHeader(4, 4, 95, block), { emit: "rgba" });
        for (let pixel = 0; pixel < 16; pixel++)
        {
            assert.deepEqual(Array.from(rgba.data.slice(pixel * 4, pixel * 4 + 4)), [ 0, 0, 0, 1 ], `BC6H mode 0x${mode.toString(16)}`);
        }
    }
});

test("decodes BC7 to canonical RGBA without requiring Node Buffer", () =>
{
    const bytes = makeDx10DdsHeader(4, 4, 98, new Uint8Array([
        0xc0, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x7f,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ]));
    const previousBuffer = globalThis.Buffer;
    globalThis.Buffer = undefined;

    try
    {
        const support = CjsDdsFormat.isSupported(bytes);
        const rgba = CjsDdsFormat.read(bytes, { emit: "rgba" });

        assert.equal(CjsDdsFormat.inspect(bytes).pixelFormat, "bc7-rgba-unorm");
        assert.equal(support.variants.find((variant) => variant.kind === "texture").supported, true);
        assert.equal(support.variants.find((variant) => variant.kind === "rgba").supported, true);
        assert.equal(support.variants.find((variant) => variant.kind === "compressed").nativeOnly, false);
        assert.equal(CjsDdsFormat.inspect(bytes).nativeTextureOnly, false);
        assert.deepEqual(Array.from(rgba.data.slice(0, 4)), [ 254, 254, 254, 254 ]);
    }
    finally
    {
        globalThis.Buffer = previousBuffer;
    }
});

test("decodes all eight BC7 block modes", () =>
{
    for (let mode = 0; mode < 8; mode++)
    {
        const bytes = makeDx10DdsHeader(4, 4, 98, makeSolidBc7Block(mode));
        const rgba = CjsDdsFormat.read(bytes, { emit: "rgba" });

        assert.deepEqual(Array.from(rgba.data), new Array(16 * 4).fill(255), `BC7 mode ${mode}`);
    }
});

test("decodes BC7 partitions, anchor indices, dual indices, and channel rotation", () =>
{
    const partitioned = CjsDdsFormat.read(makeDx10DdsHeader(4, 4, 98, makeBc7Block(7, {
        partition: 17,
        endpoints: [
            [ 31, 0, 0, 31 ],
            [ 31, 0, 0, 31 ],
            [ 0, 31, 0, 31 ],
            [ 0, 31, 0, 31 ]
        ],
        pBits: [ 0, 0, 0, 0 ]
    })), { emit: "rgba" });

    assert.deepEqual(Array.from(partitioned.data.slice(0, 4)), [ 251, 0, 0, 251 ]);
    assert.deepEqual(Array.from(partitioned.data.slice(4, 8)), [ 0, 251, 0, 251 ]);
    assert.deepEqual(Array.from(partitioned.data.slice(7 * 4, 8 * 4)), [ 0, 251, 0, 251 ]);
    assert.deepEqual(Array.from(partitioned.data.slice(8 * 4, 9 * 4)), [ 251, 0, 0, 251 ]);

    const rotated = CjsDdsFormat.read(makeDx10DdsHeader(4, 4, 98, makeBc7Block(4, {
        rotation: 1,
        selection: 1,
        endpoints: [ [ 0, 0, 0, 0 ], [ 31, 0, 0, 63 ] ],
        secondaryIndices: [ 0, 7 ]
    })), { emit: "rgba" });

    assert.deepEqual(Array.from(rotated.data.slice(0, 4)), [ 0, 0, 0, 0 ]);
    assert.deepEqual(Array.from(rotated.data.slice(4, 8)), [ 0, 0, 0, 255 ]);
});

test("decodes the reserved BC7 mode as transparent black", () =>
{
    const rgba = CjsDdsFormat.read(makeDx10DdsHeader(4, 4, 98, new Uint8Array(16)), { emit: "rgba" });
    assert.deepEqual(Array.from(rgba.data), new Array(16 * 4).fill(0));
});

const BC7_MODES = Object.freeze([
    { subsets: 3, partitionBits: 4, rotationBits: 0, selectionBits: 0, colorBits: 4, alphaBits: 0, endpointPBits: 1, sharedPBits: 0, indexBits: 3, secondaryIndexBits: 0 },
    { subsets: 2, partitionBits: 6, rotationBits: 0, selectionBits: 0, colorBits: 6, alphaBits: 0, endpointPBits: 0, sharedPBits: 1, indexBits: 3, secondaryIndexBits: 0 },
    { subsets: 3, partitionBits: 6, rotationBits: 0, selectionBits: 0, colorBits: 5, alphaBits: 0, endpointPBits: 0, sharedPBits: 0, indexBits: 2, secondaryIndexBits: 0 },
    { subsets: 2, partitionBits: 6, rotationBits: 0, selectionBits: 0, colorBits: 7, alphaBits: 0, endpointPBits: 1, sharedPBits: 0, indexBits: 2, secondaryIndexBits: 0 },
    { subsets: 1, partitionBits: 0, rotationBits: 2, selectionBits: 1, colorBits: 5, alphaBits: 6, endpointPBits: 0, sharedPBits: 0, indexBits: 2, secondaryIndexBits: 3 },
    { subsets: 1, partitionBits: 0, rotationBits: 2, selectionBits: 0, colorBits: 7, alphaBits: 8, endpointPBits: 0, sharedPBits: 0, indexBits: 2, secondaryIndexBits: 2 },
    { subsets: 1, partitionBits: 0, rotationBits: 0, selectionBits: 0, colorBits: 7, alphaBits: 7, endpointPBits: 1, sharedPBits: 0, indexBits: 4, secondaryIndexBits: 0 },
    { subsets: 2, partitionBits: 6, rotationBits: 0, selectionBits: 0, colorBits: 5, alphaBits: 5, endpointPBits: 1, sharedPBits: 0, indexBits: 2, secondaryIndexBits: 0 }
]);

function makeBc6hMode11Block(endpoint0, endpoint1, indices = [])
{
    const bytes = new Uint8Array(16);
    writeBitsAt(bytes, 0, 5, 0x03);
    for (const offset of [ 5, 15, 25 ]) writeBitsAt(bytes, offset, 10, endpoint0);
    for (const offset of [ 35, 45, 55 ]) writeBitsAt(bytes, offset, 10, endpoint1);
    let offset = 65;
    for (let pixel = 0; pixel < 16; pixel++)
    {
        const count = pixel === 0 ? 3 : 4;
        writeBitsAt(bytes, offset, count, indices[pixel] ?? 0);
        offset += count;
    }
    return bytes;
}

function writeBitsAt(bytes, offset, count, value)
{
    for (let bit = 0; bit < count; bit++)
    {
        bytes[(offset + bit) >>> 3] |= ((value >>> bit) & 1) << ((offset + bit) & 7);
    }
}

function makeSolidBc7Block(mode)
{
    const info = BC7_MODES[mode];
    const endpoints = Array.from({ length: info.subsets * 2 }, () => [
        (1 << info.colorBits) - 1,
        (1 << info.colorBits) - 1,
        (1 << info.colorBits) - 1,
        info.alphaBits ? (1 << info.alphaBits) - 1 : 255
    ]);
    return makeBc7Block(mode, { endpoints });
}

function makeBc7Block(mode, options = {})
{
    const info = BC7_MODES[mode];
    const bytes = new Uint8Array(16);
    let offset = 0;
    const write = (value, bitCount) =>
    {
        for (let bit = 0; bit < bitCount; bit++)
        {
            bytes[offset >>> 3] |= ((value >>> bit) & 1) << (offset & 7);
            offset++;
        }
    };

    write(1 << mode, mode + 1);
    write(options.partition ?? 0, info.partitionBits);
    write(options.rotation ?? 0, info.rotationBits);
    write(options.selection ?? 0, info.selectionBits);

    const endpoints = options.endpoints;
    for (let channel = 0; channel < 3; channel++)
    {
        for (const endpoint of endpoints) write(endpoint[channel], info.colorBits);
    }
    if (info.alphaBits)
    {
        for (const endpoint of endpoints) write(endpoint[3], info.alphaBits);
    }

    const pBitCount = info.endpointPBits ? info.subsets * 2 : (info.sharedPBits ? info.subsets : 0);
    for (let i = 0; i < pBitCount; i++) write(options.pBits?.[i] ?? 1, 1);

    if (info.secondaryIndexBits)
    {
        writeSingleSubsetIndices(options.primaryIndices ?? [], info.indexBits, write);
        writeSingleSubsetIndices(options.secondaryIndices ?? [], info.secondaryIndexBits, write);
    }

    assert.ok(offset <= 128, `BC7 mode ${mode} fixture overflowed its block`);
    return bytes;
}

function writeSingleSubsetIndices(indices, bitCount, write)
{
    for (let pixel = 0; pixel < 16; pixel++) write(indices[pixel] ?? 0, bitCount - (pixel === 0 ? 1 : 0));
}

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
