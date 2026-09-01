// Source: trinity/TriRenderBatch.h
//   trinity/TriRenderBatch.cpp
//
// GPU-free CPU render-batch descriptor plus the binning/sort helpers. A batch
// holds opaque references to material/shader/geometry and plain draw arguments;
// it never touches a device. The engine adapter reads a finalized accumulator's
// batches and issues the actual draws (Carbon's Tr2RenderContextBase::RenderBatches*
// dispatch family stays engine-side and is intentionally NOT ported here).
import { RenderingMode } from "#consts/graphics";
import { D3dPrimitiveTopology } from "#consts/d3d";
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

// A contiguous (startIndex, count) block of mesh groups. Mirrors Carbon
// TriRenderBatchAreaBlock; used by the shadow/overlay area-block paths.

/**
 * A contiguous (startIndex, count) run of mesh groups, as consumed by the shadow
 * and overlay area-block paths.
 */
export class TriRenderBatchAreaBlock
{
  /**
   * Creates a block covering count groups from startIndex; both are coerced to
   * unsigned integers.
   */
  constructor(startIndex = 0, count = 0)
  {
    this.startIndex = startIndex >>> 0;
    this.count = count >>> 0;
  }

  // Compacts a set of possibly overlapping/adjacent blocks into the minimal set
  // of contiguous runs, in place. Mirrors TriRenderBatchAreaBlock::Optimize.

  /**
   * Compacts a vector of possibly overlapping or adjacent blocks into the
   * minimal set of contiguous runs, rewriting the caller's array in place and
   * returning it.
   */
  static Optimize(areaBlockVector)
  {
    const indices = new Set();
    for (const block of areaBlockVector)
    {
      for (let i = 0; i < block.count; i++) indices.add(block.startIndex + i);
    }

    const sorted = Array.from(indices).sort((a, b) => a - b);
    areaBlockVector.length = 0;

    let start = -1;
    let run = -1;
    for (const value of sorted)
    {
      if (run >= 0 && value === run + 1)
      {
        run = value;
        continue;
      }
      if (run >= 0) areaBlockVector.push(new TriRenderBatchAreaBlock(start, run - start + 1));
      start = value;
      run = value;
    }
    if (run >= 0) areaBlockVector.push(new TriRenderBatchAreaBlock(start, run - start + 1));
    return areaBlockVector;
  }
}

// A shared-material list of area blocks (shadow/overlay path). Mirrors
// TriRenderBatchAreaBlocksWithSharedMaterial.

/**
 * Groups the area blocks that draw with one shared shader material on the shadow
 * and overlay path.
 */
export class TriRenderBatchAreaBlocksWithSharedMaterial extends TriRenderBatchAreaBlock
{
  /** Starts with no shared material and an empty block vector. */
  constructor()
  {
    super();
    this.shaderMaterial = null;
    this.areaBlockVector = [];
  }

  /** Compacts the owned block vector into minimal contiguous runs. */
  Optimize()
  {
    TriRenderBatchAreaBlock.Optimize(this.areaBlockVector);
  }

  /** Empties the block vector while keeping the shared material bound. */
  Clear()
  {
    this.areaBlockVector.length = 0;
  }
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
  /**
   * Creates an empty batch with no material or geometry, RM_ANY rendering mode,
   * triangle-list topology and a group count of 1.
   */
  constructor()
  {
    this.material = null;
    this.shader = null;

    this.vertexDeclaration = 0;
    this.vertexStreams = [ null, null ];
    this.stride = [ 0, 0 ];
    this.indexBuffer = null;
    this.indexStride = 0;

    // GPU-free adaptation: Carbon's Tr2MeshBase::CreateGeometryBatch bakes
    // realized buffer allocations and computed draw arguments into the batch
    // during collection. Trinity instead records a geometry-resource and
    // area-range descriptor; the engine resolves it to realized allocations
    // and final draw arguments at dispatch. See the render-batch contract in
    // docs/architecture.md.
    this.geometrySource = null;

    this.objectData = null;
    this.renderingMode = RenderingMode.RM_ANY;
    this.topology = D3dPrimitiveTopology.TRIANGLELIST;

    this.indexCountPerInstance = 0;
    this.instanceCount = 0;
    this.startIndexLocation = 0;
    this.baseVertexLocation = 0;
    this.startInstanceLocation = 0;

    this.pickingData = 0;
    this.depth = 0;
    this.priority = 0;

    // Default 1; the effect-sort partition rewrites this on the first batch of
    // each bin-run to the run length so dispatch can stride one state-set over
    // several draws. Meaningless on non-leading batches of a run.
    this.groupCount = 1;
  }

  // Sets material and derives the shader key from it. In the realized engine the
  // shader is the material's shader-state interface; in GPU-free collection no
  // shader is realized yet, so the material (effect) itself stands in as the
  // shader key. Either way the shader is both the validity key (see IsValid) and
  // the primary bin/sort key, so effect-equal batches still group together.

  /**
   * Sets the material and derives the shader key from it, falling back to the
   * material itself when no shader-state interface is realized yet; that key is
   * both the validity test and the primary bin/sort key, so effect-equal batches
   * still group together.
   */
  SetMaterial(material)
  {
    this.material = material ?? null;
    this.shader = material?.GetShaderStateInterface?.() ?? material ?? null;
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

  // Carbon overload taking suballocated-buffer allocations (the mesh path).

  /**
   * Binds geometry from suballocated buffer allocations, taking each
   * allocation's buffer and stride (Carbon's mesh path).
   */
  SetGeometryFromAllocations(vertexDeclaration, vertexAllocation, indexAllocation)
  {
    this.SetGeometry(
      vertexDeclaration,
      vertexAllocation?.GetBuffer?.() ?? vertexAllocation ?? null,
      vertexAllocation?.GetStride?.() ?? 0,
      indexAllocation?.GetBuffer?.() ?? indexAllocation ?? null,
      indexAllocation?.GetStride?.() ?? 0
    );
  }

  // Carbon two-stream allocation overload.

  /**
   * Binds a two-stream allocation set; the second allocation becomes vertex
   * stream 1.
   */
  SetGeometryFromAllocations2(vertexDeclaration, vertexAllocation1, vertexAllocation2, indexAllocation)
  {
    this.SetGeometryFromAllocations(vertexDeclaration, vertexAllocation1, indexAllocation);
    this.vertexStreams[1] = vertexAllocation2?.GetBuffer?.() ?? vertexAllocation2 ?? null;
    this.stride[1] = vertexAllocation2?.GetStride?.() ?? 0;
  }

  // GPU-free geometry binding: records the resource + mesh/area range for the
  // engine to resolve into realized buffers and draw arguments at dispatch.

  /**
   * GPU-free geometry binding: records the geometry resource plus the mesh and
   * area range for the engine to resolve into realized buffers and draw
   * arguments at dispatch.
   */
  SetGeometrySource(geometry, meshIndex, areaIndex, count, reversed)
  {
    this.geometrySource = {
      geometry: geometry ?? null,
      meshIndex: meshIndex >>> 0,
      areaIndex: areaIndex | 0,
      count: count | 0,
      reversed: !!reversed
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

  // Carbon overloads SetPickingData(data) and SetPickingData(meshIndex, areaIndex).

  /**
   * Stores picking data either as a raw value or, when a second argument is
   * given, as the mesh index shifted above the low byte of the area index.
   */
  SetPickingData(a, b)
  {
    this.pickingData = (b === undefined) ? (a >>> 0) : (((a << 8) | (b & 0xff)) >>> 0);
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
  // unrealized draw cannot exist. This runtime is GPU-free, so an unrealized
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
   * The start index of a realized suballocation, or zero when the geometry is
   * unrealized or the engine allocates per mesh rather than from a shared
   * buffer; Carbon reads Allocation::GetStartIndex.
   */
  static startIndexOf(allocation)
  {
    if (!allocation) return 0;

    if (typeof allocation.GetStartIndex === "function")
    {
      return allocation.GetStartIndex() >>> 0;
    }

    // GetStartIndex() IS offset / stride; Carbon hand-inlines exactly this for
    // the base vertex (Tr2MeshBase.cpp:391).
    const stride = allocation.GetStride?.() ?? allocation.stride ?? 0;

    if (!stride) return 0;

    const offset = allocation.GetOffset?.() ?? allocation.offset ?? 0;

    return (offset / stride) >>> 0;
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
