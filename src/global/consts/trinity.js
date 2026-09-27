// Source: trinity/trinity/Resources/Tr2LodResource.h

/**
 * Shared Trinity level-of-detail values.
 */
export const Tr2Lod = Object.freeze({
    TR2_LOD_UNSPECIFIED: -1,
    TR2_LOD_LOW: 0,
    TR2_LOD_MEDIUM: 1,
    TR2_LOD_HIGH: 2,
    TR2_LOD_ULTRA: 3,
    TR2_LOD_COUNT: 4
});


// Source: every TRI_REGISTER_SETTING in trinity (TriSettingsRegistrar.h:13-14),
// 68 names; emulateDriverReset is registered by both TriDevice11 and TriDevice12.

/**
 * The names Carbon registers engine settings under. CjsSchema.edit.setting
 * records whether a setting is one of these.
 */
export const TriSettingNames = Object.freeze([
    "alphaCutoutShadowsEnabled",
    "bindlessRenderingEnabled",
    "buildDecalBuffers",
    "controllerFunctionOverrideEnabled",
    "controllerServerTime",
    "controllerShipMaxSpeed",
    "controllerShipSpeed",
    "cpuMaxParticleCount",
    "debugBoneLabelFont",
    "debugLODShader",
    "dynamicExposureQualityRequirement",
    "ellipseRibbonEffectPath",
    "emulateDriverReset",
    "enableMetalCounters",
    "enablePostProcessDebugging",
    "eveIsAudioOcclusionGeometryEnabled",
    "eveIsSpaceObjectResourceUnloadingEnabled",
    "eveReflectionSetting",
    "eveSpaceObjectImpactEffectEnabled",
    "eveSpaceObjectResourceUnloadingTimeThreshold",
    "eveSpaceObjectTrailsEnabled",
    "eveSpaceObjectTrailsMaxLength",
    "eveSpaceObjectTrailsMaxLengthFade",
    "eveSpaceObjectTrailsMinLength",
    "eveSpaceObjectTrailsMinLengthFade",
    "eveSpaceSceneDefaultReflectionIntensity",
    "eveSpaceSceneDynamicLighting",
    "eveSpaceSceneGammaBrightness",
    "eveSpaceSceneHighDetailThreshold",
    "eveSpaceSceneLODFactor",
    "eveSpaceSceneLowDetailThreshold",
    "eveSpaceSceneLowUpdateRate",
    "eveSpaceSceneMediumDetailThreshold",
    "eveSpaceSceneMediumUpdateRate",
    "eveSpaceSceneVisibilityThreshold",
    "expressionCurveFakeRandom",
    "fixFullscreenBehaviorForOldWindows",
    "forceAnisotropy",
    "frameGenDebugView",
    "frustumCullingDisabled",
    "gatherPipelineStatistics",
    "gdrEnabled",
    "generateMipsOnTextureLoad",
    "grannyDeprecationLevel",
    "imageWarnLoadTime",
    "lensflaresInReflections",
    "maxParticleCountCap",
    "newBloom",
    "newUpscalersEnabled",
    "postprocessDofEnabled",
    "preloadTextureToDeviceOnPrepare",
    "primitiveDistanceScaleMultiplier",
    "raytracingEnabled",
    "secondaryLightingRadiusCutoffFactor",
    "skinnedHighMediumMargin",
    "skinnedLowDetailThreshold",
    "skinnedMediumDetailThreshold",
    "skinnedMediumLowMargin",
    "streamlineAppID",
    "textureLoadRequests",
    "textureLodChanges",
    "textureLodCpuBudget",
    "textureLodGpuBudget",
    "textureLodSimulateDiskLatency",
    "unloadLODMaxFrametime",
    "upscalingDebugView",
    "useDynamicLightsShadows",
    "volumetricTrailPath"
]);
