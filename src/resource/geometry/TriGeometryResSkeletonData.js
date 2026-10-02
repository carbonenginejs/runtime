// Source: trinity/trinity/Resources/TriGeometryRes.h
// Schema: format-carbon resources/TriGeometryResSkeletonData.json; maintained by the runtime resource layer.
import { CjsSchema, meta } from "#schema";

/** Data record mirroring Carbon's geometry skeleton block, pairing a skeleton name with its joint list. */
export class TriGeometryResSkeletonData
{

  /** m_name (std::string) */
  name = "";

  /** m_joints (TrackableStdVector<TriGeometryResJointData>) */
  joints = [];

  /**
   * Finds an exact joint name, returning Carbon's unsigned invalid sentinel
   * (TriGeometryRes.cpp:1841-1852). Decoded CMF payloads store their joint
   * names as a bones string array; the same method accepts that record form.
   */
  FindJoint(name)
  {
    const joints = this.joints ?? this.bones;
    for (let index = 0; index < joints.length; index++)
    {
      if (name === (typeof joints[index] === "string" ? joints[index] : joints[index].name)) return index;
    }
    return 0xffffffff;
  }

}

CjsSchema.define(TriGeometryResSkeletonData, {
  className: "TriGeometryResSkeletonData", family: "resources",
  fields: {
    name: meta.type.string,
    joints: meta.type.unknown
  },
  methods: {
    FindJoint: [ meta.blue.method, meta.adapted ]
  }
});
