// Source: trinity/trinity/Resources/TriGeometryRes.cpp:33-38, :2019-2140
//   trinity/trinity/Tr2MeshBase.cpp:341-394
//
// Carbon's `TriGeometryRes::CreateLodFromCMFMesh`: a LOD's vertex bytes, its
// indices, and a REVERSED copy of the indices go into the process-wide shared
// geometry buffer, and the LOD remembers its allocations
// (`lod->m_vertexAllocation`, `m_indexAllocation`, `m_reversedIndexAllocation`,
// `m_allocationsValid`). `CreateGeometryBatch` then binds the allocations onto
// the batch and folds their offsets into the draw arguments.
//
// WHERE OURS DIFFERS. Carbon does this at load, inside the resource, through
// the main-thread context. Our geometry resource lives in a layer that cannot
// reach a context, so the allocations are made at the FIRST SUBMIT of a batch
// that needs them, through the submitting context - `Tr2RenderContext.SubmitGeometry`
// calls `RealizeBatchGeometry`. The LOD object is the payload's own, and the
// fields set on it are the ones `Tr2RenderBatch.resolveDrawArguments` already
// reads.
//
// The vertex bytes come from `PackLodGeometry`, which interleaves the payload's
// channels by the declaration (Carbon uploads the file's interleaved view
// verbatim; our payload is deinterleaved, so the packer is the inverse of the
// reader) and re-strides to a multiple of four.
import { Tr2EffectStateManager } from "../../shader/Tr2EffectStateManager.js";
import { CarbonVertexElements } from "../vertex/vertexUsage.js";
import { PackLodGeometry, PackLodIndices } from "#resource/geometry/pack";
import { TriGeometryRes } from "#resource/geometry";
import * as CcpLog from "../../../global/logging/ccpLog.js";
import { Tr2GpuUsage } from "#consts/render-context";
import { Tr2SuballocatedBuffer } from "../device/Tr2SuballocatedBuffer/index.js";
import { TriDevice } from "../device/TriDevice.js";
import { Tr2RenderBatch } from "../batch/TriRenderBatch/index.js";


/**
 * Carbon's `g_sharedBuffer`, one per backend rather than one per process:
 * a buffer created through the stub before the device arrived must not be the
 * one a WebGPU frame binds, and a process can hold both.
 */
const sharedBuffers = new WeakMap();

/** Carbon's usage for the shared buffer (`TriGeometryRes.cpp:33-36`, the non-DX11 form). */
const SHARED_BUFFER_USAGE = Tr2GpuUsage.VERTEX_BUFFER | Tr2GpuUsage.INDEX_BUFFER | Tr2GpuUsage.SHADER_RESOURCE;


/**
 * Releases an existing backend allocator at final context shutdown without creating one.
 * Adapted: explicit context lifetime replaces Carbon's process-global buffer destruction.
 * @param {object} renderContext The context whose backend is shutting down.
 * @returns {void}
 */
export function ReleaseSharedGeometryBuffer(renderContext)
{
  const key = renderContext.GetRenderContextAL();
  const buffer = sharedBuffers.get(key);
  if (!buffer) return;
  buffer.ReleaseResources();
  TriDevice.UnregisterResource(buffer);
  sharedBuffers.delete(key);
}

/**
 * The shared geometry buffer for the context's backend.
 * @param {object} renderContext The submitting context.
 * @returns {Tr2SuballocatedBuffer} Its shared allocator.
 */
export function SharedGeometryBuffer(renderContext)
{
  const key = renderContext.GetRenderContextAL();
  let buffer = sharedBuffers.get(key);

  if (!buffer)
  {
    buffer = new Tr2SuballocatedBuffer("TriGeometryRes shared vertex/index buffer", SHARED_BUFFER_USAGE);
    sharedBuffers.set(key, buffer);
  }

  return buffer;
}


/**
 * Reverses an index buffer's bytes, Carbon's `std::reverse` over u16 or u32
 * (`TriGeometryRes.cpp:2055-2076`).
 */
function ReversedIndices(bytes, format)
{
  const Typed = format === "uint32" ? Uint32Array : Uint16Array;
  const source = new Typed(bytes.buffer, bytes.byteOffset, bytes.byteLength / Typed.BYTES_PER_ELEMENT);
  const reversed = new Typed(source.length);

  for (let index = 0; index < source.length; index += 1) reversed[index] = source[source.length - 1 - index];

  return new Uint8Array(reversed.buffer);
}


/**
 * Makes a LOD's allocations in the shared buffer, once.
 * Adapted: the lazy JS submit path explicitly unwinds partial allocations on
 * failure or throw; Carbon releases failed index allocations before returning.
 *
 * @param {object} geometry The `TriGeometryRes`.
 * @param {number} meshIndex The mesh.
 * @param {object} lod The LOD object the batch's area belongs to.
 * @param {object} renderContext The `Tr2RenderContext` to allocate through.
 * @returns {boolean} Whether the LOD's allocations are valid afterwards.
 */
export function CreateLodAllocations(geometry, meshIndex, lod, renderContext)
{
  if (!lod) return false;
  if (lod.allocationsValid) return true;

  const mesh = geometry ? geometry.GetPayload()?.meshes?.[meshIndex] : null;

  if (!mesh) return false;

  const lodIndex = Array.isArray(mesh.lods) ? Math.max(0, mesh.lods.indexOf(lod)) : 0;
  let packed;

  try
  {
    packed = PackLodGeometry(mesh, lodIndex);
  }
  catch
  {
    return false;
  }

  const shared = SharedGeometryBuffer(renderContext);
  const vertices = shared.Allocate(packed.vertex.stride, packed.vertex.count, packed.vertex.bytes, renderContext);

  if (!vertices) return false;

  lod.vertexAllocation = vertices;
  lod.indexAllocation = null;
  lod.reversedIndexAllocation = null;
  lod.reversedIndicesValid = false;
  try
  {
    if (packed.index)
    {
      const stride = packed.index.format === "uint32" ? 4 : 2;
      lod.indexAllocation = shared.Allocate(stride, packed.index.count, packed.index.bytes, renderContext);
      if (!lod.indexAllocation) return false;

      lod.reversedIndexAllocation = shared.Allocate(stride, packed.index.count, ReversedIndices(packed.index.bytes, packed.index.format), renderContext);
      if (!lod.reversedIndexAllocation) return false;
      lod.reversedIndicesValid = true;
    }

    // Carbon stores these on the mesh/LOD at resource preparation. Geometry
    // providers use the same packed layout as ordinary mesh draws.
    mesh.vertexDeclarationHandle = Tr2EffectStateManager.getVertexDeclarationHandle(CarbonVertexElements(packed.decl));
    mesh.bytesPerVertex = packed.vertex.stride;
    lod.vertexCount = packed.vertex.count;
    lod.allocationsValid = true;

    // Memory use is only approximate, as a hint for the resource cache: the
    // vertices, the indices and their reversed copy (TriGeometryRes.cpp:2143-2146).
    const indexBytes = packed.index ? packed.index.bytes.byteLength : 0;
    geometry._memoryUse += packed.vertex.bytes.byteLength + indexBytes + indexBytes;
    return true;
  }
  finally
  {
    // Carbon frees earlier allocations when either index allocation fails
    // (TriGeometryRes.cpp:2048-2053, 2069-2074). A JS upload can also throw.
    if (!lod.allocationsValid)
    {
      for (const field of [ "vertexAllocation", "indexAllocation", "reversedIndexAllocation" ])
      {
        const allocation = lod[field];
        if (allocation?._parent) allocation._parent.Free(allocation);
        lod[field] = null;
      }
      lod.reversedIndicesValid = false;
    }
  }
}


/**
 * Expands a triangle list into its edge list: each triangle (a, b, c) becomes
 * the three lines a-b, b-c, c-a, so index i of the triangle list starts at
 * index 2i of the edge list.
 */
function EdgeIndices(bytes, format)
{
  const Typed = format === "uint32" ? Uint32Array : Uint16Array;
  const source = new Typed(bytes.buffer, bytes.byteOffset, bytes.byteLength / Typed.BYTES_PER_ELEMENT);
  const triangleIndexCount = source.length - source.length % 3;
  const edges = new Typed(triangleIndexCount * 2);

  for (let index = 0; index < triangleIndexCount; index += 3)
  {
    const a = source[index], b = source[index + 1], c = source[index + 2];
    const out = index * 2;
    edges[out] = a;
    edges[out + 1] = b;
    edges[out + 2] = b;
    edges[out + 3] = c;
    edges[out + 4] = c;
    edges[out + 5] = a;
  }

  return new Uint8Array(edges.buffer);
}

/** LODs already reported as having no CPU indices to build edges from. */
const reportedWithoutIndices = new WeakSet();

/**
 * Makes a LOD's wireframe edge-index allocation in the shared buffer, once,
 * on its first wireframe draw. ReleasePayload frees it with the LOD's other
 * allocations.
 *
 * Ours: Carbon draws wireframe through the fill-mode render-state override
 * (Tr2EffectStateManager.cpp:801-812). Neither browser backend has a fill
 * mode, so wireframe is drawn as a line list over this edge buffer instead
 * (operator ruling, route (a)); see Tr2EffectStateManager's wireframe note.
 *
 * @param {object} geometry The `TriGeometryRes`.
 * @param {number} meshIndex The mesh.
 * @param {object} lod The LOD the batch's area belongs to.
 * @param {object} renderContext The `Tr2RenderContext` to allocate through.
 * @returns {boolean} Whether the LOD has an edge allocation afterwards.
 */
export function CreateLodWireframeIndices(geometry, meshIndex, lod, renderContext)
{
  if (lod.wireframeIndexAllocation) return true;

  const mesh = geometry.GetPayload()?.meshes?.[meshIndex];
  const lodIndex = mesh && Array.isArray(mesh.lods) ? Math.max(0, mesh.lods.indexOf(lod)) : 0;
  const indices = mesh ? PackLodIndices(mesh, lodIndex) : null;

  if (!indices)
  {
    if (!reportedWithoutIndices.has(lod))
    {
      reportedWithoutIndices.add(lod);
      CcpLog.CCP_LOGWARN(`Wireframe: mesh ${meshIndex} has no CPU indices to build edges from; drawn solid`);
    }
    return false;
  }

  const stride = indices.format === "uint32" ? 4 : 2;
  const edges = EdgeIndices(indices.bytes, indices.format);
  const allocation = SharedGeometryBuffer(renderContext).Allocate(stride, edges.byteLength / stride, edges, renderContext);

  if (!allocation) return false;

  lod.wireframeIndexAllocation = allocation;
  geometry._memoryUse += edges.byteLength;
  return true;
}

/**
 * The line-list draw that shows a realized geometry batch as wireframe: the
 * batch's area range (start, count) in the edge buffer is (start * 2,
 * count * 2). Winding does not matter to edges, so a reversed batch draws the
 * forward range.
 *
 * @param {object} batch A realized `Tr2RenderBatch` whose `geometrySource` is set.
 * @param {object} renderContext The `Tr2RenderContext` submitting it.
 * @returns {{indexBuffer: object, indexStride: number, indexCountPerInstance: number, startIndexLocation: number}|null}
 *   Null when the LOD has no edges or the area no primitives.
 */
export function ResolveWireframeDraw(batch, renderContext)
{
  const source = batch.geometrySource;
  const lod = source.lod ?? source.geometry.GetMeshLod__LodIndex(source.meshIndex, 0);

  if (!lod || !CreateLodWireframeIndices(source.geometry, source.meshIndex, lod, renderContext)) return null;

  const index = Math.max(0, source.areaIndex | 0);
  const count = Math.max(0, source.count | 0);
  const primitiveCount = TriGeometryRes.getPrimitiveCount(lod, index, count);

  if (!primitiveCount) return null;

  const firstIndex = TriGeometryRes.getAreaFirstIndex(lod.areas?.[index]);
  const allocation = lod.wireframeIndexAllocation;

  return {
    indexBuffer: allocation.GetBuffer(),
    indexStride: allocation.GetStride(),
    indexCountPerInstance: primitiveCount * 3 * 2,
    startIndexLocation: allocation.GetStartIndex() + firstIndex * 2
  };
}


/**
 * Gives a descriptor-carrying batch its buffers and draw arguments.
 *
 * This is the second half of Carbon's `CreateGeometryBatch`
 * (`Tr2MeshBase.cpp:372-392`): `SetGeometry` from the LOD's allocations, then
 * the draw arguments with the allocations' start indices folded in. An area
 * with no primitives or no valid index range is refused, as Carbon's invalid
 * batch is.
 *
 * @param {object} batch A `Tr2RenderBatch` whose `geometrySource` is set.
 * @param {object} renderContext The `Tr2RenderContext` submitting it.
 * @returns {boolean} Whether the batch now carries buffers and a draw.
 */
export function RealizeBatchGeometry(batch, renderContext)
{
  const source = batch.geometrySource;

  if (!source || !source.geometry) return false;

  const lod = source.lod ?? source.geometry.GetMeshLod__LodIndex(source.meshIndex, 0);

  if (!CreateLodAllocations(source.geometry, source.meshIndex, lod, renderContext)) return false;

  const draw = Tr2RenderBatch.resolveDrawArguments(lod, source.areaIndex, source.count, source.reversed);

  // No primitives, or no valid index range: Carbon's CreateGeometryBatch
  // returns an invalid batch (Tr2MeshBase.cpp:356-366), so nothing is drawn.
  // Checked before the streams are set, so a resubmit asks again rather than
  // finding streams and drawing zero.
  if (!draw) return false;

  batch.SetGeometry__Allocation(batch.vertexDeclaration, lod.vertexAllocation, lod.indexAllocation);

  batch.SetDrawIndexedInstanced(
    draw.indexCountPerInstance,
    draw.instanceCount,
    draw.startIndexLocation,
    draw.baseVertexLocation,
    draw.startInstanceLocation
  );

  return true;
}
