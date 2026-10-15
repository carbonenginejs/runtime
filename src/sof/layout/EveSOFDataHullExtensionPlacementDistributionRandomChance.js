// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";
import { IEveSOFDataHullExtensionPlacementDistribution } from "./IEveSOFDataHullExtensionPlacementDistribution.js";

/** Applies a probability threshold as a condition for a hull-extension placement. */
@blue.define("EveSOFDataHullExtensionPlacementDistributionRandomChance")
@blue.interface(IEveSOFDataHullExtensionPlacementDistribution)
export class EveSOFDataHullExtensionPlacementDistributionRandomChance extends IEveSOFDataHullExtensionPlacementDistribution
{

  /** m_chanceOfUsage (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  chanceOfUsage = 1;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

}
