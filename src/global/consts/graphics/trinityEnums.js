import { blueEnums, EnumRegistrationType } from "../../blue/enums/CjsBlueEnumRegistry.js";
/** Global Trinity render-batch vocabulary from ITr2Renderable.h. */
export const TriBatchType = {
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
};

/** Trinity standard render-state selector from Shader/Tr2EffectStateManager.h.
 * Cross-layer: Trinity batches/accumulators and engine dispatch both
 * key on it. Distinct from TriBatchType (batch bucket) — a render-state mode.
 * Unscoped Carbon enum: values are sequential from RM_ANY = 0. */
export const RenderingMode = {
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
};

/** Shared EVE entity reflection vocabulary from EntityComponents. */
export const ReflectionMode = {
    REFLECT_HIGH: 0,
    REFLECT_MEDIUM_AND_HIGH: 1,
    REFLECT_LOW_MEDIUM_HIGH: 2,
    REFLECT_NEVER: 3
};

/** Trinity graph value-combination operator from blue/include/ITriConstants.h. */
export const TRIOPERATOR = {
    TRIOP_MULTIPLY: 0,
    TRIOP_ADD: 1,
    TRIOP_AVERAGE: 2
};

/** Trinity transform-parameter base frame from blue/include/ITriConstants.h. */
export const TRITRANSFORMBASE = Object.freeze({
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
// (AudEventCurve). Class statics alias this export (TRIOPERATOR pattern).
export const TRIEXTRAPOLATION = {
    TRIEXT_NONE: 0,
    TRIEXT_CONSTANT: 1,
    TRIEXT_GRADIENT: 2,
    TRIEXT_CYCLE: 3
};

/** Storage classes a device resource may be released from, Tr2DeviceResource.h:7-15.
 * A release takes a mask: VIDEOMEMORY for a device reset, MANAGEDMEMORY for
 * device-memory resources, ALL for teardown. Unscoped Carbon enum, so the
 * members carry their full names and their bit values. The mask parameter's
 * own type is Carbon's `typedef unsigned int TriStorage`; the enum is
 * `TriStorageFlags`. */
export const TriStorageFlags = Object.freeze({
    TRISTORAGE_VIDEOMEMORY: 1 << 0,
    TRISTORAGE_MANAGEDMEMORY: 1 << 1,
    TRISTORAGE_ALL: (1 << 2) - 1
});

/** Trinity shader model from Tr2Renderer.h:14-26. Shared: the renderer, the
 * scene driver, boosters, child containers and controller expressions
 * (ShaderQuality) all key on it. */
export const TR2SHADERMODEL = Object.freeze({
    TR2SM_1_1: 0,
    TR2SM_2_0_LO: 1,
    TR2SM_2_0_HI: 2,
    TR2SM_3_0_LO: 3,
    TR2SM_3_0_HI: 4,
    TR2SM_3_0_DEPTH: 5,
    TR2SM_AUTHORING: 6,
    TR2SM_COUNT: 7
});


/** `Tr2ALMemoryType` (`Tr2DeviceResourceAL.h:5-9`). A bit set, not an enum. */
export const Tr2ALMemoryType = Object.freeze({
  /** Created in video memory. */
  AL_MEMORY_VIDEO: 1 << 0,

  /** Created in device-managed memory. */
  AL_MEMORY_MANAGED: 1 << 1
});

// Definition-site Blue registration preserves Carbon chooser order and exposure.

blueEnums.Create("trinity.EntityComponents.ReflectionMode", ReflectionMode, {
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
// Blue's ITriConstants.h enums, shared by audio and Trinity. Neither is
// registered; the choosers are Trinity's (audio's AudConstants.cpp:6 copy of
// TriExtrapolation is identical).
blueEnums.Create("blue.TRIEXTRAPOLATION", TRIEXTRAPOLATION, {
  source: "blue/include/ITriConstants.h", family: "blue", line: 33,
  chooserSource: "trinity/trinity/TriConstants.cpp:94",
  chooser: [
    { name: "TRIEXT_NONE", value: TRIEXTRAPOLATION.TRIEXT_NONE, description: "no comment" },
    { name: "TRIEXT_CONSTANT", value: TRIEXTRAPOLATION.TRIEXT_CONSTANT, description: "no comment" },
    { name: "TRIEXT_GRADIENT", value: TRIEXTRAPOLATION.TRIEXT_GRADIENT, description: "no comment" },
    { name: "TRIEXT_CYCLE", value: TRIEXTRAPOLATION.TRIEXT_CYCLE, description: "no comment" }
  ]
});

blueEnums.Create("blue.TRIOPERATOR", TRIOPERATOR, {
  source: "blue/include/ITriConstants.h", family: "blue", line: 80,
  chooserSource: "trinity/trinity/TriConstants.cpp:185",
  chooser: [
    { name: "TRIOP_MULTIPLY", value: TRIOPERATOR.TRIOP_MULTIPLY, description: "multiply" },
    { name: "TRIOP_ADD", value: TRIOPERATOR.TRIOP_ADD, description: "add" },
    { name: "TRIOP_AVERAGE", value: TRIOPERATOR.TRIOP_AVERAGE, description: "average" }
  ]
});
// Registered as Carbon registers it (trinity/trinity/RenderJob/TriStepSetStandardRenderStates_Blue.cpp:23).
blueEnums.Create("trinity.Tr2EffectStateManager.RenderingMode", RenderingMode, {
  source: "trinity/trinity/Shader/Tr2EffectStateManager.h", family: "trinity", line: 59,
  exposedName: "RENDERING_MODE", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/RenderJob/TriStepSetStandardRenderStates_Blue.cpp:9",
  chooser: [
    { name: "RM_OPAQUE", value: RenderingMode.RM_OPAQUE, description: "Opaque rendering" },
    { name: "RM_DECAL", value: RenderingMode.RM_DECAL, description: "Decal rendering" },
    { name: "RM_DECAL_NO_DEPTH", value: RenderingMode.RM_DECAL_NO_DEPTH, description: "Decal rendering (Normals Only)" },
    { name: "RM_ALPHA", value: RenderingMode.RM_ALPHA, description: "Alpha-blended rendering" },
    { name: "RM_ALPHA_ADDITIVE", value: RenderingMode.RM_ALPHA_ADDITIVE, description: "Additive rendering" },
    { name: "RM_DEPTH_ONLY", value: RenderingMode.RM_DEPTH_ONLY, description: "Depth-only rendering" },
    { name: "RM_PICKING", value: RenderingMode.RM_PICKING, description: "Rendering for picking" },
    { name: "RM_FULLSCREEN", value: RenderingMode.RM_FULLSCREEN, description: "Full-screen effects (2D) rendering" },
    { name: "RM_SPRITE2D", value: RenderingMode.RM_SPRITE2D, description: "2D sprite rendering" }
  ]
});
// Carbon neither registers this nor gives it a chooser.
blueEnums.Create("trinity.TriBatchType", TriBatchType, {
  source: "trinity/trinity/ITr2Renderable.h", family: "trinity", line: 18
});
