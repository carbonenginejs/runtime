/**
 * Baseline JPEG encoding, from the same normalized RGBA payload every image
 * format in this package decodes TO.
 *
 * That payload is the whole reason this is worth having. `CjsPngFormat`,
 * `CjsTgaFormat`, `CjsDdsFormat` and the rest already agree on
 * `{ width, height, strideBytes, origin, data }`, so one encoder written
 * against it turns any of them into a JPEG without knowing which it came from
 * - and without a browser canvas, which was the only thing in this
 * organization that could write a JPEG before now.
 *
 * ## Baseline, 4:2:0, standard tables
 *
 * The Annex K tables are used rather than tables fitted per image. Fitting
 * them buys a few percent on size and costs a second pass plus a class of bug
 * that only shows up on unusual images; a converter for renders does not need
 * it, and the tables being standard is what makes the output ordinary enough
 * for anything to read.
 *
 * Chroma is subsampled 4:2:0 because that is what every encoder a browser
 * ships does, so it is what the sizes this replaces were measured against. Eye
 * response to chroma detail is poor enough that the halving is not visible on
 * photographs or renders; it IS visible on saturated single-pixel lines, which
 * is why `subsampling: "4:4:4"` exists for anyone encoding diagrams.
 *
 * The forward DCT is the direct O(n^2) form against a cosine table, mirroring
 * the decoder beside it. A fast AAN butterfly is roughly eight times quicker
 * and considerably harder to read; at 512x512 the direct form costs a few tens
 * of milliseconds, which is nothing against reading the file it came from.
 */

const ZIGZAG = [
    0, 1, 8, 16, 9, 2, 3, 10,
    17, 24, 32, 25, 18, 11, 4, 5,
    12, 19, 26, 33, 40, 48, 41, 34,
    27, 20, 13, 6, 7, 14, 21, 28,
    35, 42, 49, 56, 57, 50, 43, 36,
    29, 22, 15, 23, 30, 37, 44, 51,
    58, 59, 52, 45, 38, 31, 39, 46,
    53, 60, 61, 54, 47, 55, 62, 63
];

/** ITU T.81 Annex K.1 luminance quantisation, at quality 50. */
const LUMA_QUANT = [
    16, 11, 10, 16, 24, 40, 51, 61,
    12, 12, 14, 19, 26, 58, 60, 55,
    14, 13, 16, 24, 40, 57, 69, 56,
    14, 17, 22, 29, 51, 87, 80, 62,
    18, 22, 37, 56, 68, 109, 103, 77,
    24, 35, 55, 64, 81, 104, 113, 92,
    49, 64, 78, 87, 103, 121, 120, 101,
    72, 92, 95, 98, 112, 100, 103, 99
];

/** ITU T.81 Annex K.1 chrominance quantisation, at quality 50. */
const CHROMA_QUANT = [
    17, 18, 24, 47, 99, 99, 99, 99,
    18, 21, 26, 66, 99, 99, 99, 99,
    24, 26, 56, 99, 99, 99, 99, 99,
    47, 66, 99, 99, 99, 99, 99, 99,
    99, 99, 99, 99, 99, 99, 99, 99,
    99, 99, 99, 99, 99, 99, 99, 99,
    99, 99, 99, 99, 99, 99, 99, 99,
    99, 99, 99, 99, 99, 99, 99, 99
];

/** Annex K.3 Huffman code lengths and values, one set per table. */
const LUMA_DC_BITS = [ 0, 1, 5, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0 ];
const LUMA_DC_VALUES = [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 ];
const CHROMA_DC_BITS = [ 0, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0 ];
const CHROMA_DC_VALUES = [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 ];

const LUMA_AC_BITS = [ 0, 2, 1, 3, 3, 2, 4, 3, 5, 5, 4, 4, 0, 0, 1, 0x7d ];
const LUMA_AC_VALUES = [
    0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06, 0x13, 0x51, 0x61, 0x07,
    0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xa1, 0x08, 0x23, 0x42, 0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0,
    0x24, 0x33, 0x62, 0x72, 0x82, 0x09, 0x0a, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28,
    0x29, 0x2a, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49,
    0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69,
    0x6a, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7a, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
    0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7,
    0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5,
    0xc6, 0xc7, 0xc8, 0xc9, 0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1, 0xe2,
    0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8,
    0xf9, 0xfa
];

const CHROMA_AC_BITS = [ 0, 2, 1, 2, 4, 4, 3, 4, 7, 5, 4, 4, 0, 1, 2, 0x77 ];
const CHROMA_AC_VALUES = [
    0x00, 0x01, 0x02, 0x03, 0x11, 0x04, 0x05, 0x21, 0x31, 0x06, 0x12, 0x41, 0x51, 0x07, 0x61, 0x71,
    0x13, 0x22, 0x32, 0x81, 0x08, 0x14, 0x42, 0x91, 0xa1, 0xb1, 0xc1, 0x09, 0x23, 0x33, 0x52, 0xf0,
    0x15, 0x62, 0x72, 0xd1, 0x0a, 0x16, 0x24, 0x34, 0xe1, 0x25, 0xf1, 0x17, 0x18, 0x19, 0x1a, 0x26,
    0x27, 0x28, 0x29, 0x2a, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48,
    0x49, 0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68,
    0x69, 0x6a, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7a, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87,
    0x88, 0x89, 0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3, 0xa4, 0xa5,
    0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3,
    0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9, 0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda,
    0xe2, 0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8,
    0xf9, 0xfa
];

const COSINE = Array.from({ length: 8 }, (_, x) =>
    Array.from({ length: 8 }, (_, u) => Math.cos(((2 * x + 1) * u * Math.PI) / 16)));

const SCALE = Array.from({ length: 8 }, (_, value) => value === 0 ? 1 / Math.sqrt(2) : 1);

const SUBSAMPLINGS = Object.freeze({ "4:2:0": [ 2, 2 ], "4:4:4": [ 1, 1 ] });

/** Collects bytes and packs Huffman codes, stuffing 0x00 after every 0xFF. */
class BitWriter
{

    constructor()
    {
        this.bytes = [];
        this.accumulator = 0;
        this.count = 0;
    }

    u8(value)
    {
        this.bytes.push(value & 0xff);
    }

    u16(value)
    {
        this.u8(value >>> 8);
        this.u8(value);
    }

    /**
     * Writes `length` low bits of `value`.
     *
     * The 0x00 after a written 0xFF is not optional and not a quirk: a decoder
     * scans for markers by looking for 0xFF, so entropy data that happens to
     * produce one has to say "this is data" - and a decoder reading a file
     * without the stuffing does not fail, it resynchronises somewhere wrong and
     * returns a picture that is mostly right.
     */
    bits(value, length)
    {
        for (let index = length - 1; index >= 0; index--)
        {
            this.accumulator = (this.accumulator << 1) | ((value >>> index) & 1);
            this.count += 1;

            if (this.count === 8)
            {
                this.u8(this.accumulator);
                if (this.accumulator === 0xff) this.u8(0x00);
                this.accumulator = 0;
                this.count = 0;
            }
        }
    }

    /** Pads the final partial byte with ones, as the standard requires. */
    flush()
    {
        while (this.count > 0) this.bits(1, 1);
    }

}

/** Expands Annex K code lengths and values into a code/length lookup. */
function buildHuffmanTable(bits, values)
{
    const table = new Map();
    let code = 0;
    let index = 0;

    for (let length = 1; length <= 16; length++)
    {
        for (let count = 0; count < bits[length - 1]; count++)
        {
            table.set(values[index++], { code, length });
            code += 1;
        }

        code <<= 1;
    }

    return table;
}

/**
 * Scales the Annex K tables for a quality in 0..1.
 *
 * The scaling curve is the one libjpeg uses, so a quality here means what it
 * means everywhere else - 0.9 is the same 0.9 the renderer asks a canvas for.
 */
function scaleQuantTable(base, quality)
{
    const value = Math.min(100, Math.max(1, Math.round(quality * 100)));
    const factor = value < 50 ? 5000 / value : 200 - value * 2;

    return base.map((entry) =>
        Math.min(255, Math.max(1, Math.floor((entry * factor + 50) / 100))));
}

/** Number of bits needed to encode a signed coefficient, and its bit pattern. */
function categorise(value)
{
    const magnitude = Math.abs(value);
    let size = 0;

    while ((magnitude >>> size) > 0) size += 1;

    // Negative values are stored as the one's complement of their magnitude,
    // which is what makes a leading zero mean "negative" without a sign bit.
    return { size, bits: value < 0 ? value + (1 << size) - 1 : value };
}

/** Direct forward DCT of one 8x8 block, level-shifted by -128. */
function forwardDct(block, out)
{
    for (let v = 0; v < 8; v++)
    {
        for (let u = 0; u < 8; u++)
        {
            let sum = 0;

            for (let y = 0; y < 8; y++)
            {
                for (let x = 0; x < 8; x++)
                {
                    sum += (block[y * 8 + x] - 128) * COSINE[x][u] * COSINE[y][v];
                }
            }

            out[v * 8 + u] = 0.25 * SCALE[u] * SCALE[v] * sum;
        }
    }

    return out;
}

/** Huffman-codes one quantised block and returns its new DC predictor. */
function encodeBlock(writer, coefficients, quant, dcTable, acTable, previousDc)
{
    const zigzag = new Int32Array(64);

    for (let index = 0; index < 64; index++)
    {
        zigzag[index] = Math.round(coefficients[ZIGZAG[index]] / quant[ZIGZAG[index]]);
    }

    const dc = zigzag[0];
    const diff = categorise(dc - previousDc);
    const dcCode = dcTable.get(diff.size);

    writer.bits(dcCode.code, dcCode.length);
    if (diff.size > 0) writer.bits(diff.bits, diff.size);

    let end = 63;

    while (end > 0 && zigzag[end] === 0) end -= 1;

    if (end === 0)
    {
        const eob = acTable.get(0x00);

        writer.bits(eob.code, eob.length);

        return dc;
    }

    let run = 0;

    for (let index = 1; index <= end; index++)
    {
        if (zigzag[index] === 0)
        {
            run += 1;
            continue;
        }

        // A run of more than fifteen zeroes cannot be expressed in the four
        // run bits, so it is emitted as ZRL blocks of sixteen until it can.
        while (run > 15)
        {
            const zrl = acTable.get(0xf0);

            writer.bits(zrl.code, zrl.length);
            run -= 16;
        }

        const value = categorise(zigzag[index]);
        const symbol = acTable.get((run << 4) | value.size);

        writer.bits(symbol.code, symbol.length);
        writer.bits(value.bits, value.size);
        run = 0;
    }

    if (end < 63)
    {
        const eob = acTable.get(0x00);

        writer.bits(eob.code, eob.length);
    }

    return dc;
}

/** Reads the RGBA payload into full-resolution Y, Cb and Cr planes. */
function toYcbcrPlanes(data, width, height, stride, flip)
{
    const count = width * height;
    const y = new Float32Array(count);
    const cb = new Float32Array(count);
    const cr = new Float32Array(count);

    for (let row = 0; row < height; row++)
    {
        const source = (flip ? height - 1 - row : row) * stride;

        for (let column = 0; column < width; column++)
        {
            const offset = source + column * 4;
            const r = data[offset];
            const g = data[offset + 1];
            const b = data[offset + 2];
            const index = row * width + column;

            y[index] = 0.299 * r + 0.587 * g + 0.114 * b;
            cb[index] = -0.168736 * r - 0.331264 * g + 0.5 * b + 128;
            cr[index] = 0.5 * r - 0.418688 * g - 0.081312 * b + 128;
        }
    }

    return { y, cb, cr };
}

/**
 * Fills an 8x8 block from a plane, sampling every `step` pixels.
 *
 * Edges replicate rather than wrap or zero: a block running past the right of
 * an image that is not a multiple of the MCU size is padded with its own last
 * column, which is invisible, where zeroes would put a black wedge down the
 * edge of every odd-sized picture.
 */
function readBlock(plane, planeWidth, planeHeight, originX, originY, step, block)
{
    for (let row = 0; row < 8; row++)
    {
        const y = Math.min(planeHeight - 1, originY + row * step);

        for (let column = 0; column < 8; column++)
        {
            const x = Math.min(planeWidth - 1, originX + column * step);
            let sum = plane[y * planeWidth + x];

            // Averaging the samples a subsampled block skips, rather than
            // taking one of them: point sampling chroma aliases hard on the
            // saturated edges these renders are full of.
            if (step > 1)
            {
                const x2 = Math.min(planeWidth - 1, x + 1);
                const y2 = Math.min(planeHeight - 1, y + 1);

                sum = (plane[y * planeWidth + x] + plane[y * planeWidth + x2]
                    + plane[y2 * planeWidth + x] + plane[y2 * planeWidth + x2]) / 4;
            }

            block[row * 8 + column] = sum;
        }
    }

    return block;
}

function writeSegment(writer, marker, payload)
{
    writer.u8(0xff);
    writer.u8(marker);
    writer.u16(payload.length + 2);
    for (const byte of payload) writer.u8(byte);
}

/**
 * Encodes a normalized RGBA payload as baseline JPEG bytes.
 *
 * @param {object} payload `{ width, height, data }`, optionally with
 *   `strideBytes` and `origin` as the image formats in this package emit them.
 * @param {object} [options] `quality` 0..1 (default 0.9, matching the
 *   renderer's canvas export), and `subsampling` of "4:2:0" or "4:4:4".
 * @returns {Uint8Array} JPEG bytes, SOI through EOI.
 */
export function encodeJpeg(payload, options = {})
{
    const width = Number(payload?.width) | 0;
    const height = Number(payload?.height) | 0;
    const data = payload?.data;

    if (!width || !height || !data)
    {
        throw new Error("jpeg: encoding needs a payload with width, height and data");
    }

    const stride = Number(payload.strideBytes) || width * 4;

    if (data.length < stride * height)
    {
        throw new Error(
            `jpeg: payload data is ${data.length} bytes, short of ${stride * height}`,
        );
    }

    const quality = options.quality === undefined ? 0.9 : Number(options.quality);

    if (!Number.isFinite(quality) || quality <= 0 || quality > 1)
    {
        throw new Error(`jpeg: quality must be between 0 and 1, received ${options.quality}`);
    }

    const subsampling = options.subsampling ?? "4:2:0";

    if (!SUBSAMPLINGS[subsampling])
    {
        throw new Error(`jpeg: unsupported subsampling ${subsampling}`);
    }

    const [ sampleH, sampleV ] = SUBSAMPLINGS[subsampling];
    const lumaQuant = scaleQuantTable(LUMA_QUANT, quality);
    const chromaQuant = scaleQuantTable(CHROMA_QUANT, quality);
    const lumaDc = buildHuffmanTable(LUMA_DC_BITS, LUMA_DC_VALUES);
    const lumaAc = buildHuffmanTable(LUMA_AC_BITS, LUMA_AC_VALUES);
    const chromaDc = buildHuffmanTable(CHROMA_DC_BITS, CHROMA_DC_VALUES);
    const chromaAc = buildHuffmanTable(CHROMA_AC_BITS, CHROMA_AC_VALUES);
    const planes = toYcbcrPlanes(data, width, height, stride, payload.origin === "bottom-left");
    const writer = new BitWriter();

    writer.u8(0xff);
    writer.u8(0xd8);
    writeSegment(writer, 0xe0, [
        0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00
    ]);
    writeSegment(writer, 0xdb, [ 0x00, ...ZIGZAG.map((index) => lumaQuant[index]) ]);
    writeSegment(writer, 0xdb, [ 0x01, ...ZIGZAG.map((index) => chromaQuant[index]) ]);
    writeSegment(writer, 0xc0, [
        0x08,
        height >>> 8, height & 0xff,
        width >>> 8, width & 0xff,
        0x03,
        0x01, (sampleH << 4) | sampleV, 0x00,
        0x02, 0x11, 0x01,
        0x03, 0x11, 0x01
    ]);
    writeSegment(writer, 0xc4, [ 0x00, ...LUMA_DC_BITS, ...LUMA_DC_VALUES ]);
    writeSegment(writer, 0xc4, [ 0x10, ...LUMA_AC_BITS, ...LUMA_AC_VALUES ]);
    writeSegment(writer, 0xc4, [ 0x01, ...CHROMA_DC_BITS, ...CHROMA_DC_VALUES ]);
    writeSegment(writer, 0xc4, [ 0x11, ...CHROMA_AC_BITS, ...CHROMA_AC_VALUES ]);
    writeSegment(writer, 0xda, [ 0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3f, 0x00 ]);

    const block = new Float32Array(64);
    const coefficients = new Float32Array(64);
    const mcuWidth = 8 * sampleH;
    const mcuHeight = 8 * sampleV;
    const mcusX = Math.ceil(width / mcuWidth);
    const mcusY = Math.ceil(height / mcuHeight);
    let dcY = 0;
    let dcCb = 0;
    let dcCr = 0;

    for (let mcuY = 0; mcuY < mcusY; mcuY++)
    {
        for (let mcuX = 0; mcuX < mcusX; mcuX++)
        {
            // Luma blocks first and in raster order within the MCU, then one
            // block of each chroma component: the interleave the scan header
            // above declares, and the order a decoder will read them back in.
            for (let blockY = 0; blockY < sampleV; blockY++)
            {
                for (let blockX = 0; blockX < sampleH; blockX++)
                {
                    readBlock(
                        planes.y, width, height,
                        mcuX * mcuWidth + blockX * 8, mcuY * mcuHeight + blockY * 8, 1, block,
                    );
                    forwardDct(block, coefficients);
                    dcY = encodeBlock(writer, coefficients, lumaQuant, lumaDc, lumaAc, dcY);
                }
            }

            readBlock(planes.cb, width, height, mcuX * mcuWidth, mcuY * mcuHeight, sampleH, block);
            forwardDct(block, coefficients);
            dcCb = encodeBlock(writer, coefficients, chromaQuant, chromaDc, chromaAc, dcCb);

            readBlock(planes.cr, width, height, mcuX * mcuWidth, mcuY * mcuHeight, sampleH, block);
            forwardDct(block, coefficients);
            dcCr = encodeBlock(writer, coefficients, chromaQuant, chromaDc, chromaAc, dcCr);
        }
    }

    writer.flush();
    writer.u8(0xff);
    writer.u8(0xd9);

    return Uint8Array.from(writer.bytes);
}
