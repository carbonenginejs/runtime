import assert from 'node:assert/strict';
import test from 'node:test';
import {projectShared} from '../../../../../src/resource/formats/gr2/core/shared.js';
import {buildCmfFromShared} from '../../../../../src/resource/formats/cmf/core/shared.js';
import {CjsResManWorker} from '../../../../../src/global/blue/worker/CjsResManWorker.js';

function fixture() {
    const vertices = [
        {Position: [0, 0, 0], TextureCoordinates0: [0, 0], Normal: [0, 0, 1]},
        {Position: [1, 0, 0], TextureCoordinates0: [1, 0], Normal: [0, 0, 1]},
        {Position: [0, 1, 0], TextureCoordinates0: [0, 1], Normal: [0, 0, 1]}
    ];
    Object.defineProperty(vertices, '__type', {value: [
        {name: 'Position', type: 10, arrayWidth: 3},
        {name: 'TextureCoordinates0', type: 10, arrayWidth: 2},
        {name: 'Normal', type: 10, arrayWidth: 3}
    ]});
    return {Meshes: [{PrimaryVertexData: {Vertices: vertices},
        PrimaryTopology: {Indices16: [0, 1, 2], Groups: [{TriFirst: 0, TriCount: 1}]}}]};
}

test('100 GR2 result transfers detach sender channels and preserve the complete receiving geometry', () => {
    for (let i = 0; i < 100; i++) {
        const source = fixture();
        const graph = projectShared(source, 7, {rebuildMissingBounds: true});
        const mesh = graph.meshes[0];
        assert.ok(mesh.vertex.position instanceof Float32Array);
        assert.ok(mesh.vertex.normal instanceof Float32Array);
        assert.ok(mesh.vertex.texcoord0 instanceof Float32Array);
        const transfer = CjsResManWorker.collectTransferables(graph);
        assert.equal(transfer.length, 4, 'three channel buffers and one shared topology buffer');
        const received = structuredClone(graph, {transfer});
        assert.ok(transfer.every(buffer => buffer.byteLength === 0), 'sender relinquishes its storage');
        assert.deepEqual(source.Meshes[0].PrimaryVertexData.Vertices[1].Position, [1, 0, 0], 'reflected source remains owned');
        const incoming = received.meshes[0];
        assert.deepEqual(Array.from(incoming.vertex.position), [0, 0, 0, 1, 0, 0, 0, 1, 0]);
        assert.equal(incoming.indices[0].faces.buffer, incoming.indexBuffer.buffer);
        const cmf = buildCmfFromShared(received).meshes[0];
        assert.equal(cmf.vertex.position, incoming.vertex.position, 'CMF publication borrows the transferred channel');
        assert.equal(cmf.lods[0].vertex.position, incoming.vertex.position);
        assert.deepEqual(cmf.decl.map(element => element.usage), ['Position', 'Normal', 'TexCoord']);
        assert.deepEqual(incoming.minBounds, [0, 0, 0]);
        assert.deepEqual(incoming.maxBounds, [1, 1, 0]);
    }
});
