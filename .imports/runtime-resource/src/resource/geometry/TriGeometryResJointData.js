// Source: trinity/trinity/Resources/TriGeometryRes.h
// Schema: format-carbon resources/TriGeometryResJointData.json; maintained by runtime-resource.
import { type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";

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
