import assert from "node:assert/strict";
import test from "node:test";

import { BinaryReader } from "../../../../../src/resource/formats/cmf/core/binary.js";
import { readCmf, readHeader } from "../../../../../src/resource/formats/cmf/core/schema.js";
import { validateCmfGraph, validateCmfSections } from "../../../../../src/resource/formats/cmf/core/validate.js";
import { writeCmf } from "../../../../../src/resource/formats/cmf/core/writer.js";

function validGraph()
{
    const vertices = new Float32Array([
        0, 0, 0,
        1, 0, 0,
        0, 1, 0
    ]);
    return {
        meshes: [ {
            name: "triangle",
            topology: "TriangleList",
            decl: [ { usage: "Position", usageIndex: 0, type: "Float32", elementCount: 3, offset: 0 } ],
            lods: [ {
                vb: { index: 1, offset: 0, size: 36, stride: 12 },
                ib: { index: 2, offset: 0, size: 6, stride: 2 },
                areas: [ { firstElement: 0, elementCount: 1 } ],
                morphTargets: [],
                threshold: 0xffffffff
            } ],
            areas: [ {
                name: "main",
                bounds: { min: [ 0, 0, 0 ], max: [ 1, 1, 0 ] },
                bones: [],
                affectedByBones: false,
                affectedByMorphTargets: false
            } ],
            boneBindings: [],
            morphTargets: { decl: [], targets: [] },
            uvDensities: [],
            bounds: { min: [ 0, 0, 0 ], max: [ 1, 1, 0 ] },
            audioOcclusionMesh: { vertices: [], indices: [], bounds: { min: [ 0, 0, 0 ], max: [ 0, 0, 0 ] } },
            skeleton: null
        } ],
        skeletons: [],
        animations: [],
        metadata: { entries: [ { key: "generator", value: "test" } ] },
        buffers: [
            { index: 1, data: new Uint8Array(vertices.buffer) },
            { index: 2, data: new Uint8Array(new Uint16Array([ 0, 1, 2 ]).buffer) }
        ]
    };
}

function validSkeleton()
{
    return {
        name: "skeleton",
        bones: [ "root" ],
        parents: [ 0xffffffff ],
        restTransforms: [ {} ],
        invBindTransforms: [ [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ] ],
        boneMasks: [ { name: "mask", weights: [ {} ] } ]
    };
}

test("shared CMF validator accepts a Carbon-valid graph without mutating it", () =>
{
    const graph = validGraph();
    const snapshot = structuredClone(graph);
    assert.equal(validateCmfGraph(graph, { phase: "write" }), graph);
    assert.deepEqual(graph, snapshot);
});

test("shared CMF validator enforces declarations, LODs, UV densities, and metadata", () =>
{
    const duplicate = validGraph();
    duplicate.meshes[0].decl.push({ ...duplicate.meshes[0].decl[0] });
    assert.throws(() => validateCmfGraph(duplicate), /duplicate Position\[0\]/u);

    const threshold = validGraph();
    threshold.meshes[0].lods[0].threshold = 0;
    assert.throws(() => validateCmfGraph(threshold), /first LOD threshold/u);

    const uv = validGraph();
    uv.meshes[0].decl.push({ usage: "TexCoord", usageIndex: 0, type: "Float32", elementCount: 2, offset: 12 });
    uv.meshes[0].lods[0].vb = { index: 1, offset: 0, size: 60, stride: 20 };
    uv.buffers[0].data = new Uint8Array(60);
    assert.throws(() => validateCmfGraph(uv), /uvDensities count/u);

    const metadata = validGraph();
    metadata.metadata.entries.push({ key: "generator", value: "duplicate" });
    assert.throws(() => validateCmfGraph(metadata), /duplicate name/u);
});

test("shared CMF validator rejects non-finite float buffer contents", () =>
{
    const graph = validGraph();
    new DataView(graph.buffers[0].data.buffer).setFloat32(0, Number.NaN, true);
    assert.throws(() => validateCmfGraph(graph, { phase: "write" }), /non-finite Position/u);
});

test("shared CMF validator rejects non-object transform and weight entries", () =>
{
    const invalidRest = validGraph();
    invalidRest.skeletons.push(validSkeleton());
    invalidRest.skeletons[0].restTransforms[0] = null;
    assert.throws(() => validateCmfGraph(invalidRest), /rest 0 must be an object/u);

    const invalidWeight = validGraph();
    invalidWeight.skeletons.push(validSkeleton());
    invalidWeight.skeletons[0].boneMasks[0].weights[0] = null;
    assert.throws(() => validateCmfGraph(invalidWeight), /weight 0 must be an object/u);
});

test("shared CMF validator accepts Carbon's uninitialized AABB sentinel", () =>
{
    const graph = validGraph();
    const max = 3.4028234663852886e38;
    graph.meshes[0].bounds = { min: [ max, max, max ], max: [ -max, -max, -max ] };
    assert.doesNotThrow(() => validateCmfGraph(graph, { phase: "write" }));
});

test("shared CMF writer validation honors serialized field defaults", () =>
{
    const graph = validGraph();
    graph.skeletons.push(validSkeleton());
    delete graph.meshes[0].topology;
    delete graph.meshes[0].lods[0].threshold;
    delete graph.meshes[0].bounds;
    delete graph.meshes[0].areas[0].bounds;
    delete graph.meshes[0].audioOcclusionMesh.bounds;
    delete graph.metadata.entries[0].value;
    const roundTrip = readCmf(writeCmf(graph));
    const max = 3.4028234663852886e38;
    const sentinel = { min: [ max, max, max ], max: [ -max, -max, -max ] };
    assert.deepEqual(roundTrip.meshes[0].bounds, sentinel);
    assert.deepEqual(roundTrip.meshes[0].areas[0].bounds, sentinel);
    assert.deepEqual(roundTrip.meshes[0].audioOcclusionMesh.bounds, sentinel);
    assert.deepEqual(roundTrip.skeletons[0].restTransforms[0], {
        position: [ 0, 0, 0 ],
        rotation: [ 0, 0, 0, 1 ],
        scale: [ 1, 1, 1 ]
    });
    assert.deepEqual(roundTrip.skeletons[0].boneMasks[0].weights[0], { index: 0, weight: 1 });
});

test("shared CMF writer rejects invalid secondary thresholds before serialization", () =>
{
    for (const threshold of [ 10.5, Number.NaN ])
    {
        const graph = validGraph();
        graph.meshes[0].lods.push({ ...structuredClone(graph.meshes[0].lods[0]), threshold });
        assert.throws(() => writeCmf(graph), /LOD 1 threshold must be an unsigned integer/u);
    }
});

test("shared CMF validator checks morph layout before reading float contents", () =>
{
    const graph = validGraph();
    graph.meshes[0].morphTargets = {
        decl: [ { usage: "Position", usageIndex: 0, type: "Float32", elementCount: 3, offset: 8 } ],
        targets: [ { name: "raised", maxDisplacement: 1 } ]
    };
    graph.meshes[0].lods[0].morphTargets = [ {
        vb: { index: 3, offset: 0, size: 36, stride: 12 }
    } ];
    graph.buffers.push({ index: 3, data: new Uint8Array(36) });
    assert.throws(
        () => validateCmfGraph(graph, { phase: "write" }),
        error => error?.code === "CJS_FORMAT_WRITE_ERROR" && /morph vertex element extends past the stride/u.test(error.message)
    );
});

test("CMF reader validates views before geometry decoding", () =>
{
    const bytes = writeCmf(validGraph());
    const reader = new BinaryReader(bytes);
    const header = readHeader(reader);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const dataOffset = header.sections[0].offset;
    const meshOffset = relativeSpanTarget(view, dataOffset);
    const lodOffset = relativeSpanTarget(view, meshOffset + 32);
    view.setUint32(lodOffset + 8, 0xffffffff, true);
    assert.throws(
        () => readCmf(bytes, { decodeBuffers: true, validateCrc: false }),
        error => error?.code === "CJS_FORMAT_INVALID_DATA" && /vertex buffer/u.test(error.message)
    );
});

test("CMF reader rejects undersized Data and Metadata roots", () =>
{
    const dataBytes = writeCmf({ meshes: [], skeletons: [], animations: [] });
    const dataReader = new BinaryReader(dataBytes);
    const dataHeader = readHeader(dataReader);
    const dataView = new DataView(dataBytes.buffer, dataBytes.byteOffset, dataBytes.byteLength);
    const dataEntry = sectionEntryOffset(dataHeader, 0);
    dataView.setUint32(dataEntry + 4, 47, true);
    dataView.setUint32(dataEntry + 8, 47, true);
    assert.throws(
        () => readCmf(dataBytes, { validateCrc: false }),
        /Data section is smaller than its root structure/u
    );

    const metadataBytes = writeCmf(validGraph());
    const metadataReader = new BinaryReader(metadataBytes);
    const metadataHeader = readHeader(metadataReader);
    const metadataView = new DataView(metadataBytes.buffer, metadataBytes.byteOffset, metadataBytes.byteLength);
    const metadataIndex = metadataHeader.sections.length - 1;
    const metadataEntry = sectionEntryOffset(metadataHeader, metadataIndex);
    metadataView.setUint32(metadataEntry + 4, 15, true);
    metadataView.setUint32(metadataEntry + 8, 15, true);
    assert.throws(
        () => readCmf(metadataBytes, { validateCrc: false }),
        /Metadata section is smaller than its root structure/u
    );
});

test("CMF reader rejects process-pointer spans in portable files", () =>
{
    const bytes = writeCmf(validGraph());
    const reader = new BinaryReader(bytes);
    const header = readHeader(reader);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const dataOffset = header.sections[0].offset;
    const meshOffset = relativeSpanTarget(view, dataOffset);
    view.setBigInt64(dataOffset, BigInt(meshOffset), true);
    assert.throws(
        () => readCmf(bytes, { validateCrc: false }),
        /contains a process pointer/u
    );
});

test("CMF reader ignores pointer bits in empty spans like Carbon", () =>
{
    const bytes = writeCmf({ meshes: [], skeletons: [], animations: [] });
    const reader = new BinaryReader(bytes);
    const header = readHeader(reader);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    view.setBigInt64(header.sections[0].offset, 0x7fffffffffffffffn, true);
    assert.doesNotThrow(() => readCmf(bytes, { validateCrc: false }));
});

test("CMF section validator enforces ordering, compression, and alignment", () =>
{
    const header = {
        headerSize: 64,
        sections: [
            { type: "Data", compression: "None", offset: 64, compressedSize: 32, uncompressedSize: 32, gpuAlignment: 0 },
            { type: "GpuBuffer", compression: "MeshOptimizerVertexBuffer", offset: 96, compressedSize: 8, uncompressedSize: 32, gpuAlignment: 16 },
            { type: "Metadata", compression: "None", offset: 104, compressedSize: 8, uncompressedSize: 8, gpuAlignment: 0 }
        ]
    };
    assert.doesNotThrow(() => validateCmfSections(header, 112));
    const bad = structuredClone(header);
    bad.sections[1].offset = 95;
    assert.throws(() => validateCmfSections(bad, 112), /overlaps/u);
});

test("CMF binary bounds checks reject unsafe offsets and sizes", () =>
{
    const reader = new BinaryReader(new Uint8Array(16));
    assert.throws(() => reader.require(Number.MAX_SAFE_INTEGER, 8), /outside file bounds/u);
    assert.throws(() => reader.require(0, -1), /outside file bounds/u);
    assert.throws(() => reader.require(0, Number.MAX_SAFE_INTEGER + 1), /outside file bounds/u);
});

function relativeSpanTarget(view, spanOffset)
{
    return spanOffset + Number(view.getBigInt64(spanOffset, true)) - 1;
}

function sectionEntryOffset(header, index)
{
    return header.headerSize - header.sections.length * 16 + index * 16;
}
