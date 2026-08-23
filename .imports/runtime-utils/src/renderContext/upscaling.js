// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinityal/include/upscaling/Tr2UpscalingAL.h (Technique, Setting)

export const UpscalingTechnique = Object.freeze({
    NONE: 0,
    FSR1: 1,
    FSR2: 2,
    FSR3: 3,
    DLSS: 4,
    XESS: 5,
    METALFX: 6
});

/** Upscaling quality setting flags. */
export const UpscalingSetting = Object.freeze({
    NATIVE: 1,
    ULTRA_QUALITY: 2,
    QUALITY: 4,
    BALANCED: 8,
    PERFORMANCE: 16,
    ULTRA_PERFORMANCE: 32
});
