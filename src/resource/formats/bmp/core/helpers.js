// Source: imageio/Tr2BmpHandler.cpp:12-173,222-244
import { asUint8Array } from "#utils/bytes";
import { BitmapDimensions, Cutout, ImageIOResult } from "#imageio";
import { PixelFormat } from "#consts/render-context";

const Code = ImageIOResult.Code;
const BMP_SIGNATURE = 0x4d42;
const NO_COMPRESSION = 0;

/**
 * Carbon GetFormat (Tr2BmpHandler.cpp:63-73).
 * @param {object} dibHeader Parsed DIB fields.
 * @returns {number} BGRX8 for 24-bit files, BGRA8 for 32-bit files.
 */
export function getFormat(dibHeader)
{
    return dibHeader.bitCount === 24
        ? PixelFormat.PIXEL_FORMAT_B8G8R8X8_UNORM
        : PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM;
}

/**
 * Carbon DoReadHeader (Tr2BmpHandler.cpp:75-120), using bounded byte reads.
 *
 * The donor reads a 16-byte MinDibHeader even when structSize is smaller;
 * this is not the 12-byte OS/2 CORE layout. It accepts only 24/32 bits and
 * compression zero, ignores planes/reserved/size fields, and reads unsigned
 * dimensions. Larger headers contribute only their first 40 bytes.
 *
 * Carbon quirk, CE-204: ReadImage's relative seek subtracts 54 even after a short header
 * consumed only 30 bytes (cpp:229). Preserve that 24-byte offset difference.
 * Carbon quirk, CE-205: unsigned dimensions do not support signed top-down
 * height (cpp:36,39,116). No palettes, bitfields or RLE are added here.
 *
 * @param {Uint8Array} bytes BMP file bytes.
 * @returns {{code: number, header: object|null}} Result and parsed native fields.
 */
export function doReadHeader(bytes)
{
    if (bytes.length < 14) return { code: Code.READ_FAILURE, header: null };
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (view.getUint16(0, true) !== BMP_SIGNATURE) return { code: Code.INVALID_HEADER, header: null };
    if (bytes.length < 30) return { code: Code.READ_FAILURE, header: null };
    const bitCount = view.getUint16(28, true);
    if (bitCount !== 24 && bitCount !== 32) return { code: Code.HEADER_NOT_SUPPORTED, header: null };
    const structSize = view.getUint32(14, true);
    if (structSize >= 40 && bytes.length < 54) return { code: Code.READ_FAILURE, header: null };
    const width = view.getUint32(18, true), height = view.getUint32(22, true);
    const header = {
        type: BMP_SIGNATURE,
        size: view.getUint32(2, true),
        reserved1: view.getUint16(6, true),
        reserved2: view.getUint16(8, true),
        offBits: view.getUint32(10, true),
        structSize, width, height,
        planes: view.getUint16(26, true),
        bitCount,
        compression: structSize >= 40 ? view.getUint32(30, true) : NO_COMPRESSION,
        sizeImage: structSize >= 40 ? view.getUint32(34, true) : Math.imul(Math.imul(width, height), bitCount) >>> 0,
        xPelsPerMeter: structSize >= 40 ? view.getInt32(38, true) : 1,
        yPelsPerMeter: structSize >= 40 ? view.getInt32(42, true) : 1,
        clrUsed: structSize >= 40 ? view.getUint32(46, true) : 0,
        clrImportant: structSize >= 40 ? view.getUint32(50, true) : 0
    };
    if (header.compression !== NO_COMPRESSION) return { code: Code.HEADER_NOT_SUPPORTED, header: null };
    return { code: Code.OK, header };
}

/**
 * Carbon ReadImagePixels (Tr2BmpHandler.cpp:122-173).
 * Expand stored BGR triplets to BGRX, or copy BGRA rows, reversing bottom-up
 * file order. This is BMP packing, not a general pixel-format converter.
 * @param {Uint8Array} bytes BMP file bytes.
 * @param {import("#imageio").HostBitmap} bitmap Allocated destination bitmap.
 * @param {object} dibHeader Parsed header.
 * @returns {number} OK or READ_FAILURE.
 */
export function readImagePixels(bytes, bitmap, dibHeader)
{
    const bpp = dibHeader.bitCount / 8;
    const stride = Math.floor((dibHeader.bitCount * dibHeader.width + 31) / 32) * 4;
    const outputStride = bitmap.GetWidth() * 4;
    const data = bitmap.GetRawData();
    let offset = dibHeader.offBits - (dibHeader.structSize < 40 ? 24 : 0);
    for (let y = 0; y < bitmap.GetHeight(); y++, offset += stride)
    {
        if (offset < 0 || offset + stride > bytes.length) return Code.READ_FAILURE;
        const destination = (bitmap.GetHeight() - 1 - y) * outputStride;
        if (bpp === 4) data.set(bytes.subarray(offset, offset + stride), destination);
        else
        {
            for (let x = 0; x < bitmap.GetWidth(); x++)
            {
                const from = offset + x * 3, to = destination + x * 4;
                data[to] = bytes[from];
                data[to + 1] = bytes[from + 1];
                data[to + 2] = bytes[from + 2];
                data[to + 3] = 255;
            }
        }
    }
    return Code.OK;
}

/**
 * Carbon ReadImage (Tr2BmpHandler.cpp:222-244), with byte-backed stream input.
 *
 * Adapted: preflight the pixel span before allocating typed-array storage.
 * A truncated or unaddressable span returns READ_FAILURE and destroys output,
 * as a native pixel read failure does, without first allocating dimensions
 * supplied by an incomplete file. JavaScript cannot address native unchecked
 * integer-overflow storage. Allocation RangeErrors become ERROR_CREATING_BITMAP.
 * Header failures leave the caller's bitmap and metadata intact.
 * Carbon quirk, CE-206: CreateFromBitmapDimensions (cpp:236) accepts zero
 * height; the empty pixel loop then returns OK with an invalid bitmap.
 *
 * @param {Uint8Array|ArrayBuffer|ArrayBufferView} input BMP file bytes.
 * @param {import("#imageio").HostBitmap} bitmap Destination bitmap.
 * @param {import("#imageio").Metadata|null} metadata Optional metadata out.
 * @returns {ImageIOResult} Native read status.
 */
export function readImage(input, bitmap, metadata)
{
    const bytes = asUint8Array(input, "BMP input");
    const { code, header } = doReadHeader(bytes);
    if (code !== Code.OK) return new ImageIOResult(code);
    if (metadata) metadata.cutout = new Cutout();
    const stride = Math.floor((header.bitCount * header.width + 31) / 32) * 4;
    const offset = header.offBits - (header.structSize < 40 ? 24 : 0);
    const size = stride * header.height;
    if (header.width !== 0 && header.height !== 0 &&
        (!Number.isSafeInteger(size) || offset < 0 || offset + size > bytes.length))
    {
        bitmap.Destroy();
        return new ImageIOResult(Code.READ_FAILURE);
    }
    const dimensions = BitmapDimensions.create__WidthHeightMipCountFormat(header.width, header.height, 1, getFormat(header));
    try
    {
        if (!bitmap.CreateFromBitmapDimensions(dimensions)) return new ImageIOResult(Code.ERROR_CREATING_BITMAP);
    }
    catch (error)
    {
        if (!(error instanceof RangeError)) throw error;
        bitmap.Destroy();
        return new ImageIOResult(Code.ERROR_CREATING_BITMAP);
    }
    const result = readImagePixels(bytes, bitmap, header);
    if (result !== Code.OK) bitmap.Destroy();
    return new ImageIOResult(result);
}
