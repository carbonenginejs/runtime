// Source: trinity/trinity/Resources/TriGeometryRes.h
// Schema: format-carbon resources/MeshDecalLodData.json; maintained by the runtime resource layer.
import { CjsSchema, type } from "#schema";
import { CjsModel } from "#model";

/** MeshDecalLodData (resources) - maintained from schema shapeHash 932b2966.... */
export class MeshDecalLodData extends CjsModel
{

  /** m_startIndex (uint32_t) */
  startIndex = 0;

  /** m_primitiveCount (uint32_t) */
  primitiveCount = 0;

}

CjsSchema.define(MeshDecalLodData, {
  className: "MeshDecalLodData", family: "resources",
  fields: {
    startIndex: type.uint32,
    primitiveCount: type.uint32
  }
});
