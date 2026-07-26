// Source: trinity/trinity/Resources/Tr2MaterialRes.h
// Schema: format-carbon resources/Tr2MaterialMesh.json; maintained by runtime-resource.
import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/**
 * Holds the persisted material-area dictionary for one material mesh.
 *
 * Area lookup remains resource metadata; engines decide how the selected
 * material becomes backend draw state.
 */
@type.define({ className: "Tr2MaterialMesh", family: "resources" })
export class Tr2MaterialMesh extends CjsModel
{

  /** Persisted dictionary of material areas. */
  @io.persist
  @type.objectRef("Tr2MaterialAreaDict")
  areas = null;

}
