import { blueEnums, EnumRegistrationType } from "../../../blue/blue/enums/CjsBlueEnumRegistry.js";
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

/** Blue's D3D render-state constants (TriConstants.cpp:304, exported to Python as module constants). Values are Tr2RenderContextEnum render states. */
export const TriD3DRenderState = Object.freeze({
    D3DRS_ZENABLE: 7,
    D3DRS_FILLMODE: 8,
    D3DRS_ZWRITEENABLE: 14,
    D3DRS_SRCBLEND: 19,
    D3DRS_DESTBLEND: 20,
    D3DRS_CULLMODE: 22,
    D3DRS_ZFUNC: 23,
    D3DRS_ALPHABLENDENABLE: 27,
    D3DRS_STENCILENABLE: 52,
    D3DRS_STENCILFAIL: 53,
    D3DRS_STENCILZFAIL: 54,
    D3DRS_STENCILPASS: 55,
    D3DRS_STENCILFUNC: 56,
    D3DRS_STENCILREF: 57,
    D3DRS_STENCILMASK: 58,
    D3DRS_STENCILWRITEMASK: 59,
    D3DRS_COLORWRITEENABLE: 168,
    D3DRS_BLENDOP: 171,
    D3DRS_SLOPESCALEDEPTHBIAS: 175,
    D3DRS_TWOSIDEDSTENCILMODE: 185,
    D3DRS_CCW_STENCILFAIL: 186,
    D3DRS_CCW_STENCILZFAIL: 187,
    D3DRS_CCW_STENCILPASS: 188,
    D3DRS_CCW_STENCILFUNC: 189,
    D3DRS_SRGBWRITEENABLE: 194,
    D3DRS_DEPTHBIAS: 195,
    D3DRS_SEPARATEALPHABLENDENABLE: 206,
    D3DRS_SRCBLENDALPHA: 207,
    D3DRS_DESTBLENDALPHA: 208,
    D3DRS_BLENDOPALPHA: 209
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

// Source: trinity/trinity/Eve/EveEntity.h
blueEnums.Create("trinity.EntityComponents.ReflectionMode", ReflectionMode, {
  exposedName: "ReflectionModeType", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooser: [
    { name: "Never", value: ReflectionMode.REFLECT_NEVER, description: "Never render into the reflection map" },
    { name: "LowMediumAndHigh", value: ReflectionMode.REFLECT_LOW_MEDIUM_HIGH, description: "Render into the reflection map when reflection settings is set to low, medium or high" },
    { name: "MediumAndHigh", value: ReflectionMode.REFLECT_MEDIUM_AND_HIGH, description: "Render into the reflection map when reflection settings is set to medium or high" },
    { name: "High", value: ReflectionMode.REFLECT_HIGH, description: "Only render into the reflection map when reflection settings is set to high" }
  ]
});
// Enums both the SOF and the Trinity layers name: the layers may not import each other, so they live here (as ReflectionMode does).
/**
 * `SOFDataFactionColorChooser::ColorType` (EveSOFData.h:177-224); TYPE_MAX is the slot count.
 * @type {Object<string, number>}
 */
export const ColorType = {
  TYPE_PRIMARY: 0,
  TYPE_SECONDARY: 1,
  TYPE_TERTIARY: 2,
  TYPE_BLACK: 3,
  TYPE_WHITE: 4,
  TYPE_YELLOW: 5,
  TYPE_ORANGE: 6,
  TYPE_RED: 7,
  TYPE_BLUE: 8,
  TYPE_GREEN: 9,
  TYPE_CYAN: 10,
  TYPE_FIRE: 11,
  TYPE_HULL: 12,
  TYPE_GLASS: 13,
  TYPE_REACTOR: 14,
  TYPE_DARKHULL: 15,
  TYPE_BOOSTER: 16,
  TYPE_KILLMARK: 17,
  TYPE_PRIMARY_LIGHT: 18,
  TYPE_SECONDARY_LIGHT: 19,
  TYPE_TERTIARY_LIGHT: 20,
  TYPE_WHITE_LIGHT: 21,
  TYPE_PRIMARY_HOLOGRAM: 22,
  TYPE_SECONDARY_HOLOGRAM: 23,
  TYPE_TERTIARY_HOLOGRAM: 24,
  TYPE_STATE_0: 25,
  TYPE_STATE_1: 26,
  TYPE_STATE_2: 27,
  TYPE_STATE_3: 28,
  TYPE_STATE_VULNERABLE: 29,
  TYPE_STATE_INVULNERABLE: 30,
  TYPE_PRIMARY_FORCEFIELD: 31,
  TYPE_SECONDARY_FORCEFIELD: 32,
  TYPE_PRIMARY_BANNER: 33,
  TYPE_PRIMARY_FX: 34,
  TYPE_SECONDARY_FX: 35,
  TYPE_PRIMARY_SPOTLIGHT: 36,
  TYPE_SECONDARY_SPOTLIGHT: 37,
  TYPE_TERTIARY_SPOTLIGHT: 38,
  TYPE_PRIMARY_BILLBOARD: 39,
  TYPE_PRIMARY_WARP_FX: 40,
  TYPE_PRIMARY_ATTACK_FX: 41,
  TYPE_PRIMARY_SIEGE_FX: 42,
  TYPE_PRIMARY_DOCKED_FX: 43,
  TYPE_MAX: 44
};

// Native chooser labels and descriptions are distinct from C++ member names.
blueEnums.Create("trinity.SOFDataFactionColorChooser.ColorType", ColorType, {
  exposedName: "EveSOFDataFactionColorSetType", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooser: [
    { name: "Primary", value: ColorType.TYPE_PRIMARY, description: "Primary Color" },
    { name: "Secondary", value: ColorType.TYPE_SECONDARY, description: "Secondary Color" },
    { name: "Tertiary", value: ColorType.TYPE_TERTIARY, description: "Tertiary Color" },
    { name: "Black", value: ColorType.TYPE_BLACK, description: "Black Color" },
    { name: "White", value: ColorType.TYPE_WHITE, description: "White" },
    { name: "Yellow", value: ColorType.TYPE_YELLOW, description: "Yellow" },
    { name: "Orange", value: ColorType.TYPE_ORANGE, description: "Orange" },
    { name: "Red", value: ColorType.TYPE_RED, description: "Red" },
    { name: "Blue", value: ColorType.TYPE_BLUE, description: "Blue" },
    { name: "Green", value: ColorType.TYPE_GREEN, description: "Green" },
    { name: "Cyan", value: ColorType.TYPE_CYAN, description: "Cyan" },
    { name: "Fire", value: ColorType.TYPE_FIRE, description: "Fire" },
    { name: "Hull", value: ColorType.TYPE_HULL, description: "Material Hullarea Glow" },
    { name: "Glass", value: ColorType.TYPE_GLASS, description: "Material Glassarea Glow" },
    { name: "Reactor", value: ColorType.TYPE_REACTOR, description: "Material Reactorarea Glow" },
    { name: "Darkhull", value: ColorType.TYPE_DARKHULL, description: "Material Darkhull Glow" },
    { name: "Booster", value: ColorType.TYPE_BOOSTER, description: "Material Hullarea Heat Shimmer Glow" },
    { name: "Killmark", value: ColorType.TYPE_KILLMARK, description: "Killmark glow color" },
    { name: "PrimaryLight", value: ColorType.TYPE_PRIMARY_LIGHT, description: "Primary light color" },
    { name: "SecondaryLight", value: ColorType.TYPE_SECONDARY_LIGHT, description: "Secondary light color" },
    { name: "TertiaryLight", value: ColorType.TYPE_TERTIARY_LIGHT, description: "Tertiary light color" },
    { name: "WhiteLight", value: ColorType.TYPE_WHITE_LIGHT, description: "White light color" },
    { name: "PrimaryHologram", value: ColorType.TYPE_PRIMARY_HOLOGRAM, description: "Primary Hologram" },
    { name: "SecondaryHologram", value: ColorType.TYPE_SECONDARY_HOLOGRAM, description: "Secondary Hologram color" },
    { name: "TertiaryHologram", value: ColorType.TYPE_TERTIARY_HOLOGRAM, description: "Tertiary Hologram color" },
    { name: "State0", value: ColorType.TYPE_STATE_0, description: "State 0 color" },
    { name: "State1", value: ColorType.TYPE_STATE_1, description: "State 1 color" },
    { name: "State2", value: ColorType.TYPE_STATE_2, description: "State 2 color" },
    { name: "State3", value: ColorType.TYPE_STATE_3, description: "State 3 color" },
    { name: "StateVulnerable", value: ColorType.TYPE_STATE_VULNERABLE, description: "State Vulnerable color" },
    { name: "StateInvulnerable", value: ColorType.TYPE_STATE_INVULNERABLE, description: "State Invulnerable color" },
    { name: "PrimaryForcefield", value: ColorType.TYPE_PRIMARY_FORCEFIELD, description: "Primary Forcefield color" },
    { name: "SecondaryForcefield", value: ColorType.TYPE_SECONDARY_FORCEFIELD, description: "Secondary Forcefield color" },
    { name: "PrimaryBanner", value: ColorType.TYPE_PRIMARY_BANNER, description: "Primary Banner color" },
    { name: "PrimaryFx", value: ColorType.TYPE_PRIMARY_FX, description: "Primary Fx color" },
    { name: "SecondaryFx", value: ColorType.TYPE_SECONDARY_FX, description: "Secondary Fx color" },
    { name: "PrimarySpotlight", value: ColorType.TYPE_PRIMARY_SPOTLIGHT, description: "Primary spotlight color" },
    { name: "SecondarySpotlight", value: ColorType.TYPE_SECONDARY_SPOTLIGHT, description: "Secondary spotlight color" },
    { name: "TertiarySpotlight", value: ColorType.TYPE_TERTIARY_SPOTLIGHT, description: "Tertiary spotlight color" },
    { name: "PrimaryBillboard", value: ColorType.TYPE_PRIMARY_BILLBOARD, description: "Primary Billboard color" },
    { name: "PrimaryWarpFx", value: ColorType.TYPE_PRIMARY_WARP_FX, description: "Primary Warp FX color" },
    { name: "PrimaryAttackFX", value: ColorType.TYPE_PRIMARY_ATTACK_FX, description: "Primary Attack FX color" },
    { name: "PrimarySiegeFX", value: ColorType.TYPE_PRIMARY_SIEGE_FX, description: "Primary Siege FX color" },
    { name: "PrimaryDockedFX", value: ColorType.TYPE_PRIMARY_DOCKED_FX, description: "Primary Docked FX color" }
  ]
});

/**
 * Carbon's `Tr2LightFlagChooser`, registered as the BlueEnum object `Tr2LightFlags` (Tr2Light_Blue.cpp:16-21). Its members are the
 * chooser's keys and its values Tr2LightManager's flag bits (Tr2LightManager.h:100-101); the light classes and SOF's light-set item
 * both name it, so it lives here. Every light's `flags` member names it as its chooser.
 */
export const Tr2LightFlags = Object.freeze({
  AFFECTS_SURFACES: 1,
  AFFECTS_PARTICLES: 1 << 1
});

// BLUE_REGISTER_ENUM_EX( "Tr2LightFlags", uint16_t, Tr2LightFlagChooser, ENUM_REG_ENUM_OBJECT_ON_MODULE ) (Tr2Light_Blue.cpp:16-21).
blueEnums.Create("trinity.Tr2LightFlags", Tr2LightFlags, {
  exposedName: "Tr2LightFlags", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooser: [
    { name: "AFFECTS_SURFACES", value: Tr2LightFlags.AFFECTS_SURFACES, description: "Affects surfaces" },
    { name: "AFFECTS_PARTICLES", value: Tr2LightFlags.AFFECTS_PARTICLES, description: "Affects lit particles" }
  ]
});

// Blue's ITriConstants.h enums, shared by audio and Trinity. Neither is
// registered; the choosers are Trinity's (audio's AudConstants.cpp:6 copy of
// TriExtrapolation is identical).
// Source: blue/include/ITriConstants.h
blueEnums.Create("blue.TRIEXTRAPOLATION", TRIEXTRAPOLATION, {
  chooser: [
    { name: "TRIEXT_NONE", value: TRIEXTRAPOLATION.TRIEXT_NONE, description: "no comment" },
    { name: "TRIEXT_CONSTANT", value: TRIEXTRAPOLATION.TRIEXT_CONSTANT, description: "no comment" },
    { name: "TRIEXT_GRADIENT", value: TRIEXTRAPOLATION.TRIEXT_GRADIENT, description: "no comment" },
    { name: "TRIEXT_CYCLE", value: TRIEXTRAPOLATION.TRIEXT_CYCLE, description: "no comment" }
  ]
});

// Neither TriConstants.cpp table is registered by Carbon; the choosers feed Python constants only.
// Source: trinity/trinity/TriConstants.cpp:304
blueEnums.Create("blue.TriD3DRenderState", TriD3DRenderState, {
  chooser: [
    { name: "D3DRS_ZENABLE", value: TriD3DRenderState.D3DRS_ZENABLE, description: "Depth-buffering state as one member of the ZBUFFERTYPE enumerated type.\nSet this state to ZB_TRUE to enable z-buffering, ZB_USEW to enable\nw-buffering, or ZB_FALSE to disable depth buffering. The default value\nfor this render state is ZB_TRUE if a depth stencil was created along\nwith the swap chain by setting the EnableAutoDepthStencil member of the\nPRESENT_PARAMETERS structure to TRUE, and ZB_FALSE otherwise." },
    { name: "D3DRS_FILLMODE", value: TriD3DRenderState.D3DRS_FILLMODE, description: "One or more members of the FILLMODE enumerated type.\nThe default value is FILL_SOLID." },
    { name: "D3DRS_ZWRITEENABLE", value: TriD3DRenderState.D3DRS_ZWRITEENABLE, description: "" },
    { name: "D3DRS_SRCBLEND", value: TriD3DRenderState.D3DRS_SRCBLEND, description: "" },
    { name: "D3DRS_DESTBLEND", value: TriD3DRenderState.D3DRS_DESTBLEND, description: "" },
    { name: "D3DRS_CULLMODE", value: TriD3DRenderState.D3DRS_CULLMODE, description: "" },
    { name: "D3DRS_ZFUNC", value: TriD3DRenderState.D3DRS_ZFUNC, description: "" },
    { name: "D3DRS_ALPHABLENDENABLE", value: TriD3DRenderState.D3DRS_ALPHABLENDENABLE, description: "" },
    { name: "D3DRS_STENCILENABLE", value: TriD3DRenderState.D3DRS_STENCILENABLE, description: "" },
    { name: "D3DRS_STENCILFAIL", value: TriD3DRenderState.D3DRS_STENCILFAIL, description: "" },
    { name: "D3DRS_STENCILZFAIL", value: TriD3DRenderState.D3DRS_STENCILZFAIL, description: "" },
    { name: "D3DRS_STENCILPASS", value: TriD3DRenderState.D3DRS_STENCILPASS, description: "" },
    { name: "D3DRS_STENCILFUNC", value: TriD3DRenderState.D3DRS_STENCILFUNC, description: "" },
    { name: "D3DRS_STENCILREF", value: TriD3DRenderState.D3DRS_STENCILREF, description: "" },
    { name: "D3DRS_STENCILMASK", value: TriD3DRenderState.D3DRS_STENCILMASK, description: "" },
    { name: "D3DRS_STENCILWRITEMASK", value: TriD3DRenderState.D3DRS_STENCILWRITEMASK, description: "" },
    { name: "D3DRS_COLORWRITEENABLE", value: TriD3DRenderState.D3DRS_COLORWRITEENABLE, description: "" },
    { name: "D3DRS_BLENDOP", value: TriD3DRenderState.D3DRS_BLENDOP, description: "" },
    { name: "D3DRS_SLOPESCALEDEPTHBIAS", value: TriD3DRenderState.D3DRS_SLOPESCALEDEPTHBIAS, description: "" },
    { name: "D3DRS_TWOSIDEDSTENCILMODE", value: TriD3DRenderState.D3DRS_TWOSIDEDSTENCILMODE, description: "" },
    { name: "D3DRS_CCW_STENCILFAIL", value: TriD3DRenderState.D3DRS_CCW_STENCILFAIL, description: "" },
    { name: "D3DRS_CCW_STENCILZFAIL", value: TriD3DRenderState.D3DRS_CCW_STENCILZFAIL, description: "" },
    { name: "D3DRS_CCW_STENCILPASS", value: TriD3DRenderState.D3DRS_CCW_STENCILPASS, description: "" },
    { name: "D3DRS_CCW_STENCILFUNC", value: TriD3DRenderState.D3DRS_CCW_STENCILFUNC, description: "" },
    { name: "D3DRS_SRGBWRITEENABLE", value: TriD3DRenderState.D3DRS_SRGBWRITEENABLE, description: "" },
    { name: "D3DRS_DEPTHBIAS", value: TriD3DRenderState.D3DRS_DEPTHBIAS, description: "" },
    { name: "D3DRS_SEPARATEALPHABLENDENABLE", value: TriD3DRenderState.D3DRS_SEPARATEALPHABLENDENABLE, description: "" },
    { name: "D3DRS_SRCBLENDALPHA", value: TriD3DRenderState.D3DRS_SRCBLENDALPHA, description: "" },
    { name: "D3DRS_DESTBLENDALPHA", value: TriD3DRenderState.D3DRS_DESTBLENDALPHA, description: "" },
    { name: "D3DRS_BLENDOPALPHA", value: TriD3DRenderState.D3DRS_BLENDOPALPHA, description: "" }
  ]
});

// Source: trinity/trinity/TriConstants.cpp:111
blueEnums.Create("blue.TRITRANSFORMBASE", TRITRANSFORMBASE, {
  chooser: [
    { name: "TRITB_OBJECT", value: TRITRANSFORMBASE.TRITB_OBJECT, description: "This makes TriTransforms build hierachies as expected, that is a child inherits its parent transforms.\r\n.For TriTextures this is mosly usefull for projecting textures from objects" },
    { name: "TRITB_CAMERA_ROTATION", value: TRITRANSFORMBASE.TRITB_CAMERA_ROTATION, description: "This sets the inverted rotation part of the camera matrix as the base for thetransformations be they texture or transforms, good for environment maps andnormal projected cubemaps." },
    { name: "TRITB_CAMERA_TRANSLATION", value: TRITRANSFORMBASE.TRITB_CAMERA_TRANSLATION, description: "This sets the inverted translation part of the camera matrix as the base for thetransformations be they texture or transforms, good for geometry that is locked,to the camera, like nebulas and starfields, etc." },
    { name: "TRITB_CAMERA", value: TRITRANSFORMBASE.TRITB_CAMERA, description: "This sets the inverted camera matrix as the base for the transformationsbe they texture or geometry transforms, basically the same, as TRITB_CAMERA_ROTATION except the translation is taken also" },
    { name: "TRITB_CAMERA_ROTATION_ALIGNED", value: TRITRANSFORMBASE.TRITB_CAMERA_ROTATION_ALIGNED, description: "Makes the transform face the camera at all times, used for billboarding.The up direction of the billboard is preserved." },
    { name: "TRITB_CAMERA_ROTATION_ALIGNED_SYMMETRY", value: TRITRANSFORMBASE.TRITB_CAMERA_ROTATION_ALIGNED_SYMMETRY, description: "Makes the transform face the camera at all times, used for billboarding,the rotation around the axis to the camera is not corrected, hence thisshould only be used for rotationally symmetric billboards." },
    { name: "TRITB_CAMERA_ROTATION_FALLOFF", value: TRITRANSFORMBASE.TRITB_CAMERA_ROTATION_FALLOFF, description: "Same as TRITB_CAMERA_ROTATION_ALIGNED, except the billboard is scaledby distance. This is useful for lights that are not rotationally symmetric." },
    { name: "TRITB_CAMERA_ROTATION_FALLOFF_SYMMETRY", value: TRITRANSFORMBASE.TRITB_CAMERA_ROTATION_FALLOFF_SYMMETRY, description: "Same as TRITB_CAMERA_ROTATION_ALIGNED_SYMMETRY, except the billboard is scaledby distance. This is useful for lights that are rotationally symmetric." },
    { name: "TRITB_BOOSTER", value: TRITRANSFORMBASE.TRITB_BOOSTER, description: "Makes the sprite behave as if it were an ellipsoid" },
    { name: "TRITB_SIMPLE_HALO", value: TRITRANSFORMBASE.TRITB_SIMPLE_HALO, description: "Ask Torfi" },
    { name: "TRITB_SIMPLE_HALO_FALLOFF", value: TRITRANSFORMBASE.TRITB_SIMPLE_HALO_FALLOFF, description: "Ask Torfi" },
    { name: "TRITB_SIMPLE_HALO_SYMMETRY", value: TRITRANSFORMBASE.TRITB_SIMPLE_HALO_SYMMETRY, description: "Ask Torfi" },
    { name: "TRITB_SIMPLE_SPRITE", value: TRITRANSFORMBASE.TRITB_SIMPLE_SPRITE, description: "Ask Torfi" },
    { name: "TRITB_SIMPLE_SPRITE_FALLOFF", value: TRITRANSFORMBASE.TRITB_SIMPLE_SPRITE_FALLOFF, description: "Ask Torfi" },
    { name: "TRITB_SIMPLE_SPRITE_CONSTANT", value: TRITRANSFORMBASE.TRITB_SIMPLE_SPRITE_CONSTANT, description: "Don't ask Torfi" },
    { name: "TRITB_FIXED", value: TRITRANSFORMBASE.TRITB_FIXED, description: "This placed traditionally called world-space, the transform is considered to be in the world cordinate system (object hierarchies are ignored)This leves the texture space untouched (set to the identity matrix)." },
    { name: "TRITB_BOOSTER_FALLOFF", value: TRITRANSFORMBASE.TRITB_BOOSTER_FALLOFF, description: "Makes the sprite behave as if it were an ellipsoid, includes falloff" },
    { name: "TRITB_WORLD", value: TRITRANSFORMBASE.TRITB_WORLD, description: "Transforms the object relative to the world zero " }
  ]
});

/** Blue's texture-path chooser (TriConstants.cpp:79): one entry whose description is the file-dialog filter. */
export const TriTextureChooser = Object.freeze({
    SELECT_TEXTURE: 0
});

/** Blue's Granny/CMF model-path chooser (TriConstants.cpp:87): one entry whose description is the file-dialog filter. */
export const TriGR2Chooser = Object.freeze({
    SELECT_GR2MODEL: 0
});

// Source: trinity/trinity/TriConstants.cpp:79
blueEnums.Create("blue.TriTextureChooser", TriTextureChooser, {
  chooser: [
    { name: "SELECT_TEXTURE", value: TriTextureChooser.SELECT_TEXTURE, description: "Texture (.dds, .tga, .bmp)|*.dds;*.tga;*.bmp;|All Files (*.*)|*.*" }
  ]
});

// Source: trinity/trinity/TriConstants.cpp:87
blueEnums.Create("blue.TriGR2Chooser", TriGR2Chooser, {
  chooser: [
    { name: "SELECT_GR2MODEL", value: TriGR2Chooser.SELECT_GR2MODEL, description: "Granny/CMF file(.gr2, .cmf)|*.GR2;*.CMF|All Files (*.*)|*.*" }
  ]
});

// Source: blue/include/ITriConstants.h
blueEnums.Create("blue.TRIOPERATOR", TRIOPERATOR, {
  chooser: [
    { name: "TRIOP_MULTIPLY", value: TRIOPERATOR.TRIOP_MULTIPLY, description: "multiply" },
    { name: "TRIOP_ADD", value: TRIOPERATOR.TRIOP_ADD, description: "add" },
    { name: "TRIOP_AVERAGE", value: TRIOPERATOR.TRIOP_AVERAGE, description: "average" }
  ]
});
// Registered as Carbon registers it (trinity/trinity/RenderJob/TriStepSetStandardRenderStates_Blue.cpp:23).
// Source: trinity/trinity/Shader/Tr2EffectStateManager.h
blueEnums.Create("trinity.Tr2EffectStateManager.RenderingMode", RenderingMode, {
  exposedName: "RENDERING_MODE", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
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
// Source: trinity/trinity/ITr2Renderable.h
blueEnums.Create("trinity.TriBatchType", TriBatchType);
