// Source: trinity/trinity/Resources/TriGeometryRes.h
// Schema: format-carbon resources/TriGeometryResSkeletonData.json; maintained by the runtime resource layer.
import { CjsSchema, type } from "#schema";
import { CjsModel } from "#model";

/** Data record mirroring Carbon's geometry skeleton block, pairing a skeleton name with its joint list. */
export class TriGeometryResSkeletonData extends CjsModel
{

  /** m_name (std::string) */
  name = "";

  /** m_joints (TrackableStdVector<TriGeometryResJointData>) */
  joints = null;

}

CjsSchema.define(TriGeometryResSkeletonData, {
  className: "TriGeometryResSkeletonData", family: "resources",
  fields: {
    name: type.string,
    joints: type.unknown
  }
});
