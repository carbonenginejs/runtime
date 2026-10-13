import { CjsFormat } from "../../format/CjsFormat.js";
import { readOpenType, lookupGlyphIndex } from "./core/readSfnt.js";
import { readCharstring } from "./core/readCharstring.js";

/**
 * Reads OpenType and TrueType font files into plain data: metrics, the Unicode
 * character map, and, for fonts with CFF outlines, each glyph's outline and
 * stem hints.
 *
 * Ours: Carbon reads fonts only through FreeType (`Tr2FontManager`), which is
 * not part of the Carbon source and cannot run in the browser without WASM.
 * This reader exists so the browser font manager can hint CFF glyphs itself;
 * see the extensions register. Written from Adobe Technical Notes #5176 (CFF)
 * and #5177 (Type 2 charstrings) and the OpenType specification.
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

    static id = "CjsOpenTypeFormat";

    static extensions = [ ".otf", ".ttf" ];

    static outputs = CjsFormat.defineOutputs({
        payload: { default: true, decoded: true }
    });
}

export default CjsOpenTypeFormat;
