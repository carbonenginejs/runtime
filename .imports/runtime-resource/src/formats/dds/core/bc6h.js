// BC6H is a little-endian 128-bit block format. MODE_LAYOUTS describes the
// fixed endpoint bit assignments from the Khronos Data Format Specification,
// section 20.2. The decoder and its numeric pipeline are CarbonEngineJS code.

const MODE_LAYOUTS = Object.freeze([
    "M0 M1 GY4 BY4 BZ4 RW0 RW1 RW2 RW3 RW4 RW5 RW6 RW7 RW8 RW9 GW0 GW1 GW2 GW3 GW4 GW5 GW6 GW7 GW8 GW9 BW0 BW1 BW2 BW3 BW4 BW5 BW6 BW7 BW8 BW9 RX0 RX1 RX2 RX3 RX4 GZ4 GY0 GY1 GY2 GY3 GX0 GX1 GX2 GX3 GX4 BZ0 GZ0 GZ1 GZ2 GZ3 BX0 BX1 BX2 BX3 BX4 BZ1 BY0 BY1 BY2 BY3 RY0 RY1 RY2 RY3 RY4 BZ2 RZ0 RZ1 RZ2 RZ3 RZ4 BZ3 D0 D1 D2 D3 D4",
    "M0 M1 GY5 GZ4 GZ5 RW0 RW1 RW2 RW3 RW4 RW5 RW6 BZ0 BZ1 BY4 GW0 GW1 GW2 GW3 GW4 GW5 GW6 BY5 BZ2 GY4 BW0 BW1 BW2 BW3 BW4 BW5 BW6 BZ3 BZ5 BZ4 RX0 RX1 RX2 RX3 RX4 RX5 GY0 GY1 GY2 GY3 GX0 GX1 GX2 GX3 GX4 GX5 GZ0 GZ1 GZ2 GZ3 BX0 BX1 BX2 BX3 BX4 BX5 BY0 BY1 BY2 BY3 RY0 RY1 RY2 RY3 RY4 RY5 RZ0 RZ1 RZ2 RZ3 RZ4 RZ5 D0 D1 D2 D3 D4",
    "M0 M1 M2 M3 M4 RW0 RW1 RW2 RW3 RW4 RW5 RW6 RW7 RW8 RW9 GW0 GW1 GW2 GW3 GW4 GW5 GW6 GW7 GW8 GW9 BW0 BW1 BW2 BW3 BW4 BW5 BW6 BW7 BW8 BW9 RX0 RX1 RX2 RX3 RX4 RW10 GY0 GY1 GY2 GY3 GX0 GX1 GX2 GX3 GW10 BZ0 GZ0 GZ1 GZ2 GZ3 BX0 BX1 BX2 BX3 BW10 BZ1 BY0 BY1 BY2 BY3 RY0 RY1 RY2 RY3 RY4 BZ2 RZ0 RZ1 RZ2 RZ3 RZ4 BZ3 D0 D1 D2 D3 D4",
    "M0 M1 M2 M3 M4 RW0 RW1 RW2 RW3 RW4 RW5 RW6 RW7 RW8 RW9 GW0 GW1 GW2 GW3 GW4 GW5 GW6 GW7 GW8 GW9 BW0 BW1 BW2 BW3 BW4 BW5 BW6 BW7 BW8 BW9 RX0 RX1 RX2 RX3 RW10 GZ4 GY0 GY1 GY2 GY3 GX0 GX1 GX2 GX3 GX4 GW10 GZ0 GZ1 GZ2 GZ3 BX0 BX1 BX2 BX3 BW10 BZ1 BY0 BY1 BY2 BY3 RY0 RY1 RY2 RY3 BZ0 BZ2 RZ0 RZ1 RZ2 RZ3 GY4 BZ3 D0 D1 D2 D3 D4",
    "M0 M1 M2 M3 M4 RW0 RW1 RW2 RW3 RW4 RW5 RW6 RW7 RW8 RW9 GW0 GW1 GW2 GW3 GW4 GW5 GW6 GW7 GW8 GW9 BW0 BW1 BW2 BW3 BW4 BW5 BW6 BW7 BW8 BW9 RX0 RX1 RX2 RX3 RW10 BY4 GY0 GY1 GY2 GY3 GX0 GX1 GX2 GX3 GW10 BZ0 GZ0 GZ1 GZ2 GZ3 BX0 BX1 BX2 BX3 BX4 BW10 BY0 BY1 BY2 BY3 RY0 RY1 RY2 RY3 BZ1 BZ2 RZ0 RZ1 RZ2 RZ3 BZ4 BZ3 D0 D1 D2 D3 D4",
    "M0 M1 M2 M3 M4 RW0 RW1 RW2 RW3 RW4 RW5 RW6 RW7 RW8 BY4 GW0 GW1 GW2 GW3 GW4 GW5 GW6 GW7 GW8 GY4 BW0 BW1 BW2 BW3 BW4 BW5 BW6 BW7 BW8 BZ4 RX0 RX1 RX2 RX3 RX4 GZ4 GY0 GY1 GY2 GY3 GX0 GX1 GX2 GX3 GX4 BZ0 GZ0 GZ1 GZ2 GZ3 BX0 BX1 BX2 BX3 BX4 BZ1 BY0 BY1 BY2 BY3 RY0 RY1 RY2 RY3 RY4 BZ2 RZ0 RZ1 RZ2 RZ3 RZ4 BZ3 D0 D1 D2 D3 D4",
    "M0 M1 M2 M3 M4 RW0 RW1 RW2 RW3 RW4 RW5 RW6 RW7 GZ4 BY4 GW0 GW1 GW2 GW3 GW4 GW5 GW6 GW7 BZ2 GY4 BW0 BW1 BW2 BW3 BW4 BW5 BW6 BW7 BZ3 BZ4 RX0 RX1 RX2 RX3 RX4 RX5 GY0 GY1 GY2 GY3 GX0 GX1 GX2 GX3 GX4 BZ0 GZ0 GZ1 GZ2 GZ3 BX0 BX1 BX2 BX3 BX4 BZ1 BY0 BY1 BY2 BY3 RY0 RY1 RY2 RY3 RY4 RY5 RZ0 RZ1 RZ2 RZ3 RZ4 RZ5 D0 D1 D2 D3 D4",
    "M0 M1 M2 M3 M4 RW0 RW1 RW2 RW3 RW4 RW5 RW6 RW7 BZ0 BY4 GW0 GW1 GW2 GW3 GW4 GW5 GW6 GW7 GY5 GY4 BW0 BW1 BW2 BW3 BW4 BW5 BW6 BW7 GZ5 BZ4 RX0 RX1 RX2 RX3 RX4 GZ4 GY0 GY1 GY2 GY3 GX0 GX1 GX2 GX3 GX4 GX5 GZ0 GZ1 GZ2 GZ3 BX0 BX1 BX2 BX3 BX4 BZ1 BY0 BY1 BY2 BY3 RY0 RY1 RY2 RY3 RY4 BZ2 RZ0 RZ1 RZ2 RZ3 RZ4 BZ3 D0 D1 D2 D3 D4",
    "M0 M1 M2 M3 M4 RW0 RW1 RW2 RW3 RW4 RW5 RW6 RW7 BZ1 BY4 GW0 GW1 GW2 GW3 GW4 GW5 GW6 GW7 BY5 GY4 BW0 BW1 BW2 BW3 BW4 BW5 BW6 BW7 BZ5 BZ4 RX0 RX1 RX2 RX3 RX4 GZ4 GY0 GY1 GY2 GY3 GX0 GX1 GX2 GX3 GX4 BZ0 GZ0 GZ1 GZ2 GZ3 BX0 BX1 BX2 BX3 BX4 BX5 BY0 BY1 BY2 BY3 RY0 RY1 RY2 RY3 RY4 BZ2 RZ0 RZ1 RZ2 RZ3 RZ4 BZ3 D0 D1 D2 D3 D4",
    "M0 M1 M2 M3 M4 RW0 RW1 RW2 RW3 RW4 RW5 GZ4 BZ0 BZ1 BY4 GW0 GW1 GW2 GW3 GW4 GW5 GY5 BY5 BZ2 GY4 BW0 BW1 BW2 BW3 BW4 BW5 GZ5 BZ3 BZ5 BZ4 RX0 RX1 RX2 RX3 RX4 RX5 GY0 GY1 GY2 GY3 GX0 GX1 GX2 GX3 GX4 GX5 GZ0 GZ1 GZ2 GZ3 BX0 BX1 BX2 BX3 BX4 BX5 BY0 BY1 BY2 BY3 RY0 RY1 RY2 RY3 RY4 RY5 RZ0 RZ1 RZ2 RZ3 RZ4 RZ5 D0 D1 D2 D3 D4",
    "M0 M1 M2 M3 M4 RW0 RW1 RW2 RW3 RW4 RW5 RW6 RW7 RW8 RW9 GW0 GW1 GW2 GW3 GW4 GW5 GW6 GW7 GW8 GW9 BW0 BW1 BW2 BW3 BW4 BW5 BW6 BW7 BW8 BW9 RX0 RX1 RX2 RX3 RX4 RX5 RX6 RX7 RX8 RX9 GX0 GX1 GX2 GX3 GX4 GX5 GX6 GX7 GX8 GX9 BX0 BX1 BX2 BX3 BX4 BX5 BX6 BX7 BX8 BX9 NA0 NA0 NA0 NA0 NA0 NA0 NA0 NA0 NA0 NA0 NA0 NA0 NA0 NA0 NA0 NA0 NA0",
    "M0 M1 M2 M3 M4 RW0 RW1 RW2 RW3 RW4 RW5 RW6 RW7 RW8 RW9 GW0 GW1 GW2 GW3 GW4 GW5 GW6 GW7 GW8 GW9 BW0 BW1 BW2 BW3 BW4 BW5 BW6 BW7 BW8 BW9 RX0 RX1 RX2 RX3 RX4 RX5 RX6 RX7 RX8 RW10 GX0 GX1 GX2 GX3 GX4 GX5 GX6 GX7 GX8 GW10 BX0 BX1 BX2 BX3 BX4 BX5 BX6 BX7 BX8 BW10 NA0 NA0 NA0 NA0 NA0 NA0 NA0 NA0 NA0 NA0 NA0 NA0 NA0 NA0 NA0 NA0 NA0",
    "M0 M1 M2 M3 M4 RW0 RW1 RW2 RW3 RW4 RW5 RW6 RW7 RW8 RW9 GW0 GW1 GW2 GW3 GW4 GW5 GW6 GW7 GW8 GW9 BW0 BW1 BW2 BW3 BW4 BW5 BW6 BW7 BW8 BW9 RX0 RX1 RX2 RX3 RX4 RX5 RX6 RX7 RW11 RW10 GX0 GX1 GX2 GX3 GX4 GX5 GX6 GX7 GW11 GW10 BX0 BX1 BX2 BX3 BX4 BX5 BX6 BX7 BW11 BW10 NA0 NA0 NA0 NA0 NA0 NA0 NA0 NA0 NA0 NA0 NA0 NA0 NA0 NA0 NA0 NA0 NA0",
    "M0 M1 M2 M3 M4 RW0 RW1 RW2 RW3 RW4 RW5 RW6 RW7 RW8 RW9 GW0 GW1 GW2 GW3 GW4 GW5 GW6 GW7 GW8 GW9 BW0 BW1 BW2 BW3 BW4 BW5 BW6 BW7 BW8 BW9 RX0 RX1 RX2 RX3 RW15 RW14 RW13 RW12 RW11 RW10 GX0 GX1 GX2 GX3 GW15 GW14 GW13 GW12 GW11 GW10 BX0 BX1 BX2 BX3 BW15 BW14 BW13 BW12 BW11 BW10 NA0 NA0 NA0 NA0 NA0 NA0 NA0 NA0 NA0 NA0 NA0 NA0 NA0 NA0 NA0 NA0 NA0"
]);

const MODES = Object.freeze([
    { code: 0x00, subsets: 2, transformed: true, indexBits: 3, endpointBits: 10, deltaBits: [ 5, 5, 5 ] },
    { code: 0x01, subsets: 2, transformed: true, indexBits: 3, endpointBits: 7, deltaBits: [ 6, 6, 6 ] },
    { code: 0x02, subsets: 2, transformed: true, indexBits: 3, endpointBits: 11, deltaBits: [ 5, 4, 4 ] },
    { code: 0x06, subsets: 2, transformed: true, indexBits: 3, endpointBits: 11, deltaBits: [ 4, 5, 4 ] },
    { code: 0x0a, subsets: 2, transformed: true, indexBits: 3, endpointBits: 11, deltaBits: [ 4, 4, 5 ] },
    { code: 0x0e, subsets: 2, transformed: true, indexBits: 3, endpointBits: 9, deltaBits: [ 5, 5, 5 ] },
    { code: 0x12, subsets: 2, transformed: true, indexBits: 3, endpointBits: 8, deltaBits: [ 6, 5, 5 ] },
    { code: 0x16, subsets: 2, transformed: true, indexBits: 3, endpointBits: 8, deltaBits: [ 5, 6, 5 ] },
    { code: 0x1a, subsets: 2, transformed: true, indexBits: 3, endpointBits: 8, deltaBits: [ 5, 5, 6 ] },
    { code: 0x1e, subsets: 2, transformed: false, indexBits: 3, endpointBits: 6, deltaBits: [ 6, 6, 6 ] },
    { code: 0x03, subsets: 1, transformed: false, indexBits: 4, endpointBits: 10, deltaBits: [ 10, 10, 10 ] },
    { code: 0x07, subsets: 1, transformed: true, indexBits: 4, endpointBits: 11, deltaBits: [ 9, 9, 9 ] },
    { code: 0x0b, subsets: 1, transformed: true, indexBits: 4, endpointBits: 12, deltaBits: [ 8, 8, 8 ] },
    { code: 0x0f, subsets: 1, transformed: true, indexBits: 4, endpointBits: 16, deltaBits: [ 4, 4, 4 ] }
]);

const MODE_BY_CODE = new Int8Array(32).fill(-1);
for (let index = 0; index < MODES.length; index++) MODE_BY_CODE[MODES[index].code] = index;

const FIELD_CHANNEL = Object.freeze({ R: 0, G: 1, B: 2 });
const FIELD_ENDPOINT = Object.freeze({ W: 0, X: 1, Y: 2, Z: 3 });
const DESCRIPTORS = MODE_LAYOUTS.map((layout) => layout.split(" ").map((token) =>
{
    const match = /^([A-Z]+)(\d+)$/u.exec(token);
    const field = match[1];
    const bit = Number(match[2]);
    if (field === "M" || field === "NA") return null;
    if (field === "D") return { shape: true, bit };
    return {
        endpoint: FIELD_ENDPOINT[field[1]],
        channel: FIELD_CHANNEL[field[0]],
        bit
    };
}));

const WEIGHTS_3 = new Uint8Array([ 0, 9, 18, 27, 37, 46, 55, 64 ]);
const WEIGHTS_4 = new Uint8Array([ 0, 4, 9, 13, 17, 21, 26, 30, 34, 38, 43, 47, 51, 55, 60, 64 ]);

// One bit per texel in y-major order. BC6H uses the first 32 two-subset
// partitions shared with BC7.
const PARTITIONS_2 = new Uint16Array([
    0xcccc, 0x8888, 0xeeee, 0xecc8, 0xc880, 0xfeec, 0xfec8, 0xec80,
    0xc800, 0xffec, 0xfe80, 0xe800, 0xffe8, 0xff00, 0xfff0, 0xf000,
    0xf710, 0x008e, 0x7100, 0x08ce, 0x008c, 0x7310, 0x3100, 0x8cce,
    0x088c, 0x3110, 0x6666, 0x366c, 0x17e8, 0x0ff0, 0x718e, 0x399c
]);

const ANCHOR_2 = new Uint8Array([
    15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15,
    15, 2, 8, 2, 2, 8, 8, 15, 2, 8, 2, 2, 8, 8, 2, 2
]);

/**
 * Decodes BC6H texture blocks into a normalized floating-point image for the DDS
 * format reader.
 */
export function decodeBc6h(source, width, height, rowPitch = Math.ceil(width / 4) * 16, signed = false)
{
    const rgba = new Float32Array(width * height * 4);
    const blockRows = Math.ceil(height / 4);
    const blockColumns = Math.ceil(width / 4);

    for (let blockY = 0; blockY < blockRows; blockY++)
    {
        for (let blockX = 0; blockX < blockColumns; blockX++)
        {
            const blockOffset = blockY * rowPitch + blockX * 16;
            const pixels = decodeBc6hBlock(source.subarray(blockOffset, blockOffset + 16), signed);
            copyBlock(pixels, rgba, width, height, blockX, blockY);
        }
    }

    return rgba;
}

/**
 * Decodes one BC6H texture block into destination pixels for the DDS format
 * reader.
 */
export function decodeBc6hBlock(block, signed = false)
{
    if (block.byteLength < 16) throw new RangeError("BC6H block must contain 16 bytes");

    const lowMode = readBits(block, 0, 2);
    const modeCode = lowMode < 2 ? lowMode : readBits(block, 0, 5);
    const modeIndex = MODE_BY_CODE[modeCode];
    if (modeIndex < 0) return opaqueBlackBlock();

    const mode = MODES[modeIndex];
    const descriptor = DESCRIPTORS[modeIndex];
    const headerBits = mode.subsets === 2 ? 82 : 65;
    const endpoints = Array.from({ length: 4 }, () => [ 0, 0, 0 ]);
    let shape = 0;

    for (let sourceBit = 0; sourceBit < headerBits; sourceBit++)
    {
        if (!readBit(block, sourceBit)) continue;
        const target = descriptor[sourceBit];
        if (!target) continue;
        if (target.shape)
        {
            shape |= 1 << target.bit;
        }
        else
        {
            endpoints[target.endpoint][target.channel] |= 1 << target.bit;
        }
    }

    prepareEndpoints(endpoints, mode, signed);

    const output = new Float32Array(16 * 4);
    const weights = mode.indexBits === 3 ? WEIGHTS_3 : WEIGHTS_4;
    const partition = mode.subsets === 2 ? PARTITIONS_2[shape] : 0;
    const anchor = mode.subsets === 2 ? ANCHOR_2[shape] : -1;
    let sourceBit = headerBits;

    for (let pixel = 0; pixel < 16; pixel++)
    {
        const isAnchor = pixel === 0 || pixel === anchor;
        const indexBits = mode.indexBits - (isAnchor ? 1 : 0);
        const colorIndex = readBits(block, sourceBit, indexBits);
        sourceBit += indexBits;

        const subset = mode.subsets === 2 ? ((partition >>> pixel) & 1) : 0;
        const endpoint0 = endpoints[subset * 2];
        const endpoint1 = endpoints[subset * 2 + 1];
        const weight = weights[colorIndex];
        const outputOffset = pixel * 4;

        for (let channel = 0; channel < 3; channel++)
        {
            const value0 = unquantize(endpoint0[channel], mode.endpointBits, signed);
            const value1 = unquantize(endpoint1[channel], mode.endpointBits, signed);
            const interpolated = (value0 * (64 - weight) + value1 * weight + 32) >> 6;
            output[outputOffset + channel] = halfToFloat(finishHalf(interpolated, signed));
        }
        output[outputOffset + 3] = 1;
    }

    return output;
}

function prepareEndpoints(endpoints, mode, signed)
{
    if (signed)
    {
        for (let channel = 0; channel < 3; channel++)
        {
            endpoints[0][channel] = signExtend(endpoints[0][channel], mode.endpointBits);
        }
    }

    if (signed || mode.transformed)
    {
        for (let endpoint = 1; endpoint < mode.subsets * 2; endpoint++)
        {
            for (let channel = 0; channel < 3; channel++)
            {
                endpoints[endpoint][channel] = signExtend(endpoints[endpoint][channel], mode.deltaBits[channel]);
            }
        }
    }

    if (!mode.transformed) return;

    const mask = (1 << mode.endpointBits) - 1;
    for (let endpoint = 1; endpoint < mode.subsets * 2; endpoint++)
    {
        for (let channel = 0; channel < 3; channel++)
        {
            let value = (endpoints[0][channel] + endpoints[endpoint][channel]) & mask;
            if (signed) value = signExtend(value, mode.endpointBits);
            endpoints[endpoint][channel] = value;
        }
    }
}

function unquantize(component, bits, signed)
{
    if (signed)
    {
        if (bits >= 16) return component;
        const negative = component < 0;
        const magnitude = negative ? -component : component;
        const maximum = (1 << (bits - 1)) - 1;
        const value = magnitude === 0
            ? 0
            : magnitude >= maximum
                ? 0x7fff
                : ((magnitude << 15) + 0x4000) >> (bits - 1);
        return negative ? -value : value;
    }

    if (bits >= 15) return component;
    if (component === 0) return 0;
    if (component === (1 << bits) - 1) return 0xffff;
    return ((component << 16) + 0x8000) >> bits;
}

function finishHalf(component, signed)
{
    if (signed)
    {
        const magnitude = component < 0
            ? -(((-component) * 31) >> 5)
            : (component * 31) >> 5;
        return magnitude < 0 ? 0x8000 | -magnitude : magnitude;
    }
    return (component * 31) >> 6;
}

function signExtend(value, bits)
{
    return (value << (32 - bits)) >> (32 - bits);
}

function readBit(source, bit)
{
    return (source[bit >>> 3] >>> (bit & 7)) & 1;
}

function readBits(source, start, count)
{
    let value = 0;
    for (let bit = 0; bit < count; bit++) value |= readBit(source, start + bit) << bit;
    return value;
}

function halfToFloat(value)
{
    const sign = value & 0x8000 ? -1 : 1;
    const exponent = (value >>> 10) & 0x1f;
    const mantissa = value & 0x03ff;
    if (exponent === 0) return sign * Math.pow(2, -14) * (mantissa / 1024);
    if (exponent === 0x1f) return mantissa === 0 ? sign * Infinity : NaN;
    return sign * Math.pow(2, exponent - 15) * (1 + mantissa / 1024);
}

function opaqueBlackBlock()
{
    const output = new Float32Array(16 * 4);
    for (let pixel = 0; pixel < 16; pixel++) output[pixel * 4 + 3] = 1;
    return output;
}

function copyBlock(block, output, width, height, blockX, blockY)
{
    for (let y = 0; y < 4; y++)
    {
        const outputY = blockY * 4 + y;
        if (outputY >= height) continue;
        for (let x = 0; x < 4; x++)
        {
            const outputX = blockX * 4 + x;
            if (outputX >= width) continue;
            const sourceOffset = (y * 4 + x) * 4;
            const outputOffset = (outputY * width + outputX) * 4;
            output[outputOffset] = block[sourceOffset];
            output[outputOffset + 1] = block[sourceOffset + 1];
            output[outputOffset + 2] = block[sourceOffset + 2];
            output[outputOffset + 3] = block[sourceOffset + 3];
        }
    }
}
