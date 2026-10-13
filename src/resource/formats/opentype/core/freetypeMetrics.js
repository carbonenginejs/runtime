// The size-dependent numbers FreeType gives a client for an sfnt font: size
// metrics, kerning and the bitmap box of a rendered outline. Ported from
// FreeType's base and sfnt modules (ftobjs.c, sfobjs.c, ttkern.c), copyright
// The FreeType Project, under the FreeType License (FTL.TXT in this folder).
// Only the paths Carbon reaches are kept: pixel sizes (FT_Set_Pixel_Sizes),
// FT_KERNING_DEFAULT, and FT_RENDER_MODE_NORMAL.

import { freetypeScales } from "./hintCff.js";

/**
 * FT_MulFix: a * b / 65536, rounded half away from zero.
 *
 * @param {number} a Integer.
 * @param {number} b Integer.
 * @returns {number} The rounded product.
 */
function MulFix(a, b)
{
    const product = a * b;
    return Math.floor((product + 0x8000 - (product < 0 ? 1 : 0)) / 65536);
}

/**
 * FT_MulDiv: a * b / c, rounded half away from zero.
 *
 * @param {number} a Integer.
 * @param {number} b Integer.
 * @param {number} c Non-zero integer.
 * @returns {number} The rounded result.
 */
function MulDiv(a, b, c)
{
    const negative = (a < 0) !== (b < 0) !== (c < 0);
    const uc = Math.abs(c);
    const q = Math.floor((Math.abs(a) * Math.abs(b) + Math.floor(uc / 2)) / uc);
    return negative ? -q : q;
}

const PixFloor = x => Math.floor(x / 64) * 64;
const PixCeil = x => Math.ceil(x / 64) * 64;
const PixRound = x => Math.floor((x + 32) / 64) * 64;

/**
 * FT_Size_Metrics' vertical values for a pixel size, in 26.6: the face's
 * ascender, descender and line height scaled and grid-fitted (ftobjs.c,
 * ft_recompute_scaled_metrics with GRID_FIT_METRICS). The face values come
 * from hhea, or from OS/2 when its USE_TYPO_METRICS bit is set or hhea gives
 * none (sfobjs.c, sfnt_load_face).
 *
 * @param {import("./readSfnt.js").CjsOpenTypeFont} font The parsed font.
 * @param {number} xPpem Pixels per em along x.
 * @param {number} yPpem Pixels per em along y.
 * @returns {{ascender: number, descender: number, height: number}} 26.6 metrics.
 */
export function freetypeSizeMetrics(font, xPpem, yPpem)
{
    const { os2 } = font;
    let ascender = font.ascender;
    let descender = font.descender;
    let height = ascender - descender + font.lineGap;
    if (os2 && (os2.fsSelection & 128))
    {
        ascender = os2.typoAscender;
        descender = os2.typoDescender;
        height = ascender - descender + os2.typoLineGap;
    }
    else if (!ascender && !descender && os2)
    {
        if (os2.typoAscender || os2.typoDescender)
        {
            ascender = os2.typoAscender;
            descender = os2.typoDescender;
            height = ascender - descender + os2.typoLineGap;
        }
        else
        {
            ascender = os2.winAscent;
            descender = -os2.winDescent;
            height = ascender - descender;
        }
    }

    const { yScale26Dot6 } = freetypeScales(xPpem, yPpem, font.unitsPerEm);
    return {
        ascender: PixCeil(MulFix(ascender, yScale26Dot6)),
        descender: PixFloor(MulFix(descender, yScale26Dot6)),
        height: PixRound(MulFix(height, yScale26Dot6))
    };
}

/**
 * FT_Get_Kerning with FT_KERNING_DEFAULT, x only, in 26.6: the 'kern' table
 * value (ttkern.c, tt_face_get_kerning), scaled, reduced below 25 ppem, and
 * rounded to whole pixels (ftobjs.c, FT_Get_Kerning).
 *
 * @param {import("./readSfnt.js").CjsOpenTypeFont} font The parsed font.
 * @param {number} leftGlyph Left glyph ID.
 * @param {number} rightGlyph Right glyph ID.
 * @param {number} xPpem Pixels per em along x of the face's current size.
 * @param {number} yPpem Pixels per em along y of the face's current size.
 * @returns {number} Kerning in 26.6.
 */
export function freetypeKerning(font, leftGlyph, rightGlyph, xPpem, yPpem)
{
    const key = leftGlyph * 65536 + rightGlyph;
    let value = 0;
    for (const subtable of font.kern)
    {
        if (!subtable.pairs.has(key)) continue;
        value = subtable.override ? subtable.pairs.get(key) : value + subtable.pairs.get(key);
    }
    if (value === 0) return 0;

    let x = MulFix(value, freetypeScales(xPpem, yPpem, font.unitsPerEm).xScale26Dot6);
    if (xPpem < 25) x = MulDiv(x, xPpem, 25);
    return PixRound(x);
}

/**
 * The bitmap FT_RENDER_MODE_NORMAL renders an outline into: its control box
 * floored and ceiled to whole pixels (ftobjs.c, ft_glyphslot_preset_bitmap).
 *
 * @param {Array<import("./readCharstring.js").CjsCffPathCommand>} path An outline in pixels, multiples of 1/64.
 * @returns {{left: number, top: number, width: number, height: number}} Bitmap left and top (FreeType's bitmap_left, bitmap_top) and size, in pixels.
 */
export function freetypeBitmapBox(path)
{
    if (path.length === 0) return { left: 0, top: 0, width: 0, height: 0 };
    let xMin = Infinity;
    let yMin = Infinity;
    let xMax = -Infinity;
    let yMax = -Infinity;
    const Add = (x, y) =>
    {
        const x26 = Math.round(x * 64);
        const y26 = Math.round(y * 64);
        if (x26 < xMin) xMin = x26;
        if (x26 > xMax) xMax = x26;
        if (y26 < yMin) yMin = y26;
        if (y26 > yMax) yMax = y26;
    };
    for (const command of path)
    {
        if (command.type === "C")
        {
            Add(command.x1, command.y1);
            Add(command.x2, command.y2);
        }
        Add(command.x, command.y);
    }
    const left = Math.floor(xMin / 64);
    const bottom = Math.floor(yMin / 64);
    const right = Math.floor((xMax + 63) / 64);
    const top = Math.floor((yMax + 63) / 64);
    return { left, top, width: right - left, height: top - bottom };
}
