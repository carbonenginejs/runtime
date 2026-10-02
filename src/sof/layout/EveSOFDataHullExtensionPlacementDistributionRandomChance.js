// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta } from "#schema";
import { IEveSOFDataHullExtensionPlacementDistribution } from "./IEveSOFDataHullExtensionPlacementDistribution.js";

/** Applies a probability threshold as a condition for a hull-extension placement. */
@meta.define({ className: "EveSOFDataHullExtensionPlacementDistributionRandomChance", family: "eve" })
export class EveSOFDataHullExtensionPlacementDistributionRandomChance extends IEveSOFDataHullExtensionPlacementDistribution
{

  /** m_chanceOfUsage (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  chanceOfUsage = 1;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

}
