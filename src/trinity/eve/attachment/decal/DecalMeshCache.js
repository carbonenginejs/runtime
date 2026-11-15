import { meta } from "#schema";
// Source: trinity/trinity/Eve/SpaceObject/Attachments/EveSpaceObjectDecal.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema eve/attachment/decal/DecalMeshCache.json.).
import { type } from "#schema";
import { DecalMeshCacheMeshBuffers } from "./DecalMeshCacheMeshBuffers.js";

/** Stores the per-LOD clipped vertex and index buffers generated for one projected decal. */
@meta.carbon("DecalMeshCache")
export class DecalMeshCache
{

  /** buffers (std::vector<MeshBuffers>) */
  @type.object.embed.array("DecalMeshCache::MeshBuffers")
  buffers = [];

  static MeshBuffers = DecalMeshCacheMeshBuffers;

}
