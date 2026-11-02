// TriGeometryRes reads a granny_file_info as Carbon does (SetupMeshes / SetupSkeletons( granny_file_info* ),
// TriGeometryRes.cpp:953-1241): LOD meshes fold into their source mesh at their MeshBoundsInfo screen size, areas
// take the material binding names, bounds and UV densities come from the file, and the declaration is built from
// the Granny vertex type. Checked on a real client hull.
import assert from "node:assert/strict";
import test from "node:test";
import { CjsGr2Format } from "../../npm/dist/resource/formats/gr2/index.js";
import { TriGeometryRes, Tr2EffectStateManager } from "../../npm/dist/trinity/index.js";
import { clientResources } from "../support/clientResources.js";

const client = await clientResources();
const skip = client.skip ?? false;
const HULL = "res:/dx9/model/ship/amarr/frigate/af1/af1_t1.gr2";

async function hull()
{
  const view = await new CjsGr2Format().ReadDataAsync(await client.Read(HULL), { grannyFileInfo: true });
  const geometry = new TriGeometryRes();
  assert.equal(geometry.ReadGrannyFile(view), true);
  return { geometry, gi: view.grannyFileInfo };
}

test("Granny LOD meshes fold into their source mesh at their MeshBoundsInfo screen size", { skip }, async () =>
{
  const { geometry, gi } = await hull();
  assert.equal(geometry.IsUsingCMF(), false);
  assert.equal(geometry.GetCMFData(), null, "no CMF conversion on the gr2 path");
  assert.equal(geometry.GetGrannyInfo(), gi);
  assert.equal(geometry.GetMeshCount(), 1);
  const mesh = geometry.GetMeshData(0);
  assert.equal(mesh.name, "AF1_TShape1");
  assert.deepEqual(mesh.lods.map(lod => lod.maxScreenSize), [ Infinity, 320, 160, 80, 40, 20, 10 ]);
  assert.deepEqual(mesh.lods.map(lod => lod.grannyMeshIndex), [ 0, 1, 2, 3, 4, 5, 6 ]);
  assert.deepEqual(mesh.lods.map(lod => lod.originalLodIndex), [ 0, 1, 2, 3, 4, 5, 6 ]);
  assert.deepEqual(mesh.lods.map(lod => lod.vertexCount), gi.Meshes.map(grannyMesh => grannyMesh.PrimaryVertexData.Vertices.count));
  assert.equal(mesh.lodMask, 0x7f);
  assert.deepEqual(mesh.lods[0].areas.map(area => area.name), [ "hull", "Exhaust" ]);
  const mbi = gi.Meshes[0].ExtendedData;
  assert.deepEqual([ ...mesh.minBounds ], mbi.bounds.min.map(Math.fround));
  assert.deepEqual([ ...mesh.maxBounds ], mbi.bounds.max.map(Math.fround));
  assert.deepEqual(mesh.lods[0].uvDensities, Array.from(mbi.uvDensities));
  assert.deepEqual([ ...mesh.lods[0].areas[0].minBounds ], mbi.areaInfo[0].bounds.min.map(Math.fround));
  assert.equal(mesh.lods[0].primitiveCount, gi.Meshes[0].PrimaryTopology.Groups.reduce((sum, group) => sum + group.TriCount, 0));
  assert.deepEqual([ ...mesh.boundingSphere ], [ 0, 0, 0, 0 ], "a granny mesh's sphere is zero until RecalculateBoundingSphere (cpp:1039)");
});

test("the declaration is built from the Granny vertex type (BuildFromGrannyVertexDecl)", { skip }, async () =>
{
  const { geometry } = await hull();
  const mesh = geometry.GetMeshData(0);
  assert.equal(mesh.bytesPerVertex, 20);
  const elements = Tr2EffectStateManager.getVertexDeclarationElements(mesh.vertexDeclarationHandle);
  const items = elements.items ?? elements;
  assert.deepEqual(items.map(item => [ item.type, item.usage, item.usageIndex, item.offset ]),
    [ [ "FLOAT32_3", 0, 0, 0 ], [ "UBYTE_4_NORM", 3, 0, 12 ], [ "FLOAT16_2", 5, 0, 16 ] ]);
});

test("Carbon's LOD selection runs on the folded LODs", { skip }, async () =>
{
  const { geometry } = await hull();
  assert.equal(geometry.GetLodIndexForScreenSize(0, 1000), 0);
  assert.equal(geometry.GetLodIndexForScreenSize(0, 200), 1);
  assert.equal(geometry.GetLodIndexForScreenSize(0, 30), 4);
  assert.equal(geometry.GetLodIndexForScreenSize(0, 1), 6);
});

test("skeletons come from the Granny skeletons", { skip }, async () =>
{
  const { geometry, gi } = await hull();
  assert.equal(geometry.GetSkeletonCount(), gi.Skeletons.length);
  const skeleton = geometry.GetSkeletonData(0);
  assert.deepEqual(skeleton.joints.map(joint => joint.name), gi.Skeletons[0].Bones.map(bone => bone.Name));
  assert.equal(skeleton.joints[0].parentJoint, 0xffffffff);
});
