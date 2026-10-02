// Source: trinity/trinity/Raytracing/Tr2RaytracingGeometry.h
// Source: trinity/trinity/Raytracing/Tr2RaytracingGeometry.cpp
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta } from "#schema";

/** Tracks one ray-tracing mesh's geometry, transforms, skinning and morph offsets, screen size, and selected LOD. */
@meta.define({ className: "Tr2RaytracingMesh", family: "raytracing", purpose: "Tracks one ray-tracing mesh's geometry, transforms, skinning and morph offsets, screen size, and selected LOD." })
export class Tr2RaytracingMesh
{

  /** m_skinnedVertices (const Tr2BufferAL*) */
  @meta.type.objectRef("Tr2BufferAL")
  skinnedVertices = null;

  /** m_geometry (TriGeometryResPtr) */
  @meta.type.objectRef("TriGeometryRes")
  geometry = null;

  /** m_meshIndex (uint32_t) */
  @meta.type.uint32
  meshIndex = 0;

  /** m_transforms (std::vector<float>) */
  @meta.type.list("float")
  transforms = new Float32Array(0); // alloc: variable-length packed transform snapshot

  /** m_boneOffset (uint32_t) */
  @meta.type.uint32
  boneOffset = 0;

  /** m_skinnedVertexOffset (uint32_t) */
  @meta.type.uint32
  skinnedVertexOffset = 0;

  /** m_morphAnimationDatas (std::vector<uint8_t>) */
  @meta.type.list("uint8_t")
  morphAnimationDatas = new Uint8Array(0); // alloc: variable-length packed morph snapshot

  /** m_morphAnimationDataOffset (uint32_t) */
  @meta.type.uint32
  morphAnimationDataOffset = 0;

  /** m_morphAnimationDataCount (uint32_t) */
  @meta.type.uint32
  morphAnimationDataCount = 0;

  /** m_isDirty (bool) */
  @meta.type.boolean
  isDirty = true;

  /** m_screenSize (float) */
  @meta.type.float32
  screenSize = 0;

  /** m_lodIndex (int) */
  @meta.type.int32
  lodIndex = 0;


  /** Geometry changes discard transforms; screen-size changes invalidate only a changed LOD (cpp:169-205). */
  @meta.implemented
  UpdateRtMesh(geometry, meshIndex, screenSize)
  {
    if (this.geometry !== geometry || this.meshIndex !== meshIndex)
    {
      this.geometry = geometry;
      this.meshIndex = meshIndex;
      this.screenSize = screenSize;
      this.lodIndex = geometry && geometry.IsGood() ? geometry.GetLodIndexForScreenSize(meshIndex, screenSize) : -1;
      this.transforms = new Float32Array(0); // alloc: variable-length native transform snapshot
      this.isDirty = true;
    }
    else if (this.screenSize !== screenSize || this.lodIndex === -1)
    {
      this.screenSize = screenSize;
      const lodIndex = geometry && geometry.IsGood() ? geometry.GetLodIndexForScreenSize(meshIndex, screenSize) : -1;
      this.isDirty ||= lodIndex !== this.lodIndex;
      this.lodIndex = lodIndex;
    }
  }

  /** A typed-array view replaces the native Float4x3 pointer; packed bytes are copied without composition, and offset-only edits do not dirty the mesh (cpp:207-227). */
  @meta.adapted
  SetBoneTransforms(count, transforms, offset)
  {
    // Adapted: a typed-array view supplies the native pointer's packed bytes.
    const size = count * 12;
    if (this.transforms.length !== size)
    {
      this.transforms = new Float32Array(size); // alloc: owned snapshot resized only when native bone count changes
      this.isDirty = true;
    }
    if (size > 0)
    {
      const target = new Uint8Array(this.transforms.buffer, this.transforms.byteOffset, size * 4); // alloc: byte view preserves native memcmp signed-zero and NaN bits
      if (CopyChangedBytes(target, transforms)) this.isDirty = true;
    }
    this.boneOffset = offset;
    return this.isDirty;
  }

  /** Copies packed uint32-index/float-weight records (Tr2RingBuffer.h:10-17); a byte view replaces the native struct pointer. */
  @meta.adapted
  SetMorphAnimations(count, morphTargets, offset)
  {
    const size = count * 8;
    if (this.morphAnimationDatas.length !== size)
    {
      this.morphAnimationDatas = new Uint8Array(size); // alloc: owned snapshot resized only when native morph count changes
      this.isDirty = true;
    }
    if (size > 0 && CopyChangedBytes(this.morphAnimationDatas, morphTargets)) this.isDirty = true;
    this.morphAnimationDataOffset = offset;
    this.morphAnimationDataCount = count;
    return this.isDirty;
  }

  /** Requires a ready resource and the selected LOD (cpp:250-253). */
  @meta.implemented
  IsGood()
  {
    return !!(this.geometry && this.geometry.IsGood() && this.GetCurrentLodData());
  }

  /** Adds the selected LOD's area bound to resource readiness (cpp:255-268). */
  @meta.implemented
  IsGoodForArea(area)
  {
    if (!this.geometry || !this.geometry.IsGood()) return false;
    const data = this.GetCurrentLodData();
    return !!data && area < data.areas.length;
  }

  /** Consumes the mesh invalidation once (cpp:270-278). */
  @meta.implemented
  GetAndResetDirtyFlag()
  {
    const dirty = this.isDirty;
    this.isDirty = false;
    return dirty;
  }

  /** Invalidates the mesh independently of geometry or animation changes (cpp:280-283). */
  @meta.implemented
  MarkDirty()
  {
    this.isDirty = true;
  }

  /** Uses the explicit-index equivalent of Carbon's overloaded GetMeshLod (cpp:285-288). */
  @meta.adapted
  GetCurrentLodData()
  {
    return this.geometry.GetMeshLodByIndex(this.meshIndex, this.lodIndex);
  }

  /** Selects LOD zero through the JS explicit-index overload (cpp:290-293). */
  @meta.adapted
  GetHighestLodData()
  {
    return this.geometry.GetMeshLodByIndex(this.meshIndex, 0);
  }

  /** Returns the transform allocation offset (cpp:295-298). */
  @meta.implemented
  GetTransformOffset()
  {
    return this.boneOffset;
  }

  /** Returns the assigned skinned buffer (cpp:300-303). */
  @meta.implemented
  GetSkinnedVertexBuffer()
  {
    return this.skinnedVertices;
  }

  /** Records the externally owned skinned buffer and offset without invalidating geometry (cpp:305-309). */
  @meta.implemented
  SetSkinnedVertices(buffer, offset)
  {
    this.skinnedVertices = buffer;
    this.skinnedVertexOffset = offset;
  }

  /** Returns the skinned buffer offset (cpp:311-314). */
  @meta.implemented
  GetSkinnedVertexOffset()
  {
    return this.skinnedVertexOffset;
  }

  /** Returns the selected LOD's allocated vertex buffer (cpp:316-319). */
  @meta.implemented
  GetVertexBuffer()
  {
    return this.GetCurrentLodData().vertexAllocation.GetBuffer();
  }

  /** Returns the selected LOD's allocated index buffer (cpp:321-324). */
  @meta.implemented
  GetIndexBuffer()
  {
    return this.GetCurrentLodData().indexAllocation.GetBuffer();
  }

}

/** Compares native packed bytes, including signed zero and NaN payloads, then owns a copy. */
function CopyChangedBytes(target, input)
{
  if (!ArrayBuffer.isView(input) || input.byteLength < target.byteLength)
    throw new TypeError("Packed animation input must be a view covering the requested records");
  const bytes = new Uint8Array(input.buffer, input.byteOffset, target.byteLength); // alloc: view of caller-owned packed records, no byte copy
  for (let i = 0; i < bytes.length; i++)
  {
    if (target[i] === bytes[i]) continue;
    target.set(bytes);
    return true;
  }
  return false;
}
