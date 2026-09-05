import { asUint8Array } from "#utils/bytes";
import { decompressBytes } from "#utils/compression";
import { decodeRle7 } from "./rle7.js";

/**
 * VTA - Carbon's Volume Texture Animation container.
 *
 * A multi-grid, multi-frame, zlib-compressed animated dense 3D texture,
 * produced by rasterizing NanoVDB grids to R8 volumes. Authority is
 * Carbon's imageio VtaHandler (reader/writer are symmetric); the layout,
 * decode rules and consumption paths are recorded with file:line citations
 * in the org docs page "VTA format spec" (research, 2026-09-06). Carbon's
 * static texture path collapses a VTA to grid 0 / frame 0 as a true 3D
 * texture; Tr2TextureAnimation streams frames per grid.
 */

export const OUTPUT_VOLUME = "volume";
export const OUTPUT_RAW = "raw";
export const OUTPUT_JSON = "json";
export const OUTPUT_VTA_JSON = "vtaJson";

const HEADER_SIZE = 32;
const GRID_INFO_SIZE = 52;
const GRID_NAME_SIZE = 32;
export const VTA_VERSION = 1;

/** Grid payload encodings (VtaHandler.h:17-23). One decoder serves 1/2/3. */
export const VTA_ENCODING = Object.freeze({
    NONE: 0,
    RLE7: 1,
    RLE7_5: 2,
    RLE6: 3
});

/**
 * Bytes per voxel for the pixel formats a VTA can carry. Carbon's writer
 * only ever emits PIXEL_FORMAT_R8_UNORM (61) - IsSaveSupported rejects
 * everything else - but the field is read, not assumed, and an unknown
 * format is an error rather than a guess.
 */
const BYTES_PER_PIXEL = Object.freeze({
    61: 1 // PIXEL_FORMAT_R8_UNORM
});

export const DEFAULT_VALUES = Object.freeze({
    emit: OUTPUT_RAW,
    frame: 0,
    allFrames: false,
    grid: null
});

const textDecoder = new TextDecoder("utf-8", { fatal: false });

/** Tests whether bytes carry the VTA signature and supported version. */
export function isVTA(bytes)
{
    return bytes.length >= HEADER_SIZE
        && bytes[0] === 0x56 && bytes[1] === 0x54 && bytes[2] === 0x41 && bytes[3] === 0
        && readU32(bytes, 4) === VTA_VERSION;
}

/** Normalizes and validates VTA read options over a base profile. */
export function normalizeValues(base = DEFAULT_VALUES, options = {}, readerName = "CjsVtaFormat")
{
    if (!options || typeof options !== "object")
    {
        throw new TypeError(`${readerName} options must be an object`);
    }
    for (const key of Object.keys(options))
    {
        if (!(key in DEFAULT_VALUES)) throw new TypeError(`${readerName} unknown option "${key}"`);
    }

    const values = { ...base, ...options };

    if (![ OUTPUT_VOLUME, OUTPUT_RAW, OUTPUT_JSON, OUTPUT_VTA_JSON ].includes(values.emit))
    {
        throw new TypeError(`${readerName} unknown emit value "${values.emit}"`);
    }
    if (!Number.isInteger(values.frame) || values.frame < 0)
    {
        throw new TypeError(`${readerName} frame option must be a non-negative integer`);
    }
    if (typeof values.allFrames !== "boolean")
    {
        throw new TypeError(`${readerName} allFrames option must be true or false`);
    }
    if (values.grid !== null && typeof values.grid !== "string" && !Number.isInteger(values.grid))
    {
        throw new TypeError(`${readerName} grid option must be null, a grid name, or a grid index`);
    }
    return values;
}

function readU32(bytes, offset)
{
    return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
}

function readU64(bytes, offset)
{
    const
        lo = readU32(bytes, offset),
        hi = readU32(bytes, offset + 4);
    if (hi > 0x1fffff)
    {
        throw new Error("CjsVtaFormat 64-bit offset exceeds the safe integer range.");
    }
    return hi * 0x100000000 + lo;
}

/**
 * Parses header, grid table, offsets and metadata without touching payload.
 *
 * @param {Uint8Array} bytes Whole VTA file.
 * @returns {object} Structural description.
 */
export function inspectBytes(bytes)
{
    if (bytes.length < HEADER_SIZE || bytes[0] !== 0x56 || bytes[1] !== 0x54 || bytes[2] !== 0x41 || bytes[3] !== 0)
    {
        throw new Error("CjsVtaFormat input does not carry the VTA signature.");
    }
    const version = readU32(bytes, 4);
    if (version !== VTA_VERSION)
    {
        throw new Error(`CjsVtaFormat unsupported VTA version ${version}; only version ${VTA_VERSION} exists.`);
    }

    const
        gridCount = readU32(bytes, 8),
        frameCount = readU32(bytes, 12),
        metadataCount = readU32(bytes, 16),
        dataEnd = readU64(bytes, 24);

    let offset = HEADER_SIZE;
    const grids = [];
    for (let i = 0; i < gridCount; i++)
    {
        const nameBytes = bytes.subarray(offset + 20, offset + 20 + GRID_NAME_SIZE);
        let nameEnd = 0;
        while (nameEnd < GRID_NAME_SIZE && nameBytes[nameEnd] !== 0) nameEnd++;
        grids.push({
            format: readU32(bytes, offset),
            encoding: readU32(bytes, offset + 4),
            width: readU32(bytes, offset + 8),
            height: readU32(bytes, offset + 12),
            depth: readU32(bytes, offset + 16),
            name: textDecoder.decode(nameBytes.subarray(0, nameEnd))
        });
        offset += GRID_INFO_SIZE;
    }

    const offsets = new Array(frameCount * gridCount);
    for (let i = 0; i < offsets.length; i++, offset += 8)
    {
        offsets[i] = readU64(bytes, offset);
    }

    const metadata = {};
    for (let i = 0; i < metadataCount; i++)
    {
        const keyLength = readU32(bytes, offset);
        offset += 4;
        const key = textDecoder.decode(bytes.subarray(offset, offset + keyLength));
        offset += keyLength;
        const valueLength = readU32(bytes, offset);
        offset += 4;
        metadata[key] = textDecoder.decode(bytes.subarray(offset, offset + valueLength));
        offset += valueLength;
    }

    if (dataEnd > bytes.length)
    {
        throw new Error(`CjsVtaFormat dataEnd ${dataEnd} exceeds the ${bytes.length}-byte input.`);
    }

    return { version, gridCount, frameCount, metadataCount, dataEnd, grids, offsets, metadata };
}

function bytesPerPixel(format)
{
    const bpp = BYTES_PER_PIXEL[format];
    if (!bpp)
    {
        throw new Error(`CjsVtaFormat pixel format ${format} has no byte size registered; Carbon only writes R8_UNORM (61).`);
    }
    return bpp;
}

function selectGrids(description, grid)
{
    if (grid === null) return description.grids.map((info, index) => ({ info, index }));
    if (typeof grid === "string")
    {
        const index = description.grids.findIndex(info => info.name === grid);
        if (index === -1)
        {
            throw new Error(`CjsVtaFormat has no grid named "${grid}"; grids: ${description.grids.map(g => g.name).join(", ")}.`);
        }
        return [ { info: description.grids[index], index } ];
    }
    if (grid < 0 || grid >= description.grids.length)
    {
        throw new Error(`CjsVtaFormat grid index ${grid} is out of range 0..${description.grids.length - 1}.`);
    }
    return [ { info: description.grids[grid], index: grid } ];
}

/**
 * Decodes voxel frames for the selected grids.
 *
 * Frames of a grid are a DELTA CHAIN (frame N needs 0..N-1 decoded in
 * order), so reaching frame N always decodes from frame 0, exactly as
 * Carbon's FrameDecoder Restart/AdvanceFrame contract does.
 *
 * @param {Uint8Array} bytes Whole VTA file.
 * @param {object} values Normalized read options.
 * @returns {Promise<object>} Decoded volume payload.
 */
export async function decodeVolumes(bytes, values)
{
    const description = inspectBytes(bytes);
    const lastFrame = values.allFrames ? description.frameCount - 1 : values.frame;
    if (description.frameCount === 0)
    {
        throw new Error("CjsVtaFormat file declares zero frames.");
    }
    if (lastFrame >= description.frameCount)
    {
        throw new Error(`CjsVtaFormat frame ${lastFrame} is out of range 0..${description.frameCount - 1}.`);
    }

    const grids = [];
    for (const { info, index } of selectGrids(description, values.grid))
    {
        const
            voxelCount = info.width * info.height * info.depth * bytesPerPixel(info.format),
            working = new Uint8Array(voxelCount),
            frames = [];

        for (let frame = 0; frame <= lastFrame; frame++)
        {
            const
                blobIndex = frame * description.gridCount + index,
                begin = description.offsets[blobIndex],
                end = blobIndex + 1 === description.offsets.length
                    ? description.dataEnd
                    : description.offsets[blobIndex + 1],
                inflated = await decompressBytes(bytes.subarray(begin, end), "deflate");

            if (info.encoding === VTA_ENCODING.NONE)
            {
                if (inflated.length !== voxelCount)
                {
                    throw new Error(`CjsVtaFormat frame ${frame} inflated to ${inflated.length} bytes; expected ${voxelCount}.`);
                }
                working.set(inflated);
            }
            else
            {
                decodeRle7(inflated, working, frame === 0 ? null : working);
            }

            if (values.allFrames || frame === lastFrame)
            {
                frames.push(new Uint8Array(working));
            }
        }

        grids.push({
            name: info.name,
            format: "r8unorm",
            encoding: info.encoding,
            width: info.width,
            height: info.height,
            depth: info.depth,
            firstFrame: values.allFrames ? 0 : lastFrame,
            frames
        });
    }

    return {
        sourceFormat: "vta",
        version: description.version,
        gridCount: description.gridCount,
        frameCount: description.frameCount,
        metadata: description.metadata,
        grids
    };
}

/** Inspect entry shared by the instance and static surfaces. */
export function inspectWithValues(input)
{
    return inspectBytes(asUint8Array(input, "VTA input"));
}

/** Cheap support report: signature, version, and pixel-format coverage. */
export function probeSupportWithValues(input)
{
    const bytes = asUint8Array(input, "VTA input");
    if (!isVTA(bytes)) return { supported: false, reason: "not a VTA version-1 file" };
    try
    {
        const description = inspectBytes(bytes);
        for (const grid of description.grids) bytesPerPixel(grid.format);
        return { supported: true, gridCount: description.gridCount, frameCount: description.frameCount };
    }
    catch (error)
    {
        return { supported: false, reason: error.message };
    }
}

/** Synchronous read: raw passthrough and structural debug only. */
export function readWithValues(input, values)
{
    const bytes = asUint8Array(input, "VTA input");
    if (values.emit === OUTPUT_RAW)
    {
        return { sourceFormat: "vta", emit: OUTPUT_RAW, bytes };
    }
    if (values.emit === OUTPUT_JSON || values.emit === OUTPUT_VTA_JSON)
    {
        return { sourceFormat: "vta", emit: OUTPUT_VTA_JSON, ...inspectBytes(bytes) };
    }
    const error = new Error("CjsVtaFormat volume decode is asynchronous (zlib inflate); use ReadAsync.");
    error.code = "CJS_FORMAT_OUTPUT_ASYNC_ONLY";
    throw error;
}

/** Asynchronous read: everything, including decoded volumes. */
export async function readAsyncWithValues(input, values)
{
    if (values.emit !== OUTPUT_VOLUME)
    {
        return readWithValues(input, values);
    }
    return decodeVolumes(asUint8Array(input, "VTA input"), values);
}

/** Convert format output into JSON-compatible debug data. */
export function toJsonValue(value)
{
    if (value instanceof Uint8Array)
    {
        return { byteLength: value.byteLength };
    }
    if (Array.isArray(value)) return value.map(toJsonValue);
    if (value && typeof value === "object")
    {
        const output = {};
        for (const [ key, entry ] of Object.entries(value)) output[key] = toJsonValue(entry);
        return output;
    }
    return value;
}
