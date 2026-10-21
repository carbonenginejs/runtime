import { CjsSchema } from "#schema/CjsSchema";

import { CjsFormat } from "../../format/CjsFormat.js";
import { readOpenType, lookupGlyphIndex, isOpenType, glyphCodePoints } from "./core/readSfnt.js";
import { readCharstring } from "./core/readCharstring.js";
import { hintCffGlyph, freetypeScales } from "./core/hintCff.js";
import { freetypeSizeMetrics, freetypeKerning, freetypeBitmapBox } from "./core/freetypeMetrics.js";

/**
 * Reads OpenType and TrueType font files into plain data: metrics, the Unicode
 * character map, and, for fonts with CFF outlines, each glyph's outline and
 * stem hints.
 *
 * Ours: Carbon reads fonts only through FreeType (`Tr2FontManager`), which is
 * not part of the Carbon source and cannot run in the browser without WASM.
 * This reader exists so the browser font manager can hint CFF glyphs itself;
 * see the extensions register. The reader is written from Adobe Technical
 * Notes #5176 (CFF) and #5177 (Type 2 charstrings) and the OpenType
 * specification; the hinter is ported from FreeType's Adobe CFF engine, under
 * the FreeType License (FTL.TXT).
 */
export class CjsOpenTypeFormat extends CjsFormat
{
    /** Registered name; `constructor.name` does not survive minification. */
    static className = "CjsOpenTypeFormat";

    /**
     * Reads bytes using this instance's defaults and per-call overrides.
     *
     * @param {ArrayBuffer|ArrayBufferView} input Font file bytes.
     * @param {object} [options={}] Read options, over the instance options.
     * @returns {import("./core/readSfnt.js").CjsOpenTypeFont} The parsed font.
     */
    Read(input, options = {})
    {
        return this.constructor.read(input, { ...this.options, ...options });
    }

    /**
     * Inspects the font with this instance's options.
     *
     * @param {ArrayBuffer|ArrayBufferView} input Font file bytes.
     * @param {object} [options={}] Read options, over the instance options.
     * @returns {object} Summary of the font.
     */
    Inspect(input, options = {})
    {
        return this.constructor.inspect(input, { ...this.options, ...options });
    }

    /**
     * Reads a font file. Glyph outlines are not run here; read each glyph on
     * demand with `readGlyph`.
     *
     * @param {ArrayBuffer|ArrayBufferView} input Font file bytes.
     * @param {object} [options={}] Read options.
     * @param {string} [options.source] Source label used in error messages.
     * @returns {import("./core/readSfnt.js").CjsOpenTypeFont} The parsed font.
     */
    static read(input, options = {})
    {
        return readOpenType(input, options);
    }

    /**
     * Summarises a font file.
     *
     * @param {ArrayBuffer|ArrayBufferView} input Font file bytes.
     * @param {object} [options={}] Read options.
     * @param {string} [options.source] Source label used in error messages.
     * @returns {{outlineFormat: string, name: string|null, unitsPerEm: number, numGlyphs: number, ascender: number, descender: number, lineGap: number, cmapFormat: number|null}} The summary.
     */
    static inspect(input, options = {})
    {
        const font = readOpenType(input, options);
        return {
            outlineFormat: font.outlineFormat,
            name: font.cff ? font.cff.name : null,
            unitsPerEm: font.unitsPerEm,
            numGlyphs: font.numGlyphs,
            ascender: font.ascender,
            descender: font.descender,
            lineGap: font.lineGap,
            cmapFormat: font.cmap ? font.cmap.format : null
        };
    }

    /**
     * Whether bytes are a single sfnt font this format reads.
     *
     * @param {string} _filename Unused; the bytes decide.
     * @param {ArrayBuffer|ArrayBufferView} input Bytes.
     * @returns {boolean} Whether the bytes start with an OpenType or TrueType sfnt version.
     */
    static is(_filename, input)
    {
        return isOpenType(input);
    }

    /**
     * Looks a Unicode code point up in a parsed font.
     *
     * @param {import("./core/readSfnt.js").CjsOpenTypeFont} font The parsed font.
     * @param {number} codePoint Unicode code point.
     * @returns {number} The glyph ID, or 0 when the font has no glyph for it.
     */
    static lookupGlyphIndex(font, codePoint)
    {
        return lookupGlyphIndex(font, codePoint);
    }

    /**
     * Runs one glyph's CFF charstring.
     *
     * @param {import("./core/readSfnt.js").CjsOpenTypeFont} font A parsed font with CFF outlines.
     * @param {number} glyphId Glyph ID.
     * @param {string} [source] Source label used in error messages.
     * @returns {import("./core/readCharstring.js").CjsCffGlyph} The glyph's outline, advance and stems.
     * @throws {TypeError} When the font has no CFF outlines.
     */
    static readGlyph(font, glyphId, source)
    {
        if (!font.cff) throw new TypeError(`${source || "OpenType font"}: ${font.outlineFormat} outlines are not read.`);
        return readCharstring(font.cff, glyphId, source);
    }

    /**
     * Hints a CFF glyph at a pixel size as FreeType's Adobe engine does with
     * FT_LOAD_DEFAULT: y snapped by the font's hints, x scaled, advance
     * rounded. Ported from FreeType; see core/hintCff.js.
     *
     * @param {import("./core/readSfnt.js").CjsOpenTypeFont} font A parsed font with CFF outlines.
     * @param {import("./core/readCharstring.js").CjsCffGlyph} glyph The glyph from readGlyph.
     * @param {number} xPpem Pixels per em along x (FT_Set_Pixel_Sizes width).
     * @param {number} yPpem Pixels per em along y (FT_Set_Pixel_Sizes height).
     * @param {Map<number, object>} [bluesCache] Blue zones by font DICT, reused across glyphs at this size.
     * @returns {import("./core/hintCff.js").CjsHintedGlyph} The outline in pixels, y up, and the advance.
     * @throws {TypeError} When the font has no CFF outlines.
     */
    static hintGlyph(font, glyph, xPpem, yPpem, bluesCache)
    {
        if (!font.cff) throw new TypeError(`OpenType font: ${font.outlineFormat} outlines are not hinted.`);
        return hintCffGlyph(font.cff, glyph, freetypeScales(xPpem, yPpem, font.unitsPerEm), bluesCache);
    }

    /**
     * The first code point the character map gives each glyph.
     *
     * @param {import("./core/readSfnt.js").CjsOpenTypeFont} font The parsed font.
     * @returns {Map<number, number>} Code point by glyph ID.
     */
    static glyphCodePoints(font)
    {
        return glyphCodePoints(font);
    }

    /**
     * FreeType's size metrics at a pixel size (FT_Size_Metrics), in 26.6.
     *
     * @param {import("./core/readSfnt.js").CjsOpenTypeFont} font The parsed font.
     * @param {number} xPpem Pixels per em along x.
     * @param {number} yPpem Pixels per em along y.
     * @returns {{ascender: number, descender: number, height: number}} 26.6 metrics.
     */
    static sizeMetrics(font, xPpem, yPpem)
    {
        return freetypeSizeMetrics(font, xPpem, yPpem);
    }

    /**
     * FreeType's FT_Get_Kerning (FT_KERNING_DEFAULT) x value, in 26.6.
     *
     * @param {import("./core/readSfnt.js").CjsOpenTypeFont} font The parsed font.
     * @param {number} leftGlyph Left glyph ID.
     * @param {number} rightGlyph Right glyph ID.
     * @param {number} xPpem Pixels per em along x.
     * @param {number} yPpem Pixels per em along y.
     * @returns {number} Kerning in 26.6.
     */
    static kerning(font, leftGlyph, rightGlyph, xPpem, yPpem)
    {
        return freetypeKerning(font, leftGlyph, rightGlyph, xPpem, yPpem);
    }

    /**
     * The bitmap FreeType renders a hinted outline into.
     *
     * @param {Array<import("./core/readCharstring.js").CjsCffPathCommand>} path Outline in pixels, from hintGlyph.
     * @returns {{left: number, top: number, width: number, height: number}} Bitmap placement and size in pixels.
     */
    static bitmapBox(path)
    {
        return freetypeBitmapBox(path);
    }

    static id = "CjsOpenTypeFormat";

    static extensions = [ ".otf", ".ttf" ];

    static outputs = CjsFormat.defineOutputs({
        payload: { default: true, decoded: true }
    });
}

export default CjsOpenTypeFormat;

CjsSchema.meta.define("CjsOpenTypeFormat")(CjsOpenTypeFormat);
