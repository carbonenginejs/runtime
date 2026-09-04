import { CjsCharacterTextureQuality } from "../CjsCharacterTextureQuality.js";

const DEFAULT_SHADER_PATH =
    "res:/graphics/effect.gles2/managed/interior/avatar/skinnedavatar.sm_hi";

const DEFAULT_NEUTRAL_NORMAL_PATH =
    "res:/graphics/shared_texture/global/normal_flat.dds";

const HAND_PALETTE_COMPATIBILITY = Object.freeze({
    status: "policy",
    rule: "legacy-opengl-bone-capacity-mask-v1",
    shaderCapacity: 58,
    requiredBoneCount: 69,
    bonePrefixes: Object.freeze([ "RightHand" ])
});

const BODY_DIFFUSE_FOUNDATIONS = Object.freeze({
    female: "res:/graphics/character/female/paperdoll/archetypes/ccshape/cd_female_body_d_4k.png",
    male: "res:/graphics/character/male/paperdoll/archetypes/ccshape/cd_male_body_d_4k.png"
});

/**
 * Translates renderer-neutral foundation construction into the reviewed GLES
 * operation shape without acquiring resources or mutating live geometry.
 */
export class CjsCharacterGlesFoundationTranslator
{
    _neutralNormalPath;

    _proofTextureProfile;

    _shaderPath;

    constructor({
        shaderPath = DEFAULT_SHADER_PATH,
        neutralNormalPath = DEFAULT_NEUTRAL_NORMAL_PATH,
        proofTextureProfile = "neutral"
    } = {})
    {
        this._shaderPath = RequireResourcePath(shaderPath, "shaderPath");
        this._neutralNormalPath = RequireResourcePath(neutralNormalPath, "neutralNormalPath");
        this._proofTextureProfile = String(proofTextureProfile ?? "").trim();
        if (!this._proofTextureProfile)
        {
            throw new TypeError("GLES foundation translator proofTextureProfile is required");
        }
    }

    /** Returns a detached GLES operation sequence from neutral construction data. */
    Translate(construction, { library = null } = {})
    {
        if (!construction || typeof construction !== "object"
            || !Array.isArray(construction.operations))
        {
            throw new TypeError("GLES foundation translator requires foundation construction operations");
        }

        const sex = String(construction.sex ?? "").trim().toLowerCase();
        const layout = String(construction.evidence?.layout ?? "").trim().toLowerCase();
        const textureQuality = CjsCharacterTextureQuality.normalize(
            construction.evidence?.textureQuality
        );
        const genericBodySurface = ResolveGenericFoundationSurface(sex, library, textureQuality);
        const operations = [];
        let insertedSurfaceSetup = false;

        for (const sourceOperation of construction.operations)
        {
            const operation = CloneOperation(sourceOperation);
            if (operation.operation === "geometry")
            {
                const compatibility = ResolvePaletteCompatibility(sex, layout, operation.role);
                if (compatibility) operation.compatibility = compatibility;
            }
            if (operation.operation === "foundation-skin")
            {
                operation.skinTextures = WithGenericBodySpecular(
                    operation.skinTextures,
                    genericBodySurface
                );
                operation.skinTextures = WithNeutralNormal(
                    operation.skinTextures,
                    this._neutralNormalPath
                );
            }
            if (operation.operation === "configured-foundation")
            {
                if (operation.role === "head"
                    && !operation.skinEvidence?.archetypeSourceRecordID
                    && genericBodySurface)
                {
                    operation.skinEvidence = {
                        ...operation.skinEvidence,
                        ...genericBodySurface
                    };
                }
                operation.skinTextures = WithGenericBodySpecular(
                    operation.skinTextures,
                    genericBodySurface
                );
                operation.skinTextures = WithNeutralNormal(
                    operation.skinTextures,
                    this._neutralNormalPath
                );
                if (sex === "female" && layout === "combined" && operation.role === "body")
                {
                    operation.renderConfiguredCarrier = false;
                    operation.renderEvidence = {
                        status: "observed",
                        rule: "legacy-opengl-authored-body-carrier-unqualified-v1"
                    };
                }
            }

            operations.push(operation);
            if (!insertedSurfaceSetup && operation.operation === "geometry")
            {
                const next = construction.operations[operations.length];
                if (next?.operation !== "geometry")
                {
                    operations.push({ operation: "rebuild-areas", shaderPath: this._shaderPath });
                    operations.push({ operation: "proof-textures", profile: this._proofTextureProfile });
                    insertedSurfaceSetup = true;
                }
            }
        }

        return {
            ...construction,
            backend: "legacy-opengl",
            evidence: {
                ...construction.evidence,
                sourceRule: construction.evidence?.rule ?? null,
                rule: "legacy-opengl-foundation-v1",
                backendRule: "gles-foundation-translation-v1"
            },
            operations
        };
    }
}

function ResolvePaletteCompatibility(sex, layout, role)
{
    const applies = sex === "female"
        && ((layout === "combined" && role === "body")
            || (layout === "split-lod0" && role === "hands"));
    return applies
        ? { ...HAND_PALETTE_COMPATIBILITY, bonePrefixes: [ ...HAND_PALETTE_COMPATIBILITY.bonePrefixes ] }
        : null;
}

function WithNeutralNormal(textures, neutralNormalPath)
{
    if (!textures || typeof textures !== "object") return textures;
    return textures.NormalMap ? { ...textures } : { ...textures, NormalMap: neutralNormalPath };
}

function WithGenericBodySpecular(textures, genericBodySurface)
{
    if (!textures || typeof textures !== "object" || textures.SpecularMap
        || !genericBodySurface?.bodySpecularPath)
    {
        return textures;
    }
    return { ...textures, SpecularMap: genericBodySurface.bodySpecularPath };
}

function ResolveGenericFoundationSurface(sex, library, textureQuality)
{
    if (!library || typeof library.GetDocument !== "function") return null;
    const diffusePath = SelectFoundationTexture(
        library,
        BODY_DIFFUSE_FOUNDATIONS[sex],
        textureQuality
    );
    if (!diffusePath) return null;
    const diffuseParts = diffusePath.split("/");
    const diffuseName = diffuseParts.at(-1);
    const archetypeFamily = diffuseParts.at(-2)?.replace(/shape$/u, "");
    const diffuseFamily = FoundationTextureFamily(diffuseName).split("/").at(-1);
    if (!diffuseFamily?.endsWith("_d") || !archetypeFamily) return null;

    const specularFamily = diffuseFamily.replace(/_d$/u, "_s");
    const specularRoot = `res:/graphics/character/${sex}/paperdoll/skintype/`
        + `${archetypeFamily}/${specularFamily}`;
    const specularPath = SelectFoundationTexture(library, specularRoot, textureQuality);
    const specularMetadata = (library?.GetDocument?.("characterTextureMetadata") ?? [])
        .find(value => value?.sourcePath === specularPath);
    return {
        bodyDiffusePath: diffusePath,
        bodyDiffuseRule: "exact-foundation-body-diffuse-quality-v1",
        ...(specularPath ? {
            bodySpecularPath: specularPath,
            bodySpecularMetadataRecordID: specularMetadata?.recordID ?? null,
            bodySpecularRule: "exact-foundation-diffuse-token-specular-match-v1"
        } : {})
    };
}

function SelectFoundationTexture(library, referencePath, textureQuality)
{
    if (!referencePath) return null;
    const metadata = library?.GetDocument?.("characterTextureMetadata") ?? [];
    const family = FoundationTextureFamily(referencePath);
    const matches = metadata.map(value => value?.sourcePath)
        .filter(value => typeof value === "string"
            && FoundationTextureFamily(value) === family);
    return matches.length
        ? CjsCharacterTextureQuality.select(matches, textureQuality)
        : CjsCharacterTextureQuality.isAllowed(referencePath, textureQuality)
            ? referencePath
            : null;
}

function FoundationTextureFamily(path)
{
    return CjsCharacterTextureQuality.getFamily(path)
        .replace(/_(?:4k|512|256)(?:_hi)?$/u, "");
}

function CloneOperation(value)
{
    if (!value || typeof value !== "object") return value;
    const operation = { ...value };
    if (value.skinTextures) operation.skinTextures = { ...value.skinTextures };
    if (value.skinEvidence) operation.skinEvidence = { ...value.skinEvidence };
    if (value.evidence) operation.evidence = { ...value.evidence };
    if (value.skinColorization)
    {
        operation.skinColorization = {
            ...value.skinColorization,
            colors: value.skinColorization.colors?.map(color => [ ...color ]) ?? []
        };
    }
    return operation;
}

function RequireResourcePath(value, label)
{
    const result = String(value ?? "").trim();
    if (!/^res:\//iu.test(result))
    {
        throw new TypeError(`GLES foundation translator ${label} must be a res:/ path`);
    }
    return result;
}

export default CjsCharacterGlesFoundationTranslator;
