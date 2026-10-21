// Source: trinity/trinity/Resources/TriGeometryRes.h
// Schema: format-carbon resources/MeshDecalLodData.json; maintained by the runtime resource layer.
import { CjsSchema, type } from "#schema";

/** Data record mirroring Carbon's per-LOD decal range, holding the start index and primitive count for one decal LOD. */
export class MeshDecalLodData
{

  /** m_startIndex (uint32_t) */
  startIndex = 0;

  /** m_primitiveCount (uint32_t) */
  primitiveCount = 0;

}

CjsSchema.decorateField(MeshDecalLodData, "startIndex", type.uint32);
CjsSchema.decorateField(MeshDecalLodData, "primitiveCount", type.uint32);
CjsSchema.meta.carbon("MeshDecalLodData")(MeshDecalLodData);
