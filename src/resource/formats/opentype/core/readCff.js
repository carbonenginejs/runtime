// The Compact Font Format table, from Adobe Technical Note #5176 ("The Compact
// Font Format Specification", version 1.0, 2003). Reads the header, the Name,
// Top DICT, String and Global Subr INDEXes, the Top DICT's CharStrings, and
// each Private DICT's hinting values and local Subrs. A name-keyed font has one
// Private DICT; a CID-keyed font (ROS in its Top DICT) has one per Font DICT in
// its FDArray, and FDSelect says which one each glyph uses. Charset and
// Encoding are not read: glyphs are found through the sfnt cmap, not through
// glyph names or CIDs.

// Top DICT operators (TN #5176 table 9). Two-byte operators are 1200 + the
// second byte.
const TOP_CHARSTRINGS = 17;
const TOP_PRIVATE = 18;
const TOP_FONT_MATRIX = 1207;
const TOP_CHARSTRING_TYPE = 1206;
const TOP_ROS = 1230;
const TOP_FD_ARRAY = 1236;
const TOP_FD_SELECT = 1237;

// Private DICT operators (TN #5176 table 23).
const PRIVATE_BLUE_VALUES = 6;
const PRIVATE_OTHER_BLUES = 7;
const PRIVATE_FAMILY_BLUES = 8;
const PRIVATE_FAMILY_OTHER_BLUES = 9;
const PRIVATE_STD_HW = 10;
const PRIVATE_STD_VW = 11;
const PRIVATE_SUBRS = 19;
const PRIVATE_DEFAULT_WIDTH_X = 20;
const PRIVATE_NOMINAL_WIDTH_X = 21;
const PRIVATE_BLUE_SCALE = 1209;
const PRIVATE_BLUE_SHIFT = 1210;
const PRIVATE_BLUE_FUZZ = 1211;
const PRIVATE_STEM_SNAP_H = 1212;
const PRIVATE_STEM_SNAP_V = 1213;
const PRIVATE_FORCE_BOLD = 1214;
const PRIVATE_LANGUAGE_GROUP = 1217;
const PRIVATE_EXPANSION_FACTOR = 1218;

/** Real-number nibbles 0xa-0xe (TN #5176 table 5); 0xd is reserved. */
const REAL_NIBBLES = [ ".", "E", "E-", "", "-" ];

/**
 * The Private DICT values a hinter needs, in font units, with TN #5176's
 * defaults. Delta-encoded arrays are already accumulated into absolute values.
 *
 * @typedef {object} CjsCffPrivate
 * @property {Array<number>} blueValues Alignment zone pairs; the first is the baseline zone.
 * @property {Array<number>} otherBlues Descender zone pairs.
 * @property {Array<number>} familyBlues Family blue values.
 * @property {Array<number>} familyOtherBlues Family other blues.
 * @property {number} blueScale Size, in points per font unit, below which overshoot is suppressed (default 0.039625).
 * @property {number} blueShift Overshoot, in font units, enforced above the BlueScale size (default 7).
 * @property {number} blueFuzz Zone capture tolerance in font units (default 1).
 * @property {number|null} stdHW Dominant horizontal stem width, or null.
 * @property {number|null} stdVW Dominant vertical stem width, or null.
 * @property {Array<number>} stemSnapH Horizontal stem widths to snap to.
 * @property {Array<number>} stemSnapV Vertical stem widths to snap to.
 * @property {boolean} forceBold Whether to thicken thin stems.
 * @property {number} languageGroup 0 for Latin-style, 1 for ideographic.
 * @property {number} expansionFactor Counter expansion allowed for ideographs (default 0.06).
 * @property {number} defaultWidthX Width of a glyph whose charstring gives none.
 * @property {number} nominalWidthX Base added to a charstring's width operand.
 */

/**
 * One Private DICT with its local subroutines.
 *
 * @typedef {object} CjsCffFontDict
 * @property {CjsCffPrivate} private Hinting and width values.
 * @property {Array<Uint8Array>} localSubrs Local subroutines.
 */

/**
 * A CFF font.
 *
 * @typedef {object} CjsCffFont
 * @property {string} name The font's PostScript name (Name INDEX).
 * @property {boolean} cidKeyed Whether the font is CID-keyed.
 * @property {Array<number>} fontMatrix Font matrix (default 0.001 0 0 0.001 0 0).
 * @property {Array<Uint8Array>} charStrings Type 2 charstring per glyph ID.
 * @property {Array<Uint8Array>} globalSubrs Global subroutines.
 * @property {Array<CjsCffFontDict>} fontDicts One entry for a name-keyed font; the FDArray for a CID-keyed font.
 * @property {Uint8Array|null} fdSelect Font DICT index per glyph ID for a CID-keyed font, or null.
 */

/**
 * Reads a CFF table.
 *
 * @param {Uint8Array} bytes The 'CFF ' table.
 * @param {string} source Source label used in error messages.
 * @returns {CjsCffFont} The parsed font.
 * @throws {Error} For a CFF version other than 1, a charstring type other than 2, or truncated data.
 */
export function readCff(bytes, source)
{
    if (bytes.byteLength < 4 || bytes[0] !== 1) throw new Error(`${source}: CFF major version ${bytes[0]} is not supported.`);

    // 1. Header, then four INDEXes back to back.
    const names = readIndex(bytes, bytes[2], source);
    const topDicts = readIndex(bytes, names.end, source);
    const strings = readIndex(bytes, topDicts.end, source);
    const globalSubrs = readIndex(bytes, strings.end, source);
    if (topDicts.items.length !== 1) throw new Error(`${source}: CFF FontSets of ${topDicts.items.length} fonts are not supported.`);

    // 2. Top DICT.
    const top = readDict(topDicts.items[0], source);
    const charstringType = top.has(TOP_CHARSTRING_TYPE) ? top.get(TOP_CHARSTRING_TYPE)[0] : 2;
    if (charstringType !== 2) throw new Error(`${source}: charstring type ${charstringType} is not supported.`);
    if (!top.has(TOP_CHARSTRINGS)) throw new Error(`${source}: CFF Top DICT has no CharStrings.`);
    const charStrings = readIndex(bytes, top.get(TOP_CHARSTRINGS)[0], source).items;
    const fontMatrix = top.has(TOP_FONT_MATRIX) ? top.get(TOP_FONT_MATRIX) : [ 0.001, 0, 0, 0.001, 0, 0 ];

    // 3. Private DICTs: the Top DICT's own, or one per FDArray Font DICT.
    const cidKeyed = top.has(TOP_ROS);
    let fontDicts;
    let fdSelect = null;
    if (cidKeyed)
    {
        if (!top.has(TOP_FD_ARRAY) || !top.has(TOP_FD_SELECT)) throw new Error(`${source}: CID-keyed CFF without FDArray and FDSelect.`);
        fontDicts = readIndex(bytes, top.get(TOP_FD_ARRAY)[0], source).items
            .map(item => readFontDict(bytes, readDict(item, source), source));
        fdSelect = readFdSelect(bytes, top.get(TOP_FD_SELECT)[0], charStrings.length, fontDicts.length, source);
    }
    else
    {
        fontDicts = [ readFontDict(bytes, top, source) ];
    }

    return {
        name: names.items.length ? String.fromCharCode(...names.items[0]) : "",
        cidKeyed,
        fontMatrix,
        charStrings,
        globalSubrs: globalSubrs.items,
        fontDicts,
        fdSelect
    };
}

/**
 * Reads the Private DICT a Top or Font DICT points to, and its local Subrs,
 * whose offset is relative to the Private DICT.
 *
 * @param {Uint8Array} bytes The CFF table.
 * @param {Map<number, Array<number>>} dict The Top DICT or a Font DICT.
 * @param {string} source Source label used in error messages.
 * @returns {CjsCffFontDict} The Private DICT values and local Subrs.
 */
function readFontDict(bytes, dict, source)
{
    let privateDict = new Map();
    let localSubrs = [];
    if (dict.has(TOP_PRIVATE))
    {
        const [ size, offset ] = dict.get(TOP_PRIVATE);
        if (offset + size > bytes.byteLength) throw new Error(`${source}: CFF Private DICT runs past the table.`);
        privateDict = readDict(bytes.subarray(offset, offset + size), source);
        if (privateDict.has(PRIVATE_SUBRS)) localSubrs = readIndex(bytes, offset + privateDict.get(PRIVATE_SUBRS)[0], source).items;
    }

    const Value = (key, fallback) => privateDict.has(key) ? privateDict.get(key)[0] : fallback;
    const Delta = key => privateDict.has(key) ? accumulate(privateDict.get(key)) : [];

    return {
        localSubrs,
        private: {
            blueValues: Delta(PRIVATE_BLUE_VALUES),
            otherBlues: Delta(PRIVATE_OTHER_BLUES),
            familyBlues: Delta(PRIVATE_FAMILY_BLUES),
            familyOtherBlues: Delta(PRIVATE_FAMILY_OTHER_BLUES),
            blueScale: Value(PRIVATE_BLUE_SCALE, 0.039625),
            blueShift: Value(PRIVATE_BLUE_SHIFT, 7),
            blueFuzz: Value(PRIVATE_BLUE_FUZZ, 1),
            stdHW: Value(PRIVATE_STD_HW, null),
            stdVW: Value(PRIVATE_STD_VW, null),
            stemSnapH: Delta(PRIVATE_STEM_SNAP_H),
            stemSnapV: Delta(PRIVATE_STEM_SNAP_V),
            forceBold: Value(PRIVATE_FORCE_BOLD, 0) !== 0,
            languageGroup: Value(PRIVATE_LANGUAGE_GROUP, 0),
            expansionFactor: Value(PRIVATE_EXPANSION_FACTOR, 0.06),
            defaultWidthX: Value(PRIVATE_DEFAULT_WIDTH_X, 0),
            nominalWidthX: Value(PRIVATE_NOMINAL_WIDTH_X, 0)
        }
    };
}

/**
 * Reads FDSelect (TN #5176 section 19), formats 0 and 3.
 *
 * @param {Uint8Array} bytes The CFF table.
 * @param {number} at Offset of FDSelect.
 * @param {number} glyphCount Number of glyphs.
 * @param {number} fdCount Number of Font DICTs.
 * @param {string} source Source label used in error messages.
 * @returns {Uint8Array} Font DICT index per glyph ID.
 */
function readFdSelect(bytes, at, glyphCount, fdCount, source)
{
    const select = new Uint8Array(glyphCount); // alloc: read output, sized by the font
    const format = bytes[at];
    if (format === 0)
    {
        if (at + 1 + glyphCount > bytes.byteLength) throw new Error(`${source}: FDSelect format 0 is truncated.`);
        select.set(bytes.subarray(at + 1, at + 1 + glyphCount));
    }
    else if (format === 3)
    {
        const rangeCount = (bytes[at + 1] << 8) | bytes[at + 2];
        if (at + 5 + rangeCount * 3 > bytes.byteLength) throw new Error(`${source}: FDSelect format 3 is truncated.`);
        for (let r = 0; r < rangeCount; r++)
        {
            const range = at + 3 + r * 3;
            const first = (bytes[range] << 8) | bytes[range + 1];
            const next = (bytes[range + 3] << 8) | bytes[range + 4];
            select.fill(bytes[range + 2], first, Math.min(next, glyphCount));
        }
    }
    else
    {
        throw new Error(`${source}: FDSelect format ${format} is not supported.`);
    }
    for (let glyph = 0; glyph < glyphCount; glyph++)
    {
        if (select[glyph] >= fdCount) throw new Error(`${source}: FDSelect names Font DICT ${select[glyph]} of ${fdCount} for glyph ${glyph}.`);
    }
    return select;
}

/**
 * Reads a CFF INDEX (TN #5176 section 5): a count, an offset size, count + 1
 * offsets counted from 1, then the data.
 *
 * @param {Uint8Array} bytes The CFF table.
 * @param {number} at Offset of the INDEX.
 * @param {string} source Source label used in error messages.
 * @returns {{items: Array<Uint8Array>, end: number}} The items as views, and the offset after the INDEX.
 */
export function readIndex(bytes, at, source)
{
    if (at + 2 > bytes.byteLength) throw new Error(`${source}: CFF INDEX at ${at} is truncated.`);
    const count = (bytes[at] << 8) | bytes[at + 1];
    if (count === 0) return { items: [], end: at + 2 };

    const offSize = bytes[at + 2];
    if (offSize < 1 || offSize > 4) throw new Error(`${source}: CFF INDEX at ${at} has offset size ${offSize}.`);
    const offsetsAt = at + 3;
    const dataAt = offsetsAt + (count + 1) * offSize - 1;
    const Offset = i =>
    {
        let value = 0;
        for (let k = 0; k < offSize; k++) value = value * 256 + bytes[offsetsAt + i * offSize + k];
        return value;
    };

    const items = new Array(count);
    let start = Offset(0);
    for (let i = 0; i < count; i++)
    {
        const end = Offset(i + 1);
        if (end < start || dataAt + end > bytes.byteLength) throw new Error(`${source}: CFF INDEX at ${at} has a bad offset for item ${i}.`);
        items[i] = bytes.subarray(dataAt + start, dataAt + end);
        start = end;
    }
    return { items, end: dataAt + start };
}

/**
 * Reads a CFF DICT (TN #5176 section 4): operands, then the operator that
 * takes them.
 *
 * @param {Uint8Array} data The DICT bytes.
 * @param {string} source Source label used in error messages.
 * @returns {Map<number, Array<number>>} Operands by operator; two-byte operators are 1200 + the second byte.
 */
export function readDict(data, source)
{
    const dict = new Map();
    let operands = [];
    let i = 0;
    while (i < data.length)
    {
        const b0 = data[i];
        if (b0 <= 21)
        {
            let operator = b0;
            i++;
            if (b0 === 12)
            {
                operator = 1200 + data[i];
                i++;
            }
            dict.set(operator, operands);
            operands = [];
        }
        else if (b0 === 28)
        {
            operands.push(((data[i + 1] << 8) | data[i + 2]) << 16 >> 16);
            i += 3;
        }
        else if (b0 === 29)
        {
            operands.push((data[i + 1] << 24) | (data[i + 2] << 16) | (data[i + 3] << 8) | data[i + 4]);
            i += 5;
        }
        else if (b0 === 30)
        {
            const real = readReal(data, i + 1);
            operands.push(real.value);
            i = real.end;
        }
        else if (b0 >= 32 && b0 <= 246)
        {
            operands.push(b0 - 139);
            i++;
        }
        else if (b0 >= 247 && b0 <= 250)
        {
            operands.push((b0 - 247) * 256 + data[i + 1] + 108);
            i += 2;
        }
        else if (b0 >= 251 && b0 <= 254)
        {
            operands.push(-(b0 - 251) * 256 - data[i + 1] - 108);
            i += 2;
        }
        else
        {
            throw new Error(`${source}: CFF DICT has reserved byte ${b0} at ${i}.`);
        }
    }
    return dict;
}

/**
 * Reads a DICT real number: nibbles of digits and markers, ended by 0xf.
 *
 * @param {Uint8Array} data The DICT bytes.
 * @param {number} at Offset of the first nibble byte.
 * @returns {{value: number, end: number}} The number, and the offset after it.
 */
function readReal(data, at)
{
    let text = "";
    let i = at;
    while (i < data.length)
    {
        const byte = data[i++];
        const high = byte >> 4;
        const low = byte & 15;
        if (high === 15) break;
        text += high <= 9 ? high : REAL_NIBBLES[high - 10];
        if (low === 15) break;
        text += low <= 9 ? low : REAL_NIBBLES[low - 10];
    }
    return { value: Number(text), end: i };
}

/**
 * Turns a delta-encoded DICT array into absolute values.
 *
 * @param {Array<number>} deltas Each value relative to the one before.
 * @returns {Array<number>} Absolute values.
 */
function accumulate(deltas)
{
    const values = new Array(deltas.length);
    let sum = 0;
    for (let i = 0; i < deltas.length; i++)
    {
        sum += deltas[i];
        values[i] = sum;
    }
    return values;
}
