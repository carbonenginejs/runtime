// Source: trinity/trinity/Resources/Tr2MaterialRes.h
// Schema: format-carbon resources/Tr2MaterialMesh.json; maintained by runtime-resource.
import { io, type } from "@carbonenginejs/core-types/schema";
import { CjsModel } from "@carbonenginejs/core-types/model";

/** Tr2MaterialMesh (resources) - maintained from schema shapeHash 3e7dff83.... */
@type.define({ className: "Tr2MaterialMesh", family: "resources" })
export class Tr2MaterialMesh extends CjsModel
{

  /** m_areas (PTr2MaterialAreaDict) [READ, PERSIST] */
  @io.persist
  @type.objectRef("Tr2MaterialAreaDict")
  areas = null;

}
