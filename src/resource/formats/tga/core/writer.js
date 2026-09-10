/**
 * TGA encoding, from the normalized RGBA payload every image format here
 * decodes TO.
 *
 * The third writer of the set, and the one with no interesting decisions in it:
 * TGA is a short header followed by pixels. It earns its place because it is
 * lossless like PNG without needing deflate - so it is the one an environment
 * with no `CompressionStream` can still write, and the one worth reaching for
 * when the reader is a tool rather than a browser.
 *
 * ## Two things TGA gets backwards
 *
 * Channels are stored BGRA, not RGBA. And the format's natural row order is
 * bottom-up: a file without the top-left bit set in its descriptor is read
 * from the bottom. Both are handled here rather than left to the caller,
 * because a caller that has to know them is a caller that will eventually
 * forget one, and the failure is a picture that is upside down or has its reds
 * and blues swapped - obvious in a viewer, easy to miss in a pipeline.
 */

const RUN_LENGTH_TYPE = 10;
const UNCOMPRESSED_TYPE = 2;
const TOP_LEFT_ORIGIN = 0x20;

function validate(payload)
{
    const width = Number(payload?.width) | 0;
    const height = Number(payload?.height) | 0;

    if (!width || !height || !payload?.data)
    {
        throw new Error("tga: encoding needs a payload with width, height and data");
    }

    if (width > 0xffff || height > 0xffff)
    {
        throw new Error(`tga: dimensions are limited to 65535, received ${width}x${height}`);
    }

    const stride = Number(payload.strideBytes) || width * 4;

    if (payload.data.length < stride * height)
    {
        throw new Error(
            `tga: payload data is ${payload.data.length} bytes, short of ${stride * height}`,
        );
    }

    return { width, height, stride, data: payload.data, flip: payload.origin === "bottom-left" };
}

function header(width, height, type)
{
    const bytes = new Uint8Array(18);
    const view = new DataView(bytes.buffer);

    bytes[2] = type;
    view.setUint16(12, width, true);
    view.setUint16(14, height, true);
    bytes[16] = 32;
    // Written top-down and declared as such, so nothing downstream has to
    // guess which way up the rows are.
    bytes[17] = TOP_LEFT_ORIGIN | 8;

    return bytes;
}

/** Reads one row as BGRA, resolving stride and origin. */
function readRow(source, row, checked)
{
    const { width, stride, data, flip, height } = checked;
    const start = (flip ? height - 1 - row : row) * stride;

    for (let column = 0; column < width; column++)
    {
        const from = start + column * 4;
        const to = column * 4;

        source[to] = data[from + 2];
        source[to + 1] = data[from + 1];
        source[to + 2] = data[from];
        source[to + 3] = data[from + 3];
    }

    return source;
}

/**
 * Encodes a normalized RGBA payload as TGA bytes.
 *
 * @param {object} payload `{ width, height, data }`, honouring `strideBytes`
 *   and `origin` when present.
 * @param {object} [options] `compress` runs TGA's run-length encoding, which
 *   helps flat art and can slightly enlarge noisy images; default false.
 * @returns {Uint8Array} TGA bytes.
 */
export function encodeTga(payload, options = {})
{
    const checked = validate(payload);
    const { width, height } = checked;
    const row = new Uint8Array(width * 4);

    if (options.compress !== true)
    {
        const out = new Uint8Array(18 + width * height * 4);

        out.set(header(width, height, UNCOMPRESSED_TYPE), 0);

        for (let index = 0; index < height; index++)
        {
            out.set(readRow(row, index, checked), 18 + index * width * 4);
        }

        return out;
    }

    // Worst case is one control byte per PIXEL, not per packet: a literal
    // packet may be a single pixel long, and an image that alternates every
    // pixel produces nothing but those. Sizing for one byte per 128 pixels -
    // the best case - overflows on exactly the images RLE is worst at.
    const out = new Uint8Array(18 + width * height * 5 + 8);
    let write = 18;

    out.set(header(width, height, RUN_LENGTH_TYPE), 0);

    const samePixel = (a, b) => row[a] === row[b] && row[a + 1] === row[b + 1]
        && row[a + 2] === row[b + 2] && row[a + 3] === row[b + 3];

    for (let index = 0; index < height; index++)
    {
        readRow(row, index, checked);

        let column = 0;

        // Packets never cross a row, which the format permits and readers
        // expect: a run spanning rows is legal in the letter of the spec and
        // mishandled by enough decoders to be not worth the bytes it saves.
        while (column < width)
        {
            let run = 1;

            while (run < 128 && column + run < width && samePixel(column * 4, (column + run) * 4))
            {
                run += 1;
            }

            if (run > 1)
            {
                out[write++] = 0x80 | (run - 1);
                out.set(row.subarray(column * 4, column * 4 + 4), write);
                write += 4;
                column += run;
                continue;
            }

            let literal = 1;

            while (literal < 128 && column + literal < width
                && !samePixel((column + literal) * 4, (column + literal - 1) * 4))
            {
                literal += 1;
            }

            out[write++] = literal - 1;
            out.set(row.subarray(column * 4, (column + literal) * 4), write);
            write += literal * 4;
            column += literal;
        }
    }

    return out.subarray(0, write);
}
