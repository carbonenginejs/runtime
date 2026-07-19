// Source: trinity/trinity/Resources/TriGeometryRes.h
// Schema: format-carbon resources/MeshDecalLodData.json; maintained by runtime-resource.
import { type } from "@carbonenginejs/core-types/schema";
import { CjsModel } from "@carbonenginejs/core-types/model";

/** MeshDecalLodData (resources) - maintained from schema shapeHash 932b2966.... */
@type.define({ className: "MeshDecalLodData", family: "resources" })
export class MeshDecalLodData extends CjsModel
{

  /** m_startIndex (uint32_t) */
  @type.uint32
  startIndex = 0;

  /** m_primitiveCount (uint32_t) */
  @type.uint32
  primitiveCount = 0;

}
