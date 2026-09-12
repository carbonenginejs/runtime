// Source: trinity/trinity/Resources/TriGeometryRes.h
// Schema: format-carbon resources/TriJointBinding.json; maintained by the runtime resource layer.
import { CjsSchema, type } from "#schema";
import { CjsModel } from "#model";
import { vec3 } from "#math/vec3";

/** TriJointBinding (resources) - maintained from schema shapeHash 8459bced.... */
export class TriJointBinding extends CjsModel
{

  /** m_name (std::string) */
  name = "";

  /** m_obbMin (Vector3) */
  obbMin = vec3.create();

  /** m_obbMax (Vector3) */
  obbMax = vec3.create();

}

CjsSchema.define(TriJointBinding, {
  className: "TriJointBinding", family: "resources",
  fields: {
    name: type.string,
    obbMin: type.vec3,
    obbMax: type.vec3
  }
});
