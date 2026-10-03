// Source: imageio/PsdHandler.cpp
import { ImageIOResult } from "#imageio";
import { GetBytesPerPixel, PixelFormat as F, TextureType } from "#consts/render-context";

/** Carbon Psd::IsSaveSupported (PsdHandler.cpp:332-344), including mip acceptance. */
export function isSaveSupported(dimensions)
{
    const supported = dimensions.GetType() === TextureType.TEX_TYPE_2D
        && dimensions.GetArraySize() === 1 && [ F.PIXEL_FORMAT_R8_UNORM,
            F.PIXEL_FORMAT_R8G8_UNORM, F.PIXEL_FORMAT_B8G8R8X8_UNORM,
            F.PIXEL_FORMAT_B8G8R8A8_UNORM ].includes(dimensions.GetFormat());
    return new ImageIOResult(supported ? ImageIOResult.Code.OK : ImageIOResult.Code.SAVE_NOT_SUPPORTED);
}

/**
 * Carbon Psd::Save (PsdHandler.cpp:355-416): writes the top mip as uncompressed
 * planar channels and three empty auxiliary blocks; metadata is not serialized.
 * Adapted: the existing ImageIO byte-returning contract replaces ICcpStream,
 * so stream WRITE_FAILURE has no counterpart in this in-memory writer.
 */
export function save(image)
{
    if (!image.IsValid()) return { result: new ImageIOResult(ImageIOResult.Code.INVALID_BITMAP), bytes: null };
    const result = isSaveSupported(image);
    if (!result.IsOk()) return { result, bytes: null };
    const bpp = GetBytesPerPixel(image.GetFormat());
    const channelCount = image.GetFormat() === F.PIXEL_FORMAT_B8G8R8X8_UNORM ? 3 : bpp;
    const size = image.GetWidth() * image.GetHeight();
    const bytes = new Uint8Array(40 + size * channelCount); // alloc: returned PSD file bytes belong to the caller.
    const view = new DataView(bytes.buffer);
    view.setUint32(0, 0x38425053);
    view.setUint16(4, 1);
    view.setUint16(12, channelCount);
    view.setUint32(14, image.GetHeight());
    view.setUint32(18, image.GetWidth());
    view.setUint16(22, 8);
    view.setUint16(24, channelCount > 2 ? 3 : 1);
    const components = channelCount < 3 ? [ 0, 1 ] : [ 2, 1, 0, 3 ];
    const data = image.GetRawData();
    for (let channel = 0; channel < channelCount; channel++)
    {
        for (let i = 0; i < size; i++) bytes[40 + channel * size + i] = data[i * bpp + components[channel]];
    }
    return { result, bytes };
}
