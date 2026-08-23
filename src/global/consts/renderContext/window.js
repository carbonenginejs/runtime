// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/UI/Tr2MainWindow.h (Tr2WindowMode, Tr2WindowShowState, Tr2ImeState_MacOS namespaces)

export const Tr2WindowMode = Object.freeze({
    FULL_SCREEN: 0,
    WINDOWED: 1,
    FIXED_WINDOW: 2
});

export const Tr2WindowShowState = Object.freeze({
    NORMAL: 0,
    MAXIMIZED: 1,
    MINIMIZED: 2
});

export const Tr2ImeState_MacOS = Object.freeze({
    DISABLED: 0,
    READY: 1,
    BLOCKING: 2
});
