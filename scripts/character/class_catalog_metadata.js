const publicExport = "`@carbonenginejs/runtime/character`";

const carbonEngineJs = [
    ["CjsCharacterAncestry", "src/character/model/demographics/CjsCharacterAncestry.js"],
    ["CjsCharacterAppearanceBinding", "src/character/model/planning/CjsCharacterAppearanceBinding.js"],
    ["CjsCharacterAppearanceColorSelection", "src/character/model/planning/CjsCharacterAppearanceColorSelection.js"],
    ["CjsCharacterAppearanceDiagnostic", "src/character/model/planning/CjsCharacterAppearanceDiagnostic.js"],
    ["CjsCharacterAppearanceLayer", "src/character/model/planning/CjsCharacterAppearanceLayer.js"],
    ["CjsCharacterAppearancePlan", "src/character/model/planning/CjsCharacterAppearancePlan.js"],
    ["CjsCharacterAppearanceResolver", "src/character/model/resolution/CjsCharacterAppearanceResolver.js"],
    ["CjsCharacterAppearanceSelection", "src/character/model/planning/CjsCharacterAppearanceSelection.js"],
    ["CjsCharacterArchetype", "src/character/model/activity/CjsCharacterArchetype.js"],
    ["CjsCharacterAvatarBehavior", "src/character/model/behavior/CjsCharacterAvatarBehavior.js"],
    ["CjsCharacterBindingAlpha", "src/character/model/planning/CjsCharacterBindingAlpha.js"],
    ["CjsCharacterBloodline", "src/character/model/demographics/CjsCharacterBloodline.js"],
    ["CjsCharacterColorValue", "src/character/model/catalog/CjsCharacterColorValue.js"],
    ["CjsCharacterColorLocation", "src/character/model/appearance/CjsCharacterColorLocation.js"],
    ["CjsCharacterColorName", "src/character/model/appearance/CjsCharacterColorName.js"],
    ["CjsCharacterColorSelection", "src/character/model/appearance/CjsCharacterColorSelection.js"],
    ["CjsCharacterCompositionInput", "src/character/model/planning/CjsCharacterCompositionInput.js"],
    ["CjsCharacterCompositionPass", "src/character/model/planning/CjsCharacterCompositionPass.js"],
    ["CjsCharacterCompositionTarget", "src/character/model/planning/CjsCharacterCompositionTarget.js"],
    ["CjsCharacterCoverage", "src/character/model/planning/CjsCharacterCoverage.js"],
    ["CjsCharacterDefinition", "src/character/model/catalog/CjsCharacterDefinition.js"],
    ["CjsCharacterLibrary", "src/character/library/CjsCharacterLibrary.js"],
    ["CjsCharacterLibraryBuilder", "src/character/library-builder/CjsCharacterLibraryBuilder.js"],
    ["CjsCharacterLibraryDocuments", "src/character/library/CjsCharacterLibraryDocuments.js"],
    ["CjsCharacterLibraryManager", "src/character/library/CjsCharacterLibraryManager.js"],
    ["CjsCharacterMaterialProfile", "src/character/model/catalog/CjsCharacterMaterialProfile.js"],
    ["CjsCharacterAtlasLayout", "src/character/model/composition/CjsCharacterAtlasLayout.js"],
    ["CjsCharacterModifierLocation", "src/character/model/composition/CjsCharacterModifierLocation.js"],
    ["CjsCharacterModifierReference", "src/character/model/catalog/CjsCharacterModifierReference.js"],
    ["CjsCharacterMorphTargetWeight", "src/character/model/planning/CjsCharacterMorphTargetWeight.js"],
    ["CjsCharacterModifierOrder", "src/character/model/composition/CjsCharacterModifierOrder.js"],
    ["CjsCharacterModifierSelection", "src/character/model/composition/CjsCharacterModifierSelection.js"],
    ["CjsCharacterPaperdoll", "src/character/model/creation/CjsCharacterPaperdoll.js"],
    ["CjsCharacterPartMetadata", "src/character/model/catalog/CjsCharacterPartMetadata.js"],
    ["CjsCharacterPartModelBundle", "src/character/model/catalog/CjsCharacterPartModelBundle.js"],
    ["CjsCharacterPartSource", "src/character/model/catalog/CjsCharacterPartSource.js"],
    ["CjsCharacterPartSourceVersion", "src/character/model/catalog/CjsCharacterPartSourceVersion.js"],
    ["CjsCharacterPartType", "src/character/model/catalog/CjsCharacterPartType.js"],
    ["CjsCharacterProjectionProfile", "src/character/model/catalog/CjsCharacterProjectionProfile.js"],
    ["CjsCharacterPortraitResource", "src/character/model/resources/CjsCharacterPortraitResource.js"],
    ["CjsCharacterRace", "src/character/model/demographics/CjsCharacterRace.js"],
    ["CjsCharacterRecord", "src/character/model/CjsCharacterRecord.js"],
    ["CjsCharacterRecipeEntry", "src/character/model/catalog/CjsCharacterRecipeEntry.js"],
    ["CjsCharacterRecipeProfile", "src/character/model/catalog/CjsCharacterRecipeProfile.js"],
    ["CjsCharacterResolvedPart", "src/character/model/planning/CjsCharacterResolvedPart.js"],
    ["CjsCharacterResource", "src/character/model/resources/CjsCharacterResource.js"],
    ["CjsCharacterRigBinding", "src/character/controls/CjsCharacterRigBinding.js"],
    ["CjsCharacterSculptingLocation", "src/character/model/appearance/CjsCharacterSculptingLocation.js"],
    ["CjsCharacterSculptSelection", "src/character/model/appearance/CjsCharacterSculptSelection.js"],
    ["CjsCharacterTextureAsset", "src/character/model/planning/CjsCharacterTextureAsset.js"],
    ["CjsCharacterTextureChannel", "src/character/model/planning/CjsCharacterTextureChannel.js"],
    ["CjsCharacterTextureMetadata", "src/character/model/catalog/CjsCharacterTextureMetadata.js"],
    ["CjsCharacterOrigin", "src/character/model/planning/CjsCharacterOrigin.js"]
];

const adaptedCarbon = [
    ["Tr2GStateAnimation", "src/character/trinity/trinityCore/Tr2GStateAnimation.js"],
    ["Tr2GStateParameter", "src/character/trinity/trinityCore/Tr2GStateParameter.js"],
    ["Tr2InteriorLightSet", "src/character/trinity/interior/Tr2InteriorLightSet.js"],
    ["Tr2InteriorLightSource", "src/character/trinity/interior/Tr2InteriorLightSource.js"],
    ["Tr2InteriorPerLightPSData", "src/character/trinity/interior/Tr2InteriorPerLightPSData.js"],
    ["Tr2InteriorPerObjectLightData", "src/character/generated/interior/Tr2InteriorPerObjectLightData.js"],
    ["Tr2InteriorPerObjectPSData", "src/character/trinity/interior/Tr2InteriorPerObjectPSData.js"],
    ["Tr2InteriorPerObjectVSData", "src/character/generated/interior/Tr2InteriorPerObjectVSData.js"],
    ["Tr2InteriorPlaceable", "src/character/trinity/interior/Tr2InteriorPlaceable.js"],
    ["Tr2InteriorScene", "src/character/trinity/interior/Tr2InteriorScene.js"],
    ["Tr2IntKeyGenerator", "src/character/trinity/interior/Tr2IntKeyGenerator.js"],
    ["Tr2IntSkinnedObject", "src/character/trinity/interior/Tr2IntSkinnedObject.js"],
    ["Tr2Model", "src/character/trinity/trinityCore/Tr2Model.js"],
    ["Tr2PerObjectParticleVSData", "src/character/generated/interior/Tr2PerObjectParticleVSData.js"],
    ["Tr2SkinnedModel", "src/character/trinity/trinityCore/Tr2SkinnedModel.js"],
    ["Tr2SkinnedObject", "src/character/trinity/trinityCore/Tr2SkinnedObject.js"],
    ["Tr2SkinnedObjectLod", "src/character/trinity/trinityCore/Tr2SkinnedObjectLod.js"],
    ["WodBakingScene", "src/character/trinity/wod/WodBakingScene.js"]
];

const internalCarbon = [
    ["TriMatrix", "src/character/trinity/trinityCore/TriMatrix.js"]
];

const historicalIncarna = [
    ["Tr2ColorCurve", "src/character/incarna/curves/Tr2ColorCurve.js"],
    ["Tr2ColorKey", "src/character/incarna/curves/Tr2ColorKey.js"],
    ["Tr2InteriorCell", "src/character/incarna/interior/Tr2InteriorCell.js"],
    ["Tr2ScalarCurve", "src/character/incarna/curves/Tr2ScalarCurve.js"],
    ["Tr2ScalarKey", "src/character/incarna/curves/Tr2ScalarKey.js"]
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
