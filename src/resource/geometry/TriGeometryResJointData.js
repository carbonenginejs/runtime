// Source: trinity/trinity/Resources/TriGeometryRes.h
// Schema: format-carbon resources/TriGeometryResJointData.json; maintained by the runtime resource layer.
import { type } from "#schema";
import { CjsModel } from "#model";
import { mat4 } from "#math/mat4";

/** TriGeometryResJointData (resources) - maintained from schema shapeHash 9b31acb5.... */
@type.define({ className: "TriGeometryResJointData", family: "resources" })
export class TriGeometryResJointData extends CjsModel
{

  /** m_name (std::string) */
  @type.string
  name = "";

  /** m_parentJoint (unsigned int) */
  @type.uint32
  parentJoint = 0;

  /** m_inverseWorldTransform (Matrix) */
  @type.mat4
  inverseWorldTransform = mat4.create();

}
