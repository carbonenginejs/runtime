const FOOTWEAR_HEIGHTS = new Set([ "low", "shin", "medium", "knee", "high", "xhigh" ]);

const FOUNDATION_ROLE_BY_MODIFIER_LOCATION = new Map([
    [ "topinner", "torso" ],
    [ "bottominner", "legs" ],
    [ "feet", "feet" ],
    [ "hands", "hands" ]
]);

/**
 * Resolves retained character metadata into renderer-neutral foundation
 * coverage intent. A realization AL decides how each role is concealed.
 */
export class CjsCharacterFoundationCoveragePolicy
{
    /** Returns one detached coverage request, or null when none is proven. */
    Resolve({
        sex,
        foundationLayout = null,
        foundationSupports = [],
        groupID,
        partSourceRecordID,
        metadata = null
    } = {})
    {
        const normalizedSex = String(sex ?? "").trim();
        const normalizedGroupID = String(groupID ?? "").trim();
        const normalizedSourceID = String(partSourceRecordID ?? "").trim();
        const footwear = normalizedGroupID === "feet"
            ? ResolveAuthoredFootwearHeight(metadata)
            : null;
        const authoredCoverage = ResolveAuthoredModifierCoverage(
            metadata,
            normalizedSex,
            foundationLayout,
            foundationSupports
        );

        if (authoredCoverage?.length)
        {
            return {
                intent: "conceal-foundation",
                roles: [ ...new Set(authoredCoverage.map(value => value.foundationRole)) ],
                evidence: {
                    status: "policy",
                    rule: "authored-modifier-foundation-coverage-v1",
                    sourceRule: "reviewed-authored-modifier-coverage-source-v1",
                    sex: normalizedSex,
                    ...(normalizedSex === "female" ? {
                        foundationLayout: String(foundationLayout ?? "")
                    } : {}),
                    groupID: normalizedGroupID,
                    partSourceRecordID: normalizedSourceID,
                    relationships: authoredCoverage.map(value => ({ ...value }))
                }
            };
        }

        if (footwear?.height === "shoe") return null;
        if (footwear && FOOTWEAR_HEIGHTS.has(footwear.height))
        {
            const female = normalizedSex === "female";
            const male = normalizedSex === "male";
            if (!female && !male) return null;

            return {
                intent: "conceal-foundation",
                roles: [ female && foundationLayout !== "split-lod0" ? "body" : "feet" ],
                coverageKind: "footwear",
                footwearHeight: footwear.height,
                evidence: {
                    status: "policy",
                    rule: "authored-footwear-foundation-coverage-v1",
                    sourceRule: "reviewed-authored-footwear-coverage-source-v1",
                    sex: normalizedSex,
                    groupID: normalizedGroupID,
                    partSourceRecordID: normalizedSourceID,
                    footwearHeight: footwear.height,
                    authoredModifierPaths: footwear.authoredModifierPaths
                }
            };
        }

        return null;
    }
}

/**
 * Maps exact authored occlusions to independently captured nude carriers.
 * Category-to-carrier coverage requires a split foundation: male foundations
 * are always split, while female coverage is enabled only for the explicit
 * split-lod0 layout. Sleeve support coverage is sex-neutral because the exact
 * torso dependency and the selected garment's matching parent-path occlusion
 * are both retained.
 */
function ResolveAuthoredModifierCoverage(metadata, sex, foundationLayout, foundationSupports)
{
    if (!metadata || !Array.isArray(metadata.occlusions)) return [];

    const references = metadata.occlusions.map(reference =>
    {
        const authoredValue = String(reference?.authoredValue ?? "").trim().toLowerCase();
        const modifierLocationKey = String(
            reference?.modifierLocation?.modifierKey ?? ""
        ).trim().toLowerCase();
        const modifierPath = String(reference?.modifierPath ?? "").trim().toLowerCase()
            || StripModifierWeight(authoredValue);
        return {
            authoredValue,
            modifierLocationKey,
            modifierPath,
            resolvedKey: modifierLocationKey || modifierPath
        };
    });

    // The combined female foundation has one body carrier rather than
    // independently addressable torso, legs, hands, and feet. A coverage
    // request is valid only when authored metadata proves the full set.
    if (sex === "female" && foundationLayout === "combined")
    {
        const required = [ "topinner", "bottominner", "feet", "hands" ];
        const byKey = new Map(references.map(value => [ value.resolvedKey, value ]));
        if (required.every(value => byKey.has(value)))
        {
            return required.map(value => ({
                authoredValue: byKey.get(value).authoredValue,
                modifierLocationKey: value,
                foundationRole: "body",
                relation: "exact-combined-full-body-modifier-set"
            }));
        }
    }

    const supportRoles = ResolveFoundationSupportRoles(sex, foundationLayout, foundationSupports);
    const hasSplitFoundation = sex === "male"
        || (sex === "female" && foundationLayout === "split-lod0");
    const result = [];
    for (const reference of references)
    {
        const { authoredValue, modifierLocationKey, modifierPath, resolvedKey } = reference;
        const foundationRole = hasSplitFoundation
            ? FOUNDATION_ROLE_BY_MODIFIER_LOCATION.get(resolvedKey)
            : null;

        if (foundationRole)
        {
            result.push({
                authoredValue,
                modifierLocationKey: resolvedKey,
                foundationRole,
                relation: modifierLocationKey
                    ? "typed-modifier-location"
                    : "exact-modifier-path-fallback"
            });
            continue;
        }

        const support = supportRoles.get(modifierPath);
        if (!support) continue;

        result.push({
            authoredValue,
            modifierPath,
            supportPartSourceRecordID: support.partSourceRecordID,
            foundationRole: support.role,
            relation: support.relation
        });
    }

    return result;
}

/** Removes one authored trailing dependency weight without inferring its path. */
function StripModifierWeight(value)
{
    return String(value ?? "")
        .replace(/#+[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/u, "")
        .trim();
}

/** Builds the exact parent-path-to-carrier map retained by foundation setup. */
function ResolveFoundationSupportRoles(sex, foundationLayout, foundationSupports)
{
    const normalizedSex = String(sex ?? "").trim().toLowerCase();
    const result = new Map();

    for (const value of foundationSupports ?? [])
    {
        const role = String(value?.role ?? "").trim();
        const partSourceRecordID = String(value?.partSourceRecordID ?? "").trim().toLowerCase();
        const prefix = `${normalizedSex}/dependants/`;
        if (!role || !partSourceRecordID.startsWith(prefix)) continue;

        const relative = partSourceRecordID.slice(`${normalizedSex}/`.length);
        const separator = relative.lastIndexOf("/");
        if (separator <= 0) continue;
        const parentPath = relative.slice(0, separator);
        const expectedRole = parentPath === "dependants/sleevesupper"
            ? "sleevesUpper"
            : parentPath === "dependants/sleeveslower"
                ? "sleevesLower"
                : null;
        if (role !== expectedRole) continue;

        AddFoundationSupportRoles(result, relative, parentPath, role, partSourceRecordID);
    }

    // Split female LOD0 has these two verified static support carriers even
    // when dynamically resolved torso children have no support metadata.
    if (normalizedSex === "female" && foundationLayout === "split-lod0")
    {
        for (const [ parentPath, role ] of [
            [ "dependants/sleevesupper", "sleevesUpper" ],
            [ "dependants/sleeveslower", "sleevesLower" ]
        ])
        {
            const relative = `${parentPath}/standard`;
            AddFoundationSupportRoles(
                result,
                relative,
                parentPath,
                role,
                `${normalizedSex}/${relative}`
            );
        }
    }

    return result;
}

function AddFoundationSupportRoles(result, relative, parentPath, role, partSourceRecordID)
{
    if (!result.has(relative))
    {
        result.set(relative, {
            role,
            partSourceRecordID,
            relation: "exact-foundation-support-source-path"
        });
    }
    if (!result.has(parentPath))
    {
        result.set(parentPath, {
            role,
            partSourceRecordID,
            relation: "exact-foundation-support-parent-path"
        });
    }
}

function ResolveAuthoredFootwearHeight(metadata)
{
    if (!metadata || !Array.isArray(metadata.dependencies)) return null;

    const paths = metadata.dependencies
        .map(value => String(value?.modifierPath ?? "").trim().toLowerCase())
        .filter(Boolean);
    const heights = new Set();

    for (const path of paths)
    {
        const tuck = path.match(
            /^utilityshapes\/pantstuck(shoe|shoes|low|shin|medium|knee|high|xhigh)shape$/u
        );
        const mask = path.match(
            /^dependants\/bootmasks\/bootmask(low|shin|medium|knee|high|xhigh)$/u
        );
        const height = tuck?.[1] ?? mask?.[1] ?? null;
        if (height) heights.add(height === "shoes" ? "shoe" : height);
    }

    if (!heights.size) return null;
    if (heights.has("shoe"))
    {
        return heights.size === 1
            ? { height: "shoe", authoredModifierPaths: paths }
            : null;
    }

    const ordered = [ "low", "shin", "medium", "knee", "high", "xhigh" ];
    const height = ordered.findLast(value => heights.has(value));
    return height ? { height, authoredModifierPaths: paths } : null;
}

export default CjsCharacterFoundationCoveragePolicy;
