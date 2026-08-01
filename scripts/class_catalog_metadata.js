const publicExport = "`@carbonenginejs/runtime-character`";

const carbonEngineJs = [
    ["CjsCharacterDocumentLibrary", "src/library/CjsCharacterDocumentLibrary.js"],
    ["CjsCharacterLibraryBuilder", "src/library-builder/CjsCharacterLibraryBuilder.js"],
    ["CjsCharacterRigBinding", "src/controls/CjsCharacterRigBinding.js"]
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
