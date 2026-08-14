import { CjsCharacterPartMetadata } from "../catalog/CjsCharacterPartMetadata.js";
import { CjsCharacterModifierReference } from "../catalog/CjsCharacterModifierReference.js";
import { CjsCharacterPartSource } from "../catalog/CjsCharacterPartSource.js";
import { CjsCharacterPartSourceVersion } from "../catalog/CjsCharacterPartSourceVersion.js";
import { CjsCharacterPartType } from "../catalog/CjsCharacterPartType.js";
import { CjsCharacterModifierLocation } from "../composition/CjsCharacterModifierLocation.js";
import { CjsCharacterModifierOrder } from "../composition/CjsCharacterModifierOrder.js";
import { CjsCharacterPaperdoll } from "../creation/CjsCharacterPaperdoll.js";
import { CjsCharacterColorLocation } from "../appearance/CjsCharacterColorLocation.js";
import { CjsCharacterColorName } from "../appearance/CjsCharacterColorName.js";
import { CjsCharacterAppearancePlan } from "../planning/CjsCharacterAppearancePlan.js";
import { CjsCharacterResource } from "../resources/CjsCharacterResource.js";

/** Resolves source-backed paper-doll selections without inventing character rendering policy. */
export class CjsCharacterAppearanceResolver
{

    /** Resolves one hydrated paper doll into the currently provable appearance-plan tranche. */
    static resolvePaperdoll(library, paperdoll)
    {
        if (!library
            || library.schema !== "carbonenginejs.characterLibrary"
            || ![ 7, 8, 9, 10 ].includes(library.schemaVersion)
            || typeof library.Get !== "function"
            || typeof library.GetDocument !== "function")
        {
            throw new TypeError("Character appearance resolution requires CjsCharacterLibrary");
        }
        if (!(paperdoll instanceof CjsCharacterPaperdoll))
        {
            throw new TypeError("Character appearance resolution requires CjsCharacterPaperdoll");
        }
        if (!paperdoll.recordID || library.Get("paperdolls", paperdoll.recordID) !== paperdoll)
        {
            throw new TypeError("Character appearance resolution requires a paper doll from the supplied library");
        }

        const plan = new CjsCharacterAppearancePlan();
        const groupIDs = new Set();
        const modifierPolicies = [];
        const utilityRequests = [];
        const utilityOcclusions = [];

        plan.sourceBuild = library.sourceBuild;

        ResolveColorSelections(plan, paperdoll);

        for (let modifierIndex = 0; modifierIndex < paperdoll.modifiers.length; modifierIndex++)
        {
            ResolveModifier(
                library,
                plan,
                paperdoll,
                paperdoll.modifiers[modifierIndex],
                modifierIndex,
                groupIDs,
                modifierPolicies,
                utilityRequests,
                utilityOcclusions
            );
        }

        ResolveModifierPolicy(plan, modifierPolicies);
        ResolveUtilityShapes(plan, utilityRequests, utilityOcclusions);

        if (plan.layers.length)
        {
            AddDiagnostic(
                plan,
                "PASS_ORDER_UNRESOLVED",
                "Resolved contributions do not establish atlas targets or composition-pass order.",
                "warning"
            );
        }

        return plan;
    }

}

function ResolveColorSelections(plan, paperdoll)
{
    for (let index = 0; index < paperdoll.colorSelections.length; index++)
    {
        const value = paperdoll.colorSelections[index];
        const origin = AddOrigin(plan, {
            kind: "authored",
            document: "paperdolls",
            recordID: paperdoll.recordID,
            jsonPointer: `/colorSelections/${index}`
        });
        const location = value?.colorID;
        const colorA = value?.colorNameA;
        const colorBC = value?.colorNameBC;

        if (!(location instanceof CjsCharacterColorLocation)
            || !(colorA instanceof CjsCharacterColorName)
            || colorBC !== null && !(colorBC instanceof CjsCharacterColorName))
        {
            AddDiagnostic(
                plan,
                "COLOR_SELECTION_UNRESOLVED",
                `Paper-doll color selection ${index} has unresolved catalog references.`,
                "warning",
                origin
            );
            continue;
        }

        plan.CreateColorSelection({
            colorKey: location.colorKey,
            colorNameA: colorA.colorName,
            colorNameBC: colorBC?.colorName ?? null,
            gloss: value.gloss,
            weight: value.weight,
            hasGloss: location.hasGloss,
            hasWeight: location.hasWeight,
            origin
        });
    }
}

function ResolveModifier(
    library,
    plan,
    paperdoll,
    modifier,
    modifierIndex,
    groupIDs,
    modifierPolicies,
    utilityRequests,
    utilityOcclusions
)
{
    const selectionOrigin = AddOrigin(plan, {
        kind: "decoded",
        document: "paperdolls",
        recordID: paperdoll.recordID,
        jsonPointer: `/modifiers/${modifierIndex}`
    });
    const location = modifier?.modifierLocationID;

    if (!(location instanceof CjsCharacterModifierLocation) || !location.modifierKey)
    {
        AddDiagnostic(
            plan,
            "MODIFIER_LOCATION_UNRESOLVED",
            `Paper-doll modifier ${modifierIndex} has no resolved modifier location.`,
            "warning",
            selectionOrigin
        );
        return;
    }

    const selection = plan.CreateSelection({
        groupID: location.modifierKey,
        origin: selectionOrigin
    });
    const modifierOrderIdentity = ResolveModifierOrderIdentity(selection.groupID);
    const modifierPolicy = {
        category: modifierOrderIdentity.category,
        group: modifierOrderIdentity.group,
        metadata: null,
        origin: selectionOrigin
    };

    modifierPolicies.push(modifierPolicy);

    if (groupIDs.has(selection.groupID))
    {
        AddDiagnostic(
            plan,
            "DUPLICATE_SELECTION_GROUP",
            `Paper doll contains more than one selection for ${JSON.stringify(selection.groupID)}.`,
            "warning",
            selectionOrigin
        );
    }
    groupIDs.add(selection.groupID);

    if (modifier.paperdollResourceVariation !== 0)
    {
        AddDiagnostic(
            plan,
            "RESOURCE_VARIATION_UNRESOLVED",
            `Selection ${JSON.stringify(selection.groupID)} uses unresolved resource variation ${modifier.paperdollResourceVariation}.`,
            "warning",
            selectionOrigin
        );
    }

    const resource = modifier.paperdollResourceID;

    if (!(resource instanceof CjsCharacterResource))
    {
        AddDiagnostic(
            plan,
            "CHARACTER_RESOURCE_UNRESOLVED",
            `Selection ${JSON.stringify(selection.groupID)} has no resolved character resource.`,
            "warning",
            selectionOrigin
        );
        return;
    }

    DiagnoseCharacterRules(plan, resource, selection, selectionOrigin);

    const partType = resource.partType;

    if (!(partType instanceof CjsCharacterPartType))
    {
        AddDiagnostic(
            plan,
            "PART_TYPE_UNRESOLVED",
            `Character resource ${JSON.stringify(resource.recordID)} has no exact part-type relationship.`,
            "warning",
            selectionOrigin
        );
        return;
    }

    if (partType.colorVariant !== null && partType.colorVariant !== "")
    {
        AddDiagnostic(
            plan,
            "MATERIAL_SELECTION_UNRESOLVED",
            `Part type ${JSON.stringify(partType.recordID)} has an unresolved color variant.`,
            "info",
            selectionOrigin
        );
    }

    const partSource = ResolvePartSource(
        plan,
        partType,
        resource,
        selectionOrigin
    );

    if (partSource === null) return;

    if ((partType.sex && partType.sex !== partSource.sex)
        || partType.partPath !== partSource.partPath)
    {
        AddDiagnostic(
            plan,
            "PART_SOURCE_MISMATCH",
            `Part type ${JSON.stringify(partType.recordID)} and source ${JSON.stringify(partSource.recordID)} disagree on sex or part path.`,
            "warning",
            selectionOrigin
        );
        return;
    }

    const matches = partSource.versions
        .map((version, index) => ({ version, index }))
        .filter(({ version }) => version instanceof CjsCharacterPartSourceVersion
            && version.resourceVersion === partType.resourceVersion);

    if (matches.length !== 1)
    {
        AddDiagnostic(
            plan,
            matches.length ? "PART_VERSION_AMBIGUOUS" : "PART_VERSION_UNRESOLVED",
            `Part source ${JSON.stringify(partSource.recordID)} has ${matches.length} exact matches for resource version ${JSON.stringify(partType.resourceVersion)}.`,
            "warning",
            selectionOrigin
        );
        return;
    }

    const { version, index: versionIndex } = matches[0];

    modifierPolicy.metadata = DiagnosePartMetadata(
        library,
        plan,
        version.metadata,
        partSource,
        selectionOrigin
    );
    CollectUtilityShapes(
        plan,
        modifierPolicy.metadata,
        selection,
        utilityRequests,
        utilityOcclusions
    );

    const hasConfiguration = version.configurationCandidates.length === 1;
    const hasGeometry = version.geometryCandidates.length === 1;

    if (!hasConfiguration || !hasGeometry)
    {
        AddDiagnostic(
            plan,
            "PART_CANDIDATES_UNRESOLVED",
            `Part source ${JSON.stringify(partSource.recordID)} requires exactly one configuration and one geometry candidate.`,
            "warning",
            selectionOrigin
        );
    }

    const partOrigin = AddOrigin(plan, {
        kind: "derived",
        document: "characterPartSources",
        recordID: partSource.recordID,
        jsonPointer: `/versions/${versionIndex}`,
        rule: hasConfiguration && hasGeometry
            ? "unique-version-candidates"
            : "exact-source-version"
    });
    const part = plan.CreatePart({
        configurationPath: hasConfiguration ? version.configurationCandidates[0] : null,
        geometryPath: hasGeometry ? version.geometryCandidates[0] : null,
        texturePaths: [ ...version.textureCandidates ],
        origin: partOrigin
    });

    const layerOrigin = AddOrigin(plan, {
        kind: "derived",
        document: "paperdolls",
        recordID: paperdoll.recordID,
        jsonPointer: `/modifiers/${modifierIndex}`,
        rule: "exact-selection-part-chain"
    });
    plan.CreateLayer({
        owner: selection,
        contributor: part,
        origin: layerOrigin
    });

    ResolvePartDependencies(
        library,
        plan,
        modifierPolicy.metadata,
        partSource,
        selection
    );

    if (version.textureCandidates.length)
    {
        AddDiagnostic(
            plan,
            "TEXTURE_ROLES_UNRESOLVED",
            `Part source ${JSON.stringify(partSource.recordID)} has texture candidates without decoded roles or placement.`,
            "info",
            partOrigin
        );
    }
}

function ResolvePartSource(plan, partType, resource, origin)
{
    const candidates = [];

    for (const value of partType.partSources ?? [])
    {
        if (value instanceof CjsCharacterPartSource && !candidates.includes(value))
        {
            candidates.push(value);
        }
    }

    if (partType.partSource instanceof CjsCharacterPartSource
        && !candidates.includes(partType.partSource))
    {
        candidates.push(partType.partSource);
    }

    const sex = resource.resGender === 0
        ? "female"
        : resource.resGender === 1
            ? "male"
            : null;
    const matches = sex === null
        ? candidates
        : candidates.filter(candidate => candidate.sex === sex);

    if (matches.length !== 1)
    {
        AddDiagnostic(
            plan,
            matches.length ? "PART_SOURCE_AMBIGUOUS" : "PART_SOURCE_UNRESOLVED",
            `Part type ${JSON.stringify(partType.recordID)} has ${matches.length} exact part-source matches`
            + `${sex === null ? "" : ` for ${sex}`}.`,
            "warning",
            origin
        );
        return null;
    }

    return matches[0];
}

function DiagnoseCharacterRules(plan, resource, selection, origin)
{
    const hasCategoryRules = [
        resource.clothingAlsoCoversCategory,
        resource.clothingAlsoCoversCategory2,
        resource.clothingRemovesCategory,
        resource.clothingRemovesCategory2
    ].some(Boolean);

    if (hasCategoryRules || resource.clothingRuleException !== null)
    {
        AddDiagnostic(
            plan,
            "CLOTHING_RULES_UNRESOLVED",
            `Selection ${JSON.stringify(selection.groupID)} has authored clothing rules whose actions are not yet resolved.`,
            "warning",
            origin
        );
    }
}

function DiagnosePartMetadata(library, plan, metadata, partSource, origin)
{
    if (metadata === null)
    {
        return null;
    }

    if (!(metadata instanceof CjsCharacterPartMetadata))
    {
        AddDiagnostic(
            plan,
            "PART_METADATA_UNRESOLVED",
            `Part source ${JSON.stringify(partSource.recordID)} has no exact effective metadata relationship.`,
            "warning",
            origin
        );
        return null;
    }

    for (let index = 0; index < metadata.dependentModifiers.length; index++)
    {
        const value = metadata.dependentModifiers[index];
        const relation = metadata.dependencies[index];

        if (relation instanceof CjsCharacterModifierReference
            && relation.authoredValue === value
            && (relation.partSource instanceof CjsCharacterPartSource
                || DecodeWeightedPartDependency(library, partSource, relation, value)
                || DecodeUtilityDependency(relation, value)))
        {
            continue;
        }

        AddDiagnostic(
            plan,
            "DEPENDENCY_REFERENCE_UNRESOLVED",
            `Part source ${JSON.stringify(partSource.recordID)} has unresolved authored dependency ${JSON.stringify(value)}.`,
            "warning",
            origin
        );
    }

    for (let index = 0; index < metadata.occludesModifiers.length; index++)
    {
        const value = metadata.occludesModifiers[index];
        const relation = metadata.occlusions[index];

        if (relation instanceof CjsCharacterModifierReference
            && relation.authoredValue === value
            && DecodeUtilityOcclusion(relation, value))
        {
            continue;
        }

        AddDiagnostic(
            plan,
            "OCCLUSION_POLICY_UNRESOLVED",
            `Part source ${JSON.stringify(partSource.recordID)} has unresolved authored occlusion ${JSON.stringify(value)}.`,
            "warning",
            origin
        );
    }

    if (metadata.wap !== null)
    {
        AddDiagnostic(
            plan,
            "METADATA_COMPATIBILITY_UNRESOLVED",
            `Part source ${JSON.stringify(partSource.recordID)} has unresolved compatibility metadata.`,
            "info",
            origin
        );
    }

    return metadata;
}

function CollectUtilityShapes(plan, metadata, owner, requests, occlusions)
{
    if (!(metadata instanceof CjsCharacterPartMetadata)) return;

    for (let index = 0; index < metadata.dependentModifiers.length; index++)
    {
        const authoredValue = metadata.dependentModifiers[index];
        const relation = metadata.dependencies[index];
        const decoded = DecodeUtilityDependency(relation, authoredValue);

        if (!decoded) continue;

        requests.push({
            ...decoded,
            owner,
            origin: AddOrigin(plan, {
                kind: relation?.weight === null || relation?.weight === undefined
                    ? "derived"
                    : "decoded",
                document: "characterPartMetadata",
                recordID: metadata.recordID,
                jsonPointer: `/dependencies/${index}`,
                rule: decoded.explicitWeight
                    ? "utility-shape-triple-suffix-weight"
                    : "utility-shape-default-weight"
            })
        });
    }

    for (let index = 0; index < metadata.occludesModifiers.length; index++)
    {
        const authoredValue = metadata.occludesModifiers[index];
        const relation = metadata.occlusions[index];
        const decoded = DecodeUtilityOcclusion(relation, authoredValue);

        if (!decoded) continue;

        occlusions.push({
            ...decoded,
            owner,
            origin: AddOrigin(plan, {
                kind: "decoded",
                document: "characterPartMetadata",
                recordID: metadata.recordID,
                jsonPointer: `/occlusions/${index}`
            })
        });
    }
}

function ResolveUtilityShapes(plan, requests, occlusions)
{
    const occluded = new Set(occlusions.map(value => value.modifierPath));
    const grouped = new Map();

    for (const request of requests)
    {
        if (!grouped.has(request.modifierPath)) grouped.set(request.modifierPath, []);
        grouped.get(request.modifierPath).push(request);
    }

    for (const [ modifierPath, values ] of grouped)
    {
        if (occluded.has(modifierPath))
        {
            for (const value of values)
            {
                AddDiagnostic(
                    plan,
                    "UTILITY_SHAPE_SUPPRESSED",
                    `Utility shape ${JSON.stringify(modifierPath)} is suppressed by an exact active occlusion.`,
                    "info",
                    value.origin
                );
            }
            continue;
        }

        const weights = new Set(values.map(value => value.weight));

        if (weights.size !== 1)
        {
            AddDiagnostic(
                plan,
                "UTILITY_SHAPE_WEIGHT_CONFLICT",
                `Utility shape ${JSON.stringify(modifierPath)} has conflicting active weights.`,
                "warning",
                values[0].origin
            );
            continue;
        }

        for (const value of values)
        {
            plan.CreateMorphTarget({
                modifierPath: value.modifierPath,
                targetName: value.targetName,
                weight: value.weight,
                owner: value.owner,
                origin: value.origin
            });
        }
    }
}

function DecodeUtilityDependency(relation, authoredValue)
{
    if (!(relation instanceof CjsCharacterModifierReference)
        || relation.authoredValue !== authoredValue)
    {
        return null;
    }

    const authored = String(authoredValue);
    const weighted = authored.match(/^(utilityshapes\/.+?)###([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)$/iu);
    let base = authored;
    let weight = relation.weight;
    let explicitWeight = false;

    if (weighted)
    {
        base = weighted[1];
        const parsed = Number(weighted[2]);
        if (!Number.isFinite(parsed)) return null;
        weight = weight === null || weight === undefined ? parsed : weight;
        explicitWeight = true;
    }
    else if (authored.includes("#"))
    {
        return null;
    }

    const modifierPath = NormalizeUtilityPath(relation.modifierPath ?? base);
    if (!modifierPath) return null;
    if (weight === null || weight === undefined) weight = 1;
    if (!Number.isFinite(weight)) return null;

    return {
        modifierPath,
        targetName: base.slice(base.lastIndexOf("/") + 1),
        weight,
        explicitWeight
    };
}

function DecodeUtilityOcclusion(relation, authoredValue)
{
    if (!(relation instanceof CjsCharacterModifierReference)
        || relation.authoredValue !== authoredValue
        || String(authoredValue).includes("#"))
    {
        return null;
    }

    const modifierPath = NormalizeUtilityPath(relation.modifierPath ?? authoredValue);
    return modifierPath ? { modifierPath } : null;
}

function NormalizeUtilityPath(value)
{
    const result = String(value ?? "")
        .replaceAll("\\", "/")
        .replace(/^\/+|\/+$/gu, "")
        .toLowerCase();

    if (!result.startsWith("utilityshapes/")
        || result.split("/").some(segment => !segment || segment === "." || segment === ".."))
    {
        return null;
    }

    return result;
}

function ResolvePartDependencies(library, plan, metadata, requestingSource, owner)
{
    if (!(metadata instanceof CjsCharacterPartMetadata)) return;

    for (let index = 0; index < metadata.dependentModifiers.length; index++)
    {
        const authoredValue = metadata.dependentModifiers[index];
        const relation = metadata.dependencies[index];

        if (!(relation instanceof CjsCharacterModifierReference)
            || relation.authoredValue !== authoredValue)
        {
            continue;
        }

        const decoded = relation.partSource instanceof CjsCharacterPartSource
            ? {
                target: relation.partSource,
                weight: relation.weight,
                rule: "unique-typed-dependency-version"
            }
            : DecodeWeightedPartDependency(library, requestingSource, relation, authoredValue);
        if (!decoded) continue;
        const { target, weight } = decoded;
        const versions = target.versions.filter(value =>
            value instanceof CjsCharacterPartSourceVersion);
        const relationOrigin = AddOrigin(plan, {
            kind: "authored",
            document: "characterPartMetadata",
            recordID: metadata.recordID,
            jsonPointer: `/dependencies/${index}`
        });

        if (versions.length !== 1)
        {
            AddDiagnostic(
                plan,
                "DEPENDENCY_VERSION_UNRESOLVED",
                `Dependency ${JSON.stringify(authoredValue)} from part source `
                + `${JSON.stringify(requestingSource.recordID)} has ${versions.length} `
                + "possible source versions.",
                "warning",
                relationOrigin
            );
            continue;
        }

        const version = versions[0];
        const versionIndex = target.versions.indexOf(version);
        const hasConfiguration = version.configurationCandidates.length === 1;
        const hasGeometry = version.geometryCandidates.length === 1;
        const hasTextures = version.textureCandidates.length > 0;

        if (!hasConfiguration && !hasGeometry && !hasTextures)
        {
            AddDiagnostic(
                plan,
                "DEPENDENCY_RESOURCES_EMPTY",
                `Dependency ${JSON.stringify(authoredValue)} from part source `
                + `${JSON.stringify(requestingSource.recordID)} has no direct resource candidates.`,
                "info",
                relationOrigin
            );
            continue;
        }

        if ((!hasConfiguration && version.configurationCandidates.length)
            || (!hasGeometry && version.geometryCandidates.length))
        {
            AddDiagnostic(
                plan,
                "DEPENDENCY_CANDIDATES_AMBIGUOUS",
                `Dependency part source ${JSON.stringify(target.recordID)} has ambiguous `
                + "configuration or geometry candidates.",
                "warning",
                relationOrigin
            );
        }

        const partOrigin = AddOrigin(plan, {
            kind: "derived",
            document: "characterPartSources",
            recordID: target.recordID,
            jsonPointer: `/versions/${versionIndex}`,
            rule: decoded.rule
        });
        const part = plan.CreatePart({
            configurationPath: hasConfiguration
                ? version.configurationCandidates[0]
                : null,
            geometryPath: hasGeometry ? version.geometryCandidates[0] : null,
            texturePaths: [ ...version.textureCandidates ],
            origin: partOrigin
        });

        plan.CreateLayer({
            owner,
            contributor: part,
            weight,
            origin: relationOrigin
        });
    }
}

function DecodeWeightedPartDependency(library, requestingSource, relation, authoredValue)
{
    if (!(relation instanceof CjsCharacterModifierReference)
        || relation.authoredValue !== authoredValue
        || !(requestingSource instanceof CjsCharacterPartSource))
    {
        return null;
    }

    const match = String(authoredValue).match(
        /^(.+?)###([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)$/u
    );
    if (!match || /^utilityshapes\//iu.test(match[1])) return null;
    const modifierPath = NormalizeDependencyPath(match[1]);
    const weight = relation.weight ?? Number(match[2]);
    if (!modifierPath || !Number.isFinite(weight)) return null;

    const target = library.Get(
        "characterPartSources",
        `${requestingSource.sex}/${modifierPath}`
    );
    if (!(target instanceof CjsCharacterPartSource)) return null;
    return {
        target,
        weight,
        rule: "unique-weighted-dependency-version"
    };
}

function NormalizeDependencyPath(value)
{
    const result = String(value ?? "")
        .replaceAll("\\", "/")
        .replace(/^\/+|\/+$/gu, "")
        .toLowerCase();

    if (!result
        || result.includes("#")
        || result.split("/").some(segment => !segment || segment === "." || segment === ".."))
    {
        return null;
    }
    return result;
}

function ResolveModifierPolicy(plan, modifierPolicies)
{
    const rules = CjsCharacterModifierOrder.resolveRules(
        modifierPolicies.map(value => value.metadata)
    );
    const categories = CjsCharacterModifierOrder.resolveCategories(rules);
    const ordered = CjsCharacterModifierOrder.sort(modifierPolicies, {
        categories,
        getCategory: value => value.category,
        getGroup: value => value.group
    });

    for (const value of ordered)
    {
        if (CjsCharacterModifierOrder.getSortKey(value.category, "", categories) !== -1)
        {
            continue;
        }

        AddDiagnostic(
            plan,
            "MODIFIER_CATEGORY_UNKNOWN",
            `Selection category ${JSON.stringify(value.category)} is absent from the native modifier order.`,
            "info",
            value.origin
        );
    }
}

function ResolveModifierOrderIdentity(groupID)
{
    const value = String(groupID ?? "");
    const makeupPrefix = "makeup/";

    if (value.startsWith(makeupPrefix))
    {
        return {
            category: "makeup",
            group: value.slice(makeupPrefix.length)
        };
    }

    return { category: value, group: "" };
}

function AddOrigin(plan, values)
{
    return plan.CreateOrigin(values);
}

function AddDiagnostic(plan, code, message, severity, origin = null)
{
    return plan.CreateDiagnostic({ code, message, severity, origin });
}

export default CjsCharacterAppearanceResolver;
