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
// none of the three is declared with `meta.blue.method`; each method's JSDoc
// names its Blue spelling instead. LookupGlyphIndex refuses a font name, so a
// caller using the Blue spelling gets an error rather than a wrong answer.
//
// WHICH FACES WORK. A Carbon face works once FreeType has loaded its file
// (LookupFace, cpp:183-194); one that never loads fails every lookup, which
// is what lets the measurer fall back to TR2_FONT_FALLBACK. Here a face works
// once LoadFont has registered its family in this realm.
//
// BROWSER TEXT GAMMA. Carbon's FreeType coverage is linear, and Sprite2D's
// ubershader corrects it (FONT_GAMMACORRECT, on by default:
// Sprite2d/Tr2Sprite2dScene.cpp:122, 2648-2652). Canvas2D coverage already
// carries the browser's text gamma, so a scene that keeps Carbon's default
// corrects twice and its text reads as bold. See LookupSBit.
import { Tr2SBitWrapper } from "./Tr2SBitWrapper.js";
import { g_textureAtlasMan } from "../core/Tr2TextureAtlasMan.js";
import { Tr2Renderer } from "../core/Tr2Renderer.js";
import { PixelFormat } from "#consts/render-context";
import { TriStorageFlags } from "#consts/graphics";
import { blue, IBlueEvents } from "#blue";
import { meta } from "#schema";

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
@meta.define({ className: "Tr2FontManager", family: "font", purpose: "Tracks font-loading policy together with the glyph-cache memory budget and occupancy." })
@meta.blue.inherit(IBlueEvents)
export class Tr2FontManager
{

  /**
   * m_glyphCacheBudget (size_t) [READWRITE], default 512 KiB (Tr2FontManager.cpp:101).
   * Browser meaning: the byte budget of the CPU sbit cache (see TrimGlyphCache).
   */
  @meta.blue.readwrite
  @meta.type.uint64
  @meta.adapted
  glyphCacheBudget = 524288;

  /**
   * m_loadflag (int) [READWRITE]. FreeType load flags have no Canvas2D
   * equivalent, so the value is stored and has no effect on rasterization.
   */
  @meta.blue.readwrite
  @meta.type.int32
  @meta.adapted
  loadFlag = 0;

  /**
   * m_totalGlyphsCachedSize (size_t) [READ].
   * Browser meaning: bytes held by the CPU sbit cache (see TrimGlyphCache).
   */
  @meta.blue.read
  @meta.type.uint64
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

    blue.os.RegisterForTicks(g_fontManager, s_cookie);
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
      blue.os.UnregisterForTicks(g_fontManager, s_cookie);
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
   * Last pixel size set per face. FreeType's face keeps its current size
   * between calls; LookupKerningXP reads it the same way.
   *
   * @type {Map<number, number>}
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
   *
   * @param {string} family Family name to register; a res path such as TR2_FONT_FALLBACK works.
   * @param {ArrayBuffer|ArrayBufferView|string} source FontFace source.
   * @returns {Promise<number>} The face ID of the family.
   */
  @meta.ours
  async LoadFont(family, source)
  {
    const fonts = globalThis.document?.fonts ?? globalThis.fonts;
    if (!fonts || !globalThis.FontFace) throw new Error("Browser FontFace loading is unavailable.");

    const face = new FontFace(family, source);
    await face.load();
    fonts.add(face);
    this._loadedFamilies.add(family);
    this.ClearCachedGlyphs();
    return this.GetFaceID(family);
  }

  /**
   * Lazily acquires a browser CPU canvas; importing the engine remains headless-safe.
   *
   * @returns {CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D} The context.
   */
  @meta.ours
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
  @meta.ours
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
  @meta.ours
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
    this._sizes.set(faceID, height);
    return context;
  }

  /**
   * Carbon `LookupGlyphIndex` (Tr2FontManager.cpp:271-289): the glyph index
   * of a character in a face, or -1 when the face cannot be used. Not Blue
   * exposed: the Blue name "LookupGlyphIndex" is LookupFaceIDAndGlyphIndex.
   *
   * Adapted: the browser exposes neither font glyph IDs nor missing-glyph
   * detection, so the Unicode code point stands in for the FreeType index.
   * Code point 0 therefore reads as Carbon's "no glyph" (0).
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
   * Adapted: browser font-box metrics replace FT_Size_Metrics, and only
   * ascender, descender and height are produced. `height` is ascent plus
   * descent (no line gap), where FreeType's is the baseline-to-baseline
   * distance. The height (or width when height is 0) picks the pixel size.
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
   * Adapted: approximated as the difference between the browser-shaped pair
   * advance and the two single advances, at the size last set for this face
   * (FreeType reads the face's current size the same way). Ours: before any
   * size has been set on the face, 12 px is used, because Canvas2D needs a
   * size where FreeType reads whatever size the face holds.
   *
   * @param {number} faceID Face ID.
   * @param {number} leftIndex Left glyph index (a code point here).
   * @param {number} rightIndex Right glyph index (a code point here).
   * @returns {number} Kerning in pixels.
   */
  @meta.adapted
  LookupKerningXP(faceID, leftIndex, rightIndex)
  {
    if (!this._IsValidFace(faceID)) return INT_MAX;

    const context = this._SetFont(faceID, this._sizes.get(faceID) ?? 12);
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
   * Adapted: rasterized by Canvas2D into a native-shaped 8-bit sbit record, so
   * bitmap bounds and advances follow browser metrics, not FreeType hinting.
   * The wrapper is returned, and Carbon's failed `Be::Result` is thrown, as it
   * is for a size of 0 or less. A cache hit refreshes the entry's frame stamp;
   * trimming happens in OnTick.
   *
   * Browser text gamma: the coverage is what Canvas2D drew, which already
   * carries the browser's text gamma, where FreeType's is linear. Sprite2D's
   * FONT_GAMMACORRECT (on by default) corrects linear coverage, so text
   * rasterized here reads as bold unless the scene sets
   * `gammaCorrectText = false`. Registered in non-carbon-extensions.md.
   *
   * @param {number} faceID Face ID.
   * @param {number} width Pixel width.
   * @param {number} height Pixel height.
   * @param {number} glyphIndex Glyph index (a code point here).
   * @returns {Tr2SBitWrapper} The sbit wrapper, at x = y = 0.
   * @throws {RangeError} "FTC_SBitCache_Lookup failed" for an unusable face or glyph.
   */
  @meta.blue.method
  @meta.adapted
  LookupSBit(faceID, width, height, glyphIndex)
  {
    const size = height || width;
    if (!(size > 0) || this.LookupGlyphIndex(faceID, glyphIndex) < 0) throw new RangeError("FTC_SBitCache_Lookup failed");

    const key = `${faceID}:${width}:${height}:${glyphIndex}`;
    let entry = this._glyphs.get(key);

    if (entry)
    {
      entry.lastFrameUsed = Tr2Renderer.GetCurrentFrameCounter();
      this._sizes.set(faceID, size);
    }
    else
    {
      let context = this._SetFont(faceID, size);
      const text = String.fromCodePoint(glyphIndex), metrics = context.measureText(text);
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
      const sbit = { width: bitmapWidth, height: bitmapHeight, left, top, xadvance: Math.round(metrics.width * scale), yadvance: 0, pitch: bitmapWidth, format: 2, max_grays: 255, buffer, key };
      entry = { sbit, lastFrameUsed: Tr2Renderer.GetCurrentFrameCounter(), memoryUsage: buffer.byteLength };
      this._glyphs.set(key, entry);
      this.totalGlyphsCachedSize += entry.memoryUsage;
    }

    const result = new Tr2SBitWrapper();
    result.faceId = faceID;
    result.fontSize = size;
    result.sbit = entry.sbit;
    result.x = 0;
    result.y = 0;
    return result;
  }

  /**
   * Carbon `ClearCachedGlyphs` (Tr2FontManager.cpp:621-629).
   *
   * Adapted: Carbon releases idle glyph atlas textures; this releases the CPU
   * sbit cache. Existing wrappers keep their bitmaps.
   *
   * @returns {void}
   */
  @meta.blue.method
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
  @meta.blue.method
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
  @meta.blue.method
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
  @meta.blue.read
  @meta.type.int32
  @meta.adapted
  get numGlyphsInUse()
  {
    return this.GetNumGlyphsInUse();
  }

  /** Blue "numGlyphsCached" [READ] (Tr2FontManager_Blue.cpp:159-162). */
  @meta.blue.read
  @meta.type.int32
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
