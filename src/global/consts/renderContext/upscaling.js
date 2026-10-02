import { blueEnums, EnumRegistrationType } from "../../blue/enums/CjsBlueEnumRegistry.js";
// Source: trinity/trinityal/include/upscaling/Tr2UpscalingAL.h (Technique, Setting)

export const UpscalingTechnique = {
    NONE: 0,
    FSR1: 1,
    FSR2: 2,
    FSR3: 3,
    DLSS: 4,
    XESS: 5,
    METALFX: 6
};

/** Upscaling quality setting flags. */
export const UpscalingSetting = {
    NATIVE: 1,
    ULTRA_QUALITY: 2,
    QUALITY: 4,
    BALANCED: 8,
    PERFORMANCE: 16,
    ULTRA_PERFORMANCE: 32
};

/** Whether a request to enable upscaling was accepted. Carbon's `Result`. */
export const UpscalingResult = Object.freeze({
    OK: 0,
    TECHNIQUE_NOT_SUPPORTED: 1,
    HARDWARE_NOT_SUPPORTED: 2,
    CONTEXT_SETUP_FAILED: 3,
    INCORRECT_INPUT: 4
});

/**
 * Carbon's `INVALID_CONTEXT_ID`, `numeric_limits<uint32_t>::max()`.
 *
 * Passed to `CreateUpscalingContext` to mean "no existing context to reuse".
 */
export const INVALID_UPSCALING_CONTEXT_ID = 0xffffffff;

// Definition-site Blue registration preserves Carbon chooser order and exposure.
// Registered as Carbon registers it (trinity/trinity/TriDevice_Blue.cpp:191).
blueEnums.Create("trinity.Tr2UpscalingAL.Technique", UpscalingTechnique, {
  source: "trinity/trinityal/include/upscaling/Tr2UpscalingAL.h", family: "trinity", line: 12,
  exposedName: "UPSCALING_TECHNIQUE", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/TriDevice_Blue.cpp:170",
  chooser: [ "NONE", "FSR1", "FSR2", "FSR3", "DLSS", "XESS", "METALFX" ].map(name => ({ name, value: UpscalingTechnique[name], description: "" }))
});
// Registered as Carbon registers it (trinity/trinity/TriDevice_Blue.cpp:197).
blueEnums.Create("trinity.Tr2UpscalingAL.Setting", UpscalingSetting, {
  source: "trinity/trinityal/include/upscaling/Tr2UpscalingAL.h", family: "trinity", line: 23,
  exposedName: "UPSCALING_SETTING", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/TriDevice_Blue.cpp:181",
  chooser: [ "NATIVE", "ULTRA_QUALITY", "QUALITY", "BALANCED", "PERFORMANCE", "ULTRA_PERFORMANCE" ].map(name => ({ name, value: UpscalingSetting[name], description: "" }))
});
