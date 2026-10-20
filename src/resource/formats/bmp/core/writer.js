// Source: imageio/Tr2BmpHandler.cpp:257-377
import { ImageIOResult } from "#imageio";
import { PixelFormat, TextureType } from "#consts/render-context";

/**
 * Carbon IsSaveSupported (Tr2BmpHandler.cpp:257-267).
 * Mip chains are accepted; Save writes only the top mip.
 * @param {import("#imageio").BitmapDimensions} dimensions Source description.
 * @returns {ImageIOResult} OK for a single 2D BGRX8/BGRA8 image.
 */
export function isSaveSupported(dimensions)
{
    const format = dimensions.GetFormat();
    const supported = dimensions.GetType() === TextureType.TEX_TYPE_2D
        && dimensions.GetArraySize() === 1
        && (format === PixelFormat.PIXEL_FORMAT_B8G8R8X8_UNORM || format === PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM);
    return new ImageIOResult(supported ? ImageIOResult.Code.OK : ImageIOResult.Code.SAVE_NOT_SUPPORTED);
}

/**
 * Carbon Save (Tr2BmpHandler.cpp:278-377), returning bytes instead of a stream.
 *
 * Carbon bug, CE-203: sizeImage at cpp:301 treats padding bytes as pixels. For
 * 24-bit rows requiring padding, both sizeImage and file size overstate the
 * bytes actually emitted. Keep the declared values and the actual row writes
 * separately; do not pad the file to match the incorrect size field.
 * Metadata is ignored, as in Carbon. An in-memory output has no stream
 * WRITE_FAILURE result; allocation errors propagate to the caller.
 *
 * @param {import("#imageio").HostBitmap} image Native BGRX8 or BGRA8 bitmap.
 * @returns {{result: ImageIOResult, bytes: Uint8Array|null}} Status and BMP bytes.
 */
export function save(image)
{
    if (!image.IsValid()) return { result: new ImageIOResult(ImageIOResult.Code.INVALID_BITMAP), bytes: null };
    const result = isSaveSupported(image);
    if (!result.IsOk()) return { result, bytes: null };
    const width = image.GetWidth(), height = image.GetHeight();
    const bitCount = image.GetFormat() === PixelFormat.PIXEL_FORMAT_B8G8R8X8_UNORM ? 24 : 32;
    const bpp = bitCount / 8, rowSize = width * bpp;
    const padding = (4 - rowSize % 4) % 4;
    const sizeImage = Math.floor((Math.imul(Math.imul((width + padding) >>> 0, height), bitCount) >>> 0) / 8);
    const bytes = new Uint8Array(54 + (rowSize + padding) * height); // alloc: returned BMP bytes belong to the caller.
    const view = new DataView(bytes.buffer);
    view.setUint16(0, 0x4d42, true);
    view.setUint32(2, (54 + sizeImage) >>> 0, true);
    view.setUint32(10, 54, true);
    view.setUint32(14, 40, true);
    view.setUint32(18, width, true);
    view.setUint32(22, height, true);
    view.setUint16(26, 1, true);
    view.setUint16(28, bitCount, true);
    view.setUint32(34, sizeImage, true);
    view.setInt32(38, 1, true);
    view.setInt32(42, 1, true);
    const source = image.GetRawData(), srcStride = width * 4;
    for (let y = 0; y < height; y++)
    {
        const from = (height - 1 - y) * srcStride, to = 54 + y * (rowSize + padding);
        if (bpp === 4) bytes.set(source.subarray(from, from + srcStride), to);
        else
        {
            for (let x = 0; x < width; x++)
            {
                bytes[to + x * 3] = source[from + x * 4];
                bytes[to + x * 3 + 1] = source[from + x * 4 + 1];
                bytes[to + x * 3 + 2] = source[from + x * 4 + 2];
            }
        }
    }
    return { result, bytes };
}
