// The granny_file_info read Carbon's TriGeometryRes consumes (GrannyGetFileInfo): the reflected graph with each
// vertex array kept as Granny stores it (bytes, stride, reflected member list) and each index array typed, checked
// against the per-element read of a real client hull.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readGr2Raw } from "../../../../../src/resource/formats/gr2/core/reader.js";
import CjsGr2Format from "../../../../../src/resource/formats/gr2/index.js";
import { clientResources } from "../../../../support/clientResources.js";

const client = await clientResources();
const skip = client.skip ?? false;
const HULL = "res:/dx9/model/ship/amarr/frigate/af1/af1_t1.gr2";

test("raw arrays keep each mesh's vertex bytes and typed indices, equal to the per-element read", { skip }, async () =>
{
  const bytes = await client.Read(HULL);
  const objects = readGr2Raw(bytes).fileInfo;
  const raw = readGr2Raw(bytes, { rawArrays: true }).fileInfo;
  assert.equal(raw.Meshes.length, objects.Meshes.length);
  raw.Meshes.forEach((mesh, meshIndex) =>
  {
    const source = objects.Meshes[meshIndex];
    const vertices = mesh.PrimaryVertexData.Vertices;
    assert.equal(vertices.count, source.PrimaryVertexData.Vertices.length);
    assert.equal(vertices.bytes.byteLength, vertices.count * vertices.stride);
    assert.deepEqual(vertices.type.map(member => member.name), Object.keys(source.PrimaryVertexData.Vertices[0]));
    // Position is Real32 x3 at offset 0 in these hulls.
    assert.deepEqual(vertices.type[0], { name: "Position", type: 10, arrayWidth: 3 });
    const view = new DataView(vertices.bytes.buffer);
    for (const index of [ 0, vertices.count >> 1, vertices.count - 1 ])
    {
      const position = source.PrimaryVertexData.Vertices[index].Position;
      for (let axis = 0; axis < 3; axis++)
      {
        assert.equal(view.getFloat32(index * vertices.stride + axis * 4, true), position[axis]);
      }
    }
    // The file reflects Indices16 as Int16 members; Carbon reads the same storage as granny_uint16.
    const indices16 = mesh.PrimaryTopology.Indices16;
    assert.ok(indices16 instanceof Int16Array);
    assert.deepEqual(Array.from(new Uint16Array(indices16.buffer, indices16.byteOffset, indices16.length)),
      source.PrimaryTopology.Indices16.map(value => Object.values(value)[0] & 0xffff));
    assert.equal(mesh.ExtendedData.typeName, "MeshBoundsInfo");
    assert.ok(mesh.ExtendedData.uvDensities instanceof Float32Array);
    assert.deepEqual(mesh.MaterialBindings.map(binding => binding.Material.Name), [ "hull", "Exhaust" ]);
  });
  assert.deepEqual(raw.Meshes.map(mesh => mesh.ExtendedData.maxScreenSize), [ 0, 320, 160, 80, 40, 20, 10 ]);
});

test("grannyFileInfo makes our internal read answer the file info, with mesh selection", { skip }, async () =>
{
  const bytes = await client.Read(HULL);
  const format = new CjsGr2Format();
  const whole = await format.ReadDataAsync(bytes, { grannyFileInfo: true });
  assert.equal(typeof whole.version, "number");
  assert.equal(whole.grannyFileInfo.Meshes.length, 7);
  const one = await format.ReadDataAsync(bytes, { grannyFileInfo: true, meshIndex: 2 });
  assert.deepEqual(one.grannyFileInfo.Meshes.map(mesh => mesh.Name), [ "AF1_TShape1 LOD 160" ]);
  assert.equal(format.FinishRead(whole), whole);
  const shared = await format.ReadDataAsync(bytes);
  assert.equal(shared.grannyFileInfo, undefined, "the default internal read is still shared data");
  assert.ok(Array.isArray(shared.meshes));
});
