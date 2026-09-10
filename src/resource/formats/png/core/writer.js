/**
 * PNG encoding, from the normalized RGBA payload every image format here
 * decodes TO.
 *
 * The lossless counterpart of the JPEG writer beside it. Which one a caller
 * wants is not a matter of taste: JPEG is smaller on photographs and renders
 * and destroys flat colour and sharp edges, PNG is exact and much larger on a
 * gradient. Converting 128x128 pattern art to JPEG measurably made some of it
 * BIGGER, which is the case this exists for.
 *
 * ## Two entry points, because compression is asynchronous
 *
 * `CompressionStream` is the only deflate available to browser-safe code, and
 * it is async - so an async `writeAsync` is the compressing path, and the sync
 * `write` emits STORED deflate blocks: a valid PNG that every decoder reads,
 * at roughly the size of the raw pixels. That is the same split
 * `CjsCmfFormat` makes for the same reason, and the sync path exists so a
 * caller that cannot await still has an exit.
 *
 * The reader beside this uses `DecompressionStream`, so the pair agree about
 * where deflate comes from and neither adds a dependency.
 */

const SIGNATURE = [ 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a ];

/** CRC-32, built once. PNG tags every chunk with one and decoders check it. */
const CRC_TABLE = (() =>
{
    const table = new Uint32Array(256);

    for (let index = 0; index < 256; index++)
    {
        let value = index;

        for (let bit = 0; bit < 8; bit++)
        {
            value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
        }

        table[index] = value >>> 0;
    }

    return table;
})();

function crc32(bytes)
{
    let crc = 0xffffffff;

    for (let index = 0; index < bytes.length; index++)
    {
        crc = CRC_TABLE[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
    }

    return (crc ^ 0xffffffff) >>> 0;
}

/** Adler-32 over the uncompressed data, which the zlib wrapper ends with. */
function adler32(bytes)
{
    let a = 1;
    let b = 0;

    for (let index = 0; index < bytes.length; index++)
    {
        a = (a + bytes[index]) % 65521;
        b = (b + a) % 65521;
    }

    return ((b << 16) | a) >>> 0;
}

function chunk(type, payload)
{
    const name = [ ...type ].map((character) => character.charCodeAt(0));
    const body = new Uint8Array(name.length + payload.length);

    body.set(name, 0);
    body.set(payload, name.length);

    const out = new Uint8Array(body.length + 8);
    const view = new DataView(out.buffer);

    view.setUint32(0, payload.length);
    out.set(body, 4);
    view.setUint32(out.length - 4, crc32(body));

    return out;
}

/**
 * Lays the payload out as PNG scanlines, each prefixed by a filter byte.
 *
 * Filter 0 (None) throughout. The filters exist to make the deflate that
 * follows more effective, and choosing between them per row is a heuristic
 * search that belongs with a compressor tuned for it; None costs one byte a
 * row and keeps this readable. A caller who needs the last twenty percent is
 * better served by a real image pipeline than by a heuristic hidden here.
 */
function toScanlines(payload)
{
    const { width, height, data } = payload;
    const stride = Number(payload.strideBytes) || width * 4;
    const flip = payload.origin === "bottom-left";
    const rowBytes = width * 4;
    const out = new Uint8Array((rowBytes + 1) * height);

    for (let row = 0; row < height; row++)
    {
        const source = (flip ? height - 1 - row : row) * stride;
        const target = row * (rowBytes + 1);

        out[target] = 0;
        out.set(data.subarray(source, source + rowBytes), target + 1);
    }

    return out;
}

/** Wraps deflate output in the two-byte zlib header and its adler trailer. */
function toZlib(deflated, uncompressed)
{
    const out = new Uint8Array(deflated.length + 6);
    const view = new DataView(out.buffer);

    out[0] = 0x78;
    out[1] = 0x01;
    out.set(deflated, 2);
    view.setUint32(out.length - 4, adler32(uncompressed));

    return out;
}

/**
 * Emits stored (uncompressed) deflate blocks.
 *
 * Every block carries its length and that length's complement, and the last is
 * flagged final. It compresses nothing, which is the point of the sync path:
 * it is correct without an await.
 */
function storedDeflate(bytes)
{
    const MAX = 0xffff;
    const blocks = Math.max(1, Math.ceil(bytes.length / MAX));
    const out = new Uint8Array(bytes.length + blocks * 5);
    let read = 0;
    let write = 0;

    while (read < bytes.length || blocks === 1 && read === 0)
    {
        const size = Math.min(MAX, bytes.length - read);
        const final = read + size >= bytes.length ? 1 : 0;

        out[write++] = final;
        out[write++] = size & 0xff;
        out[write++] = size >>> 8;
        out[write++] = ~size & 0xff;
        out[write++] = (~size >>> 8) & 0xff;
        out.set(bytes.subarray(read, read + size), write);
        write += size;
        read += size;

        if (final) break;
    }

    return out.subarray(0, write);
}

function assemble(payload, zlib)
{
    const header = new Uint8Array(13);
    const view = new DataView(header.buffer);

    view.setUint32(0, payload.width);
    view.setUint32(4, payload.height);
    header[8] = 8;      // bit depth
    header[9] = 6;      // colour type: truecolour with alpha
    header[10] = 0;     // deflate, the only compression PNG defines
    header[11] = 0;     // adaptive filtering, the only filter method
    header[12] = 0;     // no interlace

    const ihdr = chunk("IHDR", header);
    const idat = chunk("IDAT", zlib);
    const iend = chunk("IEND", new Uint8Array(0));
    const out = new Uint8Array(SIGNATURE.length + ihdr.length + idat.length + iend.length);
    let offset = 0;

    out.set(SIGNATURE, offset); offset += SIGNATURE.length;
    out.set(ihdr, offset); offset += ihdr.length;
    out.set(idat, offset); offset += idat.length;
    out.set(iend, offset);

    return out;
}

/**
 * Checks the requested compression METHOD, which PNG allows exactly one of.
 *
 * Zero means deflate, and the specification defines nothing else. Accepting a
 * value and writing 0 regardless would be worse than refusing: the file would
 * be correct and the caller's belief about it would not, which is the kind of
 * disagreement that surfaces much later and somewhere else.
 */
function normalizeCompression(value)
{
    if (value === undefined || value === null) return 0;

    if (value !== 0)
    {
        throw new Error(
            `png: compression method ${JSON.stringify(value)} is not defined by the format; `
            + "PNG defines method 0 (deflate) and no other",
        );
    }

    return 0;
}

function validate(payload, options = {})
{
    const width = Number(payload?.width) | 0;
    const height = Number(payload?.height) | 0;

    normalizeCompression(options.compression);

    if (!width || !height || !payload?.data)
    {
        throw new Error("png: encoding needs a payload with width, height and data");
    }

    const stride = Number(payload.strideBytes) || width * 4;

    if (payload.data.length < stride * height)
    {
        throw new Error(
            `png: payload data is ${payload.data.length} bytes, short of ${stride * height}`,
        );
    }

    return { ...payload, width, height, strideBytes: stride };
}

/**
 * Encodes a normalized RGBA payload as PNG bytes, without compressing.
 *
 * @param {object} payload `{ width, height, data }`, honouring `strideBytes`
 *   and `origin` when present.
 * @param {object} [options] `compression` names the PNG compression method,
 *   which is 0 and can be nothing else.
 * @returns {Uint8Array} PNG bytes, roughly the size of the raw pixels.
 */
export function encodePng(payload, options = {})
{
    const checked = validate(payload, options);
    const scanlines = toScanlines(checked);

    return assemble(checked, toZlib(storedDeflate(scanlines), scanlines));
}

/**
 * Encodes a normalized RGBA payload as compressed PNG bytes.
 *
 * @param {object} payload `{ width, height, data }`, honouring `strideBytes`
 *   and `origin` when present.
 * @param {object} [options] `compression` names the PNG compression method,
 *   which is 0 and can be nothing else.
 * @returns {Promise<Uint8Array>} PNG bytes.
 */
export async function encodePngAsync(payload, options = {})
{
    const checked = validate(payload, options);
    const scanlines = toScanlines(checked);

    if (typeof CompressionStream !== "function")
    {
        // Not an error: the result is a correct PNG either way, and refusing
        // here would make the async path less capable than the sync one.
        return assemble(checked, toZlib(storedDeflate(scanlines), scanlines));
    }

    const compressed = new Uint8Array(await new Response(
        new Blob([ scanlines ]).stream().pipeThrough(new CompressionStream("deflate-raw")),
    ).arrayBuffer());

    return assemble(checked, toZlib(compressed, scanlines));
}
