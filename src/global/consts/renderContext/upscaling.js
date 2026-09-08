// Source: trinity/trinityal/include/upscaling/Tr2UpscalingAL.h (Technique, Setting)

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
