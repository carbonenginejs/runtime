/** Global Trinity render-batch vocabulary from ITr2Renderable.h. */
export const TriBatchType = Object.freeze({
    TRIBATCHTYPE_OPAQUE: 0,
    TRIBATCHTYPE_DECAL: 1,
    TRIBATCHTYPE_TRANSPARENT: 2,
    TRIBATCHTYPE_DEPTH: 3,
    TRIBATCHTYPE_ADDITIVE: 4,
    TRIBATCHTYPE_PICKING: 5,
    TRIBATCHTYPE_MIRROR: 6,
    TRIBATCHTYPE_DECALNORMAL: 7,
    TRIBATCHTYPE_DEPTHNORMAL: 8,
    TRIBATCHTYPE_OPAQUE_PREPASS: 9,
    TRIBATCHTYPE_DECAL_PREPASS: 10,
    TRIBATCHTYPE_GEOMETRY_ERASER: 11,
    TRIBATCHTYPE_FLARE: 12,
    TRIBATCHTYPE_DISTORTION: 13,
    TRIBATCHTYPE_COUNT_OF_BATCH_TYPES: 14
});

/** Trinity standard render-state selector from Shader/Tr2EffectStateManager.h.
 * Cross-package: runtime-trinity batches/accumulators and engine dispatch both
 * key on it. Distinct from TriBatchType (batch bucket) — a render-state mode.
 * Unscoped Carbon enum: values are sequential from RM_ANY = 0. */
export const RenderingMode = Object.freeze({
    RM_ANY: 0,
    RM_OPAQUE: 1,
    RM_DECAL: 2,
    RM_DECAL_NO_DEPTH: 3,
    RM_ALPHA: 4,
    RM_ALPHA_ADDITIVE: 5,
    RM_DEPTH_ONLY: 6,
    RM_PICKING: 7,
    RM_FULLSCREEN: 8,
    RM_SPRITE2D: 9,
    RM_CULL: 10,
    RM_LIGHT: 11,
    RM_ERASE: 12,
    RM_PREPASS_COLOR: 13,
    RM_COUNT: 14
});

/** Shared EVE entity reflection vocabulary from EntityComponents. */
export const ReflectionMode = Object.freeze({
    REFLECT_HIGH: 0,
    REFLECT_MEDIUM_AND_HIGH: 1,
    REFLECT_LOW_MEDIUM_HIGH: 2,
    REFLECT_NEVER: 3
});

/** Trinity graph value-combination operator from blue/include/ITriConstants.h. */
export const TriOperator = Object.freeze({
    TRIOP_MULTIPLY: 0,
    TRIOP_ADD: 1,
    TRIOP_AVERAGE: 2
});

/** Trinity transform-parameter base frame from blue/include/ITriConstants.h. */
export const TriTransformBase = Object.freeze({
    TRITB_OBJECT: 0,
    TRITB_CAMERA_ROTATION: 1,
    TRITB_CAMERA_TRANSLATION: 2,
    TRITB_CAMERA: 3,
    TRITB_CAMERA_ROTATION_ALIGNED: 4,
    TRITB_FIXED: 5,
    TRITB_CAMERA_ROTATION_FALLOFF: 6,
    TRITB_CAMERA_ROTATION_ALIGNED_SYMMETRY: 7,
    TRITB_CAMERA_ROTATION_FALLOFF_SYMMETRY: 8,
    TRITB_BOOSTER: 9,
    TRITB_SIMPLE_HALO: 10,
    TRITB_SIMPLE_HALO_SYMMETRY: 11,
    TRITB_BOOSTER_FALLOFF: 12,
    TRITB_WORLD: 13,
    TRITB_SIMPLE_HALO_FALLOFF: 14,
    TRITB_SIMPLE_SPRITE: 15,
    TRITB_SIMPLE_SPRITE_FALLOFF: 16,
    TRITB_SIMPLE_SPRITE_CONSTANT: 17
});

// Carbon TRIEXTRAPOLATION (blue/include/ITriConstants.h:33) - curve
// extrapolation modes, shared by trinity curves (TriEventCurve) and audio
// (AudEventCurve). Class statics alias this export (TriOperator pattern).
export const TriExtrapolation = Object.freeze({
    TRIEXT_NONE: 0,
    TRIEXT_CONSTANT: 1,
    TRIEXT_GRADIENT: 2,
    TRIEXT_CYCLE: 3
});
