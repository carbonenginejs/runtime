// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** Groups enabled nested placements with group-level conditions and depletion counters. */
@type.define({ className: "EveSOFDataHullExtensionPlacementGroup", family: "eve" })
export class EveSOFDataHullExtensionPlacementGroup extends CjsModel
{

  /** m_placements (PIEveSOFDataHullExtensionPlacementVector) [READ, PERSIST] */
  @edit.persist
  @type.list("IEveSOFDataHullExtensionPlacement")
  placements = [];

  /** m_distributionConditions (PIEveSOFDataHullExtensionPlacementDistributionVector) [READ, PERSIST] */
  @edit.persist
  @type.list("IEveSOFDataHullExtensionPlacementDistribution")
  distributionConditions = [];

  /** m_depletionCounters (PEveSOFDataDistributionDepletionCounterVector) [READ, PERSIST] */
  @edit.persist
  @type.list("EveSOFDataDistributionDepletionCounter")
  depletionCounters = [];

  /** m_enabled (bool) [READWRITE, PERSIST] */
  @edit.persist
  @type.boolean
  enabled = true;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @edit.persist
  @type.string
  name = "";

}
