import { CjsCharacterGlesAtlasPlacement } from "./CjsCharacterGlesAtlasPlacement.js";

/**
 * Builds renderer-neutral GLES atlas pass descriptors from retained authored
 * metadata. An injected atlas renderer turns these descriptors into effects,
 * target operations, and WebGL state; this class never reads resources.
 */
export class CjsCharacterGlesAtlasPlanning
{
    /**
     * Plans a placed source copy. The target must match the authored atlas
     * aspect because both source UV bounds and reverse UVs carry the crop.
     */
    static PlanCopy({ path, metadata, targetSize, alphaMultiplier = 1, blend = false } = {})
    {
        ValidatePath(path);
        ValidateAlphaMultiplier(alphaMultiplier);
        ValidateBoolean(blend, "blend");
        const placement = CjsCharacterGlesAtlasPlacement.GetPlacement(metadata);
        const impliedTargetSize = CjsCharacterGlesAtlasPlacement.GetTargetSize(metadata);
        const size = CjsCharacterGlesAtlasPlacement.RequireCompatibleTargetAspect(
            path,
            impliedTargetSize,
            targetSize
        );
        return CreateDescriptor({
            kind: "copy",
            shader: "copy-blit",
            viewport: CjsCharacterGlesAtlasPlacement.GetViewport(size, placement),
            parameters: {
                SourceUVs: CjsCharacterGlesAtlasPlacement.GetBounds(placement),
                TextureReverseUV: placement,
                AlphaMultiplier: [ alphaMultiplier, 0, 0, 0 ]
            },
            textures: { Texture: path },
            blend: blend ? "source-alpha" : "disabled",
            report: {
                mode: "foundation-copy",
                path,
                alphaMultiplier,
                placement,
                uv: CjsCharacterGlesAtlasPlacement.DescribeUvDecision(metadata)
            }
        });
    }

    /**
     * Plans an authored RGBA body/head overlay, optionally constrained to the
     * opaque coverage authored by its material owner.
     */
    static PlanOverlay({
        path,
        metadata,
        targetSize,
        coveragePath = null,
        coverageMetadata = null,
        operation = {},
        rgbOnly = false,
        allowFullNormalizedStretch = false
    } = {})
    {
        ValidatePath(path);
        ValidateBoolean(rgbOnly, "rgbOnly");
        ValidateBoolean(allowFullNormalizedStretch, "allowFullNormalizedStretch");
        const placement = CjsCharacterGlesAtlasPlacement.GetPlacement(metadata);
        const sourceTargetSize = CjsCharacterGlesAtlasPlacement.GetTargetSize(metadata);
        const fullNormalized = IsFullPlacement(placement);
        const size = ValidateTargetSize(targetSize);
        if (!fullNormalized || !allowFullNormalizedStretch)
        {
            CjsCharacterGlesAtlasPlacement.RequireCompatibleTargetAspect(
                path,
                sourceTargetSize,
                size
            );
        }

        const weight = Number.isFinite(operation?.weight) ? operation.weight : 1;
        const coverage = ResolveCoverage({
            path,
            targetSize: size,
            placement,
            coveragePath,
            coverageMetadata
        });
        const ownerReplace = coverage
            && [ "diffuse-replace", "specular-replace" ].includes(operation?.op);
        const destinationPlacement = coverage?.destinationPlacement ?? placement;
        const parameters = coverage
            ? {
                SourceUVs: CjsCharacterGlesAtlasPlacement.GetBounds(destinationPlacement),
                TextureReverseUV: placement,
                MaskReverseUV: coverage.placement,
                Strength: [ weight, 0, 0, 0 ],
                MultAlpha: [ ownerReplace ? 0 : 1, 0, 0, 0 ]
            }
            : {
                SourceUVs: CjsCharacterGlesAtlasPlacement.GetBounds(placement),
                TextureReverseUV: placement,
                AlphaMultiplier: [ weight, 0, 0, 0 ]
            };

        return CreateDescriptor({
            kind: coverage ? "masked-overlay" : "overlay",
            shader: coverage ? "simple-blit" : "copy-blit",
            viewport: CjsCharacterGlesAtlasPlacement.GetViewport(size, destinationPlacement),
            parameters,
            textures: {
                Texture: path,
                ...(coverage ? { MaskMap: coverage.path } : {})
            },
            blend: "source-alpha",
            colorWrite: rgbOnly ? "rgb" : "rgba",
            report: {
                mode: ownerReplace
                    ? "owner-masked-replace"
                    : coverage
                        ? "owner-masked-source-alpha-overlay"
                        : "source-alpha-overlay",
                path,
                sourceTargetSize,
                coveragePath: coverage?.path ?? null,
                placement,
                coveragePlacement: coverage?.placement ?? null,
                destinationPlacement,
                samplingContract: fullNormalized && allowFullNormalizedStretch
                    ? "full-normalized-stretch"
                    : "authored-atlas-placement",
                weight,
                alphaOperation: rgbOnly
                    ? "source-alpha-rgb-preserve-foundation-alpha"
                    : ownerReplace
                        ? "owner-mask-rgba-replace"
                        : "source-alpha-rgba",
                uv: CjsCharacterGlesAtlasPlacement.DescribeUvDecision(metadata),
                coverageUv: coverage
                    ? CjsCharacterGlesAtlasPlacement.DescribeUvDecision(coverage.metadata)
                    : null
            }
        });
    }

    /**
     * Plans a normal map replacement/addition. Normal additions intentionally
     * do not inherit a diffuse owner mask, matching the established GLES path.
     */
    static PlanNormal({
        path,
        metadata,
        targetSize,
        coveragePath = null,
        coverageMetadata = null,
        operation = {}
    } = {})
    {
        ValidatePath(path);
        const placement = CjsCharacterGlesAtlasPlacement.GetPlacement(metadata);
        const size = ValidateTargetSize(targetSize);
        CjsCharacterGlesAtlasPlacement.RequireCompatibleTargetAspect(
            path,
            CjsCharacterGlesAtlasPlacement.GetTargetSize(metadata),
            size
        );
        const additive = operation?.op === "normal-add";
        const coverage = additive
            ? null
            : ResolveCoverage({
                path,
                targetSize: size,
                placement,
                coveragePath,
                coverageMetadata
            });
        const destinationPlacement = coverage?.destinationPlacement ?? placement;
        const strength = Number.isFinite(operation?.weight) ? operation.weight : 1;

        return CreateDescriptor({
            kind: additive ? "normal-add" : coverage ? "masked-normal-replace" : "normal-replace",
            shader: additive ? "twist-normal-blit" : coverage ? "simple-blit" : "masked-normal-blit",
            viewport: CjsCharacterGlesAtlasPlacement.GetViewport(size, destinationPlacement),
            parameters: {
                SourceUVs: CjsCharacterGlesAtlasPlacement.GetBounds(destinationPlacement),
                TextureReverseUV: placement,
                ...(coverage ? {
                    MaskReverseUV: coverage.placement,
                    MultAlpha: [ 1, 0, 0, 0 ]
                } : {}),
                Strength: [ strength, 0, 0, 0 ]
            },
            textures: {
                Texture: path,
                ...(coverage ? { MaskMap: coverage.path } : {})
            },
            blend: additive ? "additive" : "source-alpha",
            report: {
                mode: additive
                    ? "normal-add"
                    : coverage
                        ? "normal-owner-masked-replace"
                        : "normal-replace",
                path,
                coveragePath: coverage?.path ?? null,
                placement,
                coveragePlacement: coverage?.placement ?? null,
                destinationPlacement,
                strength,
                uv: CjsCharacterGlesAtlasPlacement.DescribeUvDecision(metadata),
                coverageUv: coverage
                    ? CjsCharacterGlesAtlasPlacement.DescribeUvDecision(coverage.metadata)
                    : null
            }
        });
    }
}

function ResolveCoverage({
    path,
    targetSize,
    placement,
    coveragePath,
    coverageMetadata
})
{
    if (!coveragePath && !coverageMetadata) return null;
    ValidatePath(coveragePath);
    if (!coverageMetadata)
    {
        throw new TypeError("GLES atlas coverage metadata is required with a coverage path");
    }
    const coveragePlacement = CjsCharacterGlesAtlasPlacement.GetPlacement(coverageMetadata);
    CjsCharacterGlesAtlasPlacement.RequireCompatibleTargetAspect(
        coveragePath,
        CjsCharacterGlesAtlasPlacement.GetTargetSize(coverageMetadata),
        targetSize
    );
    const destinationPlacement = CjsCharacterGlesAtlasPlacement.Intersect(
        placement,
        coveragePlacement
    );
    if (!destinationPlacement)
    {
        throw new Error("GLES atlas source and owner coverage do not overlap: " + path);
    }
    return {
        path: coveragePath,
        metadata: coverageMetadata,
        placement: coveragePlacement,
        destinationPlacement
    };
}

function CreateDescriptor(value)
{
    return {
        ...value,
        viewport: [ ...value.viewport ],
        parameters: CloneParameters(value.parameters),
        textures: { ...value.textures },
        report: CloneReport(value.report)
    };
}

function CloneParameters(parameters)
{
    return Object.fromEntries(Object.entries(parameters).map(([ name, value ]) => [
        name,
        Array.isArray(value) ? [ ...value ] : value
    ]));
}

function CloneReport(report)
{
    return {
        ...report,
        placement: report.placement ? [ ...report.placement ] : report.placement,
        ...(report.coveragePlacement !== undefined ? {
            coveragePlacement: report.coveragePlacement
                ? [ ...report.coveragePlacement ]
                : report.coveragePlacement
        } : {}),
        ...(report.destinationPlacement !== undefined ? {
            destinationPlacement: report.destinationPlacement
                ? [ ...report.destinationPlacement ]
                : report.destinationPlacement
        } : {})
    };
}

function IsFullPlacement(placement)
{
    return placement[0] === 0
        && placement[1] === 0
        && placement[2] === 1
        && placement[3] === 1;
}

function ValidatePath(path)
{
    if (!/^res:\//iu.test(String(path ?? "").trim()))
    {
        throw new TypeError("GLES atlas planning requires a res:/ texture path");
    }
}

function ValidateTargetSize(size)
{
    if (!Array.isArray(size)
        || size.length !== 2
        || !size.every(value => Number.isSafeInteger(value) && value > 0))
    {
        throw new TypeError("GLES atlas planning requires a positive integer target size");
    }
    return [ ...size ];
}

function ValidateAlphaMultiplier(value)
{
    if (!Number.isFinite(value) || value < 0)
    {
        throw new TypeError("GLES atlas alphaMultiplier must be a finite non-negative number");
    }
}

function ValidateBoolean(value, name)
{
    if (typeof value !== "boolean")
    {
        throw new TypeError("GLES atlas " + name + " must be boolean");
    }
}
