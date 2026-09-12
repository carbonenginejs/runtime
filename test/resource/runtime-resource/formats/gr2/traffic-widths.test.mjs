import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emitJson } from '../../../../../src/resource/formats/gr2/core/json.js';

test('traffic keeps four-component position and texture-coordinate channels', () => {
    const vertices = [
        { Position: [1, 2, 3, 99], TextureCoordinates0: [4, 5, 6, 7] },
        { Position: [-2, 8, 1, 42], TextureCoordinates0: [8, 9, 10, 11] }
    ];
    Object.defineProperty(vertices, '__type', { value: [
        { name: 'Position', type: 10, arrayWidth: 4 },
        { name: 'TextureCoordinates0', type: 21, arrayWidth: 4 }
    ] });
    const mesh = emitJson({ Meshes: [{
        PrimaryVertexData: { Vertices: vertices },
        PrimaryTopology: { Indices: [0, 1, 0], Groups: [{ TriFirst: 0, TriCount: 1 }] }
    }] }, 7, { rebuildMissingBounds: true }).meshes[0];
    assert.equal(mesh.vertexCount, 2);
    assert.deepEqual(mesh.vertex.position, [1, 2, 3, 99, -2, 8, 1, 42]);
    assert.deepEqual(mesh.vertex.texcoord0, [4, 5, 6, 7, 8, 9, 10, 11]);
    assert.deepEqual(mesh.minBounds, [-2, 2, 1]);
    assert.deepEqual(mesh.maxBounds, [1, 8, 3]);
});
