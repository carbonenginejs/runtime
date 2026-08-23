// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { IEveSOFDataHullExtensionPlacementDistribution } from "./IEveSOFDataHullExtensionPlacementDistribution.js";

/** EveSOFDataHullExtensionPlacementDistributionMapGraphicSettings (eve) - generated from schema shapeHash 2142ba6f.... */
@type.define({ className: "EveSOFDataHullExtensionPlacementDistributionMapGraphicSettings", family: "eve" })
export class EveSOFDataHullExtensionPlacementDistributionMapGraphicSettings extends IEveSOFDataHullExtensionPlacementDistribution
{

  /** m_displayFilter (DisplayQualityModifier - enum DisplayQualityModifier) [READWRITE, PERSIST, ENUM] */
  @io.persist
  @type.int32
  @type.enum("DisplayQualityModifier")
  displayFilter = 5;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  static DisplayQualityModifier = Object.freeze({
    ONLY_REFLECTIONS: 6,
    SHADER_ALL: 5,
    SHADER_HIGHMID: 3,
    SHADER_LOWMID: 1,
    SHADER_HIGH: 4,
    SHADER_MED: 2,
    SHADER_LOW: 0,
  });

}
