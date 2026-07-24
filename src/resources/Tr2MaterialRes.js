// Source: trinity/trinity/Resources/Tr2MaterialRes.h
// Schema: format-carbon resources/Tr2MaterialRes.json; maintained by runtime-resource.
import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/** Tr2MaterialRes (resources) - maintained from schema shapeHash 11f97051.... */
@type.define({ className: "Tr2MaterialRes", family: "resources" })
export class Tr2MaterialRes extends CjsModel
{

  /** m_meshes (PTr2MaterialMeshDict) [READ, PERSIST] */
  @io.persist
  @type.objectRef("Tr2MaterialMeshDict")
  meshes = null;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

}
