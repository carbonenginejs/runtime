import { IEveSOFDataHullExtensionPlacement } from "./IEveSOFDataHullExtensionPlacement.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";

/** Groups enabled nested placements with group-level conditions and depletion counters. */
@blue.define("EveSOFDataHullExtensionPlacementGroup")
@blue.interface(IEveSOFDataHullExtensionPlacement)
@blue.inherit(IEveSOFDataHullExtensionPlacement)
export class EveSOFDataHullExtensionPlacementGroup
{

  /** m_placements (PIEveSOFDataHullExtensionPlacementVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("IEveSOFDataHullExtensionPlacement")
  placements = [];

  /** m_distributionConditions (PIEveSOFDataHullExtensionPlacementDistributionVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("IEveSOFDataHullExtensionPlacementDistribution")
  distributionConditions = [];

  /** m_depletionCounters (PEveSOFDataDistributionDepletionCounterVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataDistributionDepletionCounter")
  depletionCounters = [];

  /** m_enabled (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  enabled = true;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

}
