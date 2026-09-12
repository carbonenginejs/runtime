// Source: trinity/trinity/Resources/TriGeometryRes.h
// Schema: format-carbon resources/TriGeometryResAreaData.json; maintained by the runtime resource layer.
import { CjsSchema, type } from "#schema";
import { CjsModel } from "#model";
import { vec3 } from "#math/vec3";

/** TriGeometryResAreaData (resources) - maintained from schema shapeHash a859a2c5.... */
export class TriGeometryResAreaData extends CjsModel
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
    name: type.string,
    firstIndex: type.int32,
    primitiveCount: type.int32,
    minBounds: type.vec3,
    maxBounds: type.vec3,
    jointBindings: type.unknown,
    staticBlas: type.rawStruct("Tr2RtBottomLevelAccelerationStructureAL"),
    isSkinned: type.boolean,
    isMorphed: type.boolean,
    rtGeometryConstants: type.rawStruct("Tr2ConstantBufferAL")
  }
});
