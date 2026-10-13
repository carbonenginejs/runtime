import { asUint8Array } from "#utils/bytes";
import { readCff } from "./readCff.js";

// The OpenType container ("sfnt"), from the OpenType specification
// (https://learn.microsoft.com/typography/opentype/spec/): the table
// directory, then only the tables a glyph rasteriser needs - head, maxp,
// hhea/hmtx, OS/2, cmap - and the CFF outlines when the font has them.
// TrueType outlines (glyf/loca) are identified but not read.

/** sfnt version of a font with CFF outlines: "OTTO". */
export const SFNT_VERSION_CFF = 0x4f54544f;

/** sfnt version of a font with TrueType outlines. */
export const SFNT_VERSION_TRUETYPE = 0x00010000;

/** Apple's sfnt version for TrueType outlines: "true". */
const SFNT_VERSION_APPLE_TRUETYPE = 0x74727565;

/** A font collection header: "ttcf". */
const SFNT_VERSION_COLLECTION = 0x74746366;

/**
 * One table directory record.
 *
 * @typedef {object} CjsSfntTable
 * @property {number} offset Byte offset of the table from the start of the file.
 * @property {number} length Byte length of the table.
 */

/**
 * A character map, reduced to the two subtable formats that cover Unicode.
 * Format 4 keeps its segment arrays; `glyphIdTail` is the idRangeOffset array
 * followed by glyphIdArray, so the specification's pointer arithmetic becomes
 * an index into one array. Format 12 keeps its groups as triples.
 *
 * @typedef {object} CjsOpenTypeCmap
 * @property {4|12} format Subtable format.
 * @property {number} platformID Platform of the chosen subtable.
 * @property {number} encodingID Encoding of the chosen subtable.
 * @property {Uint16Array} [endCodes] Format 4: last code of each segment.
 * @property {Uint16Array} [startCodes] Format 4: first code of each segment.
 * @property {Int16Array} [idDeltas] Format 4: delta added to each code.
 * @property {Uint16Array} [glyphIdTail] Format 4: idRangeOffsets, then glyphIdArray.
 * @property {Uint32Array} [groups] Format 12: startCharCode, endCharCode, startGlyphID per group.
 */

/**
 * One horizontal format 0 subtable of a version 0 'kern' table.
 *
 * @typedef {object} CjsOpenTypeKernSubtable
 * @property {boolean} override Whether its value replaces, rather than adds to, earlier subtables' (coverage bit 3).
 * @property {Map<number, number>} pairs Kerning in font units, keyed by left glyph * 65536 + right glyph.
 */

/**
 * A parsed OpenType font: plain data, in font units.
 *
 * @typedef {object} CjsOpenTypeFont
 * @property {"cff"|"truetype"} outlineFormat Which outlines the font carries.
 * @property {number} unitsPerEm Font units per em (head).
 * @property {number} numGlyphs Glyph count (maxp).
 * @property {Array<number>} bounds Font bounding box [xMin, yMin, xMax, yMax] (head).
 * @property {number} ascender hhea ascender.
 * @property {number} descender hhea descender (negative below the baseline).
 * @property {number} lineGap hhea line gap.
 * @property {object|null} os2 OS/2 vertical metrics, or null when the table is absent.
 * @property {Uint16Array} advanceWidths Advance width per glyph (hmtx).
 * @property {Int16Array} leftSideBearings Left side bearing per glyph (hmtx).
 * @property {CjsOpenTypeCmap|null} cmap The Unicode character map, or null when the font has none.
 * @property {Array<CjsOpenTypeKernSubtable>} kern Horizontal format 0 subtables of the 'kern' table, in table order; empty without one.
 * @property {import("./readCff.js").CjsCffFont|null} cff CFF outlines, or null for TrueType outlines.
 */

/**
 * Reads an OpenType or TrueType font file.
 *
 * @param {ArrayBuffer|ArrayBufferView} input Font file bytes.
 * @param {object} [options={}] Read options.
 * @param {string} [options.source] Source label used in error messages.
 * @returns {CjsOpenTypeFont} The parsed font.
 * @throws {Error} When the bytes are not a single sfnt font, or a required table is missing or truncated.
 */
export function readOpenType(input, options = {})
{
    const bytes = asUint8Array(input, "OpenType input");
    const source = options.source || "OpenType font";
    if (bytes.byteLength < 12) throw new Error(`${source}: too short for an sfnt header.`);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    // 1. Outline format from the sfnt version.
    const version = view.getUint32(0);
    let outlineFormat;
    if (version === SFNT_VERSION_CFF) outlineFormat = "cff";
    else if (version === SFNT_VERSION_TRUETYPE || version === SFNT_VERSION_APPLE_TRUETYPE) outlineFormat = "truetype";
    else if (version === SFNT_VERSION_COLLECTION) throw new Error(`${source}: font collections (ttcf) are not supported.`);
    else throw new Error(`${source}: not an sfnt font (version 0x${version.toString(16).padStart(8, "0")}).`);

    // 2. Table directory.
    const tables = readTableDirectory(view, source);
    const Table = tag =>
    {
        const table = tables.get(tag);
        if (!table) throw new Error(`${source}: missing required table '${tag}'.`);
        return new DataView(bytes.buffer, bytes.byteOffset + table.offset, table.length);
    };

    // 3. head, maxp, hhea.
    const head = Table("head");
    const unitsPerEm = head.getUint16(18);
    const bounds = [ head.getInt16(36), head.getInt16(38), head.getInt16(40), head.getInt16(42) ];
    const numGlyphs = Table("maxp").getUint16(4);
    const hhea = Table("hhea");
    const ascender = hhea.getInt16(4);
    const descender = hhea.getInt16(6);
    const lineGap = hhea.getInt16(8);
    const numberOfHMetrics = hhea.getUint16(34);

    // 4. hmtx: full records, then left side bearings that repeat the last advance.
    const hmtx = Table("hmtx");
    const advanceWidths = new Uint16Array(numGlyphs); // alloc: read output, sized by the font
    const leftSideBearings = new Int16Array(numGlyphs); // alloc: read output, sized by the font
    if (numberOfHMetrics === 0 || hmtx.byteLength < numberOfHMetrics * 4)
    {
        throw new Error(`${source}: hmtx is shorter than hhea's ${numberOfHMetrics} metrics.`);
    }
    for (let glyph = 0; glyph < numGlyphs; glyph++)
    {
        if (glyph < numberOfHMetrics)
        {
            advanceWidths[glyph] = hmtx.getUint16(glyph * 4);
            leftSideBearings[glyph] = hmtx.getInt16(glyph * 4 + 2);
        }
        else
        {
            advanceWidths[glyph] = advanceWidths[numberOfHMetrics - 1];
            const at = numberOfHMetrics * 4 + (glyph - numberOfHMetrics) * 2;
            leftSideBearings[glyph] = at + 2 <= hmtx.byteLength ? hmtx.getInt16(at) : 0;
        }
    }

    // 5. OS/2 vertical metrics, when present.
    let os2 = null;
    if (tables.has("OS/2"))
    {
        const table = Table("OS/2");
        if (table.byteLength >= 78)
        {
            os2 = {
                fsSelection: table.getUint16(62),
                typoAscender: table.getInt16(68),
                typoDescender: table.getInt16(70),
                typoLineGap: table.getInt16(72),
                winAscent: table.getUint16(74),
                winDescent: table.getUint16(76)
            };
        }
    }

    // 6. cmap, kern and CFF outlines.
    const cmap = tables.has("cmap") ? readCmap(Table("cmap"), source) : null;
    const kern = tables.has("kern") ? readKern(Table("kern")) : [];
    let cff = null;
    if (outlineFormat === "cff")
    {
        const table = tables.get("CFF ");
        if (!table) throw new Error(`${source}: OTTO font without a 'CFF ' table (CFF2 is not supported).`);
        cff = readCff(bytes.subarray(table.offset, table.offset + table.length), source);
        if (cff.charStrings.length !== numGlyphs)
        {
            throw new Error(`${source}: CFF has ${cff.charStrings.length} glyphs, maxp says ${numGlyphs}.`);
        }
    }

    return {
        outlineFormat,
        unitsPerEm,
        numGlyphs,
        bounds,
        ascender,
        descender,
        lineGap,
        os2,
        advanceWidths,
        leftSideBearings,
        cmap,
        kern,
        cff
    };
}

/**
 * Reads the subtables of a version 0 ('kern' as Microsoft defines it) table
 * that FreeType uses: format 0, horizontal, not minimum values (FreeType's
 * ttkern.c, tt_face_load_kern). Apple's version 1 tables yield none.
 *
 * @param {DataView} kern The kern table.
 * @returns {Array<CjsOpenTypeKernSubtable>} The usable subtables.
 */
function readKern(kern)
{
    const subtables = [];
    if (kern.byteLength < 4 || kern.getUint16(0) !== 0) return subtables;
    const count = kern.getUint16(2);
    let at = 4;
    for (let i = 0; i < count && at + 6 <= kern.byteLength; i++)
    {
        const length = kern.getUint16(at + 2);
        const coverage = kern.getUint16(at + 4);
        const next = Math.min(at + Math.max(length, 6), kern.byteLength);
        if ((coverage >> 8) === 0 && (coverage & 3) === 1 && at + 14 <= next)
        {
            const pairCount = Math.min(kern.getUint16(at + 6), Math.floor((next - at - 14) / 6));
            const pairs = new Map();
            for (let p = 0; p < pairCount; p++)
            {
                const pair = at + 14 + p * 6;
                pairs.set(kern.getUint16(pair) * 65536 + kern.getUint16(pair + 2), kern.getInt16(pair + 4));
            }
            subtables.push({ override: (coverage & 8) !== 0, pairs });
        }
        at = next;
    }
    return subtables;
}

/**
 * Looks a Unicode code point up in a font's character map.
 *
 * @param {CjsOpenTypeFont} font The parsed font.
 * @param {number} codePoint Unicode code point.
 * @returns {number} The glyph ID, or 0 (.notdef) when the font has no glyph for it.
 */
export function lookupGlyphIndex(font, codePoint)
{
    const cmap = font.cmap;
    if (!cmap || !Number.isInteger(codePoint) || codePoint < 0) return 0;

    if (cmap.format === 12)
    {
        const groups = cmap.groups;
        let low = 0;
        let high = groups.length / 3 - 1;
        while (low <= high)
        {
            const middle = (low + high) >> 1;
            const start = groups[middle * 3];
            const end = groups[middle * 3 + 1];
            if (codePoint < start) high = middle - 1;
            else if (codePoint > end) low = middle + 1;
            else return groups[middle * 3 + 2] + (codePoint - start);
        }
        return 0;
    }

    // Format 4: the first segment whose end code is >= the code point.
    if (codePoint > 0xffff) return 0;
    const { endCodes, startCodes, idDeltas, glyphIdTail } = cmap;
    let low = 0;
    let high = endCodes.length - 1;
    while (low < high)
    {
        const middle = (low + high) >> 1;
        if (endCodes[middle] < codePoint) low = middle + 1;
        else high = middle;
    }
    if (codePoint < startCodes[low] || codePoint > endCodes[low]) return 0;
    const rangeOffset = glyphIdTail[low];
    if (rangeOffset === 0) return (codePoint + idDeltas[low]) & 0xffff;
    const index = low + rangeOffset / 2 + (codePoint - startCodes[low]);
    const glyph = index < glyphIdTail.length ? glyphIdTail[index] : 0;
    return glyph === 0 ? 0 : (glyph + idDeltas[low]) & 0xffff;
}

/**
 * Whether bytes start like a single sfnt font (OpenType or TrueType).
 *
 * @param {ArrayBuffer|ArrayBufferView} input Bytes.
 * @returns {boolean} Whether the sfnt version is one this reader takes.
 */
export function isOpenType(input)
{
    const bytes = asUint8Array(input, "OpenType input");
    if (bytes.byteLength < 12) return false;
    const version = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
    return version === SFNT_VERSION_CFF || version === SFNT_VERSION_TRUETYPE || version === SFNT_VERSION_APPLE_TRUETYPE;
}

/**
 * The first Unicode code point the character map gives each glyph: the
 * inverse of lookupGlyphIndex, for drawing a glyph through an API that takes
 * text.
 *
 * @param {CjsOpenTypeFont} font The parsed font.
 * @returns {Map<number, number>} Code point by glyph ID; glyphs the cmap never reaches are absent.
 */
export function glyphCodePoints(font)
{
    const codePoints = new Map();
    const cmap = font.cmap;
    if (!cmap) return codePoints;
    if (cmap.format === 12)
    {
        const groups = cmap.groups;
        for (let i = 0; i < groups.length; i += 3)
        {
            for (let code = groups[i]; code <= groups[i + 1]; code++)
            {
                const glyph = groups[i + 2] + (code - groups[i]);
                if (!codePoints.has(glyph)) codePoints.set(glyph, code);
            }
        }
        return codePoints;
    }
    for (let segment = 0; segment < cmap.endCodes.length; segment++)
    {
        for (let code = cmap.startCodes[segment]; code <= cmap.endCodes[segment] && code < 0xffff; code++)
        {
            const glyph = lookupGlyphIndex(font, code);
            if (glyph !== 0 && !codePoints.has(glyph)) codePoints.set(glyph, code);
        }
    }
    return codePoints;
}

/**
 * Reads the table directory.
 *
 * @param {DataView} view The whole file.
 * @param {string} source Source label used in error messages.
 * @returns {Map<string, CjsSfntTable>} Tables by tag.
 */
function readTableDirectory(view, source)
{
    const count = view.getUint16(4);
    if (12 + count * 16 > view.byteLength) throw new Error(`${source}: table directory is truncated.`);
    const tables = new Map();
    for (let i = 0; i < count; i++)
    {
        const at = 12 + i * 16;
        const tag = String.fromCharCode(view.getUint8(at), view.getUint8(at + 1), view.getUint8(at + 2), view.getUint8(at + 3));
        const offset = view.getUint32(at + 8);
        const length = view.getUint32(at + 12);
        if (offset + length > view.byteLength) throw new Error(`${source}: table '${tag}' runs past the end of the file.`);
        tables.set(tag, { offset, length });
    }
    return tables;
}

/**
 * Chooses and reads the Unicode subtable of a cmap: full-repertoire format 12
 * first, then the BMP format 4, as FreeType's default charmap selection
 * prefers. Returns null when the font has neither.
 *
 * @param {DataView} cmap The cmap table.
 * @param {string} source Source label used in error messages.
 * @returns {CjsOpenTypeCmap|null} The chosen subtable.
 */
function readCmap(cmap, source)
{
    const count = cmap.getUint16(2);
    let best = null;
    let bestRank = 0;
    for (let i = 0; i < count; i++)
    {
        const platformID = cmap.getUint16(4 + i * 8);
        const encodingID = cmap.getUint16(6 + i * 8);
        const offset = cmap.getUint32(8 + i * 8);
        if (offset + 2 > cmap.byteLength) continue;
        const format = cmap.getUint16(offset);
        const unicode = platformID === 0 || (platformID === 3 && (encodingID === 1 || encodingID === 10));
        if (!unicode) continue;
        const rank = format === 12 ? 2 : format === 4 ? 1 : 0;
        if (rank > bestRank)
        {
            best = { platformID, encodingID, offset, format };
            bestRank = rank;
        }
    }
    if (!best) return null;

    const { platformID, encodingID, offset, format } = best;
    if (format === 12)
    {
        const groupCount = cmap.getUint32(offset + 12);
        if (offset + 16 + groupCount * 12 > cmap.byteLength) throw new Error(`${source}: cmap format 12 is truncated.`);
        const groups = new Uint32Array(groupCount * 3); // alloc: read output, sized by the font
        for (let i = 0; i < groupCount * 3; i++) groups[i] = cmap.getUint32(offset + 16 + i * 4);
        return { format, platformID, encodingID, groups };
    }

    const length = cmap.getUint16(offset + 2);
    const segCount = cmap.getUint16(offset + 6) / 2;
    const end = Math.min(offset + length, cmap.byteLength);
    const endAt = offset + 14;
    const startAt = endAt + segCount * 2 + 2;
    const deltaAt = startAt + segCount * 2;
    const rangeAt = deltaAt + segCount * 2;
    if (rangeAt + segCount * 2 > end) throw new Error(`${source}: cmap format 4 is truncated.`);
    const endCodes = new Uint16Array(segCount); // alloc: read output, sized by the font
    const startCodes = new Uint16Array(segCount); // alloc: read output, sized by the font
    const idDeltas = new Int16Array(segCount); // alloc: read output, sized by the font
    for (let i = 0; i < segCount; i++)
    {
        endCodes[i] = cmap.getUint16(endAt + i * 2);
        startCodes[i] = cmap.getUint16(startAt + i * 2);
        idDeltas[i] = cmap.getInt16(deltaAt + i * 2);
    }
    const glyphIdTail = new Uint16Array((end - rangeAt) >> 1); // alloc: read output, sized by the font
    for (let i = 0; i < glyphIdTail.length; i++) glyphIdTail[i] = cmap.getUint16(rangeAt + i * 2);
    return { format, platformID, encodingID, endCodes, startCodes, idDeltas, glyphIdTail };
}
