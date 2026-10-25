import { decodeBc6h } from "./bc6h.js";
import { decodeBc7 } from "./bc7.js";

// BC1-BC7 block decoding to RGBA, one 2D slice at a time. Ours, written to the
// BC specification, which is how EVE on PC decodes BC (in D3D11 hardware).
// Carbon's own software decoders are elsewhere: Metal's volume fallback in
// `../carbon/bcDecompress.js`, defects kept, and ImageUtility's per-pixel reads
// in `global/imageio`.

/**
 * Whether `decodeBlockSlice` can decode a pixel format.
 *
 * A caller holding one slice of a volume has no file to ask about, only a
 * format name, so this answers by name alone.
 *
 * @param {?string} pixelFormat Canonical pixel format name.
 * @returns {boolean} True for BC1-BC7 formats.
 */
export function canDecodeBlockSlice(pixelFormat)
{
    return /^bc[1-7]/u.test(String(pixelFormat ?? ""));
}

/**
 * Decodes one block-compressed 2D slice to RGBA.
 *
 * The whole-file readers answer "give me this image"; a volume texture asks
 * a different question - "give me slice 7 of mip 2" - and no amount of
 * reading a file down to one subresource expresses it. This is that seam,
 * and it exists because WebGL cannot take the block data as it is:
 * `EXT_texture_compression_bptc` grants `compressedTexImage2D` only, so a
 * BC7 volume has to be decoded on the CPU and uploaded with `texImage3D`.
 * Carbon does not do this - it hands D3D11 the blocks verbatim, volumes
 * included (`trinity/trinity/Tr2ImageIOHelpers.cpp:48-88`) - so this is a
 * platform-forced divergence rather than a design choice.
 *
 * @param {Uint8Array} bytes The slice's block data, and nothing else.
 * @param {object} [values={}] Slice description.
 * @param {string} values.pixelFormat Pixel format, e.g. "bc7-rgba-unorm".
 * @param {number} values.width Slice width.
 * @param {number} values.height Slice height.
 * @param {number} [values.rowPitch] Bytes per block row; derived when absent.
 * @returns {Uint8Array|Float32Array} width * height * 4, row-major, top-left
 * origin; RGBA8, or linear `Float32Array` RGBA for BC6H.
 * @throws {Error} When `pixelFormat` is not a canonical block format name.
 */
export function decodeBlockSlice(bytes, values = {})
{
    const { pixelFormat, width, height } = values;

    if (!canDecodeBlockSlice(pixelFormat))
    {
        throw new Error(`decodeBlockSlice: "${pixelFormat}" is not a block-compressed format`);
    }

    const blockBytes = /^bc(1|4)/u.test(pixelFormat) ? 8 : 16;
    const rowPitch = values.rowPitch ?? Math.max(1, Math.ceil(width / 4)) * blockBytes;

    if (pixelFormat.startsWith("bc1-")) return decodeBc1(bytes, width, height, rowPitch);
    if (pixelFormat.startsWith("bc2-")) return decodeBc2(bytes, width, height, rowPitch);
    if (pixelFormat.startsWith("bc3-")) return decodeBc3(bytes, width, height, rowPitch);
    if (pixelFormat.startsWith("bc4-")) return decodeBc4(bytes, width, height, rowPitch, pixelFormat.endsWith("-snorm"));
    if (pixelFormat.startsWith("bc5-")) return decodeBc5(bytes, width, height, rowPitch, pixelFormat.endsWith("-snorm"));
    if (pixelFormat.startsWith("bc6h-")) return decodeBc6h(bytes, width, height, rowPitch, pixelFormat === "bc6h-rgb-float");
    if (pixelFormat.startsWith("bc7-")) return decodeBc7(bytes, width, height, rowPitch);

    throw new Error(`decodeBlockSlice: "${pixelFormat}" is not a canonical block format name`);
}

/**
 * Decodes BC1 blocks to RGBA8.
 *
 * @param {Uint8Array} source Block data.
 * @param {number} width Slice width.
 * @param {number} height Slice height.
 * @param {number} rowPitch Bytes per block row.
 * @returns {Uint8Array} RGBA8 pixels.
 */
function decodeBc1(source, width, height, rowPitch)
{
    const rgba = new Uint8Array(width * height * 4);
    for (let blockY = 0; blockY < Math.ceil(height / 4); blockY++)
    {
        for (let blockX = 0; blockX < Math.ceil(width / 4); blockX++)
        {
            const blockOffset = blockY * rowPitch + blockX * 8;
            const c0 = source[blockOffset] | (source[blockOffset + 1] << 8);
            const c1 = source[blockOffset + 2] | (source[blockOffset + 3] << 8);
            const colors = decodeBc1Colors(c0, c1);
            const indices = source[blockOffset + 4] |
                (source[blockOffset + 5] << 8) |
                (source[blockOffset + 6] << 16) |
                (source[blockOffset + 7] << 24);
            for (let y = 0; y < 4; y++)
            {
                for (let x = 0; x < 4; x++)
                {
                    const outputX = blockX * 4 + x;
                    const outputY = blockY * 4 + y;
                    if (outputX >= width || outputY >= height) continue;
                    const color = colors[(indices >>> (2 * (y * 4 + x))) & 3];
                    rgba.set(color, (outputY * width + outputX) * 4);
                }
            }
        }
    }
    return rgba;
}

/**
 * Decodes BC2 blocks (explicit 4-bit alpha) to RGBA8.
 *
 * @param {Uint8Array} source Block data.
 * @param {number} width Slice width.
 * @param {number} height Slice height.
 * @param {number} rowPitch Bytes per block row.
 * @returns {Uint8Array} RGBA8 pixels.
 */
function decodeBc2(source, width, height, rowPitch)
{
    return decodeBcAlphaColor(source, width, height, rowPitch, (blockOffset, x, y) =>
    {
        const alphaNibble = (source[blockOffset + y * 2 + Math.floor(x / 2)] >>> ((x % 2) * 4)) & 0x0f;
        return alphaNibble * 17;
    }, 8);
}

/**
 * Decodes BC3 blocks (interpolated alpha) to RGBA8.
 *
 * @param {Uint8Array} source Block data.
 * @param {number} width Slice width.
 * @param {number} height Slice height.
 * @param {number} rowPitch Bytes per block row.
 * @returns {Uint8Array} RGBA8 pixels.
 */
function decodeBc3(source, width, height, rowPitch)
{
    return decodeBcAlphaColor(source, width, height, rowPitch, (blockOffset, x, y) =>
    {
        const alpha0 = source[blockOffset], alpha1 = source[blockOffset + 1];
        const alphaValues = alpha0 > alpha1
            ? [ alpha0, alpha1,
                Math.round((6 * alpha0 + alpha1) / 7),
                Math.round((5 * alpha0 + 2 * alpha1) / 7),
                Math.round((4 * alpha0 + 3 * alpha1) / 7),
                Math.round((3 * alpha0 + 4 * alpha1) / 7),
                Math.round((2 * alpha0 + 5 * alpha1) / 7),
                Math.round((alpha0 + 6 * alpha1) / 7) ]
            : [ alpha0, alpha1,
                Math.round((4 * alpha0 + alpha1) / 5),
                Math.round((3 * alpha0 + 2 * alpha1) / 5),
                Math.round((2 * alpha0 + 3 * alpha1) / 5),
                Math.round((alpha0 + 4 * alpha1) / 5),
                0, 255 ];
        let alphaBits = 0n;
        for (let i = 0; i < 6; i++) alphaBits |= BigInt(source[blockOffset + 2 + i]) << BigInt(i * 8);
        return alphaValues[Number((alphaBits >> BigInt((y * 4 + x) * 3)) & 7n)];
    }, 8);
}

/**
 * Decodes BC4 blocks to greyscale RGBA8.
 *
 * @param {Uint8Array} source Block data.
 * @param {number} width Slice width.
 * @param {number} height Slice height.
 * @param {number} rowPitch Bytes per block row.
 * @param {boolean} signed Whether the endpoints are SNORM.
 * @returns {Uint8Array} RGBA8 pixels.
 */
function decodeBc4(source, width, height, rowPitch, signed)
{
    const rgba = new Uint8Array(width * height * 4);
    forEachBcPixel(width, height, rowPitch, 8, (blockOffset, x, y, outputOffset) =>
    {
        const value = decodeBc4Value(source, blockOffset, x, y, signed);
        rgba[outputOffset] = value;
        rgba[outputOffset + 1] = value;
        rgba[outputOffset + 2] = value;
        rgba[outputOffset + 3] = 255;
    });
    return rgba;
}

/**
 * Decodes BC5 blocks to red/green RGBA8.
 *
 * @param {Uint8Array} source Block data.
 * @param {number} width Slice width.
 * @param {number} height Slice height.
 * @param {number} rowPitch Bytes per block row.
 * @param {boolean} signed Whether the endpoints are SNORM.
 * @returns {Uint8Array} RGBA8 pixels.
 */
function decodeBc5(source, width, height, rowPitch, signed)
{
    const rgba = new Uint8Array(width * height * 4);
    forEachBcPixel(width, height, rowPitch, 16, (blockOffset, x, y, outputOffset) =>
    {
        rgba[outputOffset] = decodeBc4Value(source, blockOffset, x, y, signed);
        rgba[outputOffset + 1] = decodeBc4Value(source, blockOffset + 8, x, y, signed);
        rgba[outputOffset + 2] = 0;
        rgba[outputOffset + 3] = 255;
    });
    return rgba;
}

/**
 * Decodes one texel of a BC4 channel block.
 *
 * @param {Uint8Array} source Block data.
 * @param {number} blockOffset Byte offset of the 8-byte channel block.
 * @param {number} x Texel column in the block.
 * @param {number} y Texel row in the block.
 * @param {boolean} signed Whether the endpoints are SNORM.
 * @returns {number} The value as a byte (SNORM remapped to 0-255).
 */
function decodeBc4Value(source, blockOffset, x, y, signed)
{
    const endpoint0 = signed ? decodeSnormByte(source[blockOffset]) : source[blockOffset];
    const endpoint1 = signed ? decodeSnormByte(source[blockOffset + 1]) : source[blockOffset + 1];
    const values = endpoint0 > endpoint1
        ? [ endpoint0, endpoint1,
            (6 * endpoint0 + endpoint1) / 7,
            (5 * endpoint0 + 2 * endpoint1) / 7,
            (4 * endpoint0 + 3 * endpoint1) / 7,
            (3 * endpoint0 + 4 * endpoint1) / 7,
            (2 * endpoint0 + 5 * endpoint1) / 7,
            (endpoint0 + 6 * endpoint1) / 7 ]
        : [ endpoint0, endpoint1,
            (4 * endpoint0 + endpoint1) / 5,
            (3 * endpoint0 + 2 * endpoint1) / 5,
            (2 * endpoint0 + 3 * endpoint1) / 5,
            (endpoint0 + 4 * endpoint1) / 5,
            signed ? -1 : 0,
            signed ? 1 : 255 ];
    let bits = 0n;
    for (let i = 0; i < 6; i++) bits |= BigInt(source[blockOffset + 2 + i]) << BigInt(i * 8);
    const value = values[Number((bits >> BigInt((y * 4 + x) * 3)) & 7n)];
    return signed ? Math.max(0, Math.min(255, Math.round((value + 1) * 127.5))) : Math.round(value);
}

/**
 * Converts an SNORM8 byte to -1..1.
 *
 * @param {number} value Unsigned byte holding the two's-complement value.
 * @returns {number} The normalized value.
 */
function decodeSnormByte(value)
{
    const signed = value > 127 ? value - 256 : value;
    return Math.max(-1, signed / 127);
}

/**
 * Calls `callback` for every in-bounds texel of every block.
 *
 * @param {number} width Slice width.
 * @param {number} height Slice height.
 * @param {number} rowPitch Bytes per block row.
 * @param {number} blockBytes Bytes per block.
 * @param {(blockOffset:number, x:number, y:number, outputOffset:number) => void} callback
 *     Receives the block offset, texel position in the block and RGBA8 output offset.
 */
function forEachBcPixel(width, height, rowPitch, blockBytes, callback)
{
    for (let blockY = 0; blockY < Math.ceil(height / 4); blockY++)
    {
        for (let blockX = 0; blockX < Math.ceil(width / 4); blockX++)
        {
            const blockOffset = blockY * rowPitch + blockX * blockBytes;
            for (let y = 0; y < 4; y++)
            {
                for (let x = 0; x < 4; x++)
                {
                    const outputX = blockX * 4 + x;
                    const outputY = blockY * 4 + y;
                    if (outputX < width && outputY < height)
                    {
                        callback(blockOffset, x, y, (outputY * width + outputX) * 4);
                    }
                }
            }
        }
    }
}

/**
 * Decodes 16-byte blocks that pair an alpha block with a four-colour BC1 block.
 *
 * @param {Uint8Array} source Block data.
 * @param {number} width Slice width.
 * @param {number} height Slice height.
 * @param {number} rowPitch Bytes per block row.
 * @param {(blockOffset:number, x:number, y:number) => number} alphaAt Alpha for one texel.
 * @param {number} [colorOffset=0] Byte offset of the colour block within the block.
 * @returns {Uint8Array} RGBA8 pixels.
 */
function decodeBcAlphaColor(source, width, height, rowPitch, alphaAt, colorOffset = 0)
{
    const rgba = new Uint8Array(width * height * 4);
    for (let blockY = 0; blockY < Math.ceil(height / 4); blockY++)
    {
        for (let blockX = 0; blockX < Math.ceil(width / 4); blockX++)
        {
            const blockOffset = blockY * rowPitch + blockX * 16;
            const colorOffsetInBlock = blockOffset + colorOffset;
            const c0 = source[colorOffsetInBlock] | (source[colorOffsetInBlock + 1] << 8);
            const c1 = source[colorOffsetInBlock + 2] | (source[colorOffsetInBlock + 3] << 8);
            const colors = decodeBc1Colors(c0, c1, true);
            const indices = source[colorOffsetInBlock + 4] |
                (source[colorOffsetInBlock + 5] << 8) |
                (source[colorOffsetInBlock + 6] << 16) |
                (source[colorOffsetInBlock + 7] << 24);
            for (let y = 0; y < 4; y++)
            {
                for (let x = 0; x < 4; x++)
                {
                    const outputX = blockX * 4 + x;
                    const outputY = blockY * 4 + y;
                    if (outputX >= width || outputY >= height) continue;
                    const color = colors[(indices >>> (2 * (y * 4 + x))) & 3];
                    const outputOffset = (outputY * width + outputX) * 4;
                    rgba[outputOffset] = color[0];
                    rgba[outputOffset + 1] = color[1];
                    rgba[outputOffset + 2] = color[2];
                    rgba[outputOffset + 3] = alphaAt(blockOffset, x, y);
                }
            }
        }
    }
    return rgba;
}

/**
 * Builds the four-entry BC1 palette from two RGB565 endpoints.
 *
 * @param {number} c0 First endpoint.
 * @param {number} c1 Second endpoint.
 * @param {boolean} [forceFourColor=false] Always use the four-colour mode, as BC2/BC3 do.
 * @returns {Array<number[]>} Four `[r, g, b, a]` entries.
 */
function decodeBc1Colors(c0, c1, forceFourColor = false)
{
    const first = decode565(c0);
    const second = decode565(c1);
    const colors = [ first, second ];
    if (c0 > c1 || forceFourColor)
    {
        colors.push([
            Math.round((2 * first[0] + second[0]) / 3),
            Math.round((2 * first[1] + second[1]) / 3),
            Math.round((2 * first[2] + second[2]) / 3),
            255
        ], [
            Math.round((first[0] + 2 * second[0]) / 3),
            Math.round((first[1] + 2 * second[1]) / 3),
            Math.round((first[2] + 2 * second[2]) / 3),
            255
        ]);
    }
    else
    {
        colors.push([
            Math.round((first[0] + second[0]) / 2),
            Math.round((first[1] + second[1]) / 2),
            Math.round((first[2] + second[2]) / 2),
            255
        ], [ 0, 0, 0, 0 ]);
    }
    return colors;
}

/**
 * Expands an RGB565 value to RGBA8 with rounding.
 *
 * @param {number} value RGB565 value.
 * @returns {number[]} `[r, g, b, 255]`.
 */
function decode565(value)
{
    return [
        Math.round(((value >>> 11) & 0x1f) * 255 / 31),
        Math.round(((value >>> 5) & 0x3f) * 255 / 63),
        Math.round((value & 0x1f) * 255 / 31),
        255
    ];
}
