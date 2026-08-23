// Source: trinity/trinity/Resources/TriGeometryRes.h
// Schema: format-carbon resources/TriGeometryResAreaData.json; maintained by runtime-resource.
import { type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";

/** TriGeometryResAreaData (resources) - maintained from schema shapeHash a859a2c5.... */
@type.define({ className: "TriGeometryResAreaData", family: "resources" })
export class TriGeometryResAreaData extends CjsModel
{

  /** m_name (std::string) */
  @type.string
  name = "";

  /** m_firstIndex (int) */
  @type.int32
  firstIndex = 0;

  /** m_primitiveCount (int) */
  @type.int32
  primitiveCount = 0;

  /** m_minBounds (Vector3) */
  @type.vec3
  minBounds = vec3.create();

  /** m_maxBounds (Vector3) */
  @type.vec3
  maxBounds = vec3.create();

  /** m_jointBindings (TrackableStdVector<int>) */
  @type.unknown
  jointBindings = null;

  /** m_staticBlas (Tr2RtBottomLevelAccelerationStructureAL) */
  @type.rawStruct("Tr2RtBottomLevelAccelerationStructureAL")
  staticBlas = null;

  /** m_isSkinned (bool) */
  @type.boolean
  isSkinned = false;

  /** m_isMorphed (bool) */
  @type.boolean
  isMorphed = false;

  /** m_rtGeometryConstants (Tr2ConstantBufferAL) */
  @type.rawStruct("Tr2ConstantBufferAL")
  rtGeometryConstants = null;

}
