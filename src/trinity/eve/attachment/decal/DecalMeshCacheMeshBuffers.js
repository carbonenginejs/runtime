// Source: trinity/trinity/Eve/SpaceObject/Attachments/EveSpaceObjectDecal.h
//   struct MeshBuffers, nested in struct DecalMeshCache; flattened for JS.

/**
 * DecalMeshCache.MeshBuffers - one LOD's clipped decal buffers. The generator
 * had flattened these two members onto DecalMeshCache itself; corrected at
 * promotion to Carbon's nested struct shape.
 */
export class DecalMeshCacheMeshBuffers
{

  /** vertexBuffer (std::unique_ptr<uint8_t[]>) */
  vertexBuffer = null;

  /** indexBuffer (std::unique_ptr<uint8_t[]>) */
  indexBuffer = null;

}
