// Source: trinity/trinity/Eve/SpaceObject/Attachments/EveSpaceObjectDecal.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema eve/attachment/decal/DecalMeshCache.json.).
import { type, blue } from "#schema";
import { DecalMeshCacheMeshBuffers } from "./DecalMeshCacheMeshBuffers.js";

/** Stores the per-LOD clipped vertex and index buffers generated for one projected decal. */
@blue.define("DecalMeshCache")
export class DecalMeshCache
{

  /** buffers (std::vector<MeshBuffers>) */
  @type.list("MeshBuffers")
  buffers = [];

  static MeshBuffers = DecalMeshCacheMeshBuffers;

}
