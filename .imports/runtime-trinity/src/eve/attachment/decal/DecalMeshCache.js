// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Eve/SpaceObject/Attachments/EveSpaceObjectDecal.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema eve/attachment/decal/DecalMeshCache.json.).
import { type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

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

/** DecalMeshCache (eve/attachment/decal) - generated from schema shapeHash 1a839484.... */
@type.define({ className: "DecalMeshCache", family: "eve/attachment/decal" })
export class DecalMeshCache extends CjsModel
{

  /** buffers (std::vector<MeshBuffers>) */
  @type.list("MeshBuffers")
  buffers = [];

  static MeshBuffers = DecalMeshCacheMeshBuffers;

}
