import { CjsSchema, type, blue, meta } from "#schema";
// Source: trinity/trinity/TriRenderBatch.h
//   trinity/TriRenderBatch.cpp
//
// GPU-free CPU render-batch descriptor plus the binning/sort helpers. A batch
// holds opaque references to material/shader/geometry and plain draw arguments;
// it never touches a device. The engine adapter reads a finalized accumulator's
// batches and issues the actual draws (Carbon's Tr2RenderContextBase::RenderBatches*
// dispatch family stays engine-side and is intentionally NOT ported here).

import { RenderingMode } from "#consts/graphics";
import { Topology } from "#consts/render-context";
import { TriGeometryRes } from "#resource/geometry";

// Carbon sorts batches on raw pointer identity of shader/vertex-stream objects.
// JS has no pointer order, so we assign each distinct reference a stable id on
// first encounter. Only contiguity of equal references matters for binning, so
// the ordinal itself is irrelevant as long as it is consistent within a run.
let nextOrderId = 1;

const orderIds = new WeakMap();

/**
 * Stable per-reference ordinal standing in for Carbon's pointer ordering in
 * batch comparisons; assigned on first sight and held in a WeakMap, so it is
 * consistent within a run but meaningless across runs.
 */
export function OrderOf(ref)
{
  if (ref === null || ref === undefined) return 0;
  if (typeof ref !== "object" && typeof ref !== "function") return Number(ref) || 0;
  let id = orderIds.get(ref);
  if (id === undefined)
  {
    id = nextOrderId++;
    orderIds.set(ref, id);
  }
  return id;
}

// THE TWO GEOMETRY FORMS ARE CARBON'S OVERLOADS (rule 11). SetGeometry takes
// buffers and strides (TriRenderBatch.h:68); SetGeometry__Allocation and
// SetGeometry__AllocationSecondStream take Tr2SuballocatedBufferAllocation
// values (h:69-70, Tr2SuballocatedBuffer.h:23-66) and call their accessors
// directly, as TriRenderBatch.cpp:96-106 does. A caller holding a bare buffer
// uses SetGeometry. An allocation slot may be null here where a LOD has no
// index data; Carbon's references cannot be.

/** `vb.GetBuffer()` (TriRenderBatch.cpp:98), or null for no allocation. */
function AllocationBuffer(allocation)
{
  return allocation ? allocation.GetBuffer() : null;
}

/** `vb.GetStride()` (TriRenderBatch.cpp:98), or 0 for no allocation. */
function AllocationStride(allocation)
{
  return allocation ? allocation.GetStride() : 0;
}

// A single draw's worth of CPU descriptor state. Faithful to Carbon's
// Tr2RenderBatch struct; the vertex/index "buffer" slots hold whatever the
// producer supplies (in the GPU-free runtime these are geometry-resource-backed
// descriptors that the engine resolves to real buffers at dispatch time).

/**
 * One draw's worth of CPU descriptor state - material and shader key, geometry
 * binding, draw arguments and sort keys - holding no device resources.
 */
export class Tr2RenderBatch
{
  // Fields in Carbon's struct order and with its initializers
  // (TriRenderBatch.h:90-114); geometrySource is ours and follows the geometry members.

  /** Carbon `m_material = nullptr` (TriRenderBatch.h:90). */
  material = null;

  /** Carbon `m_shader = nullptr` (TriRenderBatch.h:91). */
  shader = null;

  /** Carbon `m_vertexDeclaration = 0` (TriRenderBatch.h:93). */
  vertexDeclaration = 0;

  /** Carbon `m_vertexStreams[2] = {}` (TriRenderBatch.h:94). */
  vertexStreams = [ null, null ];

  /** Carbon `m_stride[2] = {}` (TriRenderBatch.h:95). */
  stride = [ 0, 0 ];

  /** Carbon `m_indexBuffer = nullptr` (TriRenderBatch.h:96). */
  indexBuffer = null;

  /** Carbon `m_indexStride = 0` (TriRenderBatch.h:97). */
  indexStride = 0;

  /**
   * Ours. Carbon's Tr2MeshBase::CreateGeometryBatch bakes the buffer
   * allocations and computed draw arguments into the batch during collection.
   * Here a mesh batch records only a geometry-resource and area-range
   * descriptor; Tr2RenderContext.SubmitGeometry realizes it at first submit
   * through RealizeBatchGeometry (TriGeometryResAllocations.js), which sets the
   * streams and re-resolves the draw arguments with resolveDrawArguments.
   */
  geometrySource = null;

  /** Carbon `m_objectData = nullptr` (TriRenderBatch.h:99). */
  objectData = null;

  /** Carbon `m_renderingMode = RM_ANY` (TriRenderBatch.h:100). */
  renderingMode = RenderingMode.RM_ANY;

  /**
   * Carbon `m_topology = TOP_TRIANGLES` (TriRenderBatch.h:101).
   *
   * THE VOCABULARY IS THE ABSTRACTION LAYER'S, NOT D3D'S. This field held a
   * `D3dPrimitiveTopology` until 2026-09-05, and everything drew correctly
   * because the WebGPU engine translated on the way out. Carbon does not
   * translate: `SubmitGeometry` hands `batch.m_topology` straight to
   * `SetTopology` (`Tr2RenderContext.cpp:86`), so the two numberings have to
   * BE the same one, and the AL owns it. The old numbering collided rather
   * than merely disagreed - D3D's 4 is TRIANGLELIST, the AL's 4 is TOP_LINES.
   */
  topology = Topology.TOP_TRIANGLES;

  /** Carbon `m_indexCountPerInstance = 0` (TriRenderBatch.h:103). */
  indexCountPerInstance = 0;

  /** Carbon `m_instanceCount = 0` (TriRenderBatch.h:104). */
  instanceCount = 0;

  /** Carbon `m_startIndexLocation = 0` (TriRenderBatch.h:105). */
  startIndexLocation = 0;

  /** Carbon `m_baseVertexLocation = 0` (TriRenderBatch.h:106). */
  baseVertexLocation = 0;

  /** Carbon `m_startInstanceLocation = 0` (TriRenderBatch.h:107). */
  startInstanceLocation = 0;

  /** Carbon `m_pickingData = 0` (TriRenderBatch.h:109). */
  pickingData = 0;

  /** Carbon `m_depth = 0` (TriRenderBatch.h:110). */
  depth = 0;

  /** Carbon `m_priority = 0` (TriRenderBatch.h:112). */
  priority = 0;

  /**
   * Carbon `m_groupCount = 1` (TriRenderBatch.h:114). The effect-sort
   * partition rewrites this on the first batch of each bin-run to the run
   * length so dispatch can stride one state-set over several draws.
   * Meaningless on non-leading batches of a run.
   */
  groupCount = 1;

  // Sets material and derives the shader key from it. Normally the shader is the
  // material's shader-state interface; before one is resolved the material
  // (effect) itself stands in as the shader key. Either way the shader is both the validity key (see IsValid) and
  // the primary bin/sort key, so effect-equal batches still group together.

  /**
   * Sets the material and derives the shader key from it, falling back to the
   * material itself when no shader-state interface is resolved yet; that key is
   * both the validity test and the primary bin/sort key, so effect-equal batches
   * still group together.
   */
  SetMaterial(material)
  {
    this.material = material ?? null;
    // Carbon: m_shader = material->GetShaderStateInterface() (TriRenderBatch.cpp:
    // 75-79) - null while the effect is still loading, which makes the batch
    // invalid and keeps it out of the accumulator. Falling back to the material
    // itself put a Tr2Effect where the draw walk expects a shader
    // ("shader.GetTechniqueIndex is not a function" on a SOF ship's first frame).
    this.shader = material ? material.GetShaderStateInterface() : null;
  }

  /** Sets the outermost sort key; lower priorities sort first. */
  SetPriority(priority)
  {
    this.priority = priority >>> 0;
  }

  // Carbon: SetGeometry(vertexDecl, Tr2BufferAL& vb, stride, Tr2BufferAL& ib, indexStride).

  /**
   * Binds one vertex stream and an index buffer with their strides, clearing the
   * second stream.
   */
  SetGeometry(vertexDeclaration, vertexBuffer, vertexStride, indexBuffer, indexStride)
  {
    this.vertexDeclaration = vertexDeclaration >>> 0;
    this.vertexStreams[0] = vertexBuffer ?? null;
    this.vertexStreams[1] = null;
    this.stride[0] = vertexStride >>> 0;
    this.indexBuffer = indexBuffer ?? null;
    this.indexStride = indexStride >>> 0;
  }

  /**
   * Carbon's SetGeometry( vertexDecl, Allocation& vb, Allocation& ib )
   * (TriRenderBatch.h:69): binds suballocated buffer allocations, taking each
   * allocation's buffer and stride (Carbon's mesh path). Named after the
   * allocation parameters that replace vb/stride/ib (docs 22d1237); formerly
   * SetGeometryFromAllocations.
   */
  SetGeometry__Allocation(vertexDeclaration, vertexAllocation, indexAllocation)
  {
    this.SetGeometry(
      vertexDeclaration,
      AllocationBuffer(vertexAllocation),
      AllocationStride(vertexAllocation),
      AllocationBuffer(indexAllocation),
      AllocationStride(indexAllocation)
    );
  }

  /**
   * Carbon's SetGeometry( vertexDecl, vb1, vb2, ib ) (h:70): the second
   * allocation becomes vertex stream 1. Named for what it adds to
   * SetGeometry__Allocation; formerly SetGeometryFromAllocations2.
   */
  SetGeometry__AllocationSecondStream(vertexDeclaration, vertexAllocation1, vertexAllocation2, indexAllocation)
  {
    this.SetGeometry__Allocation(vertexDeclaration, vertexAllocation1, indexAllocation);
    this.vertexStreams[1] = AllocationBuffer(vertexAllocation2);
    this.stride[1] = AllocationStride(vertexAllocation2);
  }

  // Geometry binding: records the resource + mesh/area range. Resolving it into
  // buffers and draw arguments at dispatch is not ported yet.

  /**
   * GPU-free geometry binding: records the geometry resource plus the mesh and
   * area range for the engine to resolve into realized buffers and draw
   * arguments at dispatch.
   * Ours: Carbon has no counterpart (it binds realized buffers through
   * SetGeometry); this lets a batch be built before its geometry is on the GPU.
   */
  SetGeometrySource(geometry, meshIndex, areaIndex, count, reversed, lod = null)
  {
    this.geometrySource = {
      geometry: geometry ?? null,
      meshIndex: meshIndex >>> 0,
      areaIndex: areaIndex | 0,
      count: count | 0,
      reversed: !!reversed,
      // The LOD the area belongs to, so the render context can realize its
      // allocations at submit and recompute the draw arguments against them.
      lod: lod ?? null
    };
  }

  /**
   * Sets the vertex-declaration key, which participates in both binning and
   * sorting.
   */
  SetVertexDeclaration(vertexDeclaration)
  {
    this.vertexDeclaration = vertexDeclaration >>> 0;
  }

  /** Binds one vertex stream slot and its stride. */
  SetStreamSource(index, vertexBuffer, vertexStride)
  {
    this.vertexStreams[index] = vertexBuffer ?? null;
    this.stride[index] = vertexStride >>> 0;
  }

  // Carbon spells this SetInidices (a typo in the C++ API); we use the corrected
  // name since both producer and consumer are ours.

  /**
   * Binds the index buffer and its stride; Carbon spells this SetInidices, a
   * typo corrected here because both producer and consumer are ours.
   */
  SetIndices(indexBuffer, indexStride)
  {
    this.indexBuffer = indexBuffer ?? null;
    this.indexStride = indexStride >>> 0;
  }

  /**
   * Sets the primitive topology; only TRIANGLELIST batches are eligible for GDPR
   * binning.
   */
  SetTopology(topology)
  {
    this.topology = topology;
  }

  /**
   * References the per-object payload the engine binds when dispatching this
   * batch; the batch borrows it and does not own it.
   */
  SetPerObjectData(objectData)
  {
    this.objectData = objectData ?? null;
  }

  /** Records the indexed instanced draw arguments verbatim. */
  SetDrawIndexedInstanced(indexCountPerInstance, instanceCount, startIndexLocation, baseVertexLocation, startInstanceLocation)
  {
    this.indexCountPerInstance = indexCountPerInstance >>> 0;
    this.instanceCount = instanceCount >>> 0;
    this.startIndexLocation = startIndexLocation >>> 0;
    this.baseVertexLocation = baseVertexLocation >>> 0;
    this.startInstanceLocation = startInstanceLocation >>> 0;
  }

  // Non-indexed draw: reuses indexCountPerInstance for the vertex count and
  // startIndexLocation for the start vertex; baseVertexLocation is left as is.

  /**
   * Records a non-indexed instanced draw, reusing indexCountPerInstance for the
   * vertex count and startIndexLocation for the start vertex; baseVertexLocation
   * is left untouched.
   */
  SetDrawInstanced(vertexCountPerInstance, instanceCount, startVertexLocation, startInstanceLocation)
  {
    this.indexCountPerInstance = vertexCountPerInstance >>> 0;
    this.instanceCount = instanceCount >>> 0;
    this.startIndexLocation = startVertexLocation >>> 0;
    this.startInstanceLocation = startInstanceLocation >>> 0;
  }

  /**
   * Sets the batch's rendering mode; note that Commit overwrites it with the
   * accumulator's own mode.
   */
  SetRenderingMode(mode)
  {
    this.renderingMode = mode;
  }

  /**
   * Carbon's SetPickingData( pickingData ) (TriRenderBatch.cpp:169).
   * @param {number} pickingData uint32 picking value.
   */
  SetPickingData(pickingData)
  {
    this.pickingData = pickingData >>> 0;
  }

  /**
   * Carbon's SetPickingData( meshIndex, areaIndex ) (TriRenderBatch.cpp:174):
   * the mesh index shifted above the low byte of the area index. Named by the
   * parameters that replace pickingData (docs 22d1237).
   * @param {number} meshIndex
   * @param {number} areaIndex
   */
  SetPickingData__MeshArea(meshIndex, areaIndex)
  {
    this.SetPickingData((meshIndex << 8) | (areaIndex & 0xff));
  }

  // A batch is valid iff it has a shader (i.e. SetMaterial was called with a
  // material that exposed a shader-state interface). Invalid batches are dropped
  // silently at Commit time.

  /**
   * A batch is valid only once it has a shader, that is once SetMaterial
   * received a material; invalid batches are dropped silently at Commit.
   */
  IsValid()
  {
    return this.shader !== null && this.shader !== undefined;
  }

  // Carbon Tr2MeshBase.cpp:341-395 (the draw arguments inside
  // CreateGeometryBatch) and Tr2SuballocatedBuffer.cpp:212-215
  // (Allocation::GetStartIndex).
  //
  // THE ARITHMETIC LIVES HERE ONCE. Carbon replicates this expression in
  // Tr2InstancedMesh and at least eight further call sites that bypass
  // CreateGeometryBatch; that duplication is a defect this port declines to
  // inherit. Every producer calls resolveDrawArguments instead.
  //
  // A draw argument is neither wholly CPU-derivable nor wholly the engine's:
  //
  //   primCount  - pure geometry data (area primitive counts). CPU.
  //   firstIndex - pure geometry data. CPU.
  //   startIndex - firstIndex PLUS the index allocation's start index. The base
  //                is a suballocation, which only a realizing engine knows.
  //   baseVertex - the vertex allocation's offset / stride, which IS
  //                GetStartIndex() hand-inlined (Tr2MeshBase.cpp:391).
  //
  // The two bases default to ZERO when nothing has realized the geometry, and
  // zero is the CORRECT answer for an engine that gives each mesh its own
  // buffers rather than suballocating from a shared one - which is what ccpwgl
  // does and what a first WebGL implementation naturally does. A suballocating
  // engine writes its allocation into the resource and the same expression
  // yields the pooled bases. Trinity never sees a GPU handle: it asks the
  // allocation for two integers.
  //
  // Carbon gates the BATCH on lod->m_allocationsValid, because in Carbon an
  // unbuilt draw cannot exist. Here the allocations are not built yet, so an unbuilt
  // LOD is normal and the flags gate the DRAW ARGUMENTS instead: collection
  // still emits the geometry-source descriptor.
  //
  // LOD selection and the primitive-count sum are NOT here. Carbon declares
  // both beside TriGeometryRes (Resources/TriGeometryRes.h:202/:242), which
  // the runtime resource layer owns.

  /**
   * Carbon's indexed draw arguments for one mesh area of one LOD, or null when
   * the area contributes no primitives or a reversed draw has no reversed
   * indices - both of which are Carbon's "emit no batch" answers.
   *
   * `reversed` is the already-resolved winding for this draw, which Carbon
   * computes as `area->GetReversed() != reverseWinding` at the call site.
   */
  static resolveDrawArguments(lod, areaIndex, areaCount, reversed = false)
  {
    if (!lod) return null;

    // Carbon clamps both to zero before use (Tr2MeshBase.cpp:356).
    const index = Math.max(0, areaIndex | 0);
    const count = Math.max(0, areaCount | 0);

    const primitiveCount = TriGeometryRes.getPrimitiveCount(lod, index, count);

    if (!primitiveCount) return null;

    if (reversed && lod.reversedIndicesValid === false) return null;

    // Not `area.firstIndex` directly: a CMF-shaped LOD writes the area start as
    // a first TRIANGLE, and the geometry layer owns that conversion.
    const firstIndex = TriGeometryRes.getAreaFirstIndex(lod.areas?.[index]);

    // Carbon binds the FORWARD index allocation on both paths and only reads
    // the reversed allocation for the start index (Tr2MeshBase.cpp:371/375).
    // That works because both live in one pool at one stride; an engine that
    // separates them must bind the one this start index belongs to.
    const indices = reversed ? lod.reversedIndexAllocation : lod.indexAllocation;

    const startIndexLocation = reversed
      ? Tr2RenderBatch.startIndexOf(indices) + TriGeometryRes.getLodPrimitiveCount(lod) * 3 - firstIndex - primitiveCount * 3
      : Tr2RenderBatch.startIndexOf(indices) + firstIndex;

    return {
      indexCountPerInstance: primitiveCount * 3,
      instanceCount: 1,
      startIndexLocation,
      baseVertexLocation: Tr2RenderBatch.startIndexOf(lod.vertexAllocation),
      startInstanceLocation: 0
    };
  }

  /**
   * The start index of a realized suballocation, Carbon's
   * Allocation::GetStartIndex (Tr2SuballocatedBuffer.h), or zero when the
   * geometry is unrealized and holds no allocation.
   */
  static startIndexOf(allocation)
  {
    return allocation ? allocation.GetStartIndex() >>> 0 : 0;
  }
}

// Two batches can share a single state-set (one bin/GDPR group) iff all of these
// match. Note: priority, material and topology are intentionally NOT compared
// here (faithful to Carbon CanBeBinned).

/**
 * Whether two batches can share one state-set: shader, vertex declaration, index
 * stride, both vertex streams and rendering mode must match, while priority,
 * material and topology are deliberately not compared (faithful to Carbon).
 */
export function CanBeBinned(batch1, batch2)
{
  return batch1.shader === batch2.shader
    && batch1.vertexDeclaration === batch2.vertexDeclaration
    && batch1.indexStride === batch2.indexStride
    && batch1.vertexStreams[0] === batch2.vertexStreams[0]
    && batch1.vertexStreams[1] === batch2.vertexStreams[1]
    && batch1.renderingMode === batch2.renderingMode;
}

// JS comparator (negative/zero/positive) reproducing Carbon Compare's strict-weak
// ordering: priority, shader, vertexDeclaration, indexStride, stream0, stream1,
// renderingMode. Pointer identity is replaced by a stable per-reference order id.

/**
 * Strict-weak comparator reproducing Carbon's batch ordering - priority, shader,
 * vertex declaration, index stride, stream 0, stream 1, rendering mode - with
 * pointer identity replaced by stable order ids.
 */
export function CompareBatches(batch1, batch2)
{
  if (batch1.priority !== batch2.priority) return batch1.priority - batch2.priority;

  const shaderOrder = OrderOf(batch1.shader) - OrderOf(batch2.shader);
  if (shaderOrder !== 0) return shaderOrder;

  if (batch1.vertexDeclaration !== batch2.vertexDeclaration) return batch1.vertexDeclaration - batch2.vertexDeclaration;
  if (batch1.indexStride !== batch2.indexStride) return batch1.indexStride - batch2.indexStride;

  const stream0Order = OrderOf(batch1.vertexStreams[0]) - OrderOf(batch2.vertexStreams[0]);
  if (stream0Order !== 0) return stream0Order;

  const stream1Order = OrderOf(batch1.vertexStreams[1]) - OrderOf(batch2.vertexStreams[1]);
  if (stream1Order !== 0) return stream1Order;

  return batch1.renderingMode - batch2.renderingMode;
}

// Sorts a batch vector and writes each bin-run's length onto the run's leading
// batch (groupCount). Mirrors Tr2GdprBatchFullPartition. JS Array.sort is stable,
// so the "full" and "stable" partition variants are behaviourally identical here.

/**
 * Sorts a batch vector and writes each bin-run's length onto that run's leading
 * batch groupCount, so dispatch can stride one state-set over several draws.
 */
export function Tr2GdprBatchFullPartition(batches)
{
  PartitionBatchGroups(batches);
}

/**
 * Stable variant of the full partition, behaviourally identical here because JS
 * Array.sort is already stable.
 */
export function Tr2GdprBatchStableFullPartition(batches)
{
  PartitionBatchGroups(batches);
}

function PartitionBatchGroups(batches)
{
  if (batches.length === 0) return;

  batches.sort(CompareBatches);

  let first = 0;
  for (let current = 0; current < batches.length; current++)
  {
    if (!CanBeBinned(batches[first], batches[current]))
    {
      batches[first].groupCount = current - first;
      first = current;
    }
  }
  batches[first].groupCount = batches.length - first;
}

CjsSchema.decorateField(Tr2RenderBatch, "vertexDeclaration", type.uint32);
CjsSchema.decorateField(Tr2RenderBatch, "indexStride", type.uint32);
CjsSchema.decorateField(Tr2RenderBatch, "indexCountPerInstance", type.uint32);
CjsSchema.decorateField(Tr2RenderBatch, "instanceCount", type.uint32);
CjsSchema.decorateField(Tr2RenderBatch, "startIndexLocation", type.uint32);
CjsSchema.decorateField(Tr2RenderBatch, "baseVertexLocation", type.uint32);
CjsSchema.decorateField(Tr2RenderBatch, "startInstanceLocation", type.uint32);
CjsSchema.decorateField(Tr2RenderBatch, "pickingData", type.uint32);
CjsSchema.decorateField(Tr2RenderBatch, "depth", type.uint32);
CjsSchema.decorateField(Tr2RenderBatch, "priority", type.uint32);
CjsSchema.decorateField(Tr2RenderBatch, "groupCount", type.uint32);
CjsSchema.decorateField(Tr2RenderBatch, "stride", type.array("uint32"));
CjsSchema.decorateField(Tr2RenderBatch, "renderingMode", type.int32);
CjsSchema.decorateField(Tr2RenderBatch, "topology", type.int32);
CjsSchema.decorateField(Tr2RenderBatch, "material", type.rootRef("Tr2Material"));
CjsSchema.decorateMethod(Tr2RenderBatch, "SetMaterial", blue.method);
CjsSchema.decorateMethod(Tr2RenderBatch, "SetPriority", blue.method);
CjsSchema.decorateMethod(Tr2RenderBatch, "SetGeometry", blue.method);
CjsSchema.decorateMethod(Tr2RenderBatch, "SetGeometry__Allocation", blue.method, meta.renamed("SetGeometry"));
CjsSchema.decorateMethod(Tr2RenderBatch, "SetGeometry__AllocationSecondStream", blue.method, meta.renamed("SetGeometry"));
CjsSchema.decorateMethod(Tr2RenderBatch, "SetVertexDeclaration", blue.method);
CjsSchema.decorateMethod(Tr2RenderBatch, "SetStreamSource", blue.method);
CjsSchema.decorateMethod(Tr2RenderBatch, "SetIndices", blue.method, meta.renamed("SetInidices"));
CjsSchema.decorateMethod(Tr2RenderBatch, "SetTopology", blue.method);
CjsSchema.decorateMethod(Tr2RenderBatch, "SetPerObjectData", blue.method);
CjsSchema.decorateMethod(Tr2RenderBatch, "SetDrawIndexedInstanced", blue.method);
CjsSchema.decorateMethod(Tr2RenderBatch, "SetDrawInstanced", blue.method);
CjsSchema.decorateMethod(Tr2RenderBatch, "SetRenderingMode", blue.method);
CjsSchema.decorateMethod(Tr2RenderBatch, "SetPickingData", blue.method);
CjsSchema.decorateMethod(Tr2RenderBatch, "SetPickingData__MeshArea", blue.method, meta.renamed("SetPickingData"));
CjsSchema.decorateMethod(Tr2RenderBatch, "IsValid", blue.method);
CjsSchema.blue.define(Tr2RenderBatch, { className: "Tr2RenderBatch" });
