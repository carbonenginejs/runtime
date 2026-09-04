import { CjsCharacterGlesFoundationTranslator } from "./CjsCharacterGlesFoundationTranslator.js";

/**
 * Lowers neutral character construction to the narrow contract implemented by
 * the retained GLES renderer. This is backend compatibility only: it does not
 * resolve library data, acquire resources, or mutate live character state.
 */
export class CjsCharacterGlesLegacyConstructionTranslator
{
    _foundationTranslator;

    constructor({ foundationTranslator = new CjsCharacterGlesFoundationTranslator() } = {})
    {
        if (!foundationTranslator || typeof foundationTranslator.Translate !== "function")
        {
            throw new TypeError("GLES legacy construction translator requires a foundation translator");
        }
        this._foundationTranslator = foundationTranslator;
    }

    /** Returns a detached construction accepted by the retained GLES adapter. */
    Translate(construction, { library = null } = {})
    {
        const translated = this._foundationTranslator.Translate(construction, { library });
        const morphTargets = (translated.morphTargets ?? []).map((target, index) =>
            TranslateMorphTarget(target, index));
        const deferredFoundationSkin = translated.operations
            .filter(operation => operation?.operation === "foundation-skin")
            .map(CloneFoundationSkin);
        const operations = translated.operations
            .filter(operation => operation?.operation !== "foundation-skin")
            .map(operation => TranslateOperationCoverage(operation, translated.sex));
        const hasContributions = operations.some(operation =>
            operation?.operation === "configured-part"
            || operation?.operation === "deferred-contribution");

        return {
            ...translated,
            morphTargets,
            operations,
            ...(deferredFoundationSkin.length ? { deferredFoundationSkin } : {}),
            evidence: {
                ...translated.evidence,
                sourceRule: translated.evidence?.sourceRule
                    ?? construction?.evidence?.rule
                    ?? null,
                rule: hasContributions
                    ? "legacy-opengl-appearance-v1"
                    : "legacy-opengl-foundation-v1",
                backendRule: "gles-legacy-construction-translation-v1"
            }
        };
    }
}

function TranslateOperationCoverage(operation, sex)
{
    const coverage = operation?.foundationCoverage;
    if (!coverage) return operation;

    const lowered = TranslateFoundationCoverage(coverage, sex);
    const result = { ...operation };
    delete result.foundationCoverage;
    if (lowered.foundationCoverage) result.foundationCoverage = lowered.foundationCoverage;
    if (lowered.deferredFoundationCoverage)
    {
        result.deferredFoundationCoverage = lowered.deferredFoundationCoverage;
    }
    return result;
}

function TranslateFoundationCoverage(coverage, sex)
{
    const evidence = coverage?.evidence;
    const normalizedSex = String(sex ?? "").trim().toLowerCase();
    const source = CloneFoundationCoverage(coverage);

    if (evidence?.rule === "authored-footwear-foundation-coverage-v1")
    {
        const female = normalizedSex === "female";
        const male = normalizedSex === "male";
        const height = String(coverage?.footwearHeight ?? evidence?.footwearHeight ?? "");
        if ((female || male) && FOOTWEAR_HEIGHTS.has(height)
            && Array.isArray(evidence.authoredModifierPaths)
            && evidence.authoredModifierPaths.length)
        {
            return {
                foundationCoverage: {
                    strategy: female ? "triangle-mask" : "hide-carrier",
                    roles: [ ...(coverage.roles ?? []) ],
                    ...(female ? {
                        triangleRule: "legacy-opengl-exact-foundation-triangle-coverage-v1",
                        bonePrefixes: [ "LeftFoot", "RightFoot", "LeftToe", "RightToe" ]
                    } : {}),
                    evidence: {
                        ...evidence,
                        sourceRule: evidence.rule,
                        rule: "legacy-opengl-authored-footwear-coverage-v1"
                    }
                }
            };
        }
    }

    if (evidence?.rule === "authored-modifier-foundation-coverage-v1"
        && SupportsLegacyModifierCoverage(evidence, normalizedSex))
    {
        return {
            foundationCoverage: {
                strategy: "hide-carrier",
                roles: [ ...(coverage.roles ?? []) ],
                evidence: {
                    ...evidence,
                    sourceRule: evidence.rule,
                    rule: "legacy-opengl-authored-modifier-coverage-v1"
                }
            }
        };
    }

    return {
        deferredFoundationCoverage: {
            ...source,
            status: "deferred",
            reason: "retained-gles-adapter-does-not-realize-neutral-coverage-intent"
        }
    };
}

function SupportsLegacyModifierCoverage(evidence, sex)
{
    const expectedRoles = new Map([
        [ "topinner", "torso" ],
        [ "bottominner", "legs" ],
        [ "feet", "feet" ],
        [ "hands", "hands" ]
    ]);
    return Array.isArray(evidence?.relationships)
        && evidence.relationships.length > 0
        && evidence.relationships.every(value =>
        {
            if (typeof value?.authoredValue !== "string" || !value.authoredValue) return false;
            if ([ "typed-modifier-location", "exact-modifier-path-fallback" ].includes(value.relation))
            {
                return sex === "male"
                    && expectedRoles.get(value.modifierLocationKey) === value.foundationRole;
            }
            if (value.relation !== "exact-foundation-support-parent-path") return false;

            const modifierPath = String(value.modifierPath ?? "");
            const role = modifierPath === "dependants/sleevesupper"
                ? "sleevesUpper"
                : modifierPath === "dependants/sleeveslower"
                    ? "sleevesLower"
                    : null;
            const supportID = String(value.supportPartSourceRecordID ?? "");
            const prefix = `${sex}/${modifierPath}/`;
            const child = supportID.startsWith(prefix) ? supportID.slice(prefix.length) : "";
            return value.foundationRole === role
                && value.authoredValue === modifierPath
                && child.length > 0
                && !child.includes("/");
        });
}

function CloneFoundationCoverage(value)
{
    return {
        ...value,
        roles: [ ...(value.roles ?? []) ],
        ...(value.bonePrefixes ? { bonePrefixes: [ ...value.bonePrefixes ] } : {}),
        evidence: {
            ...(value.evidence ?? {}),
            ...(value.evidence?.authoredModifierPaths ? {
                authoredModifierPaths: [ ...value.evidence.authoredModifierPaths ]
            } : {}),
            ...(value.evidence?.relationships ? {
                relationships: value.evidence.relationships.map(item => ({ ...item }))
            } : {})
        }
    };
}

function CloneFoundationSkin(operation)
{
    return {
        roles: [ ...(operation.roles ?? []) ],
        skinTextures: { ...(operation.skinTextures ?? {}) },
        ...(operation.skinColorization ? {
            skinColorization: {
                ...operation.skinColorization,
                colors: operation.skinColorization.colors?.map(value => [ ...value ]) ?? []
            }
        } : {}),
        skinEvidence: { ...(operation.skinEvidence ?? {}) },
        status: "deferred",
        reason: "retained-gles-adapter-has-no-shared-foundation-skin-operation"
    };
}

const FOOTWEAR_HEIGHTS = new Set([ "low", "shin", "medium", "knee", "high", "xhigh" ]);

function TranslateMorphTarget(target, index)
{
    const modifierPath = String(target?.modifierPath ?? "").trim().toLowerCase();
    if (!modifierPath.startsWith("utilityshapes/"))
    {
        throw new Error(
            `GLES legacy morph target ${index} requires a utilityshapes/ modifier path`
        );
    }
    return {
        ...target,
        modifierPath,
        evidence: {
            ...target?.evidence,
            sourceRule: target?.evidence?.rule ?? null,
            rule: "legacy-gles-unique-normalized-morph-target-match-v1",
            backendRule: "gles-legacy-construction-translation-v1"
        }
    };
}

export default CjsCharacterGlesLegacyConstructionTranslator;
