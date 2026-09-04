import { CjsCharacterTextureQuality } from "./CjsCharacterTextureQuality.js";

const FEMALE_BODY_FOUNDATION = {
    role: "body",
    index: 1,
    configurationPath: "res:/graphics/character/female/paperdoll/basenude/basenude.black",
    geometryPath: "res:/graphics/character/female/paperdoll/basenude/basenude.gr2"
};

const FEMALE_SPLIT_HANDS_PATH =
    "res:/graphics/character/female/paperdoll/hands/hands_nude/hands_nude.gr2";

const FEMALE_ATLAS_BODY_GROUPS = new Set([
    "bottominner",
    "bottomouter",
    "bottomunderwear",
    "outer",
    "topinner",
    "topmiddle",
    "topouter",
    "topunderwear"
]);

const FEMALE_CLOTHING_FIT_GROUPS = new Set([
    ...FEMALE_ATLAS_BODY_GROUPS,
    "feet",
    "hands"
]);

const FEMALE_SPLIT_LOD0_GEOMETRY = [
    [ "head", "res:/graphics/character/female/paperdoll/head/head_generic/head_generic.gr2" ],
    [ "torso", "res:/graphics/character/female/paperdoll/topinner/torso_nude/torso_nude.gr2" ],
    [ "sleevesUpper", "res:/graphics/character/female/paperdoll/dependants/sleevesupper/standard/standard.gr2" ],
    [ "sleevesLower", "res:/graphics/character/female/paperdoll/dependants/sleeveslower/standard/standard.gr2" ],
    [ "legs", "res:/graphics/character/female/paperdoll/bottominner/legs_nude/legs_nude.gr2" ],
    [ "hands", FEMALE_SPLIT_HANDS_PATH ],
    [ "feet", "res:/graphics/character/female/paperdoll/feet/feet_nude/feet_nude.gr2" ]
];

const FOUNDATIONS = {
    female: {
        resourceGender: 0,
        skeletonPath: "res:/graphics/character/female/skeleton/masterskeletonfemale.gr2",
        configuredFoundations: [ {
            role: "head",
            index: 0,
            configurationPath: "res:/graphics/character/female/paperdoll/head/head_generic/head_generic.black",
            geometryPath: "res:/graphics/character/female/paperdoll/head/head_generic/head_generic.gr2",
            skinTextures: {
                DiffuseMap: "res:/graphics/character/female/paperdoll/head/head_generic/genericfemhead_d_4k.png",
                NormalMap: "res:/graphics/character/female/paperdoll/head/head_generic/genericfemhead_n_4k.png",
                SpecularMap: "res:/graphics/character/female/paperdoll/head/head_generic/genericfemhead_s_4k.png"
            },
            skinEvidence: {
                status: "retained",
                rule: "exact-head-generic-texture-inventory-v1",
                correctness: "exact-folder-inventory"
            }
        } ],
        geometry: [
            [ "head", "res:/graphics/character/female/paperdoll/head/head_generic/head_generic.gr2" ],
            [ "body", "res:/graphics/character/female/paperdoll/basenude/basenude.gr2" ]
        ]
    },
    male: {
        resourceGender: 1,
        skeletonPath: "res:/graphics/character/male/skeleton/masterskeletonmale.gr2",
        configuredFoundations: [ {
            role: "head",
            index: 0,
            configurationPath: "res:/graphics/character/male/paperdoll/head/head_generic/head_generic.black",
            geometryPath: "res:/graphics/character/male/paperdoll/head/head_generic/head_generic.gr2",
            skinTextures: {
                DiffuseMap: "res:/graphics/character/male/paperdoll/head/head_generic/genericmale_head_d_4k.png",
                NormalMap: "res:/graphics/character/male/paperdoll/head/head_generic/genericmale_head_n_4k.png",
                SpecularMap: "res:/graphics/character/male/paperdoll/head/head_generic/genericmale_head_s_4k.png"
            },
            skinEvidence: {
                status: "retained",
                rule: "exact-head-generic-texture-inventory-v1",
                correctness: "exact-folder-inventory"
            }
        } ],
        geometry: [
            [ "head", "res:/graphics/character/male/paperdoll/head/head_generic/head_generic.gr2" ],
            [ "torso", "res:/graphics/character/male/paperdoll/topinner/torso_nude/torso_nude.gr2" ],
            [ "legs", "res:/graphics/character/male/paperdoll/bottominner/legs_nude/legs_nude.gr2" ],
            [ "hands", "res:/graphics/character/male/paperdoll/hands/hands_nude/hands_nude.gr2" ],
            [ "feet", "res:/graphics/character/male/paperdoll/feet/feet_nude/feet_nude.gr2" ]
        ]
    }
};

/**
 * Produces renderer-neutral skeleton, foundation geometry, and selected skin
 * descriptors from one paper doll, plan, and hydrated character library.
 */
export class CjsCharacterFoundationConstruction
{
    _femaleFoundationLayout;

    _textureQuality;

    constructor({ femaleFoundationLayout = null, textureQuality = "4k" } = {})
    {
        if (femaleFoundationLayout !== null
            && ![ "combined", "split-lod0" ].includes(femaleFoundationLayout))
        {
            throw new TypeError("Character foundation construction femaleFoundationLayout is invalid");
        }
        this._femaleFoundationLayout = femaleFoundationLayout;
        this._textureQuality = CjsCharacterTextureQuality.normalize(textureQuality);
    }

    /** Produces the ordered CPU construction operations for one paper doll. */
    Resolve(paperdoll, appearancePlan, library = null)
    {
        if (!paperdoll || typeof paperdoll !== "object")
        {
            throw new TypeError("Character foundation construction requires a paper doll");
        }
        if (!appearancePlan || typeof appearancePlan !== "object")
        {
            throw new TypeError("Character foundation construction requires an appearance plan");
        }

        const sex = ResolvePaperdollSex(paperdoll);
        const definition = FOUNDATIONS[sex];
        if (!definition)
        {
            throw new Error("The selected paper doll does not resolve to one character sex");
        }
        if (sex === "female" && this._femaleFoundationLayout === null)
        {
            throw new Error("Character foundation construction requires a caller-selected female layout");
        }

        const femaleLayout = sex === "female"
            ? ResolveFemaleFoundationLayout(this._femaleFoundationLayout, appearancePlan)
            : { layout: "split-lod0", fallback: null };
        const baseGeometry = sex === "female" && femaleLayout.layout === "split-lod0"
            ? FEMALE_SPLIT_LOD0_GEOMETRY
            : definition.geometry;
        const geometry = ResolveFoundationGeometry(baseGeometry, sex, library);
        const operations = [ {
            operation: "skeleton",
            resourcePath: definition.skeletonPath
        } ];

        for (let index = 0; index < geometry.length; index++)
        {
            const [ role, resourcePath, evidence ] = geometry[index];
            operations.push({
                operation: "geometry",
                role,
                index,
                resourcePath,
                ...(evidence ? { evidence: { ...evidence } } : {})
            });
        }

        const selectedSkin = ResolveSelectedFoundationSkin(
            paperdoll,
            sex,
            library,
            this._textureQuality
        );
        const bodyRoles = geometry.map(([ role ]) => role).filter(role => role !== "head");
        if (selectedSkin?.bodyTextures && bodyRoles.length)
        {
            operations.push({
                operation: "foundation-skin",
                roles: [ ...bodyRoles ],
                skinTextures: { ...selectedSkin.bodyTextures },
                ...(selectedSkin.skinColorization ? { skinColorization: CloneColorization(
                    selectedSkin.skinColorization
                ) } : {}),
                skinEvidence: { ...selectedSkin.evidence }
            });
        }

        for (const configured of definition.configuredFoundations)
        {
            const supportTextures = ResolveFoundationTextureBindings(
                configured.skinTextures,
                library,
                this._textureQuality
            );
            const resolved = configured.role === "head" && selectedSkin
                ? {
                    ...configured,
                    supportTextures,
                    supportEvidence: { ...configured.skinEvidence },
                    skinTextures: { ...selectedSkin.headTextures },
                    ...(selectedSkin.skinColorization ? { skinColorization: CloneColorization(
                        selectedSkin.skinColorization
                    ) } : {}),
                    skinEvidence: { ...selectedSkin.evidence }
                }
                : { ...configured, skinTextures: supportTextures };
            operations.push({ operation: "configured-foundation", ...resolved });
        }

        if (sex === "female"
            && femaleLayout.layout === "combined"
            && selectedSkin?.bodyTextures)
        {
            operations.push({
                operation: "configured-foundation",
                ...FEMALE_BODY_FOUNDATION,
                skinTextures: { ...selectedSkin.bodyTextures },
                ...(selectedSkin.skinColorization ? { skinColorization: CloneColorization(
                    selectedSkin.skinColorization
                ) } : {}),
                skinEvidence: { ...selectedSkin.evidence }
            });
        }

        const browSupport = ResolveSelectedBrowSupport(
            sex,
            selectedSkin?.evidence?.archetypeSourceRecordID,
            library
        );
        if (browSupport)
        {
            operations.push({
                operation: "configured-foundation-support",
                role: "eyebrowbase",
                ...browSupport
            });
        }
        operations.push({ operation: "bind-animation" });

        return {
            evidence: {
                status: "policy",
                rule: "character-foundation-construction-v1",
                sourceRule: "reviewed-foundation-construction-source-v1",
                layout: femaleLayout.layout,
                ...(femaleLayout.fallback ? {
                    requestedLayout: this._femaleFoundationLayout,
                    layoutFallback: femaleLayout.fallback
                } : {}),
                textureQuality: this._textureQuality
            },
            paperdollRecordID: String(paperdoll.recordID ?? ""),
            sourceBuild: appearancePlan.sourceBuild ?? null,
            sex,
            lod: 0,
            operations
        };
    }
}

/** Resolves the layout required by the caller and exact fit evidence. */
export function ResolveFemaleFoundationLayout(requestedLayout, appearancePlan)
{
    if (![ "combined", "split-lod0" ].includes(requestedLayout))
    {
        throw new TypeError("Character foundation layout must be combined or split-lod0");
    }
    if (requestedLayout !== "combined") return { layout: requestedLayout, fallback: null };

    const atlasOnlyLayers = (appearancePlan?.layers ?? []).flatMap((layer, layerIndex) =>
    {
        const groupID = String(layer?.owner?.groupID ?? "").trim().toLowerCase();
        const part = layer?.contributor;
        const partSourceRecordID = part?.origin?.document === "characterPartSources"
            ? String(part.origin.recordID ?? "").trim().toLowerCase()
            : "";
        const configured = /^res:\//iu.test(String(part?.configurationPath ?? ""))
            && /^res:\//iu.test(String(part?.geometryPath ?? ""));
        if (!FEMALE_ATLAS_BODY_GROUPS.has(groupID)
            || !partSourceRecordID.startsWith("female/")
            || partSourceRecordID.startsWith("female/dependants/")
            || configured)
        {
            return [];
        }
        return [ { layerIndex, groupID, partSourceRecordID } ];
    });
    if (!atlasOnlyLayers.length) return { layout: requestedLayout, fallback: null };

    const fitTargets = (appearancePlan?.morphTargets ?? []).flatMap(value =>
    {
        const modifierPath = String(value?.modifierPath ?? "").trim().toLowerCase();
        const ownerGroupID = String(value?.owner?.groupID ?? "").trim().toLowerCase();
        if (!modifierPath.startsWith("utilityshapes/")
            || !FEMALE_CLOTHING_FIT_GROUPS.has(ownerGroupID))
        {
            return [];
        }
        return [ {
            modifierPath,
            targetName: String(value?.targetName ?? "").trim() || null,
            ownerGroupID
        } ];
    });
    if (!fitTargets.length) return { layout: requestedLayout, fallback: null };
    return {
        layout: "split-lod0",
        fallback: {
            status: "derived",
            rule: "atlas-only-clothing-fit-carrier-compatibility-v1",
            correctness: "source-shaped-live-verified",
            atlasOnlyLayers,
            fitTargets
        }
    };
}

/** Retains exact nude-torso support carriers proven by hydrated dependencies. */
export function ResolveFoundationGeometry(baseGeometry, sex, library)
{
    const result = baseGeometry.map(value => [
        value[0],
        value[1],
        value[2] ? { ...value[2] } : undefined
    ]);
    if (!library || typeof library.Get !== "function") return result;

    const torso = library.Get("characterPartSources", `${sex}/topinner/torso_nude`);
    const metadata = ResolveEffectiveMetadata(torso);
    const supports = [];
    for (const relation of metadata?.dependencies ?? [])
    {
        const authored = StripDependencyWeight(relation?.authoredValue).toLowerCase();
        const match = /^dependants\/(sleevesupper|sleeveslower)\/[^/]+$/u.exec(authored);
        const target = relation?.partSource;
        if (!match || !target) continue;
        if (String(target.recordID ?? "").toLowerCase() !== `${sex}/${authored}`) continue;

        const versions = (target.versions ?? []).filter(Boolean);
        if (versions.length !== 1) continue;
        const version = versions[0];
        if (version.configurationCandidates?.length !== 1 || version.geometryCandidates?.length !== 1)
        {
            continue;
        }
        supports.push([
            match[1] === "sleevesupper" ? "sleevesUpper" : "sleevesLower",
            version.geometryCandidates[0],
            {
                status: "derived",
                rule: "exact-foundation-torso-support-dependency-v1",
                torsoPartSourceRecordID: torso.recordID,
                metadataRecordID: metadata.recordID,
                authoredDependency: relation.authoredValue,
                supportPartSourceRecordID: target.recordID,
                configurationPath: version.configurationCandidates[0]
            }
        ]);
    }

    const uniqueRoles = new Set(supports.map(value => value[0]));
    if (uniqueRoles.size !== supports.length) return result;
    const existingRoles = new Set(result.map(value => value[0]));
    const additions = supports
        .filter(value => !existingRoles.has(value[0]))
        .sort((left, right) => FoundationSupportOrder(left[0]) - FoundationSupportOrder(right[0]));
    if (!additions.length) return result;

    const torsoIndex = result.findIndex(value => value[0] === "torso");
    result.splice(torsoIndex < 0 ? result.length : torsoIndex + 1, 0, ...additions);
    return result;
}

function FoundationSupportOrder(role)
{
    return role === "sleevesUpper" ? 0 : 1;
}

/** Resolves one exact authored brow carrier through the selected head metadata. */
export function ResolveSelectedBrowSupport(sex, archetypeSourceRecordID, library)
{
    if (!library || typeof library.GetDocument !== "function") return null;
    const archetypeID = String(archetypeSourceRecordID ?? "").trim().toLowerCase();
    const prefix = `${sex}/archetypes/`;
    if (!archetypeID.startsWith(prefix)) return null;
    const relativeArchetype = archetypeID.slice(`${sex}/`.length);
    const heads = (library.GetDocument("characterPartSources") ?? []).filter(source =>
    {
        if (!String(source?.recordID ?? "").toLowerCase().startsWith(`${sex}/head/`)) return false;
        const metadata = ResolveEffectiveMetadata(source);
        return metadata?.dependentModifiers?.some(value =>
            StripDependencyWeight(value).toLowerCase() === relativeArchetype);
    });
    if (heads.length !== 1) return null;

    const metadata = ResolveEffectiveMetadata(heads[0]);
    const matches = (metadata?.dependencies ?? []).filter(relation =>
    {
        const authored = StripDependencyWeight(relation?.authoredValue).toLowerCase();
        return authored.startsWith("accessories/browbase/")
            && relation?.partSource
            && String(relation.partSource.recordID ?? "").toLowerCase() === `${sex}/${authored}`;
    });
    if (matches.length !== 1) return null;

    const target = matches[0].partSource;
    const versions = (target?.versions ?? []).filter(Boolean);
    if (versions.length !== 1) return null;
    const version = versions[0];
    if (version.configurationCandidates?.length !== 1 || version.geometryCandidates?.length !== 1)
    {
        return null;
    }
    return {
        partSourceRecordID: target.recordID,
        configurationPath: version.configurationCandidates[0],
        geometryPath: version.geometryCandidates[0],
        evidence: {
            status: "derived",
            rule: "exact-head-archetype-brow-support-dependency-v1",
            headPartSourceRecordID: heads[0].recordID,
            metadataRecordID: metadata.recordID,
            authoredDependency: matches[0].authoredValue,
            archetypeSourceRecordID
        }
    };
}

/** Resolves one selected skintone through retained base, PRS, and archetype records. */
export function ResolveSelectedFoundationSkin(paperdoll, sex, library, textureQuality = "4k")
{
    if (!library || typeof library.Get !== "function" || typeof library.GetDocument !== "function")
    {
        return null;
    }
    const selections = (paperdoll?.colorSelections ?? []).filter(value =>
        value?.colorID?.colorKey === "skintone"
        && typeof value?.colorNameA?.colorName === "string");
    if (selections.length !== 1) return null;

    const colorName = selections[0].colorNameA.colorName.trim().toLowerCase();
    const root = `res:/graphics/character/${sex}/paperdoll/skintone/basic/`;
    const definitions = library.GetDocument("characterDefinitions") ?? [];
    const prsRoot = "res:/graphics/character/dnafiles/characterselect/";
    const prsSuffix = `${sex}clothing.prs`;
    const familyCandidates = definitions.flatMap(value =>
    {
        const recordID = String(value?.recordID ?? "").toLowerCase();
        if (!recordID.startsWith(prsRoot) || !recordID.endsWith(prsSuffix)
            || !Array.isArray(value?.values) || value.values[0] !== sex)
        {
            return [];
        }
        const family = recordID.slice(prsRoot.length, -prsSuffix.length);
        return family && (colorName === family || colorName.startsWith(`${family}_`))
            ? [ { family, definition: value } ]
            : [];
    }).sort((left, right) => right.family.length - left.family.length);
    const longestFamilyLength = familyCandidates[0]?.family.length ?? 0;
    const exactFamilies = familyCandidates.filter(value => value.family.length === longestFamilyLength);
    if (exactFamilies.length !== 1) return null;

    const { family, definition } = exactFamilies[0];
    const basePath = `${root}${family}.base`;
    const baseDefinition = library.Get("characterDefinitions", basePath);
    const materialDefinitionPath = `${root}${colorName}.color`;
    const materialDefinition = library.Get("characterDefinitions", materialDefinitionPath);
    const colors = materialDefinition?.values?.colors;
    const hasSkinColorization = Array.isArray(colors)
        && colors.length === 3
        && colors.every(color => Array.isArray(color) && color.length === 4);
    const sources = definition.values.slice(1)
        .filter(value => value?.category === "bodyshapes" && typeof value?.path === "string")
        .map(value => value.path.replace(/^bodyshapes\//iu, "").toLowerCase())
        .map(value => ({
            identity: `${sex}/archetypes/${value}`,
            source: library.Get("characterPartSources", `${sex}/archetypes/${value}`)
        }))
        .filter(value => value.source);
    if (sources.length !== 1) return null;

    const texturePaths = sources[0].source.versions
        ?.flatMap(value => value?.textureCandidates ?? []) ?? [];
    const archetypeToken = sources[0].identity.split("/").at(-1)?.replace(/shape$/iu, "");
    if (!archetypeToken) return null;
    const prefix = `${archetypeToken}_${sex}_head_`;
    const headTextures = {
        DiffuseMap: SelectFoundationTexturePaths(texturePaths, `${prefix}d`, textureQuality),
        NormalMap: SelectFoundationTexturePaths(texturePaths, `${prefix}n`, textureQuality),
        SpecularMap: SelectFoundationTexturePaths(texturePaths, `${prefix}s`, textureQuality)
    };
    if (Object.values(headTextures).some(value => !value)) return null;

    const bodyPrefix = `${archetypeToken}_${sex}_body_`;
    const bodyDiffusePath = SelectFoundationTexturePaths(texturePaths, `${bodyPrefix}d`, textureQuality);
    const bodySpecularPath = SelectFoundationTexturePaths(texturePaths, `${bodyPrefix}s`, textureQuality);
    const bodyNormalPath = SelectFoundationTexturePaths(texturePaths, `${bodyPrefix}n`, textureQuality);
    const skinColorizationPaths = hasSkinColorization ? {
        headDetailPath: SelectFoundationTexture(library, `${root}colorize_head_l.png`, textureQuality),
        headZonePath: SelectFoundationTexture(library, `${root}colorize_head_z.png`, textureQuality),
        bodyDetailPath: SelectFoundationTexture(library, `${root}colorize_body_l.png`, textureQuality),
        bodyZonePath: SelectFoundationTexture(library, `${root}colorize_body_z.png`, textureQuality)
    } : null;
    const skinColorization = skinColorizationPaths
        && Object.values(skinColorizationPaths).every(Boolean)
        ? { materialDefinitionPath, colors: colors.map(color => [ ...color ]), ...skinColorizationPaths }
        : null;

    return {
        headTextures,
        ...(skinColorization ? { skinColorization } : {}),
        ...(bodyDiffusePath ? {
            bodyTextures: {
                DiffuseMap: bodyDiffusePath,
                ...(bodyNormalPath ? { NormalMap: bodyNormalPath } : {}),
                ...(bodySpecularPath ? { SpecularMap: bodySpecularPath } : {})
            }
        } : {}),
        evidence: {
            status: "derived",
            rule: "exact-skintone-prs-archetype-foundation-v1",
            correctness: "retained-source-join",
            textureQuality: CjsCharacterTextureQuality.normalize(textureQuality),
            colorName,
            ...(skinColorization ? { materialDefinitionPath } : {}),
            ...(Array.isArray(baseDefinition?.values) && baseDefinition.values.length === 4 ? {
                basePath,
                baseColor: [ ...baseDefinition.values ]
            } : {}),
            definitionPath: String(definition.recordID),
            archetypeSourceRecordID: sources[0].identity,
            ...(bodyDiffusePath ? { bodyDiffusePath } : {}),
            ...(bodySpecularPath ? { bodySpecularPath } : {
                bodySpecularStatus: "unresolved"
            }),
            ...(bodyNormalPath ? {
                bodyNormalPath,
                normalStatus: "retained",
                normalRule: "exact-foundation-diffuse-token-normal-match-v1"
            } : {
                normalStatus: "unresolved"
            })
        }
    };
}

function CloneColorization(value)
{
    return { ...value, colors: value.colors.map(color => [ ...color ]) };
}

function ResolveEffectiveMetadata(source)
{
    const versions = (source?.versions ?? []).filter(Boolean);
    return versions.length === 1 && versions[0].metadata ? versions[0].metadata : source?.metadata ?? null;
}

function StripDependencyWeight(value)
{
    return String(value ?? "").replace(
        /###[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/u,
        ""
    );
}

function ResolveFoundationTextureBindings(bindings, library, textureQuality)
{
    return Object.fromEntries(Object.entries(bindings ?? {}).flatMap(([ name, path ]) =>
    {
        const selected = SelectFoundationTexture(library, path, textureQuality);
        return selected ? [ [ name, selected ] ] : [];
    }));
}

function SelectFoundationTexture(library, referencePath, textureQuality)
{
    if (!referencePath) return null;
    const metadata = library?.GetDocument?.("characterTextureMetadata") ?? [];
    const family = CjsCharacterTextureQuality.getFamily(referencePath);
    const matches = metadata.map(value => value?.sourcePath)
        .filter(value => typeof value === "string"
            && CjsCharacterTextureQuality.getFamily(value) === family);
    return matches.length
        ? CjsCharacterTextureQuality.select(matches, textureQuality)
        : CjsCharacterTextureQuality.isAllowed(referencePath, textureQuality)
            ? referencePath
            : null;
}

function SelectFoundationTexturePaths(paths, fileFamily, textureQuality)
{
    const normalizedFamily = String(fileFamily ?? "").toLowerCase();
    const matches = paths.filter(value => CjsCharacterTextureQuality.getFamily(value)
        .split("/").at(-1) === normalizedFamily);
    return CjsCharacterTextureQuality.select(matches, textureQuality);
}

function ResolvePaperdollSex(paperdoll)
{
    const genders = new Set();
    for (const modifier of paperdoll.modifiers ?? [])
    {
        const value = modifier?.paperdollResourceID?.resGender;
        if (value === 0 || value === 1) genders.add(value);
    }
    if (genders.size !== 1) return null;
    return genders.has(0) ? "female" : "male";
}

export default CjsCharacterFoundationConstruction;
