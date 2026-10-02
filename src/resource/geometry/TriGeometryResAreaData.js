// Source: trinity/trinity/Resources/TriGeometryRes.h
// Schema: format-carbon resources/TriGeometryResAreaData.json; maintained by the runtime resource layer.
import { CjsSchema, meta } from "#schema";
import { vec3 } from "#math/vec3";

/** Data record mirroring Carbon's geometry area block: a named draw range with bounds, joint bindings, skinning/morph flags, and ray-tracing structure references. */
export class TriGeometryResAreaData
{

  /** m_name (std::string) */
  name = "";

  /** m_firstIndex (int) */
  firstIndex = 0;

  /** m_primitiveCount (int) */
  primitiveCount = 0;

  /** m_minBounds (Vector3) */
  minBounds = vec3.create();

  /** m_maxBounds (Vector3) */
  maxBounds = vec3.create();

  /** m_jointBindings (TrackableStdVector<int>) */
  jointBindings = null;

  /** m_staticBlas (Tr2RtBottomLevelAccelerationStructureAL) */
  staticBlas = null;

  /** m_isSkinned (bool) */
  isSkinned = false;

  /** m_isMorphed (bool) */
  isMorphed = false;

  /** m_rtGeometryConstants (Tr2ConstantBufferAL) */
  rtGeometryConstants = null;

}

CjsSchema.define(TriGeometryResAreaData, {
  className: "TriGeometryResAreaData", family: "resources",
  fields: {
    name: meta.type.string,
    firstIndex: meta.type.int32,
    primitiveCount: meta.type.int32,
    minBounds: meta.type.vec3,
    maxBounds: meta.type.vec3,
    jointBindings: meta.type.unknown,
    staticBlas: meta.type.rawStruct("Tr2RtBottomLevelAccelerationStructureAL"),
    isSkinned: meta.type.boolean,
    isMorphed: meta.type.boolean,
    rtGeometryConstants: meta.type.rawStruct("Tr2ConstantBufferAL")
  }
});
