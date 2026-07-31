const publicExport = "`@carbonenginejs/runtime-character`";

const carbonEngineJs = [
    ["CjsCharacterBlendshapeLimits", "src/deformation/CjsCharacterBlendshapeLimits.js"],
    ["CjsCharacterBonePose", "src/deformation/CjsCharacterBonePose.js"],
    ["CjsCharacterCapabilityCoverage", "src/parts/CjsCharacterCapabilityCoverage.js"],
    ["CjsCharacterCapabilityRequirement", "src/parts/CjsCharacterCapabilityRequirement.js"],
    ["CjsCharacterControlApplicator", "src/controls/CjsCharacterControlApplicator.js"],
    ["CjsCharacterControlBinding", "src/controls/CjsCharacterControlBinding.js"],
    ["CjsCharacterControlLayer", "src/controls/CjsCharacterControlLayer.js"],
    ["CjsCharacterControlState", "src/controls/CjsCharacterControlState.js"],
    ["CjsCharacterDependency", "src/library/CjsCharacterDependency.js"],
    ["CjsCharacterFaceAnimationProfile", "src/face/CjsCharacterFaceAnimationProfile.js"],
    ["CjsCharacterFaceAnimationSetting", "src/face/CjsCharacterFaceAnimationSetting.js"],
    ["CjsCharacterFaceControls", "src/face/CjsCharacterFaceControls.js"],
    ["CjsCharacterFaceSetup", "src/face/CjsCharacterFaceSetup.js"],
    ["CjsCharacterFaceTweakSettings", "src/face/CjsCharacterFaceTweakSettings.js"],
    ["CjsCharacterGraph", "src/library/CjsCharacterGraph.js"],
    ["CjsCharacterGStateParameterSink", "src/controls/CjsCharacterGStateParameterSink.js"],
    ["CjsCharacterLibrary", "src/library/CjsCharacterLibrary.js"],
    ["CjsCharacterLibraryData", "src/library/CjsCharacterLibraryData.js"],
    ["CjsCharacterLibrarySource", "src/library/CjsCharacterLibrarySource.js"],
    ["CjsCharacterLodBundle", "src/parts/CjsCharacterLodBundle.js"],
    ["CjsCharacterLodCapability", "src/parts/CjsCharacterLodCapability.js"],
    ["CjsCharacterLodController", "src/parts/CjsCharacterLodController.js"],
    ["CjsCharacterMaterial", "src/parts/CjsCharacterMaterial.js"],
    ["CjsCharacterMeshCapability", "src/parts/CjsCharacterMeshCapability.js"],
    ["CjsCharacterModifierNames", "src/face/CjsCharacterModifierNames.js"],
    ["CjsCharacterModifierNameSet", "src/face/CjsCharacterModifierNameSet.js"],
    ["CjsCharacterMorphTargetSink", "src/controls/CjsCharacterMorphTargetSink.js"],
    ["CjsCharacterNode", "src/CjsCharacterNode.js"],
    ["CjsCharacterPartAuthoring", "src/parts/CjsCharacterPartAuthoring.js"],
    ["CjsCharacterPartDefinition", "src/parts/CjsCharacterPartDefinition.js"],
    ["CjsCharacterPartMetadata", "src/parts/CjsCharacterPartMetadata.js"],
    ["CjsCharacterPose", "src/deformation/CjsCharacterPose.js"],
    ["CjsCharacterPresentation", "src/library/CjsCharacterPresentation.js"],
    ["CjsCharacterProjection", "src/deformation/CjsCharacterProjection.js"],
    ["CjsCharacterRecipe", "src/recipes/CjsCharacterRecipe.js"],
    ["CjsCharacterRecipeEntry", "src/recipes/CjsCharacterRecipeEntry.js"],
    ["CjsCharacterRecipeLink", "src/recipes/CjsCharacterRecipeLink.js"],
    ["CjsCharacterRecipeLinkSet", "src/recipes/CjsCharacterRecipeLinkSet.js"],
    ["CjsCharacterRecipeResolution", "src/recipes/CjsCharacterRecipeResolution.js"],
    ["CjsCharacterResolutionIssue", "src/recipes/CjsCharacterResolutionIssue.js"],
    ["CjsCharacterResolvedPart", "src/parts/CjsCharacterResolvedPart.js"],
    ["CjsCharacterResolvedRule", "src/recipes/CjsCharacterResolvedRule.js"],
    ["CjsCharacterResourceSet", "src/parts/CjsCharacterResourceSet.js"],
    ["CjsCharacterRigBinding", "src/controls/CjsCharacterRigBinding.js"],
    ["CjsCharacterSculptField", "src/deformation/CjsCharacterSculptField.js"],
    ["CjsCharacterSculptTriangle", "src/deformation/CjsCharacterSculptTriangle.js"],
    ["CjsCharacterSculptVertex", "src/deformation/CjsCharacterSculptVertex.js"],
    ["CjsCharacterUniqueCharacter", "src/library/CjsCharacterUniqueCharacter.js"],
    ["CjsCharacterViseme", "src/face/CjsCharacterViseme.js"],
    ["CjsCharacterVisemeFrame", "src/face/CjsCharacterVisemeFrame.js"],
    ["CjsCharacterVisemeSet", "src/face/CjsCharacterVisemeSet.js"],
    ["CjsCharacterVisemeTimeline", "src/face/CjsCharacterVisemeTimeline.js"]
];

const adaptedCarbon = [
    ["Tr2GStateAnimation", "src/trinity/trinityCore/Tr2GStateAnimation.js"],
    ["Tr2GStateParameter", "src/trinity/trinityCore/Tr2GStateParameter.js"],
    ["Tr2InteriorLightSet", "src/trinity/interior/Tr2InteriorLightSet.js"],
    ["Tr2InteriorLightSource", "src/trinity/interior/Tr2InteriorLightSource.js"],
    ["Tr2InteriorPerLightPSData", "src/trinity/interior/Tr2InteriorPerLightPSData.js"],
    ["Tr2InteriorPerObjectLightData", "src/trinity/interior/Tr2InteriorPerObjectLightData.js"],
    ["Tr2InteriorPerObjectPSData", "src/trinity/interior/Tr2InteriorPerObjectPSData.js"],
    ["Tr2InteriorPerObjectVSData", "src/trinity/interior/Tr2InteriorPerObjectVSData.js"],
    ["Tr2InteriorPlaceable", "src/trinity/interior/Tr2InteriorPlaceable.js"],
    ["Tr2InteriorScene", "src/trinity/interior/Tr2InteriorScene.js"],
    ["Tr2IntKeyGenerator", "src/trinity/interior/Tr2IntKeyGenerator.js"],
    ["Tr2IntSkinnedObject", "src/trinity/interior/Tr2IntSkinnedObject.js"],
    ["Tr2Model", "src/trinity/trinityCore/Tr2Model.js"],
    ["Tr2PerObjectParticleVSData", "src/trinity/interior/Tr2PerObjectParticleVSData.js"],
    ["Tr2SkinnedModel", "src/trinity/trinityCore/Tr2SkinnedModel.js"],
    ["Tr2SkinnedObject", "src/trinity/trinityCore/Tr2SkinnedObject.js"],
    ["Tr2SkinnedObjectLod", "src/trinity/trinityCore/Tr2SkinnedObjectLod.js"],
    ["WodBakingScene", "src/trinity/wod/WodBakingScene.js"]
];

const droppedCarbon = [
    ["TriMatrix", "src/dropped/TriMatrix.js"]
];

export const classCatalogMetadata = [
    ...carbonEngineJs.map(([name, source]) => ({
        name,
        source,
        visibility: "Public",
        export: publicExport,
        kind: "CarbonEngineJS"
    })),
    ...adaptedCarbon.map(([name, source]) => ({
        name,
        source,
        visibility: "Public",
        export: publicExport,
        kind: "Adapted Carbon class"
    })),
    ...droppedCarbon.map(([name, source]) => ({
        name,
        source,
        visibility: "Internal",
        export: "None",
        kind: "Dropped Carbon schema class"
    }))
];
