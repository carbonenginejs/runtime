// Source: trinity/trinity/Resources/TriGeometryRes.h
// Schema: format-carbon resources/TriGeometryResJointData.json; maintained by the runtime resource layer.
import { CjsSchema, type } from "#schema";
import { CjsModel } from "#model";
import { mat4 } from "#math/mat4";

/** TriGeometryResJointData (resources) - maintained from schema shapeHash 9b31acb5.... */
export class TriGeometryResJointData extends CjsModel
{

  /** m_name (std::string) */
  name = "";

  /** m_parentJoint (unsigned int) */
  parentJoint = 0;

  /** m_inverseWorldTransform (Matrix) */
  inverseWorldTransform = mat4.create();

}

CjsSchema.define(TriGeometryResJointData, {
  className: "TriGeometryResJointData", family: "resources",
  fields: {
    name: type.string,
    parentJoint: type.uint32,
    inverseWorldTransform: type.mat4
  }
});
