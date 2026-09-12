// Source: trinity/trinity/Eve/SpaceObject/Attachments/EveSpaceObjectDecal.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema eve/attachment/decal/DecalMeshCache.json.).
import { type } from "#schema";
import { CjsModel } from "#model";
import { DecalMeshCacheMeshBuffers } from "./DecalMeshCacheMeshBuffers.js";

/** Stores the per-LOD clipped vertex and index buffers generated for one projected decal. */
@type.define({ className: "DecalMeshCache", family: "eve/attachment/decal" })
export class DecalMeshCache extends CjsModel
{

  /** buffers (std::vector<MeshBuffers>) */
  @type.list("MeshBuffers")
  buffers = [];

  static MeshBuffers = DecalMeshCacheMeshBuffers;

}
