// Source: trinity/trinity/Eve/EveEntity.h:9, trinity/trinity/Eve/EveEntity_Blue.cpp:10,
//   trinity/trinity/Resources/Tr2LodResource.h:7
// Shared constants stay dependency-free. Consumers import this registration
// module explicitly; importing Blue alone does not load Trinity registrations.
import { blue } from "./blue.js";
import { EnumRegistrationType } from "./enums/CjsBlueEnumRegistry.js";
import { ReflectionMode } from "../consts/graphics/trinityEnums.js";
import { Tr2Lod } from "../consts/trinity.js";

blue.enums.RegisterEnum("trinity.EntityComponents.ReflectionMode", ReflectionMode, {
  source: "trinity/trinity/Eve/EveEntity.h", family: "trinity", line: 9,
  exposedName: "ReflectionModeType", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/Eve/EveEntity_Blue.cpp:10",
  chooser: [
    { name: "Never", value: ReflectionMode.REFLECT_NEVER, description: "Never render into the reflection map" },
    { name: "LowMediumAndHigh", value: ReflectionMode.REFLECT_LOW_MEDIUM_HIGH, description: "Render into the reflection map when reflection settings is set to low, medium or high" },
    { name: "MediumAndHigh", value: ReflectionMode.REFLECT_MEDIUM_AND_HIGH, description: "Render into the reflection map when reflection settings is set to medium or high" },
    { name: "High", value: ReflectionMode.REFLECT_HIGH, description: "Only render into the reflection map when reflection settings is set to high" }
  ]
});

// No native chooser or BLUE_REGISTER_ENUM was found for Tr2Lod in Trinity.
// Register its declared identifiers without inventing Python exposure metadata.
blue.enums.RegisterEnum("trinity.Tr2Lod", Tr2Lod, {
  source: "trinity/trinity/Resources/Tr2LodResource.h", family: "trinity", line: 7
});
