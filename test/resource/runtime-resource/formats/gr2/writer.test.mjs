import assert from "node:assert/strict";
import test from "node:test";
import { CjsCmfFormat } from "../../../../../src/resource/formats/cmf/index.js";
import { CjsGr2Format } from "../../../../../src/resource/formats/gr2/index.js";
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
    assert.equal(track.position.format, 10);
    assert.equal(track.orientation.format, 8);
    assert.deepEqual(track.position.knots, [ 0, 1 ]);
    assert.deepEqual(track.position.controls, [ 0, 0, 0, 1, 2, 3 ]);
    assert.ok(Math.abs(track.orientation.controls[5] - 0.38268343) < 1e-4);
    assert.equal(track.scaleShear.format, 2);
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
