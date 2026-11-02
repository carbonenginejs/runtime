// TriGeometryRes builds Carbon's mesh records (TriGeometryResMeshData / LodData / AreaData, SkeletonData) in
// SetupMeshes( const cmf::Data& ) and SetupSkeletons( const cmf::Data& ) (TriGeometryRes.cpp:855-950, 1187-1209).
// Checked against a CMF written from a real client hull, and against a flattened payload.
import assert from "node:assert/strict";
import test from "node:test";
import { TriGeometryRes, TriGeometryResMeshData, TriGeometryResLodData, TriGeometryResAreaData } from "../../npm/dist/trinity/index.js";
import { CjsGr2Format } from "../../npm/dist/resource/formats/gr2/index.js";
import { CjsCmfFormat } from "../../npm/dist/resource/formats/cmf/index.js";
import { clientResources } from "../support/clientResources.js";

const client = await clientResources();
const skip = client.skip ?? false;
const HULL = "res:/dx9/model/ship/minmatar/destroyer/mde3/mde3_t3.gr2";

/** Each record agrees with the CMF payload it was built from. */
function assertRecordsMatchPayload(geometry)
{
  const payload = geometry.GetCMFData();
  assert.equal(geometry._meshes.length, payload.meshes.length);
  payload.meshes.forEach((cmfMesh, meshIndex) =>
  {
    const mesh = geometry._meshes[meshIndex];
    assert.ok(mesh instanceof TriGeometryResMeshData);
    assert.equal(mesh.name, cmfMesh.name);
    const bounds = TriGeometryRes.getBounds(cmfMesh);
    if (bounds)
    {
      assert.deepEqual([ ...mesh.minBounds ], [ ...bounds.min ].map(Math.fround));
      assert.deepEqual([ ...mesh.maxBounds ], [ ...bounds.max ].map(Math.fround));
    }
    assert.equal(mesh.jointBindings.length, (cmfMesh.boneBindings ?? []).length);
    const cmfLods = cmfMesh.lods?.length ? cmfMesh.lods : [ cmfMesh ];
    assert.equal(mesh.lods.length, cmfLods.length);
    cmfLods.forEach((cmfLod, lodIndex) =>
    {
      const lod = mesh.lods[lodIndex];
      assert.ok(lod instanceof TriGeometryResLodData);
      assert.equal(lod.mesh, mesh);
      assert.equal(lod.originalLodIndex, lodIndex);
      assert.equal(lod.primitiveCount, TriGeometryRes.getLodPrimitiveCount(cmfLod));
      assert.ok(lod.vertexCount > 0, "a real LOD has vertices");
      assert.equal(lod.areas.length, (cmfLod.areas ?? []).length);
      lod.areas.forEach((area, areaIndex) =>
      {
        assert.ok(area instanceof TriGeometryResAreaData);
        assert.equal(area.firstIndex, TriGeometryRes.getAreaFirstIndex(cmfLod.areas[areaIndex]));
        assert.equal(area.primitiveCount, TriGeometryRes.getAreaPrimitiveCount(cmfLod.areas[areaIndex]));
        assert.equal(area.name, geometry.GetMeshAreaName(meshIndex, areaIndex));
      });
      assert.deepEqual(lod.morphTargetNames, (cmfMesh.morphTargets?.targets ?? []).map(t => TriGeometryRes.stripShapeSuffix(t.name)));
    });
    assert.equal(mesh.lodMask, (2 ** mesh.lods.length) - 1);
  });
  assert.equal(geometry._skeletons.length, (payload.skeletons ?? []).length);
  payload.skeletons?.forEach((skeleton, skeletonIndex) =>
  {
    const record = geometry._skeletons[skeletonIndex];
    assert.equal(record.name, skeleton.name);
    assert.deepEqual(record.joints.map(joint => joint.name), skeleton.bones.map(bone => typeof bone === "string" ? bone : bone.name));
    assert.deepEqual(record.joints.map(joint => joint.parentJoint), Array.from(skeleton.parents ?? [], parent => parent));
  });
}

test("a CMF written from the real hull builds the same records through ReadCMFFile", { skip }, async () =>
{
  const shared = CjsGr2Format.read(await client.Read(HULL), { rebuildMissingBounds: true });
  const bytes = CjsCmfFormat.writeShared(shared);
  const geometry = new TriGeometryRes();
  assert.equal(geometry.ReadCMFFile(bytes), true);
  assert.equal(geometry.IsUsingCMF(), true);
  assert.ok(geometry._meshes.length > 0);
  assertRecordsMatchPayload(geometry);
});

test("a flattened single-LOD payload is its own only LOD record", () =>
{
  const geometry = new TriGeometryRes();
  geometry.SetupMeshes({ meshes: [ {
    name: "flat", minBounds: [ -1, -2, -3 ], maxBounds: [ 1, 2, 3 ],
    areas: [ { name: "a", firstElement: 2, elementCount: 4, affectedByBones: true } ],
    vertex: { position: new Float32Array(9) }
  } ] });
  const [ mesh ] = geometry._meshes;
  assert.equal(mesh.lods.length, 1);
  const [ area ] = mesh.lods[0].areas;
  assert.equal(area.name, "a");
  assert.equal(area.firstIndex, 6, "Carbon m_firstIndex = firstElement * 3 (cpp:924)");
  assert.equal(area.primitiveCount, 4);
  assert.equal(area.isSkinned, true);
  assert.equal(mesh.lods[0].vertexCount, 3);
  assert.equal(mesh.lods[0].grannyMeshIndex, -1);
});

test("the bare SetupMeshes refuses a granny file info until the Granny overload is ported", () =>
{
  assert.throws(() => new TriGeometryRes().SetupMeshes({ grannyFileFormatRevision: 7, meshes: [] }), /granny_file_info/);
});

test("a CMF LOD's threshold is its max screen size, so LOD selection follows it (cpp:905, 294-319)", () =>
{
  const geometry = new TriGeometryRes();
  const lod = threshold => ({ threshold, areas: [ { firstElement: 0, elementCount: 1 } ], vertex: { position: new Float32Array(9) } });
  geometry.ReadCMFFile({ meshes: [ { name: "m", areas: [ { name: "a" } ], lods: [ lod(1000), lod(100), lod(10) ] } ] });
  assert.deepEqual(geometry.GetMeshData(0).lods.map(record => record.maxScreenSize), [ 1000, 100, 10 ]);
  assert.equal(geometry.GetLodIndexForScreenSize(0, 500), 0);
  assert.equal(geometry.GetLodIndexForScreenSize(0, 50), 1);
  assert.equal(geometry.GetLodIndexForScreenSize(0, 5), 2);
});
