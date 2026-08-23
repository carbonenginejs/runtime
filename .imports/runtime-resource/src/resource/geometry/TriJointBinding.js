// Source: trinity/trinity/Resources/TriGeometryRes.h
// Schema: format-carbon resources/TriJointBinding.json; maintained by runtime-resource.
import { type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";

/** TriJointBinding (resources) - maintained from schema shapeHash 8459bced.... */
@type.define({ className: "TriJointBinding", family: "resources" })
export class TriJointBinding extends CjsModel
{

  /** m_name (std::string) */
  @type.string
  name = "";

  /** m_obbMin (Vector3) */
  @type.vec3
  obbMin = vec3.create();

  /** m_obbMax (Vector3) */
  @type.vec3
  obbMax = vec3.create();

}
