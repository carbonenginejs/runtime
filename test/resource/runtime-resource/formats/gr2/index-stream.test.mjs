import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

import {projectShared} from '../../../../../src/resource/formats/gr2/core/shared.js';
import {buildCmfFromShared} from '../../../../../src/resource/formats/cmf/core/shared.js';
import {packGraphBuffers} from '../../../../../src/resource/formats/cmf/core/pack.js';
import {PackLodGeometry} from '../../../../../src/resource/geometry/packGeometry.js';

function fixture(wide = false) {
  const vertices = Array.from({length: 6}, (_, i) => ({Position: [i % 3, Math.floor(i / 3), 0]}));
  Object.defineProperty(vertices, '__type', {value: [{name: 'Position', type: 10, arrayWidth: 3}]});
  const stream = [0, 1, 2, 2, 3, 4, 1, 3, 5, 4, 5, 0];
  const mesh = {
    Name: 'ordered-with-orphan',
    PrimaryVertexData: {Vertices: vertices},
    PrimaryTopology: {
      [wide ? 'Indices' : 'Indices16']: stream,
      // Out of order, overlapping, and with the last triangle unassigned.
      Groups: [{MaterialIndex: 0, TriFirst: 2, TriCount: 1},
        {MaterialIndex: 1, TriFirst: 0, TriCount: 2},
        {MaterialIndex: 2, TriFirst: 1, TriCount: 1}]
    }
  };
  return {raw: {Meshes: [mesh]}, stream};
}

for (const wide of [false, true]) {
  test(`preserves the entire ${wide ? 32 : 16}-bit stream using shared group views`, () => {
    const {raw, stream} = fixture(wide);
    const mesh = projectShared(raw, 7).meshes[0];
    assert.deepEqual(Array.from(mesh.indexBuffer), stream);
    assert.equal(mesh.indexBuffer.BYTES_PER_ELEMENT, wide ? 4 : 2);
    assert.deepEqual(mesh.indices.map(g => g.firstElement), [2, 0, 1]);
    assert.ok(mesh.indices.every(g => g.faces.buffer === mesh.indexBuffer.buffer));
    assert.equal(mesh.indices[0].faces.byteOffset, 6 * mesh.indexBuffer.BYTES_PER_ELEMENT);
    assert.equal(mesh.indices[2].faces.byteOffset, 3 * mesh.indexBuffer.BYTES_PER_ELEMENT);
    const cloned = structuredClone(mesh);
    assert.ok(cloned.indices.every(g => g.faces.buffer === cloned.indexBuffer.buffer), 'worker clone retains shared backing');
  });

  test(`CMF and GPU packing preserve authored offsets and orphan indices (${wide ? 32 : 16}-bit)`, () => {
    const {raw, stream} = fixture(wide);
    const shared = projectShared(raw, 7);
    const cmf = buildCmfFromShared(shared);
    const mesh = cmf.meshes[0], lod = mesh.lods[0];
    assert.strictEqual(lod.indexBuffer, shared.meshes[0].indexBuffer);
    assert.deepEqual(lod.areas, [{firstElement: 2, elementCount: 1}, {firstElement: 0, elementCount: 2}, {firstElement: 1, elementCount: 1}]);
    const packed = packGraphBuffers(cmf);
    const view = packed.graph.meshes[0].lods[0].ib;
    assert.equal(view.size, stream.length * (wide ? 4 : 2));
    const bytes = packed.buffers[view.index].data;
    const values = wide ? new Uint32Array(bytes.buffer) : new Uint16Array(bytes.buffer);
    assert.deepEqual(Array.from(values), stream);
    assert.deepEqual(PackLodGeometry(mesh).index.bytes, bytes);
  });
}

test('unsigned 16-bit reflection values retain their upper bits', () => {
  const mesh = projectShared({Meshes: [{PrimaryTopology: {
    Indices16: [-1, -32768, 0], Groups: [{TriFirst: 0, TriCount: 1}]
  }}]}, 7).meshes[0];
  assert.deepEqual(Array.from(mesh.indexBuffer), [65535, 32768, 0]);
});

test('does not silently truncate a material range outside the full stream', () => {
  const {raw} = fixture();
  raw.Meshes[0].PrimaryTopology.Groups[0].TriCount = 3;
  assert.throws(() => projectShared(raw, 7), /outside the index stream/);
});

test('retains ungrouped meshes and validates orphan triangle indices', () => {
  const {raw, stream} = fixture();
  raw.Meshes[0].PrimaryTopology.Groups = [];
  const shared = projectShared(raw, 7);
  const mesh = buildCmfFromShared(shared).meshes[0];
  assert.equal(PackLodGeometry(mesh).index.count, stream.length);
  shared.meshes[0].indexBuffer[11] = 10;
  assert.throws(() => buildCmfFromShared(shared), /vertex range/);
});

test('Granny writer preserves topology order, orphan triangles and group offsets', async () => {
  const {writeSharedGr2} = await import('../../../../../src/resource/formats/gr2/core/writer.js');
  const {readGr2Raw} = await import('../../../../../src/resource/formats/gr2/core/reader.js');
  for (const wide of [false, true]) {
    const {raw, stream} = fixture(wide);
    const bytes = writeSharedGr2(projectShared(raw, 7));
    const result = readGr2Raw(bytes).fileInfo.Meshes[0].PrimaryTopology;
    const values = wide ? result.Indices : result.Indices16;
    assert.deepEqual(values.map(value => typeof value === 'object' ? Object.values(value)[0] : value), stream);
    assert.deepEqual(result.Groups.map(group => group.TriFirst), [2, 0, 1]);
  }
});

test('real Granny retains every native index through projection and upload packing', {skip: !process.env.CJS_PLACEABLE_GEOMETRY}, async () => {
  const {readGr2Raw} = await import('../../../../../src/resource/formats/gr2/core/reader.js');
  const data = fs.readFileSync(process.env.CJS_PLACEABLE_GEOMETRY);
  const parsed = readGr2Raw(data);
  const shared = projectShared(parsed.fileInfo, parsed.version);
  const cmf = buildCmfFromShared(shared);
  assert.ok(shared.meshes.length > 0);
  for (let i = 0; i < shared.meshes.length; i++) {
    const topology = parsed.fileInfo.Meshes[i].PrimaryTopology;
    const scalar = value => typeof value === 'object' ? Object.values(value)[0] : value;
    const native = topology.Indices?.length ? topology.Indices.map(v => scalar(v) >>> 0) : topology.Indices16.map(v => scalar(v) & 65535);
    assert.deepEqual(Array.from(shared.meshes[i].indexBuffer), native);
    assert.equal(PackLodGeometry(cmf.meshes[i]).index.count, native.length);
  }
});
