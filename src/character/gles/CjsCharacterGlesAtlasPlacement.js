/**
 * Pure GLES atlas-placement helpers.
 *
 * These preserve the authored character-library placement contract without
 * reading resources or allocating render targets. The GLES atlas renderer owns
 * those operations through its injected backend host.
 */
export class CjsCharacterGlesAtlasPlacement
{
    /** Reads and validates one library atlas metadata record. */
    static ReadLibraryMetadata(record, identity = record?.recordID)
    {
        const width = Number(record?.width);
        const height = Number(record?.height);
        const hasPlacementMetadata = record?.hasPlacementMetadata === true;
        const extent = hasPlacementMetadata
            ? [ Number(record.extentX), Number(record.extentY) ]
            : [ 1, 1 ];
        const offset = hasPlacementMetadata
            ? [ Number(record.offsetX), Number(record.offsetY) ]
            : [ 0, 0 ];

        if (!Number.isSafeInteger(width)
            || width <= 0
            || !Number.isSafeInteger(height)
            || height <= 0
            || !extent.every(value => Number.isFinite(value) && value > 0)
            || !offset.every(value => Number.isFinite(value)))
        {
            throw new TypeError(
                "Character library has invalid texture metadata for "
                + (identity ?? "unknown texture")
            );
        }

        return {
            width,
            height,
            offset,
            extent,
            hasOffsetMetadata: record?.hasOffsetMetadata === true,
            hasPlacementMetadata,
            source: "character-library",
            sourcePath: record?.sourcePath ?? null,
            placementEncoding: record?.placementEncoding ?? null,
            placementPolicy: record?.placementPolicy ?? null,
            placementStatus: record?.placementStatus ?? null
        };
    }

    /** Returns the whole atlas size implied by a cropped texture record. */
    static GetTargetSize(metadata)
    {
        ValidateMetadata(metadata);
        return [
            Math.round(metadata.width / metadata.extent[0]),
            Math.round(metadata.height / metadata.extent[1])
        ];
    }

    /** Returns normalized [x, y, width, height] placement. */
    static GetPlacement(metadata)
    {
        ValidateMetadata(metadata);
        return [
            metadata.offset[0],
            metadata.offset[1],
            metadata.extent[0],
            metadata.extent[1]
        ];
    }

    /** Returns [left, bottom, right, top] normalized placement bounds. */
    static GetBounds(placement)
    {
        ValidatePlacement(placement);
        return [
            placement[0],
            placement[1],
            placement[0] + placement[2],
            placement[1] + placement[3]
        ];
    }

    /** Returns the normalized intersection of two placements, or null. */
    static Intersect(left, right)
    {
        const leftBounds = this.GetBounds(left);
        const rightBounds = this.GetBounds(right);
        const minimumX = Math.max(leftBounds[0], rightBounds[0]);
        const minimumY = Math.max(leftBounds[1], rightBounds[1]);
        const maximumX = Math.min(leftBounds[2], rightBounds[2]);
        const maximumY = Math.min(leftBounds[3], rightBounds[3]);
        if (maximumX <= minimumX || maximumY <= minimumY) return null;
        return [
            minimumX,
            minimumY,
            maximumX - minimumX,
            maximumY - minimumY
        ];
    }

    /** Returns the bottom-left WebGL viewport for a normalized placement. */
    static GetViewport(targetSize, placement)
    {
        const [ width, height ] = ValidateTargetSize(targetSize);
        ValidatePlacement(placement);
        const left = Math.max(0, Math.round(placement[0] * width));
        const bottom = Math.max(0, Math.round(placement[1] * height));
        const right = Math.min(width, Math.round((placement[0] + placement[2]) * width));
        const top = Math.min(height, Math.round((placement[1] + placement[3]) * height));
        return [
            left,
            bottom,
            Math.max(1, right - left),
            Math.max(1, top - bottom)
        ];
    }

    /**
     * Returns the legacy cropped-texture UV transform, or null for an
     * uncropped source. Rendering owns the decision to apply this transform.
     */
    static GetCroppedTextureTransform(metadata)
    {
        ValidateMetadata(metadata);
        if (!metadata.hasPlacementMetadata) return null;
        const [ x, y, width, height ] = this.GetPlacement(metadata);
        return [
            x === 0 ? 0 : -x / width,
            y === 0 ? 0 : -y / height,
            (1 - x) / width,
            (1 - y) / height
        ];
    }

    /**
     * Validates a target's authored aspect ratio before a renderer allocates
     * it. It returns a detached size so callers cannot mutate input metadata.
     */
    static RequireCompatibleTargetAspect(path, actualSize, expectedSize)
    {
        const actual = ValidateTargetSize(actualSize);
        const expected = ValidateTargetSize(expectedSize);
        if (actual[0] * expected[1] !== actual[1] * expected[0])
        {
            throw new Error(
                "Character atlas target aspect mismatch for "
                + path + ": " + actual.join("x") + " vs " + expected.join("x")
            );
        }
        return actual;
    }

    /** Supplies inspectable placement evidence without depending on a renderer. */
    static DescribeUvDecision(metadata)
    {
        const targetSize = this.GetTargetSize(metadata);
        const placement = this.GetPlacement(metadata);
        return {
            status: "experimental-policy",
            rule: "legacy-opengl-normalized-png-placement-v1",
            metadata: {
                width: metadata.width,
                height: metadata.height,
                offset: [ ...metadata.offset ],
                extent: [ ...metadata.extent ],
                hasPlacementMetadata: metadata.hasPlacementMetadata,
                targetSize
            },
            sourceBounds: this.GetBounds(placement),
            destinationViewport: this.GetViewport(targetSize, placement),
            correctness: "unverified"
        };
    }
}

function ValidateMetadata(metadata)
{
    if (!metadata
        || !Number.isSafeInteger(metadata.width)
        || metadata.width <= 0
        || !Number.isSafeInteger(metadata.height)
        || metadata.height <= 0
        || !Array.isArray(metadata.offset)
        || !Array.isArray(metadata.extent)
        || metadata.offset.length !== 2
        || metadata.extent.length !== 2
        || !metadata.offset.every(value => Number.isFinite(value))
        || !metadata.extent.every(value => Number.isFinite(value) && value > 0))
    {
        throw new TypeError("GLES atlas placement requires valid library texture metadata");
    }
}

function ValidatePlacement(placement)
{
    if (!Array.isArray(placement)
        || placement.length !== 4
        || !placement.every(value => Number.isFinite(value))
        || placement[2] <= 0
        || placement[3] <= 0)
    {
        throw new TypeError("GLES atlas placement requires [x, y, width, height]");
    }
}

function ValidateTargetSize(size)
{
    if (!Array.isArray(size)
        || size.length !== 2
        || !size.every(value => Number.isSafeInteger(value) && value > 0))
    {
        throw new TypeError("GLES atlas target size requires positive integer width and height");
    }
    return [ size[0], size[1] ];
}
