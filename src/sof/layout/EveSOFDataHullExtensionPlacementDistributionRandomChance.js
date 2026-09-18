// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { IEveSOFDataHullExtensionPlacementDistribution } from "./IEveSOFDataHullExtensionPlacementDistribution.js";

/** EveSOFDataHullExtensionPlacementDistributionRandomChance (eve) - generated from schema shapeHash 0c93607e.... */
@type.define({ className: "EveSOFDataHullExtensionPlacementDistributionRandomChance", family: "eve" })
export class EveSOFDataHullExtensionPlacementDistributionRandomChance extends IEveSOFDataHullExtensionPlacementDistribution
{

  /** m_chanceOfUsage (float) [READWRITE, PERSIST] */
  @edit.persist
  @type.float32
  chanceOfUsage = 1;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @edit.persist
  @type.string
  name = "";

}
