// Source: trinity/trinity/Resources/TriGeometryRes.h
// Schema: format-carbon resources/MeshDecalData.json; maintained by the runtime resource layer.
//
// Declared as data rather than with decorators, so the resource tree loads from
// source without a transform. A decorated file anywhere under this folder forces
// every test importing the geometry barrel onto `npm/dist`, which is built code
// that can lag the source it is being used to check.
import { CjsSchema, type } from "#schema";
import { mat4 } from "#math";

/** Data record mirroring Carbon's per-mesh decal block: an index-buffer allocation reference, a LOD mask, and the per-LOD decal ranges. */
export class MeshDecalData
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

CjsSchema.decorateField(MeshDecalData, "inverseDecalMatrix", type.mat4);
CjsSchema.decorateField(MeshDecalData, "indexBuffer", type.rawStruct("Tr2SuballocatedBuffer::Allocation"));
CjsSchema.decorateField(MeshDecalData, "lodMask", type.uint32);
CjsSchema.decorateField(MeshDecalData, "lods", type.list("MeshDecalLodData"));
CjsSchema.meta.carbon("MeshDecalData")(MeshDecalData);
