// Source: trinity/trinity/Eve/EveEntity.h:9, trinity/trinity/Eve/EveEntity_Blue.cpp:10,
//   trinity/trinity/Resources/Tr2LodResource.h:7,
//   trinity/trinityal/Tr2RenderContextEnum.h:391, trinity/trinity/Tr2RenderContext_Blue.cpp:277-288,
//   trinity/trinity/UI/Tr2MainWindow.h:13-33, trinity/trinity/UI/Tr2MainWindow_Blue.cpp:9-51
// Shared constants stay dependency-free. Consumers import this registration
// module explicitly; importing Blue alone does not load Trinity registrations.
import { blue } from "./blue.js";
import { EnumRegistrationType } from "./enums/CjsBlueEnumRegistry.js";
import { ReflectionMode } from "../consts/graphics/trinityEnums.js";
import { Tr2Lod } from "../consts/trinity.js";
import { PresentInterval } from "../consts/renderContext/presentation.js";
import { Tr2WindowMode, Tr2WindowShowState } from "../consts/renderContext/window.js";
import { TRIEXTRAPOLATION, TRIOPERATOR } from "../consts/graphics/trinityEnums.js";

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

// The three enums Tr2MainWindowState's attributes take. Carbon registers each
// by its exposed name with a chooser that omits Tr2WindowMode::_COUNT.
blue.enums.RegisterEnum("trinity.Tr2RenderContextEnum.PresentInterval", PresentInterval, {
  source: "trinity/trinityal/Tr2RenderContextEnum.h", family: "trinity", line: 391,
  exposedName: "PRESENT_INTERVAL", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/Tr2RenderContext_Blue.cpp:277",
  chooser: [
    { name: "IMMEDIATE", value: PresentInterval.PRESENT_INTERVAL_IMMEDIATE, description: "" },
    { name: "ONE", value: PresentInterval.PRESENT_INTERVAL_ONE, description: "" }
  ]
});

blue.enums.RegisterEnum("trinity.Tr2WindowMode", Tr2WindowMode, {
  source: "trinity/trinity/UI/Tr2MainWindow.h", family: "trinity", line: 13,
  exposedName: "Tr2WindowMode", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/UI/Tr2MainWindow_Blue.cpp:9",
  chooser: [
    { name: "FULL_SCREEN", value: Tr2WindowMode.FULL_SCREEN, description: "" },
    { name: "WINDOWED", value: Tr2WindowMode.WINDOWED, description: "" },
    { name: "FIXED_WINDOW", value: Tr2WindowMode.FIXED_WINDOW, description: "" }
  ]
});

blue.enums.RegisterEnum("trinity.Tr2WindowShowState", Tr2WindowShowState, {
  source: "trinity/trinity/UI/Tr2MainWindow.h", family: "trinity", line: 26,
  exposedName: "Tr2WindowShowState", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/UI/Tr2MainWindow_Blue.cpp:22",
  chooser: [
    { name: "NORMAL", value: Tr2WindowShowState.NORMAL, description: "" },
    { name: "MAXIMIZED", value: Tr2WindowShowState.MAXIMIZED, description: "" },
    { name: "MINIMIZED", value: Tr2WindowShowState.MINIMIZED, description: "" }
  ]
});

// Blue's ITriConstants.h enums, shared by audio and Trinity. Neither is
// registered; the choosers are Trinity's (audio's AudConstants.cpp:6 copy of
// TriExtrapolation is identical).
blue.enums.RegisterEnum("blue.TRIEXTRAPOLATION", TRIEXTRAPOLATION, {
  source: "blue/include/ITriConstants.h", family: "blue", line: 33,
  chooserSource: "trinity/trinity/TriConstants.cpp:94",
  chooser: [
    { name: "TRIEXT_NONE", value: TRIEXTRAPOLATION.TRIEXT_NONE, description: "no comment" },
    { name: "TRIEXT_CONSTANT", value: TRIEXTRAPOLATION.TRIEXT_CONSTANT, description: "no comment" },
    { name: "TRIEXT_GRADIENT", value: TRIEXTRAPOLATION.TRIEXT_GRADIENT, description: "no comment" },
    { name: "TRIEXT_CYCLE", value: TRIEXTRAPOLATION.TRIEXT_CYCLE, description: "no comment" }
  ]
});

blue.enums.RegisterEnum("blue.TRIOPERATOR", TRIOPERATOR, {
  source: "blue/include/ITriConstants.h", family: "blue", line: 80,
  chooserSource: "trinity/trinity/TriConstants.cpp:185",
  chooser: [
    { name: "TRIOP_MULTIPLY", value: TRIOPERATOR.TRIOP_MULTIPLY, description: "multiply" },
    { name: "TRIOP_ADD", value: TRIOPERATOR.TRIOP_ADD, description: "add" },
    { name: "TRIOP_AVERAGE", value: TRIOPERATOR.TRIOP_AVERAGE, description: "average" }
  ]
});
