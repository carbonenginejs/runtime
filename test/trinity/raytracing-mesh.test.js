import assert from "node:assert/strict";
import test from "node:test";
import { existsSync } from "node:fs";
import { Tr2RaytracingMesh } from "../../npm/dist/trinity/index.js";
import { Tr2SuballocatedBufferAllocation } from "../../npm/dist/trinity/core/device/Tr2SuballocatedBuffer/Tr2SuballocatedBufferAllocation.js";
import { TriGeometryRes } from "../../npm/dist/resource/index.js";

/** Creates real geometry/resource and allocation objects without a graphics device. */
function geometry()
{
  const lods = [1000,10].map((maxScreenSize,index) =>
  {
    const vertexAllocation = new Tr2SuballocatedBufferAllocation();
    const indexAllocation = new Tr2SuballocatedBufferAllocation();
    vertexAllocation.m_buffer = {label:`vertex-${index}`};
    indexAllocation.m_buffer = {label:`index-${index}`};
    return {maxScreenSize,areas:[{}],vertexAllocation,indexAllocation};
  });
  const resource = new TriGeometryRes();
  resource.SetPayload({meshes:[{lods}]}).MarkPrepared();
  return {resource,lods};
}

test("raytracing dirty state starts set and explicit invalidation is consumed once", () =>
{
  const mesh = new Tr2RaytracingMesh();
  assert.equal(mesh.GetAndResetDirtyFlag(),true);
  assert.equal(mesh.GetAndResetDirtyFlag(),false);
  assert.equal(mesh.MarkDirty(),undefined);
  mesh.MarkDirty();
  assert.equal(mesh.GetAndResetDirtyFlag(),true);
  assert.equal(mesh.GetAndResetDirtyFlag(),false);
  assert.equal(mesh.IsGood(),false);
  assert.equal(mesh.IsGoodForArea(0),false);
});

test("raytracing LOD changes invalidate geometry while same-LOD screen changes retain it", () =>
{
  const mesh = new Tr2RaytracingMesh();
  const {resource,lods} = geometry();
  mesh.UpdateRtMesh(resource,0,100);
  mesh.GetAndResetDirtyFlag();
  assert.equal(mesh.IsGood(),true);
  assert.equal(mesh.IsGoodForArea(0),true);
  assert.equal(mesh.IsGoodForArea(1),false);
  assert.equal(mesh.GetCurrentLodData(),lods[0]);
  mesh.UpdateRtMesh(resource,0,50);
  assert.equal(mesh.GetAndResetDirtyFlag(),false);
  mesh.UpdateRtMesh(resource,0,5);
  assert.equal(mesh.GetAndResetDirtyFlag(),true);
  assert.equal(mesh.GetCurrentLodData(),lods[1]);
  assert.equal(mesh.GetHighestLodData(),lods[0]);
  assert.equal(mesh.GetVertexBuffer(),lods[1].vertexAllocation.GetBuffer());
  assert.equal(mesh.GetIndexBuffer(),lods[1].indexAllocation.GetBuffer());
  const skinned = {label:"skinned"};
  mesh.SetSkinnedVertices(skinned,41);
  assert.equal(mesh.GetSkinnedVertexBuffer(),skinned);
  assert.equal(mesh.GetSkinnedVertexOffset(),41);
  assert.equal(mesh.GetAndResetDirtyFlag(),false);
  mesh.UpdateRtMesh(null,0,5);
  assert.equal(mesh.GetAndResetDirtyFlag(),true);
  assert.equal(mesh.lodIndex,-1);
  assert.equal(mesh.IsGood(),false);
});

test("a geometry that becomes ready retries LOD selection with unchanged screen size", () =>
{
  const mesh = new Tr2RaytracingMesh(), resource = new TriGeometryRes();
  mesh.UpdateRtMesh(resource,0,5);
  assert.equal(mesh.lodIndex,-1);
  mesh.GetAndResetDirtyFlag();
  resource.SetPayload({meshes:[{areas:[{}],maxScreenSize:10}]}).MarkPrepared();
  mesh.UpdateRtMesh(resource,0,5);
  assert.equal(mesh.lodIndex,0);
  assert.equal(mesh.GetAndResetDirtyFlag(),true);
});

test("bone snapshots compare packed bytes, preserve view offsets and ignore offset-only edits", () =>
{
  const mesh = new Tr2RaytracingMesh();
  mesh.GetAndResetDirtyFlag();
  const storage = new Float32Array(18), source = storage.subarray(3,15);
  source.set([1,2,3,4,5,6,7,8,9,10,11,12]);
  assert.equal(mesh.SetBoneTransforms(1,source,12),true);
  assert.deepEqual(Array.from(mesh.transforms),Array.from(source));
  mesh.GetAndResetDirtyFlag();
  assert.equal(mesh.SetBoneTransforms(1,source,25),false);
  assert.equal(mesh.GetTransformOffset(),25);
  source[0] = 0;
  mesh.SetBoneTransforms(1,source,25);
  mesh.GetAndResetDirtyFlag();
  source[0] = -0;
  assert.equal(mesh.SetBoneTransforms(1,source,25),true,"native memcmp distinguishes signed zero");
  assert.ok(Object.is(mesh.transforms[0],-0));
  source[1] = 90;
  assert.equal(mesh.transforms[1],2,"the mesh owns its snapshot");
  mesh.GetAndResetDirtyFlag();
  assert.equal(mesh.SetBoneTransforms(0,null,0),true);
  mesh.GetAndResetDirtyFlag();
  assert.equal(mesh.SetBoneTransforms(0,null,5),false);
  const {resource} = geometry();
  mesh.SetBoneTransforms(1,source,5);
  mesh.UpdateRtMesh(resource,0,100);
  assert.equal(mesh.transforms.length,0,"a changed resource discards prior bone data");
});

test("morph snapshots retain packed records and dirty only content or count changes", () =>
{
  const mesh = new Tr2RaytracingMesh();
  mesh.GetAndResetDirtyFlag();
  const storage = new Uint8Array(20), packed = storage.subarray(4,12);
  new DataView(packed.buffer,packed.byteOffset,8).setUint32(0,9,true);
  new DataView(packed.buffer,packed.byteOffset,8).setFloat32(4,0.75,true);
  assert.equal(mesh.SetMorphAnimations(1,packed,3),true);
  mesh.GetAndResetDirtyFlag();
  assert.equal(mesh.SetMorphAnimations(1,packed,20),false);
  assert.equal(mesh.morphAnimationDataOffset,20);
  assert.equal(mesh.morphAnimationDataCount,1);
  packed[0] = 10;
  assert.equal(mesh.morphAnimationDatas[0],9);
  assert.equal(mesh.SetMorphAnimations(1,packed,20),true);
  mesh.GetAndResetDirtyFlag();
  assert.equal(mesh.SetMorphAnimations(0,null,0),true);
  assert.equal(mesh.morphAnimationDatas.length,0);
});

test("raytracing mesh is maintained rather than duplicated in generated intake", () =>
{
  assert.equal(existsSync(new URL("../../src/trinity/generated/raytracing/Tr2RaytracingMesh.js",import.meta.url)),false);
  assert.equal(existsSync(new URL("../../src/trinity/raytracing/Tr2RaytracingMesh.js",import.meta.url)),true);
});
