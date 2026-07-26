// Source: trinity/trinity/Resources/Tr2MaterialRes.h
// Schema: format-carbon resources/Tr2MaterialRes.json; maintained by runtime-resource.
import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/**
 * Root persisted material record containing its authored name and material
 * mesh dictionary.
 *
 * It owns the serializable material description, not device shaders,
 * descriptor bindings, or pipelines.
 */
@type.define({ className: "Tr2MaterialRes", family: "resources" })
export class Tr2MaterialRes extends CjsModel
{

  /** Persisted dictionary of material meshes. */
  @io.persist
  @type.objectRef("Tr2MaterialMeshDict")
  meshes = null;

  /** Authored material name. */
  @io.persist
  @type.string
  name = "";

}
