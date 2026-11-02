import { exposure as be } from "#be";
import { meta, type } from "#schema";
import { CjsCharacterRecord } from "../CjsCharacterRecord.js";

/**
 * Inspected source-image facts and normalized character-atlas placement.
 *
 * `recordID` is the extension-neutral resource name and `sourcePath` the
 * exact PNG inspected. Raw `oFFs`/`pHYs` values stay exact; the normalized
 * millionths placement is additive character policy labelled
 * `experimental-policy`, not PNG semantics. Chunk parsing belongs to the PNG
 * format.
 * This record preserves catalog evidence; it is not required to load or place
 * a texture. Composition consumes the loaded texture resource's native cutout.
 */
@meta.define("CjsCharacterTextureMetadata")
export class CjsCharacterTextureMetadata extends CjsCharacterRecord
{

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.path
    sourcePath = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.string
    sourceFormat = "png";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.uint32
    width = 0;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.uint32
    height = 0;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.int32
    offsetXRaw = 0;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.int32
    offsetYRaw = 0;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.uint32
    offsetUnit = 0;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.uint32
    physicalPixelDimensionsXRaw = 0;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.uint32
    physicalPixelDimensionsYRaw = 0;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.uint32
    physicalPixelDimensionsUnit = 0;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    offsetX = 0;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    offsetY = 0;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    extentX = 1;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    extentY = 1;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.boolean
    hasOffsetMetadata = false;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.boolean
    hasPhysicalPixelDimensionsMetadata = false;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.boolean
    hasPlacementMetadata = false;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.string
    placementEncoding = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.string
    placementPolicy = "";

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

    @type.string
    placementStatus = "";

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
            offsetXRaw: rawOffset === null ? 0 : Number(rawOffset.x),
            offsetYRaw: rawOffset === null ? 0 : Number(rawOffset.y),
            offsetUnit: rawOffset === null ? 0 : Number(rawOffset.unit),
            physicalPixelDimensionsXRaw: rawPhysical === null
                ? 0
                : Number(rawPhysical.x),
            physicalPixelDimensionsYRaw: rawPhysical === null
                ? 0
                : Number(rawPhysical.y),
            physicalPixelDimensionsUnit: rawPhysical === null
                ? 0
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
                : "",
            placementPolicy: hasPlacementMetadata
                ? "ccp-character-atlas-millionths-v1"
                : "",
            placementStatus: hasPlacementMetadata
                ? "experimental-policy"
                : ""
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
