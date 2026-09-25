// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { blue } from "#blue";
import { IEveSOFDataHullExtensionPlacementDistribution } from "./IEveSOFDataHullExtensionPlacementDistribution.js";

/** Tests map graphic-quality settings as a condition for a hull-extension placement. */
@type.define({ className: "EveSOFDataHullExtensionPlacementDistributionMapGraphicSettings", family: "eve" })
export class EveSOFDataHullExtensionPlacementDistributionMapGraphicSettings extends IEveSOFDataHullExtensionPlacementDistribution
{

  /** m_displayFilter (DisplayQualityModifier - enum DisplayQualityModifier) [READWRITE, PERSIST, ENUM] */
  @edit.persist
  @type.int32
  @type.enum("trinity.EveSOFDataHullExtensionPlacementDistributionMapGraphicSettings.DisplayQualityModifier")
  displayFilter = 5;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @edit.persist
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

// Native chooser labels and selection; the enum object retains all C++ members.
// Carbon reuses this chooser but declares this enum type independently.
blue.enums.RegisterEnum("trinity.EveSOFDataHullExtensionPlacementDistributionMapGraphicSettings.DisplayQualityModifier", EveSOFDataHullExtensionPlacementDistributionMapGraphicSettings.DisplayQualityModifier, {
  source: "trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h", family: "eve", line: 2017,
  chooserSource: "trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue2.cpp:52",
  chooser: [
    { name: "None_", value: EveSOFDataHullExtensionPlacementDistributionMapGraphicSettings.DisplayQualityModifier.SHADER_ALL, description: "Visible to users with all shader settings" },
    { name: "Medium_and_High", value: EveSOFDataHullExtensionPlacementDistributionMapGraphicSettings.DisplayQualityModifier.SHADER_HIGHMID, description: "Visible for users with shader settings on Medium or High" },
    { name: "Low_and_Medium", value: EveSOFDataHullExtensionPlacementDistributionMapGraphicSettings.DisplayQualityModifier.SHADER_LOWMID, description: "Visible for users with shader settings on Low or Medium" },
    { name: "High", value: EveSOFDataHullExtensionPlacementDistributionMapGraphicSettings.DisplayQualityModifier.SHADER_HIGH, description: "Only visible for users with shader settings on High" },
    { name: "Medium", value: EveSOFDataHullExtensionPlacementDistributionMapGraphicSettings.DisplayQualityModifier.SHADER_MED, description: "Only visible for users with shader settings on Medium" },
    { name: "Low", value: EveSOFDataHullExtensionPlacementDistributionMapGraphicSettings.DisplayQualityModifier.SHADER_LOW, description: "Only visible for users with shader settings on Low" }
  ]
});
