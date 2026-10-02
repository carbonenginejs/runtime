// Source: trinity/trinity/Resources/TriGeometryRes.h
// Schema: format-carbon resources/TriGeometryResJointData.json; maintained by the runtime resource layer.
import { CjsSchema, meta } from "#schema";
import { mat4 } from "#math/mat4";

/** Data record mirroring Carbon's geometry joint entry: a joint name, parent-joint index, and inverse world transform. */
export class TriGeometryResJointData
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
    name: meta.type.string,
    parentJoint: meta.type.uint32,
    inverseWorldTransform: meta.type.mat4
  }
});
