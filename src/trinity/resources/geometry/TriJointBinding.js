// Source: trinity/trinity/Resources/TriGeometryRes.h
// Schema: format-carbon resources/TriJointBinding.json; maintained by the runtime resource layer.
import { CjsSchema, type } from "#schema";
import { vec3 } from "#math/vec3";

/** Data record mirroring Carbon's joint binding: a joint name with its oriented-bounding-box minimum and maximum. */
export class TriJointBinding
{

  /** m_name (std::string) */
  name = "";

  /** m_obbMin (Vector3) */
  obbMin = vec3.create();

  /** m_obbMax (Vector3) */
  obbMax = vec3.create();

}

CjsSchema.decorateField(TriJointBinding, "name", type.string);
CjsSchema.decorateField(TriJointBinding, "obbMin", type.vec3);
CjsSchema.decorateField(TriJointBinding, "obbMax", type.vec3);
CjsSchema.meta.carbon("TriJointBinding")(TriJointBinding);
