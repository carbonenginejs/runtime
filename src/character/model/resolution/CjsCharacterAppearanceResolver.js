import { CjsSchema } from "#schema";

import { CjsAvatarPartMetaData } from "../catalog/CjsAvatarPartMetaData.js";
import { CjsCharacterModifierReference } from "../catalog/CjsCharacterModifierReference.js";
import { CjsCharacterPartSource } from "../catalog/CjsCharacterPartSource.js";
import { CjsCharacterPartSourceVersion } from "../catalog/CjsCharacterPartSourceVersion.js";
import { CjsCharacterPartModelBundle } from "../catalog/CjsCharacterPartModelBundle.js";
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

    /**
     * Resolves schema-12 prepared inputs by exact catalog identity for files-only
     * applications. A/BC profiles remain separate; this does not combine colors
     * or establish shader bindings. Defaults require a real typed dependency.
     */
    static resolveCatalog(library, { partSource, resourceVersion = null, partType = null,
        colorLocation = null, colorNameA = null, colorNameBC = null, dependency = null } = {})
    {
        if (library.schemaVersion !== 12 || library.Get("characterPartSources", partSource.recordID) !== partSource)
            throw new TypeError("Catalog resolution requires a schema-12 source from this library");
        const versions = partSource.versions.filter(value => value.resourceVersion === resourceVersion);
        if (versions.length !== 1 || !versions[0].textureCandidateInput)
            throw new Error("Source version is ambiguous or not prepared");
        if (versions[0].textureCandidates.length && !versions[0].effectiveTextureBindings.length)
            throw new Error("Source texture channels have not been prepared");
        const select = (kind, match) =>
        {
            const bindings = partSource.materialBindings.filter(value => value.kind === kind && match(value));
            if (bindings.length !== 1 || !bindings[0].materialProfile)
                throw new Error(`Material selection requires one resolved ${kind} binding`);
            if (bindings[0].materialProfile.pattern && (!bindings[0].materialProfile.patternTexturePath || !bindings[0].materialProfile.patternOrigin))
                throw new Error("Selected pattern has not been prepared");
            return bindings[0].materialProfile;
        };
        let materialProfile = null;
        if (partType) materialProfile = select("type", value => value.partType === partType);
        else if (dependency)
        {
            if (dependency.partSource !== partSource || !library.GetDocument("characterPartMetadata").some(metadata =>
                metadata.dependencies.includes(dependency))) throw new Error("Default material requires an exact typed dependency");
            materialProfile = select("dependency-default", () => true);
        }
        const color = name => name ? select("color", value => value.colorLocation === colorLocation && value.colorName === name) : null;
        return { partSource, version: versions[0], materialProfile,
            colorA: color(colorNameA), colorBC: color(colorNameBC),
            textureBindings: versions[0].effectiveTextureBindings };
    }

    /**
     * Resolves one hydrated paper doll into the currently provable appearance-plan tranche.
     *
     * - Source: the part type's `partSources` are filtered by the resource's
     *   `resGender` (0 female, 1 male, any other value keeps every sex);
     *   anything but one match is a diagnostic. The deterministic
     *   `sourcePath` representative is never used to choose a source. Every strict selected source-version match becomes a plan
     *   part and layer, and every exact texture candidate is kept.
     * - Model choice: configuration/geometry are filled when each candidate is
     *   unique or one model bundle is retained. With a non-negative integer
     *   `options.requestedLod`, one exact labelled-LOD bundle wins; several
     *   require one normalized part-family match. Otherwise a sole bundle is
     *   used. There is no nearest-LOD search, and requested and resolved LOD
     *   are separate fields.
     * - Dependencies: a typed reference to an exact part source selects the
     *   unique dependency version equal to the requester's version, else the
     *   unique unversioned version; ambiguity is a diagnostic. A non-utility
     *   `path###<number>` is decoded only with a matching typed relation; the
     *   relation's weight wins over the suffix and is kept on the layer.
     * - Suppression: an active selection is suppressed when another active
     *   selection has an exact typed modifier-location occlusion or an exact
     *   typed `clothingRemovesCategory` targeting its location. It stays in
     *   the plan with provenance, but its layers, utility requests and order
     *   policy do not; cycles stay active with a conflict diagnostic.
     * - Utility shapes: `utilityshapes/<target>` requests weight 1 and
     *   `utilityshapes/<target>###<number>` that weight (zero and >1 allowed,
     *   never clamped); a matching relation's weight wins. Other `#` forms
     *   stay unresolved. Occlusions suppress the same path; conflicting
     *   active weights give a diagnostic and no request. Results land in
     *   `plan.morphTargets` for the renderer to match.
     * - Colours: every paper-doll colour selection is copied into the plan; an
     *   unresolved reference is a diagnostic, never a default.
     *
     * - Not resolved, reported instead of guessed: texture roles and placement
     *   (`TEXTURE_ROLES_UNRESOLVED`), colour-variant materials
     *   (`MATERIAL_SELECTION_UNRESOLVED`), unresolved authored occlusions
     *   (`OCCLUSION_POLICY_UNRESOLVED`), and the resource coverage rules
     *   `clothingAlsoCoversCategory`, `clothingAlsoCoversCategory2` and
     *   `clothingRuleException` (`CLOTHING_RULES_UNRESOLVED`). A plan with
     *   layers always carries `PASS_ORDER_UNRESOLVED`.
     *
     * It creates no targets or passes and merges no version inventories. A
     * plan therefore does not qualify material/texture roles, normal-input
     * combination, category coverage, accessory packing or tuck behaviour;
     * missing evidence is a diagnostic, derived values carry a `derived`
     * origin, and nothing is inferred from filenames.
     */
    static resolvePaperdoll(library, paperdoll, options = {})
    {
        if (!library
            || library.schema !== "carbonenginejs.characterLibrary"
            || ![ 7, 8, 9, 10, 11, 12 ].includes(library.schemaVersion))
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
        const requestedLod = Number.isInteger(options.requestedLod)
            && options.requestedLod >= 0
            ? options.requestedLod
            : null;

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
                utilityOcclusions,
                requestedLod
            );
        }

        const activeModifierPolicies = ResolveSelectionSuppressions(
            plan,
            modifierPolicies,
            utilityRequests,
            utilityOcclusions
        );
        ResolveModifierPolicy(plan, activeModifierPolicies);
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

    /**
     * Walks the selections' suppression graph: an edge says `owner` suppresses
     * `target`. A selection on a cycle stays active. Otherwise suppression runs
     * from the roots (active selections no active selection suppresses, outside
     * a shared cycle), so a suppressed selection's own edges stop applying: if A
     * suppresses B and B suppresses C, C stays active.
     * @param {any[]} nodes The selections, in order.
     * @param {Map<any, {owner: any, rules: Set<string>}[]>} suppressions Edges by target: who suppresses it, and through which rules.
     * @returns {{cyclic: any[], applied: Map<any, {owner: any, rules: Set<string>}[]>}}
     *   The selections left active by a cycle, in node order, and each suppressed selection with the edges that applied, in application order.
     */
    static resolveSuppressions(nodes, suppressions)
    {
        const cyclic = nodes.filter(value =>
            HasSuppressionPath(suppressions, value, value));

        const active = new Set(nodes);
        const applied = new Map();
        while (true)
        {
            const roots = [ ...active ].filter(target =>
                !(suppressions.get(target) ?? []).some(value =>
                    active.has(value.owner)
                    && !ShareSuppressionCycle(suppressions, value.owner, target)));
            const next = new Map();
            for (const owner of roots)
            {
                for (const [ target, owners ] of suppressions)
                {
                    if (!active.has(target)
                        || ShareSuppressionCycle(suppressions, owner, target)) continue;
                    const value = owners.find(candidate => candidate.owner === owner);
                    if (!value) continue;
                    if (!next.has(target)) next.set(target, []);
                    next.get(target).push(value);
                }
            }
            if (!next.size) break;
            for (const [ target, owners ] of next)
            {
                active.delete(target);
                applied.set(target, owners);
            }
        }
        return { cyclic, applied };
    }

    /**
     * Decodes one authored `dependantModifiers` entry as a utility-shape
     * request: `utilityshapes/<target>` at weight 1, or
     * `utilityshapes/<target>###<number>` at that weight (zero and >1
     * allowed, never clamped). Any other `#` form, a non-numeric suffix and a
     * path outside `utilityshapes/` are unresolved.
     * @param {string} authoredValue The entry as authored.
     * @param {number|null} [relationWeight=null] A typed relation's weight; it wins over the suffix.
     * @param {string|null} [relationPath=null] A typed relation's modifier path; it wins over the authored path.
     * @returns {{modifierPath: string, targetName: string, weight: number, explicitWeight: boolean}|null}
     *   The lower-case normalized path, the morph target (the path's last segment, as authored), and its weight; null when unresolved.
     */
    static decodeUtilityShape(authoredValue, relationWeight = null, relationPath = null)
    {
        const authored = String(authoredValue);
        const weighted = authored.match(/^(utilityshapes\/.+?)###([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)$/iu);
        let base = authored;
        let weight = relationWeight;
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

        const modifierPath = NormalizeUtilityPath(relationPath ?? base);
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

    /**
     * Decodes one authored `occludesModifiers` entry as a utility-shape
     * occlusion. An entry carrying `#` is unresolved.
     * @param {string} authoredValue The entry as authored.
     * @param {string|null} [relationPath=null] A typed relation's modifier path; it wins over the authored path.
     * @returns {{modifierPath: string}|null} The lower-case normalized path; null when unresolved or not a utility shape.
     */
    static decodeUtilityOcclusion(authoredValue, relationPath = null)
    {
        if (String(authoredValue).includes("#")) return null;
        const modifierPath = NormalizeUtilityPath(relationPath ?? authoredValue);
        return modifierPath ? { modifierPath } : null;
    }

    /**
     * Applies the utility-shape rule to the active selections' requests and
     * occlusions, grouped by path in first-request order. A request is
     * suppressed by any occlusion of its path, unless that occlusion's
     * `protectedOwner` is the request's owner. Requests left with differing
     * weights are a conflict and request nothing; otherwise all are retained.
     * @param {{modifierPath: string, weight: number, owner: any}[]} requests Decoded requests (decodeUtilityShape), each with its owner.
     * @param {{modifierPath: string, protectedOwner: any}[]} occlusions Decoded occlusions; `protectedOwner` is null when none.
     * @returns {{modifierPath: string, suppressed: object[], retained: object[], conflict: boolean}[]} One record per requested path.
     */
    static resolveUtilityShapes(requests, occlusions)
    {
        const grouped = new Map();

        for (const request of requests)
        {
            if (!grouped.has(request.modifierPath)) grouped.set(request.modifierPath, []);
            grouped.get(request.modifierPath).push(request);
        }

        const result = [];
        for (const [ modifierPath, values ] of grouped)
        {
            const matchingOcclusions = occlusions.filter(value =>
                value.modifierPath === modifierPath);
            const suppressed = [];
            const retained = [];

            for (const value of values)
            {
                if (matchingOcclusions.some(occlusion =>
                    occlusion.protectedOwner === null
                    || occlusion.protectedOwner !== value.owner)) suppressed.push(value);
                else retained.push(value);
            }

            result.push({ modifierPath, suppressed, retained, conflict: new Set(retained.map(value => value.weight)).size > 1 });
        }
        return result;
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
        const location = value?.colorLocation;
        const colorA = value?.colorA;
        const colorBC = value?.colorBC;

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
    utilityOcclusions,
    requestedLod
)
{
    const selectionOrigin = AddOrigin(plan, {
        kind: "decoded",
        document: "paperdolls",
        recordID: paperdoll.recordID,
        jsonPointer: `/modifiers/${modifierIndex}`
    });
    const location = modifier?.modifierLocation;

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
        location,
        resource: null,
        selection,
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

    const resource = modifier.paperdollResource;

    if (!(resource instanceof CjsCharacterResource))
    {
        AddDiagnostic(
            plan,
            "CHARACTER_RESOURCE_UNRESOLVED",
            DescribeUnresolved(
                library,
                "paperdolls",
                paperdoll.recordID,
                `modifiers[${modifierIndex}].paperdollResourceID`,
                `Selection ${JSON.stringify(selection.groupID)} has no resolved character resource`
            ),
            "warning",
            selectionOrigin
        );
        return;
    }

    modifierPolicy.resource = resource;

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
        versionIndex,
        selectionOrigin
    );
    CollectUtilityShapes(
        plan,
        modifierPolicy.metadata,
        selection,
        utilityRequests,
        utilityOcclusions
    );

    const modelBundle = ResolveModelBundle(version, requestedLod, partSource.partPath);
    const hasConfiguration = Boolean(modelBundle)
        || version.configurationCandidates.length === 1;
    const hasGeometry = Boolean(modelBundle)
        || version.geometryCandidates.length === 1;

    if (!hasConfiguration || !hasGeometry)
    {
        AddDiagnostic(
            plan,
            "PART_CANDIDATES_UNRESOLVED",
            `Part source ${JSON.stringify(partSource.recordID)} has no unique configuration/geometry model for the requested LOD.`,
            "warning",
            selectionOrigin
        );
    }

    const partOrigin = AddOrigin(plan, {
        kind: "derived",
        document: "characterPartSources",
        recordID: partSource.recordID,
        jsonPointer: `/versions/${versionIndex}`,
        rule: modelBundle
            ? requestedLod !== null && modelBundle.lod === requestedLod
                ? "requested-lod-model-bundle"
                : "unique-version-model-bundle"
            : hasConfiguration && hasGeometry
                ? "unique-version-candidates"
                : "exact-source-version"
    });
    const part = plan.CreatePart({
        configurationPath: modelBundle?.configurationPath
            ?? (hasConfiguration ? version.configurationCandidates[0] : null),
        geometryPath: modelBundle?.geometryPath
            ?? (hasGeometry ? version.geometryCandidates[0] : null),
        texturePaths: [ ...version.textureCandidates ],
        requestedLod,
        resolvedLod: modelBundle?.lod ?? null,
        modelFamily: modelBundle?.modelFamily ?? null,
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
        version,
        selection,
        requestedLod,
        utilityRequests,
        utilityOcclusions
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
    const hasUnresolvedCoverageRules = [
        resource.clothingAlsoCoversModifierLocation,
        resource.clothingAlsoCoversModifierLocation2
    ].some(Boolean);

    if (hasUnresolvedCoverageRules || resource.clothingRuleException !== null)
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

function DiagnosePartMetadata(library, plan, metadata, partSource, versionIndex, origin)
{
    if (metadata === null)
    {
        // Null is "no metadata" unless the source named a record that does
        // not exist (the library lists those).
        const field = `versions[${versionIndex}].metadata`;
        if (library.GetUnresolvedRelationship("characterPartSources", partSource.recordID, field) !== null)
        {
            AddDiagnostic(
                plan,
                "PART_METADATA_UNRESOLVED",
                DescribeUnresolved(
                    library,
                    "characterPartSources",
                    partSource.recordID,
                    field,
                    `Part source ${JSON.stringify(partSource.recordID)} has no exact effective metadata relationship`
                ),
                "warning",
                origin
            );
        }
        return null;
    }

    if (!(metadata instanceof CjsAvatarPartMetaData))
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

    for (let index = 0; index < metadata.dependantModifiers.length; index++)
    {
        const value = metadata.dependantModifiers[index];
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
            && (relation.modifierLocation instanceof CjsCharacterModifierLocation
                || DecodeUtilityOcclusion(relation, value)))
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

function ResolveSelectionSuppressions(
    plan,
    modifierPolicies,
    utilityRequests,
    utilityOcclusions
)
{
    const suppressions = new Map();

    for (const owner of modifierPolicies)
    {
        const targets = [];
        for (const value of [
            owner.resource?.clothingRemovesModifierLocation,
            owner.resource?.clothingRemovesModifierLocation2
        ])
        {
            if (value instanceof CjsCharacterModifierLocation)
            {
                targets.push({ location: value, rule: "typed-clothing-removal" });
            }
        }
        for (let index = 0; index < (owner.metadata?.occlusions?.length ?? 0); index++)
        {
            const relation = owner.metadata.occlusions[index];
            if (!(relation instanceof CjsCharacterModifierReference)
                || !(relation.modifierLocation instanceof CjsCharacterModifierLocation)
                || relation.authoredValue !== owner.metadata.occludesModifiers[index])
            {
                continue;
            }
            targets.push({
                location: relation.modifierLocation,
                rule: "typed-modifier-location-occlusion"
            });
        }

        for (const target of targets)
        {
            for (const candidate of modifierPolicies)
            {
                if (candidate === owner || candidate.location !== target.location) continue;
                const existing = suppressions.get(candidate);
                if (!existing) suppressions.set(candidate, []);
                const current = suppressions.get(candidate).find(value =>
                    value.owner === owner);
                if (current)
                {
                    current.rules.add(target.rule);
                }
                else
                {
                    suppressions.get(candidate).push({
                        owner,
                        rules: new Set([ target.rule ])
                    });
                }
            }
        }
    }

    const { cyclic, applied: appliedSuppressions } = CjsCharacterAppearanceResolver.resolveSuppressions(modifierPolicies, suppressions);
    for (const target of cyclic)
    {
        AddDiagnostic(
            plan,
            "SELECTION_SUPPRESSION_CONFLICT",
            `Selection ${JSON.stringify(target.selection.groupID)} participates in a cyclic exact suppression and remains active.`,
            "warning",
            target.origin
        );
    }

    const suppressedSelections = new Set();
    for (const [ target, owners ] of appliedSuppressions)
    {
        suppressedSelections.add(target.selection);
        for (const value of owners)
        {
            AddDiagnostic(
                plan,
                "SELECTION_SUPPRESSED",
                `Selection ${JSON.stringify(target.selection.groupID)} is suppressed by ${JSON.stringify(value.owner.selection.groupID)} through an exact typed relationship.`,
                "info",
                value.owner.origin
            );
        }
    }

    if (!suppressedSelections.size) return modifierPolicies;

    for (const layer of [ ...plan.layers ])
    {
        if (suppressedSelections.has(layer.owner)) plan.RemoveLayer(layer);
    }
    const retainedParts = new Set(plan.layers.map(layer => layer.contributor));
    for (const part of [ ...plan.parts ])
    {
        if (!retainedParts.has(part)) plan.RemovePart(part);
    }
    FilterOwnedRequests(utilityRequests, suppressedSelections);
    FilterOwnedRequests(utilityOcclusions, suppressedSelections);
    return modifierPolicies.filter(value => !suppressedSelections.has(value.selection));
}

function HasSuppressionPath(suppressions, owner, target, visited = new Set())
{
    if (visited.has(owner)) return false;
    visited.add(owner);
    for (const [ candidate, owners ] of suppressions)
    {
        if (!owners.some(value => value.owner === owner)) continue;
        if (candidate === target
            || HasSuppressionPath(suppressions, candidate, target, visited))
        {
            return true;
        }
    }
    return false;
}

function ShareSuppressionCycle(suppressions, left, right)
{
    return HasSuppressionPath(suppressions, left, right)
        && HasSuppressionPath(suppressions, right, left);
}

function FilterOwnedRequests(values, suppressedSelections)
{
    const retained = values.filter(value => !suppressedSelections.has(value.owner));
    values.splice(0, values.length, ...retained);
}

/** Collects typed utility requests while retaining the owner scope of nested coordinators. */
function CollectUtilityShapes(
    plan,
    metadata,
    owner,
    requests,
    occlusions,
    { protectedOwner = null } = {}
)
{
    if (!(metadata instanceof CjsAvatarPartMetaData)) return;

    for (let index = 0; index < metadata.dependantModifiers.length; index++)
    {
        const authoredValue = metadata.dependantModifiers[index];
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
            protectedOwner,
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
    for (const { modifierPath, suppressed, retained, conflict } of CjsCharacterAppearanceResolver.resolveUtilityShapes(requests, occlusions))
    {
        for (const value of suppressed)
        {
            AddDiagnostic(
                plan,
                "UTILITY_SHAPE_SUPPRESSED",
                `Utility shape ${JSON.stringify(modifierPath)} is suppressed by an exact active occlusion.`,
                "info",
                value.origin
            );
        }

        if (!retained.length) continue;

        if (conflict)
        {
            AddDiagnostic(
                plan,
                "UTILITY_SHAPE_WEIGHT_CONFLICT",
                `Utility shape ${JSON.stringify(modifierPath)} has conflicting active weights.`,
                "warning",
                retained[0].origin
            );
            continue;
        }

        for (const value of retained)
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

    return CjsCharacterAppearanceResolver.decodeUtilityShape(authoredValue, relation.weight, relation.modifierPath);
}

function DecodeUtilityOcclusion(relation, authoredValue)
{
    if (!(relation instanceof CjsCharacterModifierReference)
        || relation.authoredValue !== authoredValue)
    {
        return null;
    }

    return CjsCharacterAppearanceResolver.decodeUtilityOcclusion(authoredValue, relation.modifierPath);
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

function ResolvePartDependencies(
    library,
    plan,
    metadata,
    requestingSource,
    requestingVersion,
    owner,
    requestedLod,
    utilityRequests,
    utilityOcclusions
)
{
    if (!(metadata instanceof CjsAvatarPartMetaData)) return;

    for (let index = 0; index < metadata.dependantModifiers.length; index++)
    {
        const authoredValue = metadata.dependantModifiers[index];
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
        const retainedVersions = target.versions.filter(value =>
            value instanceof CjsCharacterPartSourceVersion);
        const exactVersions = retainedVersions.filter(value =>
            value.resourceVersion === requestingVersion.resourceVersion);
        const versions = exactVersions.length
            ? exactVersions
            : retainedVersions.filter(value => value.resourceVersion === null);
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
                + "exact owner-version or unversioned-default matches.",
                "warning",
                relationOrigin
            );
            continue;
        }

        const version = versions[0];
        const versionIndex = target.versions.indexOf(version);
        const dependencyMetadata = DiagnosePartMetadata(
            library,
            plan,
            version.metadata,
            target,
            versionIndex,
            relationOrigin
        );
        // Dependency metadata is retained evidence, not recursively active
        // selection policy. Promote only the exact typed boot-shin capability;
        // its authored utility list coordinates another selected owner without
        // cancelling the requesting garment's own fit shapes.
        if (dependencyMetadata?.hidesBootShin === true)
        {
            CollectUtilityShapes(
                plan,
                dependencyMetadata,
                owner,
                utilityRequests,
                utilityOcclusions,
                { protectedOwner: owner }
            );
        }
        const modelBundle = ResolveModelBundle(version, requestedLod, target.partPath);
        const hasConfiguration = Boolean(modelBundle)
            || version.configurationCandidates.length === 1;
        const hasGeometry = Boolean(modelBundle)
            || version.geometryCandidates.length === 1;
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
            rule: modelBundle ? `${decoded.rule}-model-bundle` : decoded.rule
        });
        const part = plan.CreatePart({
            configurationPath: modelBundle?.configurationPath
                ?? (hasConfiguration ? version.configurationCandidates[0] : null),
            geometryPath: modelBundle?.geometryPath
                ?? (hasGeometry ? version.geometryCandidates[0] : null),
            texturePaths: [ ...version.textureCandidates ],
            requestedLod,
            resolvedLod: modelBundle?.lod ?? null,
            modelFamily: modelBundle?.modelFamily ?? null,
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

function ResolveModelBundle(version, requestedLod, partPath)
{
    const bundles = (version?.modelBundles ?? []).filter(bundle =>
        bundle instanceof CjsCharacterPartModelBundle
        && version.configurationCandidates.includes(bundle.configurationPath)
        && version.geometryCandidates.includes(bundle.geometryPath));

    if (requestedLod !== null)
    {
        const exact = bundles.filter(bundle => bundle.lod === requestedLod);
        if (exact.length === 1) return exact[0];
        if (exact.length > 1)
        {
            const family = NormalizeModelFamily(String(partPath ?? "").split("/").at(-1));
            const familyMatches = exact.filter(bundle => bundle.modelFamily === family);
            return familyMatches.length === 1 ? familyMatches[0] : null;
        }
    }

    return bundles.length === 1 ? bundles[0] : null;
}

function NormalizeModelFamily(value)
{
    const result = String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/gu, "");
    return result || null;
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

/**
 * A diagnostic message naming the record and member, and the missing identity
 * when the library recorded one.
 */
function DescribeUnresolved(library, documentName, recordID, field, subject)
{
    const entry = library.GetUnresolvedRelationship(documentName, recordID, field);
    const where = `${documentName} ${recordID} field ${field}`;
    return entry === null
        ? `${subject}: ${where}.`
        : `${subject}: ${where} names ${entry.targetDocument} ${entry.targetID}, which does not exist.`;
}

function AddDiagnostic(plan, code, message, severity, origin = null)
{
    return plan.CreateDiagnostic({ code, message, severity, origin });
}

export default CjsCharacterAppearanceResolver;

CjsSchema.meta.define("CjsCharacterAppearanceResolver")(CjsCharacterAppearanceResolver);
