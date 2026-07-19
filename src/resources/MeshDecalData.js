// Source: trinity/trinity/Resources/TriGeometryRes.h
// Schema: format-carbon resources/MeshDecalData.json; maintained by runtime-resource.
import { type } from "@carbonenginejs/core-types/schema";
import { CjsModel } from "@carbonenginejs/core-types/model";

/** MeshDecalData (resources) - maintained from schema shapeHash edd09cef.... */
@type.define({ className: "MeshDecalData", family: "resources" })
export class MeshDecalData extends CjsModel
{

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
