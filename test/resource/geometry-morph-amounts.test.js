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
    assert.deepEqual(geometry.GetMeshLod_LodIndex(plain, 0).morphTargetDeformationAmounts, [], "a mesh without morphs gets empty tables, as Carbon's empty vectors");
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

// The face-only head names its 35 morph targets with the exporter's "Shape" suffix (LeftEyeMissingShape).
const FACE = "res:/graphics/character/female/paperdoll/head/head_faceonly/head_generic.gr2";

async function FaceGeometry()
{
  const geometry = new TriGeometryRes();
  geometry.SetPayload(geometry.ReadGrannyFile(await client.Read(FACE)));
  geometry.MarkPrepared();
  const meshIndex = geometry.GetPayload().meshes.findIndex(mesh => (mesh.morphTargets?.targets ?? []).some(target => target.name.endsWith("Shape")));
  return { geometry, meshIndex };
}

test("every LOD stores the target names less \"Shape\" and a cleared baked flag (TriGeometryRes.cpp:2113-2124, 2268-2282)", { skip }, async () =>
{
  const { geometry, meshIndex } = await FaceGeometry();
  assert.ok(meshIndex >= 0, "the face-only head has Shape-suffixed morph targets");
  const targets = geometry.GetPayload().meshes[meshIndex].morphTargets.targets;
  const lod = geometry.GetMeshLod_LodIndex(meshIndex, 0);
  assert.equal(lod.morphTargetNames.length, targets.length);
  targets.forEach((target, index) =>
  {
    assert.ok(target.name.endsWith("Shape"));
    assert.equal(lod.morphTargetNames[index], target.name.slice(0, -5));
  });
  assert.deepEqual(lod.isBakedMorphTarget, targets.map(() => false));
  assert.equal(TriGeometryRes.stripShapeSuffix("Shape"), "Shape", "a name no longer than the suffix keeps it");
});

test("Tr2Mesh reads the stored names, and its baked flags live on the shared LOD (Tr2Mesh.cpp:225-352)", { skip }, async () =>
{
  const { geometry, meshIndex } = await FaceGeometry();
  const meshOn = () =>
  {
    const mesh = new Tr2Mesh();
    mesh.SetGeometryRes(geometry);
    mesh.meshIndex = meshIndex;
    return mesh;
  };
  const first = meshOn(), second = meshOn();
  const names = first.GetMorphTargetNames();
  assert.ok(names.includes("LeftEyeMissing") && !names.includes("LeftEyeMissingShape"));
  const index = names.indexOf("LeftEyeMissing");

  first.InitializeMorphTargets();
  assert.equal(first.GetMorphAnimations().get("LeftEyeMissing").index, index, "morph animations are keyed by the stored names");

  first.SetBakedMorphTarget("LeftEyeMissing", true);
  assert.equal(second.GetBakedMorphTarget("LeftEyeMissing"), true, "the flag is the geometry's, seen by every mesh");
  assert.equal(second.IsBakedMorph(index), true);
  assert.equal(second.GetAllBakedMorphTargetStates()[index], true);
  first.SetBakedMorphTarget("LeftEyeMissingShape", false);
  assert.equal(second.GetBakedMorphTarget("LeftEyeMissing"), true, "the raw suffixed name matches nothing");
  assert.equal(second.GetBakedMorphTarget("LeftEyeMissingShape"), false);

  const empty = new Tr2Mesh();
  assert.deepEqual(empty.GetMorphTargetNames(), []);
  assert.equal(empty.GetAllBakedMorphTargetStates(), null);
});
