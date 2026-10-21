import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta, type, blue } from "#schema";
import { EveSOFDataHullExtensionPlacement } from "./EveSOFDataHullExtensionPlacement.js";

/** Groups extension placements and depletion counters while preserving the compatible Blue bucket surface. */
// Carbon really does declare Bucket as a subclass of the concrete Placement
// type (EveSOFData.h:2088-2104) but Blue-maps ONLY name, depletionCounters,
// and placements (EveSOFData_Blue2.cpp:292-299): the base placement surface
// is not exposed for this type. The JavaScript inheritance stays real; the
// inherited fields are hidden from this class's schema surface only.
@be.define("EveSOFDataHullExtensionBucket")

@meta.hideInherited([
  "distributionConditions",
  "extendsBoundingSphere",
  "extendsShieldEllipsoid",
  "isShared",
  "isInstanced",
  "enabled",
  "distribution",
  "descriptor",
  "locatorSetName",
  "offset"
])
export class EveSOFDataHullExtensionBucket extends EveSOFDataHullExtensionPlacement
{

  /** m_depletionCounters (PEveSOFDataDistributionDepletionCounterVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataDistributionDepletionCounter")
  depletionCounters = [];

  /** m_name (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  /** m_placements (PEveSOFDataHullExtensionPlacementVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataHullExtensionPlacement")
  placements = [];

  /** Carbon bucket/group-like discriminator used by the JavaScript runtime. */
  IsBucket()
  {
    return true;
  }

}
