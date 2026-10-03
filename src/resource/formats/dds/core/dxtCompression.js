// Source: trinity/trinity/Tr2DxtCompressor.cpp:644-920.
// Source: trinity/trinity/Tr2HostBitmap.cpp:512-557.
// Approved extension: the DDS format owns the one encoder for all consumers,
// including complete mip/face/volume traversal and immutable source storage.
import { BitmapDimensions } from "#imageio";
import { PixelFormat as P } from "#consts/render-context";
import { Tr2DxtCompressionFormat as F } from "#consts/trinity";
import { compressMasked } from "./libsquish.js";

const SOURCE_LAYOUTS = new Map([
    [P.PIXEL_FORMAT_R8_UNORM, { bytes: 1, r: 0, g: -1, b: -1, a: -1 }],
    [P.PIXEL_FORMAT_R8G8_UNORM, { bytes: 2, r: 0, g: 1, b: -1, a: -1 }],
    [P.PIXEL_FORMAT_R8G8B8A8_UNORM, { bytes: 4, r: 0, g: 1, b: 2, a: 3 }],
    [P.PIXEL_FORMAT_R8G8B8A8_UNORM_SRGB, { bytes: 4, r: 0, g: 1, b: 2, a: 3 }],
    [P.PIXEL_FORMAT_B8G8R8A8_UNORM, { bytes: 4, r: 2, g: 1, b: 0, a: 3 }],
    [P.PIXEL_FORMAT_B8G8R8A8_UNORM_SRGB, { bytes: 4, r: 2, g: 1, b: 0, a: 3 }],
    [P.PIXEL_FORMAT_B8G8R8X8_UNORM, { bytes: 4, r: 2, g: 1, b: 0, a: -1 }],
    [P.PIXEL_FORMAT_B8G8R8X8_UNORM_SRGB, { bytes: 4, r: 2, g: 1, b: 0, a: -1 }]
]);

/** Exact 8-bit channel layouts accepted by the encoder; no float reinterpretation. */
export function isCompressionSourceSupported(format)
{
    return SOURCE_LAYOUTS.has(format);
}

/** Native compression mode to storage format; no content-role policy here. */
export function compressionPixelFormat(format, srgb = false)
{
    switch (format)
    {
        case F.TR2DXT_COMPRESS_RT_DXT1:
        case F.TR2DXT_COMPRESS_SQUISH_DXT1:
            return srgb ? P.PIXEL_FORMAT_BC1_UNORM_SRGB : P.PIXEL_FORMAT_BC1_UNORM;
        case F.TR2DXT_COMPRESS_SQUISH_DXT3:
            // Approved bug fix: Tr2HostBitmap.cpp:519-529 described DXT3 as BC1.
            return srgb ? P.PIXEL_FORMAT_BC2_UNORM_SRGB : P.PIXEL_FORMAT_BC2_UNORM;
        case F.TR2DXT_COMPRESS_RT_DXT5:
        case F.TR2DXT_COMPRESS_SQUISH_DXT5:
            return srgb ? P.PIXEL_FORMAT_BC3_UNORM_SRGB : P.PIXEL_FORMAT_BC3_UNORM;
        case F.TR2DXT_COMPRESS_RT_DXT5N:
        case F.TR2DXT_COMPRESS_RT_YCOCGDXT5:
            if (srgb) throw new RangeError("Swizzled DXT5 requires a linear shader decode");
            return P.PIXEL_FORMAT_BC3_UNORM;
        case F.TR2DXT_COMPRESS_SQUISH_KBC4:
            if (srgb) throw new RangeError("BC4 has no sRGB storage format");
            return P.PIXEL_FORMAT_BC4_UNORM;
        case F.TR2DXT_COMPRESS_RT_3DC:
        case F.TR2DXT_COMPRESS_SQUISH_KBC5:
            // Approved bug fix: Tr2HostBitmap.cpp:519-529 described 3DC as BC3.
            if (srgb) throw new RangeError("BC5 has no sRGB storage format");
            return P.PIXEL_FORMAT_BC5_UNORM;
        default:
            throw new RangeError("Unknown DXT compression format");
    }
}

/** Require an exact nonnegative byte offset or positive extent before allocation. */
function integer(value, name, minimum = 0)
{
    if (!Number.isSafeInteger(value) || value < minimum) throw new RangeError(`Invalid ${name}`);
    return value;
}

/** HostBitmap's complete array storage size, without allocating a bitmap. */
export function getRawDataSize(dimensions)
{
    let size = 0;
    for (let mip = 0; mip < dimensions.GetTrueMipCount(); mip++) size += dimensions.GetMipSize(mip);
    return integer(size * dimensions.GetArraySize(), "bitmap storage size", 1);
}

/**
 * Encode one pitched surface into caller-owned private output.
 * Approved bug fixes: cpp:207-214 clips extraction to the source; cpp:678-830
 * honors outputPitch. All modes pass squish the valid-texel mask; source
 * reads are bounded at partial blocks. Logical extents stay
 * unchanged. Only a 4x4 block is expanded, never the complete source image.
 * @param {Uint8Array} input Native source storage.
 * @param {number} width Logical surface width.
 * @param {number} height Logical surface height.
 * @param {number} format Carbon compression mode.
 * @param {Uint8Array} output Private destination storage.
 * @param {object} [options] Native input format, offsets, pitches and quality.
 * @returns {void}
 */
export function compressSurface(input, width, height, format, output, options = {})
{
    integer(width, "width", 1); integer(height, "height", 1);
    const pixelFormat = compressionPixelFormat(format);
    const blockBytes = pixelFormat === P.PIXEL_FORMAT_BC1_UNORM || pixelFormat === P.PIXEL_FORMAT_BC4_UNORM ? 8 : 16;
    const sourceFormat = options.sourceFormat ?? P.PIXEL_FORMAT_B8G8R8A8_UNORM;
    const layout = SOURCE_LAYOUTS.get(sourceFormat);
    if (!layout) throw new TypeError("DXT compression requires an 8-bit UNORM source with established channel semantics");
    const inputPitch = integer(options.inputPitch ?? width * layout.bytes, "inputPitch", width * layout.bytes);
    const outputPitch = integer(options.outputPitch ?? Math.ceil(width / 4) * blockBytes, "outputPitch", Math.ceil(width / 4) * blockBytes);
    const inputOffset = integer(options.inputOffset ?? 0, "inputOffset");
    const outputOffset = integer(options.outputOffset ?? 0, "outputOffset");
    const inputEnd = inputOffset + (height - 1) * inputPitch + width * layout.bytes;
    const outputEnd = outputOffset + (Math.ceil(height / 4) - 1) * outputPitch + Math.ceil(width / 4) * blockBytes;
    if (!(input instanceof Uint8Array) || !(output instanceof Uint8Array) || inputEnd > input.length || outputEnd > output.length)
        throw new RangeError("Compression surface exceeds its storage");
    let quality = options.quality ?? 2;
    if (quality === -1) quality = 2;
    if (!Number.isInteger(quality) || quality < 0 || quality > 2) throw new RangeError("Unknown squish quality");
    const block = new Uint8Array(64); // alloc: byte-codec workspace reused for all tiles of this surface
    // Adapted by operator decision, 2026-10-03: Carbon's realtime encoder is
    // id Software LGPL code and cannot ship in this MIT runtime. Preserve the
    // ten native enum values, but use the MIT libsquish port for every mode.
    const squishFormat = format === F.TR2DXT_COMPRESS_RT_DXT1 ? F.TR2DXT_COMPRESS_SQUISH_DXT1 :
        format === F.TR2DXT_COMPRESS_RT_3DC ? F.TR2DXT_COMPRESS_SQUISH_KBC5 :
            format < F.TR2DXT_COMPRESS_SQUISH_DXT1 ? F.TR2DXT_COMPRESS_SQUISH_DXT5 : format;
    for (let y = 0; y < height; y += 4)
    for (let x = 0; x < width; x += 4)
    {
        let mask = 0;
        for (let by = 0; by < 4; by++)
        for (let bx = 0; bx < 4; bx++)
        {
            const index = by * 4 + bx;
            if (x + bx < width && y + by < height) mask |= 1 << index;
            const source = inputOffset + Math.min(y + by, height - 1) * inputPitch + Math.min(x + bx, width - 1) * layout.bytes;
            const red = input[source + layout.r], green = layout.g < 0 ? 0 : input[source + layout.g];
            const blue = layout.b < 0 ? 0 : input[source + layout.b], alpha = layout.a < 0 ? 255 : input[source + layout.a];
            if (format === F.TR2DXT_COMPRESS_RT_DXT5N)
            {
                // Carbon's channel contract (cpp:216-228), compressed by squish.
                block[4 * index] = alpha;
                block[4 * index + 1] = green;
                block[4 * index + 2] = 0;
                block[4 * index + 3] = red;
            }
            else if (format === F.TR2DXT_COMPRESS_RT_YCOCGDXT5)
            {
                // Mathematical YCoCg transform: Y=(R+2G+B)/4,
                // Co=(R-B)/2, Cg=(-R+2G-B)/4. No id Software encoder code.
                // Unit chroma scale is represented by blue=0 in the shader.
                block[4 * index] = Math.max(0, Math.min(255, Math.floor((red - blue) / 2 + 128.5)));
                block[4 * index + 1] = Math.max(0, Math.min(255, Math.floor((-red + 2 * green - blue) / 4 + 128.5)));
                block[4 * index + 2] = 0;
                block[4 * index + 3] = Math.floor((red + 2 * green + blue) / 4 + 0.5);
            }
            else
            {
                block[4 * index] = red;
                block[4 * index + 1] = green;
                block[4 * index + 2] = blue;
                block[4 * index + 3] = alpha;
            }
        }
        const destination = outputOffset + (y / 4) * outputPitch + (x / 4) * blockBytes;
        compressMasked(block, mask, squishFormat, quality, output, destination);
    }
}

/**
 * Encode every array face, mip and depth slice in a DDS native bitmap packet.
 * Source: BitmapDimensions.h mip layout; Tr2HostBitmap.cpp:512-557 publication.
 * Extension: preserve the complete texture instead of only a 2D base level.
 * @param {object} packet Description, native byte storage and metadata.
 * @param {number} format Explicit Carbon compression mode (not automatically selected).
 * @param {object} [options] Squish quality and explicit output sRGB flag.
 * @returns {object} Independently owned complete compressed bitmap packet.
 */
export function compressBitmap(packet, format, options = {})
{
    const source = new BitmapDimensions(packet.description);
    if (!isCompressionSourceSupported(source.GetFormat())) throw new TypeError("Unsupported compression source format");
    integer(source.GetWidth(), "width", 1); integer(source.GetHeight(), "height", 1);
    for (const value of [source.GetWidth(), source.GetHeight(), source.GetDepth(), source.GetMipCount(), source.GetArraySize()])
        if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new RangeError("Invalid bitmap dimensions");
    if (source.GetMipCount() > 32) throw new RangeError("Invalid bitmap mip count");
    integer(source.GetDepth(), "depth", 1); integer(source.GetArraySize(), "arraySize", 1);
    if (!(packet.data instanceof Uint8Array) || packet.data.length !== getRawDataSize(source))
        throw new RangeError("Compression bitmap storage does not match its description");
    const srgb = options.srgb ?? [P.PIXEL_FORMAT_R8G8B8A8_UNORM_SRGB,
        P.PIXEL_FORMAT_B8G8R8A8_UNORM_SRGB, P.PIXEL_FORMAT_B8G8R8X8_UNORM_SRGB].includes(source.GetFormat());
    const description = { ...packet.description, format: compressionPixelFormat(format, srgb), mipCount: source.GetTrueMipCount() };
    const destination = new BitmapDimensions(description);
    const data = new Uint8Array(getRawDataSize(destination)); // alloc: complete variable-sized encoded texture returned to caller
    let sourceOffset = 0, outputOffset = 0;
    for (let face = 0; face < source.GetArraySize(); face++)
    for (let mip = 0; mip < source.GetTrueMipCount(); mip++)
    {
        const width = Math.max(1, source.GetWidth() >>> mip), height = Math.max(1, source.GetHeight() >>> mip);
        const sourceSlice = source.GetMipSize(mip) / source.GetMipDepth(mip);
        const destinationSlice = destination.GetMipSize(mip) / destination.GetMipDepth(mip);
        for (let z = 0; z < source.GetMipDepth(mip); z++)
        {
            compressSurface(packet.data, width, height, format, data, {
                sourceFormat: source.GetFormat(), quality: options.quality,
                inputPitch: source.GetMipPitch(mip), outputPitch: destination.GetMipPitch(mip),
                inputOffset: sourceOffset + z * sourceSlice, outputOffset: outputOffset + z * destinationSlice
            });
        }
        sourceOffset += source.GetMipSize(mip);
        outputOffset += destination.GetMipSize(mip);
    }
    return { sourceFormat: "dds", description, data, metadata: packet.metadata };
}
