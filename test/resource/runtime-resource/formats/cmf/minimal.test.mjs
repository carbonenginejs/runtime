import assert from "node:assert/strict";
import test from "node:test";
import { MeshoptEncoder } from "meshoptimizer/encoder";
import CjsCmfFormat, { CjsCmfFormat as NamedCjsCmfFormat } from "../../../../../src/resource/formats/cmf/index.js";

test("exports default and named CjsCmfFormat", () =>
{
    assert.equal(CjsCmfFormat, NamedCjsCmfFormat);
    assert.deepEqual(Object.values(CjsCmfFormat.outputs).filter(entry => entry.role === "runtime").map(entry => entry.output), [ "cmf", "gr2", "shared" ]);
    assert.deepEqual(Object.values(CjsCmfFormat.outputs).filter(entry => entry.role === "debug").map(entry => entry.output), [ "json", "cmfJson", "raw" ]);
});

test("reads a minimal empty CMF v1 file", () =>
{
    const bytes = makeMinimalCmf();
    const result = CjsCmfFormat.read(bytes);

    assert.equal(result.version, 1);
    assert.equal(result.sections.length, 1);
    assert.deepEqual(result.meshes, []);
    assert.deepEqual(result.skeletons, []);
    assert.deepEqual(result.animations, []);
});

test("reads a tiny uncompressed CMF mesh as native geometry by default", () =>
{
    const result = CjsCmfFormat.read(makeTriangleCmf(false));
    const mesh = result.meshes[0];

    assert.equal(mesh.name, "tri");
    assert.deepEqual(mesh.bounds.min, [ 1, 2, 3 ]);
    assert.deepEqual(mesh.bounds.max, [ 1, 2, 3 ]);
    assert.deepEqual(mesh.vertex.position, [ 1, 2, 3 ]);
    assert.deepEqual(mesh.indices, [ {
        name: "",
        bytesPerIndex: 2,
        faces: [ 0, 0, 0 ]
    } ]);
});

test("can emit shared geometry from a CMF reader", () =>
{
    const result = CjsCmfFormat.readShared(makeTriangleCmf(false));
    const mesh = result.meshes[0];

    assert.equal(result.cmfVersion, 1);
    assert.equal(mesh.name, "tri");
    assert.deepEqual(mesh.minBounds, [ 1, 2, 3 ]);
    assert.deepEqual(mesh.maxBounds, [ 1, 2, 3 ]);
    assert.deepEqual(mesh.vertex.position, [ 1, 2, 3 ]);
    assert.deepEqual(mesh.indices[0].faces, [ 0, 0, 0 ]);
});

test("can emit GR2 compatibility classes from a CMF reader", () =>
{
    class TestModel
    {
        SetValues(values)
        {
            Object.assign(this, values);
            return this;
        }
    }

    class Root extends TestModel {}
    class Mesh extends TestModel {}
    class IndexGroup extends TestModel {}
    class BareRoot {}

    assert.throws(
        () => CjsCmfFormat.read(makeTriangleCmf(false), { emit: "gr2" }),
        /requires explicit classes/
    );

    assert.throws(
        () => CjsCmfFormat.read(makeTriangleCmf(false), { emit: "gr2", classes: { Root: BareRoot } }),
        /requires classes to implement SetValues/
    );

    const result = CjsCmfFormat.read(makeTriangleCmf(false), {
        emit: "gr2",
        classes: { Root, Mesh, IndexGroup }
    });

    assert.ok(result instanceof Root);
    assert.ok(result.meshes[0] instanceof Mesh);
    assert.ok(result.meshes[0].indices[0] instanceof IndexGroup);
    assert.equal(result.grannyFileSource, "cmf");
});

test("loads shared geometry into CMF-native JSON", () =>
{
    const result = CjsCmfFormat.loadShared({
        meshes: [ {
            name: "shared",
            minBounds: [ 0, 0, 0 ],
            maxBounds: [ 1, 1, 1 ],
            vertex: {
                position: [ 0, 0, 0, 1, 0, 0, 0, 1, 0 ],
                normal: [],
                tangent: [],
                binormal: [],
                texcoord0: [],
                texcoord1: [],
                blendIndice: [],
                blendWeight: []
            },
            indices: [ { name: "main", bytesPerIndex: 2, faces: [ 0, 1, 2 ] } ]
        } ]
    });

    assert.equal(result.version, 1);
    assert.equal(result.meshes[0].name, "shared");
    assert.equal(result.meshes[0].decl[0].usage, "Position");
    assert.equal(result.meshes[0].lods[0].vb.stride, 12);
    assert.deepEqual(result.meshes[0].indices[0].faces, [ 0, 1, 2 ]);
});

test("preserves shared packed tangent frames through native and binary CMF", () =>
{
    const packedTangent = [
        0, 0, 0, 1,
        0, 0, 0, 1,
        0, 0, 0, 1
    ];
    const shared = {
        meshes: [ {
            name: "packed",
            vertex: {
                position: [ 0, 0, 0, 1, 0, 0, 0, 1, 0 ],
                tangent: packedTangent
            },
            indices: [ { name: "main", bytesPerIndex: 2, faces: [ 0, 1, 2 ] } ]
        } ]
    };

    const native = CjsCmfFormat.loadShared(shared);
    assert.deepEqual(native.meshes[0].vertex.packedTangentLegacy, packedTangent);
    assert.deepEqual(native.meshes[0].vertex.tangent, []);
    assert.deepEqual(native.meshes[0].decl.find(element => element.usage === "PackedTangentLegacy"), {
        usage: "PackedTangentLegacy",
        usageIndex: 0,
        type: "UInt16Norm",
        elementCount: 4,
        offset: 12
    });

    const binary = CjsCmfFormat.read(CjsCmfFormat.writeShared(shared), { emit: "raw" });
    assert.deepEqual(binary.meshes[0].vertex.packedTangentLegacy, packedTangent);
    assert.equal(binary.meshes[0].decl.some(element => element.usage === "Normal"), false);
    assert.equal(binary.meshes[0].decl.some(element => element.usage === "Binormal"), false);
});

test("loads shared skinned geometry into CMF-native JSON", () =>
{
    const result = CjsCmfFormat.loadShared({
        meshes: [ {
            name: "skinned",
            minBounds: [ 0, 0, 0 ],
            maxBounds: [ 1, 1, 0 ],
            boneBindings: [
                { name: "root", minBounds: [ 0, 0, 0 ], maxBounds: [ 1, 1, 0 ] }
            ],
            vertex: {
                position: [ 0, 0, 0, 1, 0, 0, 0, 1, 0 ],
                blendIndice: [
                    0, 0, 0, 0,
                    0, 0, 0, 0,
                    0, 0, 0, 0
                ],
                blendWeight: [
                    1, 0, 0, 0,
                    1, 0, 0, 0,
                    1, 0, 0, 0
                ]
            },
            indices: [ { name: "main", bytesPerIndex: 2, faces: [ 0, 1, 2 ] } ]
        } ]
    });

    const mesh = result.meshes[0];

    assert.deepEqual(mesh.decl.map(element => ({
        usage: element.usage,
        type: element.type,
        elementCount: element.elementCount,
        offset: element.offset
    })), [
        { usage: "Position", type: "Float32", elementCount: 3, offset: 0 },
        { usage: "BoneIndices", type: "UInt16", elementCount: 4, offset: 12 },
        { usage: "BoneWeights", type: "Float32", elementCount: 4, offset: 20 }
    ]);
    assert.equal(mesh.areas[0].affectedByBones, true);
    assert.deepEqual(mesh.boneBindings, [
        { name: "root", bounds: { min: [ 0, 0, 0 ], max: [ 1, 1, 0 ] } }
    ]);
    assert.equal(mesh.lods[0].vb.stride, 36);
});

test("synthesizes rigid weights for shared BoneIndices without BoneWeights", () =>
{
    const result = CjsCmfFormat.loadShared({
        meshes: [ {
            name: "rigid",
            boneBindings: [ { name: "root" }, { name: "moving" } ],
            vertex: {
                position: [ 0, 0, 0, 1, 0, 0, 0, 1, 0 ],
                blendIndice: [
                    0, 0, 0, 0,
                    1, 0, 0, 0,
                    1, 0, 0, 0
                ]
            },
            indices: [ { name: "main", bytesPerIndex: 2, faces: [ 0, 1, 2 ] } ]
        } ]
    });

    assert.deepEqual(result.meshes[0].vertex.blendWeight, [
        1, 0, 0, 0,
        1, 0, 0, 0,
        1, 0, 0, 0
    ]);
    assert.equal(result.meshes[0].decl.some(element => element.usage === "BoneWeights"), true);
});

test("loads shared morph targets into CMF-native JSON", () =>
{
    const result = CjsCmfFormat.loadShared({
        meshes: [ {
            name: "morphed",
            minBounds: [ 0, 0, 0 ],
            maxBounds: [ 1, 1, 0 ],
            morphTargets: [ {
                name: "Smile",
                dataIsDeltas: false,
                vertex: {
                    position: [
                        0, 0, 0,
                        1, 0, 1,
                        0, 1, 0
                    ]
                }
            } ],
            vertex: {
                position: [
                    0, 0, 0,
                    1, 0, 0,
                    0, 1, 0
                ]
            },
            indices: [ { name: "main", bytesPerIndex: 2, faces: [ 0, 1, 2 ] } ]
        } ]
    });

    const mesh = result.meshes[0];

    assert.equal(mesh.areas[0].affectedByMorphTargets, true);
    assert.deepEqual(mesh.morphTargets.decl.map(element => ({
        usage: element.usage,
        type: element.type,
        elementCount: element.elementCount,
        offset: element.offset
    })), [
        { usage: "Position", type: "Float32", elementCount: 3, offset: 0 }
    ]);
    assert.deepEqual(mesh.morphTargets.targets, [
        { name: "Smile", maxDisplacement: 1 }
    ]);
    assert.equal(mesh.lods[0].morphTargets[0].vb.stride, 12);
    assert.deepEqual(mesh.lods[0].morphTargets[0].vertex.position, [
        0, 0, 0,
        0, 0, 1,
        0, 0, 0
    ]);
});

test("reads a tiny meshoptimizer-compressed CMF mesh asynchronously", async () =>
{
    await MeshoptEncoder.ready;
    const result = await CjsCmfFormat.readAsync(makeTriangleCmf(true));
    const mesh = result.meshes[0];

    assert.deepEqual(mesh.vertex.position, [ 1, 2, 3 ]);
    assert.deepEqual(mesh.indices[0].faces, [ 0, 0, 0 ]);
});

test("inspects a minimal CMF file", () =>
{
    const summary = CjsCmfFormat.inspect(makeMinimalCmf());

    assert.equal(summary.version, 1);
    assert.equal(summary.sections.length, 1);
    assert.equal(summary.sections[0].type, "Data");
    assert.deepEqual(summary.meshes, []);
});

function makeMinimalCmf()
{
    const
        headerSize = 48,
        dataOffset = 48,
        dataSize = 48,
        bytes = new Uint8Array(headerSize + dataSize),
        view = new DataView(bytes.buffer);

    view.setUint32(0, 0x66666D63, true);
    view.setUint32(4, 1, true);
    view.setUint32(8, headerSize, true);
    view.setUint32(12, 0, true);

    // Header.sections span: data starts at byte 32, span ptr field is byte 16.
    view.setBigInt64(16, 17n, true);
    view.setBigUint64(24, 16n, true);

    view.setUint32(32, dataOffset, true);
    view.setUint32(36, dataSize, true);
    view.setUint32(40, dataSize, true);
    view.setUint16(44, 0, true);
    view.setUint8(46, 0);
    view.setUint8(47, 0);

    return bytes;
}

function makeTriangleCmf(compressed)
{
    const
        dataOffset = 80,
        dataSize = 348,
        vbPlain = floatBytes([ 1, 2, 3 ]),
        ibPlain = uint16Bytes([ 0, 0, 0 ]),
        vbPayload = compressed ? MeshoptEncoder.encodeVertexBuffer(vbPlain, 1, 12) : vbPlain,
        ibPayload = compressed ? MeshoptEncoder.encodeIndexBuffer(ibPlain, 3, 2) : ibPlain,
        vbOffset = align(dataOffset + dataSize, 8),
        ibOffset = align(vbOffset + vbPayload.byteLength, 8),
        bytes = new Uint8Array(ibOffset + ibPayload.byteLength),
        view = new DataView(bytes.buffer);

    bytes.set(vbPayload, vbOffset);
    bytes.set(ibPayload, ibOffset);

    writeHeader(view, 80, [
        { offset: dataOffset, compressedSize: dataSize, uncompressedSize: dataSize, gpuAlignment: 0, type: 0, compression: 0 },
        { offset: vbOffset, compressedSize: vbPayload.byteLength, uncompressedSize: vbPlain.byteLength, gpuAlignment: 12, type: 1, compression: compressed ? 1 : 0 },
        { offset: ibOffset, compressedSize: ibPayload.byteLength, uncompressedSize: ibPlain.byteLength, gpuAlignment: 2, type: 1, compression: compressed ? 2 : 0 }
    ]);

    const
        meshOffset = dataOffset + 48,
        nameOffset = meshOffset + 216,
        declOffset = nameOffset + 4,
        lodOffset = declOffset + 8;

    writeSpan(view, dataOffset, meshOffset, 216);
    writeSpan(view, dataOffset + 16, 0, 0);
    writeSpan(view, dataOffset + 32, 0, 0);

    writeSpan(view, meshOffset, nameOffset, 3);
    bytes.set(new TextEncoder().encode("tri"), nameOffset);
    writeSpan(view, meshOffset + 16, declOffset, 8);
    writeSpan(view, meshOffset + 32, lodOffset, 72);
    writeSpan(view, meshOffset + 48, 0, 0);
    writeSpan(view, meshOffset + 64, 0, 0);
    writeSpan(view, meshOffset + 80, 0, 0);
    writeSpan(view, meshOffset + 96, 0, 0);
    writeSpan(view, meshOffset + 112, 0, 0);
    writeBounds(view, meshOffset + 128, [ 1, 2, 3 ], [ 1, 2, 3 ]);
    writeSpan(view, meshOffset + 152, 0, 0);
    writeSpan(view, meshOffset + 168, 0, 0);
    writeBounds(view, meshOffset + 184, [ 0, 0, 0 ], [ 0, 0, 0 ]);
    view.setUint8(meshOffset + 208, 0);
    view.setUint8(meshOffset + 209, 0xff);

    view.setUint8(declOffset, 0);
    view.setUint8(declOffset + 1, 0);
    view.setUint8(declOffset + 2, 0);
    view.setUint8(declOffset + 3, 3);
    view.setUint32(declOffset + 4, 0, true);

    writeBufferView(view, lodOffset, 1, 0, vbPlain.byteLength, 12);
    writeBufferView(view, lodOffset + 16, 2, 0, ibPlain.byteLength, 2);
    writeSpan(view, lodOffset + 32, 0, 0);
    writeSpan(view, lodOffset + 48, 0, 0);
    view.setUint32(lodOffset + 64, 0xffffffff, true);

    return bytes;
}

function writeHeader(view, headerSize, sections)
{
    view.setUint32(0, 0x66666D63, true);
    view.setUint32(4, 1, true);
    view.setUint32(8, headerSize, true);
    view.setUint32(12, 0, true);
    writeSpan(view, 16, 32, sections.length * 16);

    for (let i = 0; i < sections.length; i++)
    {
        const section = sections[i], offset = 32 + i * 16;
        view.setUint32(offset, section.offset, true);
        view.setUint32(offset + 4, section.compressedSize, true);
        view.setUint32(offset + 8, section.uncompressedSize, true);
        view.setUint16(offset + 12, section.gpuAlignment, true);
        view.setUint8(offset + 14, section.type);
        view.setUint8(offset + 15, section.compression);
    }
}

function writeSpan(view, spanOffset, dataOffset, byteSize)
{
    view.setBigInt64(spanOffset, byteSize === 0 ? 0n : BigInt((dataOffset - spanOffset) | 1), true);
    view.setBigUint64(spanOffset + 8, BigInt(byteSize), true);
}

function writeBufferView(view, offset, index, dataOffset, size, stride)
{
    view.setUint32(offset, index, true);
    view.setUint32(offset + 4, dataOffset, true);
    view.setUint32(offset + 8, size, true);
    view.setUint32(offset + 12, stride, true);
}

function writeBounds(view, offset, min, max)
{
    for (let i = 0; i < 3; i++) view.setFloat32(offset + i * 4, min[i], true);
    for (let i = 0; i < 3; i++) view.setFloat32(offset + 12 + i * 4, max[i], true);
}

function floatBytes(values)
{
    const bytes = new Uint8Array(values.length * 4), view = new DataView(bytes.buffer);
    values.forEach((value, index) => view.setFloat32(index * 4, value, true));
    return bytes;
}

function uint16Bytes(values)
{
    const bytes = new Uint8Array(values.length * 2), view = new DataView(bytes.buffer);
    values.forEach((value, index) => view.setUint16(index * 2, value, true));
    return bytes;
}

function align(value, alignment)
{
    return (value + alignment - 1) & ~(alignment - 1);
}
