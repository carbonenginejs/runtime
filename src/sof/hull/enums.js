// Maintained CarbonEngineJS implementation.
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue.cpp
import { blueEnums, EnumRegistrationType } from "#blue/enums/CjsBlueEnumRegistry";

/** The build-filter bits of m_buildFilter (uint32_t); DEFAULT_FILTER is the all-bits default every owner starts with. */
export const EveSOFDataHullBuildFilter = Object.freeze({
  STANDALONE: 1,
  NON_INSTANCED_PLACEMENT: 2,
  INSTANCED_PLACEMENT: 4,
  DEFAULT_FILTER: 0xffffffff
});

// Registered as Carbon registers it (trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue.cpp:110).
blueEnums.Create("trinity.EveSOFDataHullBuildFilter", EveSOFDataHullBuildFilter, {
  exposedName: "EveSOFDataHullBuildFilter", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooser: [
    { name: "Standalone", value: EveSOFDataHullBuildFilter.STANDALONE, description: "Enabled for normal hulls" },
    { name: "NonInstancedPlacement", value: EveSOFDataHullBuildFilter.NON_INSTANCED_PLACEMENT, description: "Enabled on placed hulls" },
    { name: "InstancedPlacement", value: EveSOFDataHullBuildFilter.INSTANCED_PLACEMENT, description: "Enabled on placed instanced hulls" }
  ]
});
