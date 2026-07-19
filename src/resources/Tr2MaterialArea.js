// Source: trinity/trinity/Resources/Tr2MaterialRes.h
// Schema: format-carbon resources/Tr2MaterialArea.json; maintained by runtime-resource.
import { io, type } from "@carbonenginejs/core-types/schema";
import { CjsModel } from "@carbonenginejs/core-types/model";

/** Tr2MaterialArea (resources) - maintained from schema shapeHash a260b867.... */
@type.define({ className: "Tr2MaterialArea", family: "resources" })
export class Tr2MaterialArea extends CjsModel
{

  /** m_material (Tr2MaterialParameterStorePtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("Tr2MaterialParameterStore")
  material = null;

  /** m_metaType (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  metatype = "";

}
