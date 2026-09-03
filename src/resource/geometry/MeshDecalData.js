// Source: trinity/trinity/Resources/TriGeometryRes.h
// Schema: format-carbon resources/MeshDecalData.json; maintained by the runtime resource layer.
import { type } from "#schema";
import { CjsModel } from "#model";
import { mat4 } from "#math";

/** MeshDecalData (resources) - maintained from schema shapeHash edd09cef.... */
@type.define({ className: "MeshDecalData", family: "resources" })
export class MeshDecalData extends CjsModel
{

  /**
   * m_inverseDecalMatrix (Matrix) - Carbon annotates it "used as a key".
   *
   * Two decals occupying the same volume select the same hull triangles, so
   * the built geometry is cached on the mesh and looked up by this matrix
   * (EveSpaceObjectDecal.cpp:620-631, 848-856). Without it the cache cannot be
   * consulted and every decal on a hull rebuilds - eleven times on a frigate.
   */
  @type.mat4
  inverseDecalMatrix = mat4.create();

  /** m_indexBuffer (Tr2SuballocatedBuffer::Allocation) */
  @type.rawStruct("Tr2SuballocatedBuffer::Allocation")
  indexBuffer = null;

  /** m_lodMask (uint32_t) */
  @type.uint32
  lodMask = 0;

  /** m_lods (std::vector<MeshDecalLodData>) */
  @type.list("MeshDecalLodData")
  lods = [];

}
