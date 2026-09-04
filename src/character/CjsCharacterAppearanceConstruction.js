import { CjsCharacterFoundationCoveragePolicy } from "./CjsCharacterFoundationCoveragePolicy.js";
import { CjsCharacterTextureContributions } from "./CjsCharacterTextureContributions.js";
import { CjsCharacterTexturePolicy } from "./CjsCharacterTexturePolicy.js";

/**
 * Combines injected foundation construction with resolved plan parts into one
 * renderer-neutral appearance construction sequence.
 */
export class CjsCharacterAppearanceConstruction
{
    _foundationCoveragePolicy;

    _foundationResolver;

    _shouldDeferContribution;

    _texturePolicy;

    constructor({
        foundationResolver,
        foundationCoveragePolicy = new CjsCharacterFoundationCoveragePolicy(),
        texturePolicy = new CjsCharacterTexturePolicy(),
        shouldDeferContribution = IsNonRenderableRagdollProxy
    } = {})
    {
        if (typeof foundationResolver?.Resolve !== "function")
        {
            throw new TypeError("Character appearance construction requires a foundation resolver");
        }
        if (typeof texturePolicy?.Resolve !== "function")
        {
            throw new TypeError("Character appearance construction requires a texture policy");
        }
        if (typeof foundationCoveragePolicy?.Resolve !== "function")
        {
            throw new TypeError("Character appearance construction requires a foundation coverage policy");
        }
        if (typeof shouldDeferContribution !== "function")
        {
            throw new TypeError("Character appearance construction shouldDeferContribution must be a function");
        }

        this._foundationResolver = foundationResolver;
        this._foundationCoveragePolicy = foundationCoveragePolicy;
        this._texturePolicy = texturePolicy;
        this._shouldDeferContribution = shouldDeferContribution;
    }

    /** Produces foundation operations followed by every exact resolved plan part. */
    Resolve(paperdoll, appearancePlan, library)
    {
        if (!appearancePlan || typeof appearancePlan !== "object")
        {
            throw new TypeError("Character appearance construction requires an appearance plan");
        }
        if (!Array.isArray(appearancePlan.parts) || !Array.isArray(appearancePlan.layers))
        {
            throw new TypeError("Character appearance construction requires plan parts and layers");
        }
        if (!library || typeof library !== "object")
        {
            throw new TypeError("Character appearance construction requires the installed character library");
        }

        const expectedContributions = appearancePlan.layers.map((layer, layerIndex) =>
        {
            const partIndex = appearancePlan.parts.indexOf(layer?.contributor);
            const groupID = String(layer?.owner?.groupID ?? "").trim();
            if (partIndex === -1)
            {
                throw new Error(`Appearance layer ${layerIndex} does not reference a plan-owned part`);
            }
            if (!groupID)
            {
                throw new Error(`Appearance layer ${layerIndex} has no selection group`);
            }
            return { layerIndex, partIndex, groupID };
        });
        const foundation = this._foundationResolver.Resolve(paperdoll, appearancePlan, library);
        if (!foundation || !Array.isArray(foundation.operations) || !foundation.operations.length)
        {
            throw new TypeError("Character foundation resolver must return ordered operations");
        }
        const foundationSupports = ResolveFoundationSupports(foundation.operations);
        const operations = foundation.operations.slice(0, -1);
        const textureContributions = this._texturePolicy.Resolve(library, paperdoll, appearancePlan);
        const morphTargets = ResolveMorphTargets(appearancePlan);
        CjsCharacterTextureContributions.validate(
            textureContributions,
            expectedContributions,
            "Character appearance construction"
        );

        let configuredPartCount = 0;
        let deferredContributionCount = 0;
        for (let layerIndex = 0; layerIndex < appearancePlan.layers.length; layerIndex++)
        {
            const layer = appearancePlan.layers[layerIndex];
            const part = layer.contributor;
            const { partIndex, groupID } = expectedContributions[layerIndex];
            const common = {
                layerIndex,
                partIndex,
                groupID,
                partSourceRecordID: part.origin?.document === "characterPartSources"
                    ? String(part.origin.recordID ?? "").trim() || null
                    : null,
                evidence: {
                    status: part.origin?.kind ?? "derived",
                    document: part.origin?.document ?? null,
                    recordID: part.origin?.recordID ?? null,
                    rule: part.origin?.rule ?? "appearance-plan-resolved-part"
                }
            };
            const sourceVersion = ResolvePartSourceVersion(
                library,
                common.partSourceRecordID,
                part.origin?.jsonPointer
            );
            const retainedModel = ResolveRetainedRequestedLodModel(sourceVersion, part.requestedLod);
            const configurationPath = OptionalResourcePath(part.configurationPath)
                ?? retainedModel?.configurationPath
                ?? null;
            const geometryPath = OptionalResourcePath(part.geometryPath)
                ?? retainedModel?.geometryPath
                ?? null;
            const geometryCandidates = sourceVersion?.geometryCandidates
                ?.map(value => OptionalResourcePath(value))
                .filter(Boolean) ?? [];
            const configurationCandidateCount = sourceVersion?.configurationCandidates
                ?.map(value => OptionalResourcePath(value))
                .filter(Boolean).length ?? 0;
            const configuredVisualCandidateInventory = configurationCandidateCount
                || geometryCandidates.length
                ? {
                    configurationCount: configurationCandidateCount,
                    geometryCount: geometryCandidates.length
                }
                : null;

            if (configurationPath
                && (geometryPath || geometryCandidates.length)
                && this._shouldDeferContribution(common.partSourceRecordID, part, sourceVersion))
            {
                deferredContributionCount++;
                operations.push({
                    operation: "deferred-contribution",
                    ...common,
                    configurationPath,
                    geometryPath,
                    ...(configuredVisualCandidateInventory
                        ? { configuredVisualCandidateInventory }
                        : {}),
                    reason: "authored-nonrenderable-ragdoll-proxy"
                });
            }
            else if (configurationPath && (geometryPath || geometryCandidates.length))
            {
                const metadata = ResolvePartMetadata(
                    library,
                    common.partSourceRecordID,
                    part.origin?.jsonPointer
                );
                const foundationCoverage = ResolveConfiguredFoundationCoverage({
                    policy: this._foundationCoveragePolicy,
                    library,
                    appearancePlan,
                    layer,
                    sex: foundation.sex,
                    foundationLayout: foundation.evidence?.layout ?? null,
                    foundationSupports,
                    groupID,
                    partSourceRecordID: common.partSourceRecordID,
                    metadata
                });

                configuredPartCount++;
                operations.push({
                    operation: "configured-part",
                    ...common,
                    configurationPath,
                    geometryPath,
                    ...(geometryCandidates.length ? { geometryCandidates: [ ...geometryCandidates ] } : {}),
                    ...(retainedModel ? {
                        retainedVisualResolution: {
                            status: "derived",
                            rule: "exact-requested-lod-retained-candidate-pair-v1",
                            requestedLod: retainedModel.requestedLod
                        }
                    } : {}),
                    ...(foundationCoverage ? { foundationCoverage } : {})
                });
            }
            else
            {
                deferredContributionCount++;
                operations.push({
                    operation: "deferred-contribution",
                    ...common,
                    configurationPath,
                    geometryPath,
                    ...(configuredVisualCandidateInventory
                        ? { configuredVisualCandidateInventory }
                        : {})
                });
            }
        }

        operations.push(foundation.operations.at(-1));
        const hasContributions = appearancePlan.layers.length > 0;
        return {
            ...foundation,
            evidence: hasContributions ? {
                status: "policy",
                rule: "character-appearance-construction-v1",
                sourceRule: "reviewed-character-appearance-source-v1",
                foundationRule: foundation.evidence?.rule ?? null,
                resolvedPartRule: "appearance-plan-resolved-parts-v1"
            } : { ...foundation.evidence },
            resolvedPartCount: appearancePlan.layers.length,
            configuredPartCount,
            deferredContributionCount,
            textureContributions,
            morphTargets,
            operations
        };
    }
}

function ResolveConfiguredFoundationCoverage({
    policy,
    library,
    appearancePlan,
    layer,
    sex,
    foundationLayout,
    foundationSupports,
    groupID,
    partSourceRecordID,
    metadata
})
{
    const direct = policy.Resolve({
        sex,
        foundationLayout,
        foundationSupports,
        groupID,
        partSourceRecordID,
        metadata
    });
    if (direct) return direct;

    const replacement = ResolveSleeveReplacement(partSourceRecordID, sex);
    if (!replacement) return null;
    const owners = appearancePlan.layers.flatMap(candidate =>
    {
        if (candidate === layer || candidate?.owner !== layer?.owner) return [];
        const sourceID = ResolvePlanPartSourceRecordID(candidate?.contributor);
        if (!sourceID || /^(?:female|male)\/dependants(?:\/|$)/iu.test(sourceID)) return [];
        const ownerMetadata = ResolvePartMetadata(
            library,
            sourceID,
            candidate.contributor?.origin?.jsonPointer
        );
        return MetadataOwnsExactDependency(ownerMetadata, replacement.relativePath)
            ? [ { sourceID, metadata: ownerMetadata } ]
            : [];
    });
    if (owners.length !== 1) return null;

    const ownerCoverage = policy.Resolve({
        sex,
        foundationLayout,
        foundationSupports,
        groupID,
        partSourceRecordID,
        metadata: owners[0].metadata
    });
    const relationships = ownerCoverage?.evidence?.relationships?.filter(value =>
        value?.foundationRole === replacement.foundationRole
        && [
            "exact-foundation-support-parent-path",
            "exact-foundation-support-source-path"
        ].includes(value?.relation)) ?? [];
    if (!relationships.length) return null;

    return {
        ...ownerCoverage,
        roles: [ replacement.foundationRole ],
        evidence: {
            ...ownerCoverage.evidence,
            relationships: relationships.map(value => ({ ...value })),
            selectingPartSourceRecordID: owners[0].sourceID,
            configuredReplacementPartSourceRecordID: partSourceRecordID
        }
    };
}

function ResolveSleeveReplacement(partSourceRecordID, sex)
{
    const normalizedSex = String(sex ?? "").trim().toLowerCase();
    const normalizedSourceID = String(partSourceRecordID ?? "").trim().toLowerCase();
    const prefix = `${normalizedSex}/`;
    if (!normalizedSex || !normalizedSourceID.startsWith(prefix)) return null;

    const relativePath = normalizedSourceID.slice(prefix.length);
    const match = relativePath.match(/^dependants\/(sleevesupper|sleeveslower)\/([^/]+)$/u);
    if (!match || match[2] === "standard") return null;
    return {
        relativePath,
        foundationRole: match[1] === "sleevesupper" ? "sleevesUpper" : "sleevesLower"
    };
}

function MetadataOwnsExactDependency(metadata, relativePath)
{
    return Array.isArray(metadata?.dependencies) && metadata.dependencies.some(value =>
        String(value?.modifierPath ?? "").trim().toLowerCase() === relativePath);
}

function ResolvePlanPartSourceRecordID(part)
{
    return part?.origin?.document === "characterPartSources"
        ? String(part.origin.recordID ?? "").trim() || null
        : null;
}

function ResolveFoundationSupports(operations)
{
    return (operations ?? []).flatMap(value =>
    {
        const evidence = value?.evidence;
        const role = String(value?.role ?? "").trim();
        const partSourceRecordID = String(evidence?.supportPartSourceRecordID ?? "").trim();
        if (value?.operation !== "geometry"
            || evidence?.rule !== "exact-foundation-torso-support-dependency-v1"
            || !role
            || !partSourceRecordID)
        {
            return [];
        }
        return [ { role, partSourceRecordID } ];
    });
}

function ResolveMorphTargets(appearancePlan)
{
    if (!Array.isArray(appearancePlan.morphTargets)) return [];
    return appearancePlan.morphTargets.map((value, index) =>
    {
        const modifierPath = String(value?.modifierPath ?? "").trim().toLowerCase();
        const targetName = String(value?.targetName ?? "").trim();
        const weight = Number(value?.weight);
        const ownerGroupID = String(value?.owner?.groupID ?? "").trim();
        if (!IsSupportedMorphPath(modifierPath)
            || !targetName
            || !Number.isFinite(weight)
            || !ownerGroupID)
        {
            throw new TypeError(
                `Character appearance morph target ${index} is not an exact resolved request`
            );
        }
        return {
            modifierPath,
            targetName,
            weight,
            ownerGroupID,
            evidence: {
                status: "policy",
                rule: "normalized-character-morph-target-v1",
                sourceRule: "reviewed-normalized-morph-target-source-v1",
                sourceStatus: value.origin?.kind ?? null,
                document: value.origin?.document ?? null,
                recordID: value.origin?.recordID ?? null,
                jsonPointer: value.origin?.jsonPointer ?? null,
                sourceRuleDetail: value.origin?.rule ?? null
            }
        };
    });
}

function IsSupportedMorphPath(value)
{
    return [ "utilityshapes/", "sculpt/" ].some(prefix =>
        value.startsWith(prefix) && value.length > prefix.length);
}

/** Preserves the reviewed proxy classification as an injectable policy. */
function IsNonRenderableRagdollProxy(partSourceRecordID)
{
    return /^(?:female|male)\/dependants\/ragdoll(?:\/|$)/iu.test(
        String(partSourceRecordID ?? "").trim()
    );
}

function ResolvePartMetadata(library, recordID, jsonPointer)
{
    const version = ResolvePartSourceVersion(library, recordID, jsonPointer);
    if (version?.metadata) return version.metadata;
    if (!recordID || typeof library?.Get !== "function") return null;
    const source = library.Get("characterPartSources", recordID);
    return source?.metadata ?? null;
}

function ResolvePartSourceVersion(library, recordID, jsonPointer)
{
    if (!recordID || typeof library?.Get !== "function") return null;
    const source = library.Get("characterPartSources", recordID);
    const match = String(jsonPointer ?? "").match(/^\/versions\/(\d+)$/u);
    return match ? source?.versions?.[Number(match[1])] ?? null : null;
}

function ResolveRetainedRequestedLodModel(version, requestedLod)
{
    const lod = Number(requestedLod);
    if (!Number.isInteger(lod) || lod < 0) return null;
    const configurations = ResolveRequestedLodCandidates(
        version?.configurationCandidates,
        lod,
        "black"
    );
    const geometries = ResolveRequestedLodCandidates(version?.geometryCandidates, lod, "gr2");
    if (configurations.length !== 1 || geometries.length !== 1) return null;

    const configurationPath = configurations[0];
    const geometryPath = geometries[0];
    if (ModelStem(configurationPath, "black") !== ModelStem(geometryPath, "gr2")) return null;
    return { configurationPath, geometryPath, requestedLod: lod };
}

function ResolveRequestedLodCandidates(values, lod, extension)
{
    const suffix = new RegExp(`_lod${lod}\\.${extension}$`, "iu");
    return (values ?? []).map(value => OptionalResourcePath(value))
        .filter(value => value && suffix.test(value));
}

function ModelStem(value, extension)
{
    return String(value).replace(new RegExp(`\\.${extension}$`, "iu"), "")
        .replaceAll("\\\\", "/")
        .toLowerCase();
}

function RequireResourcePath(value, label)
{
    const result = String(value ?? "").trim();
    if (!/^res:\//iu.test(result))
    {
        throw new TypeError(`Character appearance construction ${label} must be a res:/ path`);
    }
    return result;
}

function OptionalResourcePath(value)
{
    const result = String(value ?? "").trim();
    return result ? RequireResourcePath(result, "optional contribution path") : null;
}

export default CjsCharacterAppearanceConstruction;
