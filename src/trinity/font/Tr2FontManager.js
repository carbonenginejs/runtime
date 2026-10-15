// Source: trinity/trinity/Font/Tr2FontManager.h
// Source: trinity/trinity/Font/Tr2FontManager.cpp
// Source: trinity/trinity/Font/Tr2FontManager_Blue.cpp
// Maintained browser-font adapter; native interfaces retain their Carbon names.
//
// BLUE NAMES THAT POINT AT OTHER C++ METHODS. Carbon's exposure maps three
// Blue names onto C++ methods with different names (Tr2FontManager_Blue.cpp:88-131;
// Blue "LookupSBit" is LookupSBit itself):
//
//     Blue "LookupGlyphIndex"  -> LookupFaceIDAndGlyphIndex
//     Blue "LookupKerningXP"   -> PyLookupKerningXP
//     Blue "LookupMetrics"     -> LookupMetricsFromScript
//
// A JS class holds one member per name, and engine code calls the C++ methods
// by their C++ names, so the C++ names own the members here. The schema has no
// way to record a Blue name that differs from the member it dispatches to, so
// none of the three is declared with `blue.method`; each method's JSDoc
// names its Blue spelling instead. LookupGlyphIndex refuses a font name, so a
// caller using the Blue spelling gets an error rather than a wrong answer.
//
// WHICH FACES WORK. A Carbon face works once FreeType has loaded its file
// (LookupFace, cpp:183-194); one that never loads fails every lookup, which
// is what lets the measurer fall back to TR2_FONT_FALLBACK. Here a face works
// once LoadFont has registered its family in this realm.
//
// GLYPHS. A face LoadFont was given font file bytes for is also parsed with
// CjsOpenTypeFormat, as FreeType keeps its face: glyph indices, size metrics
// and kerning are then FreeType's, and a missing character reads as glyph 0,
// so the measurer's per-character fallback runs as Carbon's does. CFF glyphs
// are hinted as FreeType's default CFF engine hints them and filled as
// outlines; TrueType glyphs are still drawn by Canvas2D from their character.
// A face given a CSS source has no font data, and the character code stands
// in for its glyph index.
//
// BROWSER TEXT GAMMA. Carbon's FreeType coverage is linear, and Sprite2D's
// ubershader corrects it (FONT_GAMMACORRECT, on by default:
// Sprite2d/Tr2Sprite2dScene.cpp:122, 2648-2652). Filled CFF outlines are
// linear coverage too. Text Canvas2D draws (TrueType and CSS faces) already
// carries the browser's text gamma, so a scene that keeps Carbon's default
// corrects it twice and it reads as bold. See LookupSBit.
import { Tr2SBitWrapper } from "./Tr2SBitWrapper.js";
import { CjsOpenTypeFormat } from "#resource/formats/opentype";
import { g_textureAtlasMan } from "../core/Tr2TextureAtlasMan.js";
import { Tr2Renderer } from "../core/Tr2Renderer.js";
import { PixelFormat } from "#consts/render-context";
import { TriStorageFlags } from "#consts/graphics";
import { be, IBlueEvents } from "#blue";
import { meta, type, blue } from "#schema";

/**
 * Carbon's `TR2_FONT_FALLBACK` (Tr2FontManager.h:23, value at
 * Tr2FontManager_Blue.cpp:9): the font used when none is named and for
 * characters the named font lacks.
 *
 * @type {string}
 */
export const TR2_FONT_FALLBACK = "res:/ui/fonts/arialuni.ttf";

/** Carbon's `s_cookie` for the font manager's tick registration (Tr2FontManager.cpp:59). */
const s_cookie = "fontMan";

/** Carbon's `INT_MAX`, returned by LookupKerningXP when FreeType reports an error (Tr2FontManager.cpp:255). */
const INT_MAX = 0x7fffffff;

/**
 * One CPU glyph-cache record: Carbon's `GlyphCacheEntry` (Tr2FontManager.h:148-153)
 * with the browser sbit in place of the idle atlas texture.
 *
 * @typedef {object} GlyphCacheEntry
 * @property {object} sbit The browser-rasterized sbit record.
 * @property {number} lastFrameUsed `Tr2Renderer.GetCurrentFrameCounter()` at the last lookup.
 * @property {number} memoryUsage Bytes held by the sbit's coverage buffer.
 */

/** Tracks font-loading policy together with the glyph-cache memory budget and occupancy. */
@blue.define({ className: "Tr2FontManager", purpose: "Tracks font-loading policy together with the glyph-cache memory budget and occupancy." })
@blue.inherit(IBlueEvents)
export class Tr2FontManager
{

  /**
   * m_glyphCacheBudget (size_t) [READWRITE], default 512 KiB (Tr2FontManager.cpp:101).
   * Browser meaning: the byte budget of the CPU sbit cache (see TrimGlyphCache).
   */
  @blue.readwrite
  @type.uint64
  @meta.adapted
  glyphCacheBudget = 524288;

  /**
   * m_loadflag (int) [READWRITE]. The value is stored and has no effect:
   * CFF glyphs are always hinted as with Carbon's default, FT_LOAD_DEFAULT,
   * and Canvas2D has no equivalent of the other flags.
   */
  @blue.readwrite
  @type.int32
  @meta.adapted
  loadFlag = 0;

  /**
   * m_totalGlyphsCachedSize (size_t) [READ].
   * Browser meaning: bytes held by the CPU sbit cache (see TrimGlyphCache).
   */
  @blue.read
  @type.uint64
  @meta.adapted
  totalGlyphsCachedSize = 0;

  /**
   * Carbon `Initialize` (Tr2FontManager.cpp:65-70): creates the singleton and
   * registers it for Blue ticks, so OnTick trims the glyph cache every frame.
   * Browser resources (the Canvas2D context) are acquired lazily.
   *
   * @returns {void}
   */
  @meta.implemented
  static initialize()
  {
    g_fontManager = new Tr2FontManager();

    be.os.RegisterForTicks(g_fontManager, s_cookie);
  }

  /**
   * Carbon `Shutdown` (Tr2FontManager.cpp:76-84): unregisters the tick and
   * drops the singleton.
   *
   * Adapted: Carbon's destructor tears down FreeType (`FTC_Manager_Done`,
   * cpp:133-137); here clearing the CPU sbit cache stands in for it, because
   * JS has no destructor and the browser owns the font engine.
   *
   * @returns {void}
   */
  @meta.adapted
  static shutdown()
  {
    if (g_fontManager)
    {
      be.os.UnregisterForTicks(g_fontManager, s_cookie);
      g_fontManager.ClearCachedGlyphs();
    }

    g_fontManager = null;
  }

  /** m_faceMap: font name to face ID. @type {Map<string, number>} */
  _faceMap = new Map();

  /**
   * The families LoadFont has registered in this realm: the faces that work,
   * as a FreeType face works once its file has loaded (see the top of this file).
   *
   * @type {Set<string>}
   */
  _loadedFamilies = new Set();

  /**
   * m_reverseFaceMap: face ID to font name. Carbon puts a "dummy" entry first
   * so 0 is never a valid face ID (Tr2FontManager.cpp:129-130); "dummy" is not
   * entered in the forward map, so it never resolves to a font.
   *
   * @type {string[]}
   */
  _reverseFaceMap = [ "dummy" ];

  /**
   * The CPU sbit cache, keyed by face, size and glyph, in insertion order.
   * Browser substitute for FreeType's `FTC_SBitCache`; see TrimGlyphCache.
   *
   * @type {Map<string, GlyphCacheEntry>}
   */
  _glyphs = new Map();

  /** Browser CPU canvas used for rasterization. @type {OffscreenCanvas|HTMLCanvasElement|null} */
  _canvas = null;

  /** 2D context of `_canvas`. @type {CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D|null} */
  _context = null;

  /**
   * The parsed font file per family, for families LoadFont was given bytes:
   * the browser's stand-in for FreeType's face.
   *
   * @type {Map<string, import("#resource/formats/opentype").CjsOpenTypeFont>}
   */
  _fonts = new Map();

  /**
   * Code point by glyph ID per TrueType family, built on first use: Canvas2D
   * draws a glyph only from its character.
   *
   * @type {Map<string, Map<number, number>>}
   */
  _codePoints = new Map();

  /**
   * Blue zones per family and pixel size, kept for the CFF hinter as the
   * engine keeps them per size.
   *
   * @type {Map<string, Map<number, object>>}
   */
  _blues = new Map();

  /**
   * The pixel size each face was last looked up at. FreeType's face keeps its
   * current size between calls; LookupKerningXP reads it the same way.
   *
   * @type {Map<number, {xPpem: number, yPpem: number}>}
   */
  _sizes = new Map();

  /**
   * Carbon `GetFaceID` (Tr2FontManager.cpp:152-171): a stable ID per font name,
   * starting at 1 because of the reserved "dummy" entry.
   *
   * Adapted: face IDs refer to browser font families rather than FreeType faces.
   *
   * @param {string} font Font name: a res path or a CSS family.
   * @returns {number} The face ID.
   */
  @meta.adapted
  GetFaceID(font)
  {
    if (this._faceMap.has(font)) return this._faceMap.get(font);

    const id = this._reverseFaceMap.length;
    this._reverseFaceMap.push(font);
    this._faceMap.set(font, id);
    return id;
  }

  /**
   * Loads font bytes or a FontFace source and registers it in this browser/worker.
   * JS extension: native synchronous ResFile/FreeType loading has no browser equivalent.
   * OpenType and TrueType bytes are also parsed and kept for the family, as
   * FreeType keeps its face (see the top of this file).
   *
   * @param {string} family Family name to register; a res path such as TR2_FONT_FALLBACK works.
   * @param {ArrayBuffer|ArrayBufferView|string} source FontFace source.
   * @returns {Promise<number>} The face ID of the family.
   */
  async LoadFont(family, source)
  {
    const fonts = globalThis.document?.fonts ?? globalThis.fonts;
    if (!fonts || !globalThis.FontFace) throw new Error("Browser FontFace loading is unavailable.");

    const parsed = typeof source !== "string" && CjsOpenTypeFormat.is(family, source) ? CjsOpenTypeFormat.read(source, { source: family }) : null;
    const face = new FontFace(family, source);
    await face.load();
    fonts.add(face);
    this._loadedFamilies.add(family);
    if (parsed) this._fonts.set(family, parsed);
    else this._fonts.delete(family);
    this._codePoints.delete(family);
    this._blues.delete(family);
    this.ClearCachedGlyphs();
    // A reload keeps the family's face ID, and glyph textures are keyed by it:
    // drop the textures drawn from the old source, or they stand in for new glyphs.
    const faceID = this.GetFaceID(family);
    for (const key of this._sbitToTextureMap.keys()) if (key.startsWith(`${faceID}:`)) this._sbitToTextureMap.delete(key);
    return faceID;
  }

  /**
   * The parsed font of a working face, or null when its family was loaded
   * from a CSS source.
   *
   * @param {number} faceID Face ID.
   * @returns {import("#resource/formats/opentype").CjsOpenTypeFont|null} The font.
   */
  _GetParsedFont(faceID)
  {
    return this._IsValidFace(faceID) ? this._fonts.get(this._reverseFaceMap[faceID]) ?? null : null;
  }

  /**
   * Lazily acquires a browser CPU canvas; importing the engine remains headless-safe.
   *
   * @returns {CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D} The context.
   */
  _GetContext()
  {
    if (this._context) return this._context;

    if (globalThis.OffscreenCanvas) this._canvas = new OffscreenCanvas(1, 1);
    else if (globalThis.document) this._canvas = document.createElement("canvas");
    else throw new Error("Browser font rasterization requires Canvas2D or OffscreenCanvas.");

    this._context = this._canvas.getContext("2d", { willReadFrequently: true });
    if (!this._context) throw new Error("Browser font rasterization could not acquire Canvas2D.");
    return this._context;
  }

  /**
   * Whether a face ID names a font that works: registered, and loaded by
   * LoadFont. Face 0 is Carbon's reserved "dummy" entry: FreeType fails to
   * load it, so every lookup through it fails.
   *
   * @param {number} faceID Face ID.
   * @returns {boolean} Whether the face resolves.
   */
  _IsValidFace(faceID)
  {
    return faceID !== 0 && this._reverseFaceMap[faceID] !== undefined && this._loadedFamilies.has(this._reverseFaceMap[faceID]);
  }

  /**
   * Carbon `LookupFace` (Tr2FontManager.cpp:183-194): the face for an ID, or
   * none when its file never loaded.
   *
   * Adapted: there is no FreeType face; the family name stands in for it, and
   * `null` for Carbon's null `FT_Face`.
   *
   * @param {number} faceID Face ID.
   * @returns {string|null} The family, or null.
   */
  @meta.adapted
  LookupFace(faceID)
  {
    return this._IsValidFace(faceID) ? this._reverseFaceMap[faceID] : null;
  }

  /** Carbon `GetLoadFlag` (Tr2FontManager.h:84-87). @returns {number} The load flag. */
  @meta.implemented
  GetLoadFlag()
  {
    return this.loadFlag;
  }

  /**
   * Restores canvas font state after a bitmap resize resets it.
   *
   * The CSS family list is the browser form of Carbon's fallback font: Carbon
   * looks a missing character up again in TR2_FONT_FALLBACK
   * (Tr2FontMeasurer.cpp:287-321), and a CSS family list makes the browser do
   * the same per glyph. A res-path name is quoted so it is a valid CSS family
   * (as registered by LoadFont). The trailing generic `sans-serif` stands in
   * for an installation where the fallback font itself was never loaded,
   * which Carbon logs as an error (Tr2FontMeasurer.cpp:190-197, 296-300).
   *
   * @param {number} faceID Face ID.
   * @param {number} height Pixel size.
   * @returns {CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D} The prepared context.
   */
  _SetFont(faceID, height)
  {
    if (!this._IsValidFace(faceID)) throw new RangeError("Unknown font face ID.");
    if (!(height > 0) || !Number.isFinite(height)) throw new RangeError("Font height must be positive and finite.");

    const family = this._reverseFaceMap[faceID];
    const families = [ family.includes(":") ? `"${family}"` : family ];
    if (family !== TR2_FONT_FALLBACK) families.push(`"${TR2_FONT_FALLBACK}"`);
    families.push("sans-serif");

    const context = this._GetContext();
    context.font = `${height}px ${families.join(", ")}`;
    context.textBaseline = "alphabetic";
    context.textAlign = "left";
    context.direction = "ltr";
    context.fillStyle = "white";
    return context;
  }

  /**
   * Carbon `LookupGlyphIndex` (Tr2FontManager.cpp:271-289): the glyph index
   * of a character in a face, or -1 when the face cannot be used. Not Blue
   * exposed: the Blue name "LookupGlyphIndex" is LookupFaceIDAndGlyphIndex.
   *
   * A parsed face answers from its Unicode cmap, as FreeType does: 0 for a
   * character it lacks, -1 when it has no Unicode charmap.
   *
   * Adapted: a face loaded from a CSS source has no font data, and the
   * browser exposes neither glyph IDs nor missing glyphs, so the code point
   * stands in for the index there. Code point 0 reads as Carbon's "no glyph".
   *
   * @param {number} faceID Face ID.
   * @param {number} charCode Unicode code point.
   * @returns {number} Glyph index, or -1.
   */
  @meta.adapted
  LookupGlyphIndex(faceID, charCode)
  {
    if (!Number.isInteger(faceID))
    {
      throw new TypeError("Tr2FontManager.LookupGlyphIndex takes a face ID; Blue \"LookupGlyphIndex\" (a font name) is LookupFaceIDAndGlyphIndex.");
    }
    if (!this._IsValidFace(faceID)) return -1;

    const font = this._GetParsedFont(faceID);
    if (font) return font.cmap ? CjsOpenTypeFormat.lookupGlyphIndex(font, charCode) : -1;

    return Number.isInteger(charCode) && charCode >= 0 && charCode <= 0x10ffff ? charCode : -1;
  }

  /**
   * Carbon `LookupFaceIDAndGlyphIndex` (Tr2FontManager.cpp:707-731), Blue
   * name "LookupGlyphIndex" (Tr2FontManager_Blue.cpp:88-97): an empty name
   * uses TR2_FONT_FALLBACK, and a glyph index of 0 or less retries the
   * character in TR2_FONT_FALLBACK.
   *
   * Carbon logs "trinity.fontMan.LookupGlyphIndex - no font given, using
   * fallback font" for the empty name; there is no log here.
   *
   * @param {string} faceName Font name, or "" for the fallback font.
   * @param {number} charCode Unicode code point.
   * @returns {[number, number]} The face ID and glyph index that were used.
   */
  @meta.implemented
  LookupFaceIDAndGlyphIndex(faceName, charCode)
  {
    const faceNameUsed = faceName === "" ? TR2_FONT_FALLBACK : faceName;

    let faceID = g_fontManager.GetFaceID(faceNameUsed);
    let glyphIndex = g_fontManager.LookupGlyphIndex(faceID, charCode);

    if (glyphIndex <= 0)
    {
      faceID = g_fontManager.GetFaceID(TR2_FONT_FALLBACK);
      glyphIndex = g_fontManager.LookupGlyphIndex(faceID, charCode);
    }

    return [ faceID, glyphIndex ];
  }

  /**
   * Carbon `LookupMetrics` (Tr2FontManager.cpp:208-221): size metrics in 26.6
   * fixed point; an unusable face returns zeroed metrics, as Carbon's
   * `FT_Size_Metrics()` on error. Not Blue exposed: the Blue name
   * "LookupMetrics" is LookupMetricsFromScript.
   *
   * A parsed face gives FreeType's own ascender, descender and height. The
   * lookup makes the size the face's current one, as FTC_Manager_LookupSize
   * activates it.
   *
   * Adapted: only ascender, descender and height are produced. For a CSS
   * face, browser font-box metrics replace FT_Size_Metrics, and `height` is
   * ascent plus descent (no line gap), where FreeType's is the
   * baseline-to-baseline distance. The height (or width when height is 0)
   * picks the pixel size.
   * A size of 0 or less returns zeroed metrics, as Carbon does when
   * FTC_Manager_LookupSize fails; whether FreeType itself fails there or
   * clamps the size is not verified (FreeType is not part of the Carbon source).
   *
   * @param {number} faceID Face ID.
   * @param {number} width Pixel width.
   * @param {number} height Pixel height.
   * @returns {{ascender: number, descender: number, height: number}} 26.6 metrics.
   */
  @meta.adapted
  LookupMetrics(faceID, width, height)
  {
    const size = height || width;
    if (!this._IsValidFace(faceID) || !(size > 0)) return { ascender: 0, descender: 0, height: 0 };

    const xPpem = width || height;
    this._sizes.set(faceID, { xPpem, yPpem: size });
    const font = this._GetParsedFont(faceID);
    if (font) return CjsOpenTypeFormat.sizeMetrics(font, xPpem, size);

    const context = this._SetFont(faceID, size);
    const metrics = context.measureText("Mg");
    const ascent = metrics.fontBoundingBoxAscent ?? metrics.actualBoundingBoxAscent;
    const descent = metrics.fontBoundingBoxDescent ?? metrics.actualBoundingBoxDescent;
    return { ascender: Math.round(ascent * 64), descender: -Math.round(descent * 64), height: Math.round((ascent + descent) * 64) };
  }

  /**
   * Carbon `LookupMetricsFromScript` (Tr2FontManager.cpp:224-228), Blue name
   * "LookupMetrics": pixel ascender and descender.
   *
   * Adapted: returns a two-element array for Carbon's `std::pair`.
   *
   * @param {number} faceID Face ID.
   * @param {number} width Pixel width.
   * @param {number} height Pixel height.
   * @returns {[number, number]} Ascender and descender in pixels.
   */
  @meta.adapted
  LookupMetricsFromScript(faceID, width, height)
  {
    const metrics = this.LookupMetrics(faceID, width, height);
    return [ metrics.ascender >> 6, metrics.descender >> 6 ];
  }

  /**
   * Carbon `LookupKerningXP` (Tr2FontManager.cpp:242-258): horizontal kerning
   * in pixels for a glyph pair, or INT_MAX when the face cannot be used. Not
   * Blue exposed: Blue "LookupKerningXP" is _PyLookupKerningXP.
   *
   * A parsed face gives FreeType's FT_KERNING_DEFAULT value from its 'kern'
   * table at the face's current size; before any size is set, FreeType's
   * unsized face scales every value to 0.
   *
   * Adapted: for a CSS face, approximated as the difference between the
   * browser-shaped pair advance and the two single advances, at the size last
   * set for this face. Ours: before any size has been set on a CSS face,
   * 12 px is used, because Canvas2D needs a size.
   *
   * @param {number} faceID Face ID.
   * @param {number} leftIndex Left glyph index (a code point for a CSS face).
   * @param {number} rightIndex Right glyph index (a code point for a CSS face).
   * @returns {number} Kerning in pixels.
   */
  @meta.adapted
  LookupKerningXP(faceID, leftIndex, rightIndex)
  {
    if (!this._IsValidFace(faceID)) return INT_MAX;

    const size = this._sizes.get(faceID);
    const font = this._GetParsedFont(faceID);
    if (font) return size ? CjsOpenTypeFormat.kerning(font, leftIndex, rightIndex, size.xPpem, size.yPpem) >> 6 : 0;

    const context = this._SetFont(faceID, size ? size.yPpem : 12);
    const left = String.fromCodePoint(leftIndex), right = String.fromCodePoint(rightIndex);
    return Math.round(context.measureText(left + right).width - context.measureText(left).width - context.measureText(right).width);
  }

  /**
   * Carbon `PyLookupKerningXP` (Tr2FontManager.cpp:700-705), private in
   * Carbon, Blue name "LookupKerningXP" (Tr2FontManager_Blue.cpp:99-108).
   *
   * Carbon quirk CE-128, Tr2FontManager.cpp:700-705: LookupKerningXP already returns
   * `kerning.x >> 6` (cpp:257), and this wrapper shifts by 6 again, so script
   * callers get the 26.6 kerning divided by 4096, which is 0 for any real
   * kerning value (and -1 for small negative ones). Reproduced here on the
   * Blue-exposed method only; LookupKerningXP, the engine path, stays in pixels.
   *
   * @param {number} faceID Face ID.
   * @param {number} charCode1 Left glyph index.
   * @param {number} charCode2 Right glyph index.
   * @returns {number} The doubly shifted kerning.
   */
  @meta.implemented
  _PyLookupKerningXP(faceID, charCode1, charCode2)
  {
    const kerning = g_fontManager.LookupKerningXP(faceID, charCode1, charCode2) | 0;

    return kerning >> 6;
  }

  /**
   * Carbon `LookupSBit` (Tr2FontManager.cpp:301-325), Blue name "LookupSBit":
   * a wrapper around the sbit for a face, size and glyph.
   *
   * A CFF glyph of a parsed face is hinted as FreeType's default CFF engine
   * hints it with Carbon's FT_LOAD_DEFAULT, and its outline filled on the
   * canvas into FreeType's bitmap box; bounds and advance are FreeType's. As
   * FreeType's sbit cache does, a glyph ID outside the face fails, and a
   * glyph too large for the cache's 8-bit fields comes back unavailable:
   * width 255, height 0, no pixels (ftcsbits.c, ftc_snode_load).
   *
   * Adapted: the coverage is the browser's anti-aliased fill, not FreeType's
   * rasterizer. TrueType glyphs and CSS faces are drawn by Canvas2D from their
   * character, so their bounds and advances follow browser metrics, not
   * FreeType hinting; a TrueType glyph no character maps to has no pixels and
   * its hmtx advance. The wrapper is returned, and Carbon's failed
   * `Be::Result` is thrown, as it is for a size of 0 or less. A cache hit
   * refreshes the entry's frame stamp; trimming happens in OnTick.
   *
   * Browser text gamma: text Canvas2D draws already carries the browser's
   * text gamma, where FreeType's coverage is linear. Sprite2D's
   * FONT_GAMMACORRECT (on by default) corrects linear coverage, so such text
   * reads as bold unless the scene sets `gammaCorrectText = false`. Filled
   * CFF outlines are linear. Registered in non-carbon-extensions.md.
   *
   * @param {number} faceID Face ID.
   * @param {number} width Pixel width.
   * @param {number} height Pixel height.
   * @param {number} glyphIndex Glyph index, as LookupGlyphIndex returns it.
   * @returns {Tr2SBitWrapper} The sbit wrapper, at x = y = 0.
   * @throws {RangeError} "FTC_SBitCache_Lookup failed" for an unusable face or glyph.
   */
  @blue.method
  @meta.adapted
  LookupSBit(faceID, width, height, glyphIndex)
  {
    const size = height || width;
    if (!(size > 0) || !this._IsValidFace(faceID)) throw new RangeError("FTC_SBitCache_Lookup failed");

    const font = this._GetParsedFont(faceID);
    const validGlyph = font
      ? Number.isInteger(glyphIndex) && glyphIndex >= 0 && glyphIndex < font.numGlyphs
      : this.LookupGlyphIndex(faceID, glyphIndex) >= 0;
    if (!validGlyph) throw new RangeError("FTC_SBitCache_Lookup failed");

    const xPpem = width || height;
    const key = `${faceID}:${width}:${height}:${glyphIndex}`;
    let entry = this._glyphs.get(key);

    if (entry)
    {
      entry.lastFrameUsed = Tr2Renderer.GetCurrentFrameCounter();
    }
    else
    {
      let sbit;
      if (font && font.cff)
      {
        try
        {
          sbit = this._RasterizeCffGlyph(faceID, font, xPpem, size, glyphIndex, key);
        }
        catch (error)
        {
          if (error instanceof TypeError || error instanceof ReferenceError) throw error;
          // FreeType's sbit cache ignores a glyph-load error and marks the sbit
          // unavailable - width 255, height 0, no pixels, no advance
          // (ftcsbits.c:197-207) - so a charstring this reader cannot run draws
          // nothing instead of failing the text (Tr2FontMeasurer.cpp:818).
          sbit = { width: 255, height: 0, left: 0, top: 0, xadvance: 0, yadvance: 0, pitch: 0, format: 2, max_grays: 255, buffer: new Uint8Array(0), key }; // alloc: empty glyph pixels
        }
      }
      else
      {
        const codePoint = font ? this._GetGlyphCodePoint(faceID, font, glyphIndex) : glyphIndex;
        sbit = codePoint === undefined
          ? { width: 0, height: 0, left: 0, top: 0, xadvance: Math.round(font.advanceWidths[glyphIndex] * xPpem / font.unitsPerEm), yadvance: 0, pitch: 0, format: 2, max_grays: 255, buffer: new Uint8Array(0), key } // alloc: empty glyph pixels
          : this._RasterizeText(faceID, width, height, size, String.fromCodePoint(codePoint), key);
      }

      entry = { sbit, lastFrameUsed: Tr2Renderer.GetCurrentFrameCounter(), memoryUsage: sbit.buffer.byteLength };
      this._glyphs.set(key, entry);
      this.totalGlyphsCachedSize += entry.memoryUsage;
    }
    this._sizes.set(faceID, { xPpem, yPpem: size });

    const result = new Tr2SBitWrapper();
    result.faceId = faceID;
    result.fontSize = size;
    result.sbit = entry.sbit;
    result.x = 0;
    result.y = 0;
    return result;
  }

  /**
   * Hints a CFF glyph and fills its outline into an 8-bit sbit record, placed
   * and sized as FreeType's FT_RENDER_MODE_NORMAL bitmap and checked against
   * the sbit cache's field sizes.
   *
   * @param {number} faceID Face ID.
   * @param {import("#resource/formats/opentype").CjsOpenTypeFont} font The face's parsed font.
   * @param {number} xPpem Pixels per em along x.
   * @param {number} yPpem Pixels per em along y.
   * @param {number} glyphIndex Glyph ID.
   * @param {string} key The glyph's cache key.
   * @returns {object} The sbit record.
   */
  _RasterizeCffGlyph(faceID, font, xPpem, yPpem, glyphIndex, key)
  {
    const family = this._reverseFaceMap[faceID];
    let familyBlues = this._blues.get(family);
    if (!familyBlues) this._blues.set(family, familyBlues = new Map());
    const sizeKey = xPpem * 65536 + yPpem;
    let blues = familyBlues.get(sizeKey);
    if (!blues) familyBlues.set(sizeKey, blues = new Map());

    const glyph = CjsOpenTypeFormat.readGlyph(font, glyphIndex, family);
    const hinted = CjsOpenTypeFormat.hintGlyph(font, glyph, xPpem, yPpem, blues);
    const { left, top, width, height } = CjsOpenTypeFormat.bitmapBox(hinted.path);

    // FreeType's sbit cache keeps 8-bit sizes and placements; a glyph that
    // does not fit is stored as unavailable (ftcsbits.c, ftc_snode_load).
    const Fits = (value, min, max) => value >= min && value <= max;
    if (!Fits(width, 0, 255) || !Fits(height, 0, 255) || !Fits(left, -128, 127) || !Fits(top, -128, 127) || !Fits(hinted.advanceWidth, -128, 127))
    {
      return { width: 255, height: 0, left: 0, top: 0, xadvance: 0, yadvance: 0, pitch: 0, format: 0, max_grays: 0, buffer: new Uint8Array(0), key }; // alloc: empty glyph pixels
    }

    const buffer = new Uint8Array(width * height); // alloc: variable-size glyph pixels retained by the text cache
    if (width && height)
    {
      const context = this._GetContext();
      this._canvas.width = width;
      this._canvas.height = height;
      const path = new Path2D();
      for (const command of hinted.path)
      {
        if (command.type === "M") path.moveTo(command.x - left, top - command.y);
        else if (command.type === "L") path.lineTo(command.x - left, top - command.y);
        else path.bezierCurveTo(command.x1 - left, top - command.y1, command.x2 - left, top - command.y2, command.x - left, top - command.y);
      }
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.fillStyle = "white";
      context.fill(path, "nonzero");
      const rgba = context.getImageData(0, 0, width, height).data;
      for (let i = 0; i < buffer.length; i++) buffer[i] = rgba[i * 4 + 3];
    }

    return { width, height, left, top, xadvance: hinted.advanceWidth, yadvance: 0, pitch: width, format: 2, max_grays: 255, buffer, key };
  }

  /**
   * Draws a character with Canvas2D into an 8-bit sbit record, with browser
   * text metrics for its bounds and advance.
   *
   * @param {number} faceID Face ID.
   * @param {number} width Pixel width (0 for the height).
   * @param {number} height Pixel height (0 for the width).
   * @param {number} size Pixel size: the height, or the width when it is 0.
   * @param {string} text The character.
   * @param {string} key The glyph's cache key.
   * @returns {object} The sbit record.
   */
  _RasterizeText(faceID, width, height, size, text, key)
  {
    let context = this._SetFont(faceID, size);
    const metrics = context.measureText(text);
    const scale = width > 0 && height > 0 ? width / height : 1;
    const left = Math.floor(-metrics.actualBoundingBoxLeft * scale);
    const top = Math.ceil(metrics.actualBoundingBoxAscent);
    const bitmapWidth = Math.max(0, Math.ceil(metrics.actualBoundingBoxRight * scale) - left);
    const bitmapHeight = Math.max(0, top + Math.ceil(metrics.actualBoundingBoxDescent));
    const buffer = new Uint8Array(bitmapWidth * bitmapHeight); // alloc: variable-size glyph pixels retained by the text cache

    if (bitmapWidth && bitmapHeight)
    {
      this._canvas.width = bitmapWidth;
      this._canvas.height = bitmapHeight;
      context = this._SetFont(faceID, size);
      context.setTransform(scale, 0, 0, 1, -left, top);
      context.fillText(text, 0, 0);
      const rgba = context.getImageData(0, 0, bitmapWidth, bitmapHeight).data;
      for (let i = 0; i < buffer.length; i++) buffer[i] = rgba[i * 4 + 3];
    }

    // `key` is ours: it names the glyph so its atlas texture survives the
    // sbit's eviction (see GetAtlasTextureForSbit).
    return { width: bitmapWidth, height: bitmapHeight, left, top, xadvance: Math.round(metrics.width * scale), yadvance: 0, pitch: bitmapWidth, format: 2, max_grays: 255, buffer, key };
  }

  /**
   * The character a TrueType glyph is drawn from: the first code point the
   * face's cmap gives it.
   *
   * @param {number} faceID Face ID.
   * @param {import("#resource/formats/opentype").CjsOpenTypeFont} font The face's parsed font.
   * @param {number} glyphIndex Glyph ID.
   * @returns {number|undefined} The code point, or undefined when no character maps to the glyph.
   */
  _GetGlyphCodePoint(faceID, font, glyphIndex)
  {
    const family = this._reverseFaceMap[faceID];
    let codePoints = this._codePoints.get(family);
    if (!codePoints) this._codePoints.set(family, codePoints = CjsOpenTypeFormat.glyphCodePoints(font));
    return codePoints.get(glyphIndex);
  }

  /**
   * Carbon `ClearCachedGlyphs` (Tr2FontManager.cpp:621-629).
   *
   * Adapted: Carbon releases idle glyph atlas textures; this releases the CPU
   * sbit cache. Existing wrappers keep their bitmaps.
   *
   * @returns {void}
   */
  @blue.method
  @meta.adapted
  ClearCachedGlyphs()
  {
    this._glyphs.clear();
    this.totalGlyphsCachedSize = 0;
  }

  /**
   * Carbon `TrimGlyphCache` (Tr2FontManager.cpp:631-693), algorithm as written:
   * nothing to do while the budget covers the total; a zero budget clears;
   * otherwise entries are sorted by frame age and deleted oldest first until
   * the total falls strictly below the budget.
   *
   * Adapted: Carbon's cache holds idle glyph atlas textures that `WeakRefNotify`
   * resurrects as they die (cpp:560-583). JS cannot observe an object about to
   * be collected, nor resurrect it, so that cache cannot exist. The cached
   * objects here are the CPU sbits instead, and `glyphCacheBudget` and
   * `totalGlyphsCachedSize` measure their coverage bytes. Two differences
   * follow. Carbon's budget covers only idle glyphs and never evicts one in
   * use; this one counts and evicts every cached sbit, because JS cannot tell
   * the two apart. And Carbon counts atlas texture memory, this coverage
   * bytes. An evicted sbit still in use stays with its wrappers, a later
   * lookup rasterizes it again, and the glyph's atlas texture, keyed by glyph
   * rather than by sbit, is reused while it is alive.
   *
   * @param {number} cacheSize Budget in bytes.
   * @returns {void}
   */
  @blue.method
  @meta.adapted
  TrimGlyphCache(cacheSize)
  {
    if (cacheSize >= this.totalGlyphsCachedSize) return;

    if (cacheSize === 0)
    {
      this.ClearCachedGlyphs();
      return;
    }

    const now = Tr2Renderer.GetCurrentFrameCounter();
    const entries = [];
    for (const [ key, entry ] of this._glyphs) entries.push({ age: now - entry.lastFrameUsed, key });
    entries.sort((a, b) => a.age - b.age);

    for (let i = entries.length - 1; i >= 0; i--)
    {
      const entry = this._glyphs.get(entries[i].key);
      this.totalGlyphsCachedSize -= entry.memoryUsage;
      this._glyphs.delete(entries[i].key);

      if (this.totalGlyphsCachedSize < cacheSize) break;
    }
  }

  /**
   * Carbon `OnTick` (Tr2FontManager.cpp:695-698), IBlueEvents: trims the
   * glyph cache to its budget once per Blue tick.
   *
   * @param {number} _realTime Real time, unused.
   * @param {number} _simTime Simulation time, unused.
   * @param {*} _cookie Registration cookie, unused.
   * @returns {void}
   */
  @meta.implemented
  OnTick(_realTime, _simTime, _cookie)
  {
    this.TrimGlyphCache(this.glyphCacheBudget);
  }

  /**
   * Carbon `PyClearBuffer` (Tr2FontManager_Blue.cpp:28-75), Blue "ClearBuffer":
   * fills a rectangular 32-bit buffer with one value.
   *
   * Adapted: a typed array or view replaces the Python writable buffer, and
   * integer dimensions are validated.
   *
   * @param {ArrayBuffer|ArrayBufferView} buffer Destination.
   * @param {number} width Width in pixels.
   * @param {number} height Height in pixels.
   * @param {number} pitch Row pitch in bytes.
   * @param {number} [color=0] Packed 32-bit value.
   * @returns {void}
   */
  @blue.method
  @meta.adapted
  ClearBuffer(buffer, width, height, pitch, color = 0)
  {
    const bytes = new Uint8Array(buffer.buffer ?? buffer, buffer.byteOffset ?? 0, buffer.byteLength); // alloc: byte view of caller-owned bitmap storage; does not copy pixels
    if (![width, height, pitch].every(value => Number.isInteger(value) && value >= 0)) throw new RangeError("Invalid buffer dimensions.");
    if (width * 4 > pitch) throw new RangeError("width larger than pitch!");
    if (height * pitch > bytes.byteLength) throw new RangeError("destination too short!");

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (let y = 0; y < height; y++)
    {
      for (let x = 0; x < width; x++) view.setUint32(y * pitch + x * 4, color >>> 0, true);
    }
  }

  /**
   * Carbon's `m_sbitToTextureMap` (Tr2FontManager.h:156), keyed by the
   * glyph's cache key rather than the sbit: an sbit evicted from the cache and
   * rasterized again is a new object, and must find the texture its old
   * wrappers still draw. The texture is held weakly, as Carbon's map holds a
   * weak reference; a dead entry is replaced on the next lookup.
   *
   * @type {Map<string, WeakRef<object>>}
   */
  _sbitToTextureMap = new Map();

  /**
   * Carbon `GetAtlasTextureForSbit` (Tr2FontManager.cpp:430-558): uploads
   * grayscale coverage once as `0x00ffffff | gray << 24`, plus one transparent
   * row for the drop shadow.
   *
   * Adapted: one WeakMap of WeakRefs replaces Carbon's in-use/cached map pair,
   * since JS cannot resurrect a dying texture; the mono `format == 1` branch is
   * absent because browser sbits are always 8-bit. Returns the texture or null
   * instead of bool plus out pointer.
   *
   * @param {object} sbit The sbit record.
   * @returns {object|null} The glyph's atlas texture, or null.
   */
  @meta.adapted
  GetAtlasTextureForSbit(sbit)
  {
    const existing = this._sbitToTextureMap.get(sbit.key)?.deref();
    if (existing) return existing;

    const atlas = g_textureAtlasMan.FindAtlas(PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM);
    if (!atlas) return null;

    const texture = atlas.CreateTexture(sbit.width, sbit.height + 1);
    if (!texture) return null;

    const mapping = texture.LockBuffer();
    if (!mapping) return null;

    try
    {
      const bytes = mapping.data;
      for (let y = 0; y < sbit.height; y++)
      {
        for (let x = 0; x < sbit.width; x++)
        {
          const offset = y * mapping.pitch + x * 4;
          bytes[offset] = bytes[offset + 1] = bytes[offset + 2] = 255;
          bytes[offset + 3] = sbit.buffer[y * sbit.pitch + x];
        }
      }
      bytes.fill(0, sbit.height * mapping.pitch, sbit.height * mapping.pitch + sbit.width * 4);
    }
    finally { texture.UnlockBuffer(); }

    this._sbitToTextureMap.set(sbit.key, new WeakRef(texture));
    return texture;
  }

  /**
   * Carbon `GetNumGlyphsInUse` (Tr2FontManager.cpp:611-614), Blue
   * "numGlyphsInUse": glyphs with an atlas texture.
   *
   * Adapted: counts the textures not yet collected. JS cannot observe the
   * moment a texture's last user lets go, so an unused texture counts until
   * the collector reclaims it.
   *
   * @returns {number} Glyphs in use.
   */
  @meta.adapted
  GetNumGlyphsInUse()
  {
    let count = 0;
    for (const reference of this._sbitToTextureMap.values()) if (reference.deref()) count++;
    return count;
  }

  /**
   * Carbon `GetNumGlyphsCached` (Tr2FontManager.cpp:616-619), Blue
   * "numGlyphsCached".
   *
   * Adapted: the CPU sbit cache's entries (see TrimGlyphCache).
   *
   * @returns {number} Glyphs cached.
   */
  @meta.adapted
  GetNumGlyphsCached()
  {
    return this._glyphs.size;
  }

  /** Blue "numGlyphsInUse" [READ] (Tr2FontManager_Blue.cpp:154-157). */
  @blue.read
  @type.int32
  @meta.adapted
  get numGlyphsInUse()
  {
    return this.GetNumGlyphsInUse();
  }

  /** Blue "numGlyphsCached" [READ] (Tr2FontManager_Blue.cpp:159-162). */
  @blue.read
  @type.int32
  @meta.adapted
  get numGlyphsCached()
  {
    return this.GetNumGlyphsCached();
  }

  /**
   * Carbon `ReleaseResources` (Tr2FontManager.cpp:585-604), ITriDeviceResource:
   * for managed memory, forgets every glyph texture and the glyph cache.
   *
   * Adapted: dropping the weak texture references stands in for Carbon's
   * WeakRefUnregister, and the CPU sbit cache for its cached textures.
   *
   * @param {number} storage `TriStorageFlags` bits.
   * @returns {void}
   */
  @meta.adapted
  ReleaseResources(storage)
  {
    if (!(storage & TriStorageFlags.TRISTORAGE_MANAGEDMEMORY)) return;

    this._sbitToTextureMap.clear();
    this.ClearCachedGlyphs();
  }

  /**
   * Carbon `FaceRequester` (Tr2FontManager.h:48): the FreeType cache manager's
   * callback that opens a face on first use, through LoadFromDisk.
   *
   * Not implemented: there is no FreeType cache manager to call it. The
   * browser opens a face when LoadFont registers its family with the page's
   * FontFaceSet.
   *
   * @throws {Error} Always.
   */
  @meta.notImplemented
  static faceRequester(_faceID, _library, _requestData, _face)
  {
    throw new Error("Tr2FontManager.FaceRequester is not implemented: no FreeType cache manager; LoadFont opens faces.");
  }

  /**
   * Carbon `LoadFromDisk` (Tr2FontManager.cpp:335-400): reads a face's font
   * file synchronously through ResFile and opens it with FreeType.
   *
   * Not implemented: a browser cannot read a file synchronously, and has no
   * FreeType. LoadFont is the asynchronous equivalent, given the bytes.
   *
   * @throws {Error} Always.
   */
  @meta.notImplemented
  _LoadFromDisk(_faceID)
  {
    throw new Error("Tr2FontManager.LoadFromDisk is not implemented: no synchronous file read or FreeType; use LoadFont.");
  }

  /**
   * Carbon `GetManager` (Tr2FontManager.h:71-74): the FreeType cache manager.
   *
   * Not implemented: there is no FreeType in the browser; Canvas2D draws the
   * glyphs and this class keeps its own sbit cache.
   *
   * @throws {Error} Always.
   */
  @meta.notImplemented
  GetManager()
  {
    throw new Error("Tr2FontManager.GetManager is not implemented: no FreeType cache manager in the browser.");
  }

  /**
   * Carbon `GetCmCache` (Tr2FontManager.h:75-78): FreeType's charmap cache.
   *
   * Not implemented: no FreeType; LookupGlyphIndex answers from the code point.
   *
   * @throws {Error} Always.
   */
  @meta.notImplemented
  GetCmCache()
  {
    throw new Error("Tr2FontManager.GetCmCache is not implemented: no FreeType charmap cache in the browser.");
  }

  /**
   * Carbon `GetSbitCache` (Tr2FontManager.h:79-82): FreeType's sbit cache.
   *
   * Not implemented: no FreeType; LookupSBit keeps its own cache (see
   * TrimGlyphCache).
   *
   * @throws {Error} Always.
   */
  @meta.notImplemented
  GetSbitCache()
  {
    throw new Error("Tr2FontManager.GetSbitCache is not implemented: no FreeType sbit cache in the browser.");
  }

  /** Carbon `OnPrepareResources` (Tr2FontManager.cpp:606-609): nothing to prepare. */
  @meta.implemented
  _OnPrepareResources()
  {
    return true;
  }

  /**
   * Carbon `WeakRefNotify` (Tr2FontManager.cpp:560-583): resurrects a dying
   * glyph texture into the idle cache.
   *
   * Not implemented: JS can neither observe an object about to be collected
   * nor resurrect it, so there is no idle texture cache to move it into (see
   * TrimGlyphCache).
   *
   * @throws {Error} Always.
   */
  @meta.notImplemented
  WeakRefNotify(_object)
  {
    throw new Error("Tr2FontManager.WeakRefNotify is not implemented: JS cannot resurrect a collected texture.");
  }

}

/** Native font-manager singleton; no browser context is created at import time. */
export let g_fontManager = null;
