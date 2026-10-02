import { meta } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/**
 * Inspected source-image facts and normalized character-atlas placement.
 *
 * `recordID` is the extension-neutral resource name and `sourcePath` the
 * exact PNG inspected. Raw `oFFs`/`pHYs` values stay exact; the normalized
 * millionths placement is additive character policy labelled
 * `experimental-policy`, not PNG semantics. Chunk parsing belongs to the PNG
 * format.
 */
@meta.define({ className: "CjsCharacterTextureMetadata", family: "character" })
export class CjsCharacterTextureMetadata extends CjsCharacterRecord
{

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    sourcePath = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    sourceFormat = "png";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.uint32
    width = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.uint32
    height = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.int32
    offsetXRaw = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.int32
    offsetYRaw = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.uint32
    offsetUnit = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.uint32
    physicalPixelDimensionsXRaw = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.uint32
    physicalPixelDimensionsYRaw = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.uint32
    physicalPixelDimensionsUnit = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    offsetX = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    offsetY = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    extentX = 1;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    extentY = 1;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.boolean
    hasOffsetMetadata = false;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.boolean
    hasPhysicalPixelDimensionsMetadata = false;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.boolean
    hasPlacementMetadata = false;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    placementEncoding = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    placementPolicy = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    placementStatus = null;

    /** Converts generic CjsPngFormat inspection facts into character placement. */
    static fromPngInspection(recordID, sourcePath, metadata)
    {
        if (!metadata || metadata.sourceFormat !== "png")
        {
            throw new TypeError("Character texture metadata requires PNG inspection values");
        }
        if (!Object.hasOwn(metadata, "offset")
            || !Object.hasOwn(metadata, "physicalPixelDimensions"))
        {
            throw new TypeError(
                "Character texture metadata requires PNG placement chunk inspection"
            );
        }

        const rawOffset = metadata.offset ?? null;
        const rawPhysical = metadata.physicalPixelDimensions ?? null;
        const offset = rawOffset?.unit === 0 ? rawOffset : null;
        const extent = rawPhysical?.unit === 0
            ? rawPhysical
            : null;
        const hasPlacementMetadata = Number(extent?.x) > 0 && Number(extent?.y) > 0;

        return {
            recordID: RequireResourceIdentity(recordID),
            sourcePath: RequirePngResourcePath(sourcePath),
            sourceFormat: "png",
            width: RequireDimension(metadata.width, "width"),
            height: RequireDimension(metadata.height, "height"),
            offsetXRaw: rawOffset === null ? null : Number(rawOffset.x),
            offsetYRaw: rawOffset === null ? null : Number(rawOffset.y),
            offsetUnit: rawOffset === null ? null : Number(rawOffset.unit),
            physicalPixelDimensionsXRaw: rawPhysical === null
                ? null
                : Number(rawPhysical.x),
            physicalPixelDimensionsYRaw: rawPhysical === null
                ? null
                : Number(rawPhysical.y),
            physicalPixelDimensionsUnit: rawPhysical === null
                ? null
                : Number(rawPhysical.unit),
            offsetX: offset ? Number(offset.x) / 1e6 : 0,
            offsetY: offset ? Number(offset.y) / 1e6 : 0,
            extentX: hasPlacementMetadata ? Number(extent.x) / 1e6 : 1,
            extentY: hasPlacementMetadata ? Number(extent.y) / 1e6 : 1,
            hasOffsetMetadata: rawOffset !== null,
            hasPhysicalPixelDimensionsMetadata: rawPhysical !== null,
            hasPlacementMetadata,
            placementEncoding: hasPlacementMetadata
                ? "png-oFFs-pHYs-millionths"
                : null,
            placementPolicy: hasPlacementMetadata
                ? "ccp-character-atlas-millionths-v1"
                : null,
            placementStatus: hasPlacementMetadata
                ? "experimental-policy"
                : null
        };
    }

}

function RequireResourceIdentity(value)
{
    const path = String(value ?? "").trim();
    if (!/^res:\/[^?#]+$/iu.test(path) || /\.[^/]+$/u.test(path))
    {
        throw new TypeError(
            "Character texture metadata recordID must be an extension-neutral res:/ path"
        );
    }
    return path;
}

function RequirePngResourcePath(value)
{
    const path = String(value ?? "").trim();
    if (!/^res:\/[^?#]+\.png$/iu.test(path))
    {
        throw new TypeError("Character texture metadata sourcePath must be a res:/ PNG path");
    }
    return path;
}

function RequireDimension(value, name)
{
    const result = Number(value);
    if (!Number.isSafeInteger(result) || result <= 0)
    {
        throw new TypeError(`Character texture metadata ${name} must be a positive integer`);
    }
    return result;
}

export default CjsCharacterTextureMetadata;
