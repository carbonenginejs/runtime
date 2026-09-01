// Interleaved GPU-ready bytes for one LOD of a decoded mesh.
//
// A decoded geometry payload keeps its channels DEINTERLEAVED - `position`,
// `normal`, `texcoord0` as separate flat arrays - and carries a declaration
// describing the interleaved form it would be written in. A GPU wants that
// interleaved form. The format writer's packer already produces exactly it, so
// this reuses the packer rather than repeating the layout arithmetic, and adds
// only what a GPU needs and a file does not: a stride a device will accept.
//
// This is the geometry layer's half of realization. It produces BYTES and a
// stride; it names no format, no attribute and no buffer usage, because those
// are the backend's and the two backends differ. See
// /docs/contracts/geometry-vertex-binding.md.
import { packVertexBuffer, packIndexBuffer } from "../formats/cmf/core/pack.js";


/** WebGPU's `arrayStride` alignment, which WebGL2 also satisfies trivially. */
const STRIDE_ALIGNMENT = 4;


/**
 * Rounds a packed vertex buffer up to an aligned stride.
 *
 * A declaration's extent is a TIGHT max-offset sum with no rounding, so a decl
 * of three `UInt8Norm` components packs at stride 3 and no device will take it.
 * Element offsets are unchanged by the widening - only the gap after the last
 * component grows - so the declaration stays correct against the result.
 *
 * @param {{bytes: Uint8Array, stride: number, count: number}} packed
 * @returns {{bytes: Uint8Array, stride: number, count: number}} The input when already aligned.
 */
function AlignStride(packed)
{
  const remainder = packed.stride % STRIDE_ALIGNMENT;

  if (packed.stride > 0 && remainder === 0) return packed;

  const stride = packed.stride + (STRIDE_ALIGNMENT - remainder);
  const bytes = new Uint8Array(stride * packed.count);

  for (let i = 0; i < packed.count; i++)
  {
    bytes.set(packed.bytes.subarray(i * packed.stride, (i + 1) * packed.stride), i * stride);
  }

  return { bytes, stride, count: packed.count };
}


/**
 * Packs one LOD of a decoded mesh into interleaved vertex bytes and an index
 * buffer.
 *
 * Channels and index groups are taken from the LOD when it carries its own and
 * from the mesh otherwise, because a single-LOD payload keeps them only on the
 * mesh. The declaration is always the mesh's: a LOD varies which triangles it
 * draws, not what a vertex is.
 *
 * @param {object} mesh Decoded mesh carrying `decl` and channels.
 * @param {number} [lodIndex] Which LOD to pack.
 * @returns {{decl: Array<object>, vertex: object, index: object|null}}
 * @throws {Error} When the mesh has no declaration to pack against.
 */
export function PackLodGeometry(mesh, lodIndex = 0)
{
  const decl = mesh?.decl ?? mesh?.vertexElements;

  if (!decl?.length)
  {
    throw new Error("Cannot pack geometry: the mesh carries no vertex declaration");
  }

  const lod = mesh?.lods?.[lodIndex] ?? null;
  const channels = lod?.vertex ?? mesh?.vertex ?? {};
  const groups = lod?.indices ?? mesh?.indices ?? null;

  const vertex = AlignStride(packVertexBuffer(decl, channels));
  const packedIndices = groups ? packIndexBuffer(groups) : null;

  const index = packedIndices && packedIndices.count > 0
    ? { bytes: packedIndices.bytes, format: packedIndices.stride === 4 ? "uint32" : "uint16", count: packedIndices.count }
    : null;

  return { decl, vertex, index };
}
