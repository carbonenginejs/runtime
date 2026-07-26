// Source: trinity/trinity/Resources/Tr2MaterialRes.h
// Schema: format-carbon resources/Tr2MaterialArea.json; maintained by runtime-resource.
import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/**
 * Associates one material-area metatype with its persisted parameter store.
 *
 * The record describes resource data and does not own shader bindings or
 * backend material realization.
 */
@type.define({ className: "Tr2MaterialArea", family: "resources" })
export class Tr2MaterialArea extends CjsModel
{

  /** Persisted material parameter-store reference. */
  @io.persist
  @type.objectRef("Tr2MaterialParameterStore")
  material = null;

  /** Authored material-area metatype. */
  @io.persist
  @type.string
  metatype = "";

}
