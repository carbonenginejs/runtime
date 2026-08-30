import assert from "node:assert/strict";
import test from "node:test";
import CjsCmfFormat from "../../../../../src/resource/formats/cmf/index.js";
import { bytesPerIndex, firstTriangle, totalIndexCount } from "../../../../../src/resource/formats/cmf/core/utils/indices.js";
import {
    decodeElementArray,
    elementTypeSize,
    estimateStrideFromDecl
} from "../../../../../src/resource/formats/cmf/core/utils/vertex.js";

function makeGraph()
{
    const vertexData = new Uint8Array(new Float32Array([
        0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 1
    ]).buffer);
    const indexData = new Uint8Array(new Uint16Array([ 0, 1, 2, 2, 1, 3, 3, 4, 5, 0, 2, 4 ]).buffer);
    return {
        metadata: { entries: [ { key: "tool", value: "writer-test" }, { key: "unit", value: "meters" } ] },
        meshes: [ {
            name: "testMesh",
            decl: [ { usage: "Position", usageIndex: 0, type: "Float32", elementCount: 3, offset: 0 } ],
            lods: [ {
                vb: { index: 1, offset: 0, size: vertexData.byteLength, stride: 12 },
                ib: { index: 2, offset: 0, size: indexData.byteLength, stride: 2 },
                areas: [ { firstElement: 0, elementCount: 4 } ],
                morphTargets: [],
                threshold: 0xffffffff
            } ],
            areas: [ {
                name: "hull",
                bounds: { min: [ 0, 0, 0 ], max: [ 1, 1, 1 ] },
                bones: [ 0, 3 ],
                affectedByBones: true,
                affectedByMorphTargets: false
            } ],
            boneBindings: [ { name: "root", bounds: { min: [ -1, -1, -1 ], max: [ 1, 1, 1 ] } } ],
            morphTargets: { decl: [], targets: [] },
            uvDensities: [ 0.5, 1.5 ],
            bounds: { min: [ 0, 0, 0 ], max: [ 1, 1, 1 ] },
            audioOcclusionMesh: {
                vertices: [ [ 0, 0, 0 ], [ 1, 0, 0 ], [ 0, 1, 0 ] ],
                indices: [ 0, 1, 2 ],
                bounds: { min: [ 0, 0, 0 ], max: [ 1, 1, 0 ] }
            },
            topology: "TriangleList",
            skeleton: 0
        } ],
        skeletons: [ {
            name: "testSkel",
            bones: [ "root", "child" ],
            parents: [ 0xffffffff, 0 ],
            restTransforms: [
                { position: [ 0, 0, 0 ], rotation: [ 0, 0, 0, 1 ], scale: [ 1, 1, 1 ] },
                { position: [ 0, 1, 0 ], rotation: [ 0, 0, 0, 1 ], scale: [ 1, 1, 1 ] }
            ],
            invBindTransforms: [
                Array.from({ length: 16 }, (_, i) => (i % 5 === 0 ? 1 : 0)),
                Array.from({ length: 16 }, (_, i) => (i % 5 === 0 ? 1 : 0))
            ],
            boneMasks: [ { name: "upper", weights: [ { index: 1, weight: 0.75 } ] } ]
        } ],
        animations: [ {
            name: "testAnim",
            channels: [ { target: "child", targetType: "BoneRotation", curveIndex: 0 } ],
            curves: [ {
                valueDimension: 4,
                interpolation: "Linear",
                knotType: "Float32",
                valueType: "Float32",
                knotCount: 2,
                knots: [ 0, 0, 0, 0, 0, 0, 128, 63 ],
                values: Array.from({ length: 32 }, (_, i) => i)
            } ],
            duration: 1
        } ],
        buffers: [ null, { index: 1, data: vertexData }, { index: 2, data: indexData } ]
    };
}

function triangles(faces)
{
    const result = [];
    for (let i = 0; i < faces.length; i += 3)
    {
        // rotate each triangle so its smallest index comes first
        const tri = [ faces[i], faces[i + 1], faces[i + 2] ];
        const start = tri.indexOf(Math.min(...tri));
        result.push([ tri[start], tri[(start + 1) % 3], tri[(start + 2) % 3] ].join(","));
    }
    return result;
}

test("shares strict CMF vertex and index layout utilities", () =>
{
    assert.deepEqual([
        "Float32",
        "Float16",
        "UInt16Norm",
        "UInt16",
        "Int16Norm",
        "Int16",
        "UInt8Norm",
        "UInt8",
        "Int8Norm",
        "Int8"
    ].map(elementTypeSize), [ 4, 2, 2, 2, 2, 2, 1, 1, 1, 1 ]);
    assert.throws(() => elementTypeSize("Future32"), /Unsupported CMF vertex element type/u);
    assert.equal(estimateStrideFromDecl([
        { type: "Float32", elementCount: 3, offset: 0 },
        { type: "UInt16", elementCount: 4, offset: 12 }
    ]), 20);

    const groups = [
        { bytesPerIndex: 2, faces: [ 0, 1, 2, 2, 3, 0 ] },
        { bytesPerIndex: 2, faces: [ 0, 0x10000, 1 ] }
    ];
    assert.equal(totalIndexCount(groups), 9);
    assert.equal(firstTriangle(groups, 1), 2);
    assert.equal(bytesPerIndex(groups), 4);
    assert.equal(bytesPerIndex([ { bytesPerIndex: 4, faces: [ 0, 1, 2 ] } ]), 4);

    assert.deepEqual(decodeElementArray([ 0, 60, 0, 192 ], "Float16"), [ 1, -2 ]);
    assert.deepEqual(decodeElementArray([ 1, 0, 0, 1 ], "UInt16"), [ 1, 256 ]);
    assert.deepEqual(decodeElementArray([ 0, 255 ], "UInt8Norm"), [ 0, 1 ]);
    assert.throws(() => decodeElementArray([ 0 ], "Float32"), /not divisible by 4/u);
});

test("preserves CMF packer errors for unknown vertex element types", async () =>
{
    const { packVertexBuffer } = await import("../../../../../src/resource/formats/cmf/core/pack.js");
    assert.throws(
        () => packVertexBuffer([
            { usage: "Position", usageIndex: 0, type: "Future32", elementCount: 3, offset: 0 }
        ], { position: [ 0, 0, 0 ] }),
        error => error?.code === "CJS_FORMAT_WRITE_ERROR" && /unsupported vertex element type/u.test(error.message)
    );
});

test("writes an uncompressed CMF that reads back field-for-field", () =>
{
    const graph = makeGraph();
    const bytes = CjsCmfFormat.write(graph);
    const back = CjsCmfFormat.read(bytes, { emit: "raw" });

    assert.equal(back.signature, 0x66666D63);
    assert.equal(back.version, 1);
    assert.deepEqual(back.sections.map((section) => section.type), [ "Data", "GpuBuffer", "GpuBuffer", "Metadata" ]);
    assert.deepEqual(back.sections.map((section) => section.compression), [ "None", "None", "None", "None" ]);
    assert.deepEqual(back.metadata.entries, graph.metadata.entries);

    const mesh = back.meshes[0];
    assert.equal(mesh.name, "testMesh");
    assert.deepEqual(mesh.decl, graph.meshes[0].decl);
    assert.equal(mesh.lods.length, 1);
    assert.deepEqual(mesh.lods[0].areas, graph.meshes[0].lods[0].areas);
    assert.equal(mesh.lods[0].threshold, 0xffffffff);
    assert.deepEqual(mesh.areas[0].bones, [ 0, 3 ]);
    assert.equal(mesh.areas[0].affectedByBones, true);
    assert.equal(mesh.areas[0].affectedByMorphTargets, false);
    assert.deepEqual(mesh.boneBindings[0], graph.meshes[0].boneBindings[0]);
    assert.deepEqual(mesh.uvDensities, [ 0.5, 1.5 ]);
    assert.deepEqual(mesh.bounds, graph.meshes[0].bounds);
    assert.deepEqual(mesh.audioOcclusionMesh.vertices, graph.meshes[0].audioOcclusionMesh.vertices);
    assert.deepEqual(mesh.audioOcclusionMesh.indices, [ 0, 1, 2 ]);
    assert.equal(mesh.topology, "TriangleList");
    assert.equal(mesh.skeleton, 0);
    assert.deepEqual(mesh.vertex.position, [ 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 1 ]);
    assert.deepEqual(mesh.indices[0].faces, [ 0, 1, 2, 2, 1, 3, 3, 4, 5, 0, 2, 4 ]);

    const skeleton = back.skeletons[0];
    assert.deepEqual(skeleton.bones, [ "root", "child" ]);
    assert.deepEqual(skeleton.parents, [ 0xffffffff, 0 ]);
    assert.deepEqual(skeleton.restTransforms, graph.skeletons[0].restTransforms);
    assert.deepEqual(skeleton.invBindTransforms, graph.skeletons[0].invBindTransforms);
    assert.deepEqual(skeleton.boneMasks, graph.skeletons[0].boneMasks);

    const animation = back.animations[0];
    assert.equal(animation.name, "testAnim");
    assert.deepEqual(animation.channels, graph.animations[0].channels);
    assert.deepEqual(animation.curves, graph.animations[0].curves);
    assert.equal(animation.duration, 1);
});

test("writes meshoptimizer-compressed CMF that decodes equivalently", async () =>
{
    const graph = makeGraph();
    const bytes = await CjsCmfFormat.writeAsync(graph);
    const back = await CjsCmfFormat.readAsync(bytes, { emit: "raw" });

    assert.deepEqual(
        back.sections.map((section) => section.compression),
        [ "None", "MeshOptimizerVertexBuffer", "MeshOptimizerIndexBuffer", "None" ]
    );
    assert.equal(back.sections[1].gpuAlignment, 12);
    assert.equal(back.sections[2].gpuAlignment, 2);

    const reference = CjsCmfFormat.read(CjsCmfFormat.write(graph), { emit: "raw" });
    assert.deepEqual(back.meshes[0].vertex.position, reference.meshes[0].vertex.position);
    // meshopt index compression canonicalizes triangle rotation; triangles
    // must match as sets of rotated triples, in order
    assert.deepEqual(triangles(back.meshes[0].indices[0].faces), triangles(reference.meshes[0].indices[0].faces));
});

test("compressed writes fail cleanly from the sync writer before encoder init", () =>
{
    // whether this throws depends on encoder readiness; both outcomes must be sane
    const graph = makeGraph();
    try
    {
        const bytes = CjsCmfFormat.write(graph, { compress: true });
        assert.ok(bytes instanceof Uint8Array);
    }
    catch (error)
    {
        assert.match(error.message, /writeAsync|compress: false/u);
    }
});

test("validates CRC and honors validateCrc: false", () =>
{
    const bytes = CjsCmfFormat.write(makeGraph());
    const corrupted = bytes.slice();
    corrupted[corrupted.length - 1] ^= 0xff;

    assert.throws(() => CjsCmfFormat.read(corrupted, { emit: "raw" }), /CRC mismatch/u);
    const tolerant = CjsCmfFormat.read(corrupted, { emit: "raw", validateCrc: false });
    assert.equal(tolerant.meshes[0].name, "testMesh");
});

test("deduplicates identical leaf chunks", () =>
{
    const longName = "x".repeat(512);
    const withSharedNames = makeGraph();
    withSharedNames.meshes[0].boneBindings = [
        { name: longName, bounds: { min: [ 0, 0, 0 ], max: [ 0, 0, 0 ] } },
        { name: longName, bounds: { min: [ 0, 0, 0 ], max: [ 0, 0, 0 ] } }
    ];
    const withDistinctNames = makeGraph();
    withDistinctNames.meshes[0].boneBindings = [
        { name: `${longName}a`, bounds: { min: [ 0, 0, 0 ], max: [ 0, 0, 0 ] } },
        { name: `${longName.replace(/^x/u, "y")}b`, bounds: { min: [ 0, 0, 0 ], max: [ 0, 0, 0 ] } }
    ];

    const shared = CjsCmfFormat.write(withSharedNames);
    const distinct = CjsCmfFormat.write(withDistinctNames);
    assert.ok(shared.byteLength <= distinct.byteLength - 500, `dedup did not share chunks (${shared.byteLength} vs ${distinct.byteLength})`);

    const back = CjsCmfFormat.read(shared, { emit: "raw" });
    assert.equal(back.meshes[0].boneBindings[0].name, longName);
    assert.equal(back.meshes[0].boneBindings[1].name, longName);
});

test("shared buffers with conflicting strides fall back to uncompressed", async () =>
{
    const graph = makeGraph();
    // point ib at the same buffer as vb with a different stride
    graph.meshes[0].lods[0].ib = { index: 1, offset: 0, size: 12, stride: 2 };
    graph.buffers = [ null, graph.buffers[1] ];

    const bytes = await CjsCmfFormat.writeAsync(graph);
    const back = await CjsCmfFormat.readAsync(bytes, { emit: "raw" });
    assert.deepEqual(back.sections.map((section) => section.type), [ "Data", "GpuBuffer", "Metadata" ]);
    assert.equal(back.sections[1].compression, "None");
});

test("writeShared packs channel geometry into a readable CMF", () =>
{
    const shared = {
        metadata: { entries: [ { key: "source", value: "shared-test" } ] },
        meshes: [
            {
                name: "meshA",
                minBounds: [ 0, 0, 0 ],
                maxBounds: [ 1, 1, 1 ],
                vertex: {
                    position: [ 0, 0, 0, 1, 0, 0, 0, 1, 0 ],
                    texcoord0: [ 0, 0, 1, 0, 0, 1 ]
                },
                indices: [ { name: "matA", bytesPerIndex: 2, faces: [ 0, 1, 2 ] } ]
            },
            {
                name: "meshB",
                minBounds: [ -1, -1, -1 ],
                maxBounds: [ 0, 0, 0 ],
                vertex: {
                    position: [ 0, 0, 0, -1, 0, 0, 0, -1, 0, -1, -1, 0 ]
                },
                indices: [ { name: "matB", bytesPerIndex: 2, faces: [ 0, 1, 2, 1, 3, 2 ] } ]
            }
        ],
        skeletons: [],
        animations: []
    };

    const bytes = CjsCmfFormat.writeShared(shared);
    const back = CjsCmfFormat.read(bytes, { emit: "raw" });

    // one Data + 4 unique GPU buffers (2 meshes x vb+ib) + Metadata
    assert.equal(back.sections.length, 6);
    assert.equal(back.meshes.length, 2);
    assert.deepEqual(back.meshes[0].vertex.position, shared.meshes[0].vertex.position);
    assert.deepEqual(back.meshes[0].vertex.texcoord0, shared.meshes[0].vertex.texcoord0);
    assert.deepEqual(back.meshes[1].vertex.position, shared.meshes[1].vertex.position);
    assert.deepEqual(back.meshes[0].indices[0].faces, [ 0, 1, 2 ]);
    assert.equal(back.meshes[0].indices[0].name, "matA");
    assert.deepEqual(back.meshes[1].indices[0].faces, [ 0, 1, 2, 1, 3, 2 ]);
    assert.deepEqual(back.meshes[1].bounds, { min: [ -1, -1, -1 ], max: [ 0, 0, 0 ] });
    assert.equal(back.metadata.entries[0].value, "shared-test");

    // buffer views must not collide across meshes
    const viewKeys = back.meshes.flatMap((mesh) => mesh.lods.map((lod) => `${lod.vb.index}/${lod.ib.index}`));
    assert.equal(new Set(viewKeys.flatMap((key) => key.split("/"))).size, 4);
});

test("writeShared widens index buffers when indices exceed u16", () =>
{
    const vertexCount = 0x10003;
    const position = new Array(vertexCount * 3).fill(0);
    const shared = {
        meshes: [ {
            name: "wide",
            minBounds: [ 0, 0, 0 ],
            maxBounds: [ 0, 0, 0 ],
            vertex: { position },
            indices: [ { name: "", bytesPerIndex: 2, faces: [ 0, 0x10001, 0x10002 ] } ]
        } ],
        skeletons: [],
        animations: []
    };
    const back = CjsCmfFormat.read(CjsCmfFormat.writeShared(shared), { emit: "raw" });
    assert.equal(back.meshes[0].lods[0].ib.stride, 4);
    assert.deepEqual(back.meshes[0].indices[0].faces, [ 0, 0x10001, 0x10002 ]);
});

test("direct write rejects unconverted GR2-shaped skeletons", () =>
{
    const graph = {
        meshes: [],
        skeletons: [ { name: "skel", bones: [ { name: "root", parentIndex: -1 } ] } ],
        animations: []
    };
    assert.throws(() => CjsCmfFormat.write(graph), /GR2-shaped skeletons need conversion/u);

    // writeShared converts the same shape instead of rejecting it
    const bytes = CjsCmfFormat.writeShared({ meshes: [], skeletons: graph.skeletons, animations: [] });
    const back = CjsCmfFormat.read(bytes, { emit: "raw" });
    assert.deepEqual(back.skeletons[0].bones, [ "root" ]);
});

test("writes empty graphs and empty spans", () =>
{
    const bytes = CjsCmfFormat.write({ meshes: [], skeletons: [], animations: [] });
    const back = CjsCmfFormat.read(bytes, { emit: "raw" });
    assert.deepEqual(back.meshes, []);
    assert.deepEqual(back.skeletons, []);
    assert.deepEqual(back.animations, []);
    assert.equal(back.metadata, null);

    const sparseMesh = CjsCmfFormat.write({
        meshes: [ { name: "", decl: [], lods: [], areas: [], boneBindings: [], morphTargets: { decl: [], targets: [] }, uvDensities: [], skeleton: null } ],
        skeletons: [],
        animations: []
    });
    const sparseBack = CjsCmfFormat.read(sparseMesh, { emit: "raw" });
    assert.equal(sparseBack.meshes[0].name, "");
    assert.equal(sparseBack.meshes[0].skeleton, null);
    assert.deepEqual(sparseBack.meshes[0].lods, []);
});
