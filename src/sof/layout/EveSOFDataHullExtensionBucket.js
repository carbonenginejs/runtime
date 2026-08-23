// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { EveSOFDataHullExtensionPlacement } from "./EveSOFDataHullExtensionPlacement.js";

/** EveSOFDataHullExtensionBucket (eve) - generated from schema shapeHash af31c426.... */
// Carbon really does declare Bucket as a subclass of the concrete Placement
// type (EveSOFData.h:2088-2104) but Blue-maps ONLY name, depletionCounters,
// and placements (EveSOFData_Blue2.cpp:292-299): the base placement surface
// is not exposed for this type. The JavaScript inheritance stays real; the
// inherited fields are hidden from this class's schema surface only.
@type.define({ className: "EveSOFDataHullExtensionBucket", family: "eve" })
@type.hideInherited([
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
  @io.persist
  @type.list("EveSOFDataDistributionDepletionCounter")
  depletionCounters = [];

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_placements (PEveSOFDataHullExtensionPlacementVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSOFDataHullExtensionPlacement")
  placements = [];

  /** Carbon bucket/group-like discriminator used by the JavaScript runtime. */
  IsBucket()
  {
    return true;
  }

}
