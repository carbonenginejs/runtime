// Source: trinity/trinity/Resources/TriGeometryRes.h
// Schema: format-carbon resources/MeshDecalData.json; maintained by the runtime resource layer.
//
// Declared as data rather than with decorators, so the resource tree loads from
// source without a transform. A decorated file anywhere under this folder forces
// every test importing the geometry barrel onto `npm/dist`, which is built code
// that can lag the source it is being used to check.
import { CjsSchema, type } from "#schema";
import { CjsModel } from "#model";
import { mat4 } from "#math";

/** MeshDecalData (resources) - maintained from schema shapeHash edd09cef.... */
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
  inverseDecalMatrix = mat4.create();

  /** m_indexBuffer (Tr2SuballocatedBuffer::Allocation) */
  indexBuffer = null;

  /** m_lodMask (uint32_t) */
  lodMask = 0;

  /** m_lods (std::vector<MeshDecalLodData>) */
  lods = [];

}

CjsSchema.define(MeshDecalData, {
  className: "MeshDecalData",
  family: "resources",
  fields: {
    inverseDecalMatrix: type.mat4,
    indexBuffer: type.rawStruct("Tr2SuballocatedBuffer::Allocation"),
    lodMask: type.uint32,
    lods: type.list("MeshDecalLodData")
  }
});
