// Source: imageio/PsdHandler.cpp
import { asUint8Array } from "#utils/bytes";
import { Cutout, ImageIOResult } from "#imageio";
import { PixelFormat as F } from "#consts/render-context";

const Code = ImageIOResult.Code;
const COMPONENTS_BGRA = [ 2, 1, 0, 3 ];
const COMPONENTS_R = [ 0, 1 ];

/** Carbon GetFormat: storage depends on channel count, not color mode. */
export function getFormat(header)
{
    switch (header.channelCount)
    {
        case 1: return F.PIXEL_FORMAT_R8_UNORM;
        case 2: return F.PIXEL_FORMAT_R8G8_UNORM;
        case 3: return F.PIXEL_FORMAT_B8G8R8X8_UNORM;
        default: return F.PIXEL_FORMAT_B8G8R8A8_UNORM;
    }
}

/**
 * Carbon DoReadHeader (PsdHandler.cpp:81-126), with a byte offset replacing
 * ICcpStream's cursor. The three length-prefixed blocks are skipped intact;
 * only the stored merged image is read, never individual layers.
 */
export function doReadHeader(input)
{
    const bytes = asUint8Array(input, "PSD input");
    if (bytes.length < 26) return { code: Code.READ_FAILURE };
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (view.getUint32(0) !== 0x38425053) return { code: Code.INVALID_HEADER };
    const header = {
        version: view.getUint16(4), channelCount: view.getUint16(12),
        height: view.getUint32(14), width: view.getUint32(18),
        depth: view.getUint16(22), colorMode: view.getUint16(24)
    };
    if (header.version !== 1 || header.channelCount > 4 || header.depth !== 8
        || (header.colorMode !== 1 && header.colorMode !== 3))
    {
        return { code: Code.HEADER_NOT_SUPPORTED, header };
    }
    let offset = 26;
    for (let block = 0; block < 3; block++)
    {
        if (offset + 4 > bytes.length) return { code: Code.READ_FAILURE, header };
        offset += 4 + view.getUint32(offset);
    }
    if (offset + 2 > bytes.length) return { code: Code.READ_FAILURE, header };
    header.compression = view.getUint16(offset);
    header.imageDataOffset = offset + 2;
    return { code: header.compression > 1 ? Code.HEADER_NOT_SUPPORTED : Code.OK, header };
}

/** Carbon ReadUncompressedData: planar input becomes R, RG, BGRX or BGRA. */
function readUncompressedData(bytes, header, data)
{
    const size = header.width * header.height;
    const components = header.channelCount < 3 ? COMPONENTS_R : COMPONENTS_BGRA;
    const bpp = header.channelCount === 3 ? 4 : header.channelCount;
    let offset = header.imageDataOffset;
    for (let channel = 0; channel < header.channelCount; channel++)
    {
        if (offset + size > bytes.length) return Code.READ_FAILURE;
        for (let i = 0; i < size; i++) data[i * bpp + components[channel]] = bytes[offset + i];
        offset += size;
    }
    return Code.OK;
}

/**
 * Carbon ReadRleData (PsdHandler.cpp:128-203). Retains the quirk that row
 * lengths are skipped, and packets may cross row boundaries.
 * Adapted: native out-of-bounds pointer reads/writes have no defined JS
 * equivalent. Return INVALID_DATA at those accesses rather than invent pixels.
 * The donor's bugs are the one-element grayscale offsets at lines 131-147
 * and the unchecked literal input at lines 170-174. Its color-mode-dependent
 * stride is deliberately retained, including odd but in-bounds layouts.
 */
function readRleData(bytes, header, data)
{
    const size = header.width * header.height;
    const components = header.colorMode === 1 ? [ 0 ] : COMPONENTS_BGRA;
    const bpp = header.colorMode === 1 ? 1 : 4;
    let offset = header.imageDataOffset + header.height * header.channelCount * 2;
    for (let channel = 0; channel < header.channelCount; channel++)
    {
        let ptr = components[channel];
        let count = 0;
        while (count < size)
        {
            if (offset >= bytes.length) return Code.INVALID_DATA;
            const control = bytes[offset++];
            if (control === 128) continue;
            const literal = control < 128;
            const length = literal ? control + 1 : 257 - control;
            count += length;
            if (count > size || offset + (literal ? length : 1) > bytes.length
                || ptr === undefined || ptr + (length - 1) * bpp >= data.length)
            {
                return Code.INVALID_DATA;
            }
            const value = bytes[offset];
            for (let i = 0; i < length; i++)
            {
                data[ptr] = literal ? bytes[offset++] : value;
                ptr += bpp;
            }
            if (!literal) offset++;
        }
    }
    return Code.OK;
}

/**
 * Carbon Psd::ReadImage (PsdHandler.cpp:299-323), adapted from streams to
 * caller-owned bytes. Load parameters are unused by the donor. Header errors
 * leave outputs alone; pixel errors destroy the newly created bitmap.
 */
export function readImage(input, bitmap, metadata)
{
    const bytes = asUint8Array(input, "PSD input");
    const { code, header } = doReadHeader(bytes);
    if (code !== Code.OK) return new ImageIOResult(code);
    if (metadata) metadata.cutout = new Cutout();
    if (!bitmap.Create(header.width, header.height, 1, getFormat(header)))
    {
        return new ImageIOResult(Code.ERROR_CREATING_BITMAP);
    }
    const data = bitmap.GetRawData();
    const result = header.compression === 1
        ? readRleData(bytes, header, data) : readUncompressedData(bytes, header, data);
    if (result !== Code.OK)
    {
        bitmap.Destroy();
        return new ImageIOResult(result);
    }
    if (header.channelCount === 3)
    {
        for (let i = 3; i < data.length; i += 4) data[i] = 255;
    }
    return new ImageIOResult(Code.OK);
}
