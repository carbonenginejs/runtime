// Source: trinity/trinity/Resources/TriGeometryRes.h
// Schema: format-carbon resources/TriGeometryResJointData.json; maintained by the runtime resource layer.
import { CjsSchema, type } from "#schema";
import { mat4 } from "#math/mat4";

/** Data record mirroring Carbon's geometry joint entry: a joint name, parent-joint index, and inverse world transform. */
export class TriGeometryResJointData
{

  /** m_name (std::string) */
  name = "";

  /** m_parentJoint (unsigned int) */
  // Empty records have no parent: the unsigned sentinel checked by Tr2MeshBase.cpp.
  parentJoint = 0xffffffff;

  /** m_inverseWorldTransform (Matrix) */
  inverseWorldTransform = mat4.create();

}

CjsSchema.blue.define(TriGeometryResJointData, {
  className: "TriGeometryResJointData",
  fields: {
    name: type.string,
    parentJoint: type.uint32,
    inverseWorldTransform: type.mat4
  }
});
