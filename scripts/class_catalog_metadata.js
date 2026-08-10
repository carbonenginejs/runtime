const publicExport = "`@carbonenginejs/runtime-character`";

const carbonEngineJs = [
    ["CjsCharacterAncestry", "src/character/demographics/CjsCharacterAncestry.js"],
    ["CjsCharacterAppearanceBinding", "src/character/planning/CjsCharacterAppearanceBinding.js"],
    ["CjsCharacterAppearanceDiagnostic", "src/character/planning/CjsCharacterAppearanceDiagnostic.js"],
    ["CjsCharacterAppearanceLayer", "src/character/planning/CjsCharacterAppearanceLayer.js"],
    ["CjsCharacterAppearancePlan", "src/character/planning/CjsCharacterAppearancePlan.js"],
    ["CjsCharacterAppearanceResolver", "src/character/resolution/CjsCharacterAppearanceResolver.js"],
    ["CjsCharacterAppearanceSelection", "src/character/planning/CjsCharacterAppearanceSelection.js"],
    ["CjsCharacterArchetype", "src/character/activity/CjsCharacterArchetype.js"],
    ["CjsCharacterAvatarBehavior", "src/character/behavior/CjsCharacterAvatarBehavior.js"],
    ["CjsCharacterBindingAlpha", "src/character/planning/CjsCharacterBindingAlpha.js"],
    ["CjsCharacterBloodline", "src/character/demographics/CjsCharacterBloodline.js"],
    ["CjsCharacterColorValue", "src/character/catalog/CjsCharacterColorValue.js"],
    ["CjsCharacterColorLocation", "src/character/appearance/CjsCharacterColorLocation.js"],
    ["CjsCharacterColorName", "src/character/appearance/CjsCharacterColorName.js"],
    ["CjsCharacterColorSelection", "src/character/appearance/CjsCharacterColorSelection.js"],
    ["CjsCharacterCompositionInput", "src/character/planning/CjsCharacterCompositionInput.js"],
    ["CjsCharacterCompositionPass", "src/character/planning/CjsCharacterCompositionPass.js"],
    ["CjsCharacterCompositionTarget", "src/character/planning/CjsCharacterCompositionTarget.js"],
    ["CjsCharacterCoverage", "src/character/planning/CjsCharacterCoverage.js"],
    ["CjsCharacterDefinition", "src/character/catalog/CjsCharacterDefinition.js"],
    ["CjsCharacterLibrary", "src/library/CjsCharacterLibrary.js"],
    ["CjsCharacterLibraryBuilder", "src/library-builder/CjsCharacterLibraryBuilder.js"],
    ["CjsCharacterLibraryDocuments", "src/library/CjsCharacterLibraryDocuments.js"],
    ["CjsCharacterLibraryManager", "src/library/CjsCharacterLibraryManager.js"],
    ["CjsCharacterMaterialProfile", "src/character/catalog/CjsCharacterMaterialProfile.js"],
    ["CjsCharacterAtlasLayout", "src/character/composition/CjsCharacterAtlasLayout.js"],
    ["CjsCharacterModifierLocation", "src/character/composition/CjsCharacterModifierLocation.js"],
    ["CjsCharacterModifierReference", "src/character/catalog/CjsCharacterModifierReference.js"],
    ["CjsCharacterModifierOrder", "src/character/composition/CjsCharacterModifierOrder.js"],
    ["CjsCharacterModifierSelection", "src/character/composition/CjsCharacterModifierSelection.js"],
    ["CjsCharacterPaperdoll", "src/character/creation/CjsCharacterPaperdoll.js"],
    ["CjsCharacterPartMetadata", "src/character/catalog/CjsCharacterPartMetadata.js"],
    ["CjsCharacterPartSource", "src/character/catalog/CjsCharacterPartSource.js"],
    ["CjsCharacterPartSourceVersion", "src/character/catalog/CjsCharacterPartSourceVersion.js"],
    ["CjsCharacterPartType", "src/character/catalog/CjsCharacterPartType.js"],
    ["CjsCharacterProjectionProfile", "src/character/catalog/CjsCharacterProjectionProfile.js"],
    ["CjsCharacterPortraitResource", "src/character/resources/CjsCharacterPortraitResource.js"],
    ["CjsCharacterRace", "src/character/demographics/CjsCharacterRace.js"],
    ["CjsCharacterRecord", "src/character/CjsCharacterRecord.js"],
    ["CjsCharacterRecipeEntry", "src/character/catalog/CjsCharacterRecipeEntry.js"],
    ["CjsCharacterRecipeProfile", "src/character/catalog/CjsCharacterRecipeProfile.js"],
    ["CjsCharacterResolvedPart", "src/character/planning/CjsCharacterResolvedPart.js"],
    ["CjsCharacterResource", "src/character/resources/CjsCharacterResource.js"],
    ["CjsCharacterRigBinding", "src/controls/CjsCharacterRigBinding.js"],
    ["CjsCharacterSculptingLocation", "src/character/appearance/CjsCharacterSculptingLocation.js"],
    ["CjsCharacterSculptSelection", "src/character/appearance/CjsCharacterSculptSelection.js"],
    ["CjsCharacterTextureAsset", "src/character/planning/CjsCharacterTextureAsset.js"],
    ["CjsCharacterTextureChannel", "src/character/planning/CjsCharacterTextureChannel.js"],
    ["CjsCharacterTextureMetadata", "src/character/catalog/CjsCharacterTextureMetadata.js"],
    ["CjsCharacterOrigin", "src/character/planning/CjsCharacterOrigin.js"]
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

const internalCarbon = [
    ["TriMatrix", "src/trinity/trinityCore/TriMatrix.js"]
];

const historicalIncarna = [
    ["Tr2ColorCurve", "src/incarna/curves/Tr2ColorCurve.js"],
    ["Tr2ColorKey", "src/incarna/curves/Tr2ColorKey.js"],
    ["Tr2InteriorCell", "src/incarna/interior/Tr2InteriorCell.js"],
    ["Tr2ScalarCurve", "src/incarna/curves/Tr2ScalarCurve.js"],
    ["Tr2ScalarKey", "src/incarna/curves/Tr2ScalarKey.js"]
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
    ...historicalIncarna.map(([name, source]) => ({
        name,
        source,
        visibility: "Public",
        export: publicExport,
        kind: "Historical Incarna hydration class"
    })),
    ...internalCarbon.map(([name, source]) => ({
        name,
        source,
        visibility: "Internal",
        export: "None",
        kind: "Unexported current Carbon class"
    }))
];
