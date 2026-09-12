// Image container identification, once.
//
// WHY THIS EXISTS. Each of the four raster formats that share an inspection
// surface — png, jpeg, tga, dds — carried a copy of ALL FOUR magic-number
// sniffers and ALL FOUR header inspectors, so each of the eight functions
// existed four times. That is not a shared module anyone forgot to write; it is
// the same code pasted into four neighbours, and it had already started to drift
// in exactly the way that predicts.
//
// WHAT THE FOREIGN COPIES ACTUALLY DID, measured rather than assumed. Every
// format's `inspectBytes` dispatched across all four sniffers, so the foreign
// code genuinely ran. But every caller passes its own format id as
// `expectedType`, and a detected foreign format throws immediately. So of
// everything a foreign inspector computed — width, height, mip count, fourCC,
// colour type — the ONLY value that ever escaped was the format NAME, used in
// the mismatch message. Identification is all that was ever needed; the other
// three inspectors were decoding headers so their results could be discarded.
//
// THE DRIFT THIS REMOVES, and it changes behaviour, deliberately. Two sniffers
// had grown stricter or wider in their OWNING format only:
//
//   - `isDDS` also checks that the header-size field reads 124. The three
//     foreign copies check the magic alone.
//   - `isTGA` accepts 15 bits per pixel. The three foreign copies accept only
//     8, 16, 24 and 32, so a 15-bpp TGA was detected by the tga reader and
//     invisible to the other three.
//
// The owning copy is the maintained one, so this module keeps both, and the
// consequence is that all four readers now identify a 15-bpp TGA and a
// malformed-header DDS the same way. That is the point of having one
// implementation, but it IS a change and is recorded here rather than absorbed
// silently.
//
// An inspector is NOT here. Each format keeps its own, because that one is real
// work on a container the format owns.

import { readU16LE, readU32LE } from "#utils/bytes";

/** Media type per identified container. */
const IMAGE_MIME_TYPES = Object.freeze({
    png: "image/png",
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    tga: "image/x-tga",
    dds: "image/vnd-ms.dds"
});

/** Byte length of the DDS header that follows the four-byte magic. */
const DDS_HEADER_SIZE = 124;

/**
 * True when `bytes` opens with the eight-byte PNG signature.
 *
 * The length floor is 24, not 8: the signature alone is not a PNG, and every
 * caller goes straight on to read the IHDR that must follow it.
 *
 * @param {Uint8Array} bytes Candidate bytes.
 * @returns {boolean} Whether the signature matches.
 */
export function isPNG(bytes)
{
    return bytes.byteLength >= 24 &&
        bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
        bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
}

/**
 * True when `bytes` opens with the JPEG start-of-image marker.
 *
 * @param {Uint8Array} bytes Candidate bytes.
 * @returns {boolean} Whether the marker matches.
 */
export function isJPEG(bytes)
{
    return bytes.byteLength >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8;
}

/**
 * True when `bytes` opens with the DDS magic AND a well-formed header size.
 *
 * The size check is what separates this from a bare magic test: `DDS ` followed
 * by anything is not a DDS file, and accepting it sends a caller into a header
 * parse that cannot succeed.
 *
 * @param {Uint8Array} bytes Candidate bytes.
 * @returns {boolean} Whether the container is DDS.
 */
export function isDDS(bytes)
{
    return bytes.byteLength >= DDS_HEADER_SIZE + 4 &&
        bytes[0] === 0x44 && bytes[1] === 0x44 && bytes[2] === 0x53 && bytes[3] === 0x20 &&
        readU32LE(bytes, 4) === DDS_HEADER_SIZE;
}

/**
 * True when `bytes` plausibly opens a TGA.
 *
 * TGA has no magic number, so this is a heuristic over the 18-byte header:
 * a known image type, non-zero extent, and a supported pixel depth. It is
 * therefore the LAST thing to test, after every format that can prove itself.
 *
 * @param {Uint8Array} bytes Candidate bytes.
 * @returns {boolean} Whether the header is a plausible TGA.
 */
export function isTGA(bytes)
{
    if (bytes.byteLength < 18) return false;

    const
        imageType = bytes[2],
        width = readU16LE(bytes, 12),
        height = readU16LE(bytes, 14),
        bpp = bytes[16];

    return width > 0 && height > 0 &&
        [ 1, 2, 3, 9, 10, 11 ].includes(imageType) &&
        [ 8, 15, 16, 24, 32 ].includes(bpp);
}

/**
 * Name the raster container `bytes` holds.
 *
 * Order matters and is not alphabetical: the formats that can PROVE themselves
 * from a signature go first, and TGA — which can only be guessed at — goes last.
 *
 * @param {Uint8Array} bytes Candidate bytes.
 * @returns {string} `"png"`, `"jpeg"`, `"dds"`, `"tga"`, or `""` when unknown.
 */
export function identifyImageBytes(bytes)
{
    if (isPNG(bytes)) return "png";
    if (isJPEG(bytes)) return "jpeg";
    if (isDDS(bytes)) return "dds";
    if (isTGA(bytes)) return "tga";
    return "";
}

/**
 * The minimal inspection record for a container this reader does not own.
 *
 * A reader asked to inspect a foreign container needs only to be able to say
 * which one it is; its caller rejects the mismatch before anything reads the
 * extent. Returning zeroes rather than a decoded foreign header is what makes
 * the other three inspectors deletable.
 *
 * @param {string} sourceFormat Identified container name, or `""`.
 * @returns {{sourceFormat: string, width: number, height: number}} The record.
 */
export function foreignImageRecord(sourceFormat)
{
    return { sourceFormat, width: 0, height: 0 };
}

/**
 * Media type for an identified container.
 *
 * @param {string} sourceFormat Identified container name.
 * @returns {string} Media type, or the generic binary type when unknown.
 */
export function imageMimeType(sourceFormat)
{
    return IMAGE_MIME_TYPES[sourceFormat] || "application/octet-stream";
}

/**
 * Channel count for a PNG colour type.
 *
 * Lives here rather than in the PNG reader because the shared inspection record
 * reports it, and three neighbours held a copy for that reason alone.
 *
 * @param {number} colorType PNG IHDR colour type.
 * @returns {number} Channels per pixel, or 0 when the colour type is invalid.
 */
export function pngChannels(colorType)
{
    if (colorType === 0) return 1;
    if (colorType === 2) return 3;
    if (colorType === 3) return 1;
    if (colorType === 4) return 2;
    if (colorType === 6) return 4;
    return 0;
}

/**
 * The `raw` support variant every image reader offers.
 *
 * Handing back the undecoded bytes always works, so this entry is unconditional
 * and identical across the family.
 *
 * @param {object} metadata Inspection record carrying `sourceFormat`.
 * @returns {object} The raw variant descriptor.
 */
export function rawVariant(metadata)
{
    return {
        kind: "raw",
        payloadType: "raw",
        codec: metadata.sourceFormat,
        mimeType: imageMimeType(metadata.sourceFormat),
        supported: true
    };
}

/**
 * Capitalize a format id for an error message, defaulting to `"Image"`.
 *
 * @param {string} value Format id.
 * @returns {string} Capitalized name.
 */
export function capitalizeFormatId(value)
{
    return value ? value[0].toUpperCase() + value.slice(1) : "Image";
}
