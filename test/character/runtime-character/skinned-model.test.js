// Tr2SkinnedModel and the mesh rig binding it drives, on real classes: Tr2Mesh over a payload TriGeometryRes acquired
// through be.resMan (Tr2SkinnedModel.cpp, Tr2MeshBase.cpp:120-282).
import assert from "node:assert/strict";
import test from "node:test";
import { be } from "../../../npm/dist/global/blue/index.js";
import { mat4 } from "../../../npm/dist/global/math/mat4.js";
import { TriGeometryRes } from "../../../npm/dist/resource/index.js";
import { Tr2Mesh, Tr2MeshArea } from "../../../npm/dist/trinity/index.js";
import { Tr2SkinnedModel } from "../../../npm/dist/character/index.js";
import { StubResMan } from "../../support/stubResMan.js";

const NO_SKELETON = 0xffffffff;

// Skeleton root -> hand -> finger. The mesh binds hand and finger; each joint's OBB is the unit cube.
const payload = () => ({
  skeletons: [
    { name: "other", bones: [ "x" ], parents: Uint32Array.of(NO_SKELETON) },
    { name: "body", bones: [ "root", "hand", "finger" ], parents: Uint32Array.of(NO_SKELETON, 0, 1) }
  ],
  meshes: [ {
    decl: [ { usage: "Position", usageIndex: 0, type: "Float32", elementCount: 3, offset: 0 } ],
    vertex: { position: [ 0, 0, 0, 1, 0, 0, 0, 1, 0 ] },
    indices: [ { faces: [ 0, 1, 2 ] } ],
    areas: [ { firstElement: 0, elementCount: 1 } ],
    boneBindings: [
      { name: "hand", bounds: { min: [ -1, -1, -1 ], max: [ 1, 1, 1 ] } },
      { name: "finger", bounds: { min: [ -1, -1, -1 ], max: [ 1, 1, 1 ] } }
    ],
    bounds: { min: [ 0, 0, 0 ], max: [ 1, 1, 0 ] },
    // One morph target: the load fills the LOD's deformation amount from its maxDisplacement (TriGeometryRes.cpp:2134).
    morphTargets: { targets: [ { name: "BlinkShape", maxDisplacement: 0.5 } ] }
  } ]
});

function meshOn(geometry)
{
  const mesh = new Tr2Mesh();
  mesh.SetGeometryRes(geometry);
  mesh.opaqueAreas.push(new Tr2MeshArea());
  return mesh;
}

function preparedGeometry()
{
  const geometry = new TriGeometryRes();
  geometry.SetPayload(payload());
  geometry.MarkPrepared();
  return geometry;
}

test("Tr2MeshBase.BindToRig maps each binding to the rig, falling back through render-rig parents", () =>
{
  const geometry = preparedGeometry();
  const mesh = meshOn(geometry);
  const skeleton = geometry.GetSkeletonData(1);

  // The animation rig lacks "finger", so it takes its parent "hand" (Tr2MeshBase.cpp:170-193).
  const boneList = [ "root", "hand" ];
  assert.equal(mesh.BindToRig(boneList, 2, skeleton), true);
  const area = mesh.opaqueAreas[0];
  assert.deepEqual(Array.from(area.GetJointMappingAnimRig()), [ 1, 1 ]);
  assert.equal(area.GetJointCount(), 2);

  const unprepared = meshOn(new TriGeometryRes());
  assert.equal(unprepared.BindToRig(boneList, 2, skeleton), false, "an unprepared resource does not bind");
});

test("Tr2MeshBase.GetBounds skins each joint's box by its bone, and keeps the plain box without bones", () =>
{
  const mesh = meshOn(preparedGeometry());
  const plain = mesh.GetBounds();
  assert.deepEqual([ Array.from(plain.min), Array.from(plain.max) ], [ [ 0, 0, 0 ], [ 1, 1, 0 ] ]);

  // Bone 0 at x = 10, bone 1 scaled by 2 at y = 5.
  const bones = [ mat4.fromTranslation(mat4.create(), [ 10, 0, 0 ]), mat4.fromRotationTranslationScale(mat4.create(), [ 0, 0, 0, 1 ], [ 0, 5, 0 ], [ 2, 2, 2 ]) ];
  const skinned = mesh.GetBounds(bones, [ 0, 1 ], 2);
  assert.deepEqual([ Array.from(skinned.min), Array.from(skinned.max) ], [ [ -2, -1, -2 ], [ 11, 7, 2 ] ]);

  // Morph growth: lod 0's deformation amount times the weight widens every side.
  const grown = mesh.GetBounds(bones, [ 0, 1 ], 2, [ { index: 0, weight: 2 } ], 1);
  assert.deepEqual([ Array.from(grown.min), Array.from(grown.max) ], [ [ -3, -2, -3 ], [ 12, 8, 3 ] ]);
});

test("Tr2SkinnedModel acquires its geometry, selects the named skeleton, binds its meshes and skins its box", (t) =>
{
  const manager = be.resMan;
  be.resMan = new StubResMan();
  t.after(() => { be.resMan = manager; });

  const model = new Tr2SkinnedModel();
  model.SetSkeletonName("body");
  model.SetGeometryResPath("res:/synthetic/body.gr2");
  assert.equal(model.GetGeometryResPath(), "res:/synthetic/body.gr2");
  model.Initialize();
  assert.ok(model.geometryRes instanceof TriGeometryRes, "acquired through blue.resMan (Tr2SkinnedModel.cpp:202-223)");
  assert.equal(model.GetSkeleton(), null, "no skeleton until the resource is prepared");

  model.geometryRes.SetPayload(payload());
  model.geometryRes.MarkPrepared();
  model.RebuildCachedData(model.geometryRes);
  assert.equal(model.GetSkeleton().name, "body");

  const mesh = meshOn(model.geometryRes);
  model.meshes.push(mesh);
  model.BindToRig([ "root", "hand", "finger" ], 3, false);
  assert.deepEqual(Array.from(mesh.opaqueAreas[0].GetJointMappingAnimRig()), [ 1, 2 ]);

  // The bound mesh uses its own binding table for the dynamic box ("for old character stuff").
  const bones = [ mat4.create(), mat4.fromTranslation(mat4.create(), [ 0, 3, 0 ]), mat4.fromTranslation(mat4.create(), [ 0, 0, 4 ]) ];
  const min = new Float32Array(3), max = new Float32Array(3);
  assert.equal(model.GetDynamicBoundingBox(bones, min, max), true);
  assert.deepEqual([ Array.from(min), Array.from(max) ], [ [ -1, -1, -1 ], [ 1, 4, 5 ] ]);

  const empty = new Tr2SkinnedModel();
  assert.equal(empty.GetDynamicBoundingBox(bones, min, max), false);

  model.skeletonName = "missing";
  model.RebuildCachedData(model.geometryRes);
  assert.equal(model.GetSkeleton(), null, "an unknown skeleton name selects NO_SKELETON");
});
