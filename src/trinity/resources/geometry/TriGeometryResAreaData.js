// Source: trinity/trinity/Resources/TriGeometryRes.h
// Schema: format-carbon resources/TriGeometryResAreaData.json; maintained by the runtime resource layer.
import { CjsSchema, type } from "#schema";
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

  /** m_jointBindings (TrackableStdVector<int>), an empty vector at construction (TriGeometryRes.cpp:1892). */
  jointBindings = [];

  /**
   * m_staticBlas (Tr2RtBottomLevelAccelerationStructureAL)
   *
   * Adapted: Carbon embeds it by value (TriGeometryRes.h:113), but the class
   * lives in trinityal, which the resource layer may not import (layers.json),
   * so the member starts null here.
   */
  staticBlas = null;

  /** m_isSkinned (bool) */
  isSkinned = false;

  /** m_isMorphed (bool) */
  isMorphed = false;

  /**
   * m_rtGeometryConstants (Tr2ConstantBufferAL)
   *
   * Adapted: embedded by value (TriGeometryRes.h:116); null for the same
   * layer reason as staticBlas.
   */
  rtGeometryConstants = null;

}

CjsSchema.decorateField(TriGeometryResAreaData, "name", type.string);
CjsSchema.decorateField(TriGeometryResAreaData, "firstIndex", type.int32);
CjsSchema.decorateField(TriGeometryResAreaData, "primitiveCount", type.int32);
CjsSchema.decorateField(TriGeometryResAreaData, "minBounds", type.vec3);
CjsSchema.decorateField(TriGeometryResAreaData, "maxBounds", type.vec3);
CjsSchema.decorateField(TriGeometryResAreaData, "jointBindings", type.list("int"));
CjsSchema.decorateField(TriGeometryResAreaData, "staticBlas", type.rawStruct("Tr2RtBottomLevelAccelerationStructureAL"));
CjsSchema.decorateField(TriGeometryResAreaData, "isSkinned", type.boolean);
CjsSchema.decorateField(TriGeometryResAreaData, "isMorphed", type.boolean);
CjsSchema.decorateField(TriGeometryResAreaData, "rtGeometryConstants", type.rawStruct("Tr2ConstantBufferAL"));
CjsSchema.meta.carbon("TriGeometryResAreaData")(TriGeometryResAreaData);
