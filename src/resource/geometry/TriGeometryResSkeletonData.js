// Source: trinity/trinity/Resources/TriGeometryRes.h
// Schema: format-carbon resources/TriGeometryResSkeletonData.json; maintained by the runtime resource layer.
import { type } from "#schema";
import { CjsModel } from "#model";

/** TriGeometryResSkeletonData (resources) - maintained from schema shapeHash 9cfcfdf1.... */
@type.define({ className: "TriGeometryResSkeletonData", family: "resources" })
export class TriGeometryResSkeletonData extends CjsModel
{

  /** m_name (std::string) */
  @type.string
  name = "";

  /** m_joints (TrackableStdVector<TriGeometryResJointData>) */
  @type.unknown
  joints = null;

}
