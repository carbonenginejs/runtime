// TriGeometryRes fills each LOD's morphTargetDeformationAmounts at load, as Carbon does while building its LODs
// (TriGeometryRes.cpp:2134 for CMF, 2293 for Granny), from a real client head with facial morph targets.
import assert from "node:assert/strict";
import test from "node:test";
import { TriGeometryRes } from "../../npm/dist/resource/index.js";
import { Tr2Mesh } from "../../npm/dist/trinity/index.js";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { clientResources } from "../support/clientResources.js";

// Real client files through BePaths (test/support/clientResources.js).
const client = await clientResources();
const skip = client.skip ?? false;
const HEAD = "res:/graphics/character/female/paperdoll/head/head_generic/head_generic.gr2";

test("every LOD carries one deformation amount per morph target, Carbon's largest morph-to-base distance", { skip }, async () =>
{
  const geometry = new TriGeometryRes();
  geometry.SetPayload(geometry.ReadGrannyFile(await client.Read(HEAD)));
  const meshes = geometry.GetPayload().meshes;
  const meshIndex = meshes.findIndex(mesh => mesh.morphTargets?.targets?.length);
  assert.ok(meshIndex >= 0, "the head has facial morph targets");
  const mesh = meshes[meshIndex];
  const targets = mesh.morphTargets.targets;

  for (const lod of mesh.lods?.length ? mesh.lods : [ mesh ])
  {
    assert.deepEqual(lod.morphTargetDeformationAmounts, targets.map(target => target.maxDisplacement));
  }

  // Carbon's CalculateMorphDeformationAmount (cpp:2240-2256 helpers): sqrt of the largest squared distance from each
  // base position to its morph position, re-derived here from the decoded vertices.
  const lod = geometry.GetMeshLod_LodIndex(meshIndex, 0);
  const base = (lod.vertex ?? mesh.vertex).position;
  for (const index of [ 0, Math.floor(targets.length / 2), targets.length - 1 ])
  {
    const morph = lod.morphTargets[index].vertex.position;
    let maxSquared = 0;
    for (let v = 0; v < base.length; v += 3)
    {
      const dx = morph[v] - base[v], dy = morph[v + 1] - base[v + 1], dz = morph[v + 2] - base[v + 2];
      maxSquared = Math.max(maxSquared, dx * dx + dy * dy + dz * dz);
    }
    assert.ok(Math.abs(lod.morphTargetDeformationAmounts[index] - Math.sqrt(maxSquared)) < 1e-6, `target ${index}`);
  }
  assert.ok(lod.morphTargetDeformationAmounts.some(amount => amount > 0));

  const plain = meshes.findIndex(other => !other.morphTargets?.targets?.length);
  if (plain >= 0)
  {
    assert.equal(geometry.GetMeshLod_LodIndex(plain, 0).morphTargetDeformationAmounts, undefined, "a mesh without morphs gets none");
  }
});

test("Tr2MeshBase.GetBounds grows by the loaded morph amounts (Tr2MeshBase.cpp:263-270)", { skip }, async () =>
{
  const geometry = new TriGeometryRes();
  geometry.SetPayload(geometry.ReadGrannyFile(await client.Read(HEAD)));
  geometry.MarkPrepared();
  const meshIndex = geometry.GetPayload().meshes.findIndex(mesh => mesh.morphTargets?.targets?.length);
  const mesh = new Tr2Mesh();
  mesh.SetGeometryRes(geometry);
  mesh.meshIndex = meshIndex;

  const bindings = geometry.GetMeshData(meshIndex).boneBindings;
  const bones = bindings.map(() => mat4.create());
  const indices = bindings.map((_binding, index) => index);
  const rest = mesh.GetBounds(bones, indices, bindings.length);
  const amount = geometry.GetMeshLod_LodIndex(meshIndex, 0).morphTargetDeformationAmounts[0];
  const grown = mesh.GetBounds(bones, indices, bindings.length, [ { index: 0, weight: 2 } ], 1);
  for (let axis = 0; axis < 3; axis++)
  {
    assert.ok(Math.abs(rest.min[axis] - grown.min[axis] - 2 * amount) < 1e-5, `min ${axis}`);
    assert.ok(Math.abs(grown.max[axis] - rest.max[axis] - 2 * amount) < 1e-5, `max ${axis}`);
  }
});
