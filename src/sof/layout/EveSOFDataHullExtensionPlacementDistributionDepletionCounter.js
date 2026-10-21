import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";
import { IEveSOFDataHullExtensionPlacementDistribution } from "./IEveSOFDataHullExtensionPlacementDistribution.js";

/** Tests named depletion counters as a condition for a hull-extension placement. */
@be.define("EveSOFDataHullExtensionPlacementDistributionDepletionCounter")
@be.mapInterface(IEveSOFDataHullExtensionPlacementDistribution)
export class EveSOFDataHullExtensionPlacementDistributionDepletionCounter extends IEveSOFDataHullExtensionPlacementDistribution
{

  /** m_depletionCounters (PEveSOFDataDistributionDepletionCounterVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveSOFDataDistributionDepletionCounter")
  depletionCounters = [];

  /** m_name (std::string) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

}
