// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta } from "#schema";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";

/** Controls placement completeness, caps, bias, random scale and rotation, uniformity, and locator-occupancy policy. */
// Carbon derives this record directly from IRoot with its own m_name
// (EveSOFData.h:1999-2021); it is NOT a distribution condition, despite the
// name - the distribution conditions implement the separate BLUE_INTERFACE.
@meta.define({ className: "EveSOFDataHullExtensionPlacementDistributionPlacement", family: "eve" })
export class EveSOFDataHullExtensionPlacementDistributionPlacement
{

  /** m_name (std::string) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /** m_randomScaleMin (Vector3) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  randomScaleMin = vec3.fromValues(1, 1, 1);

  /** m_randomScaleMax (Vector3) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  randomScaleMax = vec3.fromValues(1, 1, 1);

  /** m_centerBias (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  centerBias = 0;

  /** m_cap (int32_t) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  cap = 0;

  /** m_completeness (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  completeness = 1;

  /** m_randomRotationMaxSteps (Vector3) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  randomRotationMaxSteps = vec3.create();

  /** m_randomRotationStepSizeYPR (Quaternion) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.quat
  randomRotationStepSizeYPR = quat.fromValues(0.008802, 0.0086497, 0.0086497, 0.9998864);

  /** m_placementBias (Vector3) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  placementBias = vec3.create();

  /** m_occupyLocators (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  occupyLocators = true;

  /** m_uniformScale (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  uniformScale = true;

}
