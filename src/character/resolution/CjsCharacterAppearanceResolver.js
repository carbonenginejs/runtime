import { CjsCharacterPartMetadata } from "../catalog/CjsCharacterPartMetadata.js";
import { CjsCharacterPartSource } from "../catalog/CjsCharacterPartSource.js";
import { CjsCharacterPartSourceVersion } from "../catalog/CjsCharacterPartSourceVersion.js";
import { CjsCharacterPartType } from "../catalog/CjsCharacterPartType.js";
import { CjsCharacterModifierLocation } from "../composition/CjsCharacterModifierLocation.js";
import { CjsCharacterPaperdoll } from "../creation/CjsCharacterPaperdoll.js";
import { CjsCharacterAppearanceDiagnostic } from "../planning/CjsCharacterAppearanceDiagnostic.js";
import { CjsCharacterAppearanceLayer } from "../planning/CjsCharacterAppearanceLayer.js";
import { CjsCharacterAppearancePlan } from "../planning/CjsCharacterAppearancePlan.js";
import { CjsCharacterAppearanceSelection } from "../planning/CjsCharacterAppearanceSelection.js";
import { CjsCharacterOrigin } from "../planning/CjsCharacterOrigin.js";
import { CjsCharacterResolvedPart } from "../planning/CjsCharacterResolvedPart.js";
import { CjsCharacterResource } from "../resources/CjsCharacterResource.js";

/** Resolves source-backed paper-doll selections without inventing character rendering policy. */
export class CjsCharacterAppearanceResolver
{

    /** Resolves one hydrated paper doll into the currently provable appearance-plan tranche. */
    static resolvePaperdoll(library, paperdoll)
    {
        if (!library
            || library.schema !== "carbonenginejs.characterLibrary"
            || library.schemaVersion !== 6
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

        plan.sourceBuild = library.sourceBuild;

        for (let modifierIndex = 0; modifierIndex < paperdoll.modifiers.length; modifierIndex++)
        {
            ResolveModifier(
                plan,
                paperdoll,
                paperdoll.modifiers[modifierIndex],
                modifierIndex,
                groupIDs
            );
        }

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

function ResolveModifier(plan, paperdoll, modifier, modifierIndex, groupIDs)
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

    const selection = new CjsCharacterAppearanceSelection();

    selection.groupID = location.modifierKey;
    selection.origin = selectionOrigin;
    plan.selections.push(selection);

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

    const partSource = partType.partSource;

    if (!(partSource instanceof CjsCharacterPartSource))
    {
        AddDiagnostic(
            plan,
            "PART_SOURCE_UNRESOLVED",
            `Part type ${JSON.stringify(partType.recordID)} has no exact part-source relationship.`,
            "warning",
            selectionOrigin
        );
        return;
    }

    if (partType.sex !== partSource.sex || partType.partPath !== partSource.partPath)
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

    DiagnosePartMetadata(plan, version.metadata, partSource, selectionOrigin);

    if (version.configurationCandidates.length !== 1 || version.geometryCandidates.length !== 1)
    {
        AddDiagnostic(
            plan,
            "PART_CANDIDATES_UNRESOLVED",
            `Part source ${JSON.stringify(partSource.recordID)} requires exactly one configuration and one geometry candidate.`,
            "warning",
            selectionOrigin
        );
        return;
    }

    const partOrigin = AddOrigin(plan, {
        kind: "derived",
        document: "characterPartSources",
        recordID: partSource.recordID,
        jsonPointer: `/versions/${versionIndex}`,
        rule: "unique-version-candidates"
    });
    const part = new CjsCharacterResolvedPart();

    part.configurationPath = version.configurationCandidates[0];
    part.geometryPath = version.geometryCandidates[0];
    part.origin = partOrigin;
    plan.parts.push(part);

    const layerOrigin = AddOrigin(plan, {
        kind: "derived",
        document: "paperdolls",
        recordID: paperdoll.recordID,
        jsonPointer: `/modifiers/${modifierIndex}`,
        rule: "exact-selection-part-chain"
    });
    const layer = new CjsCharacterAppearanceLayer();

    layer.owner = selection;
    layer.contributor = part;
    layer.origin = layerOrigin;
    plan.layers.push(layer);

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

function DiagnosePartMetadata(plan, metadata, partSource, origin)
{
    if (metadata === null)
    {
        return;
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
        return;
    }

    const hasRules = metadata.dependentModifiers.length
        || metadata.occludesModifiers.length
        || metadata.forcesLooseTop !== null
        || metadata.hidesBootShin !== null
        || metadata.lod1Replacement !== null
        || metadata.lod2Replacement !== null
        || metadata.swapTops !== null
        || metadata.swapBottom !== null
        || metadata.swapSocks !== null
        || metadata.wap !== null;

    if (hasRules)
    {
        AddDiagnostic(
            plan,
            "PART_METADATA_RULES_UNRESOLVED",
            `Part source ${JSON.stringify(partSource.recordID)} has authored dependency, occlusion, replacement, or compatibility rules.`,
            "warning",
            origin
        );
    }
}

function AddOrigin(plan, values)
{
    const origin = new CjsCharacterOrigin();

    for (const [ key, value ] of Object.entries(values))
    {
        origin[key] = value;
    }
    plan.origins.push(origin);
    return origin;
}

function AddDiagnostic(plan, code, message, severity, origin = null)
{
    const diagnostic = new CjsCharacterAppearanceDiagnostic();

    diagnostic.code = code;
    diagnostic.message = message;
    diagnostic.severity = severity;
    diagnostic.origin = origin;
    plan.diagnostics.push(diagnostic);
    return diagnostic;
}

export default CjsCharacterAppearanceResolver;
