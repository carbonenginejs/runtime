// Source: trinity/trinity/Resources/TriGeometryRes.h
// Schema: format-carbon resources/TriGeometryResSkeletonData.json; maintained by the runtime resource layer.
import { CjsSchema, type } from "#schema";
import { CjsModel } from "#model";

/** TriGeometryResSkeletonData (resources) - maintained from schema shapeHash 9cfcfdf1.... */
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
