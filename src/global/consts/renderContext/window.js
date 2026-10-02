import { blueEnums, EnumRegistrationType } from "../../blue/enums/CjsBlueEnumRegistry.js";
// Source: trinity/trinity/UI/Tr2MainWindow.h (Tr2WindowMode, Tr2WindowShowState, Tr2ImeState_MacOS namespaces)

export const Tr2WindowMode = {
    FULL_SCREEN: 0,
    WINDOWED: 1,
    FIXED_WINDOW: 2,
    _COUNT: 3
};

export const Tr2WindowShowState = {
    NORMAL: 0,
    MAXIMIZED: 1,
    MINIMIZED: 2
};

export const Tr2ImeState_MacOS = Object.freeze({
    DISABLED: 0,
    READY: 1,
    BLOCKING: 2
});

// Definition-site Blue registration preserves Carbon chooser order and exposure.

blueEnums.Create("trinity.Tr2WindowMode", Tr2WindowMode, {
  source: "trinity/trinity/UI/Tr2MainWindow.h", family: "trinity", line: 13,
  exposedName: "Tr2WindowMode", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/UI/Tr2MainWindow_Blue.cpp:9",
  chooser: [
    { name: "FULL_SCREEN", value: Tr2WindowMode.FULL_SCREEN, description: "" },
    { name: "WINDOWED", value: Tr2WindowMode.WINDOWED, description: "" },
    { name: "FIXED_WINDOW", value: Tr2WindowMode.FIXED_WINDOW, description: "" }
  ]
});

blueEnums.Create("trinity.Tr2WindowShowState", Tr2WindowShowState, {
  source: "trinity/trinity/UI/Tr2MainWindow.h", family: "trinity", line: 26,
  exposedName: "Tr2WindowShowState", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/UI/Tr2MainWindow_Blue.cpp:22",
  chooser: [
    { name: "NORMAL", value: Tr2WindowShowState.NORMAL, description: "" },
    { name: "MAXIMIZED", value: Tr2WindowShowState.MAXIMIZED, description: "" },
    { name: "MINIMIZED", value: Tr2WindowShowState.MINIMIZED, description: "" }
  ]
});
