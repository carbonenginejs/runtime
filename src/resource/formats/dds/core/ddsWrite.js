// Source: imageio/Tr2DdsHandler.cpp:524-774,961-1003.
// Approved adaptations (2026-10-03): repair DDS flags, cube counts, 1D and
// sRGB descriptions. Logical extents are never padded to block boundaries.
import { BitmapDimensions } from "#imageio";
import { PixelFormat as P, TextureType as T } from "#consts/render-context";
import { CjsByteWriter } from "../../../format/CjsByteWriter.js";
import { getRawDataSize } from "./dxtCompression.js";
import { saveCcpMetadata } from "./ccpMetadata.js";

const LEGACY_FOURCC = new Map([
    [P.PIXEL_FORMAT_BC1_UNORM, "DXT1"],
    [P.PIXEL_FORMAT_BC2_UNORM, "DXT3"],
    [P.PIXEL_FORMAT_BC3_UNORM, "DXT5"],
    [P.PIXEL_FORMAT_BC4_UNORM, "ATI1"],
    [P.PIXEL_FORMAT_BC5_UNORM, "ATI2"]
]);
const SRGB_FORMATS = new Set([P.PIXEL_FORMAT_BC1_UNORM_SRGB,
    P.PIXEL_FORMAT_BC2_UNORM_SRGB, P.PIXEL_FORMAT_BC3_UNORM_SRGB]);

/** MakePixelFormat's BC1-BC5 compressed export subset. */
export function isDdsSaveSupported(dimensions)
{
    if (dimensions === null || dimensions === undefined) return false;
    const format = dimensions.GetFormat(), type = dimensions.GetType();
    return (LEGACY_FOURCC.has(format) || SRGB_FORMATS.has(format)) &&
        [T.TEX_TYPE_1D, T.TEX_TYPE_2D, T.TEX_TYPE_3D, T.TEX_TYPE_CUBE].includes(type);
}

/** Pack a four-character DDS identifier into its little-endian integer. */
function fourCC(text)
{
    return text.charCodeAt(0) | (text.charCodeAt(1) << 8) | (text.charCodeAt(2) << 16) | (text.charCodeAt(3) << 24);
}

/**
 * Save already compressed BC1-BC5 storage, preserving every subresource.
 * Carbon writes to a stream; the format API returns the complete DDS bytes.
 * @param {object} packet Native bitmap description, storage and metadata.
 * @returns {Uint8Array} DDS file bytes.
 */
export function writeDds(packet)
{
    const bd = new BitmapDimensions(packet.description);
    if (!isDdsSaveSupported(bd)) throw new TypeError("DDS writer requires a BC1-BC5 UNORM bitmap");
    const width = bd.GetWidth(), height = bd.GetHeight(), depth = bd.GetDepth();
    const faces = bd.GetArraySize(), mips = bd.GetTrueMipCount(), type = bd.GetType();
    const volume = type === T.TEX_TYPE_3D, cube = type === T.TEX_TYPE_CUBE;
    for (const value of [width, height, depth, faces, mips])
        if (!Number.isSafeInteger(value) || value < 1 || value > 0xffffffff) throw new RangeError("Invalid DDS dimensions");
    if ((volume && faces !== 1) || (cube && (faces % 6 || width !== height)) ||
        (type === T.TEX_TYPE_1D && height !== 1) || (!volume && depth !== 1))
        throw new RangeError("Invalid DDS texture topology");
    if (mips > Math.floor(Math.log2(Math.max(width, height, volume ? depth : 1))) + 1)
        throw new RangeError("DDS mip count exceeds the logical texture extent");
    if (!(packet.data instanceof Uint8Array) || packet.data.length !== getRawDataSize(bd))
        throw new RangeError("DDS bitmap storage does not match its dimensions");
    // Approved bug fixes, cpp:579-600,740-745: DX10 is required to preserve
    // sRGB, cube arrays and 1D. For cubes DX10 arraySize counts cubes, not faces.
    const dx10 = SRGB_FORMATS.has(bd.GetFormat()) || type === T.TEX_TYPE_1D || (cube ? faces > 6 : faces > 1);
    const metadataWriter = new CjsByteWriter();
    if (packet.metadata) saveCcpMetadata(metadataWriter, packet.metadata.metadata);
    const metadataBytes = metadataWriter.toBytes();
    // Reserve the optional trailer too; otherwise appending even 20 bytes can
    // double a volume-sized backing buffer.
    const writer = new CjsByteWriter((dx10 ? 148 : 128) + packet.data.length + metadataBytes.length);
    writer.u32(fourCC("DDS ")); writer.u32(124);
    let flags = 0x1007 | 0x80000;
    if (mips > 1) flags |= 0x20000;
    // Approved bug fix, cpp:711: preserve LINEARSIZE/MIPMAPCOUNT and set DEPTH.
    if (volume) flags |= 0x800000;
    writer.u32(flags); writer.u32(height); writer.u32(width);
    writer.u32(bd.GetMipSize(0)); writer.u32(volume ? depth : 0); writer.u32(mips);
    for (let i = 0; i < 11; i++) writer.u32(0);
    writer.u32(32); writer.u32(4);
    writer.u32(fourCC(dx10 ? "DX10" : LEGACY_FOURCC.get(bd.GetFormat())));
    for (let i = 0; i < 5; i++) writer.u32(0);
    let caps = 0x1000;
    if (mips > 1) caps |= 0x400000 | 0x8;
    // Approved bug fix, cpp:721-725: a single-mip cube is also complex.
    if (cube || volume || faces > 1) caps |= 0x8;
    writer.u32(caps);
    // Approved bug fix, cpp:711: Carbon omitted DDSCAPS2_VOLUME entirely.
    writer.u32(cube ? 0xfe00 : volume ? 0x200000 : 0);
    writer.u32(0); writer.u32(0); writer.u32(0);
    if (dx10)
    {
        writer.u32(bd.GetFormat());
        writer.u32(volume ? 4 : type === T.TEX_TYPE_1D ? 2 : 3);
        writer.u32(cube ? 4 : 0);
        writer.u32(cube ? faces / 6 : faces);
        writer.u32(0);
    }
    writer.bytes(packet.data);
    writer.bytes(metadataBytes);
    return writer.toBytes();
}
