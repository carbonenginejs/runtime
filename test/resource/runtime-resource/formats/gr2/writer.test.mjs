import assert from "node:assert/strict";
import test from "node:test";
import { CjsCmfFormat } from "../../../../../src/resource/formats/cmf/index.js";
import { CjsGr2Format } from "../../../../../src/resource/formats/gr2/index.js";
import { decompressBitKnit2 } from "../../../../../src/resource/formats/gr2/core/bitknit2.js";
import { packTangentFrames } from "../../../../../src/global/math/tangent.js";

function crc32(bytes, start)
{
    let crc = 0xffffffff;
    for (let index = start; index < bytes.length; index++)
    {
        crc ^= bytes[index];
        for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function geometry(tangent = true)
{
    return {
        meshes: [ {
            name: "triangle",
            vertex: {
                position: [ 0, 0, 0, 1, 0, 0, 0, 1, 0 ],
                normal: tangent ? [ 0, 0, 1, 0, 0, 1, 0, 0, 1 ] : [],
                tangent: tangent ? [ 1, 0, 0, 1, 0, 0, 1, 0, 0 ] : [],
                binormal: tangent ? [ 0, 1, 0, 0, 1, 0, 0, 1, 0 ] : [],
                texcoord0: [ 0, 0, 1, 0, 0, 1 ]
            },
            indices: [ { name: "hull", bytesPerIndex: 2, faces: [ 0, 1, 2 ] } ],
            boneBindings: [],
            morphTargets: []
        } ],
        skeletons: [],
        animations: []
    };
}

function animatedGeometry()
{
    const shared = geometry(false);
    shared.meshes[0].skeleton = 0;
    shared.meshes[0].boneBindings = [ {
        name: "root",
        minBounds: [ 0, 0, 0 ],
        maxBounds: [ 1, 1, 0 ]
    } ];
    shared.meshes[0].vertex.blendIndice = new Array(12).fill(0);
    shared.meshes[0].vertex.blendWeight = [ 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0 ];
    shared.skeletons = [ {
        name: "rig",
        bones: [ "root" ],
        parents: [ 0xffffffff ],
        restTransforms: [ {
            position: [ 0, 0, 0 ],
            rotation: [ 0, 0, 0, 1 ],
            scale: [ 1, 1, 1 ]
        } ],
        invBindTransforms: [ [ 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 ] ],
        boneMasks: []
    } ];
    shared.animations = [ {
        name: "move",
        duration: 1,
        curves: [
            {
                interpolation: "Linear",
                knotType: "Float32",
                valueType: "Float32",
                knotCount: 2,
                valueDimension: 3,
                knots: [ 0, 1 ],
                values: [ 0, 0, 0, 1, 2, 3 ]
            },
            {
                interpolation: "Linear",
                knotType: "Float32",
                valueType: "Float32",
                knotCount: 2,
                valueDimension: 4,
                knots: [ 0, 1 ],
                values: [ 0, 0, 0, 1, 0, 0.38268343, 0, 0.9238795 ]
            }
        ],
        channels: [
            { target: "root", targetType: "BonePosition", curveIndex: 0 },
            { target: "root", targetType: "BoneRotation", curveIndex: 1 }
        ]
    } ];
    return shared;
}

function writeAnimationCurveFormat({
    targetType,
    values,
    knots,
    duration,
    options = {},
    returnRaw = false
})
{
    const shared = animatedGeometry();
    shared.animations[0].duration = duration;
    shared.animations[0].curves = [ {
        interpolation: "Linear",
        knotType: "Float32",
        valueType: "Float32",
        knotCount: knots.length,
        valueDimension: values.length / knots.length,
        knots,
        values
    } ];
    shared.animations[0].channels = [ {
        target: targetType === "MorphTarget" ? "pulse" : "root",
        targetType,
        curveIndex: 0
    } ];
    const bytes = CjsGr2Format.write(CjsCmfFormat.loadShared(shared), options);
    if (returnRaw)
    {
        const raw = CjsGr2Format.readRaw(bytes);
        for (const group of raw.fileInfo.Animations[0].TrackGroups)
        {
            if (targetType === "MorphTarget" && group.VectorTracks.length)
            {
                return group.VectorTracks[0].ValueCurve.CurveData;
            }
            if (!group.TransformTracks.length) continue;
            const track = group.TransformTracks[0];
            if (targetType === "BonePosition") return track.PositionCurve.CurveData;
            if (targetType === "BoneRotation") return track.OrientationCurve.CurveData;
            if (targetType === "BoneScale") return track.ScaleShearCurve.CurveData;
        }
        throw new Error(`missing raw written ${targetType} curve`);
    }
    const json = CjsGr2Format.read(bytes);
    for (const group of json.animations[0].trackGroups)
    {
        if (targetType === "MorphTarget" && group.vectorTracks.length)
        {
            return group.vectorTracks[0].valueCurve.format;
        }
        if (!group.transformTracks.length) continue;
        const track = group.transformTracks[0];
        if (targetType === "BonePosition") return track.position.format;
        if (targetType === "BoneRotation") return track.orientation.format;
        if (targetType === "BoneScale") return track.scaleShear.format;
    }
    throw new Error(`missing written ${targetType} curve`);
}

test("writes a canonical version-7 GR2 header, CRC and fixup tables", () =>
{
    const cmf = CjsCmfFormat.loadShared(geometry());
    const bytes = CjsGr2Format.write(cmf);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    assert.equal(view.getUint32(16, true), 148);
    assert.equal(view.getUint32(32, true), 7);
    assert.equal(view.getUint32(36, true), bytes.length);
    assert.equal(view.getUint32(40, true), crc32(bytes, 104));
    assert.equal(view.getUint32(44, true), 72);
    assert.equal(view.getUint32(48, true), 1);
    assert.equal(view.getUint32(68, true), 0x80000039);
    assert.ok(view.getUint32(136, true) > 0, "pointer fixups");
    assert.ok(view.getUint32(144, true) > 0, "mixed-marshalling vertex fixup");
});

test("writes BitKnit2 raw-quantum sections and fixup tables", () =>
{
    const cmf = CjsCmfFormat.loadShared(animatedGeometry());
    const plain = CjsGr2Format.write(cmf);
    const packed = CjsGr2Format.write(cmf, { sectionCompression: "bitknit2Raw" });
    const plainView = new DataView(plain.buffer, plain.byteOffset, plain.byteLength);
    const packedView = new DataView(packed.buffer, packed.byteOffset, packed.byteLength);
    const readU32 = (view, offset) => view.getUint32(offset, true);
    const align4 = value => Math.ceil(value / 4) * 4;
    const rawBitKnitSize = length => length === 0
        ? 0
        : 2 + 2 * Math.ceil(length / 0x10000) + length + (length & 1);

    assert.equal(readU32(packedView, 16), 148);
    assert.equal(readU32(packedView, 104), 4);
    assert.equal(readU32(packedView, 108), 148);
    assert.equal(readU32(packedView, 120), 4);
    assert.equal(readU32(packedView, 124), 0);
    assert.equal(readU32(packedView, 128), 0);
    assert.equal(readU32(packedView, 40), crc32(packed, 104));
    assert.equal(readU32(packedView, 36), packed.length);
    assert.equal(readU32(packedView, 56), readU32(plainView, 56));
    assert.equal(readU32(packedView, 64), readU32(plainView, 64));

    const plainDataOffset = readU32(plainView, 108);
    const plainDataSize = readU32(plainView, 112);
    const packedDataOffset = readU32(packedView, 108);
    const packedDataSize = readU32(packedView, 112);
    assert.equal(packedDataSize, rawBitKnitSize(plainDataSize));
    assert.equal(readU32(packedView, 116), plainDataSize);
    assert.deepEqual(
        decompressBitKnit2(packed.subarray(packedDataOffset, packedDataOffset + packedDataSize), plainDataSize),
        plain.subarray(plainDataOffset, plainDataOffset + plainDataSize)
    );

    let precedingEnd = packedDataOffset + packedDataSize;
    for (const [ offsetField, countField, stride ] of [ [ 132, 136, 12 ], [ 140, 144, 16 ] ])
    {
        const count = readU32(plainView, countField);
        assert.ok(count > 0);
        assert.equal(readU32(packedView, countField), count);
        const plainOffset = readU32(plainView, offsetField);
        const packedOffset = readU32(packedView, offsetField);
        const blockSize = readU32(packedView, packedOffset);
        const rawSize = count * stride;
        assert.equal(packedOffset % 4, 0);
        assert.equal(packedOffset, align4(precedingEnd));
        assert.deepEqual(packed.subarray(precedingEnd, packedOffset), new Uint8Array(packedOffset - precedingEnd));
        assert.equal(blockSize, rawBitKnitSize(rawSize));
        assert.deepEqual(
            decompressBitKnit2(packed.subarray(packedOffset + 4, packedOffset + 4 + blockSize), rawSize),
            plain.subarray(plainOffset, plainOffset + rawSize)
        );
        precedingEnd = packedOffset + 4 + blockSize;
    }

    assert.deepEqual(CjsGr2Format.readRaw(packed), CjsGr2Format.readRaw(plain));
});

test("writes multi-quantum outer sections through the public writer", () =>
{
    const cmf = CjsCmfFormat.loadShared(geometry());
    const sourceName = "x".repeat(70000);
    const plain = CjsGr2Format.write(cmf, { sourceName });
    const packed = CjsGr2Format.write(cmf, {
        sourceName,
        sectionCompression: "bitknit2Raw"
    });
    const plainView = new DataView(plain.buffer, plain.byteOffset, plain.byteLength);
    const packedView = new DataView(packed.buffer, packed.byteOffset, packed.byteLength);
    const plainSize = plainView.getUint32(112, true);
    const packedOffset = packedView.getUint32(108, true);
    const packedSize = packedView.getUint32(112, true);

    assert.ok(plainSize > 0x10000);
    assert.deepEqual(
        decompressBitKnit2(packed.subarray(packedOffset, packedOffset + packedSize), plainSize),
        plain.subarray(plainView.getUint32(108, true), plainView.getUint32(108, true) + plainSize)
    );
    assert.equal(CjsGr2Format.readRaw(packed).fileInfo.FromFileName, sourceName);
});

test("rejects unknown outer-section storage", () =>
{
    const cmf = CjsCmfFormat.loadShared(geometry());
    assert.throws(
        () => CjsGr2Format.write(cmf, { sectionCompression: "oodle" }),
        /unknown sectionCompression/
    );
});

test("writes deterministic packed and unpacked tangent vertex types", () =>
{
    const cmf = CjsCmfFormat.loadShared(geometry());
    const packedA = CjsGr2Format.write(cmf, { tangentMode: "packed" });
    const packedB = CjsGr2Format.write(cmf, { tangentMode: "packed" });
    const unpacked = CjsGr2Format.write(cmf, { tangentMode: "unpacked" });

    assert.deepEqual(packedA, packedB);
    const packedRaw = CjsGr2Format.readRaw(packedA);
    const unpackedRaw = CjsGr2Format.readRaw(unpacked);
    assert.deepEqual(
        packedRaw.fileInfo.Meshes[0].PrimaryVertexData.Vertices.__type.map(item => [ item.name, item.type, item.arrayWidth ]),
        [
            [ "Position", 10, 3 ],
            [ "Tangent", 14, 4 ],
            [ "TextureCoordinates0", 10, 2 ]
        ]
    );
    assert.deepEqual(
        unpackedRaw.fileInfo.Meshes[0].PrimaryVertexData.Vertices.__type.map(item => item.name),
        [ "Position", "Normal", "Tangent", "Binormal", "TextureCoordinates0" ]
    );
});

test("preserves a shared GR2 packed tangent frame through the CMF interim", () =>
{
    const shared = geometry(false);
    shared.meshes[0].vertex.tangent = packTangentFrames(
        [ 0, 0, 1, 0, 0, 1, 0, 0, 1 ],
        [ 1, 0, 0, 1, 0, 0, 1, 0, 0 ],
        [ 0, 1, 0, 0, 1, 0, 0, 1, 0 ]
    );
    const bytes = CjsGr2Format.writeShared(shared);
    const raw = CjsGr2Format.readRaw(bytes);
    assert.deepEqual(raw.fileInfo.Meshes[0].PrimaryVertexData.Vertices.__type.map(item => item.name), [
        "Position", "Tangent", "TextureCoordinates0"
    ]);

    const unpacked = CjsGr2Format.readRaw(CjsGr2Format.writeShared(shared, { tangentMode: "unpacked" }));
    assert.deepEqual(unpacked.fileInfo.Meshes[0].PrimaryVertexData.Vertices.__type.map(item => item.name), [
        "Position", "Normal", "Tangent", "Binormal", "TextureCoordinates0"
    ]);
});

test("writes compressed transform curves, skeleton inverse binds and model bindings", () =>
{
    const cmf = CjsCmfFormat.loadShared(animatedGeometry());
    const bytes = CjsGr2Format.write(cmf);
    const raw = CjsGr2Format.readRaw(bytes);
    const json = CjsGr2Format.read(bytes, { decompressCurves: true });
    const track = json.animations[0].trackGroups[0].transformTracks[0];

    assert.equal(json.models[0].skeleton.bones[0].name, "root");
    assert.deepEqual(raw.fileInfo.Models[0].Skeleton.Bones[0].InverseWorldTransform, [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]);
    assert.equal(raw.fileInfo.Models[0].MeshBindings[0].Mesh, raw.fileInfo.Meshes[0]);
    assert.equal(track.position.format, 18);
    assert.equal(track.orientation.format, 8);
    assert.deepEqual(track.position.knots, [ 0, 1 ]);
    assert.deepEqual(track.position.controls, [ 0, 0, 0, 1, 2, 3 ]);
    assert.ok(Math.abs(track.orientation.controls[5] - 0.38268343) < 1e-4);
    assert.equal(track.scaleShear.format, 2);
});

test("serializes every new automatic curve family through reflected GR2", () =>
{
    const formats = [
        writeAnimationCurveFormat({
            targetType: "MorphTarget",
            knots: [ 0, 1, 2, 3 ],
            values: [ 0, 85, 170, 255 ],
            duration: 3
        }),
        writeAnimationCurveFormat({
            targetType: "BoneRotation",
            knots: [ 0, 1 ],
            values: [ 0, 0, 0, 1, 0, 0.38268343, 0, 0.9238795 ],
            duration: 1,
            options: { orientationTolerance: 0.1 }
        }),
        writeAnimationCurveFormat({
            targetType: "BonePosition",
            knots: [ 0, 1, 255 ],
            values: [ 0, 0, 0, 255, 0, 0, 0, 255, 0 ],
            duration: 255
        }),
        writeAnimationCurveFormat({
            targetType: "BoneScale",
            knots: [ 0, 1, 2, 255 ],
            values: [ 0, 0, 0, 85, 85, 85, 170, 170, 170, 255, 255, 255 ],
            duration: 255
        }),
        writeAnimationCurveFormat({
            targetType: "BoneScale",
            knots: [ 0, 1, 255 ],
            values: [ 0, 0, 0, 255, 0, 128, 0, 255, 255 ],
            duration: 255,
            options: { scaleShearTolerance: 1 }
        }),
        writeAnimationCurveFormat({
            targetType: "BonePosition",
            knots: [ 0, 0.5, 1 ],
            values: [ 0, 0, 0, 0.12345679, 0.24691358, 0.37037037, 1, 2, 3 ],
            duration: 1,
            options: { positionTolerance: 1e-7 }
        }),
        writeAnimationCurveFormat({
            targetType: "BonePosition",
            knots: [ 0, 0.5, 1 ],
            values: [ 0, 0, 0, 0.12345, 0.2469, 0.37035, 1, 2, 3 ],
            duration: 1,
            options: { positionTolerance: 1e-4 }
        }),
        writeAnimationCurveFormat({
            targetType: "BonePosition",
            knots: [ 0, 1 ],
            values: [ 0, 1, 2, 3, 4, 5 ],
            duration: 1
        })
    ];

    assert.deepEqual(formats, [ 7, 9, 11, 14, 15, 16, 17, 18 ]);
});

test("reflects 8-bit curve payloads with the exact UInt8 schemas", () =>
{
    const curves = [
        writeAnimationCurveFormat({
            targetType: "MorphTarget",
            knots: [ 0, 1, 2, 3 ],
            values: [ 0, 85, 170, 255 ],
            duration: 3,
            returnRaw: true
        }),
        writeAnimationCurveFormat({
            targetType: "BoneRotation",
            knots: [ 0, 1 ],
            values: [ 0, 0, 0, 1, 0, 0.38268343, 0, 0.9238795 ],
            duration: 1,
            options: { orientationTolerance: 0.1 },
            returnRaw: true
        }),
        writeAnimationCurveFormat({
            targetType: "BonePosition",
            knots: [ 0, 1, 255 ],
            values: [ 0, 0, 0, 255, 0, 0, 0, 255, 0 ],
            duration: 255,
            returnRaw: true
        }),
        writeAnimationCurveFormat({
            targetType: "BoneScale",
            knots: [ 0, 1, 2, 255 ],
            values: [ 0, 0, 0, 85, 85, 85, 170, 170, 170, 255, 255, 255 ],
            duration: 255,
            returnRaw: true
        }),
        writeAnimationCurveFormat({
            targetType: "BoneScale",
            knots: [ 0, 1, 255 ],
            values: [ 0, 0, 0, 255, 0, 128, 0, 255, 255 ],
            duration: 255,
            options: { scaleShearTolerance: 1 },
            returnRaw: true
        })
    ];
    const headers = [
        "CurveDataHeader_DaK8uC8u",
        "CurveDataHeader_D4nK8uC7u",
        "CurveDataHeader_D3K8uC8u",
        "CurveDataHeader_D9I1K8uC8u",
        "CurveDataHeader_D9I3K8uC8u"
    ];
    const keys = [
        [ headers[0], "OneOverKnotScaleTrunc", "ControlScaleOffsets", "KnotsControls" ],
        [ headers[1], "ScaleOffsetTableEntries", "OneOverKnotScale", "KnotsControls" ],
        [ headers[2], "OneOverKnotScaleTrunc", "ControlScales", "ControlOffsets", "KnotsControls" ],
        [ headers[3], "OneOverKnotScaleTrunc", "ControlScale", "ControlOffset", "KnotsControls" ],
        [ headers[4], "OneOverKnotScaleTrunc", "ControlScales", "ControlOffsets", "KnotsControls" ]
    ];

    for (let index = 0; index < curves.length; index++)
    {
        assert.equal(curves[index][headers[index]].Format, [ 7, 9, 11, 14, 15 ][index]);
        assert.equal(curves[index][headers[index]].Degree, 1);
        assert.deepEqual(Object.keys(curves[index]), keys[index]);
        assert.ok(curves[index].KnotsControls.every(item => Object.hasOwn(item, "UInt8")));
    }
    assert.equal(curves[0].ControlScaleOffsets.length, 2);
    for (const index of [ 0, 2, 3, 4 ]) assert.ok(Number.isInteger(curves[index].OneOverKnotScaleTrunc));
    assert.ok(Number.isInteger(curves[1].ScaleOffsetTableEntries));
    assert.equal(typeof curves[1].OneOverKnotScale, "number");
    assert.deepEqual([ curves[2].ControlScales.length, curves[2].ControlOffsets.length ], [ 3, 3 ]);
    assert.deepEqual([ typeof curves[3].ControlScale, typeof curves[3].ControlOffset ], [ "number", "number" ]);
    assert.deepEqual([ curves[4].ControlScales.length, curves[4].ControlOffsets.length ], [ 3, 3 ]);
});

test("can explicitly emit float curve payloads", () =>
{
    const cmf = CjsCmfFormat.loadShared(animatedGeometry());
    const bytes = CjsGr2Format.write(cmf, { compressedCurves: false });
    const track = CjsGr2Format.read(bytes).animations[0].trackGroups[0].transformTracks[0];
    assert.equal(track.position.format, 1);
    assert.equal(track.orientation.format, 1);
});

test("writes native CMF graphs read from binary CMF bytes", () =>
{
    const cmfBytes = CjsCmfFormat.writeShared(animatedGeometry());
    const cmf = CjsCmfFormat.read(cmfBytes);
    const gr2 = CjsGr2Format.write(cmf);
    const track = CjsGr2Format.read(gr2, { decompressCurves: true })
        .animations[0].trackGroups[0].transformTracks[0];

    assert.deepEqual(track.position.controls, [ 0, 0, 0, 1, 2, 3 ]);
    assert.ok(Math.abs(track.orientation.controls[5] - 0.38268343) < 1e-4);
});
