import { IRoot } from "../../global/blue/IRoot.js";
import { exposure as be } from "#be";
import { IEveSOFDataHullExtensionPlacement } from "./IEveSOFDataHullExtensionPlacement.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";

/** Groups enabled nested placements with group-level conditions and depletion counters. */
@be.define("EveSOFDataHullExtensionPlacementGroup")
@be.mapInterface(IEveSOFDataHullExtensionPlacement)
@blue.inherit(IEveSOFDataHullExtensionPlacement)
export class EveSOFDataHullExtensionPlacementGroup extends IRoot
{

  /** m_placements (PIEveSOFDataHullExtensionPlacementVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("IEveSOFDataHullExtensionPlacement")
  placements = [];

  /** m_distributionConditions (PIEveSOFDataHullExtensionPlacementDistributionVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("IEveSOFDataHullExtensionPlacementDistribution")
  distributionConditions = [];

  /** m_depletionCounters (PEveSOFDataDistributionDepletionCounterVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveSOFDataDistributionDepletionCounter")
  depletionCounters = [];

  /** m_enabled (bool) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  enabled = true;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

}
