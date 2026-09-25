// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { IEveSOFDataHullExtensionPlacementDistribution } from "./IEveSOFDataHullExtensionPlacementDistribution.js";

/** Tests named depletion counters as a condition for a hull-extension placement. */
@type.define({ className: "EveSOFDataHullExtensionPlacementDistributionDepletionCounter", family: "eve" })
export class EveSOFDataHullExtensionPlacementDistributionDepletionCounter extends IEveSOFDataHullExtensionPlacementDistribution
{

  /** m_depletionCounters (PEveSOFDataDistributionDepletionCounterVector) [READ, PERSIST] */
  @edit.read
  @edit.persist
  @type.list("EveSOFDataDistributionDepletionCounter")
  depletionCounters = [];

  /** m_name (std::string) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  name = "";

}
