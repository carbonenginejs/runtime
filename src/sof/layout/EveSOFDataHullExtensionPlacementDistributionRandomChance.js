// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { IEveSOFDataHullExtensionPlacementDistribution } from "./IEveSOFDataHullExtensionPlacementDistribution.js";

/** Applies a probability threshold as a condition for a hull-extension placement. */
@type.define({ className: "EveSOFDataHullExtensionPlacementDistributionRandomChance", family: "eve" })
export class EveSOFDataHullExtensionPlacementDistributionRandomChance extends IEveSOFDataHullExtensionPlacementDistribution
{

  /** m_chanceOfUsage (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  chanceOfUsage = 1;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  name = "";

}
