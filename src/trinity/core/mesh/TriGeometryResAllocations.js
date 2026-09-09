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
import { PackLodGeometry } from "#resource/geometry/pack";
import { Tr2GpuUsage } from "#consts/render-context";
import { Tr2SuballocatedBuffer } from "../device/Tr2SuballocatedBuffer.js";
import { Tr2RenderBatch } from "../batch/Tr2RenderBatch.js";


/**
 * Carbon's `g_sharedBuffer`, one per backend rather than one per process:
 * a buffer created through the stub before the device arrived must not be the
 * one a WebGPU frame binds, and a process can hold both.
 */
const sharedBuffers = new WeakMap();

/** Carbon's usage for the shared buffer (`TriGeometryRes.cpp:33-36`, the non-DX11 form). */
const SHARED_BUFFER_USAGE = Tr2GpuUsage.VERTEX_BUFFER | Tr2GpuUsage.INDEX_BUFFER | Tr2GpuUsage.SHADER_RESOURCE;


/**
 * The shared geometry buffer for the context's backend.
 *
 * @param {object} renderContext A `Tr2RenderContext`.
 * @returns {Tr2SuballocatedBuffer} The buffer.
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

  if (packed.index)
  {
    const stride = packed.index.format === "uint32" ? 4 : 2;

    lod.indexAllocation = shared.Allocate(stride, packed.index.count, packed.index.bytes, renderContext);
    lod.reversedIndexAllocation = shared.Allocate(stride, packed.index.count, ReversedIndices(packed.index.bytes, packed.index.format), renderContext);
    lod.reversedIndicesValid = lod.reversedIndexAllocation !== null;

    if (!lod.indexAllocation) return false;
  }
  else
  {
    lod.indexAllocation = null;
    lod.reversedIndexAllocation = null;
    lod.reversedIndicesValid = false;
  }

  // Carbon sets `m_primitiveCount` when it reads the mesh; resolveDrawArguments
  // reads it through `getLodPrimitiveCount`, which falls back to the indices.
  lod.allocationsValid = true;

  return true;
}


/**
 * Gives a descriptor-carrying batch its buffers and draw arguments.
 *
 * This is the second half of Carbon's `CreateGeometryBatch`
 * (`Tr2MeshBase.cpp:372-392`): `SetGeometry` from the LOD's allocations, then
 * the draw arguments with the allocations' start indices folded in.
 *
 * @param {object} batch A `Tr2RenderBatch` whose `geometrySource` is set.
 * @param {object} renderContext The `Tr2RenderContext` submitting it.
 * @returns {boolean} Whether the batch now carries buffers.
 */
export function RealizeBatchGeometry(batch, renderContext)
{
  const source = batch.geometrySource;

  if (!source || !source.geometry) return false;

  const lod = source.lod ?? source.geometry.GetMeshLodByIndex(source.meshIndex, 0);

  if (!CreateLodAllocations(source.geometry, source.meshIndex, lod, renderContext)) return false;

  batch.SetGeometryFromAllocations(batch.vertexDeclaration, lod.vertexAllocation, lod.indexAllocation);

  const draw = Tr2RenderBatch.resolveDrawArguments(lod, source.areaIndex, source.count, source.reversed);

  if (draw)
  {
    batch.SetDrawIndexedInstanced(
      draw.indexCountPerInstance,
      draw.instanceCount,
      draw.startIndexLocation,
      draw.baseVertexLocation,
      draw.startInstanceLocation
    );
  }

  return true;
}
